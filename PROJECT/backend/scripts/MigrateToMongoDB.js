// backend/scripts/migrateToMongoDB.js - COMPLETE MIGRATION SCRIPT
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pakistani-food-delivery';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Connection error:', error);
        process.exit(1);
    }
};

const loadJSONData = (filename) => {
    try {
        const filePath = path.join(__dirname, '../data', filename);
        console.log(`📄 Loading: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ File not found: ${filename}`);
            return null;
        }
        
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`✅ Loaded ${filename}`);
        return parsed;
    } catch (error) {
        console.error(`❌ Error loading ${filename}:`, error);
        return null;
    }
};

const migrateRestaurants = async () => {
    try {
        console.log('\n🏪 Migrating restaurants...');
        const data = loadJSONData('restaurants.json');
        
        if (!data || !data.restaurants) {
            console.log('⚠️ No restaurant data found');
            return [];
        }
        
        const restaurants = data.restaurants;
        console.log(`📊 Found ${restaurants.length} restaurants`);
        
        const migratedRestaurants = [];
        
        for (const restaurant of restaurants) {
            const restaurantData = {
                name: restaurant.name,
                description: restaurant.description,
                image: restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
                rating: restaurant.rating || 0,
                priceRange: mapPriceRange(restaurant.price_range),
                cuisine: Array.isArray(restaurant.cuisine) ? restaurant.cuisine : [restaurant.cuisine],
                deliveryTime: restaurant.delivery_time || '30-45 mins',
                deliveryFee: restaurant.delivery_fee || 50,
                minimumOrder: restaurant.minimum_order || 200,
                isActive: true
            };
            
            const savedRestaurant = await Restaurant.findOneAndUpdate(
                { name: restaurant.name },
                restaurantData,
                { upsert: true, new: true }
            );
            
            migratedRestaurants.push({
                oldId: restaurant.id,
                newId: savedRestaurant._id,
                restaurant: savedRestaurant
            });
            
            console.log(`✅ Migrated: ${savedRestaurant.name} (${restaurant.id} → ${savedRestaurant._id})`);
        }
        
        console.log(`🎉 Successfully migrated ${restaurants.length} restaurants`);
        return migratedRestaurants;
        
    } catch (error) {
        console.error('❌ Error migrating restaurants:', error);
        return [];
    }
};

const migrateMenuItems = async (restaurantMap) => {
    try {
        console.log('\n🍕 Migrating menu items...');
        const data = loadJSONData('menu_items.json');
        
        if (!data || !data.menu_items) {
            console.log('⚠️ No menu items data found');
            return;
        }
        
        const menuItems = data.menu_items;
        console.log(`📊 Found ${menuItems.length} menu items`);
        
        let migratedCount = 0;
        
        for (const item of menuItems) {
            // Find the corresponding new restaurant ID
            const restaurantMapping = restaurantMap.find(r => r.oldId === item.restaurant_id);
            
            if (restaurantMapping) {
                const menuItemData = {
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    image: item.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
                    category: mapCategory(item.category),
                    restaurant: restaurantMapping.newId,
                    isVegetarian: item.vegetarian || false,
                    isVegan: item.vegan || false,
                    isGlutenFree: item.gluten_free || false,
                    spiceLevel: mapSpiceLevel(item.spice_level),
                    ingredients: item.ingredients || [],
                    allergens: item.allergens || [],
                    preparationTime: item.preparation_time || 20,
                    isAvailable: true,
                    popularity: item.popular ? 90 : Math.floor(Math.random() * 50) + 30
                };
                
                await MenuItem.findOneAndUpdate(
                    { name: item.name, restaurant: restaurantMapping.newId },
                    menuItemData,
                    { upsert: true, new: true }
                );
                
                migratedCount++;
                if (migratedCount % 10 === 0) {
                    console.log(`📈 Migrated ${migratedCount} menu items...`);
                }
            } else {
                console.log(`⚠️ No restaurant mapping found for menu item: ${item.name} (restaurant_id: ${item.restaurant_id})`);
            }
        }
        
        console.log(`🎉 Successfully migrated ${migratedCount} menu items`);
        
    } catch (error) {
        console.error('❌ Error migrating menu items:', error);
    }
};

