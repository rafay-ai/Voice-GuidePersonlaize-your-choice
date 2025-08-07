// Updated Enhanced Chatbot Service - Restaurant Selection Fix
// backend/services/enhancedChatbot.js

const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Order = require('../models/Order');
const mongoose = require('mongoose');

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

// Intent detection patterns - UPDATED
const ORDER_INTENTS = {
  ORDER_FOOD: ['order', 'buy', 'get food', 'hungry', 'delivery', 'bhook lagi', 'khana', 'food', 'pizza', 'burger', 'biryani'],
  REORDER: ['usual', 'same as last time', 'repeat order', 'again', 'dobara'],
  RESTAURANT_SELECT: ['pizza hut', 'mcdonalds', 'kfc', 'student biryani', 'subway', 'restaurant_selected:'],
  MENU_REQUEST: ['menu', 'show menu', 'what do they have', 'items', 'food items', 'view menu'],
  ADD_TO_CART: ['add', 'i want', 'order this', 'take this', 'add_item:'],
  CHECKOUT: ['checkout', 'place order', 'confirm', 'done', 'finish']
};

class EnhancedChatbotService {
  constructor() {
    console.log('🤖 Enhanced Chatbot Service initialized');
  }

  // Helper function to check if string is valid ObjectId
  isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Main chatbot response method - UPDATED
  async getChatbotResponse(message, userId, sessionData = {}) {
    try {
      console.log(`💬 Processing message: "${message}" for user: ${userId}`);
      
      // Get or create user context
      if (!userContexts[userId]) {
        userContexts[userId] = await this.initializeUserContext(userId);
      }

      const context = userContexts[userId];
      
      // SPECIAL HANDLING FOR FRONTEND ACTIONS
      if (message.startsWith('restaurant_selected:')) {
        return await this.handleRestaurantFromFrontend(message, userId, context);
      }
      
      if (message.startsWith('add_item:')) {
        return await this.handleAddItemFromFrontend(message, userId, context);
      }
      
      // Detect user intent
      const intent = this.detectIntent(message);
      console.log('🎯 Detected intent:', intent);

      // Handle different conversation flows
      let response;
      
      if (intent.isOrderIntent) {
        response = await this.handleOrderFlow(message, userId, context, intent);
      } else if (intent.isRestaurantSelect) {
        response = await this.handleRestaurantSelection(message, userId, context);
      } else if (intent.isMenuRequest) {
        response = await this.handleMenuRequest(message, userId, context);
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

  // NEW: Handle restaurant selection from frontend cards
  async handleRestaurantFromFrontend(message, userId, context) {
    try {
      console.log('🏪 Handling restaurant selection from frontend...');
      
      const restaurantId = message.split(':')[1];
      const selectedRestaurant = await Restaurant.findById(restaurantId);
      
      if (!selectedRestaurant) {
        return {
          message: "Sorry, I couldn't find that restaurant. Let me show you available options.",
          type: 'restaurant_not_found',
          suggestions: ['Show all restaurants', 'Try again']
        };
      }

      // Update context
      context.selectedRestaurant = selectedRestaurant;
      context.orderState = ORDER_STATES.VIEWING_MENU;

      // Get menu items to show
      const menuItems = await MenuItem.find({ 
        restaurant: selectedRestaurant._id,
        isAvailable: true 
      }).limit(5);

      if (menuItems.length === 0) {
        return {
          message: `${selectedRestaurant.name} is currently not serving. Would you like to try a different restaurant?`,
          type: 'no_menu_available',
          suggestions: ['Different restaurant', 'Try again later']
        };
      }

      return {
        message: `🎉 Excellent choice! ${selectedRestaurant.name} is known for amazing ${selectedRestaurant.cuisine?.join(' & ')}!\n\nHere are some popular items:\n\n${this.formatMenuItems(menuItems.slice(0, 3))}\n\nWhat would you like to add to your cart?`,
        type: 'restaurant_selected_with_menu',
        restaurant: selectedRestaurant,
        menuItems: menuItems,
        suggestions: menuItems.slice(0, 3).map(item => `Add ${item.name}`),
        actions: ['Add to Cart', 'View Full Menu', 'Different Restaurant']
      };

    } catch (error) {
      console.error('Frontend restaurant selection error:', error);
      return this.getErrorResponse();
    }
  }

  // NEW: Handle add item from frontend
  async handleAddItemFromFrontend(message, userId, context) {
    try {
      console.log('➕ Handling add item from frontend...');
      
      const itemId = message.split(':')[1];
      const menuItem = await MenuItem.findById(itemId);
      
      if (!menuItem) {
        return {
          message: "Sorry, I couldn't find that item. Please try selecting another item.",
          type: 'item_not_found'
        };
      }

      // Add to cart
      const existingItem = context.currentCart.find(item => 
        item.menuItem._id.toString() === menuItem._id.toString()
      );

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        context.currentCart.push({
          menuItem: menuItem,
          quantity: 1,
          price: menuItem.price
        });
      }

      context.orderState = ORDER_STATES.BUILDING_CART;

      const cartTotal = context.currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        message: `✅ Added ${menuItem.name} to your cart!\n\n🛒 Current Cart:\n${this.formatCartItems(context.currentCart)}\n\n💰 Subtotal: Rs. ${cartTotal}\n\nWant to add more items or proceed to checkout?`,
        type: 'item_added_to_cart',
        cartItems: context.currentCart,
        cartTotal: cartTotal,
        suggestions: ['Add more items', 'Checkout now', 'View cart'],
        actions: ['Continue Shopping', 'Checkout', 'Remove Item']
      };

    } catch (error) {
      console.error('Frontend add item error:', error);
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

  // Enhanced intent detection - UPDATED
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    const intent = {
      isOrderIntent: false,
      isRestaurantSelect: false,
      isMenuRequest: false,
      type: null,
      confidence: 0,
      entities: {}
    };

    // Check for special frontend messages
    if (message.startsWith('restaurant_selected:') || message.startsWith('add_item:')) {
      return intent; // Let the main handler deal with these
    }

    // Check for restaurant selection
    for (const restaurant of ORDER_INTENTS.RESTAURANT_SELECT) {
      if (lowerMessage.includes(restaurant)) {
        intent.isRestaurantSelect = true;
        intent.type = 'RESTAURANT_SELECT';
        intent.entities.restaurantName = restaurant;
        intent.confidence = 0.9;
        return intent;
      }
    }

    // Check for menu requests
    for (const pattern of ORDER_INTENTS.MENU_REQUEST) {
      if (lowerMessage.includes(pattern)) {
        intent.isMenuRequest = true;
        intent.type = 'MENU_REQUEST';
        intent.confidence = 0.8;
        return intent;
      }
    }

    // Check for order intents
    for (const [intentType, patterns] of Object.entries(ORDER_INTENTS)) {
      if (intentType === 'RESTAURANT_SELECT' || intentType === 'MENU_REQUEST') continue;
      
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern)) {
          intent.isOrderIntent = true;
          intent.type = intentType;
          intent.confidence = 0.8;
          break;
        }
      }
      if (intent.isOrderIntent) break;
    }

