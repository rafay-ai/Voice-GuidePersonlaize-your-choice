// backend/server.js - CLEANED VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import models
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');

// Import services (only the ones you need)
const matrixFactorizationCF = require('./services/matrixFactorizationCF');
const AdvancedRecommendationEngine = require('./services/advancedRecommendation');
const EnhancedChatbotService = require('./services/enhancedChatbot');
const VoiceProcessor = require('./services/voiceProcessor');

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const recommendationRoutes = require('./routes/recommendations'); // Your unified recommendations

// Initialize services
const advancedRecommendation = new AdvancedRecommendationEngine();
const enhancedChatbot = new EnhancedChatbotService();
const voiceProcessor = new VoiceProcessor();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize Matrix Factorization with existing order data
setTimeout(async () => {
  try {
    await matrixFactorizationCF.initializeFromDatabase();
    console.log('✅ Matrix Factorization initialized with user data');
  } catch (error) {
    console.error('❌ Failed to initialize Matrix Factorization:', error);
  }
}, 5000); 

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recommendations', recommendationRoutes); // Your unified recommendations

app.get('/api/recommendations/status', async (req, res) => {
    try {
        const status = {
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
        
        console.log('📊 Status check:', status);
        
        res.json({
            success: true,
            status: status
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
        
        // You'll need to create a simple seeder function
        res.json({
            success: true,
            message: 'Run: node scripts/setup/seedPakistaniFood.js to setup data',
            instructions: 'Please run the seeding script manually'
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
            setupInstructions: 'Visit /api/setup-database to check sample data',
            endpoints: {
                // Authentication
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/profile',
                updatePreferences: 'PATCH /api/auth/preferences',
                
                // Orders  
                placeOrder: 'POST /api/orders/place-order',
                userOrders: 'GET /api/orders/user/:userId',
                
                // Restaurants & Menu
                restaurants: 'GET /api/restaurants',
                restaurant: 'GET /api/restaurants/:id', 
                menu: 'GET /api/menu/:restaurantId',
                
                // AI Recommendations
                recommendations: 'GET /api/recommendations/:userId',
                recommendationStatus: 'GET /api/recommendations/status',
                popular: 'GET /api/recommendations/popular',
                
                // Chat & Voice
                chat: 'POST /api/chat',
                voiceProcess: 'POST /api/voice/process',
                
                // Utility
                search: 'GET /api/search',
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
app.get('/api/restaurants', async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ isActive: true })
            .sort({ featured: -1, rating: -1 });
        
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
app.get('/api/menu/:restaurantId', async (req, res) => {
    try {
        const restaurantId = req.params.restaurantId;
        
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        const menuItems = await MenuItem.find({ 
            restaurant: restaurantId,
            available: true
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
        
        if (isVoiceInput) {
            console.log('🎤 Processing as voice input...');
            const voiceResult = await voiceProcessor.processVoiceCommand(message, userId, sessionData);
            
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

// =============== VOICE PROCESSING ROUTES ===============
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
    console.log('\n🔧 Quick Setup:');
    console.log(`   1. Run: node scripts/setup/seedPakistaniFood.js`);
    console.log(`   2. Run: node scripts/setup/createSampleUsers.js`);
    console.log(`   3. Run: node scripts/setup/createSampleOrders.js`);
    console.log(`   4. Test recommendations: GET /api/recommendations/{userId}`);
    console.log(`   5. Test authentication: POST /api/auth/login`);
});