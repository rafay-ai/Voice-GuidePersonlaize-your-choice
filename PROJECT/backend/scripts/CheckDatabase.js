// backend/scripts/checkDatabase.js
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery');

async function checkDatabase() {
  try {
    console.log('🔍 Checking database contents...\n');
    
    // Check restaurants
    const restaurants = await Restaurant.find({});
    console.log(`📍 Found ${restaurants.length} restaurants:`);
    restaurants.forEach(restaurant => {
      console.log(`   - ${restaurant.name} (${restaurant.cuisine.join(', ')})`);
    });
    
    console.log('\n');
    
    // Check menu items
    const menuItems = await MenuItem.find({}).populate('restaurant', 'name');
    console.log(`🍽️  Found ${menuItems.length} menu items:`);
    
    const itemsByRestaurant = {};
    menuItems.forEach(item => {
      const restaurantName = item.restaurant?.name || 'Unknown';
      if (!itemsByRestaurant[restaurantName]) {
        itemsByRestaurant[restaurantName] = [];
      }
      itemsByRestaurant[restaurantName].push(item.name);
    });
    
    Object.keys(itemsByRestaurant).forEach(restaurantName => {
      console.log(`\n   ${restaurantName}:`);
      itemsByRestaurant[restaurantName].forEach(itemName => {
        console.log(`     - ${itemName}`);
      });
    });
    
    console.log('\n✅ Database check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

checkDatabase();