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

// ===== NEW: DYNAMIC FOOD DETECTION SYSTEM =====
class FoodDetectionEngine {
  constructor() {
    this.foodTermsCache = null;
    this.lastCacheUpdate = null;
    this.cacheValidityMs = 30 * 60 * 1000; // Cache for 30 minutes
  }

  // Build comprehensive food terms from actual menu data
  async buildFoodTermsFromMenu() {
    try {
      console.log('🔍 Building dynamic food terms from menu...');
      
      // Get all menu items and restaurants
      const [menuItems, restaurants] = await Promise.all([
        MenuItem.find({ isAvailable: true }),
        Restaurant.find({ isActive: true })
      ]);

      const foodTerms = new Set();
      const foodToRestaurants = {};

      // Extract terms from menu items
      menuItems.forEach(item => {
        const terms = this.extractFoodTerms(item.name);
        terms.forEach(term => {
          foodTerms.add(term);
          if (!foodToRestaurants[term]) {
            foodToRestaurants[term] = new Set();
          }
          foodToRestaurants[term].add(item.restaurant.toString());
        });

        // Also add category terms
        if (item.category) {
          const categoryTerms = this.extractFoodTerms(item.category);
          categoryTerms.forEach(term => {
            foodTerms.add(term);
            if (!foodToRestaurants[term]) {
              foodToRestaurants[term] = new Set();
            }
            foodToRestaurants[term].add(item.restaurant.toString());
          });
        }
      });

      // Extract terms from restaurant cuisines
      restaurants.forEach(restaurant => {
        if (restaurant.cuisine) {
          restaurant.cuisine.forEach(cuisine => {
            const terms = this.extractFoodTerms(cuisine);
            terms.forEach(term => {
              foodTerms.add(term);
              if (!foodToRestaurants[term]) {
                foodToRestaurants[term] = new Set();
              }
              foodToRestaurants[term].add(restaurant._id.toString());
            });
          });
        }
      });

      // Convert Sets to Arrays for easier processing
      Object.keys(foodToRestaurants).forEach(term => {
        foodToRestaurants[term] = Array.from(foodToRestaurants[term]);
      });

      console.log(`✅ Built ${foodTerms.size} food terms from menu data`);
      
      return {
        terms: Array.from(foodTerms),
        termToRestaurants: foodToRestaurants,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('❌ Error building food terms:', error);
      return {
        terms: ['pizza', 'burger', 'biryani'], // Fallback
        termToRestaurants: {},
        lastUpdated: new Date()
      };
    }
  }

  // Extract meaningful food terms from text
  extractFoodTerms(text) {
    if (!text) return [];

    const terms = [];
    const cleaned = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Split into words and filter meaningful terms
    const words = cleaned.split(' ');
    
    words.forEach(word => {
      // Skip common non-food words
      if (this.isValidFoodTerm(word)) {
        terms.push(word);
      }
    });

    // Also add the full phrase if it's short
    if (words.length <= 3 && words.length > 1) {
      const phrase = words.join(' ');
      if (this.isValidFoodTerm(phrase)) {
        terms.push(phrase);
      }
    }

    return terms;
  }

  // Check if a term is likely a food term
  isValidFoodTerm(term) {
    if (!term || term.length < 3) return false;

    const excludeWords = [
      'the', 'and', 'with', 'for', 'per', 'piece', 'pcs', 'pieces',
      'single', 'double', 'large', 'medium', 'small', 'regular',
      'fresh', 'special', 'delicious', 'tasty', 'served', 'cooked',
      'style', 'classic', 'traditional', 'spicy', 'mild', 'hot',
      'restaurant', 'food', 'delivery', 'order', 'menu'
    ];

    return !excludeWords.includes(term.toLowerCase());
  }

  // Get cached food terms or build new ones
  async getFoodTerms() {
    const now = new Date();
    
    // Check if cache is valid
    if (this.foodTermsCache && 
        this.lastCacheUpdate && 
        (now - this.lastCacheUpdate) < this.cacheValidityMs) {
      return this.foodTermsCache;
    }

    // Build new cache
    this.foodTermsCache = await this.buildFoodTermsFromMenu();
    this.lastCacheUpdate = now;
    
    return this.foodTermsCache;
  }

  // Detect food terms in user message
  async detectFoodInMessage(message) {
    try {
      const foodData = await this.getFoodTerms();
      const lowerMessage = message.toLowerCase();
      const detectedFoods = [];

      // Check each food term
      foodData.terms.forEach(term => {
        if (lowerMessage.includes(term.toLowerCase())) {
          detectedFoods.push({
            term: term,
            restaurants: foodData.termToRestaurants[term] || []
          });
        }
      });

      // Sort by specificity (longer terms first)
      detectedFoods.sort((a, b) => b.term.length - a.term.length);

      console.log(`🔍 Detected foods in "${message}":`, detectedFoods.map(f => f.term));

      return detectedFoods;

    } catch (error) {
      console.error('❌ Food detection error:', error);
      return [];
    }
  }

  // Find restaurants that serve detected foods
  async findRestaurantsForFood(detectedFoods, limit = 5) {
    try {
      if (detectedFoods.length === 0) return [];

      // Get all unique restaurant IDs
      const restaurantIds = new Set();
      detectedFoods.forEach(food => {
        food.restaurants.forEach(id => restaurantIds.add(id));
      });

      if (restaurantIds.size === 0) return [];

      // Fetch restaurants
      const restaurants = await Restaurant.find({
        _id: { $in: Array.from(restaurantIds) },
        isActive: true
      }).limit(limit);

      // Sort by relevance (restaurants that serve more of the requested foods)
      return restaurants.sort((a, b) => {
        const aScore = detectedFoods.reduce((score, food) => {
          return score + (food.restaurants.includes(a._id.toString()) ? 1 : 0);
        }, 0);
        const bScore = detectedFoods.reduce((score, food) => {
          return score + (food.restaurants.includes(b._id.toString()) ? 1 : 0);
        }, 0);
        return bScore - aScore;
      });

    } catch (error) {
      console.error('❌ Error finding restaurants for food:', error);
      return [];
    }
  }
}

// ===== ENHANCED CHATBOT WITH DYNAMIC FOOD DETECTION =====
class EnhancedChatbotService {
  constructor() {
    this.foodDetection = new FoodDetectionEngine();
    console.log('🤖 Enhanced Chatbot Service initialized with dynamic food detection');
  }

