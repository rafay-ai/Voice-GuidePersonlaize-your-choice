// Save as: backend/services/neuralCollaborativeFilteringV2.js
// FIXED VERSION - TensorFlow.js Compatible Neural Collaborative Filtering Implementation

const tf = require('@tensorflow/tfjs');
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

class NeuralCollaborativeFilteringV2 {
    constructor(options = {}) {
        console.log('🚀 Initializing Neural Collaborative Filtering V2...');
        
        // Configuration - Using TensorFlow.js compatible settings
        this.userEmbeddingDim = options.userEmbeddingDim || 64;
        this.itemEmbeddingDim = options.itemEmbeddingDim || 64;
        this.mlpLayers = options.mlpLayers || [128, 64, 32, 16];
        this.batchSize = options.batchSize || 128;
        this.learningRate = options.learningRate || 0.001;
        this.epochs = options.epochs || 30;
        this.negativeRatio = options.negativeRatio || 4;
        this.dropout = options.dropout || 0.2;
        this.l2Reg = options.l2Reg || 0.0001;
        
        // Model components
        this.model = null;
        this.userIdMap = new Map();
        this.itemIdMap = new Map();
        this.reverseUserMap = new Map();
        this.reverseItemMap = new Map();
        
        // Training data
        this.trainData = null;
        this.userCount = 0;
        this.itemCount = 0;
        this.isTrained = false;
        
        // Model paths
        this.modelPath = path.join(__dirname, '..', 'models', 'neural');
        this.metadataPath = path.join(this.modelPath, 'metadata.json');
        
        console.log('📊 Config:', {
            userEmbeddingDim: this.userEmbeddingDim,
            itemEmbeddingDim: this.itemEmbeddingDim,
            mlpLayers: this.mlpLayers,
            batchSize: this.batchSize
        });
    }
    
    async initialize() {
        try {
            console.log('🔧 Initializing Neural CF system...');
            
            // Try to load existing model first
            const loaded = await this.loadModel();
            if (loaded) {
                console.log('✅ Loaded existing trained model');
                this.isTrained = true;
                return true;
            }
            
            // Build mappings
            console.log('🗺️ Building user and item ID mappings...');
            await this.buildIdMappings();
            
            // Build model architecture
            console.log('🏗️ Building Neural Collaborative Filtering architecture...');
            this.buildNeuralModel();
            
            console.log('✅ Neural CF V2 initialization completed successfully');
            return true;
            
        } catch (error) {
            console.error('❌ NCF V2 initialization failed:', error.message);
            throw error;
        }
    }
    
    async buildIdMappings() {
        try {
            // Get unique users and restaurants from orders
            const orders = await Order.find({}).populate('user restaurant');
            
            if (orders.length === 0) {
                throw new Error('No orders found. Please create sample data first.');
            }
            
            // Filter out orders with null user or restaurant references
            const validOrders = orders.filter(o => o.user && o.restaurant && o.user._id && o.restaurant._id);
            
            console.log(`📊 Total orders: ${orders.length}, Valid orders: ${validOrders.length}`);
            
            if (validOrders.length === 0) {
                throw new Error('No valid orders with user and restaurant data found.');
            }
            
            const uniqueUsers = [...new Set(validOrders.map(o => o.user._id.toString()))];
            const uniqueRestaurants = [...new Set(validOrders.map(o => o.restaurant._id.toString()))];
            
            // Build user ID mappings
            uniqueUsers.forEach((userId, index) => {
                this.userIdMap.set(userId, index);
                this.reverseUserMap.set(index, userId);
            });
            
            // Build restaurant ID mappings
            uniqueRestaurants.forEach((restaurantId, index) => {
                this.itemIdMap.set(restaurantId, index);
                this.reverseItemMap.set(index, restaurantId);
            });
            
            this.userCount = uniqueUsers.length;
            this.itemCount = uniqueRestaurants.length;
            
            console.log(`✅ Built mappings: ${this.userCount} users, ${this.itemCount} restaurants`);
            
            if (this.userCount < 2 || this.itemCount < 2) {
                throw new Error('Need at least 2 users and 2 restaurants for training');
            }
            
        } catch (error) {
            console.error('❌ ID mapping failed:', error.message);
            throw error;
        }
    }
    
