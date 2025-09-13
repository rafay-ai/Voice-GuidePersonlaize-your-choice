// backend/routes/recommendations.js - UNIFIED RECOMMENDATION SYSTEM
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

// Import your working recommendation services
const matrixFactorizationCF = require('../services/matrixFactorizationCF');
const AdvancedRecommendationEngine = require('../services/advancedRecommendation');

// Initialize services
const advancedEngine = new AdvancedRecommendationEngine();

// @route   GET /api/recommendations/:userId
// @desc    Get personalized recommendations using multiple algorithms
// @access  Public
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { count = 6, algorithm = 'hybrid' } = req.query;

    console.log(`🎯 Getting recommendations for user: ${userId}`);
    console.log(`📊 Algorithm requested: ${algorithm}`);

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

    let recommendations = [];
    let algorithmUsed = 'fallback';
    let debugInfo = {};

    try {
      // Try different algorithms based on user data and request
      switch (algorithm) {
        case 'matrix':
          recommendations = await getMatrixFactorizationRecommendations(userId, count);
          algorithmUsed = 'matrix_factorization';
          break;
          
        case 'advanced':
          recommendations = await getAdvancedRecommendations(userId, count);
          algorithmUsed = 'advanced_multi_factor';
          break;
          
        case 'hybrid':
        default:
          recommendations = await getHybridRecommendations(userId, count);
          algorithmUsed = 'hybrid_approach';
          break;
      }

      // If no recommendations, use fallback
      if (!recommendations || recommendations.length === 0) {
        console.log('⚠️ No recommendations from primary algorithm, using fallback');
        recommendations = await getFallbackRecommendations(userId, count);
        algorithmUsed = 'popularity_based_fallback';
      }

      // Format recommendations for frontend
      const formattedRecommendations = await formatRecommendationsForFrontend(
        recommendations, 
        algorithmUsed, 
        userId
      );

      res.json({
        success: true,
        algorithm: algorithmUsed,
        recommendations: formattedRecommendations,
        totalRecommendations: formattedRecommendations.length,
        userId: userId,
        user: {
          name: user.name,
          preferences: user.preferences,
          loyaltyStatus: user.loyaltyStatus
        },
        debugInfo,
        timestamp: new Date().toISOString()
      });

    } catch (algorithmError) {
      console.error(`❌ Algorithm error (${algorithm}):`, algorithmError);
      
      // Always provide fallback recommendations
      const fallbackRecommendations = await getFallbackRecommendations(userId, count);
      const formattedFallback = await formatRecommendationsForFrontend(
        fallbackRecommendations, 
        'error_fallback', 
        userId
      );

      res.json({
        success: true,
        algorithm: 'error_fallback',
        recommendations: formattedFallback,
        totalRecommendations: formattedFallback.length,
        userId: userId,
        warning: 'Primary algorithm failed, using fallback',
        error: algorithmError.message,
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

// Matrix Factorization Recommendations
async function getMatrixFactorizationRecommendations(userId, count) {
  try {
    console.log('🔢 Trying Matrix Factorization...');
    
    // Use your working Matrix Factorization service
    const matrixRecs = await matrixFactorizationCF.getRecommendations(userId, count);
    
    if (matrixRecs && matrixRecs.length > 0) {
      console.log(`✅ Matrix CF returned ${matrixRecs.length} recommendations`);
      return matrixRecs;
    }
    
    return null;
  } catch (error) {
    console.error('Matrix CF error:', error);
    return null;
  }
}

// Advanced Multi-Factor Recommendations
async function getAdvancedRecommendations(userId, count) {
  try {
    console.log('🧠 Trying Advanced Recommendation Engine...');
    
    const advancedRecs = await advancedEngine.getPersonalizedRecommendations(userId, {
      count: count,
      includeNewRestaurants: true,
      diversityFactor: 0.3
    });
    
    if (advancedRecs && advancedRecs.length > 0) {
      console.log(`✅ Advanced engine returned ${advancedRecs.length} recommendations`);
      return advancedRecs;
    }
    
    return null;
  } catch (error) {
    console.error('Advanced engine error:', error);
    return null;
  }
}

// Hybrid Approach - Combines multiple algorithms
async function getHybridRecommendations(userId, count) {
  try {
    console.log('🔄 Using Hybrid Approach...');
    
    const user = await User.findById(userId);
    const userOrders = await Order.find({ user: userId }).populate('restaurant');
    
    let recommendations = [];
    
    // Strategy based on user experience level
    if (userOrders.length >= 5) {
      // Experienced user - try Matrix Factorization first
      console.log('👨‍💼 Experienced user: trying Matrix Factorization');
      const matrixRecs = await getMatrixFactorizationRecommendations(userId, Math.floor(count * 0.7));
      
      if (matrixRecs && matrixRecs.length > 0) {
        recommendations.push(...matrixRecs);
        
        // Fill remaining with advanced recommendations
        const remaining = count - recommendations.length;
        if (remaining > 0) {
          const advancedRecs = await getAdvancedRecommendations(userId, remaining);
          if (advancedRecs) {
            recommendations.push(...advancedRecs.slice(0, remaining));
          }
        }
      } else {
        // Matrix CF failed, use advanced
        const advancedRecs = await getAdvancedRecommendations(userId, count);
        if (advancedRecs) {
          recommendations = advancedRecs;
        }
      }
    } else {
      // New user - use Advanced Recommendation Engine
      console.log('🆕 New user: using Advanced Engine');
      const advancedRecs = await getAdvancedRecommendations(userId, count);
      if (advancedRecs) {
        recommendations = advancedRecs;
      }
    }
    
    return recommendations.length > 0 ? recommendations : null;
    
  } catch (error) {
    console.error('Hybrid approach error:', error);
    return null;
  }
}

// Fallback Recommendations - Always works
async function getFallbackRecommendations(userId, count) {
  try {
    console.log('🆘 Using fallback recommendations...');
    
    const user = await User.findById(userId);
    const userOrders = await Order.find({ user: userId }).populate('restaurant').limit(10);
    
    let query = { isActive: true };
    let sortCriteria = { rating: -1, featured: -1 };
    
    // If user has preferences, try to match them
    if (user.preferences?.preferredCuisines?.length > 0) {
      query.cuisine = { $in: user.preferences.preferredCuisines };
      console.log('🎯 Filtering by user cuisine preferences');
    }
    
    // If user has order history, avoid recently ordered restaurants
    if (userOrders.length > 0) {
      const recentRestaurantIds = userOrders.slice(0, 3).map(order => order.restaurant._id);
      query._id = { $nin: recentRestaurantIds };
      console.log('🔄 Excluding recently ordered restaurants');
    }
    
    let restaurants = await Restaurant.find(query)
      .sort(sortCriteria)
      .limit(count);
    
    // If not enough restaurants, get more without filters
    if (restaurants.length < count) {
      const additional = await Restaurant.find({
        isActive: true,
        _id: { $nin: restaurants.map(r => r._id) }
      })
      .sort(sortCriteria)
      .limit(count - restaurants.length);
      
      restaurants.push(...additional);
    }
    
    // Format as recommendation objects
    const fallbackRecs = restaurants.map((restaurant, index) => ({
      restaurant: restaurant,
      score: (restaurant.rating || 3.5) / 5, // Normalize to 0-1
      confidence: 0.6,
      rank: index + 1,
      explanations: [
        restaurant.rating >= 4.5 ? '⭐ Highly rated' : '🏪 Popular choice',
        user.preferences?.preferredCuisines?.some(c => restaurant.cuisine?.includes(c)) 
          ? '🎯 Matches your preferences' : '📈 Trending',
        '🔄 Fallback recommendation'
      ]
    }));
    
    console.log(`✅ Generated ${fallbackRecs.length} fallback recommendations`);
    return fallbackRecs;
    
  } catch (error) {
    console.error('❌ Fallback recommendations failed:', error);
    
    // Ultimate fallback - just return top rated restaurants
    const basicRestaurants = await Restaurant.find({ isActive: true })
      .sort({ rating: -1 })
      .limit(count);
      
    return basicRestaurants.map((restaurant, index) => ({
      restaurant: restaurant,
      score: 0.5,
      confidence: 0.4,
      rank: index + 1,
      explanations: ['🏪 Popular restaurant']
    }));
  }
}

// Format recommendations for frontend consistency
async function formatRecommendationsForFrontend(recommendations, algorithm, userId) {
  if (!recommendations || recommendations.length === 0) {
    return [];
  }
  
  return recommendations.map((rec, index) => {
    // Handle different recommendation formats
    const restaurant = rec.restaurant || rec;
    const score = rec.score || rec.finalScore || rec.similarity || 0.5;
    const explanations = rec.explanations || [`Recommended by ${algorithm}`];
    
    return {
      id: restaurant._id,
      name: restaurant.name,
      cuisine: restaurant.cuisine || ['Various'],
      rating: restaurant.rating || 'New',
      deliveryTime: restaurant.deliveryTime || '30-45 min',
      priceRange: restaurant.priceRange || 'Moderate',
      deliveryFee: restaurant.deliveryFee || 50,
      minimumOrder: restaurant.minimumOrder || 200,
      image: restaurant.image || '/api/placeholder/restaurant',
      
      // Recommendation metadata
      matchPercentage: Math.round(score * 100),
      confidence: rec.confidence || score,
      rank: index + 1,
      explanations: explanations.slice(0, 3),
      algorithm: algorithm,
      
      // Additional data for debugging
      debug: {
        originalScore: score,
        source: algorithm,
        timestamp: new Date().toISOString()
      }
    };
  });
}

// @route   POST /api/recommendations/feedback
// @desc    Track user interactions for improving recommendations
// @access  Public
router.post('/feedback', async (req, res) => {
  try {
    const { userId, restaurantId, action, algorithm, rank } = req.body;
    
    console.log(`📝 Recording feedback: ${action} for restaurant ${restaurantId}`);
    
    // Validate required fields
    if (!userId || !restaurantId || !action) {
      return res.status(400).json({
        success: false,
        message: 'userId, restaurantId, and action are required'
      });
    }
    
    // Store feedback for future model improvements
    const feedback = {
      userId,
      restaurantId,
      action, // 'clicked', 'ordered', 'dismissed', 'favorited'
      algorithm,
      rank,
      timestamp: new Date()
    };
    
    // In a production app, you'd save this to a Feedback collection
    console.log('💾 Feedback recorded:', feedback);
    
    // Update recommendation models based on feedback
    if (action === 'ordered') {
      // Positive signal - very strong
      await updateRecommendationModels(userId, restaurantId, 2.0);
    } else if (action === 'clicked' && rank <= 3) {
      // Positive signal - moderate
      await updateRecommendationModels(userId, restaurantId, 1.0);
    } else if (action === 'favorited') {
      // Strong positive signal
      await updateRecommendationModels(userId, restaurantId, 1.5);
    }
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedback: {
        userId,
        restaurantId,
        action,
        timestamp: feedback.timestamp
      }
    });
    
  } catch (error) {
    console.error('❌ Feedback recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback',
      error: error.message
    });
  }
});

