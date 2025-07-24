// Smart Notification and Engagement System
// backend/services/smartNotifications.js

const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

class SmartNotificationService {
  constructor() {
    this.notificationTemplates = {
      reorder: {
        title: "🍽️ Time for your favorite meal!",
        body: "You last ordered {restaurantName} {daysAgo} days ago. Want to reorder?"
      },
      newRestaurant: {
        title: "🆕 New restaurant alert!",
        body: "{restaurantName} just opened and serves {cuisine}. Check it out!"
      },
      priceAlert: {
        title: "💰 Great deal alert!",
        body: "Your favorite {restaurantName} has reduced delivery fees!"
      },
      weekendSpecial: {
        title: "🎉 Weekend treats await!",
        body: "Discover premium restaurants with weekend specials"
      },
      inactiveUser: {
        title: "🍕 We miss you!",
        body: "Come back for amazing food deals and new restaurants"
      },
      orderUpdate: {
        title: "📱 Your order is {status}",
        body: "Order #{orderNumber} from {restaurantName}"
      }
    };
  }

  // Main notification scheduler
  async scheduleSmartNotifications() {
    try {
      console.log('📱 Running smart notification scheduler...');
      
      const users = await User.find({ isActive: true });
      console.log(`👥 Processing ${users.length} users for notifications`);

      for (const user of users) {
        await this.processUserNotifications(user);
      }

      console.log('✅ Smart notifications scheduled successfully');
    } catch (error) {
      console.error('❌ Notification scheduler error:', error);
    }
  }

  // Process notifications for individual user
  async processUserNotifications(user) {
    try {
      const userOrders = await Order.find({ user: user._id })
        .populate('restaurant')
        .sort({ createdAt: -1 })
        .limit(10);

      const notifications = [];

      // 1. Reorder suggestions
      const reorderNotifications = await this.generateReorderNotifications(user, userOrders);
      notifications.push(...reorderNotifications);

      // 2. New restaurant alerts
      const newRestaurantNotifications = await this.generateNewRestaurantNotifications(user);
      notifications.push(...newRestaurantNotifications);

      // 3. Price alerts
      const priceAlertNotifications = await this.generatePriceAlerts(user, userOrders);
      notifications.push(...priceAlertNotifications);

      // 4. Inactive user re-engagement
      const reengagementNotifications = await this.generateReengagementNotifications(user, userOrders);
      notifications.push(...reengagementNotifications);

      // 5. Personalized meal time suggestions
      const mealTimeNotifications = await this.generateMealTimeNotifications(user, userOrders);
      notifications.push(...mealTimeNotifications);

      // Send notifications (simulate for now)
      if (notifications.length > 0) {
        await this.sendNotifications(user, notifications);
      }

    } catch (error) {
      console.error(`❌ Processing notifications for user ${user._id}:`, error);
    }
  }

  // Generate reorder suggestions based on patterns
  async generateReorderNotifications(user, userOrders) {
    const notifications = [];
    
    if (userOrders.length === 0) return notifications;

    // Find frequently ordered restaurants
    const restaurantFrequency = {};
    userOrders.forEach(order => {
      const restId = order.restaurant._id.toString();
      restaurantFrequency[restId] = (restaurantFrequency[restId] || 0) + 1;
    });

    // Get top 3 frequent restaurants
    const topRestaurants = Object.entries(restaurantFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [restaurantId, frequency] of topRestaurants) {
      if (frequency >= 2) { // User ordered at least twice
        const lastOrder = userOrders.find(order => 
          order.restaurant._id.toString() === restaurantId
        );
        
        if (lastOrder) {
          const daysSinceLastOrder = Math.floor(
            (new Date() - lastOrder.createdAt) / (1000 * 60 * 60 * 24)
          );

          // Suggest reorder if it's been 7-14 days
          if (daysSinceLastOrder >= 7 && daysSinceLastOrder <= 14) {
            notifications.push({
              type: 'reorder',
              priority: 'high',
              restaurant: lastOrder.restaurant,
              data: {
                restaurantName: lastOrder.restaurant.name,
                daysAgo: daysSinceLastOrder,
                lastOrderItems: lastOrder.items
              },
              scheduledFor: this.getOptimalTime(user, 'meal_suggestion')
            });
          }
        }
      }
    }

    return notifications;
  }

