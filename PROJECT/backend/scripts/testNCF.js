// scripts/testNCF.js
const mongoose = require('mongoose');
// Change these lines at the top:
const NeuralCollaborativeFiltering = require('../services/neuralCollaborativeFiltering');
const InteractionMatrixBuilder = require('../services/interactionMatrix');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
// Import your DB connection
require('dotenv').config();

// Connect to MongoDB (adjust this to match your connection setup)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function testNCFSetup() {
    console.log('🧪 Testing Neural Collaborative Filtering Setup...\n');
    
    try {
        // Step 1: Check Data Availability
        console.log('📊 Checking Data Availability...');
        const userCount = await User.countDocuments();
        const restaurantCount = await Restaurant.countDocuments();
        const orderCount = await Order.countDocuments();
        
        console.log(`- Users: ${userCount}`);
        console.log(`- Restaurants: ${restaurantCount}`);
        console.log(`- Orders: ${orderCount}`);
        
        if (userCount === 0 || restaurantCount === 0) {
            console.log('⚠️  No data found. Make sure you have users and restaurants in your database.');
            return;
        }
        
        // Step 2: Test Interaction Matrix
        console.log('\n🔗 Testing Interaction Matrix...');
        const matrixBuilder = new InteractionMatrixBuilder();
        const matrixData = await matrixBuilder.buildSparseMatrix();
        
        console.log(`- Interaction Matrix: ${matrixData.numUsers} users × ${matrixData.numItems} restaurants`);
        console.log(`- Total Interactions: ${matrixData.statistics.totalInteractions}`);
        console.log(`- Sparsity: ${(matrixData.statistics.sparsityRate * 100).toFixed(2)}%`);
        
        // Step 3: Test NCF Initialization
        console.log('\n🧠 Testing NCF Model...');
        const ncf = new NeuralCollaborativeFiltering();
        await ncf.initialize();
        
        console.log(`- Model initialized with ${ncf.userIdMap.size} users and ${ncf.itemIdMap.size} restaurants`);
        console.log('- Neural architecture built successfully');
        
        // Step 4: Test Recommendations (Content-based fallback)
        console.log('\n🎯 Testing Recommendations...');
        const sampleUser = await User.findOne();
        if (sampleUser) {
            try {
                const recommendations = await ncf.getContentBasedRecommendations({
                    cuisine: sampleUser.preferences?.cuisine || ['Pakistani'],
                    budget: sampleUser.preferences?.budget || 'medium'
                }, 3);
                
                console.log(`- Generated ${recommendations.length} recommendations for user ${sampleUser.email}`);
                if (recommendations.length > 0) {
                    console.log(`- Sample recommendation: ${recommendations[0].restaurant.name} (score: ${recommendations[0].score.toFixed(3)})`);
                }
            } catch (error) {
                console.log(`- Recommendation test failed: ${error.message}`);
            }
        }
        
        // Step 5: Check Training Readiness
        console.log('\n🏋️ Checking Training Readiness...');
        const minUsers = 5;
        const minRestaurants = 3;
        const minInteractions = 10;
        
        const isReady = userCount >= minUsers && 
                       restaurantCount >= minRestaurants && 
                       matrixData.statistics.totalInteractions >= minInteractions;
        
        if (isReady) {
            console.log('✅ System ready for neural training!');
            console.log('\n🚀 Next Steps:');
            console.log('1. Run: node scripts/trainModel.js');
            console.log('2. Or use API: POST /api/neural/train');
        } else {
            console.log('⚠️  System needs more data for training:');
            if (userCount < minUsers) console.log(`   - Need ${minUsers - userCount} more users`);
            if (restaurantCount < minRestaurants) console.log(`   - Need ${minRestaurants - restaurantCount} more restaurants`);
            if (matrixData.statistics.totalInteractions < minInteractions) {
                console.log(`   - Need ${minInteractions - matrixData.statistics.totalInteractions} more orders/interactions`);
            }
            
            console.log('\n🔧 Quick Fix: Add more test orders to existing users');
        }
        
        console.log('\n✅ NCF Setup Test Completed Successfully!');
        
    } catch (error) {
        console.error('\n❌ Setup test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        mongoose.connection.close();
    }
}

// Run the test
testNCFSetup();