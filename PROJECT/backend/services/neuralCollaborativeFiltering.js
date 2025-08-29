// backend/services/neuralCollaborativeFiltering.js
const tf = require('@tensorflow/tfjs-node');
const _ = require('lodash');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

class NeuralCollaborativeFiltering {
    constructor(config = {}) {
        this.config = {
            userEmbeddingDim: 64,
            itemEmbeddingDim: 64,
            hiddenLayers: [128, 64, 32],
            learningRate: 0.001,
            l2Regularization: 0.0001,
            numNegativeSamples: 4,
            batchSize: 256,
            epochs: 50,
            ...config
        };
        
        this.model = null;
        this.userIdMap = new Map();
        this.itemIdMap = new Map();
        this.reverseUserMap = new Map();
        this.reverseItemMap = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        console.log('Initializing Neural Collaborative Filtering system...');
        
        // Build user and item mappings
        await this.buildIdMappings();
        
        // Create the neural architecture
        this.buildModel();
        
        this.isInitialized = true;
        console.log(`NCF initialized with ${this.userIdMap.size} users and ${this.itemIdMap.size} restaurants`);
    }

    async buildIdMappings() {
        // Get all unique users and restaurants
        const users = await User.find({}, '_id').lean();
        const restaurants = await Restaurant.find({}, '_id').lean();

        // Create bidirectional mappings
        users.forEach((user, index) => {
            this.userIdMap.set(user._id.toString(), index);
            this.reverseUserMap.set(index, user._id.toString());
        });

        restaurants.forEach((restaurant, index) => {
            this.itemIdMap.set(restaurant._id.toString(), index);
            this.reverseItemMap.set(index, restaurant._id.toString());
        });
    }

