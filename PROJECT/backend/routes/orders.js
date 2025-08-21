// backend/routes/orders.js - COMPLETE ORDER SYSTEM WITH USER INTEGRATION
const express = require('express');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const router = express.Router();

// ===== PLACE ORDER WITH USER INTEGRATION =====
router.post('/place-order', async (req, res) => {
  try {
    const { userId, restaurantId, items, deliveryAddress, paymentMethod, specialInstructions } = req.body;
    
    console.log('📦 Enhanced order placement:', { userId, restaurantId, itemsCount: items?.length });
    
    // Validation
    if (!userId || !restaurantId || !items || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Find user and restaurant
    const [user, restaurant] = await Promise.all([
      User.findById(userId),
      Restaurant.findById(restaurantId)
    ]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Process order items
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (menuItem) {
        const itemTotal = menuItem.price * item.quantity;
        subtotal += itemTotal;
        
        orderItems.push({
          menuItem: menuItem._id,
          quantity: item.quantity,
          price: menuItem.price,
          specialInstructions: item.specialInstructions || ''
        });
      }
    }
    
    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid menu items found'
      });
    }
    
    const deliveryFee = restaurant.deliveryFee || 50;
    const total = subtotal + deliveryFee;
    
    // Create order
    const order = new Order({
      user: userId,
      restaurant: restaurantId,
      items: orderItems,
      deliveryAddress: {
        ...deliveryAddress,
        coordinates: {
          type: 'Point',
          coordinates: [
            deliveryAddress.longitude || 67.0011,
            deliveryAddress.latitude || 24.8607
          ]
        }
      },
      paymentMethod: paymentMethod || 'Cash on Delivery',
      specialInstructions: specialInstructions || '',
      pricing: {
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        tax: 0,
        total: total
      },
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60000)
    });
    
    await order.save();
    
    // ===== UPDATE USER PREFERENCES AND BEHAVIORAL DATA =====
    await updateUserPreferencesAfterOrder(user, restaurant, order, orderItems);
    
    // Populate order for response
    await order.populate(['restaurant', 'items.menuItem', 'user']);
    
    console.log('✅ Enhanced order created:', order.orderNumber);
    
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: order,
      user: {
        totalOrders: user.preferences.totalOrders,
        totalSpent: user.preferences.totalSpent,
        averageOrderValue: user.preferences.averageOrderValue,
        loyaltyStatus: user.loyaltyStatus
      }
    });
    
  } catch (error) {
    console.error('💥 Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error placing order',
      error: error.message
    });
  }
});

// ===== FUNCTION TO UPDATE USER PREFERENCES AFTER ORDER =====
async function updateUserPreferencesAfterOrder(user, restaurant, order, orderItems) {
  try {
    console.log('🔧 Updating user preferences after order...');
    
    // Update order statistics
    user.preferences.totalOrders = (user.preferences.totalOrders || 0) + 1;
    user.preferences.totalSpent = (user.preferences.totalSpent || 0) + order.pricing.total;
    user.preferences.averageOrderValue = user.preferences.totalSpent / user.preferences.totalOrders;
    user.preferences.lastOrderDate = new Date();
    
    // Add restaurant to favorites if ordered frequently
    if (!user.preferences.favoriteRestaurants.includes(restaurant._id)) {
      // Count how many times user ordered from this restaurant
      const Order = require('../models/Order');
      const orderCount = await Order.countDocuments({
        user: user._id,
        restaurant: restaurant._id
      });
      
      // Add to favorites if ordered 3+ times
      if (orderCount >= 3) {
        user.preferences.favoriteRestaurants.push(restaurant._id);
      }
    }
    
    // Update preferred cuisines
    if (restaurant.cuisine && restaurant.cuisine.length > 0) {
      if (!user.preferences.preferredCuisines) {
        user.preferences.preferredCuisines = [];
      }
      
      restaurant.cuisine.forEach(cuisine => {
        if (!user.preferences.preferredCuisines.includes(cuisine)) {
          user.preferences.preferredCuisines.push(cuisine);
        }
      });
      
      // Update most ordered cuisine
      const cuisineCount = await calculateUserCuisineFrequency(user._id);
      if (cuisineCount.length > 0) {
        user.preferences.mostOrderedCuisine = cuisineCount[0].cuisine;
      }
    }
    
    // Update loyalty status based on total spent
    const totalSpent = user.preferences.totalSpent;
    if (totalSpent >= 50000) {
      user.loyaltyStatus = 'Platinum';
    } else if (totalSpent >= 25000) {
      user.loyaltyStatus = 'Gold';
    } else if (totalSpent >= 10000) {
      user.loyaltyStatus = 'Silver';
    } else if (totalSpent >= 2000) {
      user.loyaltyStatus = 'Bronze';
    }
    
    await user.save();
    console.log('✅ User preferences updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating user preferences:', error);
  }
}

