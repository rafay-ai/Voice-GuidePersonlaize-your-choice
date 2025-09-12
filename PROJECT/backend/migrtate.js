require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Connection error:', error);
        process.exit(1);
    }
};

const loadJSONData = (filename) => {
    try {
        const filePath = path.join(__dirname, 'data', filename);
        console.log(`📄 Loading: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ File not found: ${filename}`);
            return null;
        }
        
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`✅ Loaded ${filename} - Sample:`, Object.keys(parsed));
        return parsed;
    } catch (error) {
        console.error(`❌ Error loading ${filename}:`, error);
        return null;
    }
};

const runMigration = async () => {
    console.log('🚀 Starting migration...');
    
    await connectDB();
    
    // Just load and show the structure first
    console.log('\n📊 Checking your data files...');
    const restaurantsData = loadJSONData('restaurants.json');
    const menuData = loadJSONData('menu_items.json');
    
    if (restaurantsData) {
        console.log('🏪 Restaurants structure:', Object.keys(restaurantsData));
        if (restaurantsData.restaurants) {
            console.log('📈 Sample restaurant:', restaurantsData.restaurants[0]);
        }
    }
    
    if (menuData) {
        console.log('🍕 Menu structure:', Object.keys(menuData));
        if (menuData.menu_items) {
            console.log('📈 Sample menu item:', menuData.menu_items[0]);
        }
    }
    
    console.log('\n✅ Data structure check complete!');
    process.exit(0);
};

runMigration();