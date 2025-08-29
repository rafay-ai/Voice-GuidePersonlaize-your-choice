// backend/services/interactionMatrix.js
const _ = require('lodash');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

class InteractionMatrixBuilder {
    constructor() {
        this.userIdMap = new Map();
        this.itemIdMap = new Map();
        this.reverseUserMap = new Map();
        this.reverseItemMap = new Map();
        this.interactionMatrix = null;
        this.sparsityRate = 0;
    }

    async buildMappings() {
        console.log('Building user and item ID mappings...');
        
        // Get all users and restaurants
        const users = await User.find({}, '_id').lean();
        const restaurants = await Restaurant.find({}, '_id').lean();

        // Create mappings
        users.forEach((user, index) => {
            const userId = user._id.toString();
            this.userIdMap.set(userId, index);
            this.reverseUserMap.set(index, userId);
        });

        restaurants.forEach((restaurant, index) => {
            const restaurantId = restaurant._id.toString();
            this.itemIdMap.set(restaurantId, index);
            this.reverseItemMap.set(index, restaurantId);
        });

        console.log(`Mapped ${users.length} users and ${restaurants.length} restaurants`);
        return {
            numUsers: users.length,
            numItems: restaurants.length
        };
    }

    async extractInteractions() {
        console.log('Extracting user-item interactions from orders...');
        
        const orders = await Order.find({})
            .populate('user', '_id')
            .populate('restaurant', '_id')
            .lean();

        const interactions = new Map();
        const userItemCounts = new Map();

        orders.forEach(order => {
            if (order.user && order.restaurant) {
                const userId = order.user._id.toString();
                const restaurantId = order.restaurant._id.toString();
                const key = `${userId}_${restaurantId}`;

                // Count interactions between user and restaurant
                const currentCount = userItemCounts.get(key) || 0;
                userItemCounts.set(key, currentCount + 1);

                // Store interaction details
                if (!interactions.has(key)) {
                    interactions.set(key, {
                        userId: userId,
                        restaurantId: restaurantId,
                        userIdx: this.userIdMap.get(userId),
                        itemIdx: this.itemIdMap.get(restaurantId),
                        count: 0,
                        firstOrderDate: order.createdAt,
                        lastOrderDate: order.createdAt,
                        totalSpent: 0,
                        avgRating: 0
                    });
                }

                const interaction = interactions.get(key);
                interaction.count = userItemCounts.get(key);
                interaction.totalSpent += order.total || 0;
                
                if (order.rating) {
                    interaction.avgRating = (interaction.avgRating + order.rating) / 2;
                }
                
                if (order.createdAt > interaction.lastOrderDate) {
                    interaction.lastOrderDate = order.createdAt;
                }
            }
        });

        console.log(`Extracted ${interactions.size} unique user-restaurant interactions`);
        return Array.from(interactions.values());
    }

    calculateImplicitRating(interaction) {
        // Convert interaction data to implicit rating (0-1)
        let rating = 0;

        // Frequency component (more orders = higher rating)
        const frequencyScore = Math.min(interaction.count / 10, 1) * 0.4;

        // Recency component (recent orders = higher rating)
        const daysSinceLastOrder = (Date.now() - interaction.lastOrderDate) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, (30 - daysSinceLastOrder) / 30) * 0.3;

        // Spending component (higher spending = higher rating)
        const avgSpending = interaction.totalSpent / interaction.count;
        const spendingScore = Math.min(avgSpending / 2000, 1) * 0.2; // Normalize to PKR 2000

        // Explicit rating component if available
        const explicitScore = interaction.avgRating > 0 ? (interaction.avgRating / 5) * 0.1 : 0;

