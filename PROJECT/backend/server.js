require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import models
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const AdvancedRecommendationEngine = require('./services/advancedRecommendation');

// Import services
const { getChatbotResponse } = require('./services/chatbot');
const { DynamicPricingEngine } = require('./services/dynamicPricing');
const EnhancedChatbotService = require('./services/enhancedChatbot');
const VoiceProcessor = require('./services/voiceProcessor');
// ✅ FIXED: Import auth routes properly
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');

// ✅ FIXED: Create middleware folder and file first, or comment out for now
// const { authenticateUser } = require('./middleware/auth'); // Comment this out for now

const pricingEngine = new DynamicPricingEngine();
const enhancedChatbot = new EnhancedChatbotService();
const advancedRecommendation = new AdvancedRecommendationEngine();
const voiceProcessor = new VoiceProcessor();
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

console.log('🔧 Setting up routes...');
console.log('🎯 Advanced Recommendation Engine status:', !!advancedRecommendation);

// Test the service directly
try {
    console.log('🧪 Testing advanced recommendation service...');
    if (advancedRecommendation && typeof advancedRecommendation.getPersonalizedRecommendations === 'function') {
        console.log('✅ Advanced recommendation service is working');
    } else {
        console.log('❌ Advanced recommendation service is NOT working');
        console.log('Service type:', typeof advancedRecommendation);
        console.log('Service methods:', Object.getOwnPropertyNames(advancedRecommendation));
    }
} catch (error) {
    console.error('❌ Service test error:', error);
}

// Simple test route
app.get('/api/test/enhanced', (req, res) => {
    console.log('🧪 Test route hit');
    res.json({
        success: true,
        message: 'Enhanced recommendation route setup is working',
        serviceAvailable: !!advancedRecommendation,
        timestamp: new Date().toISOString()
    });
});

// =============== DATABASE SETUP ROUTE ===============
app.get('/api/setup-database', async (req, res) => {
    try {
        console.log('🌱 Setting up database with sample data...');
        
        // Check if data already exists
        const userCount = await User.countDocuments();
        const restaurantCount = await Restaurant.countDocuments();
        
        if (userCount > 0 && restaurantCount > 0) {
            return res.json({
                success: true,
                message: 'Database already has data',
                stats: {
                    users: userCount,
                    restaurants: restaurantCount,
                    menuItems: await MenuItem.countDocuments(),
                    orders: await Order.countDocuments()
                }
            });
        }
        
        // Import and run seeder
        const { seedDatabase } = require('./scripts/seedDatabase');
        await seedDatabase();
        
        const stats = {
            users: await User.countDocuments(),
            restaurants: await Restaurant.countDocuments(),
            menuItems: await MenuItem.countDocuments(),
            orders: await Order.countDocuments()
        };
        
        res.json({
            success: true,
            message: 'Database setup completed successfully',
            stats: stats,
            loginCredentials: [
                { email: 'ahmed@example.com', password: '123456' },
                { email: 'fatima@example.com', password: '123456' },
                { email: 'hassan@example.com', password: '123456' }
            ]
        });
        
    } catch (error) {
        console.error('Database setup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting up database',
            error: error.message
        });
    }
});

