// Enhanced Recommendation Engine with Machine Learning-like Features
// backend/services/advancedRecommendation.js

const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');

class AdvancedRecommendationEngine {
  constructor() {
    this.weights = {
      personalPreference: 0.35,
      collaborative: 0.25,
      contentBased: 0.20,
      temporal: 0.10,
      popularity: 0.10
    };
    console.log('🎯 AdvancedRecommendationEngine initialized');
  }

  // Main recommendation method - FIXED
  async getPersonalizedRecommendations(userId, options = {}) {
    try {
      console.log('🎯 Generating advanced recommendations for user:', userId);
      
      const {
        count = 6,
        includeNewRestaurants = true,
        diversityFactor = 0.3,
        contextualFactors = {}
      } = options;

      // Get user data and order history
      const [user, userOrders, allRestaurants] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserOrderHistory(userId),
        Restaurant.find({ isActive: true })
      ]);

      console.log('📊 Data fetched:', {
        user: user?.name || 'Guest',
        ordersCount: userOrders.length,
        restaurantsCount: allRestaurants.length
      });

      if (allRestaurants.length === 0) {
        console.log('❌ No restaurants found');
        return this.getFallbackRecommendations([], count);
      }

      // Calculate different recommendation scores
      const recommendations = await Promise.all(
        allRestaurants.map(async (restaurant) => {
          const scores = await this.calculateMultiFactorScore(
            restaurant,
            user,
            userOrders,
            contextualFactors
          );
          
          return {
            restaurant,
            ...scores,
            finalScore: this.calculateWeightedScore(scores),
            explanations: this.generateExplanations(scores, restaurant, user)
          };
        })
      );

      console.log('✅ Calculated scores for all restaurants');

      // Sort by final score and apply diversity
      let sortedRecommendations = recommendations
        .sort((a, b) => b.finalScore - a.finalScore);

      // Apply diversity to avoid too many similar restaurants
      if (diversityFactor > 0) {
        sortedRecommendations = this.applyDiversityFilter(
          sortedRecommendations,
          diversityFactor
        );
      }

      // Add trending and new restaurant boost
      if (includeNewRestaurants) {
        sortedRecommendations = this.boostNewAndTrending(sortedRecommendations);
      }

      const finalRecommendations = sortedRecommendations.slice(0, count);
      
      console.log('🎉 Generated recommendations:', finalRecommendations.length);
      
