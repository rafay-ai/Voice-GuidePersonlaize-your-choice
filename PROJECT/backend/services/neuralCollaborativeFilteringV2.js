// Save as: backend/services/neuralCollaborativeFilteringV2.js
// True Neural Collaborative Filtering Implementation for FYP

const tf = require('@tensorflow/tfjs');
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

class NeuralCollaborativeFilteringV2 {
    constructor(config = {}) {
        this.config = {
            // Neural Architecture (following He et al. 2017)
            userEmbeddingDim: 64,
            itemEmbeddingDim: 64,
            mlpLayers: [128, 64, 32, 16],
            
            // Training Parameters
            learningRate: 0.001,
            batchSize: 256,
            epochs: 50,
            validationSplit: 0.2,
            
            // Data Parameters
            negativeRatio: 4, // 4 negative samples per positive
            minInteractions: 1,
            
            // Regularization
            dropout: 0.2,
            l2Reg: 0.0001,
            
            ...config
        };
        
        // Model components
        this.model = null;
        this.userIdMap = new Map();
        this.itemIdMap = new Map();
        this.reverseUserMap = new Map();
        this.reverseItemMap = new Map();
        
        // Training state
        this.isInitialized = false;
        this.isTrained = false;
        this.trainingHistory = [];
        this.modelPath = path.join(__dirname, '../models/neural');
        
        console.log('🧠 NeuralCollaborativeFilteringV2 initialized');
        console.log('📊 Config:', {
            embedDim: this.config.userEmbeddingDim,
            mlpLayers: this.config.mlpLayers,
            batchSize: this.config.batchSize
        });
    }

