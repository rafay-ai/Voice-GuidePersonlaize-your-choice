// backend/models/User.js - ENHANCED USER MODEL WITH PERSISTENT PREFERENCES
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: {
      type: String,
      default: ''
    },
    area: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: 'Karachi'
    },
    zipCode: {
      type: String,
      default: ''
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [67.0011, 24.8607] // Default Karachi coordinates
      }
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'rider', 'restaurant_owner'],
    default: 'user'
  },
  
  // ===== ENHANCED PREFERENCES SYSTEM =====
  preferences: {
    // Basic food preferences
    favoriteRestaurants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    }],
    dietaryRestrictions: {
      type: [String],
      enum: ['halal', 'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'keto'],
      default: ['halal']
    },
    preferredCuisines: {
      type: [String],
      default: []
    },
    
    // Spice and taste preferences
    spiceLevel: {
      type: String,
      enum: ['Mild', 'Medium', 'Spicy', 'Very Spicy'],
      default: 'Medium'
    },
    sweetTooth: {
      type: Boolean,
      default: false
    },
    
    // Order behavior analytics
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastOrderDate: {
      type: Date,
      default: null
    },
    mostOrderedCuisine: {
      type: String,
      default: ''
    },
    
    // Time-based preferences
    preferredOrderTimes: {
      breakfast: {
        type: Boolean,
        default: false
      },
      lunch: {
        type: Boolean,
        default: true
      },
      dinner: {
        type: Boolean,
        default: true
      },
      lateNight: {
        type: Boolean,
        default: false
      }
    },
    
    // Budget preferences
    budgetRange: {
      min: {
        type: Number,
        default: 200
      },
      max: {
        type: Number,
        default: 2000
      }
    },
    
    // Delivery preferences
    preferredDeliveryTime: {
      type: String,
      enum: ['ASAP', '30-45 mins', '1 hour', '1-2 hours'],
      default: 'ASAP'
    },
    
    // Communication preferences
    notifications: {
      orderUpdates: {
        type: Boolean,
        default: true
      },
      promotions: {
        type: Boolean,
        default: true
      },
      newRestaurants: {
        type: Boolean,
        default: false
      },
      weeklyDeals: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // ===== ORDER HISTORY TRACKING =====
  orderHistory: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    },
    restaurantName: String,
    orderDate: {
      type: Date,
      default: Date.now
    },
    totalAmount: Number,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  
  // ===== LOYALTY SYSTEM =====
  loyaltyStatus: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze'
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  
  // ===== SOCIAL FEATURES =====
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // ===== ACCOUNT STATUS =====
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  
  // ===== DEVICE AND SESSION INFO =====
  fcmToken: String, // For push notifications
  lastLogin: {
    type: Date,
    default: Date.now
  },
  deviceInfo: {
    platform: String,
    version: String,
    model: String
  }
}, {
  timestamps: true
});

// ===== INDEXES FOR PERFORMANCE =====
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'address.coordinates': '2dsphere' });
userSchema.index({ loyaltyStatus: 1 });
userSchema.index({ isActive: 1 });