// =============== ENHANCED RECOMMENDATION ROUTES ===============
app.get('/api/recommendations/advanced/:userId', async (req, res) => {
    console.log('🎯 Enhanced recommendations route hit!');
    console.log('   URL:', req.url);
    console.log('   Params:', req.params);
    console.log('   Query:', req.query);
    
    try {
        const { userId } = req.params;
        const { 
            count = 6,
            includeNew = 'true',
            diversityFactor = 0.3 
        } = req.query;
        
        console.log('🔍 Processing request for user:', userId);
        
        // Check if service exists
        if (!advancedRecommendation) {
            console.error('❌ Advanced recommendation service not available');
            return res.status(500).json({
                success: false,
                message: 'Recommendation service not available',
                error: 'Service not initialized'
            });
        }
        
        console.log('🔄 Calling recommendation service...');
        
        // Get user info for debugging (safe handling)
        let userInfo = null;
        try {
            if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
                userInfo = await User.findById(userId);
            }
        } catch (err) {
            console.log('⚠️ Could not fetch user info:', err.message);
        }
        
        const recommendations = await advancedRecommendation.getPersonalizedRecommendations(
            userId, 
            { 
                count: parseInt(count),
                includeNewRestaurants: includeNew === 'true',
                diversityFactor: parseFloat(diversityFactor),
                contextualFactors: {
                    currentTime: new Date()
                }
            }
        );
        
        console.log('✅ Raw recommendations received:', recommendations.length);
        
        // SAFE PROCESSING: Handle both success and empty cases
        if (!recommendations || !Array.isArray(recommendations)) {
            console.log('⚠️ Invalid recommendations format, using fallback');
            
            // Try to get fallback restaurants
            const fallbackRestaurants = await Restaurant.find({ isActive: true })
                .sort({ rating: -1 })
                .limit(parseInt(count));
            
            const fallbackRecommendations = fallbackRestaurants.map(restaurant => ({
                id: restaurant._id,
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                rating: restaurant.rating,
                deliveryTime: restaurant.deliveryTime,
                priceRange: restaurant.priceRange,
                deliveryFee: restaurant.deliveryFee,
                minimumOrder: restaurant.minimumOrder,
                image: restaurant.image,
                score: (restaurant.rating || 0) / 5,
                matchPercentage: Math.round(((restaurant.rating || 0) / 5) * 100),
                explanations: ['⭐ Highly rated'],
                scores: {
                    personal: 0,
                    collaborative: 0,
                    content: (restaurant.rating || 0) / 5,
                    temporal: 0,
                    popularity: (restaurant.rating || 0) / 5
                }
            }));
            
            return res.json({
                success: true,
                count: fallbackRecommendations.length,
                recommendations: fallbackRecommendations,
                fallback: true,
                generatedAt: new Date().toISOString(),
                algorithm: 'fallback_rating_based',
                userId: userId,
                userInfo: userInfo ? {
                    name: userInfo.name,
                    preferences: userInfo.preferences,
                    isRegistered: true
                } : {
                    isRegistered: false,
                    note: 'Guest user or invalid user ID'
                },
                debug: {
                    serviceWorking: true,
                    requestTime: new Date().toISOString(),
                    totalRestaurants: await Restaurant.countDocuments({ isActive: true }),
                    userOrders: userInfo ? await Order.countDocuments({ user: userId }) : 0
                }
            });
        }
        
        // FORMAT RECOMMENDATIONS for frontend
        const formattedRecommendations = recommendations.map((rec, index) => {
            // ULTRA SAFE: Handle missing or malformed data
            if (!rec || !rec.restaurant) {
                console.warn(`⚠️ Skipping invalid recommendation at index ${index}:`, rec);
                return null;
            }
            
            const restaurant = rec.restaurant;
            
            return {
                id: restaurant._id,
                name: restaurant.name || 'Unknown Restaurant',
                cuisine: restaurant.cuisine || ['Various'],
                rating: restaurant.rating || 'New',
                deliveryTime: restaurant.deliveryTime || '30-45 min',
                priceRange: restaurant.priceRange || 'Moderate',
                deliveryFee: restaurant.deliveryFee || 50,
                minimumOrder: restaurant.minimumOrder || 200,
                image: restaurant.image || '',
                
                // Recommendation metadata
                score: Math.round((rec.finalScore || 0) * 100) / 100,
                matchPercentage: Math.round((rec.finalScore || 0) * 100),
                explanations: rec.explanations || ['Recommended for you'],
                
                // Detailed scores for debugging
                scores: {
                    personal: Math.round((rec.personalPreference || 0) * 100) / 100,
                    collaborative: Math.round((rec.collaborative || 0) * 100) / 100,
                    content: Math.round((rec.contentBased || 0) * 100) / 100,
                    temporal: Math.round((rec.temporal || 0) * 100) / 100,
                    popularity: Math.round((rec.popularity || 0) * 100) / 100
                },
                
                // Debug info
                debug: rec.debug || {}
            };
        }).filter(Boolean); // Remove null entries
        
        console.log('✅ Formatted recommendations:', formattedRecommendations.length);
        
        res.json({
            success: true,
            count: formattedRecommendations.length,
            recommendations: formattedRecommendations,
            generatedAt: new Date().toISOString(),
            algorithm: 'advanced_multi_factor',
            userId: userId,
            userInfo: userInfo ? {
                name: userInfo.name,
                preferences: userInfo.preferences,
                isRegistered: true
            } : {
                isRegistered: false,
                note: 'Guest user or invalid user ID'
            },
            debug: {
                serviceWorking: true,
                requestTime: new Date().toISOString(),
                totalRestaurants: await Restaurant.countDocuments({ isActive: true }),
                userOrders: userInfo ? await Order.countDocuments({ user: userId }) : 0,
                rawRecommendationsCount: recommendations.length,
                processedRecommendationsCount: formattedRecommendations.length
            }
        });
        
    } catch (error) {
        console.error('❌ Enhanced recommendations route error:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Fallback to basic recommendations
        try {
            console.log('🔄 Attempting fallback to basic recommendations...');
            const basicRestaurants = await Restaurant.find({ isActive: true })
                .sort({ rating: -1 })
                .limit(parseInt(count));
            
            const fallbackRecommendations = basicRestaurants.map(restaurant => ({
                id: restaurant._id,
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                rating: restaurant.rating,
                deliveryTime: restaurant.deliveryTime,
                priceRange: restaurant.priceRange,
                deliveryFee: restaurant.deliveryFee,
                minimumOrder: restaurant.minimumOrder,
                image: restaurant.image,
                score: (restaurant.rating || 0) / 5,
                matchPercentage: Math.round(((restaurant.rating || 0) / 5) * 100),
                explanations: ['⭐ Highly rated'],
                scores: {
                    personal: 0,
                    collaborative: 0,
                    content: (restaurant.rating || 0) / 5,
                    temporal: 0,
                    popularity: (restaurant.rating || 0) / 5
                }
            }));
            
            res.json({
                success: true,
                count: fallbackRecommendations.length,
                recommendations: fallbackRecommendations,
                fallback: true,
                error: 'Using fallback recommendations due to: ' + error.message,
                timestamp: new Date().toISOString()
            });
            
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            
            res.status(500).json({
                success: false,
                message: 'Error generating recommendations',
                error: error.message,
                fallbackError: fallbackError.message,
                timestamp: new Date().toISOString(),
                debug: {
                    serviceAvailable: !!advancedRecommendation,
                    errorType: error.constructor.name
                }
            });
        }
    }
});