const createSampleUsers = async () => {
    try {
        console.log('\n👥 Creating sample users...');
        
        const sampleUsers = [
            {
                name: 'Ahmed Khan',
                email: 'ahmed@example.com',
                password: '123456',
                phone: '+92-300-1234567',
                address: {
                    street: '123 Main Street',
                    area: 'Gulshan-e-Iqbal',
                    city: 'Karachi',
                    zipCode: '75300'
                },
                preferences: {
                    preferredCuisines: ['Pakistani', 'Fast Food'],
                    spiceLevel: 'Spicy',
                    dietaryRestrictions: ['halal'],
                    budgetRange: { min: 300, max: 1500 }
                }
            },
            {
                name: 'Fatima Ali',
                email: 'fatima@example.com',
                password: '123456',
                phone: '+92-301-7654321',
                address: {
                    street: '456 Garden Road',
                    area: 'Defence',
                    city: 'Karachi',
                    zipCode: '75500'
                },
                preferences: {
                    preferredCuisines: ['Italian', 'Chinese'],
                    spiceLevel: 'Medium',
                    dietaryRestrictions: ['halal', 'vegetarian'],
                    budgetRange: { min: 500, max: 2500 }
                }
            },
            {
                name: 'Hassan Ahmed',
                email: 'hassan@example.com',
                password: '123456',
                phone: '+92-302-9876543',
                address: {
                    street: '789 University Road',
                    area: 'North Nazimabad',
                    city: 'Karachi',
                    zipCode: '74700'
                },
                preferences: {
                    preferredCuisines: ['Pakistani', 'Arabian'],
                    spiceLevel: 'Very Spicy',
                    dietaryRestrictions: ['halal'],
                    budgetRange: { min: 200, max: 1000 }
                }
            }
        ];
        
        const createdUsers = [];
        
        for (const userData of sampleUsers) {
            const user = await User.findOneAndUpdate(
                { email: userData.email },
                userData,
                { upsert: true, new: true }
            );
            
            createdUsers.push(user);
            console.log(`✅ Created user: ${user.name} (${user.email})`);
        }
        
        console.log(`🎉 Successfully created ${createdUsers.length} sample users`);
        return createdUsers;
        
    } catch (error) {
        console.error('❌ Error creating sample users:', error);
        return [];
    }
};

const createSampleOrders = async (users, restaurantMap) => {
    try {
        console.log('\n📦 Creating sample orders...');
        
        if (users.length === 0 || restaurantMap.length === 0) {
            console.log('⚠️ No users or restaurants available for creating orders');
            return;
        }
        
        let ordersCreated = 0;
        
        for (const user of users) {
            const numOrders = Math.floor(Math.random() * 3) + 2; // 2-4 orders per user
            
            for (let i = 0; i < numOrders; i++) {
                const randomRestaurant = restaurantMap[Math.floor(Math.random() * restaurantMap.length)];
                
                // Get menu items for this restaurant
                const menuItems = await MenuItem.find({ 
                    restaurant: randomRestaurant.newId,
                    isAvailable: true 
                });
                
                if (menuItems.length > 0) {
                    const orderItems = [];
                    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
                    
                    for (let j = 0; j < numItems; j++) {
                        const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
                        const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 quantity
                        
                        orderItems.push({
                            menuItem: randomItem._id,
                            quantity: quantity,
                            price: randomItem.price,
                            specialInstructions: ''
                        });
                    }
                    
                    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const deliveryFee = randomRestaurant.restaurant.deliveryFee;
                    const total = subtotal + deliveryFee;
                    
                    // Create order
                    const order = new Order({
                        user: user._id,
                        restaurant: randomRestaurant.newId,
                        items: orderItems,
                        deliveryAddress: {
                            street: user.address.street,
                            area: user.address.area,
                            city: user.address.city,
                            phone: user.phone,
                            coordinates: {
                                type: 'Point',
                                coordinates: [67.0011 + (Math.random() - 0.5) * 0.1, 24.8607 + (Math.random() - 0.5) * 0.1]
                            }
                        },
                        paymentMethod: ['Cash on Delivery', 'Online Payment'][Math.floor(Math.random() * 2)],
                        pricing: {
                            subtotal: subtotal,
                            deliveryFee: deliveryFee,
                            tax: 0,
                            total: total
                        },
                        orderStatus: 'Delivered',
                        estimatedDeliveryTime: new Date(Date.now() + 45 * 60000),
                        actualDeliveryTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
                    });
                    
                    await order.save();
                    
                    // Update user preferences using the model method
                    await user.addOrderToHistory({
                        orderId: order._id,
                        restaurantId: randomRestaurant.newId,
                        restaurantName: randomRestaurant.restaurant.name,
                        total: total
                    });
                    
                    ordersCreated++;
                    
                    if (ordersCreated % 5 === 0) {
                        console.log(`📈 Created ${ordersCreated} orders...`);
                    }
                }
            }
        }
        
        console.log(`🎉 Successfully created ${ordersCreated} sample orders`);
        
    } catch (error) {
        console.error('❌ Error creating sample orders:', error);
    }
};

