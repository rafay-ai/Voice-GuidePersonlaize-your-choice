// Save as: backend/scripts/createSampleOrders.js (FIXED VERSION)
// Enhanced script to create diverse sample orders for neural training

const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

async function createSampleOrders() {
    console.log('🛒 Creating Enhanced Sample Orders for Neural Training...');
    console.log('🎯 Goal: Generate diverse user-restaurant interactions\n');
    
    try {
        // Connect to MongoDB
        console.log('🔗 Connecting to database...');
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('✅ Database connected\n');
        
        // Get current data
        const users = await User.find({});
        const restaurants = await Restaurant.find({});
        const existingOrders = await Order.countDocuments();
        
        console.log('📊 Current Data:');
        console.log(`   👥 Users: ${users.length}`);
        console.log(`   🏪 Restaurants: ${restaurants.length}`);
        console.log(`   📦 Existing Orders: ${existingOrders}`);
        
        if (users.length === 0 || restaurants.length === 0) {
            console.log('\n❌ No users or restaurants found!');
            console.log('🔧 Run this first: node scripts/seedPakistaniFood.js');
            return;
        }
        
        // Target: Create diverse interactions
        const targetInteractions = Math.max(30, users.length * restaurants.length * 0.4);
        console.log(`🎯 Target: ${Math.floor(targetInteractions)} unique user-restaurant interactions\n`);
        
        let ordersCreated = 0;
        const interactionMap = new Set();
        
        // Strategy: Each user orders from multiple restaurants with varying frequency
        for (const user of users) {
            console.log(`👤 Creating orders for ${user.name}...`);
            
            // Each user will order from 60-80% of restaurants
            const numRestaurantsToOrderFrom = Math.floor(restaurants.length * (0.6 + Math.random() * 0.2));
            const selectedRestaurants = [...restaurants]
                .sort(() => 0.5 - Math.random())
                .slice(0, numRestaurantsToOrderFrom);
            
            for (const restaurant of selectedRestaurants) {
                const interactionKey = `${user._id}_${restaurant._id}`;
                
                // Skip if we already created this interaction
                if (interactionMap.has(interactionKey)) continue;
                interactionMap.add(interactionKey);
                
                // Get menu items for this restaurant
                const menuItems = await MenuItem.find({ 
                    restaurant: restaurant._id,
                    available: true 
                });
                
                if (menuItems.length === 0) {
                    console.log(`   ⚠️ No menu items for ${restaurant.name}, skipping...`);
                    continue;
                }
                
                // Create 1-4 orders from this restaurant (weighted toward 1-2)
                const orderFrequency = Math.random();
                let numOrders;
                if (orderFrequency < 0.5) numOrders = 1;      // 50% - 1 order
                else if (orderFrequency < 0.8) numOrders = 2; // 30% - 2 orders  
                else if (orderFrequency < 0.95) numOrders = 3; // 15% - 3 orders
                else numOrders = 4;                            // 5% - 4 orders
                
                let restaurantRating = 0; // FIXED: Initialize rating variable
                let validOrdersForRestaurant = 0;
                
                for (let orderIndex = 0; orderIndex < numOrders; orderIndex++) {
                    try {
                        // Select 1-3 menu items randomly
                        const numItems = Math.min(
                            Math.floor(Math.random() * 3) + 1,
                            menuItems.length
                        );
                        const selectedItems = [...menuItems]
                            .sort(() => 0.5 - Math.random())
                            .slice(0, numItems);
                        
                        let subtotal = 0;
                        const orderItems = [];
                        
                        selectedItems.forEach(item => {
                            const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 items
                            const itemTotal = item.price * quantity;
                            subtotal += itemTotal;
                            
                            orderItems.push({
                                menuItem: item._id,
                                quantity: quantity,
                                price: item.price,
                                specialInstructions: ''
                            });
                        });
                        
                        const deliveryFee = restaurant.deliveryFee || 50;
                        const total = subtotal + deliveryFee;
                        
                        // Create realistic order timing (spread over last 60 days)
                        const daysAgo = Math.floor(Math.random() * 60);
                        const orderDate = new Date();
                        orderDate.setDate(orderDate.getDate() - daysAgo);
                        
                        // Set realistic order time (lunch: 11-15, dinner: 18-22)
                        const isLunch = Math.random() > 0.4; // 60% dinner, 40% lunch
                        if (isLunch) {
                            orderDate.setHours(11 + Math.floor(Math.random() * 4)); // 11-14
                        } else {
                            orderDate.setHours(18 + Math.floor(Math.random() * 4)); // 18-21
                        }
                        orderDate.setMinutes(Math.floor(Math.random() * 60));
                        
                        // Generate order number (FIXED: Add this required field)
                        const orderCount = await Order.countDocuments();
                        const orderNumber = `FD${Date.now().toString().slice(-6)}${(orderCount + ordersCreated + 1).toString().padStart(3, '0')}`;
                        
                        // Create the order
                        const order = new Order({
                            orderNumber: orderNumber, // FIXED: Add required orderNumber
                            user: user._id,
                            restaurant: restaurant._id,
                            items: orderItems,
                            deliveryAddress: {
                                street: user.address?.street || `Sample Street ${Math.floor(Math.random() * 100)}`,
                                area: user.address?.area || "Sample Area",
                                city: user.address?.city || "Karachi",
                                phone: user.phone || "0300-1234567",
                                coordinates: {
                                    type: 'Point',
                                    coordinates: [
                                        67.0011 + (Math.random() - 0.5) * 0.1, // Spread around Karachi
                                        24.8607 + (Math.random() - 0.5) * 0.1
                                    ]
                                }
                            },
                            paymentMethod: Math.random() > 0.7 ? 'Online Payment' : 'Cash on Delivery',
                            pricing: {
                                subtotal: subtotal,
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
                        
                        // Add realistic rating (weighted toward positive)
                        const ratingProbability = Math.random();
                        let currentOrderRating;
                        if (ratingProbability < 0.05) currentOrderRating = 2;      // 5% - poor
                        else if (ratingProbability < 0.15) currentOrderRating = 3; // 10% - okay  
                        else if (ratingProbability < 0.45) currentOrderRating = 4; // 30% - good
                        else currentOrderRating = 5;                               // 55% - excellent
                        
                        // FIXED: Properly set rating object
                        order.rating = {
                            overall: currentOrderRating,
                            restaurant: currentOrderRating,
                            delivery: Math.max(1, currentOrderRating + (Math.random() > 0.5 ? 0 : -1)),
                            review: currentOrderRating >= 4 ? "Great food!" : "Good experience",
                            ratedAt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000)
                        };
                        
                        await order.save();
                        ordersCreated++;
                        validOrdersForRestaurant++;
                        
                        // Track rating for restaurant summary
                        restaurantRating += currentOrderRating;
                        
                        if (ordersCreated % 5 === 0) {
                            console.log(`   📦 Created ${ordersCreated} orders...`);
                        }
                        
                    } catch (orderError) {
                        console.log(`   ❌ Order creation failed: ${orderError.message}`);
                    }
                }
                
                // FIXED: Calculate average rating properly
                const avgRating = validOrdersForRestaurant > 0 ? (restaurantRating / validOrdersForRestaurant).toFixed(1) : 'N/A';
                console.log(`   ✅ ${restaurant.name}: ${validOrdersForRestaurant} orders (${avgRating}⭐ avg)`);
            }
        }
        
        // Update user analytics
        console.log('\n📈 Updating user analytics...');
        for (const user of users) {
            try {
                const userOrders = await Order.find({ user: user._id });
                if (userOrders.length === 0) continue;
                
                const totalSpent = userOrders.reduce((sum, order) => sum + order.pricing.total, 0);
                const avgOrderValue = totalSpent / userOrders.length;
                
                // Update user preferences
                user.preferences = user.preferences || {};
                user.preferences.totalOrders = userOrders.length;
                user.preferences.totalSpent = totalSpent;
                user.preferences.averageOrderValue = avgOrderValue;
                user.preferences.lastOrderDate = userOrders[0]?.createdAt;
                
                // Update loyalty status
                if (totalSpent >= 15000) user.loyaltyStatus = 'Gold';
                else if (totalSpent >= 8000) user.loyaltyStatus = 'Silver';
                else if (totalSpent >= 3000) user.loyaltyStatus = 'Bronze';
                
                user.loyaltyPoints = Math.floor(totalSpent / 100);
                
                await user.save();
                console.log(`   👤 ${user.name}: ${userOrders.length} orders, Rs.${totalSpent.toFixed(0)}, ${user.loyaltyStatus}`);
                
            } catch (analyticsError) {
                console.log(`   ⚠️ Analytics update failed for ${user.name}: ${analyticsError.message}`);
            }
        }
        
        // Final statistics
        console.log('\n📊 FINAL STATISTICS:');
        const finalOrders = await Order.countDocuments();
        const uniqueInteractions = interactionMap.size;
        const sparsity = 1 - (uniqueInteractions / (users.length * restaurants.length));
        
        console.log(`   📦 Total Orders: ${finalOrders} (Created: ${ordersCreated})`);
        console.log(`   🔗 Unique User-Restaurant Interactions: ${uniqueInteractions}`);
        console.log(`   📊 Data Sparsity: ${(sparsity * 100).toFixed(2)}%`);
        console.log(`   📈 Avg Orders per User: ${(finalOrders / users.length).toFixed(2)}`);
        console.log(`   📈 Avg Orders per Restaurant: ${(finalOrders / restaurants.length).toFixed(2)}`);
        
        // Neural training readiness
        console.log('\n🎯 NEURAL TRAINING READINESS:');
        if (uniqueInteractions >= 20 && finalOrders >= 30) {
            console.log('✅ EXCELLENT: Dataset ready for neural training!');
            console.log('🚀 Next step: node scripts/trainNeuralModel.js');
        } else if (uniqueInteractions >= 15 && finalOrders >= 20) {
            console.log('✅ GOOD: Dataset suitable for neural training');
            console.log('🚀 Next step: node scripts/trainNeuralModel.js');
        } else if (uniqueInteractions >= 10 && finalOrders >= 15) {
            console.log('⚠️ MINIMUM: Dataset meets basic requirements');
            console.log('💡 Consider running this script again for better results');
        } else {
            console.log('❌ INSUFFICIENT: Need more diverse interactions');
            console.log('🔧 Run this script again or add more users/restaurants');
        }
        
        // Show sample interactions
        console.log('\n📝 Sample Interactions Created:');
        const sampleOrders = await Order.find({})
            .populate('user', 'name')
            .populate('restaurant', 'name')
            .limit(10)
            .sort({ createdAt: -1 });
        
        sampleOrders.forEach((order, idx) => {
            if (order.user && order.restaurant) {
                console.log(`   ${idx + 1}. ${order.user.name} → ${order.restaurant.name} (Rs.${order.pricing.total})`);
            }
        });
        
        console.log('\n🎉 Sample order creation completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Sample order creation failed:', error);
        console.error('Stack:', error.stack);
        
        console.log('\n🔧 Troubleshooting:');
        console.log('   • Check database connection');
        console.log('   • Ensure users and restaurants exist');
        console.log('   • Verify menu items are available');
        console.log('   • Check Order model schema requirements');
        
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Export for use in other scripts
module.exports = { createSampleOrders };

// Run if called directly
if (require.main === module) {
    createSampleOrders();
}