// Dynamic Pricing Middleware
const applyDynamicPricing = async (req, res, next) => {
    try {
        console.log('🎯 Applying dynamic pricing middleware...');
        
        if (req.body.restaurantId && req.body.deliveryAddress) {
            const restaurant = await Restaurant.findById(req.body.restaurantId);
            
            if (restaurant) {
                // Create location object for pricing calculation
                const location = {
                    type: 'Point',
                    coordinates: [
                        req.body.deliveryAddress.longitude || 67.0011, // Default Karachi longitude
                        req.body.deliveryAddress.latitude || 24.8607   // Default Karachi latitude
                    ]
                };
                
                const baseDeliveryFee = restaurant.deliveryFee || 50;
                
                console.log('💰 Calculating pricing for:', {
                    restaurant: restaurant.name,
                    baseDeliveryFee,
                    location
                });
                
                const pricingResult = await pricingEngine.calculateDynamicPrice(
                    req.body.restaurantId,
                    baseDeliveryFee,
                    location
                );
                
                req.dynamicPricing = pricingResult;
                console.log('✅ Dynamic pricing calculated:', pricingResult);
            }
        }
        next();
    } catch (error) {
        console.error('❌ Dynamic pricing middleware error:', error);
        next(); // Continue without pricing if error
    }
};

