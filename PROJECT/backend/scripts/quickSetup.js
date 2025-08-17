// Quick test script to create users and orders
// Save as: backend/scripts/quickSetup.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/food_delivery_app');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Connection error:', error);
    process.exit(1);
  }
};

async function quickSetup() {
  try {
    await connectDB();
    
    console.log('🚀 Quick setup starting...');
    
    // 1. Create budget user
    const budgetUser = await User.findOneAndUpdate(
      { email: "budget@test.com" },
      {
        $set: {
          name: "Ahmed Budget",
          email: "budget@test.com",
          password: "$2a$10$hashedpassword",
          phone: "0321-1234567",
          preferences: {
            preferredCuisines: ["Pakistani", "Biryani", "Traditional"],
            dietaryRestrictions: ["halal"],
            budgetRange: "Under Rs. 500",
            spiceTolerance: 3,
            averageOrderValue: 400
          },
          address: {
            street: "Block 13-D, House 45",
            area: "Gulshan-e-Iqbal",
            city: "Karachi"
          },
          isActive: true
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('✅ Budget user created:', budgetUser._id);
    
    // 2. Create KFC user
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
            averageOrderValue: 800
          },
          address: {
            street: "Khayaban-e-Seher, House 22",
            area: "DHA Phase 5",
            city: "Karachi"
          },
          isActive: true
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('✅ KFC user created:', kfcUser._id);
    
    // 3. Get restaurants
    const kfcRestaurant = await Restaurant.findOne({ name: /KFC/i });
    const studentBiryani = await Restaurant.findOne({ name: /Student.*Biryani/i });
    const bundyKhan = await Restaurant.findOne({ name: /Bundu.*Khan/i });
    
    if (!kfcRestaurant || !studentBiryani) {
      console.error('❌ Required restaurants not found');
      return;
    }
    
    console.log('✅ Found restaurants:', {
      kfc: kfcRestaurant.name,
      biryani: studentBiryani.name,
      bbq: bundyKhan?.name || 'Not found'
    });
    
    // 4. Get menu items
    const kfcItems = await MenuItem.find({ restaurant: kfcRestaurant._id }).limit(3);
    const biryaniItems = await MenuItem.find({ restaurant: studentBiryani._id }).limit(2);
    
    // 5. Create KFC orders (to establish strong preference)
    for (let i = 0; i < 4; i++) {
      const kfcOrder = new Order({
        orderNumber: `KFC_TEST_${Date.now()}_${i}`,
        user: kfcUser._id,
        restaurant: kfcRestaurant._id,
        items: kfcItems.slice(0, 2).map(item => ({
          menuItem: item._id,
          quantity: 1,
          price: item.price
        })),
        deliveryAddress: {
          street: "Test Street KFC",
          area: "DHA Phase 5",
          city: "Karachi",
          phone: "0333-9876543"
        },
        paymentMethod: "Cash on Delivery",
        pricing: {
          subtotal: kfcItems.slice(0, 2).reduce((sum, item) => sum + item.price, 0),
          deliveryFee: 50,
          total: kfcItems.slice(0, 2).reduce((sum, item) => sum + item.price, 0) + 50
        },
        orderStatus: "Delivered",
        rating: 5, // Perfect rating to boost recommendation
        createdAt: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)) // Spread over weeks
      });
      
      await kfcOrder.save();
      console.log(`✅ Created KFC order ${i + 1} for ${kfcUser.name}`);
    }
    
    // 6. Create budget Pakistani orders
    for (let i = 0; i < 3; i++) {
      const biryaniOrder = new Order({
        orderNumber: `BIRYANI_TEST_${Date.now()}_${i}`,
        user: budgetUser._id,
        restaurant: studentBiryani._id,
        items: biryaniItems.slice(0, 1).map(item => ({
          menuItem: item._id,
          quantity: 1,
          price: item.price
        })),
        deliveryAddress: {
          street: "Budget Street",
          area: "Gulshan-e-Iqbal",
          city: "Karachi",
          phone: "0321-1234567"
        },
        paymentMethod: "Cash on Delivery",
        pricing: {
          subtotal: biryaniItems[0].price,
          deliveryFee: 50,
          total: biryaniItems[0].price + 50
        },
        orderStatus: "Delivered",
        rating: 4,
        createdAt: new Date(Date.now() - (i * 10 * 24 * 60 * 60 * 1000))
      });
      
      await biryaniOrder.save();
      console.log(`✅ Created Pakistani food order ${i + 1} for ${budgetUser.name}`);
    }
    
    console.log('\n🎉 QUICK SETUP COMPLETED!');
    console.log('\n📋 User IDs for frontend:');
    console.log(`Budget User ID: ${budgetUser._id}`);
    console.log(`KFC User ID: ${kfcUser._id}`);
    
    console.log('\n📧 Login credentials:');
    console.log('Budget User: budget@test.com / password');
    console.log('KFC User: kfc@test.com / password');
    
    console.log('\n🧪 Test recommendations:');
    console.log(`curl "http://localhost:5000/api/recommendations/advanced/${budgetUser._id}"`);
    console.log(`curl "http://localhost:5000/api/recommendations/advanced/${kfcUser._id}"`);
    
  } catch (error) {
    console.error('❌ Quick setup error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

quickSetup();