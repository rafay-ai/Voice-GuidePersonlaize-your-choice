// scripts/trainModel.js
const mongoose = require('mongoose');
// Change this line:
const NeuralTrainingPipeline = require('../services/neuralTraining');

// Import your DB connection
require('dotenv').config();

// Connect to MongoDB (adjust this to match your connection setup)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function trainNeuralModel() {
    console.log('🚀 Starting Neural Collaborative Filtering Training...\n');
    
    const pipeline = new NeuralTrainingPipeline();
    
    try {
        console.log('🔧 Initializing training pipeline...');
        await pipeline.initialize();
        
        console.log('📊 Starting model training...');
        const startTime = Date.now();
        
        // Train with reasonable settings for first run
        const results = await pipeline.trainModel({
            epochs: 30,        // Start with fewer epochs for testing
            batchSize: 128,    // Smaller batch size for less memory usage
            learningRate: 0.001
        });
        
        const trainingTime = (Date.now() - startTime) / 1000;
        
        console.log('\n🎉 Training Completed Successfully!');
        console.log('=' .repeat(50));
        console.log(`⏱️  Training Time: ${trainingTime.toFixed(1)} seconds`);
        console.log(`📈 Final Loss: ${results.final_loss.toFixed(4)}`);
        console.log(`🎯 Final Accuracy: ${(results.final_accuracy * 100).toFixed(2)}%`);
        console.log(`📊 Precision@5: ${(results.validation_metrics.precision_at_k * 100).toFixed(2)}%`);
        console.log(`🔄 Recall@5: ${(results.validation_metrics.recall_at_k * 100).toFixed(2)}%`);
        console.log(`📈 NDCG@5: ${(results.validation_metrics.ndcg_at_k * 100).toFixed(2)}%`);
        console.log(`💾 Model saved to: ${results.model_path}`);
        
        console.log('\n✅ Your Neural Recommendation System is Ready!');
        console.log('\n🧪 Test your model with:');
        console.log('   GET /api/neural/recommendations/:userId');
        console.log('\n📊 Check status with:');
        console.log('   GET /api/neural/status');
        
    } catch (error) {
        console.error('\n❌ Training Failed:', error.message);
        
        if (error.message.includes('Insufficient')) {
            console.log('\n🔧 Quick Fix: Add more test data');
            console.log('   - Create more test users');
            console.log('   - Add more orders between users and restaurants');
            console.log('   - Ensure each user has ordered from multiple restaurants');
        }
        
        console.error('\nFull error:', error.stack);
    } finally {
        mongoose.connection.close();
        console.log('\n👋 Database connection closed.');
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⚠️  Training interrupted by user');
    mongoose.connection.close();
    process.exit(0);
});

// Run the training
trainNeuralModel();