// ✅ FIXED: User preference update function BEFORE order route
async function updateUserPreferencesAfterOrder(user, restaurant, order, orderItems) {
    try {
        console.log('🔧 Updating user preferences after order...');
        
        // Update order statistics
        user.preferences.totalOrders = (user.preferences.totalOrders || 0) + 1;
        user.preferences.totalSpent = (user.preferences.totalSpent || 0) + order.pricing.total;
        user.preferences.averageOrderValue = user.preferences.totalSpent / user.preferences.totalOrders;
        user.preferences.lastOrderDate = new Date();
        
        // Add restaurant to favorites if ordered frequently
        if (!user.preferences.favoriteRestaurants.includes(restaurant._id)) {
            const orderCount = await Order.countDocuments({
                user: user._id,
                restaurant: restaurant._id
            });
            
            // Add to favorites if ordered 3+ times
            if (orderCount >= 3) {
                user.preferences.favoriteRestaurants.push(restaurant._id);
            }
        }
        
        // Update preferred cuisines
        if (restaurant.cuisine && restaurant.cuisine.length > 0) {
            if (!user.preferences.preferredCuisines) {
                user.preferences.preferredCuisines = [];
            }
            
            restaurant.cuisine.forEach(cuisine => {
                if (!user.preferences.preferredCuisines.includes(cuisine)) {
                    user.preferences.preferredCuisines.push(cuisine);
                }
            });
        }
        
        // Update loyalty status based on total spent
        const totalSpent = user.preferences.totalSpent;
        if (totalSpent >= 50000) {
            user.loyaltyStatus = 'Platinum';
        } else if (totalSpent >= 25000) {
            user.loyaltyStatus = 'Gold';
        } else if (totalSpent >= 10000) {
            user.loyaltyStatus = 'Silver';
        } else if (totalSpent >= 2000) {
            user.loyaltyStatus = 'Bronze';
        }
        
        // Update loyalty points (1 point per 100 PKR spent)
        const pointsEarned = Math.floor(order.pricing.total / 100);
        user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
        
        await user.save();
        console.log('✅ User preferences updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating user preferences:', error);
    }
}

