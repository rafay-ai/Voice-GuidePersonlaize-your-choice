// backend/server.js - FIXED VERSION WITH PROPER ROUTES
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
const MatrixFactorizationCF = require('./services/matrixFactorizationCF');
const matrixFactorizationCF = new MatrixFactorizationCF({
  factors: 15,
  iterations: 100,
  learningRate: 0.01,
  regularization: 0.01
});
const AdvancedRecommendationEngine = require('./services/advancedRecommendation');

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const restaurantRoutes = require('./routes/restaurants');
const recommendationRoutes = require('./routes/recommendations');; // Make sure this exists

// Initialize services
const advancedRecommendation = new AdvancedRecommendationEngine();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize Matrix Factorization SAFELY
setTimeout(async () => {
  try {
    console.log('🔧 Initializing Matrix Factorization system...');
    
    // First initialize the system
    await matrixFactorizationCF.initialize();
    
    // Then load from database
    if (typeof matrixFactorizationCF.initializeFromDatabase === 'function') {
      await matrixFactorizationCF.initializeFromDatabase();
      console.log('✅ Matrix Factorization initialized with database data');
    } else {
      console.log('⚠️ Matrix Factorization initializeFromDatabase method not available');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Matrix Factorization:', error.message);
  }
}, 5000);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - CRITICAL: Make sure recommendations route is registered
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/recommendations', recommendationRoutes); // This is essential!

// Add this status endpoint for debugging
app.get('/api/status', async (req, res) => {
    try {
        const stats = {
            server: 'running',
            database: {
                restaurants: await Restaurant.countDocuments({ isActive: true }),
                users: await User.countDocuments(),
                orders: await Order.countDocuments(),
                menuItems: await MenuItem.countDocuments()
            },
            recommendations: {
                matrixFactorization: !!matrixFactorizationCF,
                advancedEngine: !!advancedRecommendation,
                algorithms: ['hybrid', 'advanced', 'fallback']
            },
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            status: stats
        });
        
    } catch (error) {
        console.error('❌ Status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get system status',
            error: error.message
        });
    }
});

// Add this to your server.js after other routes
app.get('/api/menu/:restaurantId', async (req, res) => {
    try {
        const restaurantId = req.params.restaurantId;
        console.log(`Direct menu fetch for restaurant: ${restaurantId}`);
        
        // Check if restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        // Find menu items
        const menuItems = await MenuItem.find({ 
            restaurant: restaurantId,
            available: true
        }).sort({ category: 1, name: 1 });
        
        console.log(`Found ${menuItems.length} menu items for ${restaurant.name}`);
        
        res.json({
            success: true,
            restaurant_id: restaurantId,
            restaurant_name: restaurant.name,
            items: menuItems
        });
    } catch (error) {
        console.error('Direct menu route error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching menu',
            error: error.message
        });
    }
});

// FIXED: Create a working recommendations endpoint if the route file doesn't exist
app.get('/api/recommendations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { count = 6, algorithm = 'hybrid' } = req.query;

        console.log(`🎯 Getting recommendations for user: ${userId}`);

        // Validate user ID format
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get recommendations using the advanced engine
        try {
            const recommendations = await advancedRecommendation.getPersonalizedRecommendations(userId, {
                count: parseInt(count),
                includeNewRestaurants: true,
                diversityFactor: 0.3
            });

            if (recommendations && recommendations.length > 0) {
                // Format recommendations for frontend
                const formattedRecommendations = recommendations.map((rec, index) => ({
                    id: rec.restaurant._id,
                    name: rec.restaurant.name,
                    cuisine: rec.restaurant.cuisine,
                    rating: rec.restaurant.rating,
                    deliveryTime: rec.restaurant.deliveryTime,
                    priceRange: rec.restaurant.priceRange,
                    deliveryFee: rec.restaurant.deliveryFee || 50,
                    minimumOrder: rec.restaurant.minimumOrder || 200,
                    matchPercentage: Math.round(rec.finalScore * 100),
                    rank: index + 1,
                    explanations: rec.explanations || ['Recommended for you'],
                    source: 'advanced'
                }));

                res.json({
                    success: true,
                    algorithm: 'advanced_multi_factor',
                    recommendations: formattedRecommendations,
                    totalRecommendations: formattedRecommendations.length,
                    userId: userId,
                    user: {
                        name: user.name,
                        preferences: user.preferences,
                        loyaltyStatus: user.loyaltyStatus
                    },
                    timestamp: new Date().toISOString()
                });
            } else {
                // Fallback to popular restaurants
                const popularRestaurants = await Restaurant.find({ isActive: true })
                    .sort({ rating: -1 })
                    .limit(parseInt(count));

                const fallbackRecommendations = popularRestaurants.map((restaurant, index) => ({
                    id: restaurant._id,
                    name: restaurant.name,
                    cuisine: restaurant.cuisine,
                    rating: restaurant.rating,
                    deliveryTime: restaurant.deliveryTime,
                    priceRange: restaurant.priceRange,
                    deliveryFee: restaurant.deliveryFee || 50,
                    minimumOrder: restaurant.minimumOrder || 200,
                    matchPercentage: Math.round((restaurant.rating || 3.5) * 20),
                    rank: index + 1,
                    explanations: ['Popular restaurant', 'Highly rated'],
                    source: 'popularity'
                }));

                res.json({
                    success: true,
                    algorithm: 'popularity_fallback',
                    recommendations: fallbackRecommendations,
                    totalRecommendations: fallbackRecommendations.length,
                    userId: userId,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (recommendationError) {
            console.error('❌ Recommendation engine error:', recommendationError);
            
            // Ultimate fallback
            const allRestaurants = await Restaurant.find({ isActive: true })
                .sort({ rating: -1 })
                .limit(parseInt(count));

            const basicRecommendations = allRestaurants.map((restaurant, index) => ({
                id: restaurant._id,
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                rating: restaurant.rating,
                deliveryTime: restaurant.deliveryTime,
                priceRange: restaurant.priceRange,
                deliveryFee: restaurant.deliveryFee || 50,
                minimumOrder: restaurant.minimumOrder || 200,
                matchPercentage: 50,
                rank: index + 1,
                explanations: ['Restaurant available'],
                source: 'basic'
            }));

            res.json({
                success: true,
                algorithm: 'basic_fallback',
                recommendations: basicRecommendations,
                totalRecommendations: basicRecommendations.length,
                userId: userId,
                warning: 'Using basic fallback due to recommendation engine error',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Recommendations route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate recommendations',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Root route
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
            endpoints: {
                recommendations: 'GET /api/recommendations/:userId',
                status: 'GET /api/status',
                restaurants: 'GET /api/restaurants',
                auth: 'POST /api/auth/login'
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

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log('📍 Your API endpoints are ready!');
    console.log('🔧 Quick Setup:');
    console.log(`   1. Run: node scripts/setup/seedPakistaniFood.js`);
    console.log(`   2. Test status: GET http://localhost:${PORT}/api/status`);
    console.log(`   3. Test recommendations: GET http://localhost:${PORT}/api/recommendations/USER_ID`);
});

module.exports = app;