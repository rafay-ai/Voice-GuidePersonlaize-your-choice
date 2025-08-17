// Debug script for recommendation system
// Save this as: backend/debug/testRecommendations.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const AdvancedRecommendationEngine = require('../services/advancedRecommendation');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/food_delivery_app');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Connection error:', error);
    process.exit(1);
  }
};

// Create test users with specific preferences
async function createTestUsers() {
  try {
    console.log('\n🔧 Creating test users...');

    // Test User 1: Budget Pakistani food lover
    const budgetUser = await User.findOneAndUpdate(
      { email: "budget@test.com" },
      {
        name: "Ahmed Budget",
        email: "budget@test.com",
        password: "hashedpassword123",
        phone: "0321-1111111",
        preferences: {
          preferredCuisines: ["Pakistani", "Biryani"],
          dietaryRestrictions: ["halal"],
          budgetRange: "Under Rs. 500",
          spiceTolerance: 3,
          averageOrderValue: 400
        },
        isActive: true
      },
      { upsert: true, new: true }
    );

    // Test User 2: KFC lover
    const kfcUser = await User.findOneAndUpdate(
      { email: "kfc@test.com" },
      {
        name: "Sara KFC Lover",
        email: "kfc@test.com", 
        password: "hashedpassword123",
        phone: "0321-2222222",
        preferences: {
          preferredCuisines: ["Fast Food", "Chicken"],
          dietaryRestrictions: ["halal"],
          budgetRange: "Rs. 500-1000",
          spiceTolerance: 2,
          averageOrderValue: 800
        },
        isActive: true
      },
      { upsert: true, new: true }
    );

    // Test User 3: Pizza enthusiast
    const pizzaUser = await User.findOneAndUpdate(
      { email: "pizza@test.com" },
      {
        name: "Ali Pizza Fan",
        email: "pizza@test.com",
        password: "hashedpassword123", 
        phone: "0321-3333333",
        preferences: {
          preferredCuisines: ["Pizza", "Italian"],
          dietaryRestrictions: ["halal"],
          budgetRange: "Rs. 1000-2000",
          spiceTolerance: 1,
          averageOrderValue: 1200
        },
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log('✅ Test users created:');
    console.log(`   1. ${budgetUser.name} (${budgetUser._id}) - Pakistani/Budget`);
    console.log(`   2. ${kfcUser.name} (${kfcUser._id}) - Fast Food/KFC`);
    console.log(`   3. ${pizzaUser.name} (${pizzaUser._id}) - Pizza/Premium`);

    return { budgetUser, kfcUser, pizzaUser };
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  }
}

// Create test orders to establish preferences
async function createTestOrders(users) {
  try {
    console.log('\n📦 Creating test orders...');

    const restaurants = await Restaurant.find({ isActive: true });
    const kfcRestaurant = restaurants.find(r => r.name.toLowerCase().includes('kfc'));
    const studentBiryani = restaurants.find(r => r.name.toLowerCase().includes('student'));
    const pizzaHut = restaurants.find(r => r.name.toLowerCase().includes('pizza'));

    if (!kfcRestaurant || !studentBiryani || !pizzaHut) {
      console.error('❌ Required restaurants not found');
      return;
    }

    // Get menu items
    const kfcItems = await MenuItem.find({ restaurant: kfcRestaurant._id }).limit(2);
    const biryaniItems = await MenuItem.find({ restaurant: studentBiryani._id }).limit(2);
    const pizzaItems = await MenuItem.find({ restaurant: pizzaHut._id }).limit(2);

    // Create multiple KFC orders for KFC user (to establish strong preference)
    for (let i = 0; i < 3; i++) {
      const kfcOrder = new Order({
        orderNumber: `TEST_KFC_${Date.now()}_${i}`,
        user: users.kfcUser._id,
        restaurant: kfcRestaurant._id,
        items: kfcItems.map(item => ({
          menuItem: item._id,
          quantity: 1,
          price: item.price
        })),
        deliveryAddress: {
          street: "Test Street",
          area: "DHA Phase 5", 
          city: "Karachi",
          phone: "0321-2222222"
        },
        paymentMethod: "Cash on Delivery",
        pricing: {
          subtotal: kfcItems.reduce((sum, item) => sum + item.price, 0),
          deliveryFee: 50,
          total: kfcItems.reduce((sum, item) => sum + item.price, 0) + 50
        },
        orderStatus: "Delivered",
        rating: 5, // High rating to boost preference
        createdAt: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)) // Spread over weeks
      });
      await kfcOrder.save();
    }

    // Create budget Pakistani orders for budget user
    for (let i = 0; i < 2; i++) {
      const biryaniOrder = new Order({
        orderNumber: `TEST_BIRYANI_${Date.now()}_${i}`,
        user: users.budgetUser._id,
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
          phone: "0321-1111111"
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
    }

    // Create pizza orders for pizza user
    const pizzaOrder = new Order({
      orderNumber: `TEST_PIZZA_${Date.now()}`,
      user: users.pizzaUser._id,
      restaurant: pizzaHut._id,
      items: pizzaItems.slice(0, 1).map(item => ({
        menuItem: item._id,
        quantity: 1,
        price: item.price
      })),
      deliveryAddress: {
        street: "Premium Street",
        area: "Clifton",
        city: "Karachi",
        phone: "0321-3333333"
      },
      paymentMethod: "Credit Card",
      pricing: {
        subtotal: pizzaItems[0].price,
        deliveryFee: 70,
        total: pizzaItems[0].price + 70
      },
      orderStatus: "Delivered", 
      rating: 4,
      createdAt: new Date(Date.now() - (5 * 24 * 60 * 60 * 1000))
    });
    await pizzaOrder.save();

    console.log('✅ Test orders created:');
    console.log(`   - 3 KFC orders for ${users.kfcUser.name} (all rated 5 stars)`);
    console.log(`   - 2 Biryani orders for ${users.budgetUser.name}`);
    console.log(`   - 1 Pizza order for ${users.pizzaUser.name}`);

  } catch (error) {
    console.error('❌ Error creating test orders:', error);
    throw error;
  }
}

// Test recommendations for each user
async function testRecommendations(users) {
  try {
    console.log('\n🎯 Testing recommendations...');
    
    const engine = new AdvancedRecommendationEngine();

    console.log('\n' + '='.repeat(80));
    console.log('📊 TESTING BUDGET USER (Pakistani/Biryani preference)');
    console.log('='.repeat(80));
    
    const budgetRecommendations = await engine.getPersonalizedRecommendations(
      users.budgetUser._id.toString(),
      { count: 5 }
    );

    console.log('\n🎯 Budget User Recommendations:');
    budgetRecommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.restaurant.name}`);
      console.log(`   Score: ${rec.finalScore.toFixed(3)}`);
      console.log(`   Cuisine: ${rec.restaurant.cuisine?.join(', ')}`);
      console.log(`   Price Range: ${rec.restaurant.priceRange}`);
      console.log(`   Explanations: ${rec.explanations.join(', ')}`);
      console.log(`   Breakdown: Personal=${rec.personalPreference.toFixed(2)}, Content=${rec.contentBased.toFixed(2)}, Popular=${rec.popularity.toFixed(2)}`);
      console.log('');
    });

    console.log('\n' + '='.repeat(80));
    console.log('🍗 TESTING KFC USER (Should see KFC in top 3)');
    console.log('='.repeat(80));

    const kfcRecommendations = await engine.getPersonalizedRecommendations(
      users.kfcUser._id.toString(), 
      { count: 5 }
    );

    console.log('\n🎯 KFC User Recommendations:');
    kfcRecommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.restaurant.name}`);
      console.log(`   Score: ${rec.finalScore.toFixed(3)}`);
      console.log(`   Cuisine: ${rec.restaurant.cuisine?.join(', ')}`);
      console.log(`   Previous Orders: ${rec.debug?.userOrderedBefore ? 'YES' : 'NO'}`);
      console.log(`   Explanations: ${rec.explanations.join(', ')}`);
      console.log(`   Breakdown: Personal=${rec.personalPreference.toFixed(2)}, Collab=${rec.collaborative.toFixed(2)}, Content=${rec.contentBased.toFixed(2)}`);
      console.log('');
    });

    // Check if KFC is in top 3 for KFC user
    const kfcInTop3 = kfcRecommendations.slice(0, 3).some(rec => 
      rec.restaurant.name.toLowerCase().includes('kfc')
    );
    
    console.log(`🔍 KFC in top 3 recommendations: ${kfcInTop3 ? '✅ YES' : '❌ NO'}`);

    console.log('\n' + '='.repeat(80));
    console.log('🍕 TESTING PIZZA USER');
    console.log('='.repeat(80));

    const pizzaRecommendations = await engine.getPersonalizedRecommendations(
      users.pizzaUser._id.toString(),
      { count: 5 }
    );

    console.log('\n🎯 Pizza User Recommendations:');
    pizzaRecommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.restaurant.name}`);
      console.log(`   Score: ${rec.finalScore.toFixed(3)}`);
      console.log(`   Cuisine: ${rec.restaurant.cuisine?.join(', ')}`);
      console.log(`   Price Range: ${rec.restaurant.priceRange}`);
      console.log(`   Explanations: ${rec.explanations.join(', ')}`);
      console.log('');
    });

    return { budgetRecommendations, kfcRecommendations, pizzaRecommendations };

  } catch (error) {
    console.error('❌ Error testing recommendations:', error);
    throw error;
  }
}

// Analyze system data
async function analyzeSystemData() {
  try {
    console.log('\n📊 SYSTEM DATA ANALYSIS');
    console.log('='.repeat(50));

    const userCount = await User.countDocuments();
    const restaurantCount = await Restaurant.countDocuments();
    const orderCount = await Order.countDocuments();
    const menuItemCount = await MenuItem.countDocuments();

    console.log(`👥 Users: ${userCount}`);
    console.log(`🏪 Restaurants: ${restaurantCount}`);
    console.log(`📦 Orders: ${orderCount}`);
    console.log(`🍽️ Menu Items: ${menuItemCount}`);

    // Show restaurant distribution
    console.log('\n🏪 Restaurant Breakdown:');
    const restaurants = await Restaurant.find({}, 'name cuisine priceRange rating');
    restaurants.forEach(restaurant => {
      console.log(`   ${restaurant.name}: ${restaurant.cuisine?.join(', ')} (${restaurant.priceRange}) ⭐${restaurant.rating}`);
    });

    // Show orders by restaurant
    console.log('\n📦 Orders by Restaurant:');
    const ordersByRestaurant = await Order.aggregate([
      { $group: { _id: '$restaurant', count: { $sum: 1 } } },
      { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $sort: { count: -1 } }
    ]);

    ordersByRestaurant.forEach(item => {
      console.log(`   ${item.restaurant.name}: ${item.count} orders`);
    });

  } catch (error) {
    console.error('❌ Error analyzing system data:', error);
  }
}

// Test specific recommendation scenarios
async function testSpecificScenarios(users) {
  try {
    console.log('\n🧪 TESTING SPECIFIC SCENARIOS');
    console.log('='.repeat(50));

    const engine = new AdvancedRecommendationEngine();

    // Test 1: New user with preferences
    console.log('\n🆕 Test 1: New user with Pakistani cuisine preference');
    const newUser = await User.create({
      name: "New Pakistani User",
      email: "newpakistani@test.com",
      password: "hashedpassword123",
      phone: "0321-9999999",
      preferences: {
        preferredCuisines: ["Pakistani"],
        dietaryRestrictions: ["halal"],
        budgetRange: "Under Rs. 500"
      }
    });

    const newUserRecs = await engine.getPersonalizedRecommendations(
      newUser._id.toString(),
      { count: 3 }
    );

    console.log('New user recommendations:');
    newUserRecs.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.restaurant.name} (${rec.restaurant.cuisine?.join(', ')}) - Score: ${rec.finalScore.toFixed(3)}`);
    });

    // Test 2: User with no preferences
    console.log('\n👤 Test 2: User with no preferences (should get popular restaurants)');
    const noPrefsUser = await User.create({
      name: "No Preferences User",
      email: "noprefs@test.com", 
      password: "hashedpassword123",
      phone: "0321-8888888"
    });

    const noPrefsRecs = await engine.getPersonalizedRecommendations(
      noPrefsUser._id.toString(),
      { count: 3 }
    );

    console.log('No preferences user recommendations:');
    noPrefsRecs.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.restaurant.name} - Score: ${rec.finalScore.toFixed(3)} (${rec.explanations.join(', ')})`);
    });

    // Cleanup test users
    await User.deleteOne({ _id: newUser._id });
    await User.deleteOne({ _id: noPrefsUser._id });

  } catch (error) {
    console.error('❌ Error testing specific scenarios:', error);
  }
}

// Main test function
async function runAllTests() {
  try {
    await connectDB();
    
    console.log('🚀 STARTING RECOMMENDATION SYSTEM DEBUG');
    console.log('=' .repeat(80));

    // Step 1: Analyze current system data
    await analyzeSystemData();

    // Step 2: Create test users
    const users = await createTestUsers();

    // Step 3: Create test orders to establish preferences
    await createTestOrders(users);

    // Step 4: Test recommendations
    const recommendations = await testRecommendations(users);

    // Step 5: Test specific scenarios
    await testSpecificScenarios(users);

    console.log('\n🎉 DEBUG COMPLETED SUCCESSFULLY!');
    console.log('\n📝 SUMMARY:');
    console.log('- Check if KFC user has KFC in top 3 recommendations');
    console.log('- Check if budget user gets Pakistani/affordable restaurants');
    console.log('- Check if explanations make sense');
    console.log('- Verify that scores reflect user preferences');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the tests
runAllTests();