// Update recommendation models with user feedback
async function updateRecommendationModels(userId, restaurantId, weight) {
  try {
    // Update Matrix Factorization model if available
    if (matrixFactorizationCF && typeof matrixFactorizationCF.addImplicitFeedback === 'function') {
      await matrixFactorizationCF.addImplicitFeedback(userId, restaurantId, weight);
    }
    
    // Update user preferences
    const user = await User.findById(userId);
    if (user) {
      const restaurant = await Restaurant.findById(restaurantId);
      if (restaurant && restaurant.cuisine) {
        // Update user's cuisine preferences
        if (!user.preferences) user.preferences = {};
        if (!user.preferences.preferredCuisines) user.preferences.preferredCuisines = [];
        
        restaurant.cuisine.forEach(cuisine => {
          if (!user.preferences.preferredCuisines.includes(cuisine)) {
            user.preferences.preferredCuisines.push(cuisine);
          }
        });
        
        await user.save();
      }
    }
    
  } catch (error) {
    console.error('Error updating recommendation models:', error);
  }
}

// @route   GET /api/recommendations/popular
// @desc    Get popular restaurants (no personalization)
// @access  Public
router.get('/popular/:location?', async (req, res) => {
  try {
    const { location } = req.params;
    const { count = 10 } = req.query;
    
    console.log(`🔥 Getting popular restaurants for location: ${location || 'all'}`);
    
    const popularRestaurants = await Restaurant.find({ isActive: true })
      .sort({ rating: -1, featured: -1 })
      .limit(parseInt(count));
    
    res.json({
      success: true,
      restaurants: popularRestaurants,
      algorithm: 'popularity_based',
      location: location || 'all',
      count: popularRestaurants.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Popular restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular restaurants',
      error: error.message
    });
  }
});

// @route   GET /api/recommendations/status
// @desc    Get recommendation system status
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const status = {
      matrixFactorization: {
        available: !!matrixFactorizationCF,
        initialized: matrixFactorizationCF ? await checkMatrixFactorizationStatus() : false
      },
      advancedEngine: {
        available: !!advancedEngine,
        initialized: true
      },
      database: {
        restaurants: await Restaurant.countDocuments({ isActive: true }),
        users: await User.countDocuments(),
        orders: await Order.countDocuments()
      },
      algorithms: ['hybrid', 'matrix', 'advanced', 'fallback'],
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
    
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

// Helper function to check Matrix Factorization status
async function checkMatrixFactorizationStatus() {
  try {
    if (matrixFactorizationCF && typeof matrixFactorizationCF.getModelStats === 'function') {
      const stats = matrixFactorizationCF.getModelStats();
      return stats.totalUsers > 0 && stats.totalRestaurants > 0;
    }
    return false;
  } catch (error) {
    return false;
  }
}

module.exports = router;