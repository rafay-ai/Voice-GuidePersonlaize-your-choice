require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
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
            return;
        }
        
        const restaurants = data.restaurants;
        console.log(`📊 Found ${restaurants.length} restaurants`);
        
        for (const restaurant of restaurants) {
            const restaurantData = {
                name: restaurant.name,
                description: restaurant.description,
                image: restaurant.image,
                rating: restaurant.rating || 0,
                priceRange: restaurant.price_range || 'Moderate',
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
            
            console.log(`✅ Migrated: ${savedRestaurant.name}`);
        }
        
        console.log(`🎉 Successfully migrated ${restaurants.length} restaurants`);
        
    } catch (error) {
        console.error('❌ Error migrating restaurants:', error);
    }
};

const migrateMenuItems = async () => {
    try {
        console.log('\n🍕 Migrating menu items...');
        const data = loadJSONData('menu_items.json');
        
        if (!data || !data.menu_items) {
            console.log('⚠️ No menu items data found');
            return;
        }
        
        const menuItems = data.menu_items;
        console.log(`📊 Found ${menuItems.length} menu items`);
        
        // Get all restaurants for mapping
        const restaurantsData = loadJSONData('restaurants.json');
        if (!restaurantsData) return;
        
        let migratedCount = 0;
        
        for (const item of menuItems) {
            // Find restaurant by restaurant_id
            const restaurantData = restaurantsData.restaurants.find(r => r.id === item.restaurant_id);
            
            if (restaurantData) {
                const restaurant = await Restaurant.findOne({ name: restaurantData.name });
                
                if (restaurant) {
                    const menuItemData = {
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        image: item.image,
                        category: item.category || 'Main Course',
                        restaurant: restaurant._id,
                        preparationTime: 20,
                        isAvailable: true
                    };
                    
                    await MenuItem.findOneAndUpdate(
                        { name: item.name, restaurant: restaurant._id },
                        menuItemData,
                        { upsert: true, new: true }
                    );
                    
                    migratedCount++;
                    if (migratedCount % 10 === 0) {
                        console.log(`📈 Migrated ${migratedCount} menu items...`);
                    }
                }
            }
        }
        
        console.log(`🎉 Successfully migrated ${migratedCount} menu items`);
        
    } catch (error) {
        console.error('❌ Error migrating menu items:', error);
    }
};

const runMigration = async () => {
    console.log('🚀 Starting REAL data migration...');
    console.log('📁 This will migrate your actual restaurant and menu data\n');
    
    await connectDB();
    
    // Clear test data first
    console.log('🧹 Clearing test data...');
    await Restaurant.deleteMany({ name: 'Test Pizza Place' });
    await MenuItem.deleteMany({});
    
    await migrateRestaurants();
    await migrateMenuItems();
    
    console.log('\n🎊 REAL DATA MIGRATION COMPLETED!');
    console.log('🔄 Refresh your frontend to see all restaurants!');
    
    process.exit(0);
};

runMigration();