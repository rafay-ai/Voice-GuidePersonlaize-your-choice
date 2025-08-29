// backend/models/UserEmbedding.js
const mongoose = require('mongoose');

const UserEmbeddingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    embedding: {
        type: [Number],
        required: true,
        validate: {
            validator: function(v) {
                return v.length === 64; // 64-dimensional embedding as per NCF paper
            },
            message: 'Embedding must be 64-dimensional'
        }
    },
    modelVersion: {
        type: String,
        required: true,
        default: '1.0'
    },
    trainingEpoch: {
        type: Number,
        required: true,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    interactionCount: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    preferenceVector: {
        cuisine: [String],
        priceRange: String,
        avgOrderValue: Number,
        orderFrequency: Number,
        favoriteTimeSlots: [String]
    },
    coldStartScore: {
        type: Number,
        default: 1.0,
        min: 0,
        max: 1
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for efficient queries
UserEmbeddingSchema.index({ userId: 1 });
UserEmbeddingSchema.index({ lastUpdated: -1 });
UserEmbeddingSchema.index({ modelVersion: 1 });
UserEmbeddingSchema.index({ interactionCount: -1 });

// Virtual for embedding magnitude (useful for similarity calculations)
UserEmbeddingSchema.virtual('embeddingMagnitude').get(function() {
    if (!this.embedding || this.embedding.length === 0) return 0;
    return Math.sqrt(this.embedding.reduce((sum, val) => sum + val * val, 0));
});

// Method to calculate cosine similarity with another user
UserEmbeddingSchema.methods.cosineSimilarity = function(otherUserEmbedding) {
    if (!this.embedding || !otherUserEmbedding.embedding) return 0;
    if (this.embedding.length !== otherUserEmbedding.embedding.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < this.embedding.length; i++) {
        dotProduct += this.embedding[i] * otherUserEmbedding.embedding[i];
        magnitudeA += this.embedding[i] * this.embedding[i];
        magnitudeB += otherUserEmbedding.embedding[i] * otherUserEmbedding.embedding[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
};

// Method to update interaction statistics
UserEmbeddingSchema.methods.updateStats = async function(orders) {
    if (!orders || orders.length === 0) return;
    
    this.interactionCount = orders.length;
    
    const ratingsWithValues = orders.filter(order => order.rating && order.rating > 0);
    if (ratingsWithValues.length > 0) {
        this.averageRating = ratingsWithValues.reduce((sum, order) => sum + order.rating, 0) / ratingsWithValues.length;
    }
    
    // Update preference vector
    const cuisines = new Set();
    let totalOrderValue = 0;
    const timeSlots = new Set();
    const priceRanges = new Map();
    
    orders.forEach(order => {
        if (order.restaurant) {
            cuisines.add(order.restaurant.cuisine);
            if (order.restaurant.priceRange) {
                priceRanges.set(order.restaurant.priceRange, (priceRanges.get(order.restaurant.priceRange) || 0) + 1);
            }
        }
        
        if (order.total) {
            totalOrderValue += order.total;
        }
        
        if (order.createdAt) {
            const hour = new Date(order.createdAt).getHours();
            if (hour >= 6 && hour < 12) timeSlots.add('morning');
            else if (hour >= 12 && hour < 17) timeSlots.add('afternoon');
            else if (hour >= 17 && hour < 22) timeSlots.add('evening');
            else timeSlots.add('night');
        }
    });
    
    this.preferenceVector.cuisine = Array.from(cuisines);
    this.preferenceVector.avgOrderValue = totalOrderValue / orders.length;
    this.preferenceVector.orderFrequency = orders.length;
    this.preferenceVector.favoriteTimeSlots = Array.from(timeSlots);
    
    // Most common price range
    if (priceRanges.size > 0) {
        this.preferenceVector.priceRange = Array.from(priceRanges.entries())
            .reduce((max, current) => current[1] > max[1] ? current : max)[0];
    }
    
    // Update cold start score (decreases as user becomes more active)
    this.coldStartScore = Math.max(0, 1 - (this.interactionCount / 20));
    
    return this.save();
};

module.exports = mongoose.model('UserEmbedding', UserEmbeddingSchema);

// backend/models/RestaurantEmbedding.js
const RestaurantEmbeddingSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        unique: true
    },
    embedding: {
        type: [Number],
        required: true,
        validate: {
            validator: function(v) {
                return v.length === 64; // 64-dimensional embedding
            },
            message: 'Embedding must be 64-dimensional'
        }
    },
    modelVersion: {
        type: String,
        required: true,
        default: '1.0'
    },
    trainingEpoch: {
        type: Number,
        required: true,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    totalOrders: {
        type: Number,
        default: 0
    },
    uniqueCustomers: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    popularityScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    },
    contentFeatures: {
        cuisine: String,
        priceRange: String,
        deliveryTime: Number,
        averageOrderValue: Number,
        peakHours: [String],
        topMenuCategories: [String]
    },
    coldStartScore: {
        type: Number,
        default: 1.0,
        min: 0,
        max: 1
    },
    clusterAssignment: {
        type: Number,
        default: -1 // -1 means not assigned to any cluster
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
RestaurantEmbeddingSchema.index({ restaurantId: 1 });
RestaurantEmbeddingSchema.index({ lastUpdated: -1 });
RestaurantEmbeddingSchema.index({ modelVersion: 1 });
RestaurantEmbeddingSchema.index({ popularityScore: -1 });
RestaurantEmbeddingSchema.index({ totalOrders: -1 });
RestaurantEmbeddingSchema.index({ clusterAssignment: 1 });

// Virtual for embedding magnitude
RestaurantEmbeddingSchema.virtual('embeddingMagnitude').get(function() {
    if (!this.embedding || this.embedding.length === 0) return 0;
    return Math.sqrt(this.embedding.reduce((sum, val) => sum + val * val, 0));
});

// Method to calculate similarity with another restaurant
RestaurantEmbeddingSchema.methods.cosineSimilarity = function(otherRestaurantEmbedding) {
    if (!this.embedding || !otherRestaurantEmbedding.embedding) return 0;
    if (this.embedding.length !== otherRestaurantEmbedding.embedding.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < this.embedding.length; i++) {
        dotProduct += this.embedding[i] * otherRestaurantEmbedding.embedding[i];
        magnitudeA += this.embedding[i] * this.embedding[i];
        magnitudeB += otherRestaurantEmbedding.embedding[i] * otherRestaurantEmbedding.embedding[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
};

// Method to find similar restaurants
RestaurantEmbeddingSchema.methods.findSimilar = async function(limit = 5) {
    const RestaurantEmbedding = this.constructor;
    
    const allRestaurants = await RestaurantEmbedding.find({
        _id: { $ne: this._id },
        modelVersion: this.modelVersion
    }).limit(100); // Limit search space for performance
    
    const similarities = allRestaurants.map(restaurant => ({
        restaurant: restaurant,
        similarity: this.cosineSimilarity(restaurant)
    })).filter(item => item.similarity > 0.1) // Only include meaningful similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    return similarities;
};

// Method to update restaurant statistics
RestaurantEmbeddingSchema.methods.updateStats = async function(orders, restaurant) {
    if (!orders) orders = [];
    
    this.totalOrders = orders.length;
    this.uniqueCustomers = new Set(orders.map(order => order.userId?.toString())).size;
    
    const ratingsWithValues = orders.filter(order => order.rating && order.rating > 0);
    if (ratingsWithValues.length > 0) {
        this.averageRating = ratingsWithValues.reduce((sum, order) => sum + order.rating, 0) / ratingsWithValues.length;
    }
    
    // Calculate popularity score (normalized)
    const maxOrders = 1000; // Adjust based on your data
    this.popularityScore = Math.min(this.totalOrders / maxOrders, 1);
    
    // Update content features
    if (restaurant) {
        this.contentFeatures.cuisine = restaurant.cuisine;
        this.contentFeatures.priceRange = restaurant.priceRange;
        this.contentFeatures.deliveryTime = restaurant.deliveryTime;
    }
    
    if (orders.length > 0) {
        // Calculate average order value
        const ordersWithValue = orders.filter(order => order.total);
        if (ordersWithValue.length > 0) {
            this.contentFeatures.averageOrderValue = 
                ordersWithValue.reduce((sum, order) => sum + order.total, 0) / ordersWithValue.length;
        }
        
        // Find peak hours
        const hourCounts = new Map();
        orders.forEach(order => {
            if (order.createdAt) {
                const hour = new Date(order.createdAt).getHours();
                hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
            }
        });
        
        const peakHours = Array.from(hourCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour]) => {
                if (hour >= 6 && hour < 12) return 'morning';
                else if (hour >= 12 && hour < 17) return 'afternoon';
                else if (hour >= 17 && hour < 22) return 'evening';
                else return 'night';
            });
        
        this.contentFeatures.peakHours = [...new Set(peakHours)];
    }
    
    // Update cold start score
    this.coldStartScore = Math.max(0, 1 - (this.totalOrders / 50));
    
    return this.save();
};

// Static method to find restaurants by cluster
RestaurantEmbeddingSchema.statics.findByCluster = function(clusterId, limit = 10) {
    return this.find({ clusterAssignment: clusterId })
        .populate('restaurantId')
        .sort({ popularityScore: -1 })
        .limit(limit);
};

module.exports = mongoose.model('RestaurantEmbedding', RestaurantEmbeddingSchema);

// backend/models/RecommendationLog.js
const RecommendationLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    recommendationType: {
        type: String,
        enum: ['neural-collaborative-filtering', 'content-based', 'popularity-based', 'cold-start'],
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    rank: {
        type: Number,
        required: true,
        min: 1
    },
    modelVersion: {
        type: String,
        required: true
    },
    contextFeatures: {
        timeOfDay: String,
        dayOfWeek: String,
        userInteractionCount: Number,
        restaurantPopularity: Number,
        isNewUser: Boolean,
        isNewRestaurant: Boolean
    },
    userFeedback: {
        clicked: {
            type: Boolean,
            default: false
        },
        ordered: {
            type: Boolean,
            default: false
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        dismissed: {
            type: Boolean,
            default: false
        },
        feedbackTimestamp: Date
    },
    sessionId: String,
    requestMetadata: {
        userAgent: String,
        ipAddress: String,
        requestTimestamp: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

// Indexes for analytics and performance
RecommendationLogSchema.index({ userId: 1, createdAt: -1 });
RecommendationLogSchema.index({ restaurantId: 1, createdAt: -1 });
RecommendationLogSchema.index({ recommendationType: 1, createdAt: -1 });
RecommendationLogSchema.index({ modelVersion: 1, createdAt: -1 });
RecommendationLogSchema.index({ 'userFeedback.clicked': 1, createdAt: -1 });
RecommendationLogSchema.index({ 'userFeedback.ordered': 1, createdAt: -1 });
RecommendationLogSchema.index({ sessionId: 1 });

// Method to record user feedback
RecommendationLogSchema.methods.recordFeedback = function(feedbackData) {
    this.userFeedback.clicked = feedbackData.clicked || false;
    this.userFeedback.ordered = feedbackData.ordered || false;
    this.userFeedback.rating = feedbackData.rating || this.userFeedback.rating;
    this.userFeedback.dismissed = feedbackData.dismissed || false;
    this.userFeedback.feedbackTimestamp = new Date();
    
    return this.save();
};

// Static method to get recommendation performance metrics
RecommendationLogSchema.statics.getPerformanceMetrics = async function(modelVersion, dateRange = {}) {
    const startDate = dateRange.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const endDate = dateRange.endDate || new Date();
    
    const pipeline = [
        {
            $match: {
                modelVersion: modelVersion,
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$recommendationType',
                totalRecommendations: { $sum: 1 },
                totalClicks: { $sum: { $cond: ['$userFeedback.clicked', 1, 0] } },
                totalOrders: { $sum: { $cond: ['$userFeedback.ordered', 1, 0] } },
                totalDismissals: { $sum: { $cond: ['$userFeedback.dismissed', 1, 0] } },
                avgScore: { $avg: '$score' },
                avgRating: { $avg: '$userFeedback.rating' }
            }
        },
        {
            $project: {
                _id: 1,
                totalRecommendations: 1,
                totalClicks: 1,
                totalOrders: 1,
                totalDismissals: 1,
                clickThroughRate: { $divide: ['$totalClicks', '$totalRecommendations'] },
                conversionRate: { $divide: ['$totalOrders', '$totalRecommendations'] },
                dismissalRate: { $divide: ['$totalDismissals', '$totalRecommendations'] },
                avgScore: 1,
                avgRating: 1
            }
        }
    ];
    
    return this.aggregate(pipeline);
};

module.exports = mongoose.model('RecommendationLog', RecommendationLogSchema);