// Enhanced Matrix Factorization Service Integration
// File: backend/services/enhancedMatrixFactorizationCF.js
// This extends your existing matrixFactorizationCF.js

const matrixFactorizationCF = require('./matrixFactorizationCF'); // Your existing working service
const { ObjectId } = require('mongodb');

class EnhancedMatrixFactorizationCF {
  constructor() {
    this.baseService = matrixFactorizationCF;
    this.interactionBuffer = new Map(); // Buffer for real-time updates
    this.performanceMetrics = new Map(); // Track per-user metrics
  }

  // Enhanced recommendation method with better formatting for frontend
  async getEnhancedRecommendations(userId, options = {}) {
    const {
      count = 6,
      includeExplanations = true,
      includeMetrics = false,
      minConfidence = 0.1
    } = options;

    try {
      console.log(`Getting enhanced Matrix CF recommendations for user: ${userId}`);

      // Get recommendations from your existing working system
      const rawRecommendations = await this.baseService.getRecommendations(userId, count);

      if (!rawRecommendations || rawRecommendations.length === 0) {
        console.log('No Matrix CF recommendations available');
        return {
          success: false,
          recommendations: [],
          reason: 'insufficient_data',
          fallbackRequired: true
        };
      }

      // Enhanced formatting for frontend
      const enhancedRecommendations = await Promise.all(
        rawRecommendations.map(async (rec, index) => {
          const enhanced = await this.enhanceRecommendation(rec, index, userId, includeExplanations);
          return enhanced;
        })
      );

      // Filter by confidence if specified
      const filteredRecommendations = enhancedRecommendations.filter(
        rec => rec.confidence >= minConfidence
      );

      // Calculate performance metrics if requested
      let metrics = null;
      if (includeMetrics) {
        metrics = await this.calculateRecommendationMetrics(userId, filteredRecommendations);
      }

      return {
        success: true,
        recommendations: filteredRecommendations,
        algorithm: 'matrix_factorization_enhanced',
        metrics: metrics,
        totalRecommendations: filteredRecommendations.length,
        userId: userId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Enhanced Matrix CF Error:', error);
      return {
        success: false,
        recommendations: [],
        error: error.message,
        fallbackRequired: true
      };
    }
  }

  // Enhance individual recommendation with rich metadata
  async enhanceRecommendation(rawRec, index, userId, includeExplanations = true) {
    try {
      // Get additional restaurant data from database if needed
      const restaurantData = await this.getRestaurantDetails(rawRec.restaurantId || rawRec._id);
      
      const enhanced = {
        id: rawRec.restaurantId || rawRec._id,
        name: rawRec.restaurantName || rawRec.name || restaurantData?.name || 'Unknown Restaurant',
        
        // Matrix Factorization specific scores
        similarity: rawRec.similarity || rawRec.score || 0.5,
        confidence: this.calculateConfidence(rawRec, index),
        rank: index + 1,
        
        // Restaurant details
        cuisine: rawRec.cuisine || restaurantData?.cuisine || ['Various'],
        rating: rawRec.rating || restaurantData?.rating || 'New',
        deliveryTime: rawRec.deliveryTime || restaurantData?.deliveryTime || '30-45 min',
        priceRange: rawRec.priceRange || restaurantData?.priceRange || 'Moderate',
        deliveryFee: rawRec.deliveryFee || restaurantData?.deliveryFee || 50,
        minimumOrder: rawRec.minimumOrder || restaurantData?.minimumOrder || 200,
        
        // Frontend display properties
        matchPercentage: Math.round((rawRec.similarity || rawRec.score || 0.5) * 100),
        source: 'matrix',
        
        // Explanations for user understanding
        explanations: includeExplanations ? 
          this.generateDetailedExplanations(rawRec, index, userId) : [],
        
        // Metadata for research/debugging
        metadata: {
          algorithm: 'matrix_factorization',
          rawScore: rawRec.similarity || rawRec.score,
          computedAt: new Date().toISOString(),
          userFactors: rawRec.userFactors || null,
          itemFactors: rawRec.itemFactors || null
        }
      };

      return enhanced;

    } catch (error) {
      console.error('Error enhancing recommendation:', error);
      
      // Fallback with minimal data
      return {
        id: rawRec.restaurantId || rawRec._id || 'unknown',
        name: rawRec.restaurantName || rawRec.name || 'Restaurant',
        similarity: rawRec.similarity || 0.5,
        confidence: 0.5,
        rank: index + 1,
        cuisine: ['Various'],
        rating: 'New',
        deliveryTime: '30-45 min',
        priceRange: 'Moderate',
        matchPercentage: 50,
        source: 'matrix',
        explanations: ['Recommended by Matrix Factorization'],
        metadata: { error: error.message }
      };
    }
  }

  // Calculate confidence based on Matrix Factorization factors
  calculateConfidence(recommendation, rank) {
    let confidence = recommendation.similarity || recommendation.score || 0.5;
    
    // Boost confidence for top recommendations
    if (rank === 0) confidence = Math.min(confidence + 0.2, 1.0);
    else if (rank <= 2) confidence = Math.min(confidence + 0.1, 1.0);
    
    // Adjust based on factors if available
    if (recommendation.userFactors && recommendation.itemFactors) {
      // Higher confidence if factors are well-defined
      const factorMagnitude = Math.sqrt(
        recommendation.userFactors.reduce((sum, f) => sum + f * f, 0)
      );
      if (factorMagnitude > 1.0) {
        confidence = Math.min(confidence + 0.1, 1.0);
      }
    }
    
    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  // Generate detailed explanations based on Matrix Factorization insights
  generateDetailedExplanations(recommendation, rank, userId) {
    const explanations = [];
    
    // Rank-based explanations
    if (rank === 0) {
      explanations.push('Perfect Match - Matrix Factorization Top Pick');
    } else if (rank <= 2) {
      explanations.push('Excellent Match - Collaborative Filtering');
    } else {
      explanations.push('Good Match - Similar Users Recommend');
    }
    
    // Similarity-based explanations
    const similarity = recommendation.similarity || recommendation.score || 0.5;
    if (similarity > 0.8) {
      explanations.push('Users with identical taste patterns love this');
    } else if (similarity > 0.6) {
      explanations.push('Highly recommended by similar users');
    } else if (similarity > 0.4) {
      explanations.push('Popular among users like you');
    } else {
      explanations.push('Based on collaborative filtering analysis');
    }
    
    // Factor-based explanations (if available)
    if (recommendation.userFactors) {
      explanations.push('Matches your hidden preference patterns');
    }
    
    // Research context explanation
    explanations.push('Matrix Factorization CF Algorithm');
    
    return explanations.slice(0, 3); // Limit to 3 explanations for clean UI
  }

  // Real-time model updates when users interact
  async updateWithUserInteraction(interaction) {
    try {
      console.log('Updating Matrix CF with interaction:', interaction.type);
      
      // Buffer interaction for batch processing
      const userId = interaction.userId;
      if (!this.interactionBuffer.has(userId)) {
        this.interactionBuffer.set(userId, []);
      }
      this.interactionBuffer.get(userId).push(interaction);
      
      // Process immediately for critical interactions
      if (interaction.type === 'ORDER_PLACED') {
        await this.processOrderInteraction(interaction);
      } else if (interaction.type === 'FAVORITE') {
        await this.processPositiveFeedback(interaction, 1.0);
      } else if (interaction.type === 'UNFAVORITE') {
        await this.processNegativeFeedback(interaction, -0.5);
      } else if (interaction.type === 'RESTAURANT_SELECTED' && interaction.rank <= 3) {
        await this.processPositiveFeedback(interaction, 0.6);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating with interaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Process order placement for model learning
  async processOrderInteraction(interaction) {
    try {
      // Add to your existing Matrix Factorization system
      await this.baseService.addUserInteraction({
        userId: interaction.userId,
        restaurantId: interaction.restaurantId,
        rating: 5.0, // Implicit positive rating for orders
        interactionType: 'order',
        timestamp: new Date(),
        metadata: interaction
      });
      
      // Update performance metrics
      this.updatePerformanceMetrics(interaction.userId, 'order_placed');
      
    } catch (error) {
      console.error('Error processing order interaction:', error);
    }
  }

  // Process positive feedback (favorites, clicks on top recommendations)
  async processPositiveFeedback(interaction, weight) {
    try {
      await this.baseService.addUserInteraction({
        userId: interaction.userId,
        restaurantId: interaction.restaurantId,
        rating: 3.0 + (weight * 2.0), // Scale 3-5 based on weight
        interactionType: 'positive_feedback',
        timestamp: new Date(),
        metadata: interaction
      });
      
    } catch (error) {
      console.error('Error processing positive feedback:', error);
    }
  }

  // Process negative feedback
  async processNegativeFeedback(interaction, weight) {
    try {
      await this.baseService.addUserInteraction({
        userId: interaction.userId,
        restaurantId: interaction.restaurantId,
        rating: 2.0 + weight, // Scale 1-2 based on negative weight
        interactionType: 'negative_feedback',
        timestamp: new Date(),
        metadata: interaction
      });
      
    } catch (error) {
      console.error('Error processing negative feedback:', error);
    }
  }

  // Get restaurant details from database
  async getRestaurantDetails(restaurantId) {
    try {
      // Use your existing database connection
      const db = this.baseService.db || require('../config/database').getDB();
      const restaurant = await db.collection('restaurants').findOne({
        _id: new ObjectId(restaurantId)
      });
      
      return restaurant;
      
    } catch (error) {
      console.error('Error getting restaurant details:', error);
      return null;
    }
  }

  // Calculate recommendation performance metrics for research
  async calculateRecommendationMetrics(userId, recommendations) {
    try {
      // Get user's historical interactions
      const userHistory = await this.getUserInteractionHistory(userId);
      
      if (!userHistory || userHistory.length === 0) {
        return {
          precision_at_5: 0,
          recall_at_5: 0,
          coverage: recommendations.length,
          diversity: this.calculateDiversity(recommendations),
          confidence: 'insufficient_data'
        };
      }
      
      // Calculate precision@5
      const top5 = recommendations.slice(0, 5);
      const relevant = top5.filter(rec => 
        userHistory.some(hist => hist.restaurantId === rec.id && hist.rating >= 4)
      );
      const precision_at_5 = relevant.length / Math.min(top5.length, 5);
      
      // Calculate recall@5
      const totalRelevant = userHistory.filter(hist => hist.rating >= 4).length;
      const recall_at_5 = totalRelevant > 0 ? relevant.length / totalRelevant : 0;
      
      // Calculate diversity (average pairwise distance)
      const diversity = this.calculateDiversity(recommendations);
      
      return {
        precision_at_5: Math.round(precision_at_5 * 100) / 100,
        recall_at_5: Math.round(recall_at_5 * 100) / 100,
        f1_score: precision_at_5 + recall_at_5 > 0 ? 
          Math.round((2 * precision_at_5 * recall_at_5) / (precision_at_5 + recall_at_5) * 100) / 100 : 0,
        coverage: recommendations.length,
        diversity: diversity,
        total_interactions: userHistory.length,
        confidence: recommendations.length > 0 ? 
          recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length : 0
      };
      
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return { error: error.message };
    }
  }

  // Calculate diversity of recommendations
  calculateDiversity(recommendations) {
    if (recommendations.length < 2) return 1.0;
    
    let totalDistance = 0;
    let comparisons = 0;
    
    for (let i = 0; i < recommendations.length; i++) {
      for (let j = i + 1; j < recommendations.length; j++) {
        // Simple cuisine-based diversity
        const cuisineOverlap = this.calculateCuisineOverlap(
          recommendations[i].cuisine, 
          recommendations[j].cuisine
        );
        totalDistance += (1 - cuisineOverlap);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalDistance / comparisons : 1.0;
  }

  // Calculate cuisine overlap between two restaurants
  calculateCuisineOverlap(cuisine1, cuisine2) {
    if (!Array.isArray(cuisine1)) cuisine1 = [cuisine1];
    if (!Array.isArray(cuisine2)) cuisine2 = [cuisine2];
    
    const set1 = new Set(cuisine1.map(c => c.toLowerCase()));
    const set2 = new Set(cuisine2.map(c => c.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Get user interaction history for metrics calculation
  async getUserInteractionHistory(userId) {
    try {
      const db = this.baseService.db || require('../config/database').getDB();
      const interactions = await db.collection('orders').find({
        userId: new ObjectId(userId)
      }).toArray();
      
      return interactions.map(order => ({
        restaurantId: order.restaurantId.toString(),
        rating: order.rating || 5, // Default positive for completed orders
        timestamp: order.createdAt || order.timestamp
      }));
      
    } catch (error) {
      console.error('Error getting user history:', error);
      return [];
    }
  }

  // Update performance metrics for tracking
  updatePerformanceMetrics(userId, action) {
    if (!this.performanceMetrics.has(userId)) {
      this.performanceMetrics.set(userId, {
        orders: 0,
        clicks: 0,
        favorites: 0,
        lastUpdated: new Date()
      });
    }
    
    const metrics = this.performanceMetrics.get(userId);
    if (action === 'order_placed') metrics.orders++;
    else if (action === 'restaurant_clicked') metrics.clicks++;
    else if (action === 'favorite_added') metrics.favorites++;
    
    metrics.lastUpdated = new Date();
  }
}

// Export singleton instance
module.exports = new EnhancedMatrixFactorizationCF();