// Root route - health check
app.get('/', async (req, res) => {
    try {
        const stats = {
            users: await User.countDocuments(),
            restaurants: await Restaurant.countDocuments(),
            menuItems: await MenuItem.countDocuments(),
            orders: await Order.countDocuments()
        };
        
        res.json({ 
            message: 'Welcome to Pakistani Food Delivery API! 🍕🥘',
            status: 'Server is running',
            database: 'MongoDB Connected',
            stats: stats,
            setupInstructions: 'Visit /api/setup-database to initialize sample data',
            endpoints: {
                // Authentication
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/profile/:userId',
                updatePreferences: 'PUT /api/auth/preferences/:userId',
                
                // Orders  
                placeOrder: 'POST /api/order',
                userOrders: 'GET /api/orders/:userId',
                
                // Restaurants & Menu
                restaurants: 'GET /api/restaurants',
                restaurant: 'GET /api/restaurants/:id', 
                menu: 'GET /api/menu/:restaurantId',
                
                // AI Features
                recommendations: 'GET /api/recommendations/advanced/:userId',
                chat: 'POST /api/chat',
                search: 'GET /api/search',
                
                // Setup
                setupDatabase: 'GET /api/setup-database'
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

// =============== ORDER ROUTES ===============
// ✅ FIXED: Simplified order placement without authentication for now
app.post('/api/order', applyDynamicPricing, async (req, res) => {
    try {
        const { userId, restaurantId, items, deliveryAddress, paymentMethod, specialInstructions } = req.body;
        
        console.log('📦 Order placement:', { 
            userId, 
            restaurantId, 
            items: items?.length 
        });
        
        // Validation
        if (!userId || !restaurantId || !items || !deliveryAddress) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate user ID format
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format. Please login first.',
                error: 'INVALID_USER_ID'
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found. Please login again.'
            });
        }

        console.log('✅ Found user:', user.name);
        
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
        
        // USE DYNAMIC PRICING if available, otherwise use static pricing
        let deliveryFee = restaurant.deliveryFee || 50;
        let dynamicDeliveryFee = deliveryFee;
        let pricingData = {
            baseDeliveryFee: deliveryFee,
            dynamicDeliveryFee: deliveryFee,
            pricingMultiplier: 1.0,
            surgeActive: false
        };
        
        if (req.dynamicPricing) {
            dynamicDeliveryFee = req.dynamicPricing.dynamicPrice;
            pricingData = {
                baseDeliveryFee: req.dynamicPricing.originalPrice,
                dynamicDeliveryFee: req.dynamicPricing.dynamicPrice,
                pricingMultiplier: req.dynamicPricing.multiplier,
                pricingBreakdown: req.dynamicPricing.breakdown,
                surgeActive: req.dynamicPricing.surgeActive,
                pricingTimestamp: new Date()
            };
            console.log('💰 Using dynamic pricing - Fee changed from', deliveryFee, 'to', dynamicDeliveryFee);
        }
        
        const total = subtotal + dynamicDeliveryFee;
        
        // Generate order number
        const orderCount = await Order.countDocuments();
        const orderNumber = `FD${Date.now().toString().slice(-6)}${(orderCount + 1).toString().padStart(3, '0')}`;
        
        console.log('💰 Order totals:', { subtotal, deliveryFee: dynamicDeliveryFee, total });
        
        // ✅ FIXED: Create order with correct user ID
        const newOrder = new Order({
            orderNumber: orderNumber,
            user: userId, // ✅ Using userId directly
            restaurant: restaurantId,
            items: orderItems,
            deliveryAddress: {
                ...deliveryAddress,
                coordinates: {
                    type: 'Point',
                    coordinates: [
                        deliveryAddress.longitude || 67.0011,
                        deliveryAddress.latitude || 24.8607
                    ]
                }
            },
            paymentMethod: paymentMethod || 'Cash on Delivery',
            specialInstructions: specialInstructions || '',
            pricing: {
                subtotal: subtotal,
                deliveryFee: dynamicDeliveryFee,
                tax: 0,
                total: total,
                // Add dynamic pricing data
                ...pricingData
            },
            estimatedDeliveryTime: new Date(Date.now() + 45 * 60000)
        });
        
        // Add to status history
        newOrder.statusHistory.push({
            status: 'Confirmed',
            timestamp: new Date(),
            note: 'Order has been confirmed'
        });
        
        await newOrder.save();
        console.log('✅ Order saved:', orderNumber);
        
        // ✅ FIXED: Update user preferences after order
        await updateUserPreferencesAfterOrder(user, restaurant, newOrder, orderItems);
        
        // Populate the order for response
        await newOrder.populate(['restaurant', 'items.menuItem']);
        
        res.json({
            success: true,
            message: "Order placed successfully!",
            order: newOrder,
            user: {
                name: user.name,
                loyaltyStatus: user.loyaltyStatus,
                loyaltyPoints: user.loyaltyPoints,
                totalOrders: user.preferences?.totalOrders || 0,
                totalSpent: user.preferences?.totalSpent || 0
            },
            dynamicPricing: req.dynamicPricing || null
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
    const { message, userId, sessionData, isVoiceInput = false } = req.body;
    
    console.log('💬 Chat request:', { message, userId, isVoiceInput });
    
    if (!message) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a message'
        });
    }
    
    try {
        let chatbotResponse;
        
        // If it's a voice input, use voice processor first
        if (isVoiceInput) {
            console.log('🎤 Processing as voice input...');
            
            const voiceResult = await voiceProcessor.processVoiceCommand(message, userId, sessionData);
            
            // Convert voice result to chat response format
            chatbotResponse = {
                message: voiceResult.response,
                type: voiceResult.type || 'voice_processed',
                restaurants: voiceResult.restaurants || [],
                menuItems: voiceResult.menuItems || [],
                actions: voiceResult.actions || [],
                voiceData: {
                    intent: voiceResult.intent,
                    entities: voiceResult.entities,
                    confidence: voiceResult.confidence
                }
            };
            
        } else {
            // Use regular enhanced chatbot service
            chatbotResponse = await enhancedChatbot.getChatbotResponse(message, userId, sessionData);
        }
        
        console.log('🤖 Chat response type:', chatbotResponse.type);
        
        res.json({
            success: true,
            user_message: message,
            bot_response: chatbotResponse.message,
            response_type: chatbotResponse.type,
            data: chatbotResponse,
            isVoiceProcessed: isVoiceInput,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('💥 Chat processing error:', error);
        
        // Fallback response
        res.json({
            success: true,
            user_message: message,
            bot_response: "I'm here to help you order delicious food! What would you like to eat today? 🍕",
            response_type: 'fallback',
            data: {
                type: 'general',
                suggestions: ['Order food', 'Show restaurants', 'My orders', 'Help']
            },
            error: error.message
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

// =============== DYNAMIC PRICING ROUTES ===============
console.log('🚀 Setting up Dynamic Pricing routes...');

// Get dynamic price for a delivery
app.post('/api/pricing/calculate-price', async (req, res) => {
    try {
        console.log('📊 Price calculation request received:', req.body);
        
        const { restaurantId, baseDeliveryFee, location } = req.body;
        
        if (!restaurantId || !baseDeliveryFee || !location) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: restaurantId, baseDeliveryFee, location'
            });
        }

        const pricingResult = await pricingEngine.calculateDynamicPrice(
            restaurantId,
            baseDeliveryFee,
            location
        );

        console.log('✅ Price calculation completed:', pricingResult);

        res.json({
            success: true,
            pricing: pricingResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Pricing API error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            fallbackPrice: req.body.baseDeliveryFee
        });
    }
});

// Get current surge status for area
app.post('/api/pricing/surge-status', async (req, res) => {
    try {
        console.log('🔥 Surge status request:', req.body);
        
        const { location, radius = 5000 } = req.body;
        
        // Calculate current surge factors
        const now = new Date();
        const hour = now.getHours();
        const isPeakTime = [11, 12, 13, 18, 19, 20, 21].includes(hour);
        const isWeekend = [0, 6].includes(now.getDay());
        
        let averageMultiplier = 1.0;
        if (isPeakTime) averageMultiplier += 0.3;
        if (isWeekend) averageMultiplier += 0.1;
        
        // Add some randomness for demand
        if (Math.random() > 0.7) averageMultiplier += 0.2;
        
        const surgeData = {
            active: averageMultiplier > 1.1,
            multiplier: Math.round(averageMultiplier * 100) / 100,
            level: averageMultiplier > 1.5 ? 'high' : averageMultiplier > 1.2 ? 'medium' : 'low',
            factors: {
                time: isPeakTime,
                weather: Math.random() > 0.8, // Random weather impact
                demand: Math.random() > 0.7
            }
        };
        
        console.log('✅ Surge status calculated:', surgeData);
        
        res.json({
            success: true,
            surgeStatus: surgeData
        });
    } catch (error) {
        console.error('❌ Surge status error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get surge status' 
        });
    }
});

// Get pricing analytics (mock data for now)
app.get('/api/pricing/analytics/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { timeRange } = req.query;
        
        console.log('📈 Analytics request for restaurant:', restaurantId);
        
        // Mock analytics data
        const analytics = {
            averageMultiplier: 1.15,
            maxMultiplier: 2.1,
            minMultiplier: 0.85,
            totalSurgeHours: 18,
            revenueIncrease: '12.5%',
            customerSatisfaction: 4.2,
            hourlyBreakdown: Array.from({length: 24}, (_, hour) => ({
                hour,
                averageMultiplier: Math.random() * 0.8 + 0.8,
                orderCount: Math.floor(Math.random() * 50) + 10
            }))
        };
        
        res.json({
            success: true,
            analytics,
            restaurantId
        });
    } catch (error) {
        console.error('❌ Analytics API error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch analytics' 
        });
    }
});
// =============== VOICE PROCESSING ROUTES ===============
console.log('🎤 Setting up Voice Processing routes...');

// Process voice command
app.post('/api/voice/process', async (req, res) => {
    try {
        const { transcript, userId, context = {} } = req.body;
        
        console.log('🎤 Voice processing request:', { 
            transcript: transcript?.substring(0, 50) + '...', 
            userId,
            hasContext: !!context 
        });
        
        if (!transcript || typeof transcript !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Transcript is required and must be a string'
            });
        }
        
        // Process the voice command
        const result = await voiceProcessor.processVoiceCommand(transcript, userId, context);
        
        console.log('✅ Voice processing completed:', {
            intent: result.intent,
            entitiesCount: Object.keys(result.entities || {}).length,
            confidence: result.confidence
        });
        
        res.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Voice processing error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: {
                response: "I'm having trouble processing your voice command. Please try typing instead.",
                type: 'error_fallback'
            }
        });
    }
});

