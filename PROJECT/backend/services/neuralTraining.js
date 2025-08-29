// backend/services/neuralTraining.js
const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const fs = require('fs').promises;
const NeuralCollaborativeFiltering = require('./neuralCollaborativeFiltering');
const InteractionMatrixBuilder = require('./interactionMatrix');

class NeuralTrainingPipeline {
    constructor(config = {}) {
        this.config = {
            modelPath: path.join(__dirname, '../models/ncf_model'),
            checkpointPath: path.join(__dirname, '../models/checkpoints'),
            logPath: path.join(__dirname, '../logs/training.log'),
            evaluationSplit: 0.2,
            minInteractionsPerUser: 2,
            minInteractionsPerItem: 2,
            ...config
        };
        
        this.ncf = null;
        this.matrixBuilder = null;
        this.trainingHistory = [];
        this.currentEpoch = 0;
    }

    async initialize() {
        console.log('Initializing Neural Training Pipeline...');
        
        // Ensure directories exist
        await this.ensureDirectories();
        
        // Initialize components
        this.ncf = new NeuralCollaborativeFiltering();
        this.matrixBuilder = new InteractionMatrixBuilder();
        
        console.log('Neural Training Pipeline initialized');
    }

    async ensureDirectories() {
        const dirs = [
            path.dirname(this.config.modelPath),
            this.config.checkpointPath,
            path.dirname(this.config.logPath)
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    async validateData() {
        console.log('Validating training data...');
        
        const matrixData = await this.matrixBuilder.getMatrixForTraining();
        const matrix = matrixData.matrix;
        
        // Check minimum data requirements
        if (matrix.numUsers < 5) {
            throw new Error('Insufficient users for training (minimum 5 required)');
        }
        
        if (matrix.numItems < 3) {
            throw new Error('Insufficient restaurants for training (minimum 3 required)');
        }
        
        if (matrix.statistics.totalInteractions < 10) {
            throw new Error('Insufficient interactions for training (minimum 10 required)');
        }
        
        // Filter users and items with minimum interactions
        const validUsers = new Set();
        const validItems = new Set();
        
        matrix.userItems.forEach((items, userIdx) => {
            if (items.size >= this.config.minInteractionsPerUser) {
                validUsers.add(userIdx);
            }
        });
        
        matrix.itemUsers.forEach((users, itemIdx) => {
            if (users.size >= this.config.minInteractionsPerItem) {
                validItems.add(itemIdx);
            }
        });
        
        const validation = {
            totalUsers: matrix.numUsers,
            totalItems: matrix.numItems,
            validUsers: validUsers.size,
            validItems: validItems.size,
            totalInteractions: matrix.statistics.totalInteractions,
            sparsityRate: matrix.statistics.sparsityRate,
            isValid: validUsers.size >= 5 && validItems.size >= 3 && matrix.statistics.totalInteractions >= 10
        };
        
        console.log('Data Validation Results:');
        console.log(`- Total Users: ${validation.totalUsers} (Valid: ${validation.validUsers})`);
        console.log(`- Total Items: ${validation.totalItems} (Valid: ${validation.validItems})`);
        console.log(`- Total Interactions: ${validation.totalInteractions}`);
        console.log(`- Sparsity Rate: ${(validation.sparsityRate * 100).toFixed(2)}%`);
        console.log(`- Data Valid: ${validation.isValid}`);
        
        return validation;
    }

    async createTrainTestSplit(interactions) {
        console.log('Creating train/test split...');
        
        // Group interactions by user
        const userInteractions = new Map();
        interactions.forEach(interaction => {
            const userId = interaction.userIdx;
            if (!userInteractions.has(userId)) {
                userInteractions.set(userId, []);
            }
            userInteractions.get(userId).push(interaction);
        });

        const trainSet = [];
        const testSet = [];

        // For each user, reserve some interactions for testing
        userInteractions.forEach((userItems, userId) => {
            if (userItems.length >= 2) {
                // Sort by timestamp if available, otherwise random
                userItems.sort((a, b) => Math.random() - 0.5);
                
                const testSize = Math.max(1, Math.floor(userItems.length * this.config.evaluationSplit));
                const testItems = userItems.slice(0, testSize);
                const trainItems = userItems.slice(testSize);
                
                trainSet.push(...trainItems);
                testSet.push(...testItems);
            } else {
                // If user has only one interaction, put it in training set
                trainSet.push(...userItems);
            }
        });

        console.log(`Split: ${trainSet.length} train, ${testSet.length} test interactions`);
        return { trainSet, testSet };
    }

    async evaluateModel(testSet) {
        if (!this.ncf || !this.ncf.isInitialized) {
            throw new Error('Model not initialized for evaluation');
        }

        console.log('Evaluating model performance...');
        
        let totalPrecision = 0;
        let totalRecall = 0;
        let totalNDCG = 0;
        let validUsers = 0;
        const k = 5; // Top-K recommendations

        // Group test interactions by user
        const userTestItems = new Map();
        testSet.forEach(interaction => {
            const userId = this.ncf.reverseUserMap.get(interaction.userIdx);
            if (!userTestItems.has(userId)) {
                userTestItems.set(userId, new Set());
            }
            userTestItems.get(userId).add(interaction.itemIdx);
        });

        // Evaluate each user
        for (const [userId, actualItems] of userTestItems) {
            try {
                const recommendations = await this.ncf.getRecommendations(userId, k);
                const recommendedItems = new Set(
                    recommendations.map(rec => this.ncf.itemIdMap.get(rec.restaurantId))
                );

                // Calculate Precision@K
                const intersection = new Set([...actualItems].filter(x => recommendedItems.has(x)));
                const precision = intersection.size / k;
                const recall = actualItems.size > 0 ? intersection.size / actualItems.size : 0;

                // Calculate NDCG@K (simplified)
                let dcg = 0;
                let idcg = 0;
                const actualArray = Array.from(actualItems);
                
                recommendations.forEach((rec, index) => {
                    const itemIdx = this.ncf.itemIdMap.get(rec.restaurantId);
                    if (actualItems.has(itemIdx)) {
                        dcg += 1 / Math.log2(index + 2);
                    }
                });
                
                for (let i = 0; i < Math.min(k, actualItems.size); i++) {
                    idcg += 1 / Math.log2(i + 2);
                }
                
                const ndcg = idcg > 0 ? dcg / idcg : 0;

                totalPrecision += precision;
                totalRecall += recall;
                totalNDCG += ndcg;
                validUsers++;

            } catch (error) {
                console.warn(`Error evaluating user ${userId}:`, error.message);
            }
        }

        const metrics = {
            precision_at_k: validUsers > 0 ? totalPrecision / validUsers : 0,
            recall_at_k: validUsers > 0 ? totalRecall / validUsers : 0,
            ndcg_at_k: validUsers > 0 ? totalNDCG / validUsers : 0,
            users_evaluated: validUsers,
            k: k
        };

        console.log('Evaluation Metrics:');
        console.log(`- Precision@${k}: ${(metrics.precision_at_k * 100).toFixed(2)}%`);
        console.log(`- Recall@${k}: ${(metrics.recall_at_k * 100).toFixed(2)}%`);
        console.log(`- NDCG@${k}: ${(metrics.ndcg_at_k * 100).toFixed(2)}%`);
        console.log(`- Users Evaluated: ${metrics.users_evaluated}`);

        return metrics;
    }

    async trainModel(config = {}) {
        if (!this.ncf || !this.matrixBuilder) {
            await this.initialize();
        }

        const startTime = Date.now();
        console.log('Starting Neural Collaborative Filtering training...');

        try {
            // Step 1: Validate data
            const validation = await this.validateData();
            if (!validation.isValid) {
                throw new Error('Data validation failed - insufficient data for training');
            }

            // Step 2: Build interaction matrix
            const matrixData = await this.matrixBuilder.getMatrixForTraining();
            const positiveInteractions = matrixData.matrix.positiveInteractions;

            // Step 3: Create train/test split
            const { trainSet, testSet } = await this.createTrainTestSplit(positiveInteractions);

            // Step 4: Initialize NCF model
            await this.ncf.initialize();

            // Step 5: Prepare training data (using train set)
            console.log('Preparing training data...');
            const negativeInteractions = await this.ncf.generateNegativeSamples(trainSet);
            const allTrainingData = [...trainSet, ...negativeInteractions];
            const shuffled = this.shuffleArray(allTrainingData);

            // Convert to tensors
            const userIds = shuffled.map(int => int.userIdx);
            const itemIds = shuffled.map(int => int.itemIdx);
            const ratings = shuffled.map(int => int.rating || (trainSet.includes(int) ? 1.0 : 0.0));

            const userTensor = tf.tensor2d(userIds.map(id => [id]), [userIds.length, 1], 'int32');
            const itemTensor = tf.tensor2d(itemIds.map(id => [id]), [itemIds.length, 1], 'int32');
            const labelTensor = tf.tensor2d(ratings, [ratings.length, 1]);

            // Step 6: Train the model
            const trainingConfig = {
                epochs: config.epochs || this.ncf.config.epochs,
                batchSize: config.batchSize || this.ncf.config.batchSize,
                validationSplit: 0.15,
                shuffle: true,
                callbacks: {
                    onEpochBegin: (epoch) => {
                        this.currentEpoch = epoch;
                        console.log(`Starting epoch ${epoch + 1}/${trainingConfig.epochs}`);
                    },
                    onEpochEnd: async (epoch, logs) => {
                        const epochInfo = {
                            epoch: epoch + 1,
                            loss: logs.loss,
                            accuracy: logs.acc,
                            val_loss: logs.val_loss,
                            val_accuracy: logs.val_acc,
                            timestamp: new Date().toISOString()
                        };
                        
                        this.trainingHistory.push(epochInfo);
                        
                        console.log(`Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}, val_loss=${logs.val_loss.toFixed(4)}, val_acc=${logs.val_acc.toFixed(4)}`);
                        
                        // Save checkpoint every 10 epochs
                        if ((epoch + 1) % 10 === 0) {
                            await this.saveCheckpoint(epoch + 1);
                        }
                        
                        // Log to file
                        await this.logTrainingProgress(epochInfo);
                    }
                }
            };

            const history = await this.ncf.model.fit([userTensor, itemTensor], labelTensor, trainingConfig);

            // Clean up tensors
            userTensor.dispose();
            itemTensor.dispose();
            labelTensor.dispose();

            // Step 7: Evaluate the model
            const evaluation = await this.evaluateModel(testSet);

            // Step 8: Save the trained model
            await this.ncf.saveModel(this.config.modelPath);

            const trainingTime = (Date.now() - startTime) / 1000;
            const results = {
                success: true,
                training_time_seconds: trainingTime,
                epochs_completed: trainingConfig.epochs,
                final_loss: history.history.loss[history.history.loss.length - 1],
                final_accuracy: history.history.acc[history.history.acc.length - 1],
                validation_metrics: evaluation,
                data_stats: validation,
                model_path: this.config.modelPath,
                timestamp: new Date().toISOString()
            };

            console.log('\n=== Training Completed Successfully ===');
            console.log(`Training Time: ${trainingTime.toFixed(1)}s`);
            console.log(`Final Loss: ${results.final_loss.toFixed(4)}`);
            console.log(`Final Accuracy: ${results.final_accuracy.toFixed(4)}`);
            console.log(`Model saved to: ${this.config.modelPath}`);

            // Save training results
            await this.saveTrainingResults(results);

            return results;

        } catch (error) {
            console.error('Training failed:', error);
            const errorResult = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                training_time_seconds: (Date.now() - startTime) / 1000
            };
            
            await this.logTrainingError(errorResult);
            throw error;
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async saveCheckpoint(epoch) {
        try {
            const checkpointPath = path.join(this.config.checkpointPath, `checkpoint_epoch_${epoch}`);
            await this.ncf.saveModel(checkpointPath);
            console.log(`Checkpoint saved at epoch ${epoch}`);
        } catch (error) {
            console.warn(`Failed to save checkpoint at epoch ${epoch}:`, error.message);
        }
    }

    async logTrainingProgress(epochInfo) {
        try {
            const logEntry = `${epochInfo.timestamp} - Epoch ${epochInfo.epoch}: loss=${epochInfo.loss.toFixed(4)}, acc=${epochInfo.accuracy.toFixed(4)}, val_loss=${epochInfo.val_loss.toFixed(4)}, val_acc=${epochInfo.val_accuracy.toFixed(4)}\n`;
            await fs.appendFile(this.config.logPath, logEntry, 'utf8');
        } catch (error) {
            console.warn('Failed to log training progress:', error.message);
        }
    }

    async logTrainingError(errorResult) {
        try {
            const logEntry = `${errorResult.timestamp} - Training FAILED: ${errorResult.error}\n`;
            await fs.appendFile(this.config.logPath, logEntry, 'utf8');
        } catch (error) {
            console.warn('Failed to log training error:', error.message);
        }
    }

    async saveTrainingResults(results) {
        try {
            const resultsPath = path.join(path.dirname(this.config.modelPath), 'training_results.json');
            await fs.writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf8');
            console.log(`Training results saved to: ${resultsPath}`);
        } catch (error) {
            console.warn('Failed to save training results:', error.message);
        }
    }

    async loadModel() {
        if (!this.ncf) {
            this.ncf = new NeuralCollaborativeFiltering();
        }
        
        try {
            await this.ncf.loadModel(this.config.modelPath);
            console.log('Pre-trained model loaded successfully');
            return true;
        } catch (error) {
            console.log('No pre-trained model found, will need to train from scratch');
            return false;
        }
    }

    async getTrainingHistory() {
        return this.trainingHistory;
    }

    async getModelInfo() {
        if (!this.ncf || !this.ncf.isInitialized) {
            return { initialized: false };
        }

        return {
            initialized: true,
            userCount: this.ncf.userIdMap.size,
            itemCount: this.ncf.itemIdMap.size,
            modelPath: this.config.modelPath,
            config: this.ncf.config
        };
    }

    // Method to retrain with new data (incremental learning)
    async incrementalTrain(newInteractions, config = {}) {
        console.log('Starting incremental training with new interactions...');
        
        if (!this.ncf || !this.ncf.isInitialized) {
            console.log('No existing model found, performing full training...');
            return await this.trainModel(config);
        }

        // For now, we'll do a simple retraining
        // In production, you might want to implement true incremental learning
        console.log('Performing full retraining with updated data...');
        return await this.trainModel({
            ...config,
            epochs: Math.min(config.epochs || 20, 20) // Fewer epochs for incremental
        });
    }
}

module.exports = NeuralTrainingPipeline;