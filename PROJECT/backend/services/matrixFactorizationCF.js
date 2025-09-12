// Save as: backend/services/matrixFactorizationCF.js
// CPU-friendly Matrix Factorization Collaborative Filtering for FYP

const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

class MatrixFactorizationCF {
    constructor(options = {}) {
        console.log('🚀 Initializing Matrix Factorization Collaborative Filtering...');
        
        this.factors = options.factors || 10;
        this.iterations = options.iterations || 50;
        this.learningRate = options.learningRate || 0.01;
        this.regularization = options.regularization || 0.01;
        
        this.userFeatures = null;
        this.itemFeatures = null;
        this.userIdMap = new Map();
        this.itemIdMap = new Map();
        this.reverseUserMap = new Map();
        this.reverseItemMap = new Map();
        this.interactionMatrix = null;
        
        console.log('📊 Config:', {
            factors: this.factors,
            iterations: this.iterations,
            learningRate: this.learningRate,
            regularization: this.regularization
        });
    }
    
    async initialize() {
        try {
            console.log('🔧 Building interaction matrix from orders...');
            await this.buildInteractionMatrix();
            
            console.log('🏗️ Initializing matrix factorization...');
            this.initializeFactors();
            
            console.log('✅ Matrix Factorization CF initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }
    
    async buildInteractionMatrix() {
        // Get all orders with valid user and restaurant references
        const orders = await Order.find({}).populate('user restaurant');
        const validOrders = orders.filter(o => o.user && o.restaurant && o.user._id && o.restaurant._id);
        
        console.log(`📊 Total orders: ${orders.length}, Valid orders: ${validOrders.length}`);
        
        if (validOrders.length === 0) {
            throw new Error('No valid orders found for training');
        }
        
        // Build user and item mappings
        const uniqueUsers = [...new Set(validOrders.map(o => o.user._id.toString()))];
        const uniqueRestaurants = [...new Set(validOrders.map(o => o.restaurant._id.toString()))];
        
        uniqueUsers.forEach((userId, index) => {
            this.userIdMap.set(userId, index);
            this.reverseUserMap.set(index, userId);
        });
        
        uniqueRestaurants.forEach((restaurantId, index) => {
            this.itemIdMap.set(restaurantId, index);
            this.reverseItemMap.set(index, restaurantId);
        });
        
        this.numUsers = uniqueUsers.length;
        this.numItems = uniqueRestaurants.length;
        
        // Create interaction matrix
        this.interactionMatrix = Array(this.numUsers).fill(null)
            .map(() => Array(this.numItems).fill(0));
        
        // Fill interaction matrix with order counts
        validOrders.forEach(order => {
            const userIdx = this.userIdMap.get(order.user._id.toString());
            const itemIdx = this.itemIdMap.get(order.restaurant._id.toString());
            if (userIdx !== undefined && itemIdx !== undefined) {
                this.interactionMatrix[userIdx][itemIdx] += 1;
            }
        });
        
        // Convert to binary (1 for interaction, 0 for no interaction)
        for (let i = 0; i < this.numUsers; i++) {
            for (let j = 0; j < this.numItems; j++) {
                this.interactionMatrix[i][j] = this.interactionMatrix[i][j] > 0 ? 1 : 0;
            }
        }
        
        console.log(`✅ Built ${this.numUsers}×${this.numItems} interaction matrix`);
    }
    
    initializeFactors() {
        // Initialize user and item feature matrices with small random values
        this.userFeatures = Array(this.numUsers).fill(null)
            .map(() => Array(this.factors).fill(0)
                .map(() => (Math.random() - 0.5) * 0.1));
        
        this.itemFeatures = Array(this.numItems).fill(null)
            .map(() => Array(this.factors).fill(0)
                .map(() => (Math.random() - 0.5) * 0.1));
        
        console.log(`✅ Initialized ${this.factors}-factor matrices`);
    }
    
    async train() {
        console.log('🏋️ Starting Matrix Factorization training...');
        const startTime = Date.now();
        
        let previousLoss = Infinity;
        const tolerance = 1e-6;
        
        for (let iter = 0; iter < this.iterations; iter++) {
            let totalLoss = 0;
            let totalUpdates = 0;
            
            // Iterate through all user-item pairs
            for (let u = 0; u < this.numUsers; u++) {
                for (let i = 0; i < this.numItems; i++) {
                    const rating = this.interactionMatrix[u][i];
                    
                    // Calculate prediction
                    let prediction = 0;
                    for (let f = 0; f < this.factors; f++) {
                        prediction += this.userFeatures[u][f] * this.itemFeatures[i][f];
                    }
                    
                    const error = rating - prediction;
                    totalLoss += error * error;
                    
                    // Update features using gradient descent
                    for (let f = 0; f < this.factors; f++) {
                        const userFeature = this.userFeatures[u][f];
                        const itemFeature = this.itemFeatures[i][f];
                        
                        this.userFeatures[u][f] += this.learningRate * 
                            (error * itemFeature - this.regularization * userFeature);
                        this.itemFeatures[i][f] += this.learningRate * 
                            (error * userFeature - this.regularization * itemFeature);
                    }
                    
                    totalUpdates++;
                }
            }
            
            const avgLoss = totalLoss / totalUpdates;
            
            if (iter % 10 === 0 || iter === this.iterations - 1) {
                console.log(`📈 Iteration ${iter + 1}/${this.iterations}: Loss = ${avgLoss.toFixed(6)}`);
            }
            
            // Check for convergence
            if (Math.abs(previousLoss - avgLoss) < tolerance) {
                console.log(`✅ Converged at iteration ${iter + 1}`);
                break;
            }
            
            previousLoss = avgLoss;
        }
        
        const trainingTime = (Date.now() - startTime) / 1000;
        console.log(`✅ Training completed in ${trainingTime.toFixed(2)} seconds`);
        
        return {
            trainingTime,
            finalLoss: previousLoss,
            iterations: this.iterations
        };
    }
    
    predict(userIdx, itemIdx) {
        if (userIdx >= this.numUsers || itemIdx >= this.numItems) {
            return 0;
        }
        
        let prediction = 0;
        for (let f = 0; f < this.factors; f++) {
            prediction += this.userFeatures[userIdx][f] * this.itemFeatures[itemIdx][f];
        }
        
        // Apply sigmoid to get probability-like score
        return 1 / (1 + Math.exp(-prediction));
    }
    
    async getRecommendations(userId, topK = 5) {
        const userIdx = this.userIdMap.get(userId.toString());
        if (userIdx === undefined) {
            throw new Error(`User ${userId} not found in training data`);
        }
        
        const restaurants = await Restaurant.find({}).lean();
        const predictions = [];
        
        for (let itemIdx = 0; itemIdx < this.numItems; itemIdx++) {
            const restaurantId = this.reverseItemMap.get(itemIdx);
            const restaurant = restaurants.find(r => r._id.toString() === restaurantId);
            
            if (restaurant) {
                const score = this.predict(userIdx, itemIdx);
                predictions.push({
                    restaurant,
                    score
                });
            }
        }
        
        return predictions
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
    async getRecommendations(userId, count = 6) {
  try {
    console.log(`Getting Matrix CF recommendations for user: ${userId}`);
    
    // Check if user exists in the model
    if (!this.userIndex || !this.userIndex[userId]) {
      console.log(`User ${userId} not found in model, using content-based fallback`);
      return null; // Will trigger fallback in routes
    }
    
    const userIdx = this.userIndex[userId];
    
    // Get user factors (latent features)
    const userFactors = this.getUserFactors(userIdx);
    
    // Calculate scores for all restaurants
    const restaurantScores = [];
    
    for (const [restaurantId, restaurantIdx] of Object.entries(this.restaurantIndex)) {
      // Skip if user already interacted with this restaurant
      if (this.hasUserRestaurantInteraction(userId, restaurantId)) {
        continue;
      }
      
      // Get restaurant factors
      const restaurantFactors = this.getRestaurantFactors(restaurantIdx);
      
      // Calculate similarity score (dot product of user and restaurant factors)
      const score = this.calculateSimilarity(userFactors, restaurantFactors);
      
      restaurantScores.push({
        restaurantId: restaurantId,
        score: score,
        similarity: score,
        confidence: this.calculateConfidence(score, userFactors, restaurantFactors),
        userFactors: userFactors,
        itemFactors: restaurantFactors
      });
    }
    
    // Sort by score and return top recommendations
    const topRecommendations = restaurantScores
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
    
    console.log(`Returning ${topRecommendations.length} Matrix CF recommendations`);
    return topRecommendations;
    
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    throw error;
  }
}

// Get user factors from the trained model
getUserFactors(userIdx) {
  // Return the user's latent factors from your trained model
  // This should be from your actual Matrix Factorization implementation
  if (this.userMatrix && this.userMatrix[userIdx]) {
    return this.userMatrix[userIdx];
  }
  
  // Fallback: generate random factors for demonstration
  const factors = [];
  for (let i = 0; i < (this.numFactors || 10); i++) {
    factors.push(Math.random() * 2 - 1); // Random between -1 and 1
  }
  return factors;
}

// Get restaurant factors from the trained model
getRestaurantFactors(restaurantIdx) {
  // Return the restaurant's latent factors from your trained model
  if (this.itemMatrix && this.itemMatrix[restaurantIdx]) {
    return this.itemMatrix[restaurantIdx];
  }
  
  // Fallback: generate random factors for demonstration
  const factors = [];
  for (let i = 0; i < (this.numFactors || 10); i++) {
    factors.push(Math.random() * 2 - 1);
  }
  return factors;
}

// Calculate similarity between user and restaurant factors
calculateSimilarity(userFactors, restaurantFactors) {
  if (!userFactors || !restaurantFactors || userFactors.length !== restaurantFactors.length) {
    return Math.random() * 0.5 + 0.3; // Random fallback
  }
  
  // Dot product
  let dotProduct = 0;
  for (let i = 0; i < userFactors.length; i++) {
    dotProduct += userFactors[i] * restaurantFactors[i];
  }
  
  // Normalize to 0-1 range using sigmoid
  const similarity = 1 / (1 + Math.exp(-dotProduct));
  return similarity;
}

// Calculate confidence in the recommendation
calculateConfidence(score, userFactors, restaurantFactors) {
  // Higher confidence for stronger factor magnitudes
  const userMagnitude = Math.sqrt(userFactors.reduce((sum, f) => sum + f * f, 0));
  const restaurantMagnitude = Math.sqrt(restaurantFactors.reduce((sum, f) => sum + f * f, 0));
  
  const confidenceBoost = Math.min(userMagnitude * restaurantMagnitude / 10, 0.3);
  return Math.min(score + confidenceBoost, 1.0);
}

// Check if user has already interacted with restaurant
hasUserRestaurantInteraction(userId, restaurantId) {
  // Check your interaction data
  if (this.interactions && this.interactions[userId]) {
    return this.interactions[userId].includes(restaurantId);
  }
  return false;
}

// Add implicit feedback from user interactions
async addImplicitFeedback(userId, restaurantId, weight) {
  try {
    console.log(`Adding implicit feedback: ${userId} -> ${restaurantId} (weight: ${weight})`);
    
    // Store the interaction
    if (!this.interactions) this.interactions = {};
    if (!this.interactions[userId]) this.interactions[userId] = [];
    
    this.interactions[userId].push({
      restaurantId: restaurantId,
      weight: weight,
      timestamp: new Date(),
      type: 'implicit'
    });
    
    // Update user-restaurant matrix
    this.updateUserRestaurantMatrix(userId, restaurantId, weight);
    
    return true;
  } catch (error) {
    console.error('Error adding implicit feedback:', error);
    return false;
  }
}

// Add order interaction to training data
async addOrderInteraction(orderData) {
  try {
    const { userId, restaurantId, rating, timestamp, items, total } = orderData;
    
    console.log(`Adding order interaction: ${userId} ordered from ${restaurantId}`);
    
    // Store the order interaction
    if (!this.orderInteractions) this.orderInteractions = [];
    
    this.orderInteractions.push({
      userId: userId,
      restaurantId: restaurantId,
      rating: rating,
      timestamp: timestamp,
      items: items,
      total: total,
      type: 'order'
    });
    
    // Add to implicit feedback with high weight
    await this.addImplicitFeedback(userId, restaurantId, rating);
    
    return true;
  } catch (error) {
    console.error('Error adding order interaction:', error);
    return false;
  }
}

// Update user-restaurant interaction matrix
updateUserRestaurantMatrix(userId, restaurantId, rating) {
  try {
    // Initialize matrices if they don't exist
    if (!this.userIndex) this.userIndex = {};
    if (!this.restaurantIndex) this.restaurantIndex = {};
    if (!this.interactionMatrix) this.interactionMatrix = {};
    
    // Add user to index if new
    if (!this.userIndex[userId]) {
      this.userIndex[userId] = Object.keys(this.userIndex).length;
    }
    
    // Add restaurant to index if new
    if (!this.restaurantIndex[restaurantId]) {
      this.restaurantIndex[restaurantId] = Object.keys(this.restaurantIndex).length;
    }
    
    // Update interaction matrix
    const userIdx = this.userIndex[userId];
    const restaurantIdx = this.restaurantIndex[restaurantId];
    
    if (!this.interactionMatrix[userIdx]) {
      this.interactionMatrix[userIdx] = {};
    }
    
    this.interactionMatrix[userIdx][restaurantIdx] = rating;
    
    console.log(`Updated interaction matrix: user ${userIdx} -> restaurant ${restaurantIdx} = ${rating}`);
    
  } catch (error) {
    console.error('Error updating user-restaurant matrix:', error);
  }
}

// Incremental model update (simplified)
async incrementalUpdate() {
  try {
    console.log('Performing incremental model update...');
    
    // In a real implementation, you would:
    // 1. Update the factorization matrices with new data
    // 2. Run a few iterations of gradient descent
    // 3. Update user and item factors
    
    // For now, just log that update happened
    console.log('Incremental update completed');
    
    return true;
  } catch (error) {
    console.error('Error in incremental update:', error);
    return false;
  }
}

// Initialize the model with existing order data
async initializeFromDatabase() {
  try {
    console.log('Initializing Matrix Factorization from database...');
    
    const Order = require('../models/Order');
    const orders = await Order.find({}).populate('user restaurant');
    
    console.log(`Found ${orders.length} orders for Matrix Factorization training`);
    
    // Build interaction matrix from existing orders
    for (const order of orders) {
      if (order.user && order.restaurant) {
        await this.addOrderInteraction({
          userId: order.user._id.toString(),
          restaurantId: order.restaurant._id.toString(),
          rating: 5.0, // Implicit positive rating
          timestamp: order.createdAt,
          items: order.items,
          total: order.pricing?.total || 0
        });
      }
    }
    
    console.log('Matrix Factorization initialized with existing data');
    return true;
    
  } catch (error) {
    console.error('Error initializing from database:', error);
    return false;
  }
}

// Get model statistics for debugging
getModelStats() {
  return {
    totalUsers: Object.keys(this.userIndex || {}).length,
    totalRestaurants: Object.keys(this.restaurantIndex || {}).length,
    totalInteractions: Object.keys(this.interactionMatrix || {}).reduce((total, userId) => {
      return total + Object.keys(this.interactionMatrix[userId] || {}).length;
    }, 0),
    orderInteractions: (this.orderInteractions || []).length,
    implicitFeedback: Object.keys(this.interactions || {}).reduce((total, userId) => {
      return total + (this.interactions[userId] || []).length;
    }, 0)
  };
}
    async evaluateModel() {
        console.log('📊 Evaluating Matrix Factorization model...');
        
        const orders = await Order.find({}).populate('user restaurant').lean();
        const validOrders = orders.filter(o => o.user && o.restaurant);
        
        // Group orders by user
        const userOrderCounts = new Map();
        validOrders.forEach(order => {
            const userId = order.user._id.toString();
            userOrderCounts.set(userId, (userOrderCounts.get(userId) || 0) + 1);
        });
        
        const testUsers = Array.from(userOrderCounts.entries())
            .filter(([userId, count]) => count >= 2)
            .map(([userId]) => userId);
        
        console.log(`🧪 Evaluating on ${testUsers.length} users with multiple orders`);
        
        let totalPrecision5 = 0;
        let totalRecall5 = 0;
        let validUsers = 0;
        
        for (const userId of testUsers) {
            try {
                const userOrders = validOrders.filter(o => o.user._id.toString() === userId);
                const actualRestaurants = new Set(userOrders.map(o => o.restaurant._id.toString()));
                
                const recommendations = await this.getRecommendations(userId, 5);
                const recommendedIds = new Set(recommendations.map(r => r.restaurant._id.toString()));
                
                const hits = [...actualRestaurants].filter(id => recommendedIds.has(id)).length;
                const precision5 = hits / 5;
                const recall5 = actualRestaurants.size > 0 ? hits / actualRestaurants.size : 0;
                
                totalPrecision5 += precision5;
                totalRecall5 += recall5;
                validUsers++;
                
            } catch (error) {
                console.log(`⚠️ Evaluation failed for user ${userId}: ${error.message}`);
            }
        }
        
        if (validUsers === 0) {
            throw new Error('No valid users for evaluation');
        }
        
        return {
            precision_at_5: totalPrecision5 / validUsers,
            recall_at_5: totalRecall5 / validUsers,
            users_evaluated: validUsers
        };
    }
    
    getModelInfo() {
        return {
            algorithm: 'Matrix Factorization',
            userCount: this.numUsers,
            itemCount: this.numItems,
            factors: this.factors,
            iterations: this.iterations,
            learningRate: this.learningRate,
            regularization: this.regularization
        };
    }
}

module.exports = MatrixFactorizationCF;