    buildNeuralModel() {
        try {
            console.log('🔨 Creating Neural Matrix Factorization + MLP hybrid model...');
            
            // Input layers
            const userInput = tf.input({shape: [1], name: 'user_input'});
            const itemInput = tf.input({shape: [1], name: 'item_input'});
            
            // === GMF (Generalized Matrix Factorization) Path ===
            // User and Item embeddings for GMF
            const gmfUserEmbed = tf.layers.embedding({
                inputDim: this.userCount,
                outputDim: this.userEmbeddingDim,
                name: 'gmf_user_embedding',
                embeddingsInitializer: 'randomNormal', // TensorFlow.js compatible
                embeddingsRegularizer: tf.regularizers.l2({l2: this.l2Reg})
            }).apply(userInput);
            
            const gmfItemEmbed = tf.layers.embedding({
                inputDim: this.itemCount,
                outputDim: this.itemEmbeddingDim,
                name: 'gmf_item_embedding',
                embeddingsInitializer: 'randomNormal', // TensorFlow.js compatible
                embeddingsRegularizer: tf.regularizers.l2({l2: this.l2Reg})
            }).apply(itemInput);
            
            // Flatten embeddings
            const gmfUserFlat = tf.layers.flatten().apply(gmfUserEmbed);
            const gmfItemFlat = tf.layers.flatten().apply(gmfItemEmbed);
            
            // Element-wise product for GMF
            const gmfVector = tf.layers.multiply().apply([gmfUserFlat, gmfItemFlat]);
            
            // === MLP (Multi-Layer Perceptron) Path ===
            // User and Item embeddings for MLP
            const mlpUserEmbed = tf.layers.embedding({
                inputDim: this.userCount,
                outputDim: this.userEmbeddingDim,
                name: 'mlp_user_embedding',
                embeddingsInitializer: 'randomNormal', // TensorFlow.js compatible
                embeddingsRegularizer: tf.regularizers.l2({l2: this.l2Reg})
            }).apply(userInput);
            
            const mlpItemEmbed = tf.layers.embedding({
                inputDim: this.itemCount,
                outputDim: this.itemEmbeddingDim,
                name: 'mlp_item_embedding',
                embeddingsInitializer: 'randomNormal', // TensorFlow.js compatible
                embeddingsRegularizer: tf.regularizers.l2({l2: this.l2Reg})
            }).apply(itemInput);
            
            // Flatten embeddings
            const mlpUserFlat = tf.layers.flatten().apply(mlpUserEmbed);
            const mlpItemFlat = tf.layers.flatten().apply(mlpItemEmbed);
            
            // Concatenate user and item embeddings
            let mlpVector = tf.layers.concatenate().apply([mlpUserFlat, mlpItemFlat]);
            
            // MLP layers with dropout and batch normalization
            for (let i = 0; i < this.mlpLayers.length; i++) {
                mlpVector = tf.layers.dense({
                    units: this.mlpLayers[i],
                    activation: 'relu',
                    kernelInitializer: 'heNormal', // TensorFlow.js compatible
                    kernelRegularizer: tf.regularizers.l2({l2: this.l2Reg}),
                    name: `mlp_layer_${i}`
                }).apply(mlpVector);
                
                // Add dropout for regularization
                if (this.dropout > 0) {
                    mlpVector = tf.layers.dropout({
                        rate: this.dropout,
                        name: `mlp_dropout_${i}`
                    }).apply(mlpVector);
                }
            }
            
            // === Fusion Layer ===
            // Concatenate GMF and MLP vectors
            const fusionLayer = tf.layers.concatenate({
                name: 'fusion_layer'
            }).apply([gmfVector, mlpVector]);
            
            // Final prediction layer
            const output = tf.layers.dense({
                units: 1,
                activation: 'sigmoid',
                kernelInitializer: 'heNormal', // TensorFlow.js compatible
                name: 'prediction_layer'
            }).apply(fusionLayer);
            
            // Create and compile model
            this.model = tf.model({
                inputs: [userInput, itemInput],
                outputs: output,
                name: 'NeuralCollaborativeFiltering'
            });
            
            // Compile with research-appropriate metrics
            this.model.compile({
    optimizer: tf.train.adam(this.learningRate),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']  // Only use compatible metrics
});
            
            console.log('✅ Neural model architecture built successfully');
            console.log(`📊 Model summary: ${this.model.countParams()} trainable parameters`);
            
        } catch (error) {
            console.error('❌ Model building failed:', error.message);
            throw error;
        }
    }
    
