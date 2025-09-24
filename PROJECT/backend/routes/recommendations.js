// Save as: backend/routes/recommendations.js
const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

// GET recommendations for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { count = 6 } = req.query;

    console.log(`Getting recommendations for user: ${userId}`);

    // For now, return popular restaurants as recommendations
    const restaurants = await Restaurant.find({ isActive: true })
      .sort({ rating: -1 })
      .limit(parseInt(count));

    const recommendations = restaurants.map((restaurant, index) => ({
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
      explanations: ['Popular choice', 'Highly rated'],
      source: 'popularity'
    }));

    res.json({
      success: true,
      algorithm: 'popularity_based',
      recommendations: recommendations,
      totalRecommendations: recommendations.length,
      userId: userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
});

module.exports = router;