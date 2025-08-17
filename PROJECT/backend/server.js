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
const EnhancedChatbotService = require('./services/enhancedChatbot'); // FIXED: No destructuring
const pricingEngine = new DynamicPricingEngine();
const enhancedChatbot = new EnhancedChatbotService();
const advancedRecommendation = new AdvancedRecommendationEngine();
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Simple test route BEFORE your enhanced recommendations route
app.get('/api/test/enhanced', (req, res) => {
    console.log('🧪 Test route hit');
    res.json({
        success: true,
        message: 'Enhanced recommendation route setup is working',
        serviceAvailable: !!advancedRecommendation,
        timestamp: new Date().toISOString()
    });
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
// Get recommendation explanations
app.get('/api/recommendations/explain/:userId/:restaurantId', async (req, res) => {
    try {
        const { userId, restaurantId } = req.params;
        
        // Get the specific restaurant
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        // Get user data for explanation
        const user = await User.findById(userId);
        const userOrders = await Order.find({ user: userId })
            .populate('restaurant')
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Calculate explanation factors
        const explanation = await advancedRecommendation.calculateMultiFactorScore(
            restaurant,
            user,
            userOrders,
            { currentTime: new Date() }
        );
        
        res.json({
            success: true,
            restaurant: restaurant.name,
            explanation: {
                personalMatch: `${Math.round(explanation.personalPreference * 100)}%`,
                popularityScore: `${Math.round(explanation.popularity * 100)}%`,
                timeRelevance: `${Math.round(explanation.temporal * 100)}%`,
                overallScore: `${Math.round(
                    (explanation.personalPreference * 0.35 + 
                     explanation.collaborative * 0.25 + 
                     explanation.contentBased * 0.20 + 
                     explanation.temporal * 0.10 + 
                     explanation.popularity * 0.10) * 100
                )}%`,
                reasons: [
                    explanation.personalPreference > 0.6 ? "Matches your taste preferences" : null,
                    explanation.collaborative > 0.5 ? "Popular with similar users" : null,
                    explanation.temporal > 0.3 ? "Perfect timing for this meal" : null,
                    explanation.popularity > 0.7 ? "Trending and highly rated" : null
                ].filter(Boolean)
            }
        });
        
    } catch (error) {
        console.error('❌ Recommendation explanation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating explanation',
            error: error.message
        });
    }
});

// Update user preferences after order (for learning)
app.post('/api/recommendations/learn/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { orderData, feedback } = req.body;
        
        console.log('🧠 Learning from user behavior:', userId);
        
        // Update user profile based on order
        await advancedRecommendation.updateUserProfile(userId, orderData);
        
        res.json({
            success: true,
            message: 'User preferences updated',
            userId: userId
        });
        
    } catch (error) {
        console.error('❌ Learning update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user preferences',
            error: error.message
        });
    }
});