// ===== HELPER FUNCTION TO CALCULATE CUISINE FREQUENCY =====
async function calculateUserCuisineFrequency(userId) {
  try {
    const Order = require('../models/Order');
    
    const orders = await Order.find({ user: userId })
      .populate('restaurant')
      .select('restaurant');
    
    const cuisineCount = {};
    
    orders.forEach(order => {
      if (order.restaurant && order.restaurant.cuisine) {
        order.restaurant.cuisine.forEach(cuisine => {
          cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1;
        });
      }
    });
    
    return Object.entries(cuisineCount)
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count);
      
  } catch (error) {
    console.error('Error calculating cuisine frequency:', error);
    return [];
  }
}

// ===== GET USER'S ORDERS =====
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, page = 1, status } = req.query;
    
    const query = { user: userId };
    if (status) {
      query.orderStatus = status;
    }
    
    const orders = await Order.find(query)
      .populate('restaurant')
      .populate('items.menuItem')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalOrders = await Order.countDocuments(query);
    
    res.json({
      success: true,
      count: orders.length,
      totalOrders: totalOrders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / parseInt(limit)),
      orders: orders
    });
    
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// ===== GET SINGLE ORDER =====
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('restaurant')
      .populate('items.menuItem')
      .populate('user', 'name email phone');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order: order
    });
    
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
});

// ===== UPDATE ORDER STATUS =====
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update order status
    order.orderStatus = status;
    
    // Add to status history
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      note: note || `Order status updated to ${status}`
    });
    
    // Set delivery time if delivered
    if (status === 'Delivered') {
      order.actualDeliveryTime = new Date();
    }
    
    await order.save();
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: order
    });
    
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
});

// ===== REORDER PREVIOUS ORDER =====
router.post('/reorder/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryAddress, paymentMethod, specialInstructions } = req.body;
    
    const previousOrder = await Order.findById(orderId)
      .populate('restaurant')
      .populate('items.menuItem');
    
    if (!previousOrder) {
      return res.status(404).json({
        success: false,
        message: 'Previous order not found'
      });
    }
    
    // Check if restaurant is still active
    if (!previousOrder.restaurant.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant is no longer available'
      });
    }
    
    // Check if menu items are still available
    const availableItems = [];
    let subtotal = 0;
    
    for (const item of previousOrder.items) {
      if (item.menuItem.isAvailable) {
        availableItems.push({
          menuItem: item.menuItem._id,
          quantity: item.quantity,
          price: item.menuItem.price, // Use current price
          specialInstructions: item.specialInstructions
        });
        subtotal += item.menuItem.price * item.quantity;
      }
    }
    
    if (availableItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the items from your previous order are available'
      });
    }
    
    const deliveryFee = previousOrder.restaurant.deliveryFee || 50;
    const total = subtotal + deliveryFee;
    
    // Create new order
    const newOrder = new Order({
      user: previousOrder.user,
      restaurant: previousOrder.restaurant._id,
      items: availableItems,
      deliveryAddress: deliveryAddress || previousOrder.deliveryAddress,
      paymentMethod: paymentMethod || previousOrder.paymentMethod,
      specialInstructions: specialInstructions || previousOrder.specialInstructions,
      pricing: {
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        tax: 0,
        total: total
      },
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60000),
      isReorder: true,
      originalOrderId: previousOrder._id
    });
    
    await newOrder.save();
    
    // Update user preferences
    const user = await User.findById(previousOrder.user);
    if (user) {
      await updateUserPreferencesAfterOrder(user, previousOrder.restaurant, newOrder, availableItems);
    }
    
    await newOrder.populate(['restaurant', 'items.menuItem']);
    
    res.status(201).json({
      success: true,
      message: 'Reorder placed successfully',
      order: newOrder,
      unavailableItems: previousOrder.items.length - availableItems.length
    });
    
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing reorder',
      error: error.message
    });
  }
});

// ===== CANCEL ORDER =====
router.put('/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order can be cancelled
    if (['Delivered', 'Cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order that is ${order.orderStatus.toLowerCase()}`
      });
    }
    
    // Cancel the order
    order.orderStatus = 'Cancelled';
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: new Date(),
      note: reason || 'Order cancelled by user'
    });
    
    await order.save();
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: order
    });
    
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
});

// ===== RATE ORDER =====
router.post('/:orderId/rate', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, review, restaurantRating, deliveryRating } = req.body;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order is delivered
    if (order.orderStatus !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate delivered orders'
      });
    }
    
    // Add rating to order
    order.rating = {
      overall: rating,
      restaurant: restaurantRating,
      delivery: deliveryRating,
      review: review,
      ratedAt: new Date()
    };
    
    await order.save();
    
    // Update restaurant's average rating
    if (restaurantRating) {
      await updateRestaurantRating(order.restaurant, restaurantRating);
    }
    
    res.json({
      success: true,
      message: 'Order rated successfully',
      rating: order.rating
    });
    
  } catch (error) {
    console.error('Rate order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating order',
      error: error.message
    });
  }
});

// ===== HELPER FUNCTION TO UPDATE RESTAURANT RATING =====
async function updateRestaurantRating(restaurantId, newRating) {
  try {
    const Restaurant = require('../models/Restaurant');
    
    // Get all ratings for this restaurant
    const orders = await Order.find({
      restaurant: restaurantId,
      'rating.restaurant': { $exists: true }
    });
    
    if (orders.length > 0) {
      const totalRating = orders.reduce((sum, order) => sum + order.rating.restaurant, 0);
      const averageRating = totalRating / orders.length;
      
      await Restaurant.findByIdAndUpdate(restaurantId, {
        rating: Math.round(averageRating * 10) / 10 // Round to 1 decimal
      });
    }
    
  } catch (error) {
    console.error('Error updating restaurant rating:', error);
  }
}

// ===== GET ORDER ANALYTICS FOR USER =====
router.get('/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange = '30' } = req.query; // days
    
    const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
    
    const orders = await Order.find({
      user: userId,
      createdAt: { $gte: startDate }
    }).populate('restaurant');
    
    const analytics = {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.pricing.total, 0),
      averageOrderValue: 0,
      favoriteRestaurant: null,
      favoriteCuisine: null,
      ordersByStatus: {},
      monthlySpending: {}
    };
    
    if (orders.length > 0) {
      analytics.averageOrderValue = analytics.totalSpent / orders.length;
      
      // Calculate favorite restaurant
      const restaurantCounts = {};
      const cuisineCounts = {};
      
      orders.forEach(order => {
        // Restaurant frequency
        const restId = order.restaurant._id.toString();
        restaurantCounts[restId] = (restaurantCounts[restId] || 0) + 1;
        
        // Cuisine frequency
        if (order.restaurant.cuisine) {
          order.restaurant.cuisine.forEach(cuisine => {
            cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
          });
        }
        
        // Status distribution
        analytics.ordersByStatus[order.orderStatus] = 
          (analytics.ordersByStatus[order.orderStatus] || 0) + 1;
      });
      
      // Find favorite restaurant
      const favoriteRestaurantId = Object.entries(restaurantCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      
      if (favoriteRestaurantId) {
        analytics.favoriteRestaurant = orders.find(order => 
          order.restaurant._id.toString() === favoriteRestaurantId
        ).restaurant;
      }
      
      // Find favorite cuisine
      analytics.favoriteCuisine = Object.entries(cuisineCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
    }
    
    res.json({
      success: true,
      analytics: analytics,
      timeRange: `${timeRange} days`
    });
    
  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order analytics',
      error: error.message
    });
  }
});

// ===== GET FREQUENT ORDERS FOR REORDER SUGGESTIONS =====
router.get('/frequent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const orders = await Order.find({ user: userId })
      .populate('restaurant')
      .populate('items.menuItem')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Group orders by restaurant and items
    const frequentOrders = {};
    
    orders.forEach(order => {
      const key = `${order.restaurant._id}-${order.items.map(item => item.menuItem._id).sort().join('-')}`;
      
      if (!frequentOrders[key]) {
        frequentOrders[key] = {
          restaurant: order.restaurant,
          items: order.items,
          count: 0,
          lastOrdered: order.createdAt,
          totalSpent: 0
        };
      }
      
      frequentOrders[key].count += 1;
      frequentOrders[key].totalSpent += order.pricing.total;
      
      if (order.createdAt > frequentOrders[key].lastOrdered) {
        frequentOrders[key].lastOrdered = order.createdAt;
      }
    });
    
    // Convert to array and sort by frequency
    const suggestions = Object.values(frequentOrders)
      .filter(order => order.count >= 2) // At least ordered twice
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    res.json({
      success: true,
      suggestions: suggestions
    });
    
  } catch (error) {
    console.error('Frequent orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching frequent orders',
      error: error.message
    });
  }
});

// ===== TRACK ORDER REAL-TIME =====
router.get('/:orderId/track', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('restaurant', 'name phone address')
      .select('orderNumber orderStatus statusHistory estimatedDeliveryTime actualDeliveryTime deliveryAddress');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Calculate estimated time remaining
    let timeRemaining = null;
    if (order.orderStatus !== 'Delivered' && order.estimatedDeliveryTime) {
      const now = new Date();
      const timeLeft = order.estimatedDeliveryTime - now;
      timeRemaining = Math.max(0, Math.ceil(timeLeft / (1000 * 60))); // minutes
    }
    
    res.json({
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        currentStatus: order.orderStatus,
        statusHistory: order.statusHistory,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        timeRemaining: timeRemaining,
        restaurant: order.restaurant,
        deliveryAddress: order.deliveryAddress
      }
    });
    
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking order',
      error: error.message
    });
  }
});

module.exports = router;