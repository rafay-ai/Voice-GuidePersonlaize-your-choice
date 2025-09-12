// Enhanced Recommendation Service for React Native Integration
// File: frontend/src/services/RecommendationService.js

class RecommendationService {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Enhanced recommendation fetching with fallback system
  async getPersonalizedRecommendations(userId, options = {}) {
    const {
      count = 6,
      includeExplanation = true,
      includeNew = true,
      refresh = false
    } = options;

    // Check cache first unless refresh is requested
    const cacheKey = `recommendations_${userId}_${count}`;
    if (!refresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return { success: true, recommendations: cached.data, source: 'cache' };
      }
    }

    try {
      // Primary: Try Neural Collaborative Filtering
      try {
        const neuralResponse = await this.fetchNeuralRecommendations(userId, count);
        if (neuralResponse.success && neuralResponse.recommendations.length > 0) {
          this.cacheRecommendations(cacheKey, neuralResponse.recommendations);
          return { ...neuralResponse, source: 'neural' };
        }
      } catch (neuralError) {
        console.log('Neural CF not available, trying Matrix Factorization...');
      }

      // Secondary: Try Matrix Factorization Collaborative Filtering
      try {
        const matrixResponse = await this.fetchMatrixRecommendations(userId, count);
        if (matrixResponse.success && matrixResponse.recommendations.length > 0) {
          this.cacheRecommendations(cacheKey, matrixResponse.recommendations);
          return { ...matrixResponse, source: 'matrix' };
        }
      } catch (matrixError) {
        console.log('Matrix CF not available, using content-based...');
      }

      // Tertiary: Content-based recommendations
      const contentResponse = await this.fetchContentBasedRecommendations(userId, count);
      this.cacheRecommendations(cacheKey, contentResponse.recommendations);
      return { ...contentResponse, source: 'content' };

    } catch (error) {
      console.error('All recommendation systems failed:', error);
      return { 
        success: false, 
        recommendations: [], 
        error: error.message,
        source: 'error'
      };
    }
  }

  // Neural Collaborative Filtering API
  async fetchNeuralRecommendations(userId, count) {
    const response = await fetch(
      `${this.baseURL}/neural/recommendations/${userId}?limit=${count}&includeExplanation=true`
    );
    
    if (!response.ok) {
      throw new Error(`Neural API failed: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      recommendations: this.formatRecommendations(data.recommendations, 'neural')
    };
  }

  // Matrix Factorization Collaborative Filtering API
  async fetchMatrixRecommendations(userId, count) {
    const response = await fetch(
      `${this.baseURL}/recommendations/matrix-factorization/${userId}?count=${count}&includeExplanations=true`
    );
    
    if (!response.ok) {
      throw new Error(`Matrix API failed: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      recommendations: this.formatRecommendations(data.recommendations, 'matrix')
    };
  }

  // Content-based recommendations (fallback)
  async fetchContentBasedRecommendations(userId, count) {
    const response = await fetch(
      `${this.baseURL}/recommendations/advanced/${userId}?count=${count}&includeNew=true`
    );
    
    if (!response.ok) {
      throw new Error(`Content API failed: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      recommendations: this.formatRecommendations(data.recommendations, 'content')
    };
  }

  // Format recommendations to consistent structure
  formatRecommendations(recommendations, source) {
    return recommendations.map((rec, index) => ({
      id: rec.id || rec._id,
      name: rec.name || rec.restaurant?.name,
      cuisine: rec.cuisine || rec.restaurant?.cuisine || ['Various'],
      rating: rec.rating || rec.restaurant?.rating || 'New',
      deliveryTime: rec.deliveryTime || rec.restaurant?.deliveryTime || '30-45 min',
      priceRange: rec.priceRange || rec.restaurant?.priceRange || 'Moderate',
      matchPercentage: this.calculateMatchPercentage(rec, source),
      explanations: this.generateExplanations(rec, source, index),
      deliveryFee: rec.deliveryFee || 50,
      minimumOrder: rec.minimumOrder || 200,
      source: source,
      rank: index + 1
    }));
  }

  // Calculate match percentage based on source
  calculateMatchPercentage(rec, source) {
    switch (source) {
      case 'neural':
        return Math.round((rec.confidence || rec.score || 0.8) * 100);
      case 'matrix':
        return Math.round((rec.similarity || rec.score || 0.7) * 100);
      case 'content':
        return Math.round((rec.score || 50));
      default:
        return 75;
    }
  }

  // Generate explanations based on recommendation source
  generateExplanations(rec, source, rank) {
    const baseExplanations = rec.explanations || [];
    
    const sourceExplanations = {
      neural: [
        rank === 0 ? 'AI Top Pick - Perfect for your taste' : 'AI Recommended',
        'Learned from similar users',
        'Matches your dining patterns'
      ],
      matrix: [
        rank === 0 ? 'Best Match - Collaborative filtering' : 'Great Match',
        'Users with similar taste love this',
        'Based on your order history'
      ],
      content: [
        'Matches your preferences',
        'Popular choice',
        'Highly rated'
      ]
    };

    return baseExplanations.length > 0 
      ? baseExplanations 
      : sourceExplanations[source] || ['Recommended for you'];
  }

  // Cache recommendations
  cacheRecommendations(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Clear cache when user preferences change
  clearUserCache(userId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Track user interaction for model learning
  async trackUserInteraction(userId, interaction) {
    try {
      const response = await fetch(`${this.baseURL}/user-interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...interaction,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Clear cache to get fresh recommendations
        this.clearUserCache(userId);
      }

      return response.ok;
    } catch (error) {
      console.error('Failed to track interaction:', error);
      return false;
    }
  }

  // Real-time recommendation updates
  async updateRecommendationsAfterOrder(userId, orderData) {
    try {
      // Send order data to backend for model update
      await fetch(`${this.baseURL}/recommendations/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          orderData,
          action: 'ORDER_PLACED'
        })
      });

      // Clear cache and fetch fresh recommendations
      this.clearUserCache(userId);
      return await this.getPersonalizedRecommendations(userId, { refresh: true });
    } catch (error) {
      console.error('Failed to update recommendations:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const recommendationService = new RecommendationService();

export default recommendationService;