    async prepareTrainingData() {
        try {
            console.log('📚 Preparing training data...');
            
            // Get all orders with user and restaurant info
            const orders = await Order.find({})
                .populate('user restaurant')
                .lean();
            
            console.log(`📦 Found ${orders.length} orders`);
            
            // Filter orders and create positive samples with null checks
            const positiveInteractions = [];
            const userItemSet = new Set();
            
            orders.forEach(order => {
                // Check if order has valid user and restaurant references
                if (order.user && order.restaurant && order.user._id && order.restaurant._id) {
                    const userId = this.userIdMap.get(order.user._id.toString());
                    const itemId = this.itemIdMap.get(order.restaurant._id.toString());
                    
                    if (userId !== undefined && itemId !== undefined) {
                        const key = `${userId}-${itemId}`;
                        if (!userItemSet.has(key)) {
                            positiveInteractions.push([userId, itemId, 1]);
                            userItemSet.add(key);
                        }
                    }
                } else {
                    console.log('⚠️ Skipping order with null user or restaurant reference');
                }
            });
            
            console.log(`✅ Created ${positiveInteractions.length} positive interactions`);
            
            // Generate negative samples
            const negativeInteractions = [];
            const negativeCount = positiveInteractions.length * this.negativeRatio;
            
            while (negativeInteractions.length < negativeCount) {
                const userId = Math.floor(Math.random() * this.userCount);
                const itemId = Math.floor(Math.random() * this.itemCount);
                const key = `${userId}-${itemId}`;
                
                if (!userItemSet.has(key)) {
                    negativeInteractions.push([userId, itemId, 0]);
                    userItemSet.add(key);
                }
            }
            
            console.log(`✅ Created ${negativeInteractions.length} negative samples`);
            
            // Combine and shuffle
            const allInteractions = [...positiveInteractions, ...negativeInteractions];
            this.shuffleArray(allInteractions);
            
            // Convert to tensors
            const users = allInteractions.map(interaction => [interaction[0]]);
            const items = allInteractions.map(interaction => [interaction[1]]);
            const ratings = allInteractions.map(interaction => [interaction[2]]);
            
            this.trainData = {
                userTensor: tf.tensor2d(users),
                itemTensor: tf.tensor2d(items),
                ratingTensor: tf.tensor2d(ratings),
                totalSamples: allInteractions.length,
                positiveCount: positiveInteractions.length,
                negativeCount: negativeInteractions.length
            };
            
            console.log('✅ Training data prepared successfully');
            return this.trainData;
            
        } catch (error) {
            console.error('❌ Training data preparation failed:', error.message);
            throw error;
        }
    }
    
    async trainModel() {
        try {
            console.log('🚀 Starting Neural Collaborative Filtering training...');
            const startTime = Date.now();
            
            // Prepare training data
            await this.prepareTrainingData();
            
            console.log('🏋️ Training neural model...');
            console.log(`📊 Training samples: ${this.trainData.totalSamples}`);
            console.log(`   • Positive samples: ${this.trainData.positiveCount}`);
            console.log(`   • Negative samples: ${this.trainData.negativeCount}`);
            console.log(`🔄 Epochs: ${this.epochs}, Batch Size: ${this.batchSize}\n`);
            
            // Train the model with validation split
            const history = await this.model.fit(
                [this.trainData.userTensor, this.trainData.itemTensor],
                this.trainData.ratingTensor,
                {
                    epochs: this.epochs,
                    batchSize: this.batchSize,
                    validationSplit: 0.2,
                    shuffle: true,
                    verbose: 1,
                    callbacks: [
                        tf.callbacks.earlyStopping({
                            monitor: 'val_loss',
                            patience: 5,
                            restoreBestWeights: true
                        })
                    ]
                }
            );
            
            const trainingTime = (Date.now() - startTime) / 1000;
            console.log(`\n✅ Training completed in ${trainingTime.toFixed(2)} seconds`);
            
            // Save model
            await this.saveModel();
            this.isTrained = true;
            
            // Clean up training tensors
            this.trainData.userTensor.dispose();
            this.trainData.itemTensor.dispose();
            this.trainData.ratingTensor.dispose();
            
            // Get final metrics
            const finalMetrics = {
                loss: history.history.loss[history.history.loss.length - 1],
                accuracy: history.history.accuracy[history.history.accuracy.length - 1],
                val_loss: history.history.val_loss[history.history.val_loss.length - 1],
                val_accuracy: history.history.val_accuracy[history.history.val_accuracy.length - 1]
            };
            
            return {
                trainingTime,
                epochs: history.epoch.length,
                finalMetrics,
                dataStats: {
                    totalSamples: this.trainData.totalSamples,
                    positiveCount: this.trainData.positiveCount,
                    negativeCount: this.trainData.negativeCount
                }
            };
            
        } catch (error) {
            console.error('❌ Training failed:', error.message);
            throw error;
        }
    }
    
