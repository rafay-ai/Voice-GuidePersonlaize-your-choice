const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Order = require('./models/Order');

// Import your DB connection
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function testBasicSetup() {
    console.log('Testing basic neural system setup...\n');
    
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
            console.log('⚠️  No data found. Setting up basic data for neural system...');
            
            // Create test data if needed
            if (userCount === 0) {
                const testUsers = [
                    {
                        name: 'Ahmed Neural Test',
                        email: 'neural.test@example.com',
                        password: 'password123',
                        phone: '03001234567',
                        preferences: {
                            cuisine: ['Pakistani'],
                            budget: 'moderate',
                            dietary: ['halal']
                        }
                    }
                ];
                
                await User.insertMany(testUsers);
                console.log('✅ Created test users');
            }
            
            if (restaurantCount === 0) {
                console.log('⚠️  No restaurants found. Please run your server and visit /api/setup-database first');
                return;
            }
        }
        
        // Step 2: Test interaction data extraction
        console.log('\n🔗 Testing Interaction Data...');
        const orders = await Order.find({})
            .populate('user', '_id name')
            .populate('restaurant', '_id name')
            .lean();

        const interactions = new Map();
        orders.forEach(order => {
            if (order.user && order.restaurant) {
                const key = `${order.user._id}_${order.restaurant._id}`;
                interactions.set(key, {
                    userId: order.user._id.toString(),
                    restaurantId: order.restaurant._id.toString(),
                    userName: order.user.name,
                    restaurantName: order.restaurant.name,
                    orderCount: (interactions.get(key)?.orderCount || 0) + 1,
                    lastOrder: order.createdAt
                });
            }
        });

        console.log(`- Found ${interactions.size} unique user-restaurant interactions`);
        console.log(`- Total orders: ${orderCount}`);
        
        if (interactions.size > 0) {
            console.log('\nSample interactions:');
            Array.from(interactions.values()).slice(0, 3).forEach(int => {
                console.log(`  - ${int.userName} → ${int.restaurantName} (${int.orderCount} orders)`);
            });
        }
        
        // Step 3: Check readiness for neural training
        console.log('\n🏋️ Neural Training Readiness...');
        const minUsers = 3;
        const minRestaurants = 2;
        const minInteractions = 5;
        
        const isReady = userCount >= minUsers && 
                       restaurantCount >= minRestaurants && 
                       interactions.size >= minInteractions;
        
        if (isReady) {
            console.log('✅ System ready for neural training!');
            console.log('\n📝 Recommendation Strategy:');
            console.log('1. Content-based filtering for cold start users');
            console.log('2. Collaborative filtering for users with order history');
            console.log('3. Matrix factorization for advanced recommendations');
            
            // Test basic recommendation logic
            console.log('\n🎯 Testing Basic Recommendation Logic...');
            const sampleUser = await User.findOne();
            const restaurants = await Restaurant.find({}).limit(5);
            
            if (sampleUser && restaurants.length > 0) {
                console.log(`Sample recommendations for ${sampleUser.name}:`);
                
                // Simple content-based scoring
                restaurants.forEach(restaurant => {
                    let score = restaurant.rating || 0;
                    
                    // Boost score for cuisine match
                    if (sampleUser.preferences?.cuisine && restaurant.cuisine) {
                        const match = restaurant.cuisine.some(c => 
                            sampleUser.preferences.cuisine.includes(c)
                        );
                        if (match) score += 2;
                    }
                    
                    console.log(`  - ${restaurant.name}: ${score.toFixed(1)} score`);
                });
            }
            
        } else {
            console.log('⚠️  System needs more data:');
            if (userCount < minUsers) console.log(`   - Need ${minUsers - userCount} more users`);
            if (restaurantCount < minRestaurants) console.log(`   - Need ${minRestaurants - restaurantCount} more restaurants`);
            if (interactions.size < minInteractions) {
                console.log(`   - Need ${minInteractions - interactions.size} more user-restaurant interactions`);
            }
        }
        
        console.log('\n✅ Basic setup test completed!');
        console.log('\nNext steps:');
        console.log('1. Install TensorFlow.js: npm install @tensorflow/tfjs');
        console.log('2. Add neural routes to server.js');
        console.log('3. Test neural API endpoints');
        
    } catch (error) {
        console.error('\n❌ Setup test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        mongoose.connection.close();
    }
}

testBasicSetup();