    buildModel() {
        // Input layers for user and item IDs
        const userInput = tf.input({ shape: [1], name: 'user_input', dtype: 'int32' });
        const itemInput = tf.input({ shape: [1], name: 'item_input', dtype: 'int32' });

        // Embedding layers (following He et al. paper)
        const userEmbedding = tf.layers.embedding({
            inputDim: this.userIdMap.size,
            outputDim: this.config.userEmbeddingDim,
            embeddingsInitializer: 'randomNormal',
            embeddingsRegularizer: tf.regularizers.l2({ l2: this.config.l2Regularization }),
            name: 'user_embedding'
        }).apply(userInput);

        const itemEmbedding = tf.layers.embedding({
            inputDim: this.itemIdMap.size,
            outputDim: this.config.itemEmbeddingDim,
            embeddingsInitializer: 'randomNormal',
            embeddingsRegularizer: tf.regularizers.l2({ l2: this.config.l2Regularization }),
            name: 'item_embedding'
        }).apply(itemInput);

        // Flatten embeddings
        const userFlat = tf.layers.flatten().apply(userEmbedding);
        const itemFlat = tf.layers.flatten().apply(itemEmbedding);

        // Neural Matrix Factorization Component
        // Element-wise product of user and item embeddings
        const neuralMF = tf.layers.multiply().apply([userFlat, itemFlat]);

        // Generalized Matrix Factorization Component (linear)
        const generalizedMF = tf.layers.concatenate().apply([userFlat, itemFlat]);

        // Multi-layer Perceptron for neural component
        let neuralComponent = neuralMF;
        this.config.hiddenLayers.forEach((units, index) => {
            neuralComponent = tf.layers.dense({
                units: units,
                activation: 'relu',
                kernelRegularizer: tf.regularizers.l2({ l2: this.config.l2Regularization }),
                name: `neural_layer_${index}`
            }).apply(neuralComponent);
            
            // Add dropout for regularization
            neuralComponent = tf.layers.dropout({ rate: 0.2 }).apply(neuralComponent);
        });

        // Wide component (linear transformation of concatenated embeddings)
        const wideComponent = tf.layers.dense({
            units: 32,
            activation: 'linear',
            name: 'wide_component'
        }).apply(generalizedMF);

        // Combine wide and deep components
        const combined = tf.layers.concatenate({ name: 'wide_deep_concat' })
            .apply([neuralComponent, wideComponent]);

        // Final prediction layer (sigmoid for binary classification)
        const output = tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
            name: 'prediction'
        }).apply(combined);

        // Create and compile model
        this.model = tf.model({
            inputs: [userInput, itemInput],
            outputs: output
        });

        this.model.compile({
            optimizer: tf.train.adam(this.config.learningRate),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        console.log('Neural Collaborative Filtering model built successfully');
        this.model.summary();
    }

    async buildInteractionMatrix() {
        console.log('Building user-item interaction matrix...');
        
        // Get all orders with user and restaurant information
        const orders = await Order.find({})
            .populate('user', '_id')
            .populate('restaurant', '_id')
            .lean();

        // Create interaction matrix data
        const interactions = [];
        const interactionSet = new Set();

        orders.forEach(order => {
            if (order.user && order.restaurant) {
                const userId = order.user._id.toString();
                const restaurantId = order.restaurant._id.toString();
                const key = `${userId}_${restaurantId}`;
                
                if (!interactionSet.has(key)) {
                    const userIdx = this.userIdMap.get(userId);
                    const itemIdx = this.itemIdMap.get(restaurantId);
                    
                    if (userIdx !== undefined && itemIdx !== undefined) {
                        interactions.push({
                            user: userIdx,
                            item: itemIdx,
                            rating: 1.0 // Positive interaction
                        });
                        interactionSet.add(key);
                    }
                }
            }
        });

        console.log(`Found ${interactions.length} positive interactions`);
        return interactions;
    }

    async generateNegativeSamples(positiveInteractions) {
        console.log('Generating negative samples...');
        
        const negativeInteractions = [];
        const positiveSet = new Set(
            positiveInteractions.map(int => `${int.user}_${int.item}`)
        );

        const numUsers = this.userIdMap.size;
        const numItems = this.itemIdMap.size;
        const targetNegatives = positiveInteractions.length * this.config.numNegativeSamples;

        while (negativeInteractions.length < targetNegatives) {
            const userId = Math.floor(Math.random() * numUsers);
            const itemId = Math.floor(Math.random() * numItems);
            const key = `${userId}_${itemId}`;

            if (!positiveSet.has(key)) {
                negativeInteractions.push({
                    user: userId,
                    item: itemId,
                    rating: 0.0 // Negative interaction
                });
            }
        }

        console.log(`Generated ${negativeInteractions.length} negative samples`);
        return negativeInteractions;
    }

    async prepareTrainingData() {
        const positiveInteractions = await this.buildInteractionMatrix();
        const negativeInteractions = await this.generateNegativeSamples(positiveInteractions);
        
        // Combine and shuffle
        const allInteractions = [...positiveInteractions, ...negativeInteractions];
        const shuffled = _.shuffle(allInteractions);

        // Separate features and labels
        const userIds = shuffled.map(int => int.user);
        const itemIds = shuffled.map(int => int.item);
        const ratings = shuffled.map(int => int.rating);

        // Convert to tensors
        const userTensor = tf.tensor2d(userIds.map(id => [id]), [userIds.length, 1], 'int32');
        const itemTensor = tf.tensor2d(itemIds.map(id => [id]), [itemIds.length, 1], 'int32');
        const labelTensor = tf.tensor2d(ratings, [ratings.length, 1]);

        return {
            x: [userTensor, itemTensor],
            y: labelTensor,
            numSamples: allInteractions.length
        };
    }

    async train() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        console.log('Starting Neural Collaborative Filtering training...');
        
        const trainingData = await this.prepareTrainingData();
        
        const history = await this.model.fit(trainingData.x, trainingData.y, {
            epochs: this.config.epochs,
            batchSize: this.config.batchSize,
            validationSplit: 0.2,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                }
            }
        });

        // Clean up tensors
        trainingData.x.forEach(tensor => tensor.dispose());
        trainingData.y.dispose();

        console.log('Training completed successfully');
        return history;
    }

    async getRecommendations(userId, topK = 5) {
        if (!this.isInitialized) {
            throw new Error('NCF model not initialized. Call initialize() first.');
        }

        const userIdx = this.userIdMap.get(userId.toString());
        if (userIdx === undefined) {
            throw new Error(`User ${userId} not found in training data`);
        }

        // Get all restaurants
        const restaurants = await Restaurant.find({}).lean();
        const predictions = [];

        // Batch prediction for efficiency
        const userTensors = [];
        const itemTensors = [];
        const restaurantIds = [];

        restaurants.forEach(restaurant => {
            const itemIdx = this.itemIdMap.get(restaurant._id.toString());
            if (itemIdx !== undefined) {
                userTensors.push([userIdx]);
                itemTensors.push([itemIdx]);
                restaurantIds.push(restaurant._id.toString());
            }
        });

        if (userTensors.length === 0) {
            return [];
        }

        // Create tensors for batch prediction
        const userBatch = tf.tensor2d(userTensors, [userTensors.length, 1], 'int32');
        const itemBatch = tf.tensor2d(itemTensors, [itemTensors.length, 1], 'int32');

        // Get predictions
        const predictionTensor = this.model.predict([userBatch, itemBatch]);
        const predictionArray = await predictionTensor.data();

        // Clean up tensors
        userBatch.dispose();
        itemBatch.dispose();
        predictionTensor.dispose();

        // Create recommendation objects
        restaurantIds.forEach((restaurantId, index) => {
            predictions.push({
                restaurantId: restaurantId,
                score: predictionArray[index],
                restaurant: restaurants.find(r => r._id.toString() === restaurantId)
            });
        });

        // Sort by score and return top K
        const topRecommendations = predictions
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

        return topRecommendations;
    }

    async saveModel(path) {
        if (this.model) {
            await this.model.save(`file://${path}`);
            console.log(`Model saved to ${path}`);
        }
    }

    async loadModel(path) {
        this.model = await tf.loadLayersModel(`file://${path}`);
        await this.buildIdMappings();
        this.isInitialized = true;
        console.log(`Model loaded from ${path}`);
    }

    // Cold start strategy for new users
    async getContentBasedRecommendations(userPreferences, topK = 5) {
        console.log('Using content-based fallback for cold start...');
        
        const restaurants = await Restaurant.find({}).lean();
        
        // Simple content-based scoring based on user preferences
        const scored = restaurants.map(restaurant => {
            let score = 0;
            
            // Match cuisine preference
            if (userPreferences.cuisine && userPreferences.cuisine.includes(restaurant.cuisine)) {
                score += 0.4;
            }
            
            // Match price range
            if (userPreferences.budget && restaurant.priceRange === userPreferences.budget) {
                score += 0.3;
            }
            
            // Add popularity bonus
            score += restaurant.rating * 0.2;
            
            // Add random factor to prevent deterministic results
            score += Math.random() * 0.1;
            
            return {
                restaurantId: restaurant._id.toString(),
                score: score,
                restaurant: restaurant
            };
        });
        
        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
}

module.exports = NeuralCollaborativeFiltering;