    // Extract entities
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

    return entities;
  }

  // Handle order flow initiation - UPDATED
  async handleOrderFlow(message, userId, context, intent) {
    try {
      console.log(`🍕 Handling order flow, intent: ${intent.type}`);
      
      switch (intent.type) {
        case 'REORDER':
          return await this.handleReorder(userId, context);
        
        case 'ORDER_FOOD':
        default:
          return await this.startOrderProcess(userId, context, intent);
      }
    } catch (error) {
      console.error('Order flow error:', error);
      return this.getErrorResponse();
    }
  }

  // Start order process - UPDATED FOR CUISINE DETECTION
  async startOrderProcess(userId, context, intent) {
    try {
      console.log('🚀 Starting order process...');
      
      // Extract cuisine from message
      const message = context.lastMessage || '';
      const lowerMessage = message.toLowerCase();
      
      let restaurants;
      let responseMessage;
      
      // Check if user mentioned a specific cuisine
      if (lowerMessage.includes('pizza')) {
        restaurants = await Restaurant.find({ 
          isActive: true,
          cuisine: { $regex: 'pizza', $options: 'i' }
        }).limit(5);
        responseMessage = `🍕 Great! I found ${restaurants.length} restaurants for Pizza. Which one would you like to order from?`;
      } else if (lowerMessage.includes('burger')) {
        restaurants = await Restaurant.find({ 
          isActive: true,
          $or: [
            { cuisine: { $regex: 'burger', $options: 'i' } },
            { cuisine: { $regex: 'fast food', $options: 'i' } }
          ]
        }).limit(5);
        responseMessage = `🍔 Perfect! I found ${restaurants.length} restaurants for Burgers. Which one would you like to order from?`;
      } else if (lowerMessage.includes('biryani')) {
        restaurants = await Restaurant.find({ 
          isActive: true,
          $or: [
            { cuisine: { $regex: 'biryani', $options: 'i' } },
            { cuisine: { $regex: 'pakistani', $options: 'i' } }
          ]
        }).limit(5);
        responseMessage = `🍛 Excellent choice! I found ${restaurants.length} restaurants for Biryani. Which one would you like to order from?`;
      } else {
        // General restaurants
        restaurants = await Restaurant.find({ isActive: true }).limit(5);
        responseMessage = `Great! I'd love to help you order some delicious food! 🍕\n\nHere are some popular restaurants:`;
      }
      
      console.log(`📊 Found ${restaurants.length} restaurants`);

      if (restaurants.length === 0) {
        return {
          message: "I'd love to help you order food! However, no restaurants are currently available for that cuisine. Please try again later! 🏪",
          type: 'no_restaurants',
          suggestions: ['Try different cuisine', 'Show all restaurants', 'Contact support']
        };
      }

      context.orderState = ORDER_STATES.SELECTING_RESTAURANT;

      return {
        message: responseMessage,
        type: 'restaurant_selection',
        restaurants: restaurants,
        suggestions: restaurants.slice(0, 3).map(r => r.name),
        actions: ['Select Restaurant', 'Show Menu', 'Popular Items']
      };
    } catch (error) {
      console.error('Start order process error:', error);
      return this.getErrorResponse();
    }
  }

  // Handle restaurant selection - UPDATED
  async handleRestaurantSelection(message, userId, context) {
    try {
      console.log('🏪 Handling restaurant selection...');
      
      const lowerMessage = message.toLowerCase();
      
      // Try to find restaurant by name
      let selectedRestaurant = null;
      
      // Check if it's a number selection
      const numberMatch = message.match(/^(\d+)$/);
      if (numberMatch) {
        const index = parseInt(numberMatch[1]) - 1;
        const restaurants = await Restaurant.find({ isActive: true }).limit(10);
        if (index >= 0 && index < restaurants.length) {
          selectedRestaurant = restaurants[index];
        }
      } else {
        // Find by name (more flexible matching)
        const restaurants = await Restaurant.find({ isActive: true });
        selectedRestaurant = restaurants.find(r => {
          const restaurantNameLower = r.name.toLowerCase();
          return restaurantNameLower.includes(lowerMessage) ||
                 lowerMessage.includes(restaurantNameLower.split(' ')[0]) ||
                 (lowerMessage.includes('pizza hut') && restaurantNameLower.includes('pizza hut')) ||
                 (lowerMessage.includes('mcdonalds') && restaurantNameLower.includes('mcdonald')) ||
                 (lowerMessage.includes('kfc') && restaurantNameLower.includes('kfc'));
        });
      }

      if (!selectedRestaurant) {
        const restaurants = await Restaurant.find({ isActive: true }).limit(5);
        
        return {
          message: `I couldn't find that restaurant. Here are the available options:\n\n${this.formatRestaurantsList(restaurants)}\n\nPlease choose by saying the restaurant name or number.`,
          type: 'restaurant_not_found',
          restaurants: restaurants,
          suggestions: restaurants.slice(0, 3).map(r => r.name)
        };
      }

      // Restaurant selected successfully
      context.selectedRestaurant = selectedRestaurant;
      context.orderState = ORDER_STATES.VIEWING_MENU;

      // Get menu items
      const menuItems = await MenuItem.find({ 
        restaurant: selectedRestaurant._id,
        isAvailable: true 
      }).limit(5);

      return {
        message: `🎉 Excellent choice! ${selectedRestaurant.name} is known for amazing ${selectedRestaurant.cuisine?.join(' & ')}!\n\nHere are some popular items:\n\n${this.formatMenuItems(menuItems.slice(0, 3))}\n\nWhat would you like to add to your cart?`,
        type: 'restaurant_selected_with_menu',
        restaurant: selectedRestaurant,
        menuItems: menuItems,
        suggestions: menuItems.slice(0, 3).map(item => `Add ${item.name}`),
        actions: ['Add to Cart', 'View Full Menu', 'Different Restaurant']
      };
      
    } catch (error) {
      console.error('Restaurant selection error:', error);
      return this.getErrorResponse();
    }
  }

  // Handle menu request - UPDATED
  async handleMenuRequest(message, userId, context) {
    try {
      console.log('📋 Handling menu request...');
      
      if (!context.selectedRestaurant) {
        return {
          message: "Please select a restaurant first! Which restaurant would you like to see the menu for?",
          type: 'no_restaurant_selected',
          suggestions: ['Pizza Hut Pakistan', 'McDonald\'s Pakistan', 'KFC Pakistan']
        };
      }

      // Get menu items
      const menuItems = await MenuItem.find({ 
        restaurant: context.selectedRestaurant._id,
        isAvailable: true 
      }).limit(10);

      if (menuItems.length === 0) {
        return {
          message: `Sorry, ${context.selectedRestaurant.name} doesn't have any menu items available right now. Would you like to try a different restaurant?`,
          type: 'no_menu_items',
          suggestions: ['Different restaurant', 'Try again later']
        };
      }

      context.orderState = ORDER_STATES.BUILDING_CART;

      return {
        message: `Here's the menu for ${context.selectedRestaurant.name}:\n\n${this.formatMenuItems(menuItems)}\n\nTo add items to your cart, just tell me what you want! For example: "Add Large Pizza" or "I want chicken burger"`,
        type: 'menu_displayed',
        menuItems: menuItems,
        restaurant: context.selectedRestaurant,
        suggestions: menuItems.slice(0, 3).map(item => `Add ${item.name}`),
        actions: ['Add to Cart', 'See More Items', 'Different Restaurant']
      };
      
    } catch (error) {
      console.error('Menu request error:', error);
      return this.getErrorResponse();
    }
  }

  // Continue order flow based on current state
  async continueOrderFlow(message, userId, context) {
    switch (context.orderState) {
      case ORDER_STATES.SELECTING_RESTAURANT:
        return await this.handleRestaurantSelection(message, userId, context);
      
      case ORDER_STATES.VIEWING_MENU:
        return await this.handleMenuRequest(message, userId, context);
      
      case ORDER_STATES.BUILDING_CART:
        return await this.handleCartManagement(message, userId, context);
      
      case ORDER_STATES.CONFIRMING_ORDER:
        return await this.handleOrderConfirmation(message, userId, context);
      
      default:
        return await this.handleGeneralChat(message, userId, context);
    }
  }

  // Handle cart management - IMPROVED
  async handleCartManagement(message, userId, context) {
    try {
      console.log('🛒 Handling cart management...');
      
      const lowerMessage = message.toLowerCase();
      
      // Check if user wants to add items
      if (lowerMessage.includes('add') || lowerMessage.includes('want') || lowerMessage.includes('order')) {
        return await this.handleAddToCart(message, userId, context);
      }
      
      // Check if user wants to checkout
      if (lowerMessage.includes('checkout') || lowerMessage.includes('done') || lowerMessage.includes('confirm')) {
        return await this.handleCheckout(message, userId, context);
      }
      
      // Default response for cart state
      return {
        message: `You're currently browsing ${context.selectedRestaurant?.name} menu. What would you like to add to your cart?\n\nCurrent cart: ${context.currentCart.length} items\n\nSay something like "Add chicken burger" or "I want biryani"`,
        type: 'cart_management',
        suggestions: ['Add item', 'View cart', 'Checkout', 'Back to menu']
      };
      
    } catch (error) {
      console.error('Cart management error:', error);
      return this.getErrorResponse();
    }
  }

  // Handle adding items to cart - UPDATED
  async handleAddToCart(message, userId, context) {
    try {
      console.log('➕ Adding item to cart...');
      
      if (!context.selectedRestaurant) {
        return {
          message: "Please select a restaurant first!",
          type: 'no_restaurant'
        };
      }

      // Get menu items for the restaurant
      const menuItems = await MenuItem.find({ 
        restaurant: context.selectedRestaurant._id,
        isAvailable: true 
      });

      // Try to match item from message
      const lowerMessage = message.toLowerCase();
      let matchedItem = null;
      let quantity = 1;

      // Extract quantity
      const quantityMatch = message.match(/(\d+)\s*x?\s*(.+)|(.+)\s*x?\s*(\d+)/i);
      if (quantityMatch) {
        quantity = parseInt(quantityMatch[1] || quantityMatch[4]) || 1;
      }

      // Find matching menu item (more flexible matching)
      matchedItem = menuItems.find(item => {
        const itemNameLower = item.name.toLowerCase();
        const cleanMessage = lowerMessage.replace(/add|want|order|\d+|x/g, '').trim();
        
        return itemNameLower.includes(cleanMessage) ||
               cleanMessage.includes(itemNameLower) ||
               itemNameLower.split(' ').some(word => cleanMessage.includes(word)) ||
               cleanMessage.split(' ').some(word => itemNameLower.includes(word));
      });

      if (!matchedItem) {
        const suggestions = menuItems.slice(0, 3).map(item => item.name);
        return {
          message: `I couldn't find that item. Here are some available options:\n\n${suggestions.map((name, i) => `${i+1}. ${name}`).join('\n')}\n\nTry saying "Add [item name]"`,
          type: 'item_not_found',
          suggestions: suggestions.map(name => `Add ${name}`)
        };
      }

      // Add to cart
      const existingItem = context.currentCart.find(item => 
        item.menuItem._id.toString() === matchedItem._id.toString()
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        context.currentCart.push({
          menuItem: matchedItem,
          quantity: quantity,
          price: matchedItem.price
        });
      }

      const cartTotal = context.currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        message: `✅ Added ${quantity}x ${matchedItem.name} to your cart!\n\n🛒 Current Cart:\n${this.formatCartItems(context.currentCart)}\n\n💰 Subtotal: Rs. ${cartTotal}\n\nWant to add more items or checkout?`,
        type: 'item_added',
        cartItems: context.currentCart,
        suggestions: ['Add more items', 'Checkout now', 'View full menu'],
        actions: ['Continue Shopping', 'Checkout', 'Remove Item']
      };

    } catch (error) {
      console.error('Add to cart error:', error);
      return this.getErrorResponse();
    }
  }

  // Handle checkout
  async handleCheckout(message, userId, context) {
    try {
      console.log('💳 Handling checkout...');
      
      if (!context.currentCart || context.currentCart.length === 0) {
        return {
          message: "Your cart is empty! Let me help you add some items first.",
          type: 'empty_cart',
          suggestions: ['Show menu', 'Popular items', 'Start over']
        };
      }

      context.orderState = ORDER_STATES.COLLECTING_ADDRESS;
      
      const cartTotal = context.currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = context.selectedRestaurant?.deliveryFee || 50;
      const total = cartTotal + deliveryFee;

      return {
        message: `Great! Let's checkout your order:\n\n${this.formatCartItems(context.currentCart)}\n\nSubtotal: Rs. ${cartTotal}\nDelivery: Rs. ${deliveryFee}\nTotal: Rs. ${total}\n\nTo complete your order, I need your delivery address. Please provide your address or say "use saved address" if you have one.`,
        type: 'checkout_summary',
        cartSummary: {
          items: context.currentCart,
          subtotal: cartTotal,
          deliveryFee: deliveryFee,
          total: total
        },
        suggestions: ['Use saved address', 'Enter new address', 'Modify cart'],
        actions: ['Provide Address', 'Edit Cart', 'Cancel Order']
      };

    } catch (error) {
      console.error('Checkout error:', error);
      return this.getErrorResponse();
    }
  }

  // Handle order confirmation
  async handleOrderConfirmation(message, userId, context) {
    try {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('confirm') || lowerMessage.includes('yes') || lowerMessage.includes('place order')) {
        context.orderState = ORDER_STATES.ORDER_PLACED;
        
        return {
          message: `🎉 Perfect! Your order has been confirmed!\n\nOrder Details:\n${this.formatCartItems(context.currentCart)}\n\nEstimated delivery: 30-45 minutes\n\nYou can track your order in the main app. Thank you for choosing ${context.selectedRestaurant?.name}!`,
          type: 'order_confirmed',
          orderData: {
            restaurant: context.selectedRestaurant,
            items: context.currentCart,
            status: 'confirmed'
          },
          actions: ['Track Order', 'Order Again', 'Rate Experience']
        };
      } else {
        return {
          message: "Would you like to confirm this order or make changes?",
          type: 'confirmation_pending',
          suggestions: ['Confirm order', 'Modify order', 'Cancel order']
        };
      }
      
    } catch (error) {
      console.error('Order confirmation error:', error);
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
          suggestions: ['Show restaurants', 'Pizza', 'Burgers', 'Biryani']
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

  // Handle general chat when not in order flow
  async handleGeneralChat(message, userId, context) {
    const responses = [
      "Hello! I'm your AI food assistant. I can help you order food, find restaurants, or reorder your favorites! 🤖\n\nTry saying 'I want pizza' or 'Order food'",
      "Hi there! Ready for some amazing food? 😋 I can help you find restaurants, reorder your favorites, or discover new dishes!\n\nJust say 'I want burgers' or 'Order biryani'",
      "Welcome! I'm here to make ordering food super easy! 🍕 What can I help you with today?\n\nTry: 'I'm hungry' or 'Show me pizza places'"
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      message: randomResponse,
      type: 'general',
      suggestions: ['I want pizza', 'Order burgers', 'Show restaurants', 'Order my usual'],
      actions: ['Start Order', 'Browse Restaurants', 'Reorder']
    };
  }

  // Helper methods
  formatCartItems(cartItems) {
    if (!cartItems || cartItems.length === 0) return "Empty cart";
    
    return cartItems.map(item => 
      `• ${item.menuItem.name} x${item.quantity} - Rs. ${item.price * item.quantity}`
    ).join('\n');
  }

  formatMenuItems(menuItems) {
    if (!menuItems || menuItems.length === 0) return "No items available";
    
    return menuItems.map((item, index) => 
      `${index + 1}. 🍽️ ${item.name}\n   💰 Rs. ${item.price} | ⏱️ ${item.preparationTime} mins\n   📝 ${item.description.substring(0, 60)}...`
    ).join('\n\n');
  }

  formatRestaurantsList(restaurants) {
    if (!restaurants || restaurants.length === 0) return "No restaurants available";
    
    return restaurants.map((restaurant, index) => 
      `${index + 1}. 🏪 ${restaurant.name}\n   ⭐ ${restaurant.rating || 'New'} | 🚚 ${restaurant.deliveryTime} | 💰 ${restaurant.priceRange}`
    ).join('\n\n');
  }

  getErrorResponse() {
    return {
      message: "I'm having trouble processing that right now. Let me help you in a different way! What would you like to do? 🤖",
      type: 'error',
      suggestions: ['Order food', 'Show restaurants', 'Help', 'Start over'],
      actions: ['Try Again', 'Main Menu']
    };
  }

  // API helper methods
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

module.exports = EnhancedChatbotService;