    async evaluateModel() {
        try {
            console.log('📊 Evaluating model performance...');
            
            if (!this.isTrained) {
                throw new Error('Model must be trained before evaluation');
            }
            
            // Get test users (those with multiple orders)
            const orders = await Order.find({}).populate('user restaurant').lean();
            const userOrderCounts = new Map();
            
            orders.forEach(order => {
                const userId = order.user._id.toString();
                userOrderCounts.set(userId, (userOrderCounts.get(userId) || 0) + 1);
            });
            
            const testUsers = Array.from(userOrderCounts.entries())
                .filter(([userId, count]) => count >= 2)
                .map(([userId]) => userId);
            
            console.log(`🧪 Evaluating on ${testUsers.length} users with multiple orders`);
            
            let totalPrecision5 = 0;
            let totalRecall5 = 0;
            let totalNDCG5 = 0;
            let validUsers = 0;
            
            for (const userId of testUsers) {
                try {
                    // Get user's actual orders
                    const userOrders = orders.filter(o => o.user._id.toString() === userId);
                    const actualRestaurants = new Set(userOrders.map(o => o.restaurant._id.toString()));
                    
                    // Get recommendations
                    const recommendations = await this.getRecommendations(userId, 10);
                    const top5Recs = recommendations.slice(0, 5).map(r => r.restaurant._id.toString());
                    
                    // Calculate metrics
                    const hits5 = top5Recs.filter(recId => actualRestaurants.has(recId)).length;
                    const precision5 = hits5 / 5;
                    const recall5 = actualRestaurants.size > 0 ? hits5 / actualRestaurants.size : 0;
                    
                    // Calculate NDCG@5
                    let dcg5 = 0;
                    for (let i = 0; i < Math.min(5, top5Recs.length); i++) {
                        if (actualRestaurants.has(top5Recs[i])) {
                            dcg5 += 1 / Math.log2(i + 2);
                        }
                    }
                    
                    const idealHits = Math.min(5, actualRestaurants.size);
                    let idcg5 = 0;
                    for (let i = 0; i < idealHits; i++) {
                        idcg5 += 1 / Math.log2(i + 2);
                    }
                    
                    const ndcg5 = idcg5 > 0 ? dcg5 / idcg5 : 0;
                    
                    totalPrecision5 += precision5;
                    totalRecall5 += recall5;
                    totalNDCG5 += ndcg5;
                    validUsers++;
                    
                } catch (error) {
                    console.log(`⚠️ Evaluation failed for user ${userId}: ${error.message}`);
                }
            }
            
            if (validUsers === 0) {
                throw new Error('No valid users for evaluation');
            }
            
            const evaluation = {
                precision_at_5: totalPrecision5 / validUsers,
                recall_at_5: totalRecall5 / validUsers,
                ndcg_at_5: totalNDCG5 / validUsers,
                users_evaluated: validUsers
            };
            
            console.log('✅ Evaluation completed');
            return evaluation;
            
        } catch (error) {
            console.error('❌ Evaluation failed:', error.message);
            throw error;
        }
    }
    
