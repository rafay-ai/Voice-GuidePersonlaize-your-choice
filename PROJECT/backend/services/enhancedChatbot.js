// Fixed Original Enhanced Chatbot Service
// backend/services/enhancedChatbot.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Order = require('../models/Order');
const mongoose = require('mongoose');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Enhanced user context with order state management
const userContexts = {};

// Order states for conversation flow
const ORDER_STATES = {
  BROWSING: 'browsing',
  SELECTING_RESTAURANT: 'selecting_restaurant',
  VIEWING_MENU: 'viewing_menu',
  BUILDING_CART: 'building_cart',
  COLLECTING_ADDRESS: 'collecting_address',
  CONFIRMING_ORDER: 'confirming_order',
  SELECTING_PAYMENT: 'selecting_payment',
  ORDER_PLACED: 'order_placed'
};

// Intent detection patterns
const ORDER_INTENTS = {
  ORDER_FOOD: ['order', 'buy', 'get food', 'hungry', 'delivery', 'bhook lagi'],
  REORDER: ['usual', 'same as last time', 'repeat order', 'again'],
  QUICK_ORDER: ['quick', 'fast', 'asap', 'jaldi'],
  BUDGET_ORDER: ['cheap', 'budget', 'under', 'affordable', 'sasta'],
  HEALTHY_ORDER: ['healthy', 'diet', 'light', 'salad', 'low calorie'],
  COMFORT_FOOD: ['comfort', 'feeling sad', 'stressed', 'tired'],
  CELEBRATION: ['celebrate', 'party', 'special', 'treat'],
  BULK_ORDER: ['for office', 'group', 'many people', 'bulk']
};

class EnhancedChatbotService {
  constructor() {
    console.log('🤖 Enhanced Chatbot Service initialized');
  }

  // Helper function to check if string is valid ObjectId
  isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Main chatbot response method
  async getChatbotResponse(message, userId, sessionData = {}) {
    try {
      console.log(`💬 Processing message: "${message}" for user: ${userId}`);
      
      // Get or create user context
      if (!userContexts[userId]) {
        userContexts[userId] = await this.initializeUserContext(userId);
      }

      const context = userContexts[userId];
      
      // Detect user intent
      const intent = this.detectIntent(message);
      console.log('🎯 Detected intent:', intent);

      // Handle different conversation flows
      let response;
      
      if (intent.isOrderIntent) {
        response = await this.handleOrderFlow(message, userId, context, intent);
      } else if (context.orderState && context.orderState !== ORDER_STATES.BROWSING) {
        response = await this.continueOrderFlow(message, userId, context);
      } else {
        response = await this.handleGeneralChat(message, userId, context);
      }

      // Update context
      context.lastMessage = message;
      context.lastResponse = response;
      userContexts[userId] = context;

      return response;

    } catch (error) {
      console.error('🚫 Chatbot error:', error);
      return this.getErrorResponse();
    }
  }

  // Initialize user context with proper ObjectId handling
  async initializeUserContext(userId) {
    try {
      console.log(`🔧 Initializing context for user: ${userId}`);
      
      let user = null;
      let recentOrders = [];

      // Only try to fetch user data if userId is a valid ObjectId
      if (this.isValidObjectId(userId)) {
        try {
          user = await User.findById(userId).populate('preferences.favoriteRestaurants');
          recentOrders = await Order.find({ user: userId })
            .populate('restaurant')
            .populate('items.menuItem')
            .sort({ createdAt: -1 })
            .limit(5);
          console.log(`✅ Found user: ${user?.name}, Orders: ${recentOrders.length}`);
        } catch (dbError) {
          console.log('⚠️ Database lookup failed:', dbError.message);
        }
      } else {
        console.log(`⚠️ Invalid ObjectId: ${userId}, using guest context`);
      }

      return {
        user: user,
        orderHistory: recentOrders,
        currentCart: [],
        selectedRestaurant: null,
        orderState: ORDER_STATES.BROWSING,
        addressData: {},
        paymentMethod: null,
        messages: [],
        preferences: user?.preferences || {},
        lastOrderDate: recentOrders[0]?.createdAt || null,
        isGuest: !this.isValidObjectId(userId)
      };
    } catch (error) {
      console.error('Error initializing user context:', error);
      return {
        orderState: ORDER_STATES.BROWSING,
        currentCart: [],
        messages: [],
        isGuest: true
      };
    }
  }

  // Detect user intent from message
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    const intent = {
      isOrderIntent: false,
      type: null,
      confidence: 0,
      entities: {}
    };