// Get recommendation performance analytics
app.get('/api/analytics/recommendations', async (req, res) => {
    try {
        const { timeRange = '30' } = req.query;
        const daysBack = parseInt(timeRange);
        const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
        
        // Get recommendation performance data
        const totalOrders = await Order.countDocuments({
            createdAt: { $gte: startDate }
        });
        
        const recommendationOrders = await Order.countDocuments({
            createdAt: { $gte: startDate },
            'analytics.recommendationSource': { $exists: true, $ne: 'manual' }
        });
        
        const conversionRate = totalOrders > 0 ? (recommendationOrders / totalOrders) * 100 : 0;
        
        // Get popular recommendation sources
        const recommendationSources = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$analytics.recommendationSource', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        res.json({
            success: true,
            timeRange: `${daysBack} days`,
            analytics: {
                totalOrders,
                recommendationOrders,
                conversionRate: Math.round(conversionRate * 100) / 100,
                recommendationSources,
                manualOrders: totalOrders - recommendationOrders
            }
        });
        
    } catch (error) {
        console.error('❌ Recommendation analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching recommendation analytics',
            error: error.message
        });
    }
});
const handleQuickReply = async (reply) => {
  console.log('🎯 Quick reply clicked:', reply);
  
  // Special handling for "Show recommendations"
  if (reply === "Show recommendations") {
    if (!currentUser || currentUser.isAdmin) {
      // For guests or admins, show regular response
      const userMsg = {
        role: 'user',
        content: reply,
        timestamp: new Date().toLocaleTimeString()
      };
      
      const botResponse = {
        role: 'bot',
        content: "I'd love to show you personalized recommendations! Please login first to get recommendations based on your preferences. 🍕",
        timestamp: new Date().toLocaleTimeString(),
        suggestions: ['Login', 'Browse all restaurants', 'Popular restaurants']
      };
      
      setMessages(prev => [...prev, userMsg, botResponse]);
      return;
    }
    
    // For logged-in users, fetch enhanced recommendations
    try {
      console.log('📡 Fetching recommendations for user:', currentUser.id);
      
      const response = await fetch(`http://localhost:5000/api/recommendations/advanced/${currentUser.id}?count=5&includeNew=true`);
      const data = await response.json();
      
      console.log('📦 Recommendations API response:', data);
      
      const userMsg = {
        role: 'user',
        content: reply,
        timestamp: new Date().toLocaleTimeString()
      };
      
      if (data.success && data.recommendations && data.recommendations.length > 0) {
        const botResponse = {
          role: 'bot',
          content: `🎯 Here are my personalized recommendations for you, ${currentUser.name}!\n\nI found ${data.recommendations.length} restaurants that match your taste perfectly:`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'enhanced_recommendations',
          recommendations: data.recommendations
        };
        
        setMessages(prev => [...prev, userMsg, botResponse]);
        console.log('✅ Enhanced recommendations displayed');
      } else {
        // Fallback if no recommendations
        const botResponse = {
          role: 'bot',
          content: `I'm still learning your preferences, ${currentUser.name}! Here are some popular restaurants to get you started:`,
          timestamp: new Date().toLocaleTimeString(),
          recommendations: restaurants.slice(0, 5), // Use regular restaurants
          suggestions: ['Order food', 'Browse restaurants', 'My favorites']
        };
        
        setMessages(prev => [...prev, userMsg, botResponse]);
        console.log('⚠️ Used fallback recommendations');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch recommendations:', error);
      
      // Error fallback
      const userMsg = {
        role: 'user',
        content: reply,
        timestamp: new Date().toLocaleTimeString()
      };
      
      const botResponse = {
        role: 'bot',
        content: "I'm having trouble getting your personalized recommendations right now. Here are some popular options! 🍕",
        timestamp: new Date().toLocaleTimeString(),
        recommendations: restaurants.slice(0, 5),
        suggestions: ['Try again', 'Browse all restaurants', 'Order food']
      };
      
      setMessages(prev => [...prev, userMsg, botResponse]);
    }
    
    return;
  }
  
  // For other quick replies, use the existing logic
  setInputMessage(reply);
  sendMessage();
};
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
app.post('/api/order', applyDynamicPricing, async (req, res) => {
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
            if (userId.match(/^[0-9a-fA-F]{24}$/)) {
                user = await User.findById(userId);
                console.log('✅ Found user:', user?.name);
            } else {
                console.log('⚠️ UserId is not a valid ObjectId, using as-is:', userId);
                userObjectId = '6870bd22f7b37e4543eebd97';
            }
        } catch (userError) {
            console.log('⚠️ User lookup failed, using default ObjectId');
            userObjectId = '6870bd22f7b37e4543eebd97';
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
        
        // Create order with enhanced pricing data
        const newOrder = new Order({
            orderNumber: orderNumber,
            user: userObjectId,
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
        
        // Populate the order for response
        await newOrder.populate(['restaurant', 'items.menuItem']);
        
        res.json({
            success: true,
            message: "Order placed successfully!",
            order: newOrder,
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
    const { message, userId, sessionData } = req.body;
    
    console.log('💬 Enhanced chat request:', { message, userId });
    
    if (!message) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a message'
        });
    }
    
    try {
        // Use the enhanced chatbot service
        const chatbotResponse = await enhancedChatbot.getChatbotResponse(message, userId, sessionData);
        
        console.log('🤖 Enhanced chatbot response:', chatbotResponse.type);
        
        res.json({
            success: true,
            user_message: message,
            bot_response: chatbotResponse.message,
            response_type: chatbotResponse.type,
            data: chatbotResponse,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Enhanced chat error:', error);
        
        // Fallback to basic response
        res.json({
            success: true,
            user_message: message,
            bot_response: "I'm here to help you order delicious food! What would you like to eat today? 🍕",
            response_type: 'fallback',
            data: {
                type: 'general',
                suggestions: ['Order food', 'Show restaurants', 'My orders', 'Help']
            }
        });
    }
});

// Add new endpoint for order actions
app.post('/api/chat/order-action', async (req, res) => {
    const { action, userId, orderData } = req.body;
    
    try {
        let response;
        
        switch (action) {
            case 'confirm_reorder':
                response = await enhancedChatbot.confirmReorder(userId, orderData);
                break;
            case 'modify_cart':
                response = await enhancedChatbot.modifyCart(userId, orderData);
                break;
            case 'place_order':
                response = await enhancedChatbot.finalizeOrder(userId, orderData);
                break;
            default:
                response = { message: 'Unknown action', type: 'error' };
        }
        
        res.json({
            success: true,
            action,
            response
        });
    } catch (error) {
        console.error('Order action error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing order action',
            error: error.message
        });
    }
});

// Add endpoint for quick suggestions
app.get('/api/chat/suggestions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const suggestions = await enhancedChatbot.getPersonalizedSuggestions(userId);
        
        res.json({
            success: true,
            suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting suggestions'
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
});