    async getRecommendations(userId, topK = 5) {
        try {
            if (!this.isTrained) {
                throw new Error('Model must be trained before making recommendations');
            }
            
            const userIndex = this.userIdMap.get(userId.toString());
            if (userIndex === undefined) {
                throw new Error(`User ${userId} not found in training data`);
            }
            
            // Get all restaurants
            const restaurants = await Restaurant.find({}).lean();
            const predictions = [];
            
            // Create batch prediction tensors
            const batchSize = Math.min(100, this.itemCount);
            const userTensor = tf.tensor2d(Array(this.itemCount).fill([userIndex]));
            const itemTensor = tf.tensor2d(Array.from({length: this.itemCount}, (_, i) => [i]));
            
            // Get predictions for all items
            const scores = await this.model.predict([userTensor, itemTensor]);
            const scoresArray = await scores.data();
            
            // Clean up tensors
            userTensor.dispose();
            itemTensor.dispose();
            scores.dispose();
            
            // Create recommendations
            for (let i = 0; i < this.itemCount; i++) {
                const restaurantId = this.reverseItemMap.get(i);
                const restaurant = restaurants.find(r => r._id.toString() === restaurantId);
                
                if (restaurant) {
                    predictions.push({
                        restaurant,
                        score: scoresArray[i]
                    });
                }
            }
            
            // Sort and return top K
            predictions.sort((a, b) => b.score - a.score);
            return predictions.slice(0, topK);
            
        } catch (error) {
            console.error('❌ Recommendation generation failed:', error.message);
            throw error;
        }
    }
    
    async saveModel() {
        try {
            console.log('💾 Saving neural model...');
            
            // Ensure directory exists
            await fs.mkdir(this.modelPath, { recursive: true });
            
            // Save model
            await this.model.save(`file://${this.modelPath}`);
            
            // Save metadata
            const metadata = {
                version: '2.0',
                timestamp: new Date().toISOString(),
                config: {
                    userEmbeddingDim: this.userEmbeddingDim,
                    itemEmbeddingDim: this.itemEmbeddingDim,
                    mlpLayers: this.mlpLayers,
                    learningRate: this.learningRate,
                    epochs: this.epochs
                },
                userCount: this.userCount,
                itemCount: this.itemCount,
                userIdMap: Array.from(this.userIdMap.entries()),
                itemIdMap: Array.from(this.itemIdMap.entries())
            };
            
            await fs.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`✅ Model saved to ${this.modelPath}`);
            
        } catch (error) {
            console.error('❌ Model saving failed:', error.message);
            throw error;
        }
    }
    
    async loadModel() {
        try {
            const modelJsonPath = path.join(this.modelPath, 'model.json');
            
            // Check if model exists
            try {
                await fs.access(modelJsonPath);
            } catch {
                return false; // Model doesn't exist
            }
            
            // Load model
            this.model = await tf.loadLayersModel(`file://${modelJsonPath}`);
            
            // Load metadata
            const metadataContent = await fs.readFile(this.metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            // Restore mappings
            this.userIdMap = new Map(metadata.userIdMap);
            this.itemIdMap = new Map(metadata.itemIdMap);
            
            // Build reverse mappings
            this.userIdMap.forEach((index, userId) => {
                this.reverseUserMap.set(index, userId);
            });
            this.itemIdMap.forEach((index, itemId) => {
                this.reverseItemMap.set(index, itemId);
            });
            
            this.userCount = metadata.userCount;
            this.itemCount = metadata.itemCount;
            
            console.log(`✅ Loaded model (v${metadata.version}) with ${metadata.userCount}×${metadata.itemCount}`);
            return true;
            
        } catch (error) {
            console.log('💡 No existing model found or loading failed:', error.message);
            return false;
        }
    }
    
    getModelInfo() {
        return {
            userCount: this.userCount,
            itemCount: this.itemCount,
            isTrained: this.isTrained,
            config: {
                userEmbeddingDim: this.userEmbeddingDim,
                itemEmbeddingDim: this.itemEmbeddingDim,
                mlpLayers: this.mlpLayers,
                learningRate: this.learningRate,
                epochs: this.epochs
            }
        };
    }
    
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        
        if (this.trainData) {
            // Dispose of any remaining tensors
            Object.values(this.trainData).forEach(tensor => {
                if (tensor && typeof tensor.dispose === 'function') {
                    tensor.dispose();
                }
            });
        }
        
        console.log('🧹 Model resources cleaned up');
    }
    
    // Utility function to shuffle array
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

module.exports = NeuralCollaborativeFilteringV2;