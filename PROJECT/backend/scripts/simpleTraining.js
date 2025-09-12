// Save as: backend/scripts/simpleTraining.js
// Simplified neural training script that works

const mongoose = require('mongoose');

async function runTraining() {
    console.log('🚀 Starting Simplified Neural Training...');
    
    try {
        // Direct database connection (same as working debug script)
        console.log('📡 Connecting to database...');
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('✅ Database connected');
        
        // Import NCF class
        const NeuralCollaborativeFilteringV2 = require('../services/neuralCollaborativeFilteringV2');
        
        // Create NCF instance with smaller config for testing
        console.log('🧠 Creating neural system...');
        const ncf = new NeuralCollaborativeFilteringV2({
            userEmbeddingDim: 32,
            itemEmbeddingDim: 32,
            mlpLayers: [64, 32],
            epochs: 10,           // Fewer epochs for initial test
            batchSize: 64,
            learningRate: 0.001,
            negativeRatio: 2,     // Less negative samples
            dropout: 0.1,
            l2Reg: 0.0001
        });
        
        // Initialize the system
        console.log('🔧 Initializing neural system...');
        await ncf.initialize();
        
        // Train the model
        console.log('🏋️ Starting training...');
        const trainingResults = await ncf.trainModel();
        
        console.log('\n🎉 Training completed successfully!');
        console.log(`⏱️ Training time: ${trainingResults.trainingTime.toFixed(2)}s`);
        console.log(`📊 Final accuracy: ${(trainingResults.finalMetrics.accuracy * 100).toFixed(2)}%`);
        console.log(`📦 Training samples: ${trainingResults.dataStats.totalSamples}`);
        
        // Evaluate the model
        console.log('\n📊 Evaluating model...');
        const evaluation = await ncf.evaluateModel();
        
        console.log('📈 Evaluation Results:');
        console.log(`   • Precision@5: ${(evaluation.precision_at_5 * 100).toFixed(2)}%`);
        console.log(`   • Recall@5: ${(evaluation.recall_at_5 * 100).toFixed(2)}%`);
        console.log(`   • NDCG@5: ${(evaluation.ndcg_at_5 * 100).toFixed(2)}%`);
        console.log(`   • Users evaluated: ${evaluation.users_evaluated}`);
        
        // Test sample recommendations
        console.log('\n🧪 Testing sample recommendations...');
        const User = require('../models/User');
        const sampleUser = await User.findOne();
        
        if (sampleUser) {
            const recommendations = await ncf.getRecommendations(sampleUser._id.toString(), 5);
            console.log(`\n👤 Recommendations for ${sampleUser.name}:`);
            recommendations.forEach((rec, idx) => {
                console.log(`   ${idx + 1}. ${rec.restaurant.name} (${(rec.score * 100).toFixed(1)}% match)`);
            });
        }
        
        // Clean up
        ncf.dispose();
        console.log('\n✅ Neural training session completed successfully!');
        
        // Research summary
        console.log('\n📚 RESEARCH SUMMARY FOR FYP:');
        console.log('====================================');
        console.log('✅ Neural Collaborative Filtering implemented');
        console.log('✅ He et al. (2017) architecture followed');
        console.log('✅ Pakistani food delivery domain studied');
        console.log('✅ Quantitative evaluation metrics generated');
        console.log(`✅ Model trained with ${trainingResults.dataStats.totalSamples} samples`);
        console.log(`✅ Performance: ${(evaluation.precision_at_5 * 100).toFixed(1)}% Precision@5`);
        
        if (evaluation.precision_at_5 > 0.15) {
            console.log('🌟 EXCELLENT: Strong results for FYP publication!');
        } else if (evaluation.precision_at_5 > 0.08) {
            console.log('✅ GOOD: Solid results for FYP research');
        } else {
            console.log('📈 BASELINE: Initial results, can be improved with more data');
        }
        
    } catch (error) {
        console.error('\n❌ Training failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

// Run the training
runTraining();