  // Alert about new restaurants matching user preferences
  async generateNewRestaurantNotifications(user) {
    const notifications = [];
    
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const newRestaurants = await Restaurant.find({
        isActive: true,
        createdAt: { $gte: oneWeekAgo }
      });

      if (user.preferences?.preferredCuisines?.length > 0) {
        const matchingRestaurants = newRestaurants.filter(restaurant =>
          restaurant.cuisine?.some(cuisine =>
            user.preferences.preferredCuisines.includes(cuisine)
          )
        );

        for (const restaurant of matchingRestaurants.slice(0, 2)) {
          notifications.push({
            type: 'newRestaurant',
            priority: 'medium',
            restaurant: restaurant,
            data: {
              restaurantName: restaurant.name,
              cuisine: restaurant.cuisine.join(', ')
            },
            scheduledFor: this.getOptimalTime(user, 'discovery')
          });
        }
      }
    } catch (error) {
      console.error('New restaurant notification error:', error);
    }

    return notifications;
  }

  // Price alerts for favorite restaurants
  async generatePriceAlerts(user, userOrders) {
    const notifications = [];
    
    // Get user's favorite restaurants
    const favoriteRestaurants = await this.getUserFavoriteRestaurants(user, userOrders);
    
    for (const restaurant of favoriteRestaurants) {
      // Simulate price drop detection (in real app, track price history)
      const hasPriceDrop = Math.random() < 0.1; // 10% chance of price drop
      
      if (hasPriceDrop) {
        notifications.push({
          type: 'priceAlert',
          priority: 'high',
          restaurant: restaurant,
          data: {
            restaurantName: restaurant.name,
            oldPrice: restaurant.deliveryFee + 10,
            newPrice: restaurant.deliveryFee
          },
          scheduledFor: this.getOptimalTime(user, 'immediate')
        });
      }
    }

    return notifications;
  }

  // Re-engagement for inactive users
  async generateReengagementNotifications(user, userOrders) {
    const notifications = [];
    
    if (userOrders.length === 0) {
      // New user - welcome series
      notifications.push({
        type: 'welcome',
        priority: 'medium',
        data: {
          userName: user.name,
          specialOffer: '20% off first order'
        },
        scheduledFor: this.getOptimalTime(user, 'welcome')
      });
    } else {
      const lastOrderDate = userOrders[0].createdAt;
      const daysSinceLastOrder = Math.floor(
        (new Date() - lastOrderDate) / (1000 * 60 * 60 * 24)
      );

      // If user hasn't ordered in 30+ days
      if (daysSinceLastOrder >= 30) {
        notifications.push({
          type: 'inactiveUser',
          priority: 'high',
          data: {
            userName: user.name,
            daysSince: daysSinceLastOrder,
            incentive: 'Free delivery on your next order'
          },
          scheduledFor: this.getOptimalTime(user, 'reengagement')
        });
      }
    }

    return notifications;
  }

  // Meal time suggestions based on user patterns
  async generateMealTimeNotifications(user, userOrders) {
    const notifications = [];
    
    if (userOrders.length === 0) return notifications;

    // Analyze user's ordering patterns
    const orderTimes = userOrders.map(order => ({
      hour: order.createdAt.getHours(),
      dayOfWeek: order.createdAt.getDay(),
      restaurant: order.restaurant
    }));

    // Find most common order time
    const timeFrequency = {};
    orderTimes.forEach(({ hour }) => {
      const timeSlot = this.getTimeSlot(hour);
      timeFrequency[timeSlot] = (timeFrequency[timeSlot] || 0) + 1;
    });

    const mostCommonTime = Object.entries(timeFrequency)
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonTime && mostCommonTime[1] >= 3) {
      const [timeSlot] = mostCommonTime;
      
      // Check if it's approaching their usual meal time
      const now = new Date();
      const currentTimeSlot = this.getTimeSlot(now.getHours());
      
      if (currentTimeSlot === timeSlot) {
        // Get their most ordered restaurant for this time
        const timeRestaurants = orderTimes
          .filter(({ hour }) => this.getTimeSlot(hour) === timeSlot)
          .map(({ restaurant }) => restaurant);
        
        const favoriteForTime = this.getMostFrequent(timeRestaurants);
        
        if (favoriteForTime) {
          notifications.push({
            type: 'mealTime',
            priority: 'medium',
            restaurant: favoriteForTime,
            data: {
              timeSlot: timeSlot,
              restaurantName: favoriteForTime.name,
              suggestion: `Your usual ${timeSlot.toLowerCase()} spot`
            },
            scheduledFor: new Date()
          });
        }
      }
    }

    return notifications;
  }

  // Send notifications (simulate)
  async sendNotifications(user, notifications) {
    console.log(`📱 Sending ${notifications.length} notifications to ${user.name}:`);
    
    for (const notification of notifications) {
      const template = this.notificationTemplates[notification.type];
      if (template) {
        const title = this.fillTemplate(template.title, notification.data);
        const body = this.fillTemplate(template.body, notification.data);
        
        console.log(`  📧 ${notification.type}: ${title}`);
        
        // In a real app, you would send push notifications here
        // await this.sendPushNotification(user.fcmToken, title, body);
        // await this.sendEmailNotification(user.email, title, body);
      }
    }
  }

  // Helper methods
  async getUserFavoriteRestaurants(user, userOrders) {
    const restaurantFrequency = {};
    userOrders.forEach(order => {
      const restId = order.restaurant._id.toString();
      restaurantFrequency[restId] = (restaurantFrequency[restId] || 0) + 1;
    });

    return Object.entries(restaurantFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([restaurantId]) => 
        userOrders.find(order => 
          order.restaurant._id.toString() === restaurantId
        ).restaurant
      );
  }

  getTimeSlot(hour) {
    if (hour >= 6 && hour < 11) return 'BREAKFAST';
    if (hour >= 11 && hour < 16) return 'LUNCH';
    if (hour >= 16 && hour < 22) return 'DINNER';
    return 'LATE_NIGHT';
  }

  getMostFrequent(items) {
    const frequency = {};
    items.forEach(item => {
      const id = item._id?.toString() || item.toString();
      frequency[id] = (frequency[id] || 0) + 1;
    });

    const mostFrequentId = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return items.find(item => 
      (item._id?.toString() || item.toString()) === mostFrequentId
    );
  }

  getOptimalTime(user, notificationType) {
    const now = new Date();
    
    switch (notificationType) {
      case 'immediate':
        return now;
      case 'meal_suggestion':
        // Send 30 minutes before typical meal times
        const mealTime = new Date(now);
        mealTime.setMinutes(now.getMinutes() + 30);
        return mealTime;
      case 'discovery':
        // Send in the evening when people browse
        const evening = new Date(now);
        evening.setHours(19, 0, 0, 0); // 7 PM
        return evening;
      case 'welcome':
        // Send welcome notifications in the afternoon
        const afternoon = new Date(now);
        afternoon.setHours(14, 0, 0, 0); // 2 PM
        return afternoon;
      case 'reengagement':
        // Send reengagement during lunch time
        const lunch = new Date(now);
        lunch.setHours(12, 30, 0, 0); // 12:30 PM
        return lunch;
      default:
        return now;
    }
  }

  fillTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  // Advanced engagement analytics
  async analyzeUserEngagement() {
    try {
      const users = await User.find({ isActive: true });
      const engagement = {
        highlyEngaged: [],
        moderatelyEngaged: [],
        atRisk: [],
        churned: []
      };

      for (const user of users) {
        const userOrders = await Order.find({ user: user._id })
          .sort({ createdAt: -1 })
          .limit(20);

        const engagementScore = this.calculateEngagementScore(user, userOrders);
        user.engagementScore = engagementScore;

        if (engagementScore >= 80) {
          engagement.highlyEngaged.push(user);
        } else if (engagementScore >= 60) {
          engagement.moderatelyEngaged.push(user);
        } else if (engagementScore >= 30) {
          engagement.atRisk.push(user);
        } else {
          engagement.churned.push(user);
        }
      }

      console.log('📊 User Engagement Analysis:', {
        highlyEngaged: engagement.highlyEngaged.length,
        moderatelyEngaged: engagement.moderatelyEngaged.length,
        atRisk: engagement.atRisk.length,
        churned: engagement.churned.length
      });

      return engagement;
    } catch (error) {
      console.error('❌ Engagement analysis error:', error);
      return null;
    }
  }

  calculateEngagementScore(user, userOrders) {
    if (userOrders.length === 0) return 0;

    let score = 0;
    const now = new Date();

    // Recency (30 points)
    const lastOrderDate = userOrders[0].createdAt;
    const daysSinceLastOrder = Math.floor((now - lastOrderDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastOrder <= 7) score += 30;
    else if (daysSinceLastOrder <= 14) score += 25;
    else if (daysSinceLastOrder <= 30) score += 15;
    else if (daysSinceLastOrder <= 60) score += 5;

    // Frequency (25 points)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = userOrders.filter(order => order.createdAt >= thirtyDaysAgo);
    
    if (recentOrders.length >= 8) score += 25;
    else if (recentOrders.length >= 5) score += 20;
    else if (recentOrders.length >= 3) score += 15;
    else if (recentOrders.length >= 1) score += 10;

    // Monetary (20 points)
    const totalSpent = userOrders.reduce((sum, order) => sum + order.pricing.total, 0);
    const avgOrderValue = totalSpent / userOrders.length;
    
    if (avgOrderValue >= 1500) score += 20;
    else if (avgOrderValue >= 1000) score += 15;
    else if (avgOrderValue >= 500) score += 10;
    else if (avgOrderValue >= 200) score += 5;

    // Diversity (15 points)
    const uniqueRestaurants = new Set(userOrders.map(order => order.restaurant.toString())).size;
    const diversityRatio = uniqueRestaurants / Math.min(userOrders.length, 10);
    
    if (diversityRatio >= 0.7) score += 15;
    else if (diversityRatio >= 0.5) score += 12;
    else if (diversityRatio >= 0.3) score += 8;
    else score += 4;

    // Loyalty (10 points)
    const accountAge = Math.floor((now - user.createdAt) / (1000 * 60 * 60 * 24));
    if (accountAge >= 365) score += 10;
    else if (accountAge >= 180) score += 8;
    else if (accountAge >= 90) score += 5;
    else if (accountAge >= 30) score += 3;

    return Math.min(score, 100);
  }

  // Personalized campaign generation
  async generatePersonalizedCampaigns() {
    try {
      const engagement = await this.analyzeUserEngagement();
      const campaigns = [];

      // Campaign for highly engaged users
      campaigns.push({
        name: 'VIP Loyalty Rewards',
        targetSegment: 'highlyEngaged',
        users: engagement.highlyEngaged,
        message: '🌟 You\'re a VIP! Enjoy exclusive early access to new restaurants',
        incentive: 'Free premium delivery for a month',
        channels: ['push', 'email', 'in-app']
      });

      // Campaign for at-risk users
      campaigns.push({
        name: 'Win-Back Campaign',
        targetSegment: 'atRisk',
        users: engagement.atRisk,
        message: '😊 We miss you! Come back with 30% off your next order',
        incentive: '30% discount + free delivery',
        channels: ['push', 'email', 'sms']
      });

      // Campaign for moderate users
      campaigns.push({
        name: 'Engagement Boost',
        targetSegment: 'moderatelyEngaged',
        users: engagement.moderatelyEngaged,
        message: '🚀 Discover new flavors with our restaurant recommendations',
        incentive: '15% off orders from new restaurants',
        channels: ['push', 'in-app']
      });

      console.log('🎯 Generated personalized campaigns:', campaigns.length);
      return campaigns;

    } catch (error) {
      console.error('❌ Campaign generation error:', error);
      return [];
    }
  }

  // A/B Testing for notifications
  async runNotificationABTest(campaignId, variants) {
    try {
      const testResults = {
        campaignId,
        variants: variants.map(variant => ({
          ...variant,
          sentCount: 0,
          openRate: 0,
          clickRate: 0,
          conversionRate: 0
        }))
      };

      // Simulate A/B test results
      for (const variant of testResults.variants) {
        variant.sentCount = Math.floor(Math.random() * 1000) + 500;
        variant.openRate = Math.random() * 0.4 + 0.2; // 20-60%
        variant.clickRate = Math.random() * 0.15 + 0.05; // 5-20%
        variant.conversionRate = Math.random() * 0.1 + 0.02; // 2-12%
      }

      // Determine winner
      const winner = testResults.variants.reduce((best, current) =>
        current.conversionRate > best.conversionRate ? current : best
      );

      console.log('🧪 A/B Test Results:', {
        campaignId,
        winner: winner.name,
        winnerConversionRate: `${(winner.conversionRate * 100).toFixed(2)}%`
      });

      return testResults;

    } catch (error) {
      console.error('❌ A/B test error:', error);
      return null;
    }
  }
}

module.exports = SmartNotificationService;