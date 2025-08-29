// backend/routes/neuralRecommendations.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const NeuralCollaborativeFiltering = require('../services/neuralCollaborativeFiltering');
const NeuralTrainingPipeline = require('../services/neuralTraining');
const InteractionMatrixBuilder = require('../services/interactionMatrix');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// Global instances (in production, use a proper service container)
let ncfModel = null;
let trainingPipeline = null;
let matrixBuilder = null;

// Initialize services
const initializeServices = async () => {
    if (!ncfModel) {
        ncfModel = new NeuralCollaborativeFiltering();
        trainingPipeline = new NeuralTrainingPipeline();
        matrixBuilder = new InteractionMatrixBuilder();
        
        // Try to load existing model
        const modelLoaded = await trainingPipeline.loadModel();
        if (modelLoaded) {
            ncfModel = trainingPipeline.ncf;
        }
    }
};

// @route   GET /api/neural/recommendations/:userId
// @desc    Get neural collaborative filtering recommendations for a user
// @access  Private
router.get('/recommendations/:userId', auth, async (req, res) => {
    try {
        await initializeServices();
        
        const { userId } = req.params;
        const { limit = 5, includeExplanation = false } = req.query;
        
        // Verify user exists and has permission
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if requesting user is authorized (either the user themselves or admin)
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to access these recommendations' });
        }
        
        let recommendations = [];
        let method = 'content-based'; // fallback method
        
        try {
            if (ncfModel && ncfModel.isInitialized) {
                // Try neural recommendations
                recommendations = await ncfModel.getRecommendations(userId, parseInt(limit));
                method = 'neural-collaborative-filtering';
            } else {
                throw new Error('Neural model not available');
            }
        } catch (error) {
            console.log('Neural recommendations failed, using content-based fallback:', error.message);
            
            // Fallback to content-based recommendations
            const userPreferences = {
                cuisine: user.preferences?.cuisine || [],
                budget: user.preferences?.budget || 'medium',
                dietary: user.preferences?.dietary || []
            };
            
            recommendations = await ncfModel?.getContentBasedRecommendations(userPreferences, parseInt(limit)) || 
                await getBasicRecommendations(parseInt(limit));
            method = 'content-based-fallback';
        }
        
        // Enhance recommendations with additional data
        const enhancedRecommendations = await Promise.all(
            recommendations.map(async (rec) => {
                const restaurant = rec.restaurant || await Restaurant.findById(rec.restaurantId);
                
                const enhancement = {
                    restaurantId: rec.restaurantId,
                    score: rec.score,
                    restaurant: {
                        _id: restaurant._id,
                        name: restaurant.name,
                        cuisine: restaurant.cuisine,
                        rating: restaurant.rating,
                        deliveryTime: restaurant.deliveryTime,
                        priceRange: restaurant.priceRange,
                        deliveryFee: restaurant.deliveryFee,
                        image: restaurant.image
                    },
                    recommendationReason: generateRecommendationReason(rec, method, user)
                };
                
                if (includeExplanation === 'true') {
                    enhancement.explanation = await generateDetailedExplanation(rec, user, method);
                }
                
                return enhancement;
            })
        );
        
        res.json({
            success: true,
            method: method,
            recommendations: enhancedRecommendations,
            metadata: {
                userId: userId,
                timestamp: new Date().toISOString(),
                limit: parseInt(limit),
                totalRecommendations: enhancedRecommendations.length
            }
        });
        
    } catch (error) {
        console.error('Neural recommendations error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get recommendations',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   POST /api/neural/train
// @desc    Trigger neural model training
// @access  Private (Admin only)
router.post('/train', auth, async (req, res) => {
    try {
        // Check admin permissions
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        await initializeServices();
        
        const { 
            epochs = 50, 
            batchSize = 256, 
            learningRate = 0.001,
            force = false 
        } = req.body;
        
        // Check if model is already training
        if (trainingPipeline.currentEpoch > 0) {
            return res.status(409).json({ 
                message: 'Training already in progress',
                currentEpoch: trainingPipeline.currentEpoch
            });
        }
        
        // Start training (non-blocking)
        const trainingPromise = trainingPipeline.trainModel({
            epochs: parseInt(epochs),
            batchSize: parseInt(batchSize),
            learningRate: parseFloat(learningRate)
        });
        
        // Don't await - let training run in background
        trainingPromise.then(results => {
            console.log('Training completed successfully:', results);
            // Update global model instance
            ncfModel = trainingPipeline.ncf;
        }).catch(error => {
            console.error('Training failed:', error);
        });
        
        res.json({
            success: true,
            message: 'Neural model training started',
            config: {
                epochs: parseInt(epochs),
                batchSize: parseInt(batchSize),
                learningRate: parseFloat(learningRate)
            },
            status: 'training_started'
        });
        
    } catch (error) {
        console.error('Training initiation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to start training',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   GET /api/neural/status
// @desc    Get neural model and training status
// @access  Private
router.get('/status', auth, async (req, res) => {
    try {
        await initializeServices();
        
        const modelInfo = await trainingPipeline.getModelInfo();
        const trainingHistory = await trainingPipeline.getTrainingHistory();
        
        // Get recent interaction statistics
        const interactionStats = await matrixBuilder.exportForAnalysis();
        
        res.json({
            success: true,
            model: modelInfo,
            training: {
                currentEpoch: trainingPipeline.currentEpoch,
                isTraining: trainingPipeline.currentEpoch > 0,
                historyLength: trainingHistory.length,
                lastTraining: trainingHistory.length > 0 ? 
                    trainingHistory[trainingHistory.length - 1].timestamp : null
            },
            data: {
                statistics: interactionStats.statistics,
                lastUpdated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   GET /api/neural/matrix/:userId
// @desc    Get user interaction matrix data (debug endpoint)
// @access  Private
router.get('/matrix/:userId', auth, async (req, res) => {
    try {
        // Only allow users to see their own data, or admins to see any
        if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        await initializeServices();
        
        const userId = req.params.userId;
        
        // Get user interaction history
        const interactionHistory = await matrixBuilder.getUserInteractionHistory(userId);
        
        // Get similar users
        const similarUsers = await matrixBuilder.findSimilarUsers(userId, 5);
        
        res.json({
            success: true,
            userId: userId,
            interactions: interactionHistory,
            similarUsers: similarUsers,
            metadata: {
                totalInteractions: interactionHistory.length,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Matrix data error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get interaction matrix data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   POST /api/neural/feedback
// @desc    Record user feedback for recommendations
// @access  Private
router.post('/feedback', auth, async (req, res) => {
    try {
        const { 
            recommendationId, 
            restaurantId, 
            action, // 'click', 'order', 'dismiss', 'like', 'dislike'
            rating,
            context 
        } = req.body;
        
        const userId = req.user.id;
        
        // Validate required fields
        if (!restaurantId || !action) {
            return res.status(400).json({ 
                message: 'restaurantId and action are required' 
            });
        }
        
        // Record feedback (you might want to create a Feedback model)
        const feedback = {
            userId: userId,
            restaurantId: restaurantId,
            action: action,
            rating: rating,
            context: context,
            timestamp: new Date(),
            recommendationId: recommendationId
        };
        
        // For now, we'll just log it. In production, save to database
        console.log('User feedback recorded:', feedback);
        
        // If this is an order action, it will automatically be captured in the Order model
        // and used for future training
        
        res.json({
            success: true,
            message: 'Feedback recorded successfully',
            feedback: {
                userId: userId,
                restaurantId: restaurantId,
                action: action,
                timestamp: feedback.timestamp
            }
        });
        
    } catch (error) {
        console.error('Feedback recording error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to record feedback',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   POST /api/neural/retrain
// @desc    Trigger incremental model retraining
// @access  Private (Admin only)
router.post('/retrain', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        await initializeServices();
        
        const { epochs = 20 } = req.body;
        
        // Start incremental training
        const retrainingPromise = trainingPipeline.incrementalTrain([], {
            epochs: parseInt(epochs)
        });
        
        retrainingPromise.then(results => {
            console.log('Incremental training completed:', results);
            ncfModel = trainingPipeline.ncf;
        }).catch(error => {
            console.error('Incremental training failed:', error);
        });
        
        res.json({
            success: true,
            message: 'Incremental retraining started',
            epochs: parseInt(epochs)
        });
        
    } catch (error) {
        console.error('Retraining error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to start retraining',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Helper Functions
async function getBasicRecommendations(limit) {
    // Basic popularity-based recommendations as ultimate fallback
    const restaurants = await Restaurant.find({})
        .sort({ rating: -1 })
        .limit(limit)
        .lean();
    
    return restaurants.map(restaurant => ({
        restaurantId: restaurant._id.toString(),
        score: restaurant.rating / 5, // Normalize rating to 0-1
        restaurant: restaurant
    }));
}

function generateRecommendationReason(recommendation, method, user) {
    switch (method) {
        case 'neural-collaborative-filtering':
            return `Recommended by AI based on users with similar taste preferences (${(recommendation.score * 100).toFixed(0)}% match)`;
        case 'content-based-fallback':
            return `Matches your cuisine preferences and dining style`;
        default:
            return `Popular choice with high ratings`;
    }
}

async function generateDetailedExplanation(recommendation, user, method) {
    const restaurant = recommendation.restaurant;
    
    let explanation = {
        method: method,
        factors: []
    };
    
    if (method === 'neural-collaborative-filtering') {
        explanation.factors.push(
            `Neural network identified this restaurant based on complex patterns in user behavior`,
            `Similar users with comparable taste preferences have enjoyed this restaurant`,
            `AI confidence score: ${(recommendation.score * 100).toFixed(1)}%`
        );
    } else {
        // Content-based explanation
        if (user.preferences?.cuisine?.includes(restaurant.cuisine)) {
            explanation.factors.push(`Matches your preferred ${restaurant.cuisine} cuisine`);
        }
        
        if (restaurant.rating >= 4.0) {
            explanation.factors.push(`Highly rated (${restaurant.rating}/5 stars)`);
        }
        
        if (user.preferences?.budget === restaurant.priceRange) {
            explanation.factors.push(`Fits your ${restaurant.priceRange} budget preference`);
        }
    }
    
    return explanation;
}

module.exports = router;