      return finalRecommendations;

    } catch (error) {
      console.error('❌ Advanced recommendation error:', error);
      console.error('❌ Stack trace:', error.stack);
      
      // Return fallback recommendations
      try {
        const fallbackRestaurants = await Restaurant.find({ isActive: true }).limit(count);
        return this.getFallbackRecommendations(fallbackRestaurants, count);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  // Calculate multiple recommendation factors - IMPROVED
  async calculateMultiFactorScore(restaurant, user, userOrders, contextualFactors) {
    try {
      const scores = {
        personalPreference: 0,
        collaborative: 0,
        contentBased: 0,
        temporal: 0,
        popularity: 0,
        debug: {}
      };

      // 1. Personal Preference Score (based on user's past behavior)
      scores.personalPreference = this.calculatePersonalPreferenceScore(
        restaurant,
        user,
        userOrders
      );
      scores.debug.personalPreference = `Based on user preferences and order history`;

      // 2. Collaborative Filtering Score (users with similar tastes)
      scores.collaborative = await this.calculateCollaborativeScore(
        restaurant,
        user,
        userOrders
      );
      scores.debug.collaborative = `Based on similar users' preferences`;

      // 3. Content-Based Score (restaurant attributes match user preferences)
      scores.contentBased = this.calculateContentBasedScore(restaurant, user);
      scores.debug.contentBased = `Based on restaurant attributes`;

      // 4. Temporal Score (time-based factors)
      scores.temporal = this.calculateTemporalScore(
        restaurant,
        contextualFactors.currentTime || new Date()
      );
      scores.debug.temporal = `Based on current time and day`;

      // 5. Popularity Score (overall restaurant performance)
      scores.popularity = await this.calculatePopularityScore(restaurant);
      scores.debug.popularity = `Based on overall performance`;

      return scores;
      
    } catch (error) {
      console.error('❌ Score calculation error for restaurant:', restaurant.name, error);
      return {
        personalPreference: 0,
        collaborative: 0,
        contentBased: (restaurant.rating || 0) / 5,
        temporal: 0,
        popularity: (restaurant.rating || 0) / 5,
        debug: { error: error.message }
      };
    }
  }

  // Personal preference based on user's order history - IMPROVED
  calculatePersonalPreferenceScore(restaurant, user, userOrders) {
    try {
      let score = 0;

      // Check if user has ordered from this restaurant before
      const restaurantOrders = userOrders.filter(
        order => order.restaurant && order.restaurant._id && 
                 order.restaurant._id.toString() === restaurant._id.toString()
      );

      if (restaurantOrders.length > 0) {
        // User has ordered before - high preference
        const avgRating = restaurantOrders
          .filter(order => order.rating)
          .reduce((sum, order) => sum + order.rating, 0) / 
          Math.max(restaurantOrders.filter(order => order.rating).length, 1);
        
        score += (avgRating / 5) * 0.4; // Max 0.4 for 5-star average
        score += Math.min(restaurantOrders.length * 0.1, 0.3); // Frequency bonus, max 0.3
      }

      // Cuisine preference match
      if (user && user.preferences && user.preferences.preferredCuisines && 
          user.preferences.preferredCuisines.length > 0 && restaurant.cuisine) {
        const cuisineMatches = restaurant.cuisine.filter(cuisine =>
          user.preferences.preferredCuisines.some(prefCuisine => 
            prefCuisine.toLowerCase().includes(cuisine.toLowerCase()) ||
            cuisine.toLowerCase().includes(prefCuisine.toLowerCase())
          )
        ).length;
        score += (cuisineMatches / Math.max(restaurant.cuisine.length, 1)) * 0.3;
      }

      return Math.min(score, 1.0);
    } catch (error) {
      console.error('❌ Personal preference calculation error:', error);
      return 0;
    }
  }

  // Collaborative filtering - SIMPLIFIED AND IMPROVED
  async calculateCollaborativeScore(restaurant, user, userOrders) {
    try {
      if (!user || userOrders.length === 0) return 0;

      // Find users with similar order patterns (simplified)
      const userRestaurantIds = userOrders
        .filter(order => order.restaurant && order.restaurant._id)
        .map(order => order.restaurant._id.toString());

      if (userRestaurantIds.length === 0) return 0;

      // Get orders from users who ordered from similar restaurants
      const similarUserOrders = await Order.find({
        restaurant: { $in: userRestaurantIds },
        user: { $ne: user._id }
      }).limit(100); // Limit for performance

      if (similarUserOrders.length === 0) return 0;

      // Check how many similar users ordered from this restaurant
      const thisRestaurantOrders = similarUserOrders.filter(order =>
        order.restaurant.toString() === restaurant._id.toString()
      );

      const collaborativeScore = Math.min(
        thisRestaurantOrders.length / Math.max(similarUserOrders.length, 1),
        1.0
      );

      return collaborativeScore * 0.8; // Max 0.8 for collaborative score

    } catch (error) {
      console.error('❌ Collaborative filtering error:', error);
      return 0;
    }
  }

  // Content-based filtering - IMPROVED
  calculateContentBasedScore(restaurant, user) {
    try {
      let score = 0;

      // Rating match (higher rated restaurants get higher scores)
      score += (restaurant.rating || 0) / 5 * 0.4;

      // Delivery time preference (faster is usually better)
      const deliveryMinutes = this.parseDeliveryTime(restaurant.deliveryTime);
      if (deliveryMinutes <= 30) score += 0.2;
      else if (deliveryMinutes <= 45) score += 0.1;

      // Cuisine diversity bonus
      if (restaurant.cuisine && restaurant.cuisine.length > 1) {
        score += 0.1;
      }

      // Price range compatibility
      if (restaurant.minimumOrder <= 500) { // Reasonable minimum order
        score += 0.2;
      }

      // Popular restaurant boost
      if (restaurant.rating >= 4.0) {
        score += 0.1;
      }

      return Math.min(score, 1.0);
    } catch (error) {
      console.error('❌ Content-based calculation error:', error);
      return (restaurant.rating || 0) / 5 * 0.5;
    }
  }

  // Temporal factors - IMPROVED
  calculateTemporalScore(restaurant, currentTime) {
    try {
      let score = 0;
      const hour = currentTime.getHours();
      const dayOfWeek = currentTime.getDay();

      // Meal time matching
      if (hour >= 6 && hour <= 10) {
        // Breakfast time
        if (restaurant.cuisine && (
          restaurant.cuisine.includes('Breakfast') || 
          restaurant.name.toLowerCase().includes('breakfast') ||
          restaurant.cuisine.includes('Pakistani')
        )) {
          score += 0.3;
        }
      } else if (hour >= 11 && hour <= 15) {
        // Lunch time
        if (restaurant.cuisine && (
          restaurant.cuisine.includes('Fast Food') || 
          restaurant.cuisine.includes('Pakistani') ||
          restaurant.cuisine.includes('Chinese')
        )) {
          score += 0.2;
        }
      } else if (hour >= 18 && hour <= 22) {
        // Dinner time - all restaurants get slight boost
        score += 0.1;
        
        // Premium restaurants get extra boost for dinner
        if (restaurant.priceRange === 'Premium' || restaurant.priceRange === 'Luxury') {
          score += 0.1;
        }
      }

      // Weekend boost for premium restaurants
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (restaurant.priceRange === 'Premium' || restaurant.priceRange === 'Luxury') {
          score += 0.1;
        }
      }

      return Math.min(score, 1.0);
    } catch (error) {
      console.error('❌ Temporal calculation error:', error);
      return 0.1; // Default small boost
    }
  }

  // Popularity based on overall performance - IMPROVED
  async calculatePopularityScore(restaurant) {
    try {
      // Get recent order count (simplified)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let recentOrderCount = 0;
      
      try {
        recentOrderCount = await Order.countDocuments({
          restaurant: restaurant._id,
          createdAt: { $gte: thirtyDaysAgo }
        });
      } catch (dbError) {
        console.log('⚠️ Could not fetch order count, using rating only');
      }

      // Normalize order count (assuming max 50 orders per month is very popular)
      const orderScore = Math.min(recentOrderCount / 50, 1.0) * 0.4;

      // Rating score
      const ratingScore = (restaurant.rating || 0) / 5 * 0.5;

      // Delivery fee competitiveness (lower is better)
      const feeScore = Math.max(0, (100 - (restaurant.deliveryFee || 50)) / 100) * 0.1;

      return Math.min(orderScore + ratingScore + feeScore, 1.0);

    } catch (error) {
      console.error('❌ Popularity calculation error:', error);
      return (restaurant.rating || 0) / 5 * 0.5;
    }
  }

  // Calculate weighted final score - FIXED
  calculateWeightedScore(scores) {
    try {
      const finalScore = (
        (scores.personalPreference || 0) * this.weights.personalPreference +
        (scores.collaborative || 0) * this.weights.collaborative +
        (scores.contentBased || 0) * this.weights.contentBased +
        (scores.temporal || 0) * this.weights.temporal +
        (scores.popularity || 0) * this.weights.popularity
      );

      return Math.max(0, Math.min(finalScore, 1.0));
    } catch (error) {
      console.error('❌ Weighted score calculation error:', error);
      return 0.5; // Default middle score
    }
  }

  // Apply diversity to avoid too many similar restaurants - IMPROVED
  applyDiversityFilter(recommendations, diversityFactor) {
    try {
      const diverseRecommendations = [];
      const cuisineCount = {};

      for (const rec of recommendations) {
        const cuisines = rec.restaurant.cuisine || [];
        let shouldAdd = true;

        // Check if we have too many of this cuisine type
        for (const cuisine of cuisines) {
          if (cuisineCount[cuisine] >= 2 && Math.random() < diversityFactor) {
            shouldAdd = false;
            break;
          }
        }

        if (shouldAdd) {
          diverseRecommendations.push(rec);
          cuisines.forEach(cuisine => {
            cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1;
          });
        }
      }

      return diverseRecommendations;
    } catch (error) {
      console.error('❌ Diversity filter error:', error);
      return recommendations; // Return original if filtering fails
    }
  }

  // Boost new and trending restaurants - IMPROVED
  boostNewAndTrending(recommendations) {
    try {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      return recommendations.map(rec => {
        // New restaurant boost
        if (rec.restaurant.createdAt && rec.restaurant.createdAt > oneMonthAgo) {
          rec.finalScore += 0.1;
          rec.explanations.push("🆕 New restaurant");
        }

        // High rating boost
        if ((rec.restaurant.rating || 0) > 4.5) {
          rec.finalScore += 0.05;
          rec.explanations.push("⭐ Highly rated");
        }

        // Ensure final score doesn't exceed 1.0
        rec.finalScore = Math.min(rec.finalScore, 1.0);

        return rec;
      }).sort((a, b) => b.finalScore - a.finalScore);
    } catch (error) {
      console.error('❌ Boost calculation error:', error);
      return recommendations;
    }
  }

  // Generate explanations for recommendations - IMPROVED
  generateExplanations(scores, restaurant, user) {
    try {
      const explanations = [];

      if (scores.personalPreference > 0.6) {
        explanations.push("Based on your preferences");
      }
      if (scores.collaborative > 0.5) {
        explanations.push("Popular with similar users");
      }
      if (scores.temporal > 0.3) {
        explanations.push("Perfect for this time");
      }
      if (scores.popularity > 0.7) {
        explanations.push("Trending now");
      }
      if ((restaurant.rating || 0) >= 4.5) {
        explanations.push("Highly rated");
      }
      if ((restaurant.deliveryTime || '').includes('30') || 
          (restaurant.deliveryTime || '').includes('20')) {
        explanations.push("Fast delivery");
      }

      // Ensure we always have at least one explanation
      if (explanations.length === 0) {
        explanations.push("Recommended for you");
      }

      return explanations;
    } catch (error) {
      console.error('❌ Explanation generation error:', error);
      return ["Recommended for you"];
    }
  }

  // Helper methods - IMPROVED
  async getUserProfile(userId) {
    try {
      if (!userId || userId === 'guest') return null;
      
      // Check if it's a valid ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.log('⚠️ Invalid ObjectId format:', userId);
        return null;
      }
      
      return await User.findById(userId);
    } catch (error) {
      console.error('❌ getUserProfile error:', error);
      return null;
    }
  }

  async getUserOrderHistory(userId, limit = 50) {
    try {
      if (!userId || userId === 'guest') return [];
      
      // Check if it's a valid ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.log('⚠️ Invalid ObjectId format for orders:', userId);
        return [];
      }
      
      return await Order.find({ user: userId })
        .populate('restaurant')
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('❌ getUserOrderHistory error:', error);
      return [];
    }
  }

  parseDeliveryTime(deliveryTime) {
    try {
      if (!deliveryTime) return 45;
      const match = deliveryTime.match(/(\d+)/);
      return match ? parseInt(match[1]) : 45;
    } catch (error) {
      return 45;
    }
  }

  // Improved fallback recommendations
  getFallbackRecommendations(restaurants, count) {
    try {
      console.log('🔄 Using fallback recommendations');
      
      if (!restaurants || restaurants.length === 0) {
        return [];
      }

      return restaurants
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, count)
        .map(restaurant => ({
          restaurant,
          finalScore: (restaurant.rating || 0) / 5,
          explanations: ["⭐ Highly rated"],
          personalPreference: 0,
          collaborative: 0,
          contentBased: (restaurant.rating || 0) / 5,
          temporal: 0,
          popularity: (restaurant.rating || 0) / 5,
          debug: { fallback: true }
        }));
    } catch (error) {
      console.error('❌ Fallback recommendations error:', error);
      return [];
    }
  }

  // Real-time recommendation updates - IMPROVED
  async updateUserProfile(userId, orderData) {
    try {
      if (!userId || userId === 'guest') return;
      
      const user = await User.findById(userId);
      if (!user) {
        console.log('⚠️ User not found for profile update:', userId);
        return;
      }

      // Update preferred cuisines
      if (orderData.restaurant && orderData.restaurant.cuisine) {
        if (!user.preferences) user.preferences = {};
        if (!user.preferences.preferredCuisines) user.preferences.preferredCuisines = [];
        
        orderData.restaurant.cuisine.forEach(cuisine => {
          if (!user.preferences.preferredCuisines.includes(cuisine)) {
            user.preferences.preferredCuisines.push(cuisine);
          }
        });
      }

      // Update average order value
      const userOrders = await Order.find({ user: userId });
      if (userOrders.length > 0) {
        const totalValue = userOrders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
        if (!user.preferences) user.preferences = {};
        user.preferences.averageOrderValue = totalValue / userOrders.length;
      }

      await user.save();
      console.log('✅ User profile updated for:', userId);

    } catch (error) {
      console.error('❌ Profile update error:', error);
    }
  }
}

module.exports = AdvancedRecommendationEngine;