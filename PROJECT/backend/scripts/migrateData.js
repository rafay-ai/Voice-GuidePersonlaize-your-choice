require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('path');
const path = require('path');

// Import models - EXACT names
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

console.log('🚀 Starting migration script...');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/food_delivery_app');
    console.log('✅ MongoDB Connected for migration');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

const createTestData = async () => {
  try {
    console.log('🧪 Creating test data...');
    
    // Create test restaurant
    const restaurant = await Restaurant.findOneAndUpdate(
      { name: 'Test Pizza Place' },
      {
        name: 'Test Pizza Place',
        description: 'Delicious test pizza restaurant',
        image: 'pizza.jpg',
        rating: 4.5,
        priceRange: 'Moderate',
        cuisine: ['Italian', 'Fast Food'],
        deliveryTime: '30-45 mins',
        deliveryFee: 50,
        minimumOrder: 300,
        isActive: true
      },
      { upsert: true, new: true }
    );
    
    console.log('✅ Test restaurant created:', restaurant.name);
    
    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@food.pk' });
    
    if (!adminExists) {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@food.pk',
        password: 'admin123',
        phone: '+923001234567',
        role: 'admin',
        preferences: {
          favoriteRestaurants: [],
          dietaryRestrictions: [],
          preferredCuisines: ['Pakistani', 'Fast Food']
        }
      });
      
      await admin.save();
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
    
    // Create test menu item
    const menuItem = await MenuItem.findOneAndUpdate(
      { name: 'Test Pizza', restaurant: restaurant._id },
      {
        name: 'Test Pizza',
        description: 'Delicious test pizza',
        price: 850,
        image: 'test-pizza.jpg',
        category: 'Main Course',
        restaurant: restaurant._id,
        preparationTime: 20,
        isAvailable: true
      },
      { upsert: true, new: true }
    );
    
    console.log('✅ Test menu item created:', menuItem.name);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
};

const runMigration = async () => {
  console.log('🔄 Starting migration...');
  
  await connectDB();
  await createTestData();
  
  console.log('🎉 Migration completed successfully!');
  console.log('📊 Check MongoDB Compass to see your data');
  
  process.exit(0);
};

runMigration();