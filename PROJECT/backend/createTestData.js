// backend/createTestData.js (updated)
const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Order = require('./models/Order');
const MenuItem = require('./models/MenuItem');

require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery');

async function createTestData() {
    console.log('Creating test data for neural system...');
    
    try {
        // Get existing restaurants
        const restaurants = await Restaurant.find({}).limit(5);
        console.log('Found restaurants:', restaurants.length);
        
        // Check for existing users first
        let users = await User.find({ email: { $regex: '.*neural.*' } });
        
        if (users.length === 0) {
            // Create new users if none exist
            const testUsers = [
                {
                    name: 'Ahmed Hassan',
                    email: 'ahmed.neural@test.com',
                    password: 'test123',
                    phone: '03001234567',
                    preferences: {
                        cuisine: ['Pakistani'],
                        budget: 'moderate',
                        dietary: ['halal']
                    }
                },
                {
                    name: 'Fatima Khan',
                    email: 'fatima.neural@test.com',
                    password: 'test123',
                    phone: '03007654321',
                    preferences: {
                        cuisine: ['Chinese', 'Fast Food'],
                        budget: 'budget',
                        dietary: ['none']
                    }
                },
                {
                    name: 'Ali Raza',
                    email: 'ali.neural@test.com',
                    password: 'test123',
                    phone: '03009876543',
                    preferences: {
                        cuisine: ['Italian', 'Pakistani'],
                        budget: 'premium',
                        dietary: ['none']
                    }
                },
                {
                    name: 'Ayesha Ahmad',
                    email: 'ayesha.neural@test.com',
                    password: 'test123',
                    phone: '03005551234',
                    preferences: {
                        cuisine: ['Fast Food'],
                        budget: 'moderate',
                        dietary: ['vegetarian']
                    }
                }
            ];

            users = await User.insertMany(testUsers);
            console.log('Created users:', users.length);
        } else {
            console.log('Using existing users:', users.length);
        }

        // Get menu items
        let menuItems = await MenuItem.find({}).limit(10);
        
        if (menuItems.length === 0) {
            console.log('Creating menu items...');
            
            const testMenuItems = restaurants.flatMap(restaurant => [
                {
                    name: 'Chicken Biryani',
                    description: 'Delicious chicken biryani',
                    price: 450,
                    category: 'Main Course',
                    restaurant: restaurant._id,
                    available: true
                },
                {
                    name: 'Chicken Karahi',
                    description: 'Spicy chicken karahi',
                    price: 350,
                    category: 'Main Course',
                    restaurant: restaurant._id,
                    available: true
                }
            ]);

            menuItems = await MenuItem.insertMany(testMenuItems);
            console.log('Created menu items:', menuItems.length);
        }

        // Check if orders already exist
        const existingOrders = await Order.countDocuments({ 
            user: { $in: users.map(u => u._id) } 
        });
        
        if (existingOrders > 0) {
            console.log('Orders already exist:', existingOrders);
        } else {
            console.log('Creating test orders...');
            
            // Create test orders
            const testOrders = [];
            
            for (let user of users) {
                // Each user orders from 2-3 different restaurants
                const userRestaurants = restaurants.slice(0, Math.floor(Math.random() * 2) + 2);
                
                for (let restaurant of userRestaurants) {
                    const restaurantMenuItems = menuItems.filter(item => 
                        item.restaurant.toString() === restaurant._id.toString()
                    );
                    
                    if (restaurantMenuItems.length > 0) {
                        // Create 1-2 orders per user-restaurant pair
                        const orderCount = Math.floor(Math.random() * 2) + 1;
                        
                        for (let i = 0; i < orderCount; i++) {
                            const selectedItems = restaurantMenuItems
                                .slice(0, Math.floor(Math.random() * 2) + 1)
                                .map(item => ({
                                    menuItem: item._id,
                                    quantity: Math.floor(Math.random() * 2) + 1,
                                    price: item.price
                                }));

                            const subtotal = selectedItems.reduce((sum, item) => 
                                sum + (item.price * item.quantity), 0
                            );

                            const order = {
                                orderNumber: `TEST${Date.now()}${Math.floor(Math.random() * 1000)}`,
                                user: user._id,
                                restaurant: restaurant._id,
                                items: selectedItems,
                                deliveryAddress: {
                                    street: '123 Test Street',
                                    area: 'Test Area',
                                    city: 'Karachi',
                                    phone: user.phone
                                },
                                paymentMethod: 'Cash on Delivery',
                                pricing: {
                                    subtotal: subtotal,
                                    deliveryFee: 50,
                                    tax: 0,
                                    total: subtotal + 50
                                },
                                // Remove orderStatus to use default
                                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
                            };

                            testOrders.push(order);
                        }
                    }
                }
            }

            if (testOrders.length > 0) {
                await Order.insertMany(testOrders);
                console.log('Created orders:', testOrders.length);
            }
        }

        console.log('\nTest data summary:');
        console.log('- Users:', await User.countDocuments());
        console.log('- Restaurants:', await Restaurant.countDocuments());
        console.log('- Menu Items:', await MenuItem.countDocuments());
        console.log('- Orders:', await Order.countDocuments());
        
        console.log('\nNeural system is now ready for testing!');
        
    } catch (error) {
        console.error('Error creating test data:', error);
    } finally {
        mongoose.connection.close();
    }
}

createTestData();