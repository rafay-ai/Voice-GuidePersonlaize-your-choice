// Enhanced Data Manager for Admin Dashboard
// File: src/components/shared/DataManager.js

class DataManager {
  constructor() {
    this.initializeData();
  }

  // Initialize enhanced localStorage structure
  initializeData() {
    if (!localStorage.getItem('enhanced_users')) {
      this.seedInitialData();
    }
  }

  // Seed initial data for demo
  seedInitialData() {
    const users = [
      {
        id: 'user_1',
        email: 'ahmed@example.com',
        name: 'Ahmed Khan',
        role: 'customer',
        phone: '+92 300 1234567',
        joinDate: new Date('2024-11-15').toISOString(),
        lastActive: new Date().toISOString(),
        preferences: {
          cuisines: ['Pakistani', 'Fast Food'],
          spiceLevel: 'Medium',
          budget: 'Medium',
          dietary: []
        },
        stats: {
          totalOrders: 12,
          totalSpent: 3600,
          avgOrderValue: 300,
          favoriteRestaurants: ['rest_1', 'rest_2']
        },
        addresses: [
          {
            id: 'addr_1',
            label: 'Home',
            address: 'Gulshan-e-Iqbal, Block 13-D, Karachi',
            isDefault: true
          }
        ]
      },
      {
        id: 'user_2',
        email: 'fatima@example.com',
        name: 'Fatima Ali',
        role: 'customer',
        phone: '+92 321 9876543',
        joinDate: new Date('2024-12-01').toISOString(),
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        preferences: {
          cuisines: ['Chinese', 'Pakistani'],
          spiceLevel: 'Mild',
          budget: 'High',
          dietary: ['Halal']
        },
        stats: {
          totalOrders: 8,
          totalSpent: 4200,
          avgOrderValue: 525,
          favoriteRestaurants: ['rest_3', 'rest_1']
        },
        addresses: [
          {
            id: 'addr_2',
            label: 'Office',
            address: 'Clifton Block 5, Karachi',
            isDefault: true
          }
        ]
      },
      {
        id: 'admin_1',
        email: 'admin@pakistanifood.com',
        name: 'Admin User',
        role: 'admin',
        phone: '+92 300 0000000',
        joinDate: new Date('2024-01-01').toISOString(),
        lastActive: new Date().toISOString()
      }
    ];

    const orders = [
      {
        id: 'order_1',
        userId: 'user_1',
        restaurantId: 'rest_1',
        restaurantName: 'Student Biryani',
        items: [
          { id: 'item_1', name: 'Chicken Biryani', price: 280, quantity: 1 },
          { id: 'item_2', name: 'Raita', price: 50, quantity: 1 }
        ],
        pricing: {
          subtotal: 330,
          deliveryFee: 50,
          surgeMultiplier: 1.0,
          tax: 20,
          total: 400
        },
        status: 'delivered',
        timestamps: {
          ordered: new Date('2025-01-29T10:30:00').toISOString(),
          confirmed: new Date('2025-01-29T10:32:00').toISOString(),
          preparing: new Date('2025-01-29T10:45:00').toISOString(),
          on_way: new Date('2025-01-29T11:15:00').toISOString(),
          delivered: new Date('2025-01-29T11:45:00').toISOString()
        },
        delivery: {
          address: 'Gulshan-e-Iqbal, Block 13-D, Karachi',
          riderId: 'rider_1',
          riderName: 'Hassan Ali',
          riderPhone: '+92 300 1111111',
          estimatedTime: 30,
          actualTime: 45
        },
        rating: {
          value: 5,
          comment: 'Excellent biryani! Hot and fresh.',
          createdAt: new Date('2025-01-29T12:00:00').toISOString()
        },
        adminNotes: ''
      },
      {
        id: 'order_2',
        userId: 'user_2',
        restaurantId: 'rest_2',
        restaurantName: 'KFC Pakistan',
        items: [
          { id: 'item_3', name: 'Zinger Burger', price: 350, quantity: 2 },
          { id: 'item_4', name: 'Pepsi', price: 80, quantity: 2 }
        ],
        pricing: {
          subtotal: 860,
          deliveryFee: 70,
          surgeMultiplier: 1.2,
          tax: 54,
          total: 984
        },
        status: 'on_way',
        timestamps: {
          ordered: new Date().toISOString(),
          confirmed: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          preparing: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          on_way: new Date(Date.now() + 25 * 60 * 1000).toISOString()
        },
        delivery: {
          address: 'Clifton Block 5, Karachi',
          riderId: 'rider_2',
          riderName: 'Ali Ahmed',
          riderPhone: '+92 321 2222222',
          estimatedTime: 35,
          actualTime: null
        },
        adminNotes: 'Priority order - VIP customer'
      },
      {
        id: 'order_3',
        userId: 'user_1',
        restaurantId: 'rest_3',
        restaurantName: 'Subway Pakistan',
        items: [
          { id: 'item_5', name: 'Chicken Teriyaki Sub', price: 420, quantity: 1 }
        ],
        pricing: {
          subtotal: 420,
          deliveryFee: 60,
          surgeMultiplier: 1.0,
          tax: 29,
          total: 509
        },
        status: 'preparing',
        timestamps: {
          ordered: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          confirmed: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          preparing: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        delivery: {
          address: 'Gulshan-e-Iqbal, Block 13-D, Karachi',
          estimatedTime: 25
        },
        adminNotes: ''
      }
    ];

    const restaurants = [
      {
        id: 'rest_1',
        name: 'Student Biryani',
        cuisine: ['Pakistani', 'Biryani'],
        location: 'North Nazimabad, Karachi',
        ratings: {
          average: 4.5,
          totalReviews: 342,
          breakdown: { 5: 180, 4: 98, 3: 45, 2: 15, 1: 4 }
        },
        stats: {
          totalOrders: 1250,
          totalRevenue: 375000,
          avgDeliveryTime: 28,
          popularItems: ['Chicken Biryani', 'Mutton Biryani', 'Raita']
        },
        status: 'active',
        adminSettings: {
          featured: true,
          priority: 1,
          commissionRate: 0.15
        },
        operatingHours: '11:00 AM - 11:00 PM',
        priceRange: 'Rs. 200-500',
        deliveryTime: '25-35 min'
      },
      {
        id: 'rest_2',
        name: 'KFC Pakistan',
        cuisine: ['Fast Food', 'Chicken'],
        location: 'Gulshan-e-Iqbal, Karachi',
        ratings: {
          average: 4.2,
          totalReviews: 567,
          breakdown: { 5: 234, 4: 198, 3: 89, 2: 32, 1: 14 }
        },
        stats: {
          totalOrders: 2100,
          totalRevenue: 840000,
          avgDeliveryTime: 32,
          popularItems: ['Zinger Burger', 'Hot Wings', 'Krunch Burger']
        },
        status: 'active',
        adminSettings: {
          featured: true,
          priority: 2,
          commissionRate: 0.12
        },
        operatingHours: '12:00 PM - 12:00 AM',
        priceRange: 'Rs. 300-800',
        deliveryTime: '30-40 min'
      },
      {
        id: 'rest_3',
        name: 'Subway Pakistan',
        cuisine: ['Fast Food', 'Sandwiches'],
        location: 'Clifton, Karachi',
        ratings: {
          average: 4.0,
          totalReviews: 289,
          breakdown: { 5: 98, 4: 112, 3: 56, 2: 18, 1: 5 }
        },
        stats: {
          totalOrders: 890,
          totalRevenue: 356000,
          avgDeliveryTime: 25,
          popularItems: ['Chicken Teriyaki Sub', 'Turkey Sub', 'Veggie Delite']
        },
        status: 'active',
        adminSettings: {
          featured: false,
          priority: 3,
          commissionRate: 0.18
        },
        operatingHours: '10:00 AM - 10:00 PM',
        priceRange: 'Rs. 250-600',
        deliveryTime: '20-30 min'
      }
    ];

    const reviews = [
      {
        id: 'review_1',
        userId: 'user_1',
        userName: 'Ahmed Khan',
        restaurantId: 'rest_1',
        restaurantName: 'Student Biryani',
        orderId: 'order_1',
        rating: 5,
        comment: 'Excellent biryani! Hot and fresh. Will order again.',
        status: 'approved',
        createdAt: new Date('2025-01-29T12:00:00').toISOString(),
        adminResponse: 'Thank you for your positive feedback!',
        adminActions: [
          {
            action: 'approved',
            adminId: 'admin_1',
            timestamp: new Date('2025-01-29T12:30:00').toISOString()
          }
        ]
      },
      {
        id: 'review_2',
        userId: 'user_2',
        userName: 'Fatima Ali',
        restaurantId: 'rest_2',
        restaurantName: 'KFC Pakistan',
        orderId: 'order_old_1',
        rating: 4,
        comment: 'Good taste but delivery was a bit slow.',
        status: 'approved',
        createdAt: new Date('2025-01-28T15:30:00').toISOString(),
        adminResponse: 'We are working on improving our delivery times.',
        adminActions: [
          {
            action: 'approved',
            adminId: 'admin_1',
            timestamp: new Date('2025-01-28T16:00:00').toISOString()
          }
        ]
      }
    ];

    const dailyAnalytics = [
      {
        date: new Date().toISOString().split('T')[0],
        metrics: {
          totalRevenue: 1893,
          totalOrders: 3,
          activeCustomers: 2,
          avgOrderValue: 631,
          newSignups: 0
        },
        ordersByStatus: {
          confirmed: 0,
          preparing: 1,
          on_way: 1,
          delivered: 1,
          cancelled: 0
        },
        topRestaurants: [
          { restaurantId: 'rest_2', name: 'KFC Pakistan', orders: 1, revenue: 984 },
          { restaurantId: 'rest_3', name: 'Subway Pakistan', orders: 1, revenue: 509 },
          { restaurantId: 'rest_1', name: 'Student Biryani', orders: 1, revenue: 400 }
        ],
        hourlyStats: this.generateHourlyStats()
      }
    ];

    // Store all data
    localStorage.setItem('enhanced_users', JSON.stringify(users));
    localStorage.setItem('enhanced_orders', JSON.stringify(orders));
    localStorage.setItem('enhanced_restaurants', JSON.stringify(restaurants));
    localStorage.setItem('enhanced_reviews', JSON.stringify(reviews));
    localStorage.setItem('enhanced_analytics', JSON.stringify(dailyAnalytics));
    localStorage.setItem('admin_actions_log', JSON.stringify([]));
  }

  generateHourlyStats() {
    const stats = [];
    const currentHour = new Date().getHours();
    
    for (let i = 0; i < 24; i++) {
      let orders = 0;
      let revenue = 0;
      
      // Simulate realistic data based on time
      if (i >= 11 && i <= 14) { // Lunch rush
        orders = Math.floor(Math.random() * 5) + 2;
        revenue = orders * (Math.random() * 300 + 200);
      } else if (i >= 18 && i <= 22) { // Dinner rush
        orders = Math.floor(Math.random() * 8) + 3;
        revenue = orders * (Math.random() * 400 + 300);
      } else if (i >= 6 && i <= 23) { // Regular hours
        orders = Math.floor(Math.random() * 3);
        revenue = orders * (Math.random() * 250 + 150);
      }
      
      stats.push({ hour: i, orders, revenue: Math.round(revenue) });
    }
    
    return stats;
  }

  // Get methods
  getUsers() {
    return JSON.parse(localStorage.getItem('enhanced_users') || '[]');
  }

  getOrders() {
    return JSON.parse(localStorage.getItem('enhanced_orders') || '[]');
  }

  getRestaurants() {
    return JSON.parse(localStorage.getItem('enhanced_restaurants') || '[]');
  }

  getReviews() {
    return JSON.parse(localStorage.getItem('enhanced_reviews') || '[]');
  }

  getAnalytics() {
    return JSON.parse(localStorage.getItem('enhanced_analytics') || '[]');
  }

  getAdminActions() {
    return JSON.parse(localStorage.getItem('admin_actions_log') || '[]');
  }

  // Update methods
  updateOrder(orderId, updates) {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex !== -1) {
      orders[orderIndex] = { ...orders[orderIndex], ...updates };
      localStorage.setItem('enhanced_orders', JSON.stringify(orders));
      
      // Log admin action
      this.logAdminAction('order_updated', 'order', orderId, updates);
      
      return orders[orderIndex];
    }
    return null;
  }