    // Check for REORDER intents FIRST (higher priority)
    if (ORDER_INTENTS.REORDER.some(pattern => lowerMessage.includes(pattern))) {
      intent.isOrderIntent = true;
      intent.type = 'REORDER';
      intent.confidence = 0.9;
      console.log('🔄 Reorder intent detected with pattern:', lowerMessage);
      intent.entities = this.extractEntities(lowerMessage);
      return intent;
    }

    // Then check for other order intents
    for (const [intentType, patterns] of Object.entries(ORDER_INTENTS)) {
      if (intentType === 'REORDER') continue; // Already checked above
      
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern)) {
          intent.isOrderIntent = true;
          intent.type = intentType;
          intent.confidence = 0.8;
          console.log(`🎯 ${intentType} intent detected with pattern:`, pattern);
          break;
        }
      }
      if (intent.isOrderIntent) break;
    }

    // Extract entities (budget, cuisine, etc.)
    intent.entities = this.extractEntities(lowerMessage);

    return intent;
  }

  // Extract entities from user message
  extractEntities(message) {
    const entities = {};

    // Extract budget
    const budgetMatch = message.match(/under (?:rs\.?\s*)?(\d+)/i);
    if (budgetMatch) {
      entities.budget = parseInt(budgetMatch[1]);
    }

    // Extract cuisine preferences
    const cuisines = ['biryani', 'karahi', 'bbq', 'pizza', 'burger', 'chinese', 'desi', 'fast food'];
    entities.cuisines = cuisines.filter(cuisine => message.includes(cuisine));

    // Extract quantity/people count
    const peopleMatch = message.match(/for (\d+) people|(\d+) persons/i);
    if (peopleMatch) {
      entities.peopleCount = parseInt(peopleMatch[1] || peopleMatch[2]);
    }

    return entities;
  }

  // Handle order flow initiation - FIXED VERSION
  async handleOrderFlow(message, userId, context, intent) {
    try {
      console.log(`🍕 Handling order flow, intent: ${intent.type}`);
      
      switch (intent.type) {
        case 'REORDER':
          return await this.handleReorder(userId, context);
        
        case 'QUICK_ORDER':
          return await this.handleQuickOrder(userId, context, intent.entities);
        
        case 'BUDGET_ORDER':
          return await this.handleBudgetOrder(userId, context, intent.entities);
        
        case 'HEALTHY_ORDER':
          return await this.handleHealthyOrder(userId, context);
        
        default:
          // FIXED: Use the correct function name
          return await this.startOrderProcess(userId, context, intent);
      }
    } catch (error) {
      console.error('Order flow error:', error);
      return this.getErrorResponse();
    }
  }

  // FIXED: Add the missing startOrderProcess function
  async startOrderProcess(userId, context, intent) {
    try {
      console.log('🚀 Starting order process...');
      
      // Get restaurants
      const restaurants = await Restaurant.find({ isActive: true }).limit(5);
      console.log(`📊 Found ${restaurants.length} restaurants`);

      if (restaurants.length === 0) {
        return {
          message: "I'd love to help you order food! However, no restaurants are currently available. Please try again later! 🏪",
          type: 'no_restaurants',
          suggestions: ['Try again later', 'Contact support']
        };
      }

      context.orderState = ORDER_STATES.SELECTING_RESTAURANT;

      return {
        message: `Great! I'd love to help you order some delicious food! 🍕\n\nHere are some popular restaurants:\n\n${this.formatRestaurants(restaurants)}\n\nWhich one sounds good to you?`,
        type: 'order_start',
        restaurants: restaurants,
        suggestions: ['Show all restaurants', 'Quick recommendations', 'Budget options'],
        actions: ['Browse Menu', 'Quick Order', 'Reorder']
      };
    } catch (error) {
      console.error('Start order process error:', error);
      return this.getErrorResponse();
    }
  }

  // Handle reorder functionality
  async handleReorder(userId, context) {
    try {
      console.log('🔄 Handling reorder...');
      
      if (!context.orderHistory || context.orderHistory.length === 0) {
        return {
          message: "I don't see any previous orders. Let me help you find something delicious! What type of food are you craving? 🍽️",
          type: 'no_history',
          suggestions: ['Show restaurants', 'Biryani', 'Fast food', 'Pakistani cuisine']
        };
      }

      const lastOrder = context.orderHistory[0];
      context.selectedRestaurant = lastOrder.restaurant;
      context.currentCart = lastOrder.items.map(item => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
        price: item.price
      }));
      context.orderState = ORDER_STATES.CONFIRMING_ORDER;

      const total = context.currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        message: `Perfect! I found your last order from ${lastOrder.restaurant.name}. Here's what you ordered:\n\n${this.formatCartItems(context.currentCart)}\n\nTotal: Rs. ${total + (lastOrder.restaurant.deliveryFee || 50)}\n\nWould you like to order this again? 🔄`,
        type: 'reorder_confirmation',
        orderData: {
          restaurant: lastOrder.restaurant,
          items: context.currentCart,
          total: total
        },
        actions: ['Confirm Reorder', 'Modify Order', 'Different Restaurant']
      };
    } catch (error) {
      console.error('Reorder error:', error);
      return this.getErrorResponse();
    }
  }

  // Handle quick order (based on preferences and time)
  async handleQuickOrder(userId, context, entities) {
    try {
      console.log('⚡ Handling quick order...');
      
      const quickRecommendations = await this.getQuickRecommendations(userId, entities);
      
      if (quickRecommendations.length === 0) {
        return await this.startOrderProcess(userId, context);
      }

      context.orderState = ORDER_STATES.SELECTING_RESTAURANT;

      return {
        message: "Here are some quick options perfect for you right now! ⚡",
        type: 'quick_recommendations',
        restaurants: quickRecommendations.slice(0, 3),
        suggestions: ['Order from first option', 'See all restaurants', 'Something specific']
      };
    } catch (error) {
      console.error('Quick order error:', error);
      return await this.startOrderProcess(userId, context);
    }
  }

  // Handle budget order
  async handleBudgetOrder(userId, context, entities) {
    try {
      console.log('💰 Handling budget order...');
      
      const budget = entities.budget || 500;
      const budgetRestaurants = await Restaurant.find({
        isActive: true,
        priceRange: { $in: ['Budget', 'Moderate'] }
      }).limit(3);

      if (budgetRestaurants.length === 0) {
        return await this.startOrderProcess(userId, context);
      }

      context.orderState = ORDER_STATES.SELECTING_RESTAURANT;

      return {
        message: `Perfect! Here are some great budget-friendly options under Rs. ${budget}! 💰\n\n${this.formatRestaurants(budgetRestaurants)}`,
        type: 'budget_recommendations',
        restaurants: budgetRestaurants,
        suggestions: ['Cheapest option', 'Best value', 'Show all restaurants']
      };
    } catch (error) {
      console.error('Budget order error:', error);
      return await this.startOrderProcess(userId, context);
    }
  }

  // Handle healthy order
  async handleHealthyOrder(userId, context) {
    try {
      console.log('🥗 Handling healthy order...');
      
      const healthyRestaurants = await Restaurant.find({
        isActive: true,
        $or: [
          { cuisine: /salad/i },
          { cuisine: /healthy/i },
          { name: /fresh/i }
        ]
      }).limit(3);

      if (healthyRestaurants.length === 0) {
        return await this.startOrderProcess(userId, context);
      }

      context.orderState = ORDER_STATES.SELECTING_RESTAURANT;

      return {
        message: "Great choice for healthy eating! 🥗 Here are some healthy options:",
        type: 'healthy_recommendations',
        restaurants: healthyRestaurants,
        suggestions: ['Salads', 'Grilled items', 'Show all restaurants']
      };
    } catch (error) {
      console.error('Healthy order error:', error);
      return await this.startOrderProcess(userId, context);
    }
  }

  // Continue order flow - enhanced version
  async continueOrderFlow(message, userId, context) {
    switch (context.orderState) {
      case ORDER_STATES.SELECTING_RESTAURANT:
        return await this.handleRestaurantSelection(message, userId, context);
      
      case ORDER_STATES.VIEWING_MENU:
        return await this.handleMenuSelection(message, userId, context);
      
      case ORDER_STATES.BUILDING_CART:
        return await this.handleCartManagement(message, userId, context);
      
      case ORDER_STATES.COLLECTING_ADDRESS:
        return await this.handleAddressCollection(message, userId, context);
      
      case ORDER_STATES.CONFIRMING_ORDER:
        return await this.handleOrderConfirmation(message, userId, context);
      
      case ORDER_STATES.SELECTING_PAYMENT:
        return await this.handlePaymentSelection(message, userId, context);
      
      default:
        return await this.handleGeneralChat(message, userId, context);
    }
  }

  // Add missing functions
  async handleRestaurantSelection(message, userId, context) {
    return {
      message: "I'm still learning restaurant selection! For now, you can click on restaurant cards in the main app. What would you like to do? 🏪",
      type: 'restaurant_selection',
      suggestions: ['Browse restaurants', 'Start over', 'Help']
    };
  }

  async handleMenuSelection(message, userId, context) {
    return {
      message: "I'm still learning menu selection! You can browse menus in the main app. What would you like to do? 🍽️",
      type: 'menu_selection',
      suggestions: ['Browse menu', 'Start over', 'Help']
    };
  }

  async handleCartManagement(message, userId, context) {
    return {
      message: "I'm still learning cart management! You can manage your cart in the main app. What would you like to do? 🛒",
      type: 'cart_management',
      suggestions: ['View cart', 'Start over', 'Help']
    };
  }

  async handleAddressCollection(message, userId, context) {
    return {
      message: "I'm still learning address collection! You can enter your address in the checkout. What would you like to do? 📍",
      type: 'address_collection',
      suggestions: ['Proceed to checkout', 'Start over', 'Help']
    };
  }

  async handleOrderConfirmation(message, userId, context) {
    return {
      message: "I'm still learning order confirmation! You can confirm your order in the main app. What would you like to do? ✅",
      type: 'order_confirmation',
      suggestions: ['Confirm order', 'Start over', 'Help']
    };
  }

  async handlePaymentSelection(message, userId, context) {
    return {
      message: "I'm still learning payment selection! You can choose payment method in checkout. What would you like to do? 💳",
      type: 'payment_selection',
      suggestions: ['Proceed to payment', 'Start over', 'Help']
    };
  }

  // Handle general chat when not in order flow
  async handleGeneralChat(message, userId, context) {
    const responses = [
      "Hello! I'm your AI food assistant. I can help you order food, find restaurants, or reorder your favorites! 🤖",
      "Hi there! Ready for some amazing food? 😋 I can help you find restaurants, reorder your favorites, or discover new dishes!",
      "Welcome! I'm here to make ordering food super easy! 🍕 What can I help you with today?"
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      message: randomResponse,
      type: 'general',
      suggestions: ['I want to order food', 'Show restaurants', 'Order my usual', 'Help'],
      actions: ['Start Order', 'Browse Restaurants', 'Reorder']
    };
  }

  // Get quick recommendations
  async getQuickRecommendations(userId, entities) {
    try {
      const filters = { isActive: true };
      
      if (entities.cuisines && entities.cuisines.length > 0) {
        filters.cuisine = { $in: entities.cuisines };
      }

      return await Restaurant.find(filters)
        .sort({ rating: -1 })
        .limit(3);
    } catch (error) {
      console.error('Quick recommendations error:', error);
      return [];
    }
  }

  // Helper methods
  formatCartItems(cartItems) {
    return cartItems.map(item => 
      `• ${item.menuItem.name} x${item.quantity} - Rs. ${item.price * item.quantity}`
    ).join('\n');
  }

  formatRestaurants(restaurants) {
    return restaurants.map((restaurant, index) => 
      `${index + 1}. 🏪 ${restaurant.name} (⭐ ${restaurant.rating || 'N/A'}) - ${restaurant.deliveryTime || '30-45 mins'}`
    ).join('\n');
  }

  getErrorResponse() {
    return {
      message: "I'm having trouble processing that right now. Let me help you in a different way! What would you like to do? 🤖",
      type: 'error',
      suggestions: ['Order food', 'Show restaurants', 'Help', 'Start over'],
      actions: ['Try Again', 'Main Menu']
    };
  }

  // Helper methods for API endpoints
  async confirmReorder(userId, orderData) {
    try {
      return {
        message: "Processing your reorder... Please provide your delivery address or use your saved address! 📍",
        type: 'address_needed',
        orderData: orderData,
        actions: ['Use Saved Address', 'Enter New Address']
      };
    } catch (error) {
      return this.getErrorResponse();
    }
  }

  async getPersonalizedSuggestions(userId) {
    try {
      const suggestions = [
        "🍕 Order your favorite",
        "⚡ Quick lunch options", 
        "💰 Budget-friendly meals",
        "🌶️ Spicy food recommendations"
      ];
      
      return suggestions;
    } catch (error) {
      return ["Order food", "Show restaurants"];
    }
  }
}

// MAKE SURE THIS EXPORT IS EXACTLY HERE
module.exports = EnhancedChatbotService;