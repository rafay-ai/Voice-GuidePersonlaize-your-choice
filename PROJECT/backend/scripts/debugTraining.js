// Save as: backend/scripts/debugTraining.js
// Training script with debugging and timeouts

const mongoose = require('mongoose');

async function runDebugTraining() {
    console.log('🔍 Starting Debug Neural Training...');
    
    try {
        // Connect to database
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('✅ Database connected');
        
        const NeuralCollaborativeFilteringV2 = require('../services/neuralCollaborativeFilteringV2');
        
        // Very small config to avoid memory issues
        const ncf = new NeuralCollaborativeFilteringV2({
            userEmbeddingDim: 8,    // Very small
            itemEmbeddingDim: 8,    // Very small
            mlpLayers: [16, 8],     // Very small
            epochs: 2,              // Very few epochs
            batchSize: 16,          // Small batch
            learningRate: 0.01,     // Higher learning rate
            negativeRatio: 1,       // Minimal negative samples
            dropout: 0,             // No dropout
            l2Reg: 0                // No regularization
        });
        
        // Initialize
        console.log('🔧 Initializing...');
        await ncf.initialize();
        
        // Prepare training data manually with timeout
        console.log('📚 Preparing training data...');
        const trainingData = await ncf.prepareTrainingData();
        
        console.log(`📊 Training data ready: ${trainingData.totalSamples} samples`);
        console.log(`   Positive: ${trainingData.positiveCount}, Negative: ${trainingData.negativeCount}`);
        
        // Try training with timeout
        console.log('🏋️ Starting model.fit() with timeout...');
        
        const trainingPromise = ncf.model.fit(
            [trainingData.userTensor, trainingData.itemTensor],
            trainingData.ratingTensor,
            {
                epochs: 2,
                batchSize: 16,
                validationSplit: 0.1,
                shuffle: true,
                verbose: 1,
                callbacks: {
                    onEpochBegin: (epoch) => {
                        console.log(`📈 Starting epoch ${epoch + 1}`);
                    },
                    onEpochEnd: (epoch, logs) => {
                        console.log(`📊 Epoch ${epoch + 1} completed:`, logs);
                    },
                    onBatchBegin: (batch) => {
                        if (batch % 5 === 0) console.log(`   Batch ${batch}`);
                    }
                }
            }
        );
        
        // Add timeout to catch hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Training timeout after 30 seconds')), 30000);
        });
        
        const history = await Promise.race([trainingPromise, timeoutPromise]);
        
        console.log('✅ Training completed!');
        console.log('Final metrics:', {
            loss: history.history.loss[history.history.loss.length - 1],
            accuracy: history.history.accuracy[history.history.accuracy.length - 1]
        });
        
        // Clean up
        trainingData.userTensor.dispose();
        trainingData.itemTensor.dispose();
        trainingData.ratingTensor.dispose();
        ncf.dispose();
        
        console.log('🎉 Debug training completed successfully!');
        
    } catch (error) {
        console.error('❌ Debug training failed:', error.message);
        
        if (error.message.includes('timeout')) {
            console.log('💡 Training is hanging during model.fit()');
            console.log('🔧 Possible solutions:');
            console.log('   • Install tfjs-node: npm install @tensorflow/tfjs-node');
            console.log('   • Reduce model size further');
            console.log('   • Check system memory');
        }
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);
    }
}

runDebugTraining();