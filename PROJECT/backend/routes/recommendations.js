// backend/routes/recommendations.js - Updated to use your real Matrix Factorization
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// Import your working Matrix Factorization service
const matrixFactorizationCF = require('../services/matrixFactorizationCF');

// Real Matrix Factorization endpoint
router.get('/matrix-factorization/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { count = 6, includeExplanations = true } = req.query;

    console.log(`Matrix CF recommendations for user ${userId}`);

    // Validate user ID format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check if user exists and get their order history
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's order history for Matrix Factorization
    const userOrders = await Order.find({ user: userId })
      .populate('restaurant')
      .sort({ createdAt: -1 });

    console.log(`User ${user.name} has ${userOrders.length} orders`);

    // If user has no orders, use cold start strategy
    if (userOrders.length === 0) {
      console.log('Cold start: User has no order history');
      return await handleColdStartUser(userId, parseInt(count), res);
    }

    // Get recommendations from your Matrix Factorization system
    let recommendations;
    try {
      recommendations = await matrixFactorizationCF.getRecommendations(userId, parseInt(count));
    } catch (error) {
      console.error('Matrix Factorization error:', error);
      // Fallback to content-based for this user
      return await handleContentBasedFallback(userId, userOrders, parseInt(count), res);
    }

    if (!recommendations || recommendations.length === 0) {
      console.log('No Matrix CF recommendations, using content-based fallback');
      return await handleContentBasedFallback(userId, userOrders, parseInt(count), res);
    }

    // Format recommendations for frontend
    const formattedRecommendations = await Promise.all(
      recommendations.map(async (rec, index) => {
        return await formatMatrixRecommendation(rec, index, userId, includeExplanations === 'true');
      })
    );

    res.json({
      success: true,
      recommendations: formattedRecommendations,
      algorithm: 'matrix_factorization',
      totalRecommendations: formattedRecommendations.length,
      userId: userId,
      userProfile: {
        name: user.name,
        totalOrders: userOrders.length,
        favoriteRestaurants: user.preferences?.favoriteRestaurants || [],
        preferredCuisines: user.preferences?.preferredCuisines || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Matrix Factorization CF Error:', error);
    res.status(500).json({
      success: false,
      message: 'Matrix Factorization system temporarily unavailable',
      error: error.message
    });
  }
});

// Handle new users with no order history (Cold Start Problem)
async function handleColdStartUser(userId, count, res) {
  try {
    console.log('Implementing cold start strategy...');
    
    // Get user preferences if available
    const user = await User.findById(userId);
    const preferences = user.preferences || {};

    // Strategy 1: Use user's stated preferences
    let restaurants = [];
    
    if (preferences.preferredCuisines && preferences.preferredCuisines.length > 0) {
      restaurants = await Restaurant.find({
        isActive: true,
        cuisine: { $in: preferences.preferredCuisines }
      }).sort({ rating: -1, featured: -1 }).limit(count);
    }
    
    // Strategy 2: If no preferences, use popular restaurants
    if (restaurants.length < count) {
      const additionalRestaurants = await Restaurant.find({
        isActive: true,
        _id: { $nin: restaurants.map(r => r._id) }
      }).sort({ rating: -1, featured: -1 }).limit(count - restaurants.length);
      
      restaurants = [...restaurants, ...additionalRestaurants];
    }

    const coldStartRecommendations = restaurants.map((restaurant, index) => ({
      id: restaurant._id,
      name: restaurant.name,
      similarity: 0.6 + (Math.random() * 0.2), // Simulate confidence
      confidence: 0.6 + (Math.random() * 0.2),
      rank: index + 1,
      explanations: [
        index === 0 ? 'Popular choice for new users' : 'Highly rated',
        preferences.preferredCuisines && preferences.preferredCuisines.some(c => 
          restaurant.cuisine.includes(c)) ? 'Matches your preferences' : 'Recommended',
        'Cold start recommendation'
      ],
      cuisine: restaurant.cuisine,
      rating: restaurant.rating,
      deliveryTime: restaurant.deliveryTime,
      priceRange: restaurant.priceRange,
      deliveryFee: restaurant.deliveryFee || 50,
      minimumOrder: restaurant.minimumOrder || 200,
      coldStart: true
    }));

    res.json({
      success: true,
      recommendations: coldStartRecommendations,
      algorithm: 'cold_start_strategy',
      totalRecommendations: coldStartRecommendations.length,
      userId: userId,
      message: 'Cold start recommendations - will improve as you order more',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cold start error:', error);
    throw error;
  }
}

// Content-based fallback using user's order history
async function handleContentBasedFallback(userId, userOrders, count, res) {
  try {
    console.log('Using content-based fallback...');

    // Analyze user's order patterns
    const orderedRestaurants = userOrders.map(order => order.restaurant._id.toString());
    const cuisinePreferences = {};
    
    userOrders.forEach(order => {
      if (order.restaurant.cuisine) {
        order.restaurant.cuisine.forEach(cuisine => {
          cuisinePreferences[cuisine] = (cuisinePreferences[cuisine] || 0) + 1;
        });
      }
    });

    // Find similar restaurants based on content
    const recommendedRestaurants = await Restaurant.find({
      isActive: true,
      _id: { $nin: orderedRestaurants }, // Exclude already ordered
      $or: [
        { cuisine: { $in: Object.keys(cuisinePreferences) } },
        { rating: { $gte: 4.0 } } // Include highly rated as backup
      ]
    }).sort({ rating: -1 }).limit(count);

    const contentRecommendations = recommendedRestaurants.map((restaurant, index) => {
      const cuisineMatch = restaurant.cuisine.some(c => cuisinePreferences[c]);
      
      return {
        id: restaurant._id,
        name: restaurant.name,
        similarity: cuisineMatch ? 0.7 + (Math.random() * 0.2) : 0.5 + (Math.random() * 0.2),
        confidence: cuisineMatch ? 0.8 : 0.6,
        rank: index + 1,
        explanations: [
          cuisineMatch ? 'Similar to your previous orders' : 'Highly rated',
          'Content-based recommendation',
          index === 0 ? 'Best match based on your history' : 'Good match'
        ],
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        deliveryTime: restaurant.deliveryTime,
        priceRange: restaurant.priceRange,
        deliveryFee: restaurant.deliveryFee || 50,
        minimumOrder: restaurant.minimumOrder || 200,
        contentBased: true
      };
    });

    res.json({
      success: true,
      recommendations: contentRecommendations,
      algorithm: 'content_based_fallback',
      totalRecommendations: contentRecommendations.length,
      userId: userId,
      message: 'Content-based recommendations based on your order history',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Content-based fallback error:', error);
    throw error;
  }
}

// Format Matrix Factorization recommendation for frontend
async function formatMatrixRecommendation(rec, index, userId, includeExplanations) {
  try {
    // Get restaurant details
    const restaurant = await Restaurant.findById(rec.restaurantId || rec._id);
    
    if (!restaurant) {
      console.warn('Restaurant not found for recommendation:', rec.restaurantId);
      return null;
    }

    const similarity = rec.similarity || rec.score || 0.5;
    const confidence = rec.confidence || similarity;

    return {
      id: restaurant._id,
      name: restaurant.name,
      similarity: Math.round(similarity * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      rank: index + 1,
      explanations: includeExplanations ? generateMatrixExplanations(rec, index, similarity) : [],
      cuisine: restaurant.cuisine,
      rating: restaurant.rating,
      deliveryTime: restaurant.deliveryTime,
      priceRange: restaurant.priceRange,
      deliveryFee: restaurant.deliveryFee || 50,
      minimumOrder: restaurant.minimumOrder || 200,
      matrixFactorization: true,
      metadata: {
        originalScore: rec.score || rec.similarity,
        userFactors: rec.userFactors || null,
        itemFactors: rec.itemFactors || null,
        algorithm: 'matrix_factorization'
      }
    };

  } catch (error) {
    console.error('Error formatting Matrix recommendation:', error);
    return null;
  }
}

// Generate explanations for Matrix Factorization recommendations
function generateMatrixExplanations(rec, rank, similarity) {
  const explanations = [];
  
  if (rank === 0) {
    explanations.push('Matrix Factorization Top Pick');
  } else if (rank <= 2) {
    explanations.push('Excellent collaborative filtering match');
  } else {
    explanations.push('Good collaborative filtering match');
  }
  
  if (similarity > 0.8) {
    explanations.push('Users with identical taste patterns love this');
  } else if (similarity > 0.6) {
    explanations.push('Highly recommended by similar users');
  } else if (similarity > 0.4) {
    explanations.push('Popular among users like you');
  } else {
    explanations.push('Based on collaborative patterns');
  }
  
  explanations.push('Matrix Factorization CF Algorithm');
  
  return explanations.slice(0, 3);
}

// Track user interactions for model learning
router.post('/user-interactions', async (req, res) => {
  try {
    const { userId, type, restaurantId, rank, source, matchPercentage, timestamp } = req.body;

    console.log(`Tracking interaction: ${type} for user ${userId}`);

    // Create interaction record
    const interaction = {
      userId,
      type,
      restaurantId,
      rank,
      source,
      matchPercentage,
      timestamp: timestamp || new Date().toISOString()
    };

    // Store interaction for Matrix Factorization training
    if (type === 'RESTAURANT_SELECTED' && rank <= 3) {
      // Positive implicit feedback for top selections
      await matrixFactorizationCF.addImplicitFeedback(userId, restaurantId, 1.0);
    } else if (type === 'FAVORITE') {
      // Strong positive signal
      await matrixFactorizationCF.addImplicitFeedback(userId, restaurantId, 2.0);
    } else if (type === 'ORDER_PLACED') {
      // Very strong positive signal
      await matrixFactorizationCF.addImplicitFeedback(userId, restaurantId, 3.0);
    }

    res.json({
      success: true,
      message: 'Interaction tracked successfully',
      interaction: interaction
    });

  } catch (error) {
    console.error('Interaction tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track interaction',
      error: error.message
    });
  }
});

// Update model when user places order
router.post('/update', async (req, res) => {
  try {
    const { userId, orderData, action } = req.body;

    console.log(`Model update for user ${userId}, action: ${action}`);

    if (action === 'ORDER_PLACED') {
      // Add order to Matrix Factorization training data
      await matrixFactorizationCF.addOrderInteraction({
        userId: userId,
        restaurantId: orderData.restaurantId,
        rating: 5.0, // Implicit positive rating for completed order
        timestamp: new Date(),
        items: orderData.items,
        total: orderData.total
      });

      // Trigger incremental training if needed
      await matrixFactorizationCF.incrementalUpdate();
    }

    res.json({
      success: true,
      message: 'Model updated successfully',
      action: action,
      userId: userId
    });

  } catch (error) {
    console.error('Model update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update model',
      error: error.message
    });
  }
});

module.exports = router;