require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import models
const User = require('./models/User.js');
const Restaurant = require('./models/Restaurant.js');
const MenuItem = require('./models/MenuItem.js');
const Order = require('./models/Order.js');

// Import services
const { getChatbotResponse } = require('./services/chatbot');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route - health check
app.get('/', async (req, res) => {
    try {
        const restaurantCount = await Restaurant.countDocuments();
        const menuItemCount = await MenuItem.countDocuments();
        const userCount = await User.countDocuments();
        const orderCount = await Order.countDocuments();

        res.json({ 
            message: 'Welcome to Pakistani Food Delivery API! 🍕🥘',
            status: 'Server is running',
            database: 'MongoDB Connected',
            dataLoaded: {
                restaurants: restaurantCount,
                menuItems: menuItemCount,
                users: userCount,
                orders: orderCount
            },
            endpoints: {
                restaurants: '/api/restaurants',
                menu: '/api/menu/:restaurantId',
                recommendations: '/api/recommendations/:userId',
                order: '/api/order',
                chat: '/api/chat',
                auth: '/api/auth'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection error',
            error: error.message
        });
    }
});

// =============== RESTAURANT ROUTES ===============
// Get all restaurants
app.get('/api/restaurants', async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ isActive: true }).sort({ featured: -1, rating: -1 });
        
        res.json({
            success: true,
            count: restaurants.length,
            data: restaurants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurants',
            error: error.message
        });
    }
});

// Get restaurants by cuisine
app.get('/api/restaurants/cuisine/:cuisine', async (req, res) => {
    try {
        const cuisine = req.params.cuisine;
        const restaurants = await Restaurant.find({
            isActive: true,
            cuisine: { $regex: cuisine, $options: 'i' }
        }).sort({ rating: -1 });
        
        res.json({
            success: true,
            cuisine: cuisine,
            count: restaurants.length,
            data: restaurants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurants by cuisine',
            error: error.message
        });
    }
});

// Get single restaurant
app.get('/api/restaurants/:id', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        res.json({
            success: true,
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurant',
            error: error.message
        });
    }
});

// =============== MENU ROUTES ===============
// Get menu for a specific restaurant
app.get('/api/menu/:restaurantId', async (req, res) => {
    try {
        const restaurantId = req.params.restaurantId;
        
        // Check if restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        const menuItems = await MenuItem.find({ 
            restaurant: restaurantId,
            isAvailable: true 
        }).sort({ category: 1, name: 1 });
        
        res.json({
            success: true,
            restaurant_id: restaurantId,
            restaurant_name: restaurant.name,
            items: menuItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching menu',
            error: error.message
        });
    }
});

// =============== USER & RECOMMENDATION ROUTES ===============
// Get user recommendations
app.get('/api/recommendations/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Get user's order history
        const userOrders = await Order.find({ user: userId })
            .populate('restaurant')
            .sort({ createdAt: -1 });
        
        // Get recommended restaurants based on user preferences
        let recommendedRestaurants;
        if (user.preferences.preferredCuisines.length > 0) {
            recommendedRestaurants = await Restaurant.find({
                isActive: true,
                cuisine: { $in: user.preferences.preferredCuisines }
            }).limit(5).sort({ rating: -1 });
        } else {
            // If no preferences, recommend top-rated restaurants
            recommendedRestaurants = await Restaurant.find({ isActive: true })
                .limit(5)
                .sort({ rating: -1 });
        }
        
        res.json({
            success: true,
            user_preferences: user.preferences,
            order_count: userOrders.length,
            recommendations: recommendedRestaurants,
            last_order: userOrders[0] || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching recommendations',
            error: error.message
        });
    }
});

// =============== ORDER ROUTES ===============
// Place an order
app.post('/api/order', async (req, res) => {
    try {
        const { userId, restaurantId, items, deliveryAddress, paymentMethod, specialInstructions } = req.body;
        
        // Validation
        if (!userId || !restaurantId || !items || !deliveryAddress) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        // Verify user and restaurant exist
        const user = await User.findById(userId);
        const restaurant = await Restaurant.findById(restaurantId);
        
        if (!user || !restaurant) {
            return res.status(404).json({
                success: false,
                message: 'User or restaurant not found'
            });
        }
        
        // Calculate pricing
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of items) {
            const menuItem = await MenuItem.findById(item.menuItemId);
            if (menuItem) {
                const itemTotal = menuItem.price * item.quantity;
                subtotal += itemTotal;
                
                orderItems.push({
                    menuItem: menuItem._id,
                    quantity: item.quantity,
                    price: menuItem.price,
                    specialInstructions: item.specialInstructions || ''
                });
            }
        }
        
        const deliveryFee = restaurant.deliveryFee;
        const total = subtotal + deliveryFee;
        
        // Create order
        const newOrder = new Order({
            user: userId,
            restaurant: restaurantId,
            items: orderItems,
            deliveryAddress: deliveryAddress,
            paymentMethod: paymentMethod || 'Cash on Delivery',
            specialInstructions: specialInstructions || '',
            pricing: {
                subtotal: subtotal,
                deliveryFee: deliveryFee,
                tax: 0,
                total: total
            },
            estimatedDeliveryTime: new Date(Date.now() + 45 * 60000) // 45 minutes from now
        });
        
        // Add to status history
        newOrder.statusHistory.push({
            status: 'Confirmed',
            timestamp: new Date(),
            note: 'Order has been confirmed'
        });
        
        await newOrder.save();
        
        // Populate the order for response
        await newOrder.populate(['user', 'restaurant', 'items.menuItem']);
        
        res.json({
            success: true,
            message: "Order placed successfully!",
            order: newOrder
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error placing order',
            error: error.message
        });
    }
});

