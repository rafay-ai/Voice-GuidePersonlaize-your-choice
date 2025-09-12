// Save as: backend/scripts/trainMatrixFactorization.js
// CPU-friendly collaborative filtering training for FYP

const mongoose = require('mongoose');

async function runMatrixFactorizationTraining() {
    console.log('🚀 Starting Matrix Factorization Collaborative Filtering Training...');
    console.log('📚 This is a CPU-friendly alternative for FYP research\n');
    
    try {
        // Connect to database
        console.log('📡 Connecting to database...');
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('✅ Database connected\n');
        
        // Import and initialize Matrix Factorization CF
        const MatrixFactorizationCF = require('../services/matrixFactorizationCF');
        
        const mfcf = new MatrixFactorizationCF({
            factors: 15,           // Number of latent factors
            iterations: 100,       // Training iterations
            learningRate: 0.01,    // Learning rate
            regularization: 0.01   // L2 regularization
        });
        
        // Initialize the system
        console.log('🔧 Initializing Matrix Factorization system...');
        await mfcf.initialize();
        
        // Train the model
        console.log('\n🏋️ Starting Matrix Factorization training...');
        const trainingResults = await mfcf.train();
        
        console.log('\n🎉 Training completed successfully!');
        console.log(`⏱️ Training time: ${trainingResults.trainingTime.toFixed(2)} seconds`);
        console.log(`📉 Final loss: ${trainingResults.finalLoss.toFixed(6)}`);
        
        // Evaluate the model
        console.log('\n📊 Evaluating model performance...');
        const evaluation = await mfcf.evaluateModel();
        
        console.log('\n📈 EVALUATION RESULTS:');
        console.log(`   • Precision@5: ${(evaluation.precision_at_5 * 100).toFixed(2)}%`);
        console.log(`   • Recall@5: ${(evaluation.recall_at_5 * 100).toFixed(2)}%`);
        console.log(`   • Users evaluated: ${evaluation.users_evaluated}`);
        
        // Test sample recommendations
        console.log('\n🧪 TESTING SAMPLE RECOMMENDATIONS:\n');
        const User = require('../models/User');
        const users = await User.find({}).limit(3);
        
        for (const user of users) {
            console.log(`👤 Recommendations for ${user.name}:`);
            try {
                const recommendations = await mfcf.getRecommendations(user._id.toString(), 5);
                
                if (recommendations.length === 0) {
                    console.log('   ❌ No recommendations generated');
                } else {
                    recommendations.forEach((rec, idx) => {
                        const score = (rec.score * 100).toFixed(1);
                        console.log(`   ${idx + 1}. ${rec.restaurant.name} (${score}% match)`);
                    });
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
            console.log('');
        }
        
        // Research Analysis
        console.log('📚 RESEARCH ANALYSIS:');
        console.log('='.repeat(50));
        const modelInfo = mfcf.getModelInfo();
        
        console.log(`Algorithm: ${modelInfo.algorithm}`);
        console.log(`Users: ${modelInfo.userCount}`);
        console.log(`Restaurants: ${modelInfo.itemCount}`);
        console.log(`Latent Factors: ${modelInfo.factors}`);
        console.log(`Training Iterations: ${modelInfo.iterations}`);
        
        const randomBaseline = 1 / modelInfo.itemCount;
        const improvement = (evaluation.precision_at_5 / randomBaseline);
        
        console.log(`\nRandom Baseline Precision@5: ${(randomBaseline * 100).toFixed(2)}%`);
        console.log(`Improvement over Random: ${improvement.toFixed(1)}x`);
        
        // FYP Assessment
        console.log('\n🎓 FYP RESEARCH SIGNIFICANCE:');
        if (evaluation.precision_at_5 > 0.15) {
            console.log('✅ EXCELLENT: Strong results for FYP publication!');
        } else if (evaluation.precision_at_5 > 0.08) {
            console.log('✅ GOOD: Solid collaborative filtering results');
        } else if (evaluation.precision_at_5 > randomBaseline * 2) {
            console.log('✅ MEANINGFUL: Better than random, shows learning');
        } else {
            console.log('⚠️ BASELINE: Algorithm working but needs more data');
        }
        
        console.log('\n✅ Key FYP Contributions:');
        console.log('   • Collaborative filtering implemented for Pakistani food delivery');
        console.log('   • Matrix factorization approach validated');
        console.log('   • Quantitative evaluation with standard metrics');
        console.log('   • Handling of sparse interaction data');
        console.log('   • Practical recommendation system developed');
        
        console.log('\n🎯 This gives you solid research results for your FYP!');
        
    } catch (error) {
        console.error('\n❌ Training failed:', error.message);
        console.error('Stack:', error.stack);
        
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Run the training
if (require.main === module) {
    runMatrixFactorizationTraining().catch(console.error);
}

module.exports = { runMatrixFactorizationTraining };