  updateRestaurant(restaurantId, updates) {
    const restaurants = this.getRestaurants();
    const restaurantIndex = restaurants.findIndex(rest => rest.id === restaurantId);
    
    if (restaurantIndex !== -1) {
      restaurants[restaurantIndex] = { ...restaurants[restaurantIndex], ...updates };
      localStorage.setItem('enhanced_restaurants', JSON.stringify(restaurants));
      
      this.logAdminAction('restaurant_updated', 'restaurant', restaurantId, updates);
      
      return restaurants[restaurantIndex];
    }
    return null;
  }

  updateReview(reviewId, updates) {
    const reviews = this.getReviews();
    const reviewIndex = reviews.findIndex(review => review.id === reviewId);
    
    if (reviewIndex !== -1) {
      reviews[reviewIndex] = { ...reviews[reviewIndex], ...updates };
      localStorage.setItem('enhanced_reviews', JSON.stringify(reviews));
      
      this.logAdminAction('review_updated', 'review', reviewId, updates);
      
      return reviews[reviewIndex];
    }
    return null;
  }

  // Calculate real-time analytics
  calculateRealTimeAnalytics() {
    const orders = this.getOrders();
    const users = this.getUsers().filter(user => user.role === 'customer');
    const restaurants = this.getRestaurants();

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => 
      order.timestamps.ordered.split('T')[0] === today
    );