// Get user's orders
app.get('/api/orders/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const orders = await Order.find({ user: userId })
            .populate('restaurant')
            .populate('items.menuItem')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: orders.length,
            orders: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
});

// =============== CHAT ROUTE ===============
app.post('/api/chat', async (req, res) => {
    const { message, userId, isOnboarding } = req.body;
    
    if (!message) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a message'
        });
    }
    
    try {
        // Get data for chatbot
        const restaurants = await Restaurant.find({ isActive: true });
        const menuItems = await MenuItem.find({ isAvailable: true });
        
        let userPreferences = null;
        let orderHistory = [];
        
        if (userId && userId !== 'guest') {
            const user = await User.findById(userId);
            if (user) {
                userPreferences = user.preferences;
                orderHistory = await Order.find({ user: userId }).populate('restaurant');
            }
        }
        
        // Convert to format expected by chatbot
        const restaurantData = { restaurants: restaurants };
        const menuData = { menu_items: menuItems };
        const orderData = { orders: orderHistory };
        const userPrefData = userPreferences ? { user_preferences: [userPreferences] } : { user_preferences: [] };
        
        const chatbotData = await getChatbotResponse(
            message,
            userId || 'guest',
            restaurantData.restaurants,
            menuData.menu_items,
            orderData,
            userPrefData
        );
        
        res.json({
            success: true,
            user_message: message,
            bot_response: chatbotData.response,
            recommendations: chatbotData.recommendations,
            user_context: chatbotData.context,
            needsOnboarding: chatbotData.needsOnboarding,
            needsConfirmation: chatbotData.needsConfirmation,
            orderIntent: chatbotData.orderIntent,
            orderPlaced: chatbotData.orderPlaced,
            orderDetails: chatbotData.orderDetails
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        
        // Fallback response
        const lowerMessage = message.toLowerCase();
        let response = '';
        let recommendations = [];
        
        if (lowerMessage.includes('biryani')) {
            const biryaniRestaurants = await Restaurant.find({
                isActive: true,
                $or: [
                    { cuisine: { $regex: 'biryani', $options: 'i' } },
                    { name: { $regex: 'biryani', $options: 'i' } }
                ]
            });
            recommendations = biryaniRestaurants;
            response = "Here are great biryani options! Student Biryani is highly recommended for authentic taste.";
        } else {
            response = "I'm here to help you order delicious food! You can ask me about restaurant recommendations, specific cuisines, or how to place an order. What sounds good to you today?";
        }
        
        res.json({
            success: true,
            user_message: message,
            bot_response: response,
            recommendations: recommendations
        });
    }
});

// =============== SEARCH ROUTE ===============
app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a search query'
            });
        }
        
        const searchResults = await Restaurant.find({
            isActive: true,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { cuisine: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }).sort({ rating: -1 });
        
        res.json({
            success: true,
            query: query,
            count: searchResults.length,
            results: searchResults
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Search error',
            error: error.message
        });
    }
});

// =============== AREAS ROUTE ===============
app.get('/api/areas/:city', async (req, res) => {
    try {
        const city = req.params.city.toLowerCase();
        
        // For now, return static Karachi areas
        // Later you can store this in MongoDB too
        const karachiAreas = [
            "Gulshan-e-Iqbal", "North Nazimabad", "Clifton", "Defence (DHA)",
            "Korangi", "Landhi", "Malir", "Shah Faisal Colony", "Gulistan-e-Johar",
            "FB Area", "PECHS", "Nazimabad", "Liaquatabad", "New Karachi",
            "Orangi Town", "Baldia Town", "Site Area", "Lyari", "Saddar",
            "Garden", "Civil Lines", "II Chundrigar Road", "Empress Market",
            "Tariq Road", "Bahadurabad", "Shahra-e-Faisal"
        ];
        
        if (city === 'karachi') {
            res.json({
                success: true,
                city: city,
                areas: karachiAreas
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching areas',
            error: error.message
        });
    }
});

// =============== ERROR HANDLING ===============
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log('📍 Your API endpoints are ready!');
    console.log('🍕 Happy food ordering!');
    console.log('💾 Using MongoDB database');
});