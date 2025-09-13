// backend/scripts/setup/createRealisticOrders.js
// Generate realistic order patterns for better recommendation training

const mongoose = require('mongoose');
const User = require('../../models/User');
const Restaurant = require('../../models/Restaurant');
const MenuItem = require('../../models/MenuItem');
const Order = require('../../models/Order');

async function createRealisticOrders() {
    console.log('📦 Creating realistic order patterns for ML training...');
    console.log('🎯 This will generate diverse user-restaurant interactions\n');
    
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery');
        console.log('✅ Database connected');
        
        // Get all data
        const users = await User.find({});
        const restaurants = await Restaurant.find({ isActive: true });
        const allMenuItems = await MenuItem.find({ available: true });
        
        console.log(`📊 Data loaded: ${users.length} users, ${restaurants.length} restaurants, ${allMenuItems.length} menu items`);
        
        // Clear existing orders to create fresh patterns
        const existingOrders = await Order.countDocuments();
        if (existingOrders > 0) {
            console.log(`🗑️ Removing ${existingOrders} existing orders for fresh patterns`);
            await Order.deleteMany({});
        }
        
        let totalOrdersCreated = 0;
        const userOrderPatterns = new Map();
        
        // Generate orders for each user based on their preferences
        for (const user of users) {
            console.log(`\n👤 Creating orders for ${user.name}...`);
            
            const userPreferences = user.preferences || {};
            const preferredCuisines = userPreferences.preferredCuisines || [];
            const budgetRange = userPreferences.budgetRange || { min: 200, max: 1000 };
            const spiceLevel = userPreferences.spiceLevel || 'Medium';
            
            console.log(`   🎯 Preferences: ${preferredCuisines.join(', ')} | Budget: Rs.${budgetRange.min}-${budgetRange.max} | Spice: ${spiceLevel}`);
            
            // Determine number of orders for this user (based on user type)
            let orderCount;
            if (budgetRange.max > 2500) {
                orderCount = Math.floor(Math.random() * 15) + 8; // Premium users: 8-22 orders
            } else if (budgetRange.max > 1500) {
                orderCount = Math.floor(Math.random() * 10) + 5; // Moderate users: 5-14 orders
            } else {
                orderCount = Math.floor(Math.random() * 8) + 3; // Budget users: 3-10 orders
            }
            
            console.log(`   📈 Target orders: ${orderCount}`);
            
            // Find restaurants that match user preferences
            const matchingRestaurants = restaurants.filter(restaurant => {
                // Check cuisine match
                const cuisineMatch = preferredCuisines.length === 0 || 
                    restaurant.cuisine.some(cuisine => preferredCuisines.includes(cuisine));
                
                // Check price range compatibility
                const priceMatch = 
                    (restaurant.priceRange === 'Budget' && budgetRange.max >= 800) ||
                    (restaurant.priceRange === 'Moderate' && budgetRange.max >= 1200) ||
                    (restaurant.priceRange === 'Premium' && budgetRange.max >= 2000) ||
                    (restaurant.priceRange === 'Luxury' && budgetRange.max >= 3000);
                
                return cuisineMatch || priceMatch;
            });
            
            console.log(`   🏪 Matching restaurants: ${matchingRestaurants.length}`);
            
            const userOrders = [];
            const restaurantOrderCount = new Map();
            
            for (let i = 0; i < orderCount; i++) {
                try {
                    // Select restaurant (80% from matching, 20% random for discovery)
                    let selectedRestaurant;
                    if (Math.random() < 0.8 && matchingRestaurants.length > 0) {
                        selectedRestaurant = matchingRestaurants[Math.floor(Math.random() * matchingRestaurants.length)];
                    } else {
                        selectedRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
                    }
                    
                    // Check if user has ordered from this restaurant too frequently
                    const currentCount = restaurantOrderCount.get(selectedRestaurant._id.toString()) || 0;
                    if (currentCount >= 4) {
                        // Try to find a different restaurant
                        const alternativeRestaurants = matchingRestaurants.filter(r => 
                            (restaurantOrderCount.get(r._id.toString()) || 0) < 3
                        );
                        if (alternativeRestaurants.length > 0) {
                            selectedRestaurant = alternativeRestaurants[Math.floor(Math.random() * alternativeRestaurants.length)];
                        }
                    }
                    
                    // Get menu items for selected restaurant
                    const restaurantMenuItems = allMenuItems.filter(item => 
                        item.restaurant.toString() === selectedRestaurant._id.toString()
                    );
                    
                    if (restaurantMenuItems.length === 0) {
                        console.log(`   ⚠️ No menu items for ${selectedRestaurant.name}, skipping...`);
                        continue;
                    }
                    
                    // Filter menu items by user preferences (FIXED SPICE LEVEL MAPPING)
                    let preferredItems = restaurantMenuItems.filter(item => {
                        // Fixed spice level filtering to match User model enums
                        let spiceMatch = true;
                        if (item.spiceLevel) {
                            // Map menu item spice levels to user preference compatibility
                            const itemSpice = item.spiceLevel.toLowerCase();
                            
                            switch (spiceLevel) {
                                case 'Mild':
                                    spiceMatch = ['mild'].includes(itemSpice);
                                    break;
                                case 'Medium':
                                    spiceMatch = ['mild', 'medium'].includes(itemSpice);
                                    break;
                                case 'Spicy':
                                    spiceMatch = ['mild', 'medium', 'hot'].includes(itemSpice);
                                    break;
                                case 'Very Spicy':
                                    spiceMatch = ['medium', 'hot', 'very_hot'].includes(itemSpice);
                                    break;
                                default:
                                    spiceMatch = true; // Accept any if preference not set
                            }
                        }
                        
                        // Dietary restrictions
                        const dietaryMatch = !userPreferences.dietaryRestrictions || 
                            !userPreferences.dietaryRestrictions.includes('vegetarian') || 
                            item.isVegetarian;
                        
                        // Price filtering
                        const priceMatch = item.price <= budgetRange.max * 0.6; // Single item shouldn't be more than 60% of budget
                        
                        return spiceMatch && dietaryMatch && priceMatch;
                    });
                    
                    // If no preferred items, use all restaurant items
                    if (preferredItems.length === 0) {
                        preferredItems = restaurantMenuItems.filter(item => item.price <= budgetRange.max * 0.7);
                    }
                    
                    if (preferredItems.length === 0) {
                        console.log(`   ⚠️ No suitable items for budget in ${selectedRestaurant.name}`);
                        continue;
                    }
                    
                    // Select 1-3 items for the order
                    const numItems = Math.min(
                        Math.floor(Math.random() * 3) + 1,
                        preferredItems.length
                    );
                    
                    const selectedItems = [];
                    let orderSubtotal = 0;
                    
                    for (let j = 0; j < numItems; j++) {
                        const availableItems = preferredItems.filter(item => 
                            !selectedItems.some(selected => selected._id && selected._id.toString() === item._id.toString()) &&
                            orderSubtotal + item.price <= budgetRange.max - (selectedRestaurant.deliveryFee || 50)
                        );
                        
                        if (availableItems.length === 0) break;
                        
                        const selectedItem = availableItems[Math.floor(Math.random() * availableItems.length)];
                        const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 quantity
                        
                        selectedItems.push({
                            menuItem: selectedItem._id,
                            quantity: quantity,
                            price: selectedItem.price,
                            specialInstructions: ''
                        });
                        
                        orderSubtotal += selectedItem.price * quantity;
                    }
                    
                    if (selectedItems.length === 0) {
                        console.log(`   ⚠️ Could not create order within budget for ${selectedRestaurant.name}`);
                        continue;
                    }
                    
                    const deliveryFee = selectedRestaurant.deliveryFee || 50;
                    const total = orderSubtotal + deliveryFee;
                    
                    // Check if total is within budget
                    if (total > budgetRange.max) {
                        console.log(`   💰 Order total Rs.${total} exceeds budget Rs.${budgetRange.max}`);
                        continue;
                    }
                    
                    // Create realistic order timing (spread over last 60 days)
                    const daysAgo = Math.floor(Math.random() * 60);
                    const orderDate = new Date();
                    orderDate.setDate(orderDate.getDate() - daysAgo);
                    
                    // Set realistic order time based on meal patterns
                    const isWeekend = orderDate.getDay() === 0 || orderDate.getDay() === 6;
                    let hour;
                    
                    const mealType = Math.random();
                    if (mealType < 0.15) {
                        // Breakfast 8-11 AM
                        hour = Math.floor(Math.random() * 3) + 8;
                    } else if (mealType < 0.45) {
                        // Lunch 12-3 PM
                        hour = Math.floor(Math.random() * 4) + 12;
                    } else if (mealType < 0.85) {
                        // Dinner 6-10 PM
                        hour = Math.floor(Math.random() * 5) + 18;
                    } else {
                        // Late night 10 PM-1 AM
                        hour = Math.floor(Math.random() * 4) + 22;
                        if (hour > 23) hour = hour - 24;
                    }
                    
                    orderDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
                    
                    // Generate order number
                    const existingOrderCount = await Order.countDocuments();
                    const orderNumber = `FD${Date.now().toString().slice(-6)}${(existingOrderCount + totalOrdersCreated + 1).toString().padStart(3, '0')}`;
                    
                    // Create the order
                    const order = new Order({
                        orderNumber: orderNumber,
                        user: user._id,
                        restaurant: selectedRestaurant._id,
                        items: selectedItems,
                        deliveryAddress: {
                            street: user.address?.street || `${user.name}'s Address`,
                            area: user.address?.area || "Sample Area",
                            city: user.address?.city || "Karachi",
                            phone: user.phone || "0300-1234567"
                        },
                        paymentMethod: Math.random() > 0.7 ? 'Online Payment' : 'Cash on Delivery',
                        pricing: {
                            subtotal: orderSubtotal,
                            deliveryFee: deliveryFee,
                            tax: 0,
                            total: total
                        },
                        orderStatus: 'Delivered', // All sample orders are completed
                        createdAt: orderDate,
                        estimatedDeliveryTime: new Date(orderDate.getTime() + 45 * 60000),
                        actualDeliveryTime: new Date(orderDate.getTime() + (30 + Math.random() * 30) * 60000)
                    });
                    
                    await order.save();
                    
                    // Add rating (user satisfaction simulation)
                    const ratingProbability = Math.random();
                    let rating;
                    
                    // Higher-rated restaurants get better ratings
                    const restaurantRating = selectedRestaurant.rating || 3.5;
                    if (restaurantRating >= 4.5) {
                        // Excellent restaurants
                        if (ratingProbability < 0.7) rating = 5;
                        else if (ratingProbability < 0.9) rating = 4;
                        else rating = 3;
                    } else if (restaurantRating >= 4.0) {
                        // Good restaurants
                        if (ratingProbability < 0.5) rating = 5;
                        else if (ratingProbability < 0.8) rating = 4;
                        else if (ratingProbability < 0.95) rating = 3;
                        else rating = 2;
                    } else {
                        // Average restaurants
                        if (ratingProbability < 0.3) rating = 5;
                        else if (ratingProbability < 0.6) rating = 4;
                        else if (ratingProbability < 0.85) rating = 3;
                        else if (ratingProbability < 0.95) rating = 2;
                        else rating = 1;
                    }
                    
                    order.rating = {
                        overall: rating,
                        restaurant: rating,
                        delivery: Math.max(1, rating + (Math.random() > 0.5 ? 0 : -1)),
                        review: rating >= 4 ? "Great food!" : rating >= 3 ? "Good experience" : "Could be better",
                        ratedAt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000)
                    };
                    
                    await order.save();
                    
                    userOrders.push(order);
                    totalOrdersCreated++;
                    
                    // Update restaurant order count for this user
                    restaurantOrderCount.set(selectedRestaurant._id.toString(), 
                        (restaurantOrderCount.get(selectedRestaurant._id.toString()) || 0) + 1);
                    
                } catch (orderError) {
                    console.log(`   ❌ Failed to create order: ${orderError.message}`);
                }
            }
            
            // Update user analytics using the enhanced User model methods
            if (userOrders.length > 0) {
                const totalSpent = userOrders.reduce((sum, order) => sum + order.pricing.total, 0);
                const avgOrderValue = totalSpent / userOrders.length;
                
                // Update user preferences with order analytics
                user.preferences.totalOrders = userOrders.length;
                user.preferences.totalSpent = totalSpent;
                user.preferences.averageOrderValue = avgOrderValue;
                user.preferences.lastOrderDate = userOrders[0]?.createdAt;
                
                // Update loyalty status using the User model method
                user.loyaltyPoints = Math.floor(totalSpent / 100);
                user.updateLoyaltyStatus();
                
                await user.save();
                
                console.log(`   ✅ Created ${userOrders.length} orders | Total: Rs.${totalSpent.toFixed(0)} | Status: ${user.loyaltyStatus}`);
                
                // Store user pattern for analysis
                userOrderPatterns.set(user._id.toString(), {
                    orderCount: userOrders.length,
                    totalSpent: totalSpent,
                    avgOrderValue: avgOrderValue,
                    favoriteRestaurants: Array.from(restaurantOrderCount.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([restaurantId, count]) => ({ restaurantId, count }))
                });
            } else {
                console.log(`   ⚠️ No orders created for ${user.name}`);
            }
        }
        
        // Final statistics and analysis
        const finalStats = await generateFinalStatistics();
        
        console.log('\n🎉 REALISTIC ORDER GENERATION COMPLETED!');
        console.log('==================================================');
        console.log(`📊 FINAL STATISTICS:`);
        console.log(`   📦 Total Orders Created: ${totalOrdersCreated}`);
        console.log(`   👥 Users with Orders: ${finalStats.usersWithOrders}`);
        console.log(`   🏪 Restaurants with Orders: ${finalStats.restaurantsWithOrders}`);
        console.log(`   💰 Total Revenue: Rs.${finalStats.totalRevenue.toFixed(0)}`);
        console.log(`   📈 Avg Order Value: Rs.${finalStats.avgOrderValue.toFixed(0)}`);
        console.log(`   🔗 Unique User-Restaurant Pairs: ${finalStats.uniquePairs}`);
        console.log(`   📉 Data Sparsity: ${finalStats.sparsity.toFixed(2)}%`);
        
        console.log('\n🎯 RECOMMENDATION SYSTEM READINESS:');
        if (finalStats.sparsity < 95 && finalStats.uniquePairs > 30) {
            console.log('✅ EXCELLENT: Great data density for Matrix Factorization!');
        } else if (finalStats.sparsity < 98 && finalStats.uniquePairs > 20) {
            console.log('✅ GOOD: Sufficient data for collaborative filtering');
        } else {
            console.log('⚠️ MODERATE: Basic recommendations possible, more data beneficial');
        }
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Test recommendations: curl http://localhost:5000/api/recommendations/status');
        console.log('2. Train Matrix Factorization: Your system will auto-learn from this data');
        console.log('3. Test with different users to see personalized recommendations');
        
    } catch (error) {
        console.error('\n❌ Order creation failed:', error);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Generate final statistics for analysis
async function generateFinalStatistics() {
    try {
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalRestaurants = await Restaurant.countDocuments();
        
        // Get users with orders
        const usersWithOrders = await Order.distinct('user');
        
        // Get restaurants with orders
        const restaurantsWithOrders = await Order.distinct('restaurant');
        
        // Calculate total revenue
        const revenueData = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$pricing.total' } } }
        ]);
        const totalRevenue = revenueData[0]?.total || 0;
        
        // Calculate average order value
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        // Calculate unique user-restaurant pairs
        const uniquePairs = await Order.aggregate([
            { $group: { _id: { user: '$user', restaurant: '$restaurant' } } },
            { $count: 'uniquePairs' }
        ]);
        const uniquePairCount = uniquePairs[0]?.uniquePairs || 0;
        
        // Calculate sparsity
        const maxPossiblePairs = totalUsers * totalRestaurants;
        const sparsity = maxPossiblePairs > 0 ? (1 - uniquePairCount / maxPossiblePairs) * 100 : 100;
        
        return {
            usersWithOrders: usersWithOrders.length,
            restaurantsWithOrders: restaurantsWithOrders.length,
            totalRevenue,
            avgOrderValue,
            uniquePairs: uniquePairCount,
            sparsity
        };
    } catch (error) {
        console.error('Error generating statistics:', error);
        return {
            usersWithOrders: 0,
            restaurantsWithOrders: 0,
            totalRevenue: 0,
            avgOrderValue: 0,
            uniquePairs: 0,
            sparsity: 100
        };
    }
}

// Export for use in other scripts
module.exports = { createRealisticOrders };

// Run if called directly
if (require.main === module) {
    createRealisticOrders();
}