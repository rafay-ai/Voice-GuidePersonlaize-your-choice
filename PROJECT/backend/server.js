require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import models
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
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
        res.json({ 
            message: 'Welcome to Pakistani Food Delivery API! 🍕🥘',
            status: 'Server is running',
            database: 'MongoDB Connected',
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
            message: 'Server error',
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
        
        console.log('📦 Received order data:', { userId, restaurantId, items: items?.length });
        
        // Validation
        if (!userId || !restaurantId || !items || !deliveryAddress) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        // FLEXIBLE USER HANDLING: Try to find user, if not found, use the ID as-is
        let user = null;
        let userObjectId = userId;
        
        try {
            // If userId is a valid ObjectId, find the user
            if (userId.match(/^[0-9a-fA-F]{24}$/)) {
                user = await User.findById(userId);
                console.log('✅ Found user:', user?.name);
            } else {
                console.log('⚠️ UserId is not a valid ObjectId, using as-is:', userId);
                // For demo purposes, use a default ObjectId or create one
                userObjectId = '6870bd22f7b37e4543eebd97'; // Your actual user ObjectId
            }
        } catch (userError) {
            console.log('⚠️ User lookup failed, using default ObjectId');
            userObjectId = '6870bd22f7b37e4543eebd97'; // Your actual user ObjectId
        }
        
        // Verify restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        console.log('✅ Found restaurant:', restaurant.name);
        
        // Calculate pricing
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of items) {
            console.log('🔍 Looking for menu item:', item.menuItemId);
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
                
                console.log('✅ Added item:', menuItem.name, 'x', item.quantity);
            } else {
                console.log('❌ Menu item not found:', item.menuItemId);
            }
        }
        
        if (orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid menu items found'
            });
        }
        
        const deliveryFee = restaurant.deliveryFee || 50;
        const total = subtotal + deliveryFee;
        
        // Generate order number
        const orderCount = await Order.countDocuments();
        const orderNumber = `FD${Date.now().toString().slice(-6)}${(orderCount + 1).toString().padStart(3, '0')}`;
        
        console.log('💰 Order totals:', { subtotal, deliveryFee, total });
        
        // Create order
        const newOrder = new Order({
            orderNumber: orderNumber,
            user: userObjectId, // Use the ObjectId
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
        console.log('✅ Order saved:', orderNumber);
        
        // Populate the order for response
        await newOrder.populate(['restaurant', 'items.menuItem']);
        
        res.json({
            success: true,
            message: "Order placed successfully!",
            order: newOrder
        });
        
    } catch (error) {
        console.error('💥 Order creation error:', error);
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
// =============== ANALYTICS ROUTES ===============
// Get dashboard analytics
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        // Get basic counts
        const totalRestaurants = await Restaurant.countDocuments({ isActive: true });
        const totalMenuItems = await MenuItem.countDocuments({ isAvailable: true });
        const totalUsers = await User.countDocuments({ role: 'user' });
        
        // Get order statistics
        const totalOrders = await Order.countDocuments();
        const ordersToday = await Order.countDocuments({ 
            createdAt: { $gte: today } 
        });
        const ordersThisWeek = await Order.countDocuments({ 
            createdAt: { $gte: thisWeek } 
        });
        const ordersThisMonth = await Order.countDocuments({ 
            createdAt: { $gte: thisMonth } 
        });

        // Get revenue statistics
        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$pricing.total" } } }
        ]);
        
        const revenueToday = await Order.aggregate([
            { $match: { createdAt: { $gte: today } } },
            { $group: { _id: null, total: { $sum: "$pricing.total" } } }
        ]);

        const revenueThisMonth = await Order.aggregate([
            { $match: { createdAt: { $gte: thisMonth } } },
            { $group: { _id: null, total: { $sum: "$pricing.total" } } }
        ]);

        // Get order status distribution
        const orderStatusDistribution = await Order.aggregate([
            { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
        ]);

        // Get popular restaurants
        const popularRestaurants = await Order.aggregate([
            { $group: { _id: "$restaurant", orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: 5 },
            { $lookup: { from: "restaurants", localField: "_id", foreignField: "_id", as: "restaurant" } },
            { $unwind: "$restaurant" },
            { $project: { name: "$restaurant.name", orderCount: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalRestaurants,
                    totalMenuItems,
                    totalUsers,
                    totalOrders,
                    totalRevenue: totalRevenue[0]?.total || 0
                },
                orders: {
                    today: ordersToday,
                    thisWeek: ordersThisWeek,
                    thisMonth: ordersThisMonth,
                    total: totalOrders
                },
                revenue: {
                    today: revenueToday[0]?.total || 0,
                    thisMonth: revenueThisMonth[0]?.total || 0,
                    total: totalRevenue[0]?.total || 0
                },
                orderStatusDistribution,
                popularRestaurants
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics',
            error: error.message
        });
    }
});

// Get sales trends (last 7 days)
app.get('/api/analytics/sales-trends', async (req, res) => {
    try {
        const salesTrends = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$pricing.total" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: salesTrends
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching sales trends',
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