// Voice-powered restaurant search
app.post('/api/voice/search-restaurants', async (req, res) => {
    try {
        const { foodQuery, location, userId } = req.body;
        
        console.log('🔍 Voice restaurant search:', { foodQuery, location, userId });
        
        // Process the food query to extract cuisine/food type
        const processed = await voiceProcessor.processVoiceCommand(
            `find restaurants for ${foodQuery}`, 
            userId
        );
        
        if (processed.entities && processed.entities.foods.length > 0) {
            const foodItem = processed.entities.foods[0];
            const restaurants = await voiceProcessor.findRestaurantsForFood(foodItem);
            
            res.json({
                success: true,
                query: foodQuery,
                detectedFood: foodItem,
                restaurants,
                count: restaurants.length
            });
        } else {
            // Fallback: search all restaurants
            const restaurants = await Restaurant.find({ isActive: true })
                .limit(10)
                .sort({ rating: -1 });
            
            res.json({
                success: true,
                query: foodQuery,
                fallback: true,
                restaurants,
                count: restaurants.length,
                message: 'Showing popular restaurants as fallback'
            });
        }
        
    } catch (error) {
        console.error('❌ Voice restaurant search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Voice-powered menu item search
app.post('/api/voice/search-menu', async (req, res) => {
    try {
        const { restaurantId, foodQuery, userId } = req.body;
        
        console.log('🍽️ Voice menu search:', { restaurantId, foodQuery });
        
        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                error: 'Restaurant ID is required'
            });
        }
        
        // Process the food query
        const processed = await voiceProcessor.processVoiceCommand(
            `find ${foodQuery} on menu`,
            userId
        );
        
        let menuItems = [];
        
        if (processed.entities && processed.entities.foods.length > 0) {
            const foodItem = processed.entities.foods[0];
            menuItems = await voiceProcessor.findMenuItems(foodItem, restaurantId);
        } else {
            // Fallback: search by text similarity
            menuItems = await MenuItem.find({
                restaurant: restaurantId,
                $or: [
                    { name: new RegExp(foodQuery, 'i') },
                    { description: new RegExp(foodQuery, 'i') }
                ],
                isAvailable: true
            }).limit(10);
        }
        
        res.json({
            success: true,
            query: foodQuery,
            restaurantId,
            menuItems,
            count: menuItems.length,
            detectedEntities: processed.entities
        });
        
    } catch (error) {
        console.error('❌ Voice menu search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Voice command validation
app.post('/api/voice/validate', async (req, res) => {
    try {
        const { transcript } = req.body;
        
        if (!transcript) {
            return res.status(400).json({
                success: false,
                error: 'Transcript is required'
            });
        }
        
        const processed = await voiceProcessor.processVoiceCommand(transcript);
        
        const validation = {
            isValid: processed.confidence > 0.3,
            confidence: processed.confidence,
            intent: processed.intent,
            entities: processed.entities,
            suggestions: []
        };
        
        // Add suggestions for low confidence commands
        if (validation.confidence < 0.5) {
            validation.suggestions = [
                'Try speaking more clearly',
                'Use specific food names like "chicken biryani" or "pizza"',
                'Say "I want to order [food name]"',
                'Try "Show me [cuisine type] restaurants"'
            ];
        }
        
        res.json({
            success: true,
            validation,
            originalTranscript: transcript
        });
        
    } catch (error) {
        console.error('❌ Voice validation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get voice command suggestions based on context
app.post('/api/voice/suggestions', async (req, res) => {
    try {
        const { context = {}, userId } = req.body;
        
        console.log('💡 Voice suggestions request for user:', userId);
        
        const suggestions = [];
        
        // Context-aware suggestions
        if (context.selectedRestaurant) {
            suggestions.push(
                `Order from ${context.selectedRestaurant.name}`,
                'Show me the menu',
                'Add biryani to cart',
                'What\'s popular here?'
            );
        } else {
            suggestions.push(
                'I want to order pizza',
                'Show me Chinese restaurants',
                'Find biryani near me',
                'What do you recommend?'
            );
        }
        
        if (context.cartItems && context.cartItems.length > 0) {
            suggestions.push(
                'Show my cart',
                'Place my order',
                'Add more items'
            );
        }
        
        // User-specific suggestions
        if (userId) {
            try {
                const user = await User.findById(userId);
                if (user && user.preferences) {
                    if (user.preferences.favoriteRestaurants && user.preferences.favoriteRestaurants.length > 0) {
                        suggestions.push('Order from my favorite restaurant');
                    }
                    if (user.preferences.preferredCuisines && user.preferences.preferredCuisines.length > 0) {
                        const cuisine = user.preferences.preferredCuisines[0];
                        suggestions.push(`Show me ${cuisine} restaurants`);
                    }
                }
            } catch (error) {
                console.log('⚠️ Could not fetch user preferences:', error.message);
            }
        }
        
        // General suggestions
        suggestions.push(
            'Show my order history',
            'What\'s trending today?',
            'My recommendations'
        );
        
        res.json({
            success: true,
            suggestions: suggestions.slice(0, 8), // Limit to 8 suggestions
            context: {
                hasRestaurant: !!context.selectedRestaurant,
                hasCartItems: !!(context.cartItems && context.cartItems.length > 0),
                isLoggedIn: !!userId
            }
        });
        
    } catch (error) {
        console.error('❌ Voice suggestions error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            fallbackSuggestions: [
                'I want to order food',
                'Show me restaurants',
                'What\'s popular?'
            ]
        });
    }
});

// Voice analytics endpoint (for admin dashboard)
app.get('/api/voice/analytics', async (req, res) => {
    try {
        // Mock analytics data for now
        // In production, you'd track voice usage in MongoDB
        const analytics = {
            totalVoiceCommands: Math.floor(Math.random() * 1000) + 500,
            successfulCommands: Math.floor(Math.random() * 800) + 400,
            averageConfidence: 0.78,
            popularIntents: [
                { intent: 'order_food', count: 245, percentage: 35 },
                { intent: 'search_restaurants', count: 189, percentage: 27 },
                { intent: 'add_to_cart', count: 134, percentage: 19 },
                { intent: 'show_recommendations', count: 98, percentage: 14 },
                { intent: 'other', count: 34, percentage: 5 }
            ],
            languageDistribution: [
                { language: 'English', percentage: 85 },
                { language: 'Urdu', percentage: 15 }
            ],
            hourlyUsage: Array.from({ length: 24 }, (_, hour) => ({
                hour,
                commands: Math.floor(Math.random() * 50) + 10
            })),
            deviceTypes: [
                { type: 'Mobile', percentage: 68 },
                { type: 'Desktop', percentage: 28 },
                { type: 'Tablet', percentage: 4 }
            ]
        };
        
        res.json({
            success: true,
            analytics,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Voice analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

console.log('✅ Voice Processing routes setup complete!');
console.log('🎤 Available voice endpoints:');
console.log('   POST /api/voice/process - Process voice commands');
console.log('   POST /api/voice/search-restaurants - Voice restaurant search');
console.log('   POST /api/voice/search-menu - Voice menu search');
console.log('   POST /api/voice/validate - Validate voice commands');
console.log('   POST /api/voice/suggestions - Get voice command suggestions');
console.log('   GET  /api/voice/analytics - Voice usage analytics');

// =============== ERROR HANDLING ===============
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

console.log('💰 Dynamic Pricing System initialized');
console.log('🎯 New pricing endpoints available:');
console.log('   POST /api/pricing/calculate-price');
console.log('   GET  /api/pricing/analytics/:restaurantId');
console.log('   POST /api/pricing/surge-status');

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log('📍 Your API endpoints are ready!');
    console.log('🍕 Happy food ordering!');
    console.log('💾 Using MongoDB database');
    console.log('\n🔧 Quick Setup:');
    console.log(`   1. Visit http://localhost:${PORT}/api/setup-database to setup sample data`);
    console.log(`   2. Use sample login: ahmed@example.com / 123456`);
    console.log(`   3. Test recommendations: GET /api/recommendations/advanced/{userId}`);
    console.log(`   4. Test authentication: POST /api/auth/login`);
    console.log(`   5. Place orders: POST /api/order`);
});