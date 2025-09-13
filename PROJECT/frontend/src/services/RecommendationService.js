// frontend/src/services/RecommendationService.js
class RecommendationService {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async getPersonalizedRecommendations(userId, options = {}) {
    const { count = 6, includeExplanation = true, refresh = false, algorithm = 'hybrid' } = options;
    
    // Generate cache key
    const cacheKey = `recommendations_${userId}_${count}_${algorithm}`;
    
    // Check cache if not refreshing
    if (!refresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('Using cached recommendations');
        return cached.data;
      }
    }

    try {
      console.log(`Fetching recommendations for user ${userId} using ${algorithm} algorithm`);
      
      // Validate userId
      let requestUserId = userId;
      if (!userId || userId === 'guest') {
        console.warn('No valid user ID provided, using fallback');
        requestUserId = '6870bd22f7b37e4543eebd97';
      } else if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        console.warn('Invalid ObjectId format, using fallback');
        requestUserId = '6870bd22f7b37e4543eebd97';
      }

      // Call your backend recommendations API
      const url = `${this.baseURL}/recommendations/${requestUserId}?count=${count}&algorithm=${algorithm}`;
      console.log('Calling recommendations API:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Recommendations API response:', data);
      
      if (data.success && data.recommendations && data.recommendations.length > 0) {
        const result = {
          success: true,
          recommendations: data.recommendations,
          source: this.mapAlgorithmToSource(data.algorithm),
          algorithm: data.algorithm,
          totalRecommendations: data.totalRecommendations,
          user: data.user
        };
        
        // Cache the result
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } else {
        console.warn('No recommendations returned from API');
        return {
          success: false,
          error: data.message || 'No recommendations available',
          recommendations: []
        };
      }
      
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      
      // Try fallback with popular restaurants
      try {
        const fallbackResult = await this.getFallbackRecommendations(count);
        return fallbackResult;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return {
          success: false,
          error: `Failed to load recommendations: ${error.message}`,
          recommendations: []
        };
      }
    }
  }

  async getFallbackRecommendations(count = 6) {
    try {
      console.log('Getting fallback popular recommendations');
      
      const response = await fetch(`${this.baseURL}/recommendations/popular?count=${count}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.restaurants && data.restaurants.length > 0) {
        // Format popular restaurants as recommendations
        const formattedRecommendations = data.restaurants.map((restaurant, index) => ({
          id: restaurant._id,
          name: restaurant.name,
          cuisine: restaurant.cuisine || ['Various'],
          rating: restaurant.rating || 'New',
          deliveryTime: restaurant.deliveryTime || '30-45 min',
          priceRange: restaurant.priceRange || 'Moderate',
          deliveryFee: restaurant.deliveryFee || 50,
          minimumOrder: restaurant.minimumOrder || 200,
          matchPercentage: Math.round((restaurant.rating || 3.5) * 20), // Convert rating to percentage
          rank: index + 1,
          explanations: [
            restaurant.rating >= 4.5 ? 'Highly rated restaurant' : 'Popular choice',
            'Trending in your area',
            'Safe fallback option'
          ],
          source: 'popularity'
        }));
        
        return {
          success: true,
          recommendations: formattedRecommendations,
          source: 'popularity',
          algorithm: 'popularity_based_fallback'
        };
      }
      
      throw new Error('No popular restaurants available');
      
    } catch (error) {
      console.error('Fallback recommendations failed:', error);
      throw error;
    }
  }

  async trackUserInteraction(userId, interaction) {
    try {
      const { type, restaurantId, rank, source, matchPercentage } = interaction;
      
      console.log('Tracking user interaction:', { userId, type, restaurantId });
      
      const response = await fetch(`${this.baseURL}/recommendations/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          restaurantId: restaurantId,
          action: this.mapInteractionTypeToAction(type),
          algorithm: source,
          rank: rank
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('User interaction tracked successfully');
      } else {
        console.warn('Failed to track interaction:', data.message);
      }
      
      return data;
      
    } catch (error) {
      console.error('Error tracking user interaction:', error);
      // Don't throw - tracking failures shouldn't break the app
      return { success: false, error: error.message };
    }
  }

  async getRecommendationSystemStatus() {
    try {
      const response = await fetch(`${this.baseURL}/recommendations/status`);
      const data = await response.json();
      
      console.log('Recommendation system status:', data.status);
      return data;
      
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper method to map algorithm names to frontend source labels
  mapAlgorithmToSource(algorithm) {
    const algorithmMap = {
      'matrix_factorization': 'matrix',
      'neural_collaborative_filtering': 'neural',
      'advanced_multi_factor': 'content',
      'hybrid_approach': 'hybrid',
      'popularity_based_fallback': 'popularity',
      'error_fallback': 'fallback'
    };
    
    return algorithmMap[algorithm] || 'standard';
  }

  // Helper method to map frontend interaction types to backend actions
  mapInteractionTypeToAction(type) {
    const typeMap = {
      'RESTAURANT_SELECTED': 'clicked',
      'ORDER_PLACED': 'ordered',
      'FAVORITE': 'favorited',
      'UNFAVORITE': 'unfavorited',
      'DISMISSED': 'dismissed'
    };
    
    return typeMap[type] || 'clicked';
  }

  // Clear cache (useful for debugging or forced refresh)
  clearCache() {
    this.cache.clear();
    console.log('Recommendation cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      timeout: this.cacheTimeout
    };
  }
}

// Create singleton instance
const recommendationService = new RecommendationService();

export default recommendationService;