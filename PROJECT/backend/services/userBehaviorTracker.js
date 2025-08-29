// backend/services/userBehaviorTracker.js
const mongoose = require('mongoose');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');

// User interaction schema for neural recommendations
const userInteractionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  interactionType: {
    type: String,
    enum: ['view', 'cart_add', 'cart_remove', 'order', 'rating'],
    required: true
  },
  interactionValue: {
    type: Number,
    default: 1 // For views, cart actions. For ratings: 1-5, orders: quantity
  },
  sessionId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  context: {
    timeOfDay: String, // morning, afternoon, evening, night
    dayOfWeek: String,
    deviceType: String, // mobile, desktop
    previousItems: [String] // Previous items viewed in session
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
userInteractionSchema.index({ userId: 1, timestamp: -1 });
userInteractionSchema.index({ itemId: 1, interactionType: 1 });
userInteractionSchema.index({ sessionId: 1, timestamp: -1 });

const UserInteraction = mongoose.model('UserInteraction', userInteractionSchema);

class UserBehaviorTracker {
  constructor() {
    this.sessionData = new Map(); // In-memory session tracking
  }

  /**
   * Track user interaction with menu items
   */
  async trackInteraction(userId, itemId, interactionType, sessionId, options = {}) {
    try {
      const context = this.getContextualInfo(options);
      
      const interaction = new UserInteraction({
        userId,
        itemId,
        interactionType,
        interactionValue: options.value || 1,
        sessionId,
        context
      });

      await interaction.save();

      // Update session data for real-time recommendations
      this.updateSessionData(sessionId, itemId, interactionType);

      // Update item popularity scores
      await this.updateItemPopularity(itemId, interactionType);

      return interaction;
    } catch (error) {
      console.error('Error tracking interaction:', error);
      throw error;
    }
  }

  /**
   * Get contextual information for the interaction
   */
  getContextualInfo(options) {
    const now = new Date();
    const hour = now.getHours();
    
    let timeOfDay;
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    return {
      timeOfDay,
      dayOfWeek,
      deviceType: options.deviceType || 'unknown',
      previousItems: options.previousItems || []
    };
  }

  /**
   * Update session data for real-time recommendations
   */
  updateSessionData(sessionId, itemId, interactionType) {
    if (!this.sessionData.has(sessionId)) {
      this.sessionData.set(sessionId, {
        viewedItems: new Set(),
        cartItems: new Set(),
        interactionCount: 0,
        lastActivity: Date.now()
      });
    }

    const session = this.sessionData.get(sessionId);
    session.lastActivity = Date.now();
    session.interactionCount++;

    switch (interactionType) {
      case 'view':
        session.viewedItems.add(itemId.toString());
        break;
      case 'cart_add':
        session.cartItems.add(itemId.toString());
        break;
      case 'cart_remove':
        session.cartItems.delete(itemId.toString());
        break;
    }
  }

  /**
   * Update item popularity based on interactions
   */
  async updateItemPopularity(itemId, interactionType) {
    try {
      const weights = {
        view: 0.1,
        cart_add: 0.3,
        order: 1.0,
        rating: 0.5
      };

      const weight = weights[interactionType] || 0.1;
      
      await MenuItem.findByIdAndUpdate(itemId, {
        $inc: {
          orderCount: interactionType === 'order' ? 1 : 0,
          popularityScore: weight * 0.01 // Small incremental updates
        }
      });
    } catch (error) {
      console.error('Error updating item popularity:', error);
    }
  }

  /**
   * Get user's interaction history
   */
  async getUserInteractions(userId, limit = 100) {
    try {
      return await UserInteraction.find({ userId })
        .populate('itemId', 'name category restaurant price')
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return [];
    }
  }

  /**
   * Get interaction matrix data for neural recommendations
   */
  async getInteractionMatrix(limit = 1000) {
    try {
      const interactions = await UserInteraction.aggregate([
        {
          $match: {
            interactionType: { $in: ['order', 'rating', 'cart_add'] }
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              itemId: '$itemId'
            },
            totalInteractions: { $sum: '$interactionValue' },
            lastInteraction: { $max: '$timestamp' }
          }
        },
        {
          $sort: { lastInteraction: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return interactions;
    } catch (error) {
      console.error('Error getting interaction matrix:', error);
      return [];
    }
  }

  /**
   * Get session-based recommendations
   */
  getSessionRecommendations(sessionId) {
    const session = this.sessionData.get(sessionId);
    if (!session) return null;

    return {
      viewedItems: Array.from(session.viewedItems),
      cartItems: Array.from(session.cartItems),
      interactionCount: session.interactionCount,
      sessionDuration: Date.now() - session.lastActivity
    };
  }

  /**
   * Clean old session data (call periodically)
   */
  cleanOldSessions() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [sessionId, session] of this.sessionData.entries()) {
      if (session.lastActivity < oneHourAgo) {
        this.sessionData.delete(sessionId);
      }
    }
  }

  /**
   * Get popular items by category
   */
  async getPopularItemsByCategory(category, limit = 10) {
    try {
      return await MenuItem.find({ category })
        .sort({ popularityScore: -1, averageRating: -1 })
        .limit(limit)
        .populate('restaurant', 'name');
    } catch (error) {
      console.error('Error fetching popular items:', error);
      return [];
    }
  }

  /**
   * Get trending items (high recent interaction)
   */
  async getTrendingItems(hours = 24, limit = 10) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const trending = await UserInteraction.aggregate([
        {
          $match: {
            timestamp: { $gte: since },
            interactionType: { $in: ['view', 'cart_add', 'order'] }
          }
        },
        {
          $group: {
            _id: '$itemId',
            interactionCount: { $sum: 1 },
            recentScore: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$interactionType', 'order'] }, then: 3 },
                    { case: { $eq: ['$interactionType', 'cart_add'] }, then: 2 },
                    { case: { $eq: ['$interactionType', 'view'] }, then: 1 }
                  ],
                  default: 0
                }
              }
            }
          }
        },
        {
          $sort: { recentScore: -1, interactionCount: -1 }
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'menuitems',
            localField: '_id',
            foreignField: '_id',
            as: 'item'
          }
        },
        {
          $unwind: '$item'
        }
      ]);

      return trending;
    } catch (error) {
      console.error('Error fetching trending items:', error);
      return [];
    }
  }
}

module.exports = new UserBehaviorTracker();