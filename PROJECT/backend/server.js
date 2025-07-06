require('dotenv').config();
// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { getChatbotResponse } = require('./services/chatbot');

// Create Express app
const app = express();
const PORT = 5000;

// Middleware (these are like helpers for your server)
app.use(cors()); // Allow frontend to talk to backend
app.use(bodyParser.json()); // Understand JSON data
app.use(express.json());

// Load your data files with error handling
const loadData = (filename) => {
    try {
        const filePath = path.join(__dirname, 'data', filename);
        console.log(`Loading ${filename} from ${filePath}`);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${filename}`);
            return null;
        }
        
        const rawData = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawData);
        console.log(`✅ Successfully loaded ${filename}`);
        return data;
    } catch (error) {
        console.error(`❌ Error loading ${filename}:`, error.message);
        return null;
    }
};

// Check if data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    console.error('❌ Data directory not found! Creating it...');
    fs.mkdirSync(dataDir);
    console.log('📁 Data directory created. Please add your JSON files.');
}

// Load all your data
console.log('🔄 Loading data files...');
let restaurants = loadData('restaurants.json');
let menuItems = loadData('menu_items.json');
let userPreferences = loadData('user_preferences.json');
let orderHistory = loadData('order_history.json');
let areas = loadData('areas_karachi.json');

// Check if any data failed to load
if (!restaurants || !menuItems || !userPreferences || !orderHistory || !areas) {
    console.error('❌ Some data files failed to load. Server will start with limited functionality.');
    
    // Provide default empty data structures
    restaurants = restaurants || { restaurants: [] };
    menuItems = menuItems || { menu_items: [] };
    userPreferences = userPreferences || { user_preferences: [] };
    orderHistory = orderHistory || { orders: [] };
    areas = areas || { cities: {} };
}

// Root route - just to check if server is running
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Pakistani Food Delivery API! 🍕🥘',
        status: 'Server is running',
        dataLoaded: {
            restaurants: restaurants?.restaurants?.length || 0,
            menuItems: menuItems?.menu_items?.length || 0,
            users: userPreferences?.user_preferences?.length || 0,
            orders: orderHistory?.orders?.length || 0,
            areas: Object.keys(areas?.cities || {}).length || 0
        },
        endpoints: {
            restaurants: '/api/restaurants',
            menu: '/api/menu/:restaurantId',
            recommendations: '/api/recommendations/:userId',
            order: '/api/order',
            chat: '/api/chat'
        }
    });
});

// Get all restaurants
app.get('/api/restaurants', (req, res) => {
    if (!restaurants || !restaurants.restaurants) {
        return res.status(500).json({
            success: false,
            message: 'Restaurant data not loaded'
        });
    }
    
    res.json({
        success: true,
        count: restaurants.restaurants.length,
        data: restaurants.restaurants
    });
});

// Get restaurants by cuisine
app.get('/api/restaurants/cuisine/:cuisine', (req, res) => {
    if (!restaurants || !restaurants.restaurants) {
        return res.status(500).json({
            success: false,
            message: 'Restaurant data not loaded'
        });
    }
    
    const cuisine = req.params.cuisine;
    const filtered = restaurants.restaurants.filter(r => 
        r.cuisine.some(c => c.toLowerCase().includes(cuisine.toLowerCase()))
    );
    res.json({
        success: true,
        cuisine: cuisine,
        count: filtered.length,
        data: filtered
    });
});

// Get menu for a specific restaurant
app.get('/api/menu/:restaurantId', (req, res) => {
    if (!menuItems || !menuItems.menu_items) {
        return res.status(500).json({
            success: false,
            message: 'Menu data not loaded'
        });
    }
    
    const restaurantId = parseInt(req.params.restaurantId);
    const restaurantMenu = menuItems.menu_items.filter(
        item => item.restaurant_id === restaurantId
    );
    
    if (restaurantMenu.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'No menu found for this restaurant'
        });
    }
    
    res.json({
        success: true,
        restaurant_id: restaurantId,
        items: restaurantMenu
    });
});

// Get user preferences and recommendations
app.get('/api/recommendations/:userId', (req, res) => {
    if (!userPreferences || !userPreferences.user_preferences) {
        return res.status(500).json({
            success: false,
            message: 'User data not loaded'
        });
    }
    
    const userId = req.params.userId;
    
    // Find user preferences
    const userPref = userPreferences.user_preferences.find(
        user => user.user_id === userId
    );
    
    if (!userPref) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }
    
    // Get user's order history
    const userOrders = orderHistory.orders.filter(
        order => order.user_id === userId
    );
    
    // Recommend restaurants based on preferences
    const recommendedRestaurants = restaurants.restaurants.filter(restaurant => {
        // Check if restaurant serves user's favorite cuisines
        return restaurant.cuisine.some(c => 
            userPref.favorite_cuisines.includes(c)
        );
    }).slice(0, 5); // Top 5 recommendations
    
    res.json({
        success: true,
        user_preferences: userPref,
        order_count: userOrders.length,
        recommendations: recommendedRestaurants,
        last_order: userOrders[userOrders.length - 1] || null
    });
});

// AI-Powered Chatbot Endpoint
app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a message'
        });
    }
    
    try {
        // Use AI chatbot
        const chatbotData = await getChatbotResponse(
            message,
            userId || 'guest',
            restaurants.restaurants,
            menuItems.menu_items,
            orderHistory,
            userPreferences
        );
        
        res.json({
            success: true,
            user_message: message,
            bot_response: chatbotData.response,
            recommendations: chatbotData.recommendations,
            user_context: chatbotData.context
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        
        // Fallback to simple response if AI fails
        const lowerMessage = message.toLowerCase();
        let response = '';
        let recommendations = [];
        
        if (lowerMessage.includes('biryani')) {
            recommendations = restaurants.restaurants.filter(r => 
                r.cuisine.some(c => c.toLowerCase().includes('biryani')) || 
                r.name.toLowerCase().includes('biryani')
            );
            response = "Here are great biryani options! Student Biryani is highly recommended for authentic taste.";
        } else if (lowerMessage.includes('hungry') || lowerMessage.includes('bhook')) {
            response = "I'd love to help! What type of food are you craving? We have Pakistani, Chinese, Fast Food, BBQ, and more!";
        } else if (lowerMessage.includes('pizza')) {
            recommendations = restaurants.restaurants.filter(r => 
                r.cuisine.some(c => c.toLowerCase().includes('pizza')) || 
                r.name.toLowerCase().includes('pizza')
            );
            response = "Pizza coming right up! Check out these options:";
        } else if (lowerMessage.includes('cheap') || lowerMessage.includes('budget')) {
            recommendations = restaurants.restaurants.filter(r => 
                r.price_range === 'Budget' || r.price_range === 'Moderate'
            );
            response = "Here are some budget-friendly options that don't compromise on taste:";
        } else if (lowerMessage.includes('order') || lowerMessage.includes('place order')) {
            response = "Sure! To place an order, please tell me:\n1. Which restaurant?\n2. What items would you like?\n3. Your delivery address?";
        } else {
            response = "I'm here to help you order delicious food! You can ask me about:\n- Restaurant recommendations\n- Specific cuisines (Biryani, Pizza, Chinese, etc.)\n- Budget-friendly options\n- How to place an order\n\nWhat sounds good to you today?";
        }
        
        res.json({
            success: true,
            user_message: message,
            bot_response: response,
            recommendations: recommendations
        });
    }
});

// Place an order
app.post('/api/order', (req, res) => {
    const { userId, restaurantId, items, deliveryAddress, paymentMethod } = req.body;
    
    if (!userId || !restaurantId || !items || !deliveryAddress) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: userId, restaurantId, items, deliveryAddress'
        });
    }
    
    // Calculate total
    let subtotal = 0;
    items.forEach(item => {
        subtotal += item.unit_price * item.quantity;
    });
    
    // Get delivery fee based on area
    const deliveryFee = 50; // Default delivery fee
    
    const newOrder = {
        order_id: `ORD${Date.now()}`,
        user_id: userId,
        restaurant_id: restaurantId,
        items: items,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        grand_total: subtotal + deliveryFee,
        delivery_address: deliveryAddress,
        payment_method: paymentMethod || "Cash on Delivery",
        order_date: new Date().toISOString().split('T')[0],
        order_time: new Date().toLocaleTimeString('en-US'),
        status: "confirmed",
        estimated_delivery: "30-45 minutes"
    };
    
    // In a real app, you would save this to a database
    // For now, we'll just return the order
    res.json({
        success: true,
        message: "Order placed successfully!",
        order: newOrder
    });
});

// Get delivery areas
app.get('/api/areas/:city', (req, res) => {
    if (!areas || !areas.cities) {
        return res.status(500).json({
            success: false,
            message: 'Areas data not loaded'
        });
    }
    
    const city = req.params.city.toLowerCase();
    const cityAreas = areas.cities[city];
    
    if (!cityAreas) {
        return res.status(404).json({
            success: false,
            message: 'City not found'
        });
    }
    
    res.json({
        success: true,
        city: city,
        areas: cityAreas.areas
    });
});

// Search restaurants
app.get('/api/search', (req, res) => {
    if (!restaurants || !restaurants.restaurants) {
        return res.status(500).json({
            success: false,
            message: 'Restaurant data not loaded'
        });
    }
    
    const { query } = req.query;
    
    if (!query) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a search query'
        });
    }
    
    const searchResults = restaurants.restaurants.filter(r => 
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.cuisine.some(c => c.toLowerCase().includes(query.toLowerCase()))
    );
    
    res.json({
        success: true,
        query: query,
        count: searchResults.length,
        results: searchResults
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log('📍 Your API endpoints are ready!');
    console.log('🍕 Happy food ordering!');
    console.log('\n📊 Data Status:');
    console.log(`   - Restaurants loaded: ${restaurants?.restaurants?.length || 0}`);
    console.log(`   - Menu items loaded: ${menuItems?.menu_items?.length || 0}`);
    console.log(`   - Users loaded: ${userPreferences?.user_preferences?.length || 0}`);
    console.log(`   - Orders loaded: ${orderHistory?.orders?.length || 0}`);
});