    async initialize() {
        console.log('🚀 Initializing Neural Collaborative Filtering V2...');
        
        try {
            // Ensure model directory exists
            await this.ensureDirectories();
            
            // Build user and item mappings
            await this.buildIdMappings();
            
            // Build neural architecture
            this.buildNeuralModel();
            
            // Try to load existing model
            const modelLoaded = await this.loadModel();
            if (modelLoaded) {
                console.log('✅ Loaded existing trained model');
                this.isTrained = true;
            } else {
                console.log('💡 No existing model found - ready for training');
            }
            
            this.isInitialized = true;
            console.log(`✅ NCF V2 initialized: ${this.userIdMap.size} users × ${this.itemIdMap.size} items`);
            
        } catch (error) {
            console.error('❌ NCF V2 initialization failed:', error);
            throw error;
        }
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.modelPath, { recursive: true });
            await fs.mkdir(path.join(__dirname, '../logs'), { recursive: true });
            await fs.mkdir(path.join(__dirname, '../checkpoints'), { recursive: true });
        } catch (error) {
            console.warn('Directory creation warning:', error.message);
        }
    }

    async buildIdMappings() {
        console.log('🗺️ Building user and item ID mappings...');
        
        const users = await User.find({}).select('_id name').lean();
        const restaurants = await Restaurant.find({}).select('_id name').lean();
        
        if (users.length === 0 || restaurants.length === 0) {
            throw new Error('No users or restaurants found for mapping');
        }
        
        // Clear existing mappings
        this.userIdMap.clear();
        this.itemIdMap.clear();
        this.reverseUserMap.clear();
        this.reverseItemMap.clear();
        
        // Build user mappings
        users.forEach((user, index) => {
            const userId = user._id.toString();
            this.userIdMap.set(userId, index);
            this.reverseUserMap.set(index, userId);
        });
        
        // Build item mappings
        restaurants.forEach((restaurant, index) => {
            const restaurantId = restaurant._id.toString();
            this.itemIdMap.set(restaurantId, index);
            this.reverseItemMap.set(index, restaurantId);
        });
        
        console.log(`✅ Built mappings: ${users.length} users, ${restaurants.length} restaurants`);
    }

    buildNeuralModel() {
        console.log('🏗️ Building Neural Collaborative Filtering architecture...');
        
        const numUsers = this.userIdMap.size;
        const numItems = this.itemIdMap.size;
        
        if (numUsers === 0 || numItems === 0) {
            throw new Error('Cannot build model with zero users or items');
        }
        
        // Input layers
        const userInput = tf.input({ shape: [1], dtype: 'int32', name: 'user_input' });
        const itemInput = tf.input({ shape: [1], dtype: 'int32', name: 'item_input' });
        
        // Embedding layers
        const userEmbedding = tf.layers.embedding({
            inputDim: numUsers,
            outputDim: this.config.userEmbeddingDim,
            embeddingsInitializer: 'randomUniform',
            embeddingsRegularizer: tf.regularizers.l2({ l2: this.config.l2Reg }),
            name: 'user_embedding'
        }).apply(userInput);
        
        const itemEmbedding = tf.layers.embedding({
            inputDim: numItems,
            outputDim: this.config.itemEmbeddingDim,
            embeddingsInitializer: 'randomUniform',
            embeddingsRegularizer: tf.regularizers.l2({ l2: this.config.l2Reg }),
            name: 'item_embedding'
        }).apply(itemInput);
        
        // Flatten embeddings
        const userFlat = tf.layers.flatten({ name: 'user_flatten' }).apply(userEmbedding);
        const itemFlat = tf.layers.flatten({ name: 'item_flatten' }).apply(itemEmbedding);
        
        // GMF (Generalized Matrix Factorization) component
        const gmfVector = tf.layers.multiply({ name: 'gmf_multiply' }).apply([userFlat, itemFlat]);
        
        // MLP (Multi-Layer Perceptron) component
        const mlpVector = tf.layers.concatenate({ name: 'mlp_concat' }).apply([userFlat, itemFlat]);
        
        // Build MLP layers
        let mlpOutput = mlpVector;
        this.config.mlpLayers.forEach((units, index) => {
            mlpOutput = tf.layers.dense({
                units: units,
                activation: 'relu',
                kernelRegularizer: tf.regularizers.l2({ l2: this.config.l2Reg }),
                name: `mlp_dense_${index}`
            }).apply(mlpOutput);
            
            if (this.config.dropout > 0) {
                mlpOutput = tf.layers.dropout({ 
                    rate: this.config.dropout,
                    name: `mlp_dropout_${index}`
                }).apply(mlpOutput);
            }
        });
        
        // Combine GMF and MLP
        const neuralMFVector = tf.layers.concatenate({ 
            name: 'neumf_concat' 
        }).apply([gmfVector, mlpOutput]);
        
        // Final prediction layer
        const output = tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
            kernelInitializer: 'lecunUniform',
            name: 'prediction'
        }).apply(neuralMFVector);
        
        // Create and compile model
        this.model = tf.model({
            inputs: [userInput, itemInput],
            outputs: output,
            name: 'NeuralCollaborativeFiltering'
        });
        
        this.model.compile({
            optimizer: tf.train.adam(this.config.learningRate),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy', 'precision', 'recall']
        });
        
        console.log('✅ Neural model built successfully');
        console.log(`📏 Architecture: ${numUsers}×${numItems} → ${this.config.userEmbeddingDim}D embeddings → MLP[${this.config.mlpLayers.join(',')}] → 1`);
        
        // Print model summary
        this.model.summary();
    }

    async prepareTrainingData() {
        console.log('📦 Preparing training data...');
        
        // Get all orders with populated references
        const orders = await Order.find({})
            .populate('user', '_id')
            .populate('restaurant', '_id')
            .lean();
        
        if (orders.length === 0) {
            throw new Error('No orders found for training');
        }
        
        // Create positive interactions
        const positiveInteractions = new Set();
        const interactionList = [];
        
        orders.forEach(order => {
            if (order.user && order.restaurant) {
                const userIdx = this.userIdMap.get(order.user._id.toString());
                const itemIdx = this.itemIdMap.get(order.restaurant._id.toString());
                
                if (userIdx !== undefined && itemIdx !== undefined) {
                    const key = `${userIdx}_${itemIdx}`;
                    if (!positiveInteractions.has(key)) {
                        positiveInteractions.add(key);
                        interactionList.push({ user: userIdx, item: itemIdx, rating: 1.0 });
                    }
                }
            }
        });
        
        console.log(`✅ Found ${interactionList.length} positive interactions`);
        
        // Generate negative samples
        const negativeInteractions = [];
        const targetNegatives = interactionList.length * this.config.negativeRatio;
        const maxAttempts = targetNegatives * 10; // Prevent infinite loops
        let attempts = 0;
        
        while (negativeInteractions.length < targetNegatives && attempts < maxAttempts) {
            const userIdx = Math.floor(Math.random() * this.userIdMap.size);
            const itemIdx = Math.floor(Math.random() * this.itemIdMap.size);
            const key = `${userIdx}_${itemIdx}`;
            
            if (!positiveInteractions.has(key)) {
                negativeInteractions.push({ user: userIdx, item: itemIdx, rating: 0.0 });
            }
            attempts++;
        }
        
        console.log(`✅ Generated ${negativeInteractions.length} negative samples`);
        
        // Combine and shuffle all interactions
        const allInteractions = [...interactionList, ...negativeInteractions];
        this.shuffleArray(allInteractions);
        
        // Convert to tensors
        const users = allInteractions.map(int => [int.user]);
        const items = allInteractions.map(int => [int.item]);
        const ratings = allInteractions.map(int => [int.rating]);
        
        const userTensor = tf.tensor2d(users, [users.length, 1], 'int32');
        const itemTensor = tf.tensor2d(items, [items.length, 1], 'int32');
        const ratingTensor = tf.tensor2d(ratings, [ratings.length, 1], 'float32');
        
        console.log(`✅ Training data prepared: ${allInteractions.length} total samples`);
        
        return {
            inputs: [userTensor, itemTensor],
            outputs: ratingTensor,
            positiveCount: interactionList.length,
            negativeCount: negativeInteractions.length,
            totalSamples: allInteractions.length
        };
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async trainModel(customConfig = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        console.log('🏋️ Starting Neural Collaborative Filtering training...');
        const startTime = Date.now();
        
        // Merge custom config
        const trainingConfig = { ...this.config, ...customConfig };
        
        try {
            // Prepare training data
            const trainingData = await this.prepareTrainingData();
            
            // Training callbacks
            const callbacks = {
                onEpochBegin: (epoch) => {
                    console.log(`📈 Epoch ${epoch + 1}/${trainingConfig.epochs} starting...`);
                },
                onEpochEnd: (epoch, logs) => {
                    const epochInfo = {
                        epoch: epoch + 1,
                        loss: logs.loss,
                        accuracy: logs.acc,
                        precision: logs.precision,
                        recall: logs.recall,
                        val_loss: logs.val_loss,
                        val_accuracy: logs.val_acc,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.trainingHistory.push(epochInfo);
                    
                    console.log(`📊 Epoch ${epoch + 1}: ` +
                        `loss=${logs.loss.toFixed(4)} ` +
                        `acc=${logs.acc.toFixed(4)} ` +
                        `val_loss=${logs.val_loss.toFixed(4)} ` +
                        `val_acc=${logs.val_acc.toFixed(4)}`);
                    
                    // Save checkpoint every 10 epochs
                    if ((epoch + 1) % 10 === 0) {
                        this.saveCheckpoint(epoch + 1);
                    }
                }
            };
            
            // Start training
            const history = await this.model.fit(
                trainingData.inputs,
                trainingData.outputs,
                {
                    epochs: trainingConfig.epochs,
                    batchSize: trainingConfig.batchSize,
                    validationSplit: trainingConfig.validationSplit,
                    shuffle: true,
                    callbacks: callbacks
                }
            );
            
            // Clean up tensors
            trainingData.inputs.forEach(tensor => tensor.dispose());
            trainingData.outputs.dispose();
            
            // Calculate training metrics
            const trainingTime = (Date.now() - startTime) / 1000;
            const finalMetrics = {
                loss: history.history.loss[history.history.loss.length - 1],
                accuracy: history.history.acc[history.history.acc.length - 1],
                val_loss: history.history.val_loss[history.history.val_loss.length - 1],
                val_accuracy: history.history.val_acc[history.history.val_acc.length - 1]
            };
            
            // Save trained model
            await this.saveModel();
            this.isTrained = true;
            
            const results = {
                success: true,
                trainingTime: trainingTime,
                epochs: trainingConfig.epochs,
                finalMetrics: finalMetrics,
                dataStats: {
                    totalSamples: trainingData.totalSamples,
                    positiveCount: trainingData.positiveCount,
                    negativeCount: trainingData.negativeCount
                },
                modelPath: this.modelPath,
                timestamp: new Date().toISOString()
            };
            
            // Save training results
            await this.saveTrainingResults(results);
            
            console.log('\n🎉 Training completed successfully!');
            console.log(`⏱️ Training time: ${trainingTime.toFixed(1)}s`);
            console.log(`📊 Final accuracy: ${(finalMetrics.accuracy * 100).toFixed(2)}%`);
            console.log(`💾 Model saved to: ${this.modelPath}`);
            
            return results;
            
        } catch (error) {
            console.error('❌ Training failed:', error);
            throw error;
        }
    }

    async getRecommendations(userId, topK = 5) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        if (!this.isTrained || !this.model) {
            console.log('⚠️ Model not trained, using content-based fallback');
            return await this.getContentBasedRecommendations(userId, topK);
        }
        
        try {
            const userIdx = this.userIdMap.get(userId.toString());
            if (userIdx === undefined) {
                console.log(`⚠️ User ${userId} not in training data`);
                return await this.getContentBasedRecommendations(userId, topK);
            }
            
            // Get all restaurants
            const restaurants = await Restaurant.find({}).lean();
            const predictions = [];
            
            // Prepare batch prediction
            const userBatch = [];
            const itemBatch = [];
            const restaurantMap = [];
            
            restaurants.forEach(restaurant => {
                const itemIdx = this.itemIdMap.get(restaurant._id.toString());
                if (itemIdx !== undefined) {
                    userBatch.push([userIdx]);
                    itemBatch.push([itemIdx]);
                    restaurantMap.push(restaurant);
                }
            });
            
            if (userBatch.length === 0) {
                return await this.getContentBasedRecommendations(userId, topK);
            }
            
            // Create tensors
            const userTensor = tf.tensor2d(userBatch, [userBatch.length, 1], 'int32');
            const itemTensor = tf.tensor2d(itemBatch, [itemBatch.length, 1], 'int32');
            
            // Get predictions
            const predictionTensor = this.model.predict([userTensor, itemTensor]);
            const predictionArray = await predictionTensor.data();
            
            // Clean up tensors
            userTensor.dispose();
            itemTensor.dispose();
            predictionTensor.dispose();
            
            // Create recommendation objects
            const recommendations = restaurantMap.map((restaurant, idx) => ({
                restaurantId: restaurant._id.toString(),
                score: predictionArray[idx],
                restaurant: restaurant
            }));
            
            // Sort and return top K
            return recommendations
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
                
        } catch (error) {
            console.error('❌ Neural recommendation error:', error);
            return await this.getContentBasedRecommendations(userId, topK);
        }
    }

    async getContentBasedRecommendations(userId, topK = 5) {
        console.log('🔄 Using content-based fallback recommendations');
        
        const restaurants = await Restaurant.find({ isActive: true }).lean();
        
        const recommendations = restaurants.map(restaurant => ({
            restaurantId: restaurant._id.toString(),
            score: (restaurant.rating || 3) / 5 + Math.random() * 0.2,
            restaurant: restaurant
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
        
        return recommendations;
    }

    async saveModel() {
        if (!this.model) {
            throw new Error('No model to save');
        }
        
        const modelUrl = `file://${this.modelPath}`;
        await this.model.save(modelUrl);
        
        // Save metadata
        const metadata = {
            userCount: this.userIdMap.size,
            itemCount: this.itemIdMap.size,
            config: this.config,
            timestamp: new Date().toISOString(),
            version: '2.0'
        };
        
        await fs.writeFile(
            path.join(this.modelPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );
        
        console.log(`💾 Model and metadata saved to ${this.modelPath}`);
    }

    async loadModel() {
        try {
            const modelUrl = `file://${path.join(this.modelPath, 'model.json')}`;
            this.model = await tf.loadLayersModel(modelUrl);
            
            // Load metadata
            const metadataPath = path.join(this.modelPath, 'metadata.json');
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            
            console.log(`✅ Loaded model (v${metadata.version}) with ${metadata.userCount}×${metadata.itemCount}`);
            return true;
            
        } catch (error) {
            console.log('💡 No existing model found or loading failed:', error.message);
            return false;
        }
    }

    async saveCheckpoint(epoch) {
        try {
            const checkpointPath = path.join(__dirname, '../checkpoints', `epoch_${epoch}`);
            await fs.mkdir(checkpointPath, { recursive: true });
            await this.model.save(`file://${checkpointPath}`);
            console.log(`💾 Checkpoint saved at epoch ${epoch}`);
        } catch (error) {
            console.warn('⚠️ Checkpoint save failed:', error.message);
        }
    }

    async saveTrainingResults(results) {
        try {
            const resultsPath = path.join(this.modelPath, 'training_results.json');
            await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
            
            const logPath = path.join(__dirname, '../logs', 'training_log.json');
            const logEntry = {
                timestamp: new Date().toISOString(),
                results: results,
                history: this.trainingHistory
            };
            await fs.writeFile(logPath, JSON.stringify(logEntry, null, 2));
            
            console.log('📊 Training results and logs saved');
        } catch (error) {
            console.warn('⚠️ Results save failed:', error.message);
        }
    }

    // Evaluation methods for research
    async evaluateModel(testData = null) {
        if (!this.isTrained || !this.model) {
            throw new Error('Model not trained for evaluation');
        }
        
        console.log('📊 Evaluating model performance...');
        
        // If no test data provided, create a holdout set
        if (!testData) {
            testData = await this.createHoldoutTestSet();
        }
        
        const metrics = {
            precision_at_5: 0,
            recall_at_5: 0,
            ndcg_at_5: 0,
            users_evaluated: 0
        };
        
        // Evaluate for each user in test set
        for (const [userId, actualItems] of testData) {
            try {
                const recommendations = await this.getRecommendations(userId, 5);
                const recommendedIds = new Set(recommendations.map(r => r.restaurantId));
                
                // Calculate Precision@5
                const intersection = actualItems.filter(id => recommendedIds.has(id));
                const precision = intersection.length / 5;
                
                // Calculate Recall@5
                const recall = actualItems.length > 0 ? intersection.length / actualItems.length : 0;
                
                // Calculate NDCG@5 (simplified)
                let dcg = 0;
                recommendations.forEach((rec, idx) => {
                    if (actualItems.includes(rec.restaurantId)) {
                        dcg += 1 / Math.log2(idx + 2);
                    }
                });
                
                let idcg = 0;
                for (let i = 0; i < Math.min(5, actualItems.length); i++) {
                    idcg += 1 / Math.log2(i + 2);
                }
                
                const ndcg = idcg > 0 ? dcg / idcg : 0;
                
                metrics.precision_at_5 += precision;
                metrics.recall_at_5 += recall;
                metrics.ndcg_at_5 += ndcg;
                metrics.users_evaluated++;
                
            } catch (error) {
                console.warn(`Evaluation error for user ${userId}:`, error.message);
            }
        }
        
        // Average the metrics
        if (metrics.users_evaluated > 0) {
            metrics.precision_at_5 /= metrics.users_evaluated;
            metrics.recall_at_5 /= metrics.users_evaluated;
            metrics.ndcg_at_5 /= metrics.users_evaluated;
        }
        
        console.log('📈 Evaluation Results:');
        console.log(`   Precision@5: ${(metrics.precision_at_5 * 100).toFixed(2)}%`);
        console.log(`   Recall@5: ${(metrics.recall_at_5 * 100).toFixed(2)}%`);
        console.log(`   NDCG@5: ${(metrics.ndcg_at_5 * 100).toFixed(2)}%`);
        console.log(`   Users evaluated: ${metrics.users_evaluated}`);
        
        return metrics;
    }

    async createHoldoutTestSet(testRatio = 0.2) {
        console.log('🔪 Creating holdout test set...');
        
        const orders = await Order.find({})
            .populate('user', '_id')
            .populate('restaurant', '_id')
            .lean();
        
        // Group orders by user
        const userOrders = new Map();
        orders.forEach(order => {
            if (order.user && order.restaurant) {
                const userId = order.user._id.toString();
                if (!userOrders.has(userId)) {
                    userOrders.set(userId, new Set());
                }
                userOrders.get(userId).add(order.restaurant._id.toString());
            }
        });
        
        // Create test set (hold out some items for each user)
        const testSet = new Map();
        userOrders.forEach((restaurants, userId) => {
            const restaurantArray = Array.from(restaurants);
            if (restaurantArray.length >= 2) {
                const testSize = Math.max(1, Math.floor(restaurantArray.length * testRatio));
                const testItems = restaurantArray.slice(-testSize); // Take last items as test
                testSet.set(userId, testItems);
            }
        });
        
        console.log(`✅ Created test set with ${testSet.size} users`);
        return testSet;
    }

    getModelInfo() {
        return {
            initialized: this.isInitialized,
            trained: this.isTrained,
            userCount: this.userIdMap.size,
            itemCount: this.itemIdMap.size,
            config: this.config,
            trainingHistory: this.trainingHistory,
            modelPath: this.modelPath
        };
    }

    // Clean up resources
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.userIdMap.clear();
        this.itemIdMap.clear();
        this.reverseUserMap.clear();
        this.reverseItemMap.clear();
        console.log('🧹 NCF V2 resources cleaned up');
    }
}

module.exports = NeuralCollaborativeFilteringV2;