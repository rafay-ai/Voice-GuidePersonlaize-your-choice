const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// Simple collaborative filtering
router.get('/recommendations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 5 } = req.query;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Get user's order history
        const userOrders = await Order.find({ user: userId })
            .populate('restaurant')
            .lean();
        
        // Get all restaurants
        const allRestaurants = await Restaurant.find({}).lean();
        
        // Simple recommendation scoring
        const recommendations = allRestaurants.map(restaurant => {
            let score = restaurant.rating || 3.0;
            
            // Cuisine preference match
            if (user.preferences?.cuisine && restaurant.cuisine) {
                const match = restaurant.cuisine.some(c => 
                    user.preferences.cuisine.includes(c)
                );
                if (match) score += 2.0;
            }
            
            // Previous order boost
            const previousOrders = userOrders.filter(o => 
                o.restaurant._id.toString() === restaurant._id.toString()
            );
            if (previousOrders.length > 0) {
                score += 1.5 * previousOrders.length;
            }
            
            // Budget compatibility
            const budgetMatch = user.preferences?.budget === restaurant.priceRange?.toLowerCase();
            if (budgetMatch) score += 1.0;
            
            return {
                id: restaurant._id,
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                rating: restaurant.rating,
                deliveryTime: restaurant.deliveryTime,
                priceRange: restaurant.priceRange,
                deliveryFee: restaurant.deliveryFee,
                minimumOrder: restaurant.minimumOrder,
                score: Math.round(score * 100) / 100,
                matchPercentage: Math.min(Math.round(score * 20), 100),
                explanations: previousOrders.length > 0 ? 
                    [`You've ordered here ${previousOrders.length} times`] : 
                    ['Based on your preferences']
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, parseInt(limit));
        
        res.json({
            success: true,
            method: 'simple-collaborative-filtering',
            recommendations: recommendations,
            metadata: {
                userId: userId,
                timestamp: new Date().toISOString(),
                totalRecommendations: recommendations.length
            }
        });
        
    } catch (error) {
        console.error('Simple recommendations error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get recommendations',
            error: error.message
        });
    }
});

router.get('/status', (req, res) => {
    res.json({
        success: true,
        model: {
            initialized: true,
            type: 'simple-collaborative-filtering',
            userCount: 'dynamic',
            itemCount: 'dynamic'
        },
        training: {
            isTraining: false,
            method: 'rule-based'
        }
    });
});

module.exports = router;