// Helper functions
const mapPriceRange = (priceRange) => {
    const mapping = {
        'Budget': 'Budget',
        'Moderate': 'Moderate', 
        'Premium': 'Premium',
        'Expensive': 'Premium',
        'Luxury': 'Luxury'
    };
    return mapping[priceRange] || 'Moderate';
};

const mapCategory = (category) => {
    const mapping = {
        'Main': 'Main Course',
        'Starter': 'Starter',
        'Appetizer': 'Appetizer',
        'Dessert': 'Dessert',
        'Beverage': 'Beverage',
        'Drink': 'Beverage',
        'Snack': 'Snack',
        'Side': 'Snack'
    };
    return mapping[category] || 'Main Course';
};

const mapSpiceLevel = (spiceLevel) => {
    if (typeof spiceLevel === 'number') {
        if (spiceLevel <= 1) return 'Mild';
        if (spiceLevel <= 2) return 'Medium';
        if (spiceLevel <= 3) return 'Spicy';
        return 'Very Spicy';
    }
    return spiceLevel || 'Medium';
};

const runFullMigration = async () => {
    console.log('🚀 Starting COMPLETE migration from JSON to MongoDB...');
    console.log('📁 This will migrate your restaurant and menu data to MongoDB\n');
    
    await connectDB();
    
    // Clear existing data (optional)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
        console.log('🧹 Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Restaurant.deleteMany({}),
            MenuItem.deleteMany({}),
            Order.deleteMany({})
        ]);
        console.log('✅ Existing data cleared');
    }
    
    // Step 1: Migrate restaurants
    const restaurantMap = await migrateRestaurants();
    
    // Step 2: Migrate menu items
    await migrateMenuItems(restaurantMap);
    
    // Step 3: Create sample users
    const users = await createSampleUsers();
    
    // Step 4: Create sample orders
    await createSampleOrders(users, restaurantMap);
    
    // Final statistics
    const finalStats = {
        users: await User.countDocuments(),
        restaurants: await Restaurant.countDocuments(),
        menuItems: await MenuItem.countDocuments(),
        orders: await Order.countDocuments()
    };
    
    console.log('\n🎊 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('📊 Final Statistics:');
    console.log(`   Users: ${finalStats.users}`);
    console.log(`   Restaurants: ${finalStats.restaurants}`);
    console.log(`   Menu Items: ${finalStats.menuItems}`);
    console.log(`   Orders: ${finalStats.orders}`);
    
    console.log('\n🔐 Sample Login Credentials:');
    console.log('   Email: ahmed@example.com | Password: 123456');
    console.log('   Email: fatima@example.com | Password: 123456');
    console.log('   Email: hassan@example.com | Password: 123456');
    
    console.log('\n🧪 Test Your API:');
    console.log(`   Registration: POST http://localhost:5000/api/auth/register`);
    console.log(`   Login: POST http://localhost:5000/api/auth/login`);
    console.log(`   Restaurants: GET http://localhost:5000/api/restaurants`);
    console.log(`   Recommendations: GET http://localhost:5000/api/recommendations/advanced/{userId}`);
    
    console.log('\n🔄 Restart your server with: npm run dev');
    
    process.exit(0);
};

// Run migration if called directly
if (require.main === module) {
    runFullMigration().catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
}

module.exports = { runFullMigration };