// ===== PRE-SAVE MIDDLEWARE =====
userSchema.pre('save', async function(next) {
  try {
    // Hash password if modified
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ===== INSTANCE METHODS =====

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Add order to history with analytics update
userSchema.methods.addOrderToHistory = async function(orderData) {
  try {
    // Add to order history
    this.orderHistory.unshift({
      orderId: orderData.orderId,
      restaurantId: orderData.restaurantId,
      restaurantName: orderData.restaurantName,
      totalAmount: orderData.total,
      orderDate: new Date()
    });
    
    // Keep only last 50 orders in history
    if (this.orderHistory.length > 50) {
      this.orderHistory = this.orderHistory.slice(0, 50);
    }
    
    // Update order analytics
    this.preferences.totalOrders += 1;
    this.preferences.totalSpent += orderData.total;
    this.preferences.averageOrderValue = this.preferences.totalSpent / this.preferences.totalOrders;
    this.preferences.lastOrderDate = new Date();
    
    // Update loyalty points (1 point per 100 PKR spent)
    const pointsEarned = Math.floor(orderData.total / 100);
    this.loyaltyPoints += pointsEarned;
    
    // Update loyalty status
    this.updateLoyaltyStatus();
    
    await this.save();
    
    console.log(`✅ Order history updated for user ${this.name}:`, {
      totalOrders: this.preferences.totalOrders,
      totalSpent: this.preferences.totalSpent,
      loyaltyPoints: this.loyaltyPoints,
      loyaltyStatus: this.loyaltyStatus
    });
    
  } catch (error) {
    console.error('Error adding order to history:', error);
    throw error;
  }
};

// Update loyalty status based on total spent
userSchema.methods.updateLoyaltyStatus = function() {
  const totalSpent = this.preferences.totalSpent;
  
  if (totalSpent >= 50000) {
    this.loyaltyStatus = 'Platinum';
  } else if (totalSpent >= 25000) {
    this.loyaltyStatus = 'Gold';
  } else if (totalSpent >= 10000) {
    this.loyaltyStatus = 'Silver';
  } else {
    this.loyaltyStatus = 'Bronze';
  }
};

// Get user's favorite cuisines based on order history
userSchema.methods.getFavoriteCuisines = async function() {
  try {
    const Order = require('./Order');
    
    const orders = await Order.find({ user: this._id })
      .populate('restaurant', 'cuisine')
      .limit(20);
    
    const cuisineCount = {};
    
    orders.forEach(order => {
      if (order.restaurant && order.restaurant.cuisine) {
        order.restaurant.cuisine.forEach(cuisine => {
          cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1;
        });
      }
    });
    
    return Object.entries(cuisineCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cuisine]) => cuisine);
      
  } catch (error) {
    console.error('Error getting favorite cuisines:', error);
    return [];
  }
};

// Update user's preferred cuisines automatically
userSchema.methods.updatePreferredCuisines = async function() {
  try {
    const favoriteCuisines = await this.getFavoriteCuisines();
    
    if (favoriteCuisines.length > 0) {
      this.preferences.preferredCuisines = favoriteCuisines;
      this.preferences.mostOrderedCuisine = favoriteCuisines[0];
      await this.save();
    }
    
  } catch (error) {
    console.error('Error updating preferred cuisines:', error);
  }
};

// Get personalized restaurant recommendations
userSchema.methods.getPersonalizedRecommendations = async function(limit = 5) {
  try {
    const Restaurant = require('./Restaurant');
    
    let recommendations = [];
    
    // First priority: Restaurants serving preferred cuisines
    if (this.preferences.preferredCuisines.length > 0) {
      recommendations = await Restaurant.find({
        isActive: true,
        cuisine: { $in: this.preferences.preferredCuisines },
        _id: { $nin: this.preferences.favoriteRestaurants }
      }).limit(limit);
    }
    
    // If not enough recommendations, add highly rated restaurants
    if (recommendations.length < limit) {
      const additionalRestaurants = await Restaurant.find({
        isActive: true,
        rating: { $gte: 4.0 },
        _id: { 
          $nin: [
            ...this.preferences.favoriteRestaurants,
            ...recommendations.map(r => r._id)
          ]
        }
      }).limit(limit - recommendations.length);
      
      recommendations = [...recommendations, ...additionalRestaurants];
    }
    
    return recommendations;
    
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
};

// ===== STATIC METHODS =====

// Find users by location
userSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Get user engagement analytics
userSchema.statics.getEngagementAnalytics = async function() {
  try {
    const totalUsers = await this.countDocuments({ isActive: true });
    const activeUsers = await this.countDocuments({
      isActive: true,
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    const loyaltyDistribution = await this.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$loyaltyStatus', count: { $sum: 1 } } }
    ]);
    
    return {
      totalUsers,
      activeUsers,
      retentionRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0,
      loyaltyDistribution
    };
    
  } catch (error) {
    console.error('Error getting engagement analytics:', error);
    return null;
  }
};

module.exports = mongoose.model('User', userSchema);