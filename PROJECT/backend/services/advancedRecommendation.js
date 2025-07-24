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
  }

  // Main recommendation method
  async getPersonalizedRecommendations(userId, options = {}) {
    try {
      console.log('🎯 Generating advanced recommendations for user:', userId);
      
      const {
        count = 10,
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

      if (!user || allRestaurants.length === 0) {
        return this.getFallbackRecommendations(allRestaurants, count);
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

      return sortedRecommendations.slice(0, count);

    } catch (error) {
      console.error('❌ Advanced recommendation error:', error);
      return this.getFallbackRecommendations([], count);
    }
  }

  // Calculate multiple recommendation factors
  async calculateMultiFactorScore(restaurant, user, userOrders, contextualFactors) {
    const scores = {
      personalPreference: 0,
      collaborative: 0,
      contentBased: 0,
      temporal: 0,
      popularity: 0
    };

    // 1. Personal Preference Score (based on user's past behavior)
    scores.personalPreference = this.calculatePersonalPreferenceScore(
      restaurant,
      user,
      userOrders
    );

    // 2. Collaborative Filtering Score (users with similar tastes)
    scores.collaborative = await this.calculateCollaborativeScore(
      restaurant,
      user,
      userOrders
    );

    // 3. Content-Based Score (restaurant attributes match user preferences)
    scores.contentBased = this.calculateContentBasedScore(restaurant, user);

    // 4. Temporal Score (time-based factors)
    scores.temporal = this.calculateTemporalScore(
      restaurant,
      contextualFactors.currentTime || new Date()
    );

    // 5. Popularity Score (overall restaurant performance)
    scores.popularity = await this.calculatePopularityScore(restaurant);

    return scores;
  }

  // Personal preference based on user's order history
  calculatePersonalPreferenceScore(restaurant, user, userOrders) {
    let score = 0;

    // Check if user has ordered from this restaurant before
    const restaurantOrders = userOrders.filter(
      order => order.restaurant.toString() === restaurant._id.toString()
    );

    if (restaurantOrders.length > 0) {
      // User has ordered before - high preference
      const avgRating = restaurantOrders
        .filter(order => order.rating)
        .reduce((sum, order) => sum + order.rating, 0) / 
        Math.max(restaurantOrders.filter(order => order.rating).length, 1);
      
      score += avgRating * 0.2; // Max 1.0 for 5-star average
      score += Math.min(restaurantOrders.length * 0.1, 0.5); // Frequency bonus
    }

    // Cuisine preference match
    if (user.preferences?.preferredCuisines?.length > 0 && restaurant.cuisine) {
      const cuisineMatches = restaurant.cuisine.filter(cuisine =>
        user.preferences.preferredCuisines.includes(cuisine)
      ).length;
      score += (cuisineMatches / restaurant.cuisine.length) * 0.3;
    }

    // Price range preference
    if (user.preferences?.budgetRange) {
      const priceMatch = this.calculatePriceRangeMatch(
        restaurant.priceRange,
        user.preferences.budgetRange
      );
      score += priceMatch * 0.2;
    }

    return Math.min(score, 1.0);
  }

  // Collaborative filtering - users with similar order patterns
  async calculateCollaborativeScore(restaurant, user, userOrders) {
    try {
      // Find users with similar order patterns
      const similarUsers = await this.findSimilarUsers(user, userOrders);
      
      if (similarUsers.length === 0) return 0;

      // Check how many similar users ordered from this restaurant
      const restaurantOrders = await Order.find({
        restaurant: restaurant._id,
        user: { $in: similarUsers.map(u => u._id) }
      });

      if (restaurantOrders.length === 0) return 0;

      // Calculate score based on similar users' preferences
      const score = Math.min(restaurantOrders.length / similarUsers.length, 1.0);
      return score * 0.8; // Max 0.8 for collaborative score

    } catch (error) {
      console.error('Collaborative filtering error:', error);
      return 0;
    }
  }

  // Content-based filtering - restaurant attributes match user profile
  calculateContentBasedScore(restaurant, user) {
    let score = 0;

    // Rating match (higher rated restaurants get higher scores)
    score += (restaurant.rating || 0) / 5 * 0.3;

    // Delivery time preference (faster is usually better)
    const deliveryMinutes = this.parseDeliveryTime(restaurant.deliveryTime);
    if (deliveryMinutes <= 30) score += 0.2;
    else if (deliveryMinutes <= 45) score += 0.1;

    // Cuisine diversity bonus
    if (restaurant.cuisine && restaurant.cuisine.length > 1) {
      score += 0.1;
    }

    // Minimum order compatibility
    if (user.preferences?.averageOrderValue) {
      if (restaurant.minimumOrder <= user.preferences.averageOrderValue) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  // Temporal factors - time-based recommendations
  calculateTemporalScore(restaurant, currentTime) {
    let score = 0;
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();

    // Meal time matching
    if (hour >= 6 && hour <= 10) {
      // Breakfast time
      if (restaurant.cuisine?.includes('Breakfast') || 
          restaurant.name.toLowerCase().includes('breakfast')) {
        score += 0.3;
      }
    } else if (hour >= 11 && hour <= 15) {
      // Lunch time
      if (restaurant.cuisine?.includes('Fast Food') || 
          restaurant.cuisine?.includes('Pakistani')) {
        score += 0.2;
      }
    } else if (hour >= 18 && hour <= 22) {
      // Dinner time
      score += 0.1; // All restaurants get slight dinner boost
    }

    // Weekend boost for premium restaurants
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (restaurant.priceRange === 'Premium' || restaurant.priceRange === 'Luxury') {
        score += 0.1;
      }
    }

    return score;
  }

  // Popularity based on overall performance
  async calculatePopularityScore(restaurant) {
    try {
      // Get recent order count
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentOrderCount = await Order.countDocuments({
        restaurant: restaurant._id,
        createdAt: { $gte: thirtyDaysAgo }
      });

      // Normalize order count (assuming max 100 orders per month is very popular)
      const orderScore = Math.min(recentOrderCount / 100, 1.0) * 0.4;

      // Rating score
      const ratingScore = (restaurant.rating || 0) / 5 * 0.4;

      // Delivery fee competitiveness (lower is better)
      const feeScore = Math.max(0, (100 - restaurant.deliveryFee) / 100) * 0.2;

      return orderScore + ratingScore + feeScore;

    } catch (error) {
      console.error('Popularity calculation error:', error);
      return (restaurant.rating || 0) / 5 * 0.5;
    }
  }

  // Calculate weighted final score
  calculateWeightedScore(scores) {
    return (
      scores.personalPreference * this.weights.personalPreference +
      scores.collaborative * this.weights.collaborative +
      scores.contentBased * this.weights.contentBased +
      scores.temporal * this.weights.temporal +
      scores.popularity * this.weights.popularity
    );
  }

  // Apply diversity to avoid too many similar restaurants
  applyDiversityFilter(recommendations, diversityFactor) {
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
  }

  // Boost new and trending restaurants
  boostNewAndTrending(recommendations) {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return recommendations.map(rec => {
      // New restaurant boost
      if (rec.restaurant.createdAt > oneMonthAgo) {
        rec.finalScore += 0.1;
        rec.explanations.push("🆕 New restaurant");
      }

      // High rating boost
      if (rec.restaurant.rating > 4.5) {
        rec.finalScore += 0.05;
        rec.explanations.push("⭐ Highly rated");
      }

      return rec;
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  // Generate explanations for recommendations
  generateExplanations(scores, restaurant, user) {
    const explanations = [];

    if (scores.personalPreference > 0.6) {
      explanations.push("❤️ Matches your preferences");
    }
    if (scores.collaborative > 0.5) {
      explanations.push("👥 Popular with similar users");
    }
    if (scores.temporal > 0.3) {
      explanations.push("⏰ Perfect for this time");
    }
    if (scores.popularity > 0.7) {
      explanations.push("🔥 Trending now");
    }

    return explanations;
  }

  // Helper methods
  async getUserProfile(userId) {
    try {
      return await User.findById(userId);
    } catch (error) {
      return null;
    }
  }

  async getUserOrderHistory(userId, limit = 50) {
    try {
      return await Order.find({ user: userId })
        .populate('restaurant')
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      return [];
    }
  }

  async findSimilarUsers(user, userOrders, limit = 10) {
    try {
      // Find users who ordered from similar restaurants
      const userRestaurants = [...new Set(userOrders.map(order => 
        order.restaurant._id?.toString() || order.restaurant.toString()
      ))];

      if (userRestaurants.length === 0) return [];

      const similarUserOrders = await Order.find({
        restaurant: { $in: userRestaurants },
        user: { $ne: user._id }
      }).populate('user');

      const userCounts = {};
      similarUserOrders.forEach(order => {
        const userId = order.user._id.toString();
        userCounts[userId] = (userCounts[userId] || 0) + 1;
      });

      return Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([userId]) => ({ _id: userId }));

    } catch (error) {
      console.error('Finding similar users error:', error);
      return [];
    }
  }

  calculatePriceRangeMatch(restaurantPriceRange, userBudgetRange) {
    const priceValues = { 'Budget': 1, 'Moderate': 2, 'Premium': 3, 'Luxury': 4 };
    const restPrice = priceValues[restaurantPriceRange] || 2;
    const userPrice = priceValues[userBudgetRange] || 2;
    
    const difference = Math.abs(restPrice - userPrice);
    return Math.max(0, 1 - (difference / 3));
  }

  parseDeliveryTime(deliveryTime) {
    const match = deliveryTime?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 45;
  }

  getFallbackRecommendations(restaurants, count) {
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
        popularity: (restaurant.rating || 0) / 5
      }));
  }

  // Real-time recommendation updates
  async updateUserProfile(userId, orderData) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Update preferred cuisines
      if (orderData.restaurant?.cuisine) {
        orderData.restaurant.cuisine.forEach(cuisine => {
          if (!user.preferences.preferredCuisines.includes(cuisine)) {
            user.preferences.preferredCuisines.push(cuisine);
          }
        });
      }

      // Update average order value
      const userOrders = await Order.find({ user: userId });
      const totalValue = userOrders.reduce((sum, order) => sum + order.pricing.total, 0);
      user.preferences.averageOrderValue = totalValue / userOrders.length;

      await user.save();
      console.log('✅ User profile updated for:', userId);

    } catch (error) {
      console.error('❌ Profile update error:', error);
    }
  }
}

module.exports = AdvancedRecommendationEngine;