  // Helper function to check if string is valid ObjectId
  isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  }

  // ===== UPDATED MAIN CHATBOT RESPONSE METHOD =====
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
      
      // ===== NEW: DYNAMIC FOOD DETECTION =====
      const detectedFoods = await this.foodDetection.detectFoodInMessage(message);
      
      // Detect user intent with enhanced food detection
      const intent = await this.detectIntentWithFoodDetection(message, detectedFoods);
      console.log('🎯 Detected intent:', intent);

      // Handle different conversation flows
      let response;
      
      if (intent.hasFoodIntent && detectedFoods.length > 0) {
        response = await this.handleFoodOrderFlow(message, userId, context, detectedFoods);
      } else if (intent.isOrderIntent) {
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

  // ===== NEW: ENHANCED INTENT DETECTION WITH FOOD DETECTION =====
  async detectIntentWithFoodDetection(message, detectedFoods) {
    const lowerMessage = message.toLowerCase();
    const intent = {
      isOrderIntent: false,
      hasFoodIntent: false,
      isRestaurantSelect: false,
      isMenuRequest: false,
      type: null,
      confidence: 0,
      entities: {},
      detectedFoods: detectedFoods
    };

    // Check for special frontend messages
    if (message.startsWith('restaurant_selected:') || message.startsWith('add_item:')) {
      return intent;
    }

    // Food-specific intent (NEW)
    if (detectedFoods.length > 0) {
      const orderKeywords = ['want', 'order', 'get', 'buy', 'craving', 'hungry', 'deliver', 'chahiye', 'khana'];
      const hasOrderKeyword = orderKeywords.some(keyword => lowerMessage.includes(keyword));
      
      if (hasOrderKeyword || detectedFoods.length > 0) {
        intent.hasFoodIntent = true;
        intent.type = 'FOOD_ORDER';
        intent.confidence = 0.9;
        intent.entities.requestedFoods = detectedFoods.map(f => f.term);
        return intent;
      }
    }

    // Restaurant selection patterns
    const restaurantPatterns = ['pizza hut', 'mcdonalds', 'kfc', 'student biryani', 'subway', 'restaurant_selected:'];
    for (const pattern of restaurantPatterns) {
      if (lowerMessage.includes(pattern)) {
        intent.isRestaurantSelect = true;
        intent.type = 'RESTAURANT_SELECT';
        intent.entities.restaurantName = pattern;
        intent.confidence = 0.9;
        return intent;
      }
    }

    // Menu request patterns
    const menuPatterns = ['menu', 'show menu', 'what do they have', 'items', 'food items', 'view menu'];
    for (const pattern of menuPatterns) {
      if (lowerMessage.includes(pattern)) {
        intent.isMenuRequest = true;
        intent.type = 'MENU_REQUEST';
        intent.confidence = 0.8;
        return intent;
      }
    }

    // General order intent patterns
    const orderPatterns = ['order', 'buy', 'get food', 'hungry', 'delivery', 'bhook lagi', 'khana'];
    for (const pattern of orderPatterns) {
      if (lowerMessage.includes(pattern)) {
        intent.isOrderIntent = true;
        intent.type = 'ORDER_FOOD';
        intent.confidence = 0.7;
        break;
      }
    }

    // Extract other entities
    intent.entities = this.extractEntities(lowerMessage);

    return intent;
  }

  // ===== NEW: HANDLE FOOD-SPECIFIC ORDER FLOW =====
  async handleFoodOrderFlow(message, userId, context, detectedFoods) {
    try {
      console.log(`🍽️ Handling food order flow for: ${detectedFoods.map(f => f.term).join(', ')}`);
      
      // Find restaurants that serve the detected foods
      const restaurants = await this.foodDetection.findRestaurantsForFood(detectedFoods, 5);
      
      if (restaurants.length === 0) {
        return {
          message: `I'd love to help you order ${detectedFoods.map(f => f.term).join(' & ')}! However, I couldn't find any restaurants currently serving that. 😔\n\nHere are some popular alternatives:`,
          type: 'food_not_found',
          restaurants: await Restaurant.find({ isActive: true }).limit(3),
          suggestions: ['Show all restaurants', 'Popular items', 'Try different food'],
          actions: ['Browse Restaurants', 'Popular Items', 'Help Me Choose']
        };
      }

      // Set context
      context.orderState = ORDER_STATES.SELECTING_RESTAURANT;
      context.requestedFoods = detectedFoods.map(f => f.term);

      // Create personalized response based on detected foods
      const foodNames = detectedFoods.map(f => f.term).join(' & ');
      const responseMessage = this.generateFoodSpecificResponse(detectedFoods, restaurants);

      return {
        message: responseMessage,
        type: 'food_specific_restaurants',
        restaurants: restaurants,
        requestedFoods: detectedFoods.map(f => f.term),
        suggestions: restaurants.slice(0, 3).map(r => r.name),
        actions: ['Select Restaurant', 'Show Menu', 'Popular Items']
      };

    } catch (error) {
      console.error('Food order flow error:', error);
      return this.getErrorResponse();
    }
  }

  // ===== NEW: GENERATE FOOD-SPECIFIC RESPONSES =====
  generateFoodSpecificResponse(detectedFoods, restaurants) {
    const foodNames = detectedFoods.map(f => f.term).join(' & ');
    
    // Create contextual responses based on food type
    const responses = {
      wings: `🔥 Craving some delicious wings? Great choice! I found ${restaurants.length} restaurants that serve amazing wings:`,
      kebab: `🍢 Kebab lover! I found ${restaurants.length} restaurants known for their delicious kebabs:`,
      pasta: `🍝 Perfect! I found ${restaurants.length} restaurants that serve amazing pasta:`,
      rolls: `🌯 Rolls are a great choice! Here are ${restaurants.length} restaurants that make delicious rolls:`,
      sandwich: `🥪 Sandwich time! I found ${restaurants.length} restaurants with great sandwiches:`,
      noodles: `🍜 Noodle lover! Here are ${restaurants.length} restaurants with amazing noodles:`,
      default: `🍽️ Great choice! I found ${restaurants.length} restaurants that serve delicious ${foodNames}:`
    };

    // Find the most specific response
    for (const food of detectedFoods) {
      const foodTerm = food.term.toLowerCase();
      if (responses[foodTerm]) {
        return responses[foodTerm];
      }
    }

    return responses.default;
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
        isGuest: !this.isValidObjectId(userId),
        requestedFoods: [] // NEW: Track what user requested
      };
    } catch (error) {
      console.error('Error initializing user context:', error);
      return {
        orderState: ORDER_STATES.BROWSING,
        currentCart: [],
        messages: [],
        isGuest: true,
        requestedFoods: []
      };
    }
  }

  // Extract entities from user message
  extractEntities(message) {
    const entities = {};

    // Extract budget
    const budgetMatch = message.match(/under (?:rs\.?\s*)?(\d+)/i);
    if (budgetMatch) {
      entities.budget = parseInt(budgetMatch[1]);
    }

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
      
      // Get general restaurants if no specific food detected
      const restaurants = await Restaurant.find({ isActive: true }).limit(5);
      const responseMessage = `Great! I'd love to help you order some delicious food! 🍕\n\nHere are some popular restaurants:`;
      
      console.log(`📊 Found ${restaurants.length} restaurants`);

      if (restaurants.length === 0) {
        return {
          message: "I'd love to help you order food! However, no restaurants are currently available. Please try again later! 🏪",
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
  async getPersonalizedRecommendations(userId, options = {}) {
    try {
        console.log('🎯 Generating advanced recommendations for user:', userId);
        
        const {
            count = 6,
            includeNewRestaurants = true,
            diversityFactor = 0.3,
            contextualFactors = {}
        } = options;

        // Get user data and order history
        const [user, userOrders, allRestaurants] = await Promise.all([
            this.getUserProfile(userId),
            this.getUserOrderHistory(userId),
            Restaurant.find({ isActive: true })
        ]);

        console.log('📊 Data fetched:', {
            user: user?.name || 'Guest',
            ordersCount: userOrders.length,
            restaurantsCount: allRestaurants.length
        });

        if (allRestaurants.length === 0) {
            console.log('❌ No restaurants found');
            return [];
        }

        // **KEY FIX**: Create stronger user preferences based on actual data
        const enhancedUserProfile = this.createEnhancedUserProfile(user, userOrders);

        // Calculate scores with enhanced profile
        const recommendations = await Promise.all(
            allRestaurants.map(async (restaurant) => {
                const scores = await this.calculateEnhancedMultiFactorScore(
                    restaurant,
                    enhancedUserProfile,
                    userOrders,
                    contextualFactors
                );
                
                return {
                    restaurant,
                    ...scores,
                    finalScore: this.calculateWeightedScore(scores),
                    explanations: this.generateDetailedExplanations(scores, restaurant, enhancedUserProfile)
                };
            })
        );

        console.log('✅ Calculated scores for all restaurants');

        // Sort by final score
        let sortedRecommendations = recommendations
            .sort((a, b) => b.finalScore - a.finalScore);

        // Apply diversity filter
        if (diversityFactor > 0) {
            sortedRecommendations = this.applyDiversityFilter(
                sortedRecommendations,
                diversityFactor
            );
        }

        const finalRecommendations = sortedRecommendations.slice(0, count);
        
        console.log('🎉 Generated recommendations:', {
            count: finalRecommendations.length,
            topScores: finalRecommendations.slice(0, 3).map(r => ({
                name: r.restaurant.name,
                score: Math.round(r.finalScore * 100)
            }))
        });
        
        return finalRecommendations;

    } catch (error) {
        console.error('❌ Advanced recommendation error:', error);
        return this.getFallbackRecommendations(await Restaurant.find({ isActive: true }).limit(count), count);
    }
}

// **NEW METHOD**: Create enhanced user profile with stronger preferences
createEnhancedUserProfile(user, userOrders) {
    const profile = {
        id: user?._id || 'guest',
        name: user?.name || 'Guest',
        preferences: user?.preferences || {},
        orderHistory: userOrders,
        calculatedPreferences: {}
    };

    // Calculate preferences from order history
    if (userOrders.length > 0) {
        // Most ordered cuisines
        const cuisineFrequency = {};
        userOrders.forEach(order => {
            if (order.restaurant?.cuisine) {
                order.restaurant.cuisine.forEach(cuisine => {
                    cuisineFrequency[cuisine] = (cuisineFrequency[cuisine] || 0) + 1;
                });
            }
        });

        // Get top 3 cuisines
        profile.calculatedPreferences.topCuisines = Object.entries(cuisineFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cuisine]) => cuisine);

        // Most ordered restaurants
        const restaurantFrequency = {};
        userOrders.forEach(order => {
            if (order.restaurant?._id) {
                const id = order.restaurant._id.toString();
                restaurantFrequency[id] = (restaurantFrequency[id] || 0) + 1;
            }
        });

        profile.calculatedPreferences.favoriteRestaurants = Object.entries(restaurantFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id);

        // Average order value
        const totalSpent = userOrders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
        profile.calculatedPreferences.averageOrderValue = totalSpent / userOrders.length;

        // Price preference
        if (profile.calculatedPreferences.averageOrderValue < 600) {
            profile.calculatedPreferences.pricePreference = 'Budget';
        } else if (profile.calculatedPreferences.averageOrderValue < 1200) {
            profile.calculatedPreferences.pricePreference = 'Moderate';
        } else {
            profile.calculatedPreferences.pricePreference = 'Premium';
        }

        // Order time patterns
        const orderHours = userOrders.map(order => new Date(order.createdAt).getHours());
        const avgOrderHour = orderHours.reduce((sum, hour) => sum + hour, 0) / orderHours.length;
        
        if (avgOrderHour < 11) profile.calculatedPreferences.preferredMealTime = 'breakfast';
        else if (avgOrderHour < 16) profile.calculatedPreferences.preferredMealTime = 'lunch';
        else profile.calculatedPreferences.preferredMealTime = 'dinner';
    }

    console.log('👤 Enhanced user profile:', {
        userId: profile.id,
        topCuisines: profile.calculatedPreferences.topCuisines || [],
        favoriteRestaurants: profile.calculatedPreferences.favoriteRestaurants?.length || 0,
        pricePreference: profile.calculatedPreferences.pricePreference || 'Unknown'
    });

    return profile;
}
async calculateEnhancedMultiFactorScore(restaurant, enhancedProfile, userOrders, contextualFactors) {
    try {
        const scores = {
            personalPreference: 0,
            collaborative: 0,
            contentBased: 0,
            temporal: 0,
            popularity: 0,
            debug: {}
        };

        // 1. ENHANCED Personal Preference Score
        scores.personalPreference = this.calculateEnhancedPersonalScore(restaurant, enhancedProfile);
        
        // 2. Content-Based Score (restaurant attributes)
        scores.contentBased = this.calculateEnhancedContentScore(restaurant, enhancedProfile);
        
        // 3. Popularity Score
        scores.popularity = await this.calculatePopularityScore(restaurant);
        
        // 4. Temporal Score
        scores.temporal = this.calculateTemporalScore(restaurant, contextualFactors.currentTime || new Date());
        
        // 5. Collaborative Score (simplified)
        scores.collaborative = await this.calculateCollaborativeScore(restaurant, enhancedProfile.user, userOrders);

        return scores;
        
    } catch (error) {
        console.error('❌ Enhanced score calculation error:', error);
        return {
            personalPreference: 0,
            collaborative: 0,
            contentBased: (restaurant.rating || 0) / 5,
            temporal: 0,
            popularity: (restaurant.rating || 0) / 5,
            debug: { error: error.message }
        };
    }
}

// **NEW METHOD**: Enhanced personal preference scoring
calculateEnhancedPersonalScore(restaurant, enhancedProfile) {
    let score = 0;
    const calc = enhancedProfile.calculatedPreferences;

    // Previous orders from this restaurant (STRONGEST signal)
    if (calc.favoriteRestaurants?.includes(restaurant._id.toString())) {
        score += 0.6; // 60% boost for previously ordered restaurants
    }

    // Cuisine preference match (STRONG signal)
    if (calc.topCuisines && restaurant.cuisine) {
        const cuisineMatches = restaurant.cuisine.filter(cuisine =>
            calc.topCuisines.some(topCuisine => 
                topCuisine.toLowerCase() === cuisine.toLowerCase()
            )
        ).length;
        
        if (cuisineMatches > 0) {
            score += 0.3 * (cuisineMatches / restaurant.cuisine.length);
        }
    }

    // Price preference match
    if (calc.pricePreference && restaurant.priceRange) {
        if (calc.pricePreference === restaurant.priceRange) {
            score += 0.2;
        } else if (
            (calc.pricePreference === 'Budget' && restaurant.priceRange === 'Moderate') ||
            (calc.pricePreference === 'Moderate' && ['Budget', 'Premium'].includes(restaurant.priceRange))
        ) {
            score += 0.1; // Partial match
        }
    }

    // User preferences from profile
    if (enhancedProfile.preferences?.preferredCuisines && restaurant.cuisine) {
        const prefMatches = restaurant.cuisine.filter(cuisine =>
            enhancedProfile.preferences.preferredCuisines.some(pref => 
                pref.toLowerCase().includes(cuisine.toLowerCase())
            )
        ).length;
        
        if (prefMatches > 0) {
            score += 0.2;
        }
    }

    return Math.min(score, 1.0);
}

// **NEW METHOD**: Enhanced content-based scoring
calculateEnhancedContentScore(restaurant, enhancedProfile) {
    let score = 0;

    // Rating score (normalized)
    score += (restaurant.rating || 0) / 5 * 0.4;

    // Delivery time preference (faster = better)
    const deliveryMinutes = this.parseDeliveryTime(restaurant.deliveryTime);
    if (deliveryMinutes <= 30) score += 0.2;
    else if (deliveryMinutes <= 45) score += 0.15;
    else if (deliveryMinutes <= 60) score += 0.1;

    // Minimum order compatibility
    const avgOrderValue = enhancedProfile.calculatedPreferences?.averageOrderValue || 600;
    if (restaurant.minimumOrder <= avgOrderValue * 0.8) {
        score += 0.15;
    } else if (restaurant.minimumOrder <= avgOrderValue) {
        score += 0.1;
    }

    // Delivery fee competitiveness
    const deliveryFee = restaurant.deliveryFee || 50;
    if (deliveryFee <= 50) score += 0.15;
    else if (deliveryFee <= 70) score += 0.1;
    else if (deliveryFee <= 100) score += 0.05;

    // Cuisine variety bonus
    if (restaurant.cuisine && restaurant.cuisine.length > 2) {
        score += 0.1;
    }

    return Math.min(score, 1.0);
}

// **NEW METHOD**: Better explanations
generateDetailedExplanations(scores, restaurant, enhancedProfile) {
    const explanations = [];
    const calc = enhancedProfile.calculatedPreferences;

    // Order history based explanations
    if (calc.favoriteRestaurants?.includes(restaurant._id.toString())) {
        explanations.push("❤️ One of your favorites");
    }

    // Cuisine match explanations
    if (calc.topCuisines && restaurant.cuisine) {
        const matchedCuisines = restaurant.cuisine.filter(cuisine =>
            calc.topCuisines.includes(cuisine)
        );
        if (matchedCuisines.length > 0) {
            explanations.push(`🍽️ You love ${matchedCuisines[0]}`);
        }
    }

    // Price match explanations
    if (calc.pricePreference === restaurant.priceRange) {
        explanations.push(`💰 Matches your ${restaurant.priceRange.toLowerCase()} preference`);
    }

    // Quality explanations
    if (scores.popularity > 0.7) {
        explanations.push("🔥 Trending & popular");
    }

    if ((restaurant.rating || 0) >= 4.5) {
        explanations.push("⭐ Highly rated");
    }

    // Delivery explanations
    const deliveryMinutes = this.parseDeliveryTime(restaurant.deliveryTime);
    if (deliveryMinutes <= 30) {
        explanations.push("⚡ Fast delivery");
    }

    // Time-based explanations
    if (scores.temporal > 0.3) {
        explanations.push("🕒 Perfect for this time");
    }

    // Default explanation
    if (explanations.length === 0) {
        explanations.push("💫 Recommended for you");
    }

    return explanations.slice(0, 3); // Max 3 explanations
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