        rating = frequencyScore + recencyScore + spendingScore + explicitScore;
        return Math.min(rating, 1);
    }

    async buildSparseMatrix() {
        const { numUsers, numItems } = await this.buildMappings();
        const interactions = await this.extractInteractions();

        // Initialize sparse matrix representation
        const matrix = {
            numUsers: numUsers,
            numItems: numItems,
            data: new Map(), // key: "userIdx_itemIdx", value: rating
            userItems: new Map(), // key: userIdx, value: Set of itemIdx
            itemUsers: new Map(), // key: itemIdx, value: Set of userIdx
            positiveInteractions: [],
            statistics: {
                totalInteractions: 0,
                avgInteractionsPerUser: 0,
                avgInteractionsPerItem: 0,
                sparsityRate: 0
            }
        };

        // Initialize user and item maps
        for (let i = 0; i < numUsers; i++) {
            matrix.userItems.set(i, new Set());
        }
        for (let i = 0; i < numItems; i++) {
            matrix.itemUsers.set(i, new Set());
        }

        // Fill matrix with interaction data
        interactions.forEach(interaction => {
            if (interaction.userIdx !== undefined && interaction.itemIdx !== undefined) {
                const rating = this.calculateImplicitRating(interaction);
                const key = `${interaction.userIdx}_${interaction.itemIdx}`;
                
                matrix.data.set(key, {
                    rating: rating,
                    count: interaction.count,
                    lastOrder: interaction.lastOrderDate,
                    totalSpent: interaction.totalSpent,
                    originalUserId: interaction.userId,
                    originalRestaurantId: interaction.restaurantId
                });

                matrix.userItems.get(interaction.userIdx).add(interaction.itemIdx);
                matrix.itemUsers.get(interaction.itemIdx).add(interaction.userIdx);

                // Store as positive interaction if rating > threshold
                if (rating > 0.3) {
                    matrix.positiveInteractions.push({
                        userIdx: interaction.userIdx,
                        itemIdx: interaction.itemIdx,
                        rating: rating,
                        userId: interaction.userId,
                        restaurantId: interaction.restaurantId
                    });
                }
            }
        });

        // Calculate statistics
        matrix.statistics.totalInteractions = matrix.data.size;
        matrix.statistics.avgInteractionsPerUser = matrix.data.size / numUsers;
        matrix.statistics.avgInteractionsPerItem = matrix.data.size / numItems;
        matrix.statistics.sparsityRate = 1 - (matrix.data.size / (numUsers * numItems));

        this.interactionMatrix = matrix;
        this.sparsityRate = matrix.statistics.sparsityRate;

        console.log('Interaction Matrix Statistics:');
        console.log(`- Total Users: ${numUsers}`);
        console.log(`- Total Restaurants: ${numItems}`);
        console.log(`- Total Interactions: ${matrix.statistics.totalInteractions}`);
        console.log(`- Sparsity Rate: ${(matrix.statistics.sparsityRate * 100).toFixed(2)}%`);
        console.log(`- Avg Interactions per User: ${matrix.statistics.avgInteractionsPerUser.toFixed(2)}`);
        console.log(`- Avg Interactions per Restaurant: ${matrix.statistics.avgInteractionsPerItem.toFixed(2)}`);

        return matrix;
    }

    async getUserInteractionHistory(userId) {
        if (!this.interactionMatrix) {
            await this.buildSparseMatrix();
        }

        const userIdx = this.userIdMap.get(userId.toString());
        if (userIdx === undefined) {
            return [];
        }

        const userItems = this.interactionMatrix.userItems.get(userIdx) || new Set();
        const history = [];

        userItems.forEach(itemIdx => {
            const key = `${userIdx}_${itemIdx}`;
            const interaction = this.interactionMatrix.data.get(key);
            if (interaction) {
                history.push({
                    restaurantId: interaction.originalRestaurantId,
                    rating: interaction.rating,
                    count: interaction.count,
                    totalSpent: interaction.totalSpent,
                    lastOrder: interaction.lastOrder
                });
            }
        });

        return history.sort((a, b) => b.rating - a.rating);
    }

    async getRestaurantUserBase(restaurantId) {
        if (!this.interactionMatrix) {
            await this.buildSparseMatrix();
        }

        const itemIdx = this.itemIdMap.get(restaurantId.toString());
        if (itemIdx === undefined) {
            return [];
        }

        const itemUsers = this.interactionMatrix.itemUsers.get(itemIdx) || new Set();
        const userBase = [];

        itemUsers.forEach(userIdx => {
            const key = `${userIdx}_${itemIdx}`;
            const interaction = this.interactionMatrix.data.get(key);
            if (interaction) {
                userBase.push({
                    userId: interaction.originalUserId,
                    rating: interaction.rating,
                    count: interaction.count,
                    totalSpent: interaction.totalSpent,
                    lastOrder: interaction.lastOrder
                });
            }
        });

        return userBase.sort((a, b) => b.rating - a.rating);
    }

    async findSimilarUsers(userId, topK = 10) {
        if (!this.interactionMatrix) {
            await this.buildSparseMatrix();
        }

        const userIdx = this.userIdMap.get(userId.toString());
        if (userIdx === undefined) {
            return [];
        }

        const targetUserItems = this.interactionMatrix.userItems.get(userIdx);
        if (!targetUserItems || targetUserItems.size === 0) {
            return [];
        }

        const similarities = [];

        // Calculate Jaccard similarity with all other users
        for (let otherUserIdx = 0; otherUserIdx < this.interactionMatrix.numUsers; otherUserIdx++) {
            if (otherUserIdx !== userIdx) {
                const otherUserItems = this.interactionMatrix.userItems.get(otherUserIdx);
                if (otherUserItems && otherUserItems.size > 0) {
                    // Calculate Jaccard similarity
                    const intersection = new Set([...targetUserItems].filter(x => otherUserItems.has(x)));
                    const union = new Set([...targetUserItems, ...otherUserItems]);
                    const similarity = intersection.size / union.size;

                    if (similarity > 0) {
                        similarities.push({
                            userId: this.reverseUserMap.get(otherUserIdx),
                            userIdx: otherUserIdx,
                            similarity: similarity,
                            commonItems: intersection.size
                        });
                    }
                }
            }
        }

        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    async getMatrixForTraining() {
        if (!this.interactionMatrix) {
            await this.buildSparseMatrix();
        }

        return {
            matrix: this.interactionMatrix,
            userIdMap: this.userIdMap,
            itemIdMap: this.itemIdMap,
            reverseUserMap: this.reverseUserMap,
            reverseItemMap: this.reverseItemMap
        };
    }

    async exportForAnalysis() {
        if (!this.interactionMatrix) {
            await this.buildSparseMatrix();
        }

        return {
            statistics: this.interactionMatrix.statistics,
            sampleInteractions: Array.from(this.interactionMatrix.data.entries()).slice(0, 10),
            userDistribution: this.getUserInteractionDistribution(),
            itemDistribution: this.getItemInteractionDistribution()
        };
    }

    getUserInteractionDistribution() {
        const distribution = {};
        this.interactionMatrix.userItems.forEach((items, userIdx) => {
            const count = items.size;
            distribution[count] = (distribution[count] || 0) + 1;
        });
        return distribution;
    }

    getItemInteractionDistribution() {
        const distribution = {};
        this.interactionMatrix.itemUsers.forEach((users, itemIdx) => {
            const count = users.size;
            distribution[count] = (distribution[count] || 0) + 1;
        });
        return distribution;
    }
}

module.exports = InteractionMatrixBuilder;