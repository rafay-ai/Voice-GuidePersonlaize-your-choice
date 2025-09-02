// Save as: backend/scripts/testNCF.js
// Comprehensive Neural Collaborative Filtering Setup Test

const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

async function testNCFSetup() {
    console.log('🧪 Testing Neural Collaborative Filtering Setup...');
    console.log('📚 Preparing for Phase 2: True Neural Implementation\n');
    
    try {
        // Step 1: Database Connection
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('✅ MongoDB connected successfully\n');
        
        // Step 2: Data Availability Check
        console.log('📊 Analyzing Available Data:');
        const userCount = await User.countDocuments();
        const restaurantCount = await Restaurant.countDocuments();
        const orderCount = await Order.countDocuments();
        
        console.log(`   👥 Users: ${userCount}`);
        console.log(`   🏪 Restaurants: ${restaurantCount}`);
        console.log(`   📦 Orders: ${orderCount}`);
        
        if (userCount === 0 || restaurantCount === 0) {
            console.log('\n❌ CRITICAL: No users or restaurants found!');
            console.log('🔧 Run this first: node scripts/seedPakistaniFood.js');
            await mongoose.connection.close();
            return;
        }
        
        // Step 3: TensorFlow.js Check
        console.log('\n🧠 Testing TensorFlow.js Integration:');
        let tensorflowWorking = false;
        try {
            const tf = require('@tensorflow/tfjs');
            console.log('✅ TensorFlow.js imported successfully');
            console.log(`   📊 Version: ${tf.version.tfjs || tf.version}`);
            
            // Test basic operations
            const testTensor = tf.tensor1d([1, 2, 3, 4]);
            const testResult = testTensor.add(1);
            console.log('✅ Basic tensor operations working');
            
            // Test embedding (crucial for NCF)
            const embedding = tf.layers.embedding({
                inputDim: 10,
                outputDim: 4
            });
            console.log('✅ Embedding layers functional');
            
            // Cleanup
            testTensor.dispose();
            testResult.dispose();
            tensorflowWorking = true;
            
        } catch (tfError) {
            console.log('❌ TensorFlow.js not available:', tfError.message);
            console.log('🔧 Install with: npm install @tensorflow/tfjs');
        }
        
        // Step 4: Interaction Data Analysis
        console.log('\n🔗 Analyzing User-Restaurant Interactions:');
        
        const orders = await Order.find({})
            .populate('user', '_id name')
            .populate('restaurant', '_id name')
            .lean();
        
        // Calculate unique interactions
        const interactions = new Set();
        const userRestaurantPairs = new Map();
        let validOrders = 0;
        
        orders.forEach(order => {
            if (order.user && order.restaurant) {
                const userRestKey = `${order.user._id}_${order.restaurant._id}`;
                interactions.add(userRestKey);
                
                // Track frequency
                if (!userRestaurantPairs.has(userRestKey)) {
                    userRestaurantPairs.set(userRestKey, {
                        user: order.user,
                        restaurant: order.restaurant,
                        count: 0
                    });
                }
                userRestaurantPairs.get(userRestKey).count++;
                validOrders++;
            }
        });
        
        const uniqueInteractions = interactions.size;
        const sparsity = 1 - (uniqueInteractions / (userCount * restaurantCount));
        
        console.log(`   📈 Total valid orders: ${validOrders}`);
        console.log(`   🔗 Unique user-restaurant interactions: ${uniqueInteractions}`);
        console.log(`   📊 Data sparsity: ${(sparsity * 100).toFixed(2)}%`);
        
        // Step 5: Data Quality Assessment
        console.log('\n📋 Data Quality Assessment:');
        
        // Users with orders
        const usersWithOrders = new Set(orders.map(o => o.user?._id.toString())).size;
        console.log(`   👥 Users with orders: ${usersWithOrders}/${userCount} (${((usersWithOrders/userCount)*100).toFixed(1)}%)`);
        
        // Restaurants with orders
        const restaurantsWithOrders = new Set(orders.map(o => o.restaurant?._id.toString())).size;
        console.log(`   🏪 Restaurants with orders: ${restaurantsWithOrders}/${restaurantCount} (${((restaurantsWithOrders/restaurantCount)*100).toFixed(1)}%)`);
        
        // Show interaction distribution
        const interactionCounts = Array.from(userRestaurantPairs.values()).map(pair => pair.count);
        const avgInteractions = interactionCounts.reduce((a, b) => a + b, 0) / interactionCounts.length;
        const maxInteractions = Math.max(...interactionCounts);
        
        console.log(`   📊 Avg interactions per pair: ${avgInteractions.toFixed(2)}`);
        console.log(`   📊 Max interactions per pair: ${maxInteractions}`);
        
        // Step 6: Neural Readiness Assessment
        console.log('\n🎯 Neural Training Readiness:');
        
        const requirements = {
            minUsers: 5,
            minRestaurants: 3,
            minOrders: 15,
            minInteractions: 10,
            hasTensorFlow: tensorflowWorking
        };
        
        const assessment = {
            users: userCount >= requirements.minUsers,
            restaurants: restaurantCount >= requirements.minRestaurants,
            orders: orderCount >= requirements.minOrders,
            interactions: uniqueInteractions >= requirements.minInteractions,
            tensorflow: requirements.hasTensorFlow
        };
        
        console.log(`   👥 Users (≥${requirements.minUsers}): ${userCount} ${assessment.users ? '✅' : '❌'}`);
        console.log(`   🏪 Restaurants (≥${requirements.minRestaurants}): ${restaurantCount} ${assessment.restaurants ? '✅' : '❌'}`);
        console.log(`   📦 Orders (≥${requirements.minOrders}): ${orderCount} ${assessment.orders ? '✅' : '❌'}`);
        console.log(`   🔗 Interactions (≥${requirements.minInteractions}): ${uniqueInteractions} ${assessment.interactions ? '✅' : '❌'}`);
        console.log(`   🧠 TensorFlow.js: ${assessment.tensorflow ? '✅' : '❌'}`);
        
        const allReady = Object.values(assessment).every(x => x);
        
        // Step 7: Recommendations
        console.log('\n📋 RECOMMENDATIONS:');
        
        if (allReady) {
            console.log('🎉 SYSTEM READY FOR NEURAL TRAINING!');
            console.log('\n🚀 Next Steps:');
            console.log('   1. Create enhanced neural service');
            console.log('   2. Run: node scripts/trainNeuralModel.js');
            console.log('   3. Evaluate model performance');
            console.log('   4. Document results for FYP');
            
        } else {
            console.log('⚠️ System needs preparation before neural training:');
            
            if (!assessment.tensorflow) {
                console.log('   🧠 Install TensorFlow.js: npm install @tensorflow/tfjs');
            }
            
            if (!assessment.interactions || !assessment.orders) {
                console.log('   📊 Create more sample data: node scripts/createSampleOrders.js');
            }
            
            if (!assessment.users || !assessment.restaurants) {
                console.log('   🌱 Seed database: node scripts/seedPakistaniFood.js');
            }
        }
        
        // Step 8: Sample Data Preview
        if (uniqueInteractions > 0) {
            console.log('\n📝 Sample Interaction Data:');
            const samplePairs = Array.from(userRestaurantPairs.values()).slice(0, 5);
            samplePairs.forEach((pair, idx) => {
                console.log(`   ${idx + 1}. ${pair.user.name} ↔ ${pair.restaurant.name} (${pair.count} orders)`);
            });
        }
        
        // Step 9: Research Context
        console.log('\n🎓 FYP Research Context:');
        console.log('   📚 Implementing: Neural Collaborative Filtering (He et al. 2017)');
        console.log('   🏛️ Domain: Pakistani Food Delivery Recommendations');
        console.log('   🔬 Research Questions:');
        console.log('      • How effective is NCF on sparse Pakistani food data?');
        console.log('      • Can neural models capture cultural preferences?');
        console.log('      • What\'s the optimal embedding dimension?');
        console.log('      • How to handle cold-start in emerging markets?');
        
        console.log('\n✅ NCF Setup Analysis Complete!');
        
    } catch (error) {
        console.error('\n❌ Setup analysis failed:', error);
        console.error('Full error:', error.stack);
        
        console.log('\n🔧 Common Solutions:');
        console.log('   • Check MongoDB connection: mongosh');
        console.log('   • Verify Node.js version: node --version');
        console.log('   • Reinstall dependencies: npm install');
        
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Helper function to display system info
function displaySystemInfo() {
    console.log('💻 System Information:');
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log('');
}

// Run the test
if (require.main === module) {
    displaySystemInfo();
    testNCFSetup();
}

module.exports = { testNCFSetup };