    const totalRevenue = todayOrders.reduce((sum, order) => sum + order.pricing.total, 0);
    const totalOrders = todayOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const activeCustomers = users.filter(user => {
      const lastActive = new Date(user.lastActive);
      const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActive <= 7;
    }).length;

    const ordersByStatus = {
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      on_way: orders.filter(o => o.status === 'on_way').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };

    const topRestaurants = restaurants
      .map(restaurant => {
        const restaurantOrders = todayOrders.filter(order => order.restaurantId === restaurant.id);
        const revenue = restaurantOrders.reduce((sum, order) => sum + order.pricing.total, 0);
        return {
          restaurantId: restaurant.id,
          name: restaurant.name,
          orders: restaurantOrders.length,
          revenue
        };
      })
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    return {
      totalRevenue,
      totalOrders,
      activeCustomers,
      avgOrderValue,
      ordersByStatus,
      topRestaurants,
      lastUpdated: new Date().toISOString()
    };
  }

  // Log admin actions
  logAdminAction(action, targetType, targetId, details) {
    const adminActions = this.getAdminActions();
    const newAction = {
      id: `action_${Date.now()}`,
      adminId: 'admin_1', // Current admin
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString()
    };
    
    adminActions.unshift(newAction);
    localStorage.setItem('admin_actions_log', JSON.stringify(adminActions.slice(0, 100))); // Keep last 100 actions
  }

  // Search and filter methods
  searchOrders(query) {
    const orders = this.getOrders();
    const users = this.getUsers();
    
    return orders.filter(order => {
      const user = users.find(u => u.id === order.userId);
      return (
        order.id.toLowerCase().includes(query.toLowerCase()) ||
        order.restaurantName.toLowerCase().includes(query.toLowerCase()) ||
        (user && user.name.toLowerCase().includes(query.toLowerCase())) ||
        order.status.toLowerCase().includes(query.toLowerCase())
      );
    });
  }

  filterOrdersByStatus(status) {
    return this.getOrders().filter(order => order.status === status);
  }

  filterOrdersByDate(startDate, endDate) {
    return this.getOrders().filter(order => {
      const orderDate = new Date(order.timestamps.ordered);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }
}

// Export singleton instance
const dataManager = new DataManager();
export default dataManager;