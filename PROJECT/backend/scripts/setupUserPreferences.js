// User Preference Setup Script
// Save as: backend/scripts/setupUserPreferences.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/food_delivery_app');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Connection error:', error);
        process.exit(1);
    }
};

// Update or create a user with specific preferences
async function setupUserPreferences() {
    try {
        console.log('🔧 Setting up user preferences...');

        // Budget user preferences
        const budgetUser = await User.findOneAndUpdate(
            { email: "budget@test.com" },
            {
                $set: {
                    name: "Ahmed Budget",
                    email: "budget@test.com",
                    password: "$2a$10$hashedpassword", // In real app, this would be properly hashed
                    phone: "0321-1234567",
                    preferences: {
                        preferredCuisines: ["Pakistani", "Biryani", "Traditional"],
                        dietaryRestrictions: ["halal"],
                        budgetRange: "Under Rs. 500",
                        spiceTolerance: 3,
                        averageOrderValue: 400,
                        favoriteRestaurants: [],
                        preferredMealTimes: ["Lunch", "Dinner"]
                    },
                    address: {
                        street: "Block 13-D, House 45",
                        area: "Gulshan-e-Iqbal", 
                        city: "Karachi"
                    },
                    isActive: true
                }
            },
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
            }
        );

        console.log('✅ Budget user created/updated:', budgetUser._id);
        console.log('   Preferences:', budgetUser.preferences);

        // KFC Lover user
        const kfcUser = await User.findOneAndUpdate(
            { email: "kfc@test.com" },
            {
                $set: {
                    name: "Sara KFC Lover",
                    email: "kfc@test.com",
                    password: "$2a$10$hashedpassword",
                    phone: "0333-9876543",
                    preferences: {
                        preferredCuisines: ["Fast Food", "Chicken", "Burgers"],
                        dietaryRestrictions: ["halal"],
                        budgetRange: "Rs. 500-1000",
                        spiceTolerance: 2,
                        averageOrderValue: 800,
                        favoriteRestaurants: [],
                        preferredMealTimes: ["Lunch", "Dinner", "Late Night"]
                    },
                    address: {
                        street: "Khayaban-e-Seher, House 22",
                        area: "DHA Phase 5",
                        city: "Karachi"
                    },
                    isActive: true
                }
            },
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
            }
        );

        console.log('✅ KFC user created/updated:', kfcUser._id);
        console.log('   Preferences:', kfcUser.preferences);

        // Pizza lover user
        const pizzaUser = await User.findOneAndUpdate(
            { email: "pizza@test.com" },
            {
                $set: {
                    name: "Ali Pizza Fan",
                    email: "pizza@test.com", 
                    password: "$2a$10$hashedpassword",
                    phone: "0300-5555555",
                    preferences: {
                        preferredCuisines: ["Pizza", "Italian", "Continental"],
                        dietaryRestrictions: ["halal"],
                        budgetRange: "Rs. 1000-2000",
                        spiceTolerance: 1,
                        averageOrderValue: 1200,
                        favoriteRestaurants: [],
                        preferredMealTimes: ["Dinner", "Weekend"]
                    },
                    address: {
                        street: "Block 4, Apartment 10-B",
                        area: "Clifton",
                        city: "Karachi"
                    },
                    isActive: true
                }
            },
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
            }
        );

        console.log('✅ Pizza user created/updated:', pizzaUser._id);
        console.log('   Preferences:', pizzaUser.preferences);

        return { budgetUser, kfcUser, pizzaUser };

    } catch (error) {
        console.error('❌ Error setting up user preferences:', error);
        throw error;
    }
}

// List all users and their preferences
async function listAllUsers() {
    try {
        console.log('\n👥 Current users in system:');
        console.log('='.repeat(60));
        
        const users = await User.find({}, 'name email preferences createdAt').sort({ createdAt: -1 });
        
        if (users.length === 0) {
            console.log('No users found in the system.');
            return;
        }
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email})`);
            console.log(`   ID: ${user._id}`);
            console.log(`   Created: ${user.createdAt?.toDateString() || 'Unknown'}`);
            
            if (user.preferences) {
                console.log(`   Cuisines: ${user.preferences.preferredCuisines?.join(', ') || 'None'}`);
                console.log(`   Budget: ${user.preferences.budgetRange || 'Not set'}`);
                console.log(`   Spice Level: ${user.preferences.spiceTolerance || 'Not set'}`);
                console.log(`   Dietary: ${user.preferences.dietaryRestrictions?.join(', ') || 'None'}`);
            } else {
                console.log(`   Preferences: Not set`);
            }
            console.log('');
        });
        
        return users;
    } catch (error) {
        console.error('❌ Error listing users:', error);
        throw error;
    }
}

// Update specific user preferences
async function updateUserPreferences(userEmail, newPreferences) {
    try {
        console.log(`🔧 Updating preferences for user: ${userEmail}`);
        
        const updatedUser = await User.findOneAndUpdate(
            { email: userEmail },
            { 
                $set: { 
                    preferences: {
                        ...newPreferences,
                        updatedAt: new Date()
                    }
                }
            },
            { new: true }
        );
        
        if (!updatedUser) {
            console.log(`❌ User with email ${userEmail} not found`);
            return null;
        }
        
        console.log('✅ User preferences updated successfully');
        console.log('   New preferences:', updatedUser.preferences);
        
        return updatedUser;
    } catch (error) {
        console.error('❌ Error updating user preferences:', error);
        throw error;
    }
}

// Test recommendations for a specific user
async function testUserRecommendations(userId) {
    try {
        console.log(`\n🎯 Testing recommendations for user: ${userId}`);
        
        // Import recommendation engine
        const AdvancedRecommendationEngine = require('../services/advancedRecommendation');
        const engine = new AdvancedRecommendationEngine();
        
        const recommendations = await engine.getPersonalizedRecommendations(userId, { count: 5 });
        
        console.log('📊 Recommendation Results:');
        console.log('='.repeat(50));
        
        if (recommendations.length === 0) {
            console.log('❌ No recommendations generated');
            return;
        }
        
        recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec.restaurant.name}`);
            console.log(`   Score: ${rec.finalScore.toFixed(3)}`);
            console.log(`   Cuisine: ${rec.restaurant.cuisine?.join(', ')}`);
            console.log(`   Price: ${rec.restaurant.priceRange}`);
            console.log(`   Rating: ${rec.restaurant.rating}`);
            console.log(`   Explanations: ${rec.explanations.join(', ')}`);
            console.log(`   Breakdown:`);
            console.log(`     Personal: ${rec.personalPreference.toFixed(2)}`);
            console.log(`     Content: ${rec.contentBased.toFixed(2)}`);
            console.log(`     Popularity: ${rec.popularity.toFixed(2)}`);
            console.log('');
        });
        
        return recommendations;
    } catch (error) {
        console.error('❌ Error testing recommendations:', error);
        throw error;
    }
}

// Create sample orders to establish user preferences
async function createSampleOrders(userId, restaurantPreferences) {
    try {
        console.log(`📦 Creating sample orders for user: ${userId}`);
        
        const Restaurant = require('../models/Restaurant');
        const MenuItem = require('../models/MenuItem');
        const Order = require('../models/Order');
        
        for (const restPref of restaurantPreferences) {
            const restaurant = await Restaurant.findOne({ 
                name: { $regex: restPref.name, $options: 'i' }
            });
            
            if (!restaurant) {
                console.log(`⚠️ Restaurant ${restPref.name} not found`);
                continue;
            }
            
            const menuItems = await MenuItem.find({ 
                restaurant: restaurant._id,
                isAvailable: true 
            }).limit(2);
            
            if (menuItems.length === 0) {
                console.log(`⚠️ No menu items found for ${restaurant.name}`);
                continue;
            }
            
            // Create multiple orders for strong preference
            for (let i = 0; i < restPref.orderCount; i++) {
                const order = new Order({
                    orderNumber: `SAMPLE_${Date.now()}_${i}`,
                    user: userId,
                    restaurant: restaurant._id,
                    items: menuItems.slice(0, 1).map(item => ({
                        menuItem: item._id,
                        quantity: 1,
                        price: item.price
                    })),
                    deliveryAddress: {
                        street: "Sample Street",
                        area: "Sample Area",
                        city: "Karachi",
                        phone: "0321-0000000"
                    },
                    paymentMethod: "Cash on Delivery",
                    pricing: {
                        subtotal: menuItems[0].price,
                        deliveryFee: restaurant.deliveryFee || 50,
                        total: menuItems[0].price + (restaurant.deliveryFee || 50)
                    },
                    orderStatus: "Delivered",
                    rating: restPref.rating,
                    createdAt: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)) // Spread over weeks
                });
                
                await order.save();
                console.log(`   ✅ Created order for ${restaurant.name} (Rating: ${restPref.rating})`);
            }
        }
        
        console.log('✅ Sample orders created successfully');
    } catch (error) {
        console.error('❌ Error creating sample orders:', error);
        throw error;
    }
}

// Main execution function
async function main() {
    try {
        const args = process.argv.slice(2);
        const command = args[0];
        
        await connectDB();
        
        switch (command) {
            case 'setup':
                console.log('🚀 Setting up test users with preferences...');
                const users = await setupUserPreferences();
                console.log('\n✅ Setup completed! User IDs:');
                console.log(`   Budget User: ${users.budgetUser._id}`);
                console.log(`   KFC User: ${users.kfcUser._id}`);
                console.log(`   Pizza User: ${users.pizzaUser._id}`);
                break;
                
            case 'list':
                await listAllUsers();
                break;
                
            case 'test':
                const userId = args[1];
                if (!userId) {
                    console.log('❌ Please provide a user ID: node setupUserPreferences.js test <userId>');
                    break;
                }
                await testUserRecommendations(userId);
                break;
                
            case 'orders':
                const targetUserId = args[1];
                if (!targetUserId) {
                    console.log('❌ Please provide a user ID: node setupUserPreferences.js orders <userId>');
                    break;
                }
                
                // Create sample orders for KFC user (strong KFC preference)
                if (args[2] === 'kfc') {
                    await createSampleOrders(targetUserId, [
                        { name: 'KFC', orderCount: 3, rating: 5 },
                        { name: 'McDonald', orderCount: 1, rating: 3 }
                    ]);
                }
                // Create sample orders for budget user (Pakistani food)
                else if (args[2] === 'pakistani') {
                    await createSampleOrders(targetUserId, [
                        { name: 'Student Biryani', orderCount: 2, rating: 4 },
                        { name: 'Bundu Khan', orderCount: 1, rating: 5 }
                    ]);
                }
                // Create sample orders for pizza user
                else if (args[2] === 'pizza') {
                    await createSampleOrders(targetUserId, [
                        { name: 'Pizza Hut', orderCount: 2, rating: 4 }
                    ]);
                }
                break;
                
            case 'update':
                const email = args[1];
                if (!email) {
                    console.log('❌ Please provide email: node setupUserPreferences.js update <email>');
                    break;
                }
                
                // Example preference update
                await updateUserPreferences(email, {
                    preferredCuisines: ["Pakistani", "Fast Food"],
                    budgetRange: "Under Rs. 500",
                    spiceTolerance: 3,
                    dietaryRestrictions: ["halal"]
                });
                break;
                
            default:
                console.log('📖 Usage:');
                console.log('  node setupUserPreferences.js setup           - Create test users');
                console.log('  node setupUserPreferences.js list            - List all users');
                console.log('  node setupUserPreferences.js test <userId>   - Test recommendations');
                console.log('  node setupUserPreferences.js orders <userId> <type> - Create sample orders');
                console.log('  node setupUserPreferences.js update <email>  - Update preferences');
                console.log('');
                console.log('📝 Examples:');
                console.log('  node setupUserPreferences.js setup');
                console.log('  node setupUserPreferences.js orders 507f1f77bcf86cd799439011 kfc');
                console.log('  node setupUserPreferences.js test 507f1f77bcf86cd799439011');
        }
        
    } catch (error) {
        console.error('❌ Main execution error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
main();