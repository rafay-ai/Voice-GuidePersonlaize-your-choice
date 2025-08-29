<<<<<<< HEAD
// frontend/src/App.js - PART 1: Imports, Constants, Helper Functions
import React, { useState, useEffect, useCallback } from 'react';
import AdminDashboard from './components/admin/AdminDashboard';
import OrderManagement from './components/admin/OrderManagement';
import RestaurantManagement from './components/admin/RestaurantManagement';
import UserAnalytics from './components/admin/UserAnalytics';
import dataManager from './components/shared/DataManager';
import './App.css';
=======
  // frontend/src/App.js - COMPLETE ENHANCED VERSION
  import React, { useState, useEffect, useCallback } from 'react';
  import AdminDashboard from './components/admin/AdminDashboard';
  import OrderManagement from './components/admin/OrderManagement';
  import RestaurantManagement from './components/admin/RestaurantManagement';
  import UserAnalytics from './components/admin/UserAnalytics';
  import dataManager from './components/shared/DataManager';
  import VoiceInput from './components/shared/VoiceInput';
  import VoiceOrderService from './services/voiceOrderService';
  import './App.css';
>>>>>>> bb8633207f371f8d94cc459334c28b317dee01f0

// ===== 1. ONBOARDING QUESTIONS =====
const onboardingQuestions = [
  {
    id: 1,
    question: "What's your favorite type of cuisine?",
    type: "multiple",
    options: ["Pakistani", "Chinese", "Fast Food", "Italian", "BBQ", "Healthy"],
    key: "cuisine"
  },
  {
    id: 2,
    question: "How spicy do you like your food?",
    type: "scale",
    options: ["1 - Very Mild", "2 - Mild", "3 - Medium", "4 - Spicy", "5 - Very Spicy"],
    key: "spiceLevel"
  },
  {
    id: 3,
    question: "Do you have any dietary restrictions?",
    type: "multiple",
    options: ["None", "Vegetarian", "Vegan", "Halal Only", "No Beef", "Allergies"],
    key: "dietary"
  },
  {
    id: 4,
    question: "What's your usual budget per meal?",
    type: "single",
    options: ["Under Rs. 500", "Rs. 500-1000", "Rs. 1000-1500", "Above Rs. 1500"],
    key: "budget"
  },
  {
    id: 5,
    question: "When do you usually order food?",
    type: "multiple",
    options: ["Breakfast", "Lunch", "Dinner", "Late Night", "Anytime"],
    key: "timing"
  }
];

// ===== 2. USER DATA MANAGEMENT FUNCTIONS =====
const getUserData = (userId) => {
  const userData = localStorage.getItem(`userData_${userId}`);
  if (userData) {
    return JSON.parse(userData);
  }
  
  return {
    preferences: {},
    orderHistory: [],
    favorites: [],
    ratings: {},
    behaviorData: {
      mostOrderedCuisine: null,
      averageOrderValue: 0,
      preferredOrderTime: null,
      totalOrders: 0,
      totalSpent: 0
    },
    feedback: []
  };
};

const saveUserData = (userId, userData) => {
  localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));
};

const updateUserPreferences = (userId, newPreferences) => {
  const userData = getUserData(userId);
  userData.preferences = { ...userData.preferences, ...newPreferences };
  saveUserData(userId, userData);
};

const addToUserOrderHistory = (userId, orderData, restaurants) => {
  const userData = getUserData(userId);
  
  const orderEntry = {
    id: orderData.id || `order_${Date.now()}`,
    restaurantId: orderData.restaurantId,
    restaurantName: orderData.restaurantName,
    items: orderData.items,
    total: orderData.total,
    date: new Date().toISOString(),
    status: orderData.status || 'completed',
    rating: null,
    feedback: null
  };
  
  userData.orderHistory.unshift(orderEntry);
  
  // Update behavior data
  userData.behaviorData.totalOrders += 1;
  userData.behaviorData.totalSpent += orderData.total;
  userData.behaviorData.averageOrderValue = userData.behaviorData.totalSpent / userData.behaviorData.totalOrders;
  
  // Track most ordered cuisine
  const cuisineCount = {};
  userData.orderHistory.forEach(order => {
    const restaurant = restaurants.find(r => r._id === order.restaurantId);
    if (restaurant && restaurant.cuisine) {
      restaurant.cuisine.forEach(cuisine => {
        cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1;
      });
    }
  });
  
  const mostOrdered = Object.entries(cuisineCount).sort((a, b) => b[1] - a[1])[0];
  if (mostOrdered) {
    userData.behaviorData.mostOrderedCuisine = mostOrdered[0];
  }
  
  saveUserData(userId, userData);
  return orderEntry;
};

const addUserRating = (userId, orderId, rating, feedback = '') => {
  const userData = getUserData(userId);
  
  const orderIndex = userData.orderHistory.findIndex(order => order.id === orderId);
  if (orderIndex !== -1) {
    userData.orderHistory[orderIndex].rating = rating;
    userData.orderHistory[orderIndex].feedback = feedback;
  }
  
  userData.ratings[orderId] = {
    rating,
    feedback,
    date: new Date().toISOString()
  };
  
  userData.feedback.push({
    orderId,
    rating,
    feedback,
    date: new Date().toISOString(),
    restaurantId: userData.orderHistory[orderIndex]?.restaurantId
  });
  
  saveUserData(userId, userData);
};

const addToUserFavorites = (userId, restaurantId) => {
  const userData = getUserData(userId);
  if (!userData.favorites.includes(restaurantId)) {
    userData.favorites.push(restaurantId);
    saveUserData(userId, userData);
  }
};

const removeFromUserFavorites = (userId, restaurantId) => {
  const userData = getUserData(userId);
  userData.favorites = userData.favorites.filter(id => id !== restaurantId);
  saveUserData(userId, userData);
};

// ===== 3. HELPER FUNCTION =====
const getPriceRangeDisplay = (priceRange) => {
  if (!priceRange) return 'Price not specified';
  
  const count = (priceRange.match(/₨|Rs/g) || []).length;
  
  switch(count) {
    case 1: return 'Budget';
    case 2: return 'Moderate';
    case 3: return 'Premium';
    case 4: return 'Luxury';
    default: return 'Moderate';
  }
};
  // ===== 4. ENHANCED RECOMMENDATION ENGINE =====
  // ===== 4. ENHANCED RECOMMENDATION ENGINE =====
const enhancedRecommendationEngineArrow = {
  getPersonalizedRecommendations: (userId, restaurants) => {
    const userData = getUserData(userId);
    const preferences = userData.preferences;
    const behaviorData = userData.behaviorData;
    const orderHistory = userData.orderHistory;
    
    if (restaurants.length === 0) return [];
    
    let scored = restaurants.map(restaurant => {
      let score = 0;
      
      // Base scoring from preferences
      if (preferences.cuisine && restaurant.cuisine) {
        const cuisineMatch = restaurant.cuisine.some(c => 
          preferences.cuisine.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase().includes(preferences.cuisine.toLowerCase())
        );
        if (cuisineMatch) score += 50;
      }
      
      // Behavior-based scoring
      if (behaviorData.mostOrderedCuisine && restaurant.cuisine) {
        const favoriteMatch = restaurant.cuisine.some(c => 
          c.toLowerCase().includes(behaviorData.mostOrderedCuisine.toLowerCase())
        );
        if (favoriteMatch) score += 40;
      }
      
      // Budget compatibility
      if (preferences.budget) {
        const budgetScore = enhancedRecommendationEngineArrow.getBudgetScore(preferences.budget, restaurant.priceRange);
        score += budgetScore;
      }
      
      // Order history boost
      const previousOrders = orderHistory.filter(order => order.restaurantId === restaurant._id);
      if (previousOrders.length > 0) {
        const avgRating = previousOrders
          .filter(order => order.rating)
          .reduce((sum, order) => sum + order.rating, 0) / previousOrders.filter(order => order.rating).length;
        
        if (avgRating >= 4) score += 35;
        else if (avgRating >= 3) score += 20;
        else if (avgRating < 3) score -= 20;
      }
      
      // Favorites boost
      if (userData.favorites.includes(restaurant._id)) {
        score += 60;
      }
      
      // Rating boost
      score += (restaurant.rating || 0) * 5;
      
      return { ...restaurant, score, personalizedReason: enhancedRecommendationEngineArrow.getRecommendationReason(restaurant, userData) };
    });
    
    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  },
  
  getRecommendationReason: (restaurant, userData) => {
    if (userData.favorites.includes(restaurant._id)) {
      return "Your favorite";
    }
<<<<<<< HEAD
    
    const previousOrders = userData.orderHistory.filter(order => order.restaurantId === restaurant._id);
    if (previousOrders.length > 0) {
      const avgRating = previousOrders
        .filter(order => order.rating)
        .reduce((sum, order) => sum + order.rating, 0) / previousOrders.filter(order => order.rating).length;
      
      if (avgRating >= 4) return "You loved this place";
      else if (avgRating >= 3) return "You enjoyed this before";
    }
    
    if (userData.behaviorData.mostOrderedCuisine && restaurant.cuisine?.includes(userData.behaviorData.mostOrderedCuisine)) {
      return `Your favorite: ${userData.behaviorData.mostOrderedCuisine}`;
    }
    
    return "Recommended for you";
  },
  
  getBudgetScore: (userBudget, restaurantPriceRange) => {
    const budgetMap = {
      "Under Rs. 500": 1,
      "Rs. 500-1000": 2,
      "Rs. 1000-1500": 3,
      "Above Rs. 1500": 4
=======
  };


  // ===== 6. MAIN APP COMPONENT =====
  function App() {
     console.log('🚀 App function called - starting render');
    // ===== ALL STATE VARIABLES =====
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [voiceOrderService] = useState(new VoiceOrderService());
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const [voiceResponse, setVoiceResponse] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [menu, setMenu] = useState([]);
    const [cart, setCart] = useState([]);
    const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [dynamicPricing, setDynamicPricing] = useState(null);
    const [pricingLoading, setPricingLoading] = useState(false);
    const [surgeStatus, setSurgeStatus] = useState(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isOnboardingActive, setIsOnboardingActive] = useState(false);
    const [enhancedRecommendations, setEnhancedRecommendations] = useState([]);
    const [showPersonalizedPage, setShowPersonalizedPage] = useState(false);
    const [loadingEnhancedRecs, setLoadingEnhancedRecs] = useState(false);
    const [showEnhancedRecs, setShowEnhancedRecs] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState({
      name: '',
      phone: '',
      area: '',
      street: '',
      instructions: ''
    });
    const [orderStatus, setOrderStatus] = useState(null);
    const [showOrderTracking, setShowOrderTracking] = useState(false);
    const [currentOrderStatus, setCurrentOrderStatus] = useState('confirmed');
    const [showAuth, setShowAuth] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [authForm, setAuthForm] = useState({
      name: '',
      email: '',
      password: '',
      phone: ''
    });
    const [showAdminDashboard, setShowAdminDashboard] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);
   
   
    
    const [allOrders] = useState([
      {
        id: 'ORD001',
        restaurant: 'Student Biryani',
        customer: 'Ahmed Khan',
        total: 450,
        status: 'Delivered',
        date: '2024-01-14',
        items: ['Chicken Biryani', 'Raita']
      },
      {
        id: 'ORD002', 
        restaurant: 'KFC Pakistan',
        customer: 'Fatima Ali',
        total: 210,
        status: 'Confirmed',
        date: '2024-01-14',
        items: ['Zinger Burger', 'Fries']
      }
    ]);
    // NEW STATE VARIABLES FOR ENHANCED USER SYSTEM
    const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
    const [userPreferences, setUserPreferences] = useState({});
    const [isTyping, setIsTyping] = useState(false);
    const [showUserProfile, setShowUserProfile] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedOrderForRating, setSelectedOrderForRating] = useState(null);
    const [currentRating, setCurrentRating] = useState(0);
    const [currentFeedback, setCurrentFeedback] = useState('');


    // Handle voice input result
const handleVoiceResult = async (transcript) => {
  console.log('🎤 Voice input received:', transcript);
  setIsProcessingVoice(true);
  
  try {
    // Process voice command locally
    const processed = voiceOrderService.processVoiceCommand(transcript, {
      selectedRestaurant,
      cartItems: cart,
      currentUser
    });
    
    console.log('🧠 Processed voice command:', processed);
    
    // Execute actions based on voice command
    await executeVoiceActions(processed.actions, processed);
    
    // Add voice message to chat
    const userMsg = {
      role: 'user',
      content: `🎤 ${transcript}`,
      isVoiceInput: true,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // Show AI response
    const botResponse = {
      role: 'bot',
      content: processed.response,
      timestamp: new Date().toLocaleTimeString(),
      voiceProcessed: true,
      confidence: processed.confidence,
      detectedIntent: processed.intent,
      // Add data for rendering
      restaurants: processed.actions?.some(a => a.type === 'SEARCH_RESTAURANTS') 
        ? restaurants.filter(r => r.cuisine?.some(c => 
            processed.entities?.foods?.some(f => 
              c.toLowerCase().includes(f.name.toLowerCase())
            )
          )).slice(0, 4)
        : [],
      suggestions: ['Order from these', 'Show more', 'Different cuisine']
    };
    
    setMessages(prev => [...prev, botResponse]);
    
    // If chat is not open, show voice response
    if (!showChat) {
      setVoiceResponse({
        message: processed.response,
        actions: processed.actions,
        timestamp: new Date()
      });
      
      setTimeout(() => setVoiceResponse(null), 5000);
    }
    
  } catch (error) {
    console.error('❌ Voice processing error:', error);
    
    // Fallback: send to regular chat system
    setInputMessage(transcript);
    if (showChat) {
      sendMessage();
    }
  } finally {
    setIsProcessingVoice(false);
  }
};

// Handle voice reorder
const handleVoiceReorder = async () => {
  if (!currentUser) {
    const loginMessage = {
      role: 'bot',
      content: 'Please login first to see your previous orders:',
      suggestions: ['Login', 'Create account', 'Browse restaurants'],
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, loginMessage]);
    setShowAuth(true);
    return;
  }

  const userData = getUserData(currentUser.id);
  
  if (userData.orderHistory && userData.orderHistory.length > 0) {
    const recentOrders = userData.orderHistory.slice(0, 3);
    
    const reorderMessage = {
      role: 'bot',
      content: `🔄 Here are your recent orders. Which one would you like to reorder?`,
      orderHistory: recentOrders,
      suggestions: ['Reorder this', 'Show more orders', 'New order instead'],
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, reorderMessage]);
  } else {
    const noOrdersMessage = {
      role: 'bot',
      content: 'You haven\'t placed any orders yet. Let me show you some great restaurants:',
      restaurants: restaurants.slice(0, 4),
      suggestions: ['Order from these', 'Show recommendations', 'Popular restaurants'],
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, noOrdersMessage]);
  }
};
// Execute actions based on voice commands
const executeVoiceActions = async (actions, processed) => {
  if (!actions || actions.length === 0) return;
  
  for (const action of actions) {
    console.log('🎯 Executing voice action:', action.type);
    
    switch (action.type) {
      case 'SEARCH_RESTAURANTS':
        await handleVoiceSearchRestaurants(action.payload);
        break;

      case 'SEARCH_RESTAURANTS_BY_CUISINE':
        await handleVoiceSearchByCuisine(action.payload);
        break;
        
      case 'ADD_TO_CART':
        await handleVoiceAddToCart(action.payload);
        break;
        
      case 'SHOW_CART':
        const cartSection = document.querySelector('.cart-section');
        if (cartSection) {
          cartSection.scrollIntoView({ behavior: 'smooth' });
        }
        break;
        
      case 'PLACE_ORDER':
        if (cart.length > 0) {
          setShowCheckout(true);
        } else {
          const emptyCartMessage = {
            role: 'bot',
            content: 'Your cart is empty. Let me show you some restaurants to order from:',
            restaurants: restaurants.slice(0, 4),
            suggestions: ['Order from these', 'Show recommendations', 'Popular items'],
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, emptyCartMessage]);
        }
        break;
        
      case 'SHOW_RECOMMENDATIONS':
        await handleVoiceShowRecommendations();
        break;

      case 'SHOW_POPULAR':
        await handleVoiceShowPopular();
        break;

      case 'SHOW_ORDER_HISTORY_FOR_REORDER':
        await handleVoiceReorder();
        break;
        
      case 'SHOW_ORDER_HISTORY':
        if (currentUser) {
          setShowUserProfile(true);
        } else {
          const loginMessage = {
            role: 'bot',
            content: 'Please login first to see your order history:',
            suggestions: ['Login', 'Create account', 'Browse as guest'],
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, loginMessage]);
          setShowAuth(true);
        }
        break;
        
      default:
        console.log('Unknown voice action:', action.type);
        break;
    }
  }
};
// Handle voice search by cuisine
const handleVoiceSearchByCuisine = async (payload) => {
  console.log('🍽️ Voice cuisine search:', payload);
  
  const { cuisine } = payload;
  
  if (cuisine && cuisine.length > 0) {
    const requestedCuisine = cuisine[0].toLowerCase();
    
    const filteredRestaurants = restaurants.filter(restaurant => {
      if (!restaurant.cuisine) return false;
      
      return restaurant.cuisine.some(c => {
        const cuisineLower = c.toLowerCase();
        
        // Enhanced cuisine matching
        if (requestedCuisine === 'italian') {
          return cuisineLower.includes('italian') || cuisineLower.includes('pizza');
        }
        if (requestedCuisine === 'chinese') {
          return cuisineLower.includes('chinese') || cuisineLower.includes('asian');
        }
        if (requestedCuisine === 'pakistani') {
          return cuisineLower.includes('pakistani') || cuisineLower.includes('desi') || cuisineLower.includes('traditional');
        }
        if (requestedCuisine === 'fast food') {
          return cuisineLower.includes('fast') || cuisineLower.includes('burger') || cuisineLower.includes('pizza');
        }
        if (requestedCuisine === 'bbq') {
          return cuisineLower.includes('bbq') || cuisineLower.includes('barbecue') || cuisineLower.includes('grilled');
        }
        
        return cuisineLower.includes(requestedCuisine) || requestedCuisine.includes(cuisineLower);
      });
    });
    
    console.log('🏪 Found cuisine restaurants:', filteredRestaurants.length);
    
    const cuisineMessage = {
      role: 'bot',
      content: `🍽️ Found ${filteredRestaurants.length} ${requestedCuisine} restaurants:`,
      restaurants: filteredRestaurants.slice(0, 6),
      suggestions: ['Order from these', 'Show more', 'Different cuisine', 'Popular items'],
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, cuisineMessage]);
    
    if (filteredRestaurants.length === 0) {
      const fallbackMessage = {
        role: 'bot',
        content: `Sorry, no ${requestedCuisine} restaurants found. Here are popular options:`,
        restaurants: restaurants.slice(0, 4),
        suggestions: ['Try these instead', 'Show all restaurants', 'Different cuisine'],
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, fallbackMessage]);
    }
  }
};



// Handle voice restaurant search
const handleVoiceSearchRestaurants = async (payload) => {
  console.log('🔍 Voice restaurant search:', payload);
  
  const { cuisine, restaurant } = payload;
  
  if (restaurant) {
    const foundRestaurant = restaurants.find(r => 
      r.name.toLowerCase().includes(restaurant.toLowerCase())
    );
    
    if (foundRestaurant) {
      selectRestaurant(foundRestaurant);
      return;
    }
  }
  
  if (cuisine && cuisine.length > 0) {
    const filteredRestaurants = restaurants.filter(restaurant =>
      restaurant.cuisine && restaurant.cuisine.some(c =>
        cuisine.some(requestedCuisine =>
          c.toLowerCase().includes(requestedCuisine.toLowerCase()) ||
          requestedCuisine.toLowerCase().includes(c.toLowerCase())
        )
      )
    );
    
    console.log('🏪 Found restaurants:', filteredRestaurants.length);
    
    if (filteredRestaurants.length === 1) {
      selectRestaurant(filteredRestaurants[0]);
    } else if (filteredRestaurants.length > 1) {
      // Show in chat
      const restaurantMessage = {
        role: 'bot',
        content: `Found ${filteredRestaurants.length} restaurants serving ${cuisine.join(', ')}:`,
        restaurants: filteredRestaurants.slice(0, 4),
        suggestions: ['Order from these', 'Show more', 'Different cuisine'],
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, restaurantMessage]);
    } else {
      const noResultsMessage = {
        role: 'bot',
        content: `No restaurants found serving ${cuisine.join(', ')}. Here are popular options:`,
        restaurants: restaurants.slice(0, 4),
        suggestions: ['Try these instead', 'Browse all restaurants'],
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, noResultsMessage]);
    }
  }
};
// Handle voice show recommendations
const handleVoiceShowRecommendations = async () => {
  if (!currentUser || currentUser.isAdmin) {
    const loginMessage = {
      role: 'bot',
      content: 'Please login to get personalized recommendations:',
      suggestions: ['Login', 'Create account', 'Show popular restaurants'],
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, loginMessage]);
    setShowAuth(true);
    return;
  }

  // Show recommendations in chat
  if (enhancedRecommendations && enhancedRecommendations.length > 0) {
    const recMessage = {
      role: 'bot',
      content: `🎯 Based on your taste profile, here are my top recommendations:`,
      type: 'enhanced_recommendations',
      recommendations: enhancedRecommendations.slice(0, 5),
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, recMessage]);
  } else {
    // Fetch recommendations
    try {
      await fetchEnhancedRecommendations(currentUser.id);
      
      // Wait a bit for the state to update, then show them
      setTimeout(() => {
        if (enhancedRecommendations && enhancedRecommendations.length > 0) {
          const recMessage = {
            role: 'bot',
            content: `🎯 Here are my personalized recommendations for you:`,
            type: 'enhanced_recommendations', 
            recommendations: enhancedRecommendations.slice(0, 5),
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, recMessage]);
        }
      }, 2000);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      
      const errorMessage = {
        role: 'bot',
        content: 'Having trouble getting your recommendations. Here are popular restaurants:',
        restaurants: restaurants.slice(0, 5),
        suggestions: ['Order from these', 'Try again later', 'Show all restaurants'],
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }
};

// Handle voice show popular
const handleVoiceShowPopular = async () => {
  // Get popular restaurants (highest rated)
  const popularRestaurants = restaurants
    .filter(r => r.rating && r.rating >= 4.0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6);

  const popularMessage = {
    role: 'bot',
    content: `🔥 Here are the most popular restaurants right now:`,
    restaurants: popularRestaurants,
    suggestions: ['Order from these', 'Show trending items', 'My recommendations'],
    timestamp: new Date().toLocaleTimeString()
  };
  
  setMessages(prev => [...prev, popularMessage]);
};
// Handle voice add to cart
const handleVoiceAddToCart = async (payload) => {
  console.log('🛒 Voice add to cart:', payload);
  
  if (!selectedRestaurant) {
    const selectRestaurantMessage = {
      role: 'bot',
      content: 'Please select a restaurant first! Here are some popular options:',
      restaurants: restaurants.slice(0, 4),
      suggestions: ['Select restaurant', 'Show all restaurants'],
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, selectRestaurantMessage]);
    return;
  }
  
  const { items } = payload;
  
  for (const voiceItem of items) {
    const menuItem = menu.find(item =>
      item.name.toLowerCase().includes(voiceItem.name.toLowerCase()) ||
      voiceItem.name.toLowerCase().includes(item.name.toLowerCase())
    );
    
    if (menuItem) {
      console.log('✅ Adding to cart:', menuItem.name);
      
      for (let i = 0; i < (voiceItem.quantity || 1); i++) {
        addToCart(menuItem);
      }
      
      const successMsg = {
        role: 'bot',
        content: `✅ Added ${voiceItem.quantity || 1}x ${menuItem.name} to your cart!`,
        timestamp: new Date().toLocaleTimeString(),
        suggestions: ['Add more items', 'View cart', 'Checkout now']
      };
      
      setMessages(prev => [...prev, successMsg]);
    } else {
      console.log('❌ Menu item not found:', voiceItem.name);
      
      const errorMsg = {
        role: 'bot',
        content: `❌ Sorry, I couldn't find "${voiceItem.name}" on the menu. Here are available items:`,
        menuItems: menu.slice(0, 3),
        timestamp: new Date().toLocaleTimeString(),
        suggestions: ['Try these items', 'Show full menu', 'Different restaurant']
      };
      
      setMessages(prev => [...prev, errorMsg]);
    }
  }
};

// Voice transcription handlers
const handleVoiceTranscriptionStart = () => {
  console.log('🎤 Voice transcription started');
  setIsProcessingVoice(true);
};

const handleVoiceTranscriptionEnd = () => {
  console.log('🛑 Voice transcription ended');
  setIsProcessingVoice(false);
};

// Toggle voice functionality
const toggleVoiceInput = () => {
  setIsVoiceEnabled(!isVoiceEnabled);
  if (!isVoiceEnabled) {
    console.log('🎤 Voice input enabled');
  } else {
    console.log('🔇 Voice input disabled');
  }
};

    // Function to fetch surge status
    const fetchSurgeStatus = async () => {
      try {
        const location = {
          type: 'Point',
          coordinates: [67.0011, 24.8607]
        };
        
        const response = await fetch('http://localhost:5000/api/pricing/surge-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location })
        });
        
        const data = await response.json();
        if (data.success) {
          setSurgeStatus(data.surgeStatus);
          console.log('🔥 Surge status:', data.surgeStatus);
        }
      } catch (error) {
        console.error('❌ Error fetching surge status:', error);
      }
>>>>>>> bb8633207f371f8d94cc459334c28b317dee01f0
    };
    
    const priceMap = {
      "Budget": 1,
      "Moderate": 2,
      "Premium": 3,
      "Luxury": 4
    };
    
    const userLevel = budgetMap[userBudget] || 2;
    const restLevel = priceMap[getPriceRangeDisplay(restaurantPriceRange)] || 2;
    
    return Math.max(0, 30 - Math.abs(userLevel - restLevel) * 10);
  }
};

// ===== 5. MAIN APP COMPONENT =====
function App() {
  console.log('App function called - starting render');
  
  // ===== ALL STATE VARIABLES =====
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [enhancedRecommendations, setEnhancedRecommendations] = useState([]);
  const [showPersonalizedPage, setShowPersonalizedPage] = useState(false);
  const [loadingEnhancedRecs, setLoadingEnhancedRecs] = useState(false);
  const [showEnhancedRecs, setShowEnhancedRecs] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    name: '',
    phone: '',
    area: '',
    street: '',
    instructions: ''
  });
  const [orderStatus, setOrderStatus] = useState(null);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState('confirmed');
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  const [allOrders] = useState([
    {
      id: 'ORD001',
      restaurant: 'Student Biryani',
      customer: 'Ahmed Khan',
      total: 450,
      status: 'Delivered',
      date: '2024-01-14',
      items: ['Chicken Biryani', 'Raita']
    },
    {
      id: 'ORD002', 
      restaurant: 'KFC Pakistan',
      customer: 'Fatima Ali',
      total: 210,
      status: 'Confirmed',
      date: '2024-01-14',
      items: ['Zinger Burger', 'Fries']
    }
  ]);
  
  // NEW STATE VARIABLES FOR ENHANCED USER SYSTEM
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [userPreferences, setUserPreferences] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState(null);
  const [currentRating, setCurrentRating] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState('');

  // ===== ENHANCED RECOMMENDATIONS FETCH FUNCTION =====
  const fetchEnhancedRecommendations = async (userId) => {
    console.log('Fetching enhanced recommendations for:', userId);
    setLoadingEnhancedRecs(true);
    
    try {
        let requestUserId = userId;
        
        if (!userId || userId === 'guest') {
            console.warn('No valid user ID provided, using guest recommendations');
            requestUserId = '6870bd22f7b37e4543eebd97';
        } else if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            console.warn('Invalid ObjectId format, using fallback');
            requestUserId = '6870bd22f7b37e4543eebd97';
        }
        
        const url = `http://localhost:5000/api/recommendations/advanced/${requestUserId}?count=6&includeNew=true`;
        console.log('Requesting recommendations from:', url);
        console.log('For user ID:', requestUserId);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API Response for user', requestUserId, ':', data);
        
        if (data.success && data.recommendations && data.recommendations.length > 0) {
            const validRecommendations = data.recommendations.filter((rec, index) => {
                const isValid = rec && 
                               typeof rec === 'object' && 
                               rec.name && 
                               typeof rec.name === 'string' &&
                               rec.name.trim().length > 0;
                
                if (!isValid) {
                    console.warn(`Invalid recommendation at index ${index}:`, rec);
                }
                return isValid;
            });
            
            console.log(`Valid recommendations for user ${requestUserId}:`, validRecommendations.length);
            setEnhancedRecommendations(validRecommendations);
            setShowEnhancedRecs(true);
        } else {
            console.log(`No recommendations for user ${requestUserId}`);
            setEnhancedRecommendations([]);
            setShowEnhancedRecs(true);
        }
    } catch (error) {
        console.error('Enhanced recommendations error:', error);
        setEnhancedRecommendations([]);
        setShowEnhancedRecs(true);
    } finally {
        setLoadingEnhancedRecs(false);
    }
};
 

    // ===== ANALYTICS FUNCTION =====
<<<<<<< HEAD
   // ===== ANALYTICS FUNCTION =====
  const fetchAnalytics = useCallback(() => {
    setTimeout(() => {
      const restaurantOrders = {};
      allOrders.forEach(order => {
        const restName = order.restaurant;
        restaurantOrders[restName] = (restaurantOrders[restName] || 0) + 1;
      });
      
      const statusCounts = {};
      allOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
    }, 1000);
  }, [allOrders]);
=======
    const fetchAnalytics = useCallback(() => {
      
      setTimeout(() => {
        const restaurantOrders = {};
        allOrders.forEach(order => {
          const restName = order.restaurant;
          restaurantOrders[restName] = (restaurantOrders[restName] || 0) + 1;
        });
        
        const statusCounts = {};
        allOrders.forEach(order => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        
      }, 1000);
    }, [allOrders]);

    // ===== useEffect HOOKS =====
    useEffect(() => {
      fetchRestaurants();
    }, []);

    useEffect(() => {
  // Initialize enhanced data manager when app loads
  dataManager.initializeData();
}, []);

useEffect(() => {
  console.log('🔄 New user effect triggered', {
    isNewUser,
    currentUser: currentUser?.name,
    showChat,
    isOnboardingActive,
    messagesLength: messages.length
  });
  
  // If it's a new user and chat is open but onboarding hasn't started
  if (isNewUser && showChat && currentUser && !isOnboardingActive && messages.length === 0) {
    console.log('🚀 Auto-starting onboarding from useEffect...');
    const timeoutId = setTimeout(() => {
      setIsOnboardingActive(true);
      setCurrentOnboardingStep(0);
      setUserPreferences({});
      
      const welcomeMessage = {
        role: 'bot',
        content: `Welcome to Pakistani Food Delivery, ${currentUser?.name || 'there'}! 🎉\n\nI'm your AI food assistant and I'll help you discover the perfect meals based on your preferences. Let's get to know your taste!`,
        isOnboarding: true,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages([welcomeMessage]);
      
      setTimeout(() => {
        if (isOnboardingActive && currentUser) {
          console.log('📝 Showing first onboarding question...');
          const firstQuestion = onboardingQuestions[0];
          
          const questionMessage = {
            role: 'bot',
            content: firstQuestion.question,
            isOnboarding: true,
            questionData: firstQuestion,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setMessages(prev => [...prev, questionMessage]);
        }
      }, 2000);
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }
}, [isNewUser, showChat, currentUser, isOnboardingActive, messages.length]);
>>>>>>> bb8633207f371f8d94cc459334c28b317dee01f0

  // ===== useEffect HOOKS =====
  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    // Initialize enhanced data manager when app loads
    dataManager.initializeData();
  }, []);

  useEffect(() => {
    console.log('New user effect triggered', {
      isNewUser,
      currentUser: currentUser?.name,
      showChat,
      isOnboardingActive,
      messagesLength: messages.length
    });
    
    // If it's a new user and chat is open but onboarding hasn't started
    if (isNewUser && showChat && currentUser && !isOnboardingActive && messages.length === 0) {
      console.log('Auto-starting onboarding from useEffect...');
      setTimeout(() => {
        startOnboarding();
      }, 1000);
    }
  }, [isNewUser, showChat, currentUser, isOnboardingActive, messages.length]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    console.log('User changed, checking for enhanced recommendations...', {
        user: currentUser?.name,
        isAdmin: currentUser?.isAdmin,
        userId: currentUser?.id,
        userIdLength: currentUser?.id?.length
    });
    
    // Always fetch recommendations for any logged-in non-admin user using THEIR actual ID
    if (currentUser && !currentUser.isAdmin && currentUser.id) {
        console.log('Fetching recommendations for actual user:', currentUser.id);
        fetchEnhancedRecommendations(currentUser.id);
    } else {
        console.log('Not fetching recommendations - no user or admin user');
        setEnhancedRecommendations([]);
        setShowEnhancedRecs(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // Save chat state to session storage
    if (selectedRestaurant) {
      sessionStorage.setItem('chatContext', JSON.stringify({
        restaurantId: selectedRestaurant._id,
        restaurantName: selectedRestaurant.name,
        cart: cart
      }));
    }
  }, [selectedRestaurant, cart]);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchAnalytics]);

  // ===== API FUNCTIONS =====
  const fetchRestaurants = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/restaurants');
      const data = await response.json();
      console.log('Fetched data:', data);
      
      // Handle both response formats
      if (Array.isArray(data)) {
        setRestaurants(data); // Direct array
      } else if (data.data && Array.isArray(data.data)) {
        setRestaurants(data.data); // Wrapped in data property
      } else {
        setRestaurants([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setRestaurants([]);
      setLoading(false);
    }
  };

  const fetchMenu = async (restaurantId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/menu/${restaurantId}`);
      const data = await response.json();
      
      if (data.success && data.items) {
        setMenu(data.items);
      } else {
        setMenu([]);
        alert(`No menu items found for this restaurant. Restaurant ID: ${restaurantId}`);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      setMenu([]);
      alert('Error loading menu. Please try again.');
    }
  };

  // ===== RESTAURANT AND CART FUNCTIONS =====
  const selectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    fetchMenu(restaurant._id);
    setShowChat(false);
  };

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem._id === item._id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = 50;
    return { subtotal, deliveryFee, total: subtotal + deliveryFee };
  };

    // ===== AUTH FUNCTIONS =====
  // ===== AUTH FUNCTIONS =====
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Admin login (keep existing logic)
    if (authForm.email === 'admin@food.pk' && authForm.password === 'admin123') {
      const adminUser = {
        id: 'admin_user',
        name: 'Admin',
        email: authForm.email,
        isAdmin: true
      };
      
      setCurrentUser(adminUser);
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      setShowAuth(false);
      setShowAdminDashboard(true);
      alert('Welcome Admin!');
      setAuthForm({ name: '', email: '', password: '', phone: '' });
      return;
    }
    
    // Test Users (keep existing logic)
    const testUsers = {
      'budget@test.com': {
        id: '6870bd22f7b37e4543eebd97',
        name: 'Ahmed Budget',
        description: 'Pakistani food lover, budget-conscious'
      },
      'kfc@test.com': {
        id: '6870bd84e75152da7d6afb6a', 
        name: 'Sara KFC Lover',
        description: 'Fast food enthusiast'
      },
      'pizza@test.com': {
        id: '6870be12f7b37e4543eebd99',
        name: 'Ali Pizza Fan', 
        description: 'Italian food lover, premium budget'
      },
      'chinese@test.com': {
        id: '6870be45f7b37e4543eebd9a',
        name: 'Li Wei',
        description: 'Chinese & Asian cuisine lover'
      },
      'healthy@test.com': {
        id: '6870be78f7b37e4543eebd9b',
        name: 'Ayesha Fitness',
        description: 'Health-conscious, vegetarian options'
      },
      'bbq@test.com': {
        id: '6870beabf7b37e4543eebd9c',
        name: 'Hassan BBQ King',
        description: 'BBQ & traditional Pakistani food lover'
      },
      'premium@test.com': {
        id: '6870beded7b37e4543eebd9d',
        name: 'Fatima Elite',
        description: 'Premium dining, continental cuisine'
      }
    };
    
    if (testUsers[authForm.email]) {
      const testUser = testUsers[authForm.email];
      const user = {
        id: testUser.id,
        name: testUser.name,
        email: authForm.email,
        phone: '0321-1234567',
        isAdmin: false,
        description: testUser.description
      };
      
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setShowAuth(false);
      alert(`Welcome back, ${user.name}!\n${user.description}`);
      setAuthForm({ name: '', email: '', password: '', phone: '' });
      return;
    }
    
    // REAL USER LOGIN VIA API
    try {
      console.log('Attempting login for:', authForm.email);
      
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password
        })
      });
      
      const data = await response.json();
      console.log('Login response:', data);
      
      if (data.success) {
        const user = {
          id: data.user.id, // Real MongoDB ObjectId
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          isAdmin: false
        };
        
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setShowAuth(false);
        alert(`Welcome back, ${user.name}!`);
        setAuthForm({ name: '', email: '', password: '', phone: '' });
        
      } else {
        console.error('Login failed:', data.message);
        alert(data.message || 'Invalid email or password.');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login. Please check your connection and try again.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (authForm.name && authForm.email && authForm.password && authForm.phone) {
      try {
        console.log('Creating new user in MongoDB...');
        
        // CREATE USER IN MONGODB VIA API
        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authForm.name,
            email: authForm.email,
            password: authForm.password,
            phone: authForm.phone
          })
        });
        
        const data = await response.json();
        console.log('User creation response:', data);
        
        if (data.success) {
          // USE THE REAL MONGODB USER
          const newUser = {
            id: data.user.id, // Real MongoDB ObjectId
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone,
            isAdmin: false,
            isNewUser: true
          };
          
          setCurrentUser(newUser);
          localStorage.setItem('currentUser', JSON.stringify(newUser));
          setShowAuth(false);
          setIsNewUser(true);
          
          console.log('User created successfully with ID:', newUser.id);
          alert(`Welcome ${newUser.name}! Your account has been created.`);
          setAuthForm({ name: '', email: '', password: '', phone: '' });
          
        } else {
          console.error('User creation failed:', data.message);
          alert(data.message || 'Failed to create account. Please try again.');
        }
        
      } catch (error) {
        console.error('Signup error:', error);
        alert('Failed to create account. Please check your connection and try again.');
      }
    }
  };

    // ===== ENHANCED CHATBOT FUNCTIONS =====
    // ===== ENHANCED CHATBOT FUNCTIONS =====
  const startOnboarding = () => {
    console.log('startOnboarding called', {
      isOnboardingActive,
      currentUser: currentUser?.name,
      isNewUser
    });
    
    if (isOnboardingActive) {
      console.log('Onboarding already in progress, skipping...');
      return;
    }
    
    if (!currentUser) {
      console.log('No current user, cannot start onboarding');
      return;
    }
    
    console.log('Starting onboarding process...');
    setIsOnboardingActive(true);
    setCurrentOnboardingStep(0);
    setUserPreferences({});
    
    // Clear previous messages and start fresh
    const welcomeMessage = {
      role: 'bot',
      content: `Welcome to Pakistani Food Delivery, ${currentUser?.name || 'there'}! I'm your AI food assistant and I'll help you discover the perfect meals based on your preferences. Let's get to know your taste!`,
      isOnboarding: true,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages([welcomeMessage]);
    
    // Show first question after welcome
    setTimeout(() => {
      if (isOnboardingActive && currentUser) {
        console.log('Showing first onboarding question...');
        showNextOnboardingQuestion();
      }
    }, 2000);
  };

  const showNextOnboardingQuestion = () => {
    if (!isOnboardingActive) {
      console.log('Onboarding not active, skipping question...');
      return;
    }
    
    if (currentOnboardingStep >= onboardingQuestions.length) {
      console.log('No more questions, completing onboarding...');
      completeOnboarding();
      return;
    }
    
    const question = onboardingQuestions[currentOnboardingStep];
    console.log('Showing question:', question.question, 'Step:', currentOnboardingStep + 1, '/', onboardingQuestions.length);
    
    setIsTyping(true);
    
    setTimeout(() => {
      if (isOnboardingActive && currentOnboardingStep < onboardingQuestions.length) {
        setIsTyping(false);
        
        setMessages(prev => {
          // Check if this exact question is already in the messages
          const hasThisQuestion = prev.some(msg => 
            msg.questionData && msg.questionData.id === question.id
          );
          
          if (hasThisQuestion) {
            console.log('This question already exists, skipping...');
            return prev;
          }
          
          console.log('Adding new question');
          return [...prev, {
            role: 'bot',
            content: question.question,
            isOnboarding: true,
            questionData: question,
            timestamp: new Date().toLocaleTimeString()
          }];
        });
      }
    }, 1000);
  };

  const handlePreferenceUpdate = () => {
    console.log('Starting preference update...');
    setShowUserProfile(false);
    setShowChat(true);
    
    // Complete reset with proper timing
    setIsOnboardingActive(false);
    setIsNewUser(false);
    setCurrentOnboardingStep(0);
    setUserPreferences({});
    setIsTyping(false);
    setMessages([]);
    
    // Start fresh onboarding after state has settled
    setTimeout(() => {
      console.log('Starting fresh preference update onboarding...');
      
      setIsOnboardingActive(true);
      setCurrentOnboardingStep(0);
      
      // Add welcome message
      const welcomeMessage = {
        role: 'bot',
        content: `Let's update your preferences, ${currentUser?.name}! I'll ask you a few questions to personalize your recommendations better.`,
        isOnboarding: true,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages([welcomeMessage]);
      
      // Show first question after welcome message
      setTimeout(() => {
        const firstQuestion = onboardingQuestions[0];
        
        const questionMessage = {
          role: 'bot',
          content: firstQuestion.question,
          isOnboarding: true,
          questionData: firstQuestion,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, questionMessage]);
        console.log('First question added for preference update');
      }, 1500);
      
    }, 300);
  };

  const handleOptionSelect = (option, questionKey) => {
    console.log('Option selected:', option, 'for key:', questionKey);
    console.log('Current step:', currentOnboardingStep);
    console.log('Total questions:', onboardingQuestions.length);
    
    if (!isOnboardingActive) {
      console.log('Onboarding not active, ignoring...');
      return;
    }
    
    // Add user's response to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: option,
      timestamp: new Date().toLocaleTimeString()
    }]);

    // Update preferences
    const newPrefs = { ...userPreferences, [questionKey]: option };
    setUserPreferences(newPrefs);
    console.log('Updated preferences:', newPrefs);
    
    const nextStep = currentOnboardingStep + 1;
    setCurrentOnboardingStep(nextStep);
    console.log('Moving to step:', nextStep);
    
    // Short delay before next question
    setTimeout(() => {
      if (nextStep < onboardingQuestions.length) {
        console.log(`Showing question ${nextStep + 1}/${onboardingQuestions.length}`);
        
        const nextQuestion = onboardingQuestions[nextStep];
        const questionMessage = {
          role: 'bot',
          content: nextQuestion.question,
          questionData: nextQuestion,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, questionMessage]);
      } else {
        console.log('All questions completed!');
        // Complete onboarding
        completeOnboarding(newPrefs);
      }
    }, 1000);
  };

  const completeOnboarding = (finalPreferences = userPreferences) => {
    if (!isOnboardingActive) {
      console.log('Onboarding not active, skipping completion...');
      return;
    }
    
    console.log('Completing onboarding with preferences:', finalPreferences);
    
    // Update user preferences in storage
    updateUserPreferences(currentUser.id, finalPreferences);
    
    // Reset onboarding state
    setIsNewUser(false);
    setIsOnboardingActive(false);
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const recommendations = enhancedRecommendationEngineArrow.getPersonalizedRecommendations(currentUser.id, restaurants);
      
      setMessages(prev => [...prev, {
        role: 'bot',
        content: `Perfect! I've successfully updated your preferences! Based on your updated taste profile, here are my top recommendations:`,
        recommendations: recommendations.length > 0 ? recommendations : restaurants.slice(0, 3),
        isOnboarding: false,
        quickReplies: ["Order now", "Show more restaurants", "View my profile"],
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      console.log('Preference update completed successfully!');
    }, 1000);
  };
  // Enhanced Recommendations Section Component
  const EnhancedRecommendationsSection = () => {
    console.log('EnhancedRecommendationsSection rendering...', {
        currentUser: currentUser?.name,
        recommendationsCount: enhancedRecommendations?.length || 0,
        loadingEnhancedRecs,
        showEnhancedRecs,
        recommendationsType: typeof enhancedRecommendations,
        isArray: Array.isArray(enhancedRecommendations),
        firstRecommendation: enhancedRecommendations?.[0]
    });

    // SAFETY CHECK: Ensure enhancedRecommendations is always an array
    const safeRecommendations = Array.isArray(enhancedRecommendations) ? enhancedRecommendations : [];

    // Show for logged-in non-admin users only
    if (!currentUser || currentUser.isAdmin) {
        console.log('No user or admin user, not showing enhanced recs');
        return null;
    }

    // Helper function to get match score color
    const getMatchScoreColor = (score) => {
        if (score >= 80) return '#27ae60';
        if (score >= 60) return '#f39c12';
        return '#e74c3c';
    };

    // Helper function to format explanations with icons
    const formatExplanation = (explanation) => {
        if (!explanation || typeof explanation !== 'string') return 'Recommended';
        
        const iconMap = {
            'Based on your preferences': '',
            'Popular choice': '', 
            'Highly rated': '',
            'Recommended for you': '',
            'New restaurant': '',
            'Fast delivery': '',
            'Matches your preferences': '',
            'Popular with similar users': '',
            'Perfect for this time': '',
            'Trending now': ''
        };
        
        for (const [key, icon] of Object.entries(iconMap)) {
            if (explanation.toLowerCase().includes(key.toLowerCase())) {
                return `${icon} ${explanation}`;
            }
        }
        return `${explanation}`;
    };

    return (
        <div className="enhanced-recommendations-section">
            {loadingEnhancedRecs ? (
                <>
                    <div className="enhanced-rec-header">
                        <h2>Crafting Your Perfect Menu</h2>
                        <p>Our AI is analyzing your taste profile...</p>
                        <div className="loading-stages">
                            <div className="stage active">Analyzing preferences</div>
                            <div className="stage">Finding matches</div>
                            <div className="stage">Ranking restaurants</div>
                        </div>
                    </div>
                    <div className="loading-placeholder">
                        <div className="loading-spinner"></div>
                        <p>Finding the perfect restaurants for you...</p>
                        <div className="loading-progress">
                            <div className="progress-bar"></div>
                        </div>
                    </div>
                </>
            ) : safeRecommendations.length === 0 ? (
                <>
                    <div className="enhanced-rec-header">
                        <h2>Your Personalized Dashboard</h2>
                        <p>Discover restaurants tailored just for you</p>
                    </div>
                    <div className="no-recommendations-state">
                        <div className="empty-state-animation">
                            <div className="empty-state-icon">🍽️</div>
                            <div className="sparkles">✨</div>
                        </div>
                        <h3>Building Your Taste Profile</h3>
                        <p>We're learning your preferences to provide amazing recommendations.</p>
                        <div className="empty-state-actions">
                            <button 
                                className="refresh-recommendations primary"
                                onClick={() => {
                                    console.log('Manual refresh clicked');
                                    fetchEnhancedRecommendations(currentUser.id);
                                }}
                            >
                                Get My Recommendations
                            </button>
                            <button 
                                className="setup-preferences secondary"
                                onClick={() => {
                                    setShowChat(true);
                                    setTimeout(() => startOnboarding(), 500);
                                }}
                            >
                                Set Up Preferences
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="enhanced-rec-header">
                        <h2>Personalized Just For You</h2>
                        <p>Based on your preferences and ordering history</p>
                        <div className="recommendation-stats">
                            <div className="stat">
                                <span className="stat-number">{safeRecommendations.length}</span>
                                <span className="stat-label">Perfect Matches</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">
                                    {safeRecommendations.length > 0 ? 
                                        Math.round(safeRecommendations.reduce((acc, rec) => {
                                            const score = rec?.matchPercentage || rec?.score || 0;
                                            return acc + (typeof score === 'number' ? score : 0);
                                        }, 0) / safeRecommendations.length) : 0
                                    }%
                                </span>
                                <span className="stat-label">Avg Match</span>
                            </div>
                        </div>
                        {loadingEnhancedRecs && <span className="loading-indicator">Updating...</span>}
                    </div>
                    
                    <div className="enhanced-rec-grid">
                        {safeRecommendations.slice(0, 6).map((rec, index) => {
                            // ULTRA SAFE PROCESSING
                            if (!rec || typeof rec !== 'object') {
                                console.warn('Skipping invalid recommendation at index:', index, rec);
                                return null;
                            }

                            const restaurantName = rec.name || rec.restaurant?.name || 'Unknown Restaurant';
                            const restaurantId = rec.id || rec._id || rec.restaurant?._id || `unknown_${index}`;
                            const cuisine = rec.cuisine || rec.restaurant?.cuisine || ['Various cuisines'];
                            const rating = rec.rating || rec.restaurant?.rating || 'New';
                            const deliveryTime = rec.deliveryTime || rec.restaurant?.deliveryTime || '30-45 min';
                            const priceRange = rec.priceRange || rec.restaurant?.priceRange || 'Moderate';
                            const matchScore = rec.matchPercentage || Math.round((rec.score || 0.5) * 100);
                            const explanations = rec.explanations || ['Recommended for you'];

                            console.log(`Rendering restaurant ${index}:`, {
                                name: restaurantName,
                                id: restaurantId,
                                hasValidData: !!restaurantName
                            });
                            
                            return (
                                <div 
                                    key={restaurantId}
                                    className="enhanced-rec-card"
                                    onClick={() => {
                                        console.log('Restaurant selected:', restaurantName);
                                        try {
                                            // Find the restaurant in the restaurants array or create one
                                            let restaurant = restaurants.find(r => r._id === restaurantId);
                                            if (!restaurant) {
                                                // Create restaurant object from recommendation data
                                                restaurant = {
                                                    _id: restaurantId,
                                                    name: restaurantName,
                                                    cuisine: Array.isArray(cuisine) ? cuisine : [cuisine],
                                                    rating: rating,
                                                    priceRange: priceRange,
                                                    deliveryTime: deliveryTime,
                                                    deliveryFee: rec.deliveryFee || 50,
                                                    minimumOrder: rec.minimumOrder || 200
                                                };
                                            }
                                            selectRestaurant(restaurant);
                                        } catch (error) {
                                            console.error('Error selecting restaurant:', error);
                                        }
                                    }}
                                    style={{
                                        animationDelay: `${index * 0.1}s`
                                    }}
                                >
                                    {/* Rank Badge */}
                                    <div className="rec-rank">#{index + 1}</div>
                                    
                                    {/* Favorite Heart */}
                                    <button 
                                        className={`rec-favorite-heart ${getUserData(currentUser.id).favorites.includes(restaurantId) ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            try {
                                                toggleFavorite(restaurantId);
                                            } catch (error) {
                                                console.error('Error toggling favorite:', error);
                                            }
                                        }}
                                    >
                                        {getUserData(currentUser.id).favorites.includes(restaurantId) ? '❤️' : '🤍'}
                                    </button>

                                    {/* Restaurant Info */}
                                    <div className="rec-restaurant-info">
                                        <h4>
                                            {restaurantName}
                                            {index === 0 && <span className="top-pick">👑</span>}
                                        </h4>
                                        <p className="rec-cuisine">
                                            {Array.isArray(cuisine) ? cuisine.join(', ') : cuisine}
                                        </p>
                                    </div>
                                    
                                    {/* Match Score */}
                                    <div className="rec-match-score">
                                        <div className="match-percentage" style={{ color: getMatchScoreColor(matchScore) }}>
                                            {matchScore}% Match
                                        </div>
                                        <div className="match-bar">
                                            <div 
                                                className="match-fill" 
                                                style={{ 
                                                    width: `${matchScore}%`,
                                                    background: `linear-gradient(90deg, ${getMatchScoreColor(matchScore)}, ${getMatchScoreColor(matchScore)}dd)`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    {/* Explanations */}
                                    <div className="rec-explanations">
                                        {Array.isArray(explanations) ? 
                                            explanations.slice(0, 2).map((explanation, idx) => (
                                                <span key={idx} className="explanation-tag">
                                                    {formatExplanation(explanation)}
                                                </span>
                                            )) :
                                            <span className="explanation-tag">
                                                {formatExplanation('Recommended for you')}
                                            </span>
                                        }
                                    </div>
                                    
                                    {/* Restaurant Details */}
                                    <div className="rec-restaurant-details">
                                        <span className="rec-rating">{rating}</span>
                                        <span className="rec-delivery">{deliveryTime}</span>
                                        <span className={`rec-price-range ${priceRange.toLowerCase()}`}>
                                            {getPriceRangeDisplay ? getPriceRangeDisplay(priceRange) : priceRange}
                                        </span>
                                    </div>
                                </div>
                            );
                        }).filter(Boolean)}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="enhanced-rec-actions">
                        <button 
                            className="refresh-recommendations"
                            onClick={() => {
                                console.log('Refreshing recommendations...');
                                fetchEnhancedRecommendations(currentUser.id);
                            }}
                            disabled={loadingEnhancedRecs}
                        >
                            {loadingEnhancedRecs ? 'Updating...' : 'Refresh Recommendations'}
                        </button>
                        <button 
                            className="see-all-restaurants"
                            onClick={() => {
                                console.log('Showing all restaurants...');
                                const regularSection = document.querySelector('.regular-restaurants');
                                if (regularSection) {
                                    regularSection.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                        >
                            Explore All Restaurants
                        </button>
                    </div>

                    {/* Insights Panel */}
                    <div className="recommendation-insights">
                        <h4>Why These Recommendations?</h4>
                        <div className="insights-grid">
                            <div className="insight">
                                <span className="insight-icon"></span>
                                <span>Matched to your taste preferences</span>
                            </div>
                            <div className="insight">
                                <span className="insight-icon"></span>
                                <span>Highly rated by similar users</span>
                            </div>
                            <div className="insight">
                                <span className="insight-icon"></span>
                                <span>Available for your preferred dining times</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
  };

// Send Message Function
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const currentInput = inputMessage.trim();
    console.log('Processing message:', currentInput);
    
    const userMsg = {
      role: 'user',
      content: currentInput,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Check if this is a local command that should be handled by our enhanced system
    const localResponse = await handleLocalChatCommand(currentInput);
    
    if (localResponse) {
      setIsTyping(false);
      setMessages(prev => [...prev, localResponse]);
      return;
    }

    // If not a local command, try the backend API
    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: currentInput,
            userId: currentUser?.id || 'guest',
            sessionData: {
              selectedRestaurant: selectedRestaurant?._id,
              cartItems: cart.length,
              userPreferences: getUserData(currentUser?.id || 'guest').preferences
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Backend response:', data);
        
        setIsTyping(false);
        
        if (data.success) {
          const botResponse = {
            role: 'bot',
            content: data.bot_response,
            timestamp: new Date().toLocaleTimeString(),
            type: data.response_type,
            restaurants: data.data?.restaurants || [],
            menuItems: data.data?.menuItems || [],
            suggestions: data.data?.suggestions || [],
            actions: data.data?.actions || [],
            cartItems: data.data?.cartItems || [],
            cartTotal: data.data?.cartTotal || 0
          };
          
          setMessages(prev => [...prev, botResponse]);
          
          // Handle special backend responses
          handleBackendResponse(data);
          
        } else {
          // Fallback to local enhanced response
          const fallbackResponse = await generateEnhancedLocalResponse(currentInput);
          setMessages(prev => [...prev, fallbackResponse]);
        }
        
      } catch (error) {
        console.error('Backend chat error:', error);
        setIsTyping(false);
        
        // Always fallback to our enhanced local system
        const fallbackResponse = await generateEnhancedLocalResponse(currentInput);
        setMessages(prev => [...prev, fallbackResponse]);
      }
    }, 800);
  };

  // Handle local chat commands with enhanced responses
  const handleLocalChatCommand = async (input) => {
    const lowerInput = input.toLowerCase();
    const userId = currentUser?.id || 'guest';
    
    // RECOMMENDATIONS - UNIFIED WITH MAIN APP
    if (lowerInput.includes('recommend') || lowerInput.includes('suggestion')) {
      console.log('Generating recommendations...');
      
      if (!currentUser || currentUser.isAdmin) {
        return {
          role: 'bot',
          content: "Please login to get personalized recommendations!",
          timestamp: new Date().toLocaleTimeString(),
          suggestions: ['Login', 'Browse restaurants', 'Popular items']
        };
      }
      
      if (enhancedRecommendations && enhancedRecommendations.length > 0) {
        console.log('Using already loaded enhanced recommendations in chat');
        return {
          role: 'bot',
          content: `Based on your taste profile, here are my top recommendations for you:`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'enhanced_recommendations',
          recommendations: enhancedRecommendations.slice(0, 5).map(rec => ({
            id: rec.id,
            name: rec.name,
            cuisine: rec.cuisine,
            rating: rec.rating,
            deliveryTime: rec.deliveryTime,
            priceRange: rec.priceRange,
            matchPercentage: rec.matchPercentage,
            explanations: rec.explanations,
            deliveryFee: rec.deliveryFee || 50,
            minimumOrder: rec.minimumOrder || 200
          })),
          suggestions: ['Order from these', 'Show more', 'Different cuisine', 'My favorites']
        };
      }
        
      // Always use the same API as main app
      try {
        console.log('Fetching fresh recommendations for chat...');
        
        const response = await fetch(`http://localhost:5000/api/recommendations/advanced/${userId}?count=5&includeNew=true`);
        const data = await response.json();
        
        console.log('Chat recommendations API response:', data);
        
        if (data.success && data.recommendations && data.recommendations.length > 0) {
          // Update the main state so both systems are synchronized
          setEnhancedRecommendations(data.recommendations);
          
          return {
            role: 'bot',
            content: `Based on your taste profile, here are my top recommendations for you:`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'enhanced_recommendations',
            recommendations: data.recommendations.map(rec => ({
              id: rec.id,
              name: rec.name,
              cuisine: rec.cuisine,
              rating: rec.rating,
              deliveryTime: rec.deliveryTime,
              priceRange: rec.priceRange,
              matchPercentage: rec.matchPercentage,
              explanations: rec.explanations,
              deliveryFee: rec.deliveryFee || 50,
              minimumOrder: rec.minimumOrder || 200
            })),
            suggestions: ['Order from these', 'Show more', 'Different cuisine', 'My favorites']
          };
        } else {
          return {
            role: 'bot',
            content: "I'm still learning your preferences! Here are some popular restaurants to get started:",
            timestamp: new Date().toLocaleTimeString(),
            restaurants: getPopularRestaurants().slice(0, 4),
            suggestions: ['Set my preferences', 'Show all restaurants', 'Popular items']
          };
        }
      } catch (error) {
        console.error('Failed to fetch chat recommendations:', error);
        
        // Final fallback
        return {
          role: 'bot',
          content: "Here are some popular restaurants:",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: getPopularRestaurants().slice(0, 4),
          suggestions: ['Order from these', 'Set preferences', 'Browse all']
        };
      }
    }
    
    // ORDER HISTORY
    if (lowerInput.includes('my orders') || lowerInput.includes('order history')) {
      if (!currentUser) {
        return {
          role: 'bot',
          content: "Please login to see your order history!",
          timestamp: new Date().toLocaleTimeString(),
          suggestions: ['Login', 'Browse restaurants']
        };
      }
      
      const userData = getUserData(userId);
      if (userData.orderHistory.length > 0) {
        return {
          role: 'bot',
          content: `You've placed ${userData.orderHistory.length} orders. Here's your history:`,
          timestamp: new Date().toLocaleTimeString(),
          orderHistory: userData.orderHistory.slice(0, 5),
          suggestions: ['Reorder favorite', 'Rate orders', 'Browse new restaurants']
        };
      } else {
        return {
          role: 'bot',
          content: "No previous orders found. Let's order something delicious!",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: restaurants.slice(0, 3),
          suggestions: ['Browse restaurants', 'Show recommendations', 'Popular items']
        };
      }
    }
    
    // FAVORITES
    if (lowerInput.includes('favorites') || lowerInput.includes('favourite')) {
      if (!currentUser) {
        return {
          role: 'bot',
          content: "Please login to see your favorites!",
          timestamp: new Date().toLocaleTimeString(),
          suggestions: ['Login', 'Browse restaurants']
        };
      }
      
      const userData = getUserData(userId);
      if (userData.favorites.length > 0) {
        const favoriteRestaurants = userData.favorites
          .map(id => restaurants.find(r => r._id === id))
          .filter(Boolean);
        
        return {
          role: 'bot',
          content: "Your favorite restaurants:",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: favoriteRestaurants,
          suggestions: ['Order from favorites', 'Add more favorites', 'Browse all']
        };
      } else {
        return {
          role: 'bot',
          content: "No favorites yet. Try some restaurants and add them to favorites!",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: getPopularRestaurants().slice(0, 3),
          suggestions: ['Browse restaurants', 'Show recommendations']
        };
      }
    }
    
    // CART STATUS
    if (lowerInput.includes('cart') || lowerInput.includes('my order')) {
      if (cart.length > 0) {
        const total = calculateTotal();
        return {
          role: 'bot',
          content: `Your current order from ${selectedRestaurant?.name || 'restaurant'}:`,
          timestamp: new Date().toLocaleTimeString(),
          cartItems: cart.map(item => ({
            menuItem: { name: item.name, _id: item._id },
            quantity: item.quantity,
            price: item.price
          })),
          cartTotal: total.total,
          actions: ['Checkout now', 'Add more items', 'Remove items', 'Clear cart'],
          suggestions: ['Proceed to checkout', 'Add more items', 'View menu']
        };
      } else {
        return {
          role: 'bot',
          content: "Your cart is empty. What would you like to order?",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: getPopularRestaurants().slice(0, 3),
          suggestions: ['Browse restaurants', 'Show recommendations', 'Popular items']
        };
      }
    }
    
    // CUISINE SEARCH
    const cuisineKeywords = ['biryani', 'pizza', 'burger', 'chinese', 'fast food', 'pakistani', 'desi', 'italian', 'bbq'];
    const foundCuisine = cuisineKeywords.find(keyword => lowerInput.includes(keyword));
    
    if (foundCuisine) {
      const cuisineRestaurants = restaurants.filter(r => 
        r.cuisine && r.cuisine.some(c => 
          c.toLowerCase().includes(foundCuisine.toLowerCase()) ||
          foundCuisine.toLowerCase().includes(c.toLowerCase())
        )
      ).slice(0, 4);
      
      if (cuisineRestaurants.length > 0) {
        return {
          role: 'bot',
          content: `Great choice! Here are the best ${foundCuisine} restaurants:`,
          timestamp: new Date().toLocaleTimeString(),
          restaurants: cuisineRestaurants,
          suggestions: ['Order from these', 'Show menu', 'Different cuisine']
        };
      }
    }
    
    // ORDERING INTENT
    if (lowerInput.includes('order') || lowerInput.includes('want to eat') || lowerInput.includes('hungry')) {
      if (!currentUser) {
        return {
          role: 'bot',
          content: "I'd love to help you order! Please login first to get personalized recommendations.",
          timestamp: new Date().toLocaleTimeString(),
          suggestions: ['Login', 'Browse as guest', 'Popular restaurants']
        };
      }
      
      const recommendations = enhancedRecommendationEngineArrow.getPersonalizedRecommendations(userId, restaurants);
      
      if (recommendations.length > 0) {
        return {
          role: 'bot',
          content: "Perfect! Based on your preferences, here are some great options to order from:",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: recommendations.slice(0, 4),
          suggestions: ['Order from these', 'Show menu', 'Different options']
        };
      } else {
        return {
          role: 'bot',
          content: "I'd love to help you order! Here are some popular restaurants:",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: getPopularRestaurants().slice(0, 4),
          suggestions: ['Order from these', 'Set preferences', 'Browse all']
        };
      }
    }
    
    return null; // Not a local command, will try backend
  };

// Generate enhanced local response for fallback
// Generate enhanced local response for fallback
  const generateEnhancedLocalResponse = async (input) => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
      return {
        role: 'bot',
        content: `Hello${currentUser ? `, ${currentUser.name}` : ''}! I'm your smart food assistant. I can help you find restaurants, place orders, and get personalized recommendations!`,
        timestamp: new Date().toLocaleTimeString(),
        suggestions: ['Show recommendations', 'Popular restaurants', 'My favorites', 'Order food']
      };
    }
    
    if (lowerInput.includes('help')) {
      return {
        role: 'bot',
        content: "I'm here to help! I can assist you with:\n\n- Personalized restaurant recommendations\n- Finding restaurants by cuisine\n- Placing food orders\n- Checking your order history\n- Managing your favorites\n\nWhat would you like to do?",
        timestamp: new Date().toLocaleTimeString(),
        suggestions: ['Get recommendations', 'Browse restaurants', 'Order food', 'My account']
      };
    }
    
    // Default enhanced response
    return {
      role: 'bot',
      content: "I'm your smart food assistant! I can help you find amazing restaurants, get personalized recommendations, and place orders. What are you craving today?",
      timestamp: new Date().toLocaleTimeString(),
      suggestions: ['Show recommendations', 'Popular restaurants', 'Order food', 'Help me choose']
    };
  };

  // Handle backend responses
  const handleBackendResponse = (data) => {
    if (data.data?.type === 'restaurant_selected_with_menu' && data.data?.restaurant) {
      console.log('Restaurant selected:', data.data.restaurant.name);
      setSelectedRestaurant(data.data.restaurant);
      if (data.data.menuItems && data.data.menuItems.length > 0) {
        setMenu(data.data.menuItems);
      }
    }
    
    if (data.data?.type === 'item_added_to_cart' && data.data?.cartItems) {
      console.log('Updating cart from chatbot');
      const updatedCart = data.data.cartItems.map(item => ({
        _id: item.menuItem._id,
        name: item.menuItem.name,
        price: item.price,
        quantity: item.quantity
      }));
      setCart(updatedCart);
    }
  };

  // Enhanced quick reply handler
  const handleEnhancedQuickReply = async (reply) => {
    console.log('Quick reply clicked:', reply);
    
    // Special handling for "Show recommendations"
    if (reply === "Show recommendations" || reply === "get recommendations") {
      if (!currentUser || currentUser.isAdmin) {
        // For guests or admins, show regular response
        const userMsg = {
          role: 'user',
          content: reply,
          timestamp: new Date().toLocaleTimeString()
        };
        
        const botResponse = {
          role: 'bot',
          content: "I'd love to show you personalized recommendations! Please login first to get recommendations based on your preferences.",
          timestamp: new Date().toLocaleTimeString(),
          suggestions: ['Login', 'Browse all restaurants', 'Popular restaurants']
        };
        
        setMessages(prev => [...prev, userMsg, botResponse]);
        return;
      }
      
      if (enhancedRecommendations && enhancedRecommendations.length > 0) {
        console.log('Using existing enhanced recommendations for quick reply');
        
        const userMsg = {
          role: 'user',
          content: reply,
          timestamp: new Date().toLocaleTimeString()
        };
        
        const botResponse = {
          role: 'bot',
          content: `Here are my personalized recommendations for you, ${currentUser.name}!\n\nI found ${enhancedRecommendations.length} restaurants that match your taste:`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'enhanced_recommendations',
          recommendations: enhancedRecommendations
        };
        
        setMessages(prev => [...prev, userMsg, botResponse]);
        return;
      }
        
      // For logged-in users, fetch enhanced recommendations
      try {
        console.log('Fetching recommendations for quick reply...');
        
        const response = await fetch(`http://localhost:5000/api/recommendations/advanced/${currentUser.id}?count=5&includeNew=true`);
        const data = await response.json();
        
        console.log('Quick reply recommendations API response:', data);
        
        const userMsg = {
          role: 'user',
          content: reply,
          timestamp: new Date().toLocaleTimeString()
        };
        
        if (data.success && data.recommendations && data.recommendations.length > 0) {
          // Sync with main state
          setEnhancedRecommendations(data.recommendations);
          
          const botResponse = {
            role: 'bot',
            content: `Here are my personalized recommendations for you, ${currentUser.name}!\n\nI found ${data.recommendations.length} restaurants that match your taste:`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'enhanced_recommendations',
            recommendations: data.recommendations
          };
          
          setMessages(prev => [...prev, userMsg, botResponse]);
          console.log('Enhanced recommendations displayed in chat');
        } else {
          // Fallback if no recommendations
          const botResponse = {
            role: 'bot',
            content: `I'm still learning your preferences, ${currentUser.name}! Here are some popular restaurants to get you started:`,
            timestamp: new Date().toLocaleTimeString(),
            restaurants: restaurants.slice(0, 5),
            suggestions: ['Order food', 'Browse restaurants', 'My favorites']
          };
          
          setMessages(prev => [...prev, userMsg, botResponse]);
        }
        
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        
        // Error fallback
        const userMsg = {
          role: 'user',
          content: reply,
          timestamp: new Date().toLocaleTimeString()
        };
        
        const botResponse = {
          role: 'bot',
          content: "I'm having trouble getting your personalized recommendations right now. Here are some popular options!",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: restaurants.slice(0, 5),
          suggestions: ['Try again', 'Browse all restaurants', 'Order food']
        };
        
        setMessages(prev => [...prev, userMsg, botResponse]);
      }
      
      return;
    }
  };

  // Enhanced Popular Restaurants function
  const getPopularRestaurants = () => {
    return restaurants
      .map(restaurant => {
        let popularityScore = 0;
        
        // Rating weight (40%)
        popularityScore += (restaurant.rating || 0) * 40;
        
        // Order count simulation (30%)
        const simulatedOrderCount = Math.random() * 100 + 50;
        popularityScore += (simulatedOrderCount / 10) * 30;
        
        // Recent activity weight (20%)
        const recentActivity = Math.random() * 20;
        popularityScore += recentActivity;
        
        // Customer satisfaction weight (10%)
        const satisfaction = Math.random() * 10;
        popularityScore += satisfaction;
        
        return {
          ...restaurant,
          popularityScore,
          orderCount: Math.floor(simulatedOrderCount),
          trendingBadge: popularityScore > 350 ? 'Trending' : popularityScore > 300 ? 'Popular' : ''
        };
      })
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 5);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setOrderStatus(null);
    setShowAdminDashboard(false);
    setCart([]);
    setSelectedRestaurant(null);
    setEnhancedRecommendations([]);
    setShowEnhancedRecs(false);
  };

  const handleQuickReply = (reply) => {
    setInputMessage(reply);
    sendMessage();
  };

  // Order history display component for chat
  const ChatOrderHistory = ({ orders }) => {
    if (!orders || orders.length === 0) return null;

    return (
      <div className="chat-order-history">
        {orders.map((order, index) => (
          <div key={index} className="chat-order-item">
            <div className="order-header">
              <h4>{order.restaurantName}</h4>
              <span className="order-date">{new Date(order.date).toLocaleDateString()}</span>
            </div>
            <p className="order-items">
              {order.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}
            </p>
            <div className="order-footer">
              <span className="order-total">Rs. {order.total}</span>
              <span className={`order-status ${order.status}`}>{order.status}</span>
              {order.rating && (
                <span className="order-rating">{'⭐'.repeat(order.rating)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleRateFromTracking = () => {
    if (orderStatus && currentUser) {
      // Create a proper order object for rating
      const orderForRating = {
        id: orderStatus._id || orderStatus.orderNumber || `order_${Date.now()}`,
        restaurantId: orderStatus.restaurant?._id || orderStatus.restaurant || selectedRestaurant?._id,
        restaurantName: orderStatus.restaurant?.name || selectedRestaurant?.name || 'Restaurant',
        items: orderStatus.items?.map(item => ({
          name: item.menuItem?.name || item.name || 'Item',
          quantity: item.quantity || 1,
          price: item.price || 0
        })) || cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: orderStatus.pricing?.total || calculateTotal().total,
        status: 'delivered',
        date: new Date().toISOString(),
        rating: null,
        feedback: null
      };
      
      console.log('Setting up rating for order:', orderForRating);
      
      // Set up rating modal
      setSelectedOrderForRating(orderForRating);
      setCurrentRating(0);
      setCurrentFeedback('');
      setShowRatingModal(true);
      setShowOrderTracking(false); // Close tracking modal
    } else {
      console.log('Cannot rate: missing orderStatus or currentUser');
      alert('Unable to load rating. Please try again.');
    }
  };

  // ===== USER PROFILE FUNCTIONS =====
  const handleRateOrder = (orderId) => {
    const userData = getUserData(currentUser.id);
    const order = userData.orderHistory.find(o => o.id === orderId);
    setSelectedOrderForRating(order);
    setCurrentRating(order.rating || 0);
    setCurrentFeedback(order.feedback || '');
    setShowRatingModal(true);
  };

  const submitRating = () => {
    if (selectedOrderForRating && currentRating > 0) {
      // Add rating to user data
      addUserRating(currentUser.id, selectedOrderForRating.id, currentRating, currentFeedback);
      
      // Save to order history as well
      addToUserOrderHistory(currentUser.id, {
        ...selectedOrderForRating,
        rating: currentRating,
        feedback: currentFeedback
      }, restaurants);
      
      // Close modal and reset
      setShowRatingModal(false);
      setSelectedOrderForRating(null);
      setCurrentRating(0);
      setCurrentFeedback('');
      
      // Show success message
      alert('Thank you for your feedback! Your rating helps us improve our service.');
      
      console.log('Rating submitted:', {
        orderId: selectedOrderForRating.id,
        rating: currentRating,
        feedback: currentFeedback
      });
    } else {
      alert('Please select a rating before submitting.');
    }
  };

  const toggleFavorite = (restaurantId) => {
    if (!currentUser) {
        alert('Please login to add favorites');
        return;
    }
    
    const userData = getUserData(currentUser.id);
    if (userData.favorites.includes(restaurantId)) {
        removeFromUserFavorites(currentUser.id, restaurantId);
        alert('Removed from favorites');
    } else {
        addToUserFavorites(currentUser.id, restaurantId);
        alert('Added to favorites!');
    }
    
    // Force re-render to update the heart icons
    setSelectedRestaurant(selectedRestaurant ? {...selectedRestaurant} : null);
  };
    // ===== ENHANCED PLACE ORDER FUNCTION =====
  const placeOrder = async () => {
    if (!currentUser) {
      alert('Please login to place an order');
      setShowCheckout(false);
      setShowAuth(true);
      return;
    }

    if (!deliveryAddress.name || !deliveryAddress.phone || !deliveryAddress.area || !deliveryAddress.street) {
      alert('Please fill in all delivery details');
      return;
    }

    const restaurantId = selectedRestaurant?._id;
    
    if (!restaurantId) {
      alert('Restaurant information missing. Please try again.');
      return;
    }

    const orderData = {
      userId: currentUser.id,
      restaurantId: restaurantId,
      items: cart.map(item => ({
        menuItemId: item._id,
        quantity: item.quantity,
        specialInstructions: ''
      })),
      deliveryAddress: {
        street: deliveryAddress.street,
        area: deliveryAddress.area,
        city: "Karachi",
        phone: deliveryAddress.phone
      },
      paymentMethod: 'Cash on Delivery',
      specialInstructions: deliveryAddress.instructions || ''
    };

    console.log('Sending order data:', orderData);

    try {
      const response = await fetch('http://localhost:5000/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const data = await response.json();
      console.log('Order response:', data);
      
      if (data.success) {

        // Sync with enhanced data manager
        syncUserActionWithDataManager('ORDER_PLACED', {
          order: data.order,
          restaurantId: selectedRestaurant._id,
          restaurantName: selectedRestaurant.name,
          items: cart,
          total: calculateTotal().total
        });
        
        // Save to user's order history
        addToUserOrderHistory(currentUser.id, {
          id: data.order._id || `order_${Date.now()}`,
          restaurantId: selectedRestaurant._id,
          restaurantName: selectedRestaurant.name,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          total: calculateTotal().total,
          status: 'confirmed'
        }, restaurants);
        
        localStorage.setItem(`address_${currentUser.id}`, JSON.stringify(deliveryAddress));
        setOrderStatus(data.order);
        setCart([]);
        setShowCheckout(false);
        setShowOrderTracking(true);
        setCurrentOrderStatus('confirmed');
        
        setTimeout(() => setCurrentOrderStatus('preparing'), 3000);
        setTimeout(() => setCurrentOrderStatus('on-the-way'), 10000);
        setTimeout(() => setCurrentOrderStatus('delivered'), 20000);
      } else {
        console.error('Order failed:', data);
        alert(`Order failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  // Add this function to sync orders with enhanced data
  const syncUserActionWithDataManager = (action, data) => {
    // When users place orders, update the enhanced data structure
    if (action === 'ORDER_PLACED' && currentUser) {
      const enhancedOrder = {
        id: data.order._id || `order_${Date.now()}`,
        userId: currentUser.id,
        restaurantId: data.restaurantId || selectedRestaurant?._id,
        restaurantName: data.restaurantName || selectedRestaurant?.name,
        items: data.items || cart.map(item => ({
          id: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        pricing: {
          subtotal: data.total - 50,
          deliveryFee: 50,
          surgeMultiplier: 1.0,
          tax: 0,
          total: data.total
        },
        status: 'confirmed',
        timestamps: {
          ordered: new Date().toISOString(),
          confirmed: new Date().toISOString()
        },
        delivery: {
          address: `${deliveryAddress.street}, ${deliveryAddress.area}`,
          estimatedTime: 30
        },
        adminNotes: ''
      };
      
      // Add to enhanced orders
      const existingOrders = JSON.parse(localStorage.getItem('enhanced_orders') || '[]');
      existingOrders.unshift(enhancedOrder);
      localStorage.setItem('enhanced_orders', JSON.stringify(existingOrders));
    }
  };

   // ===== RENDER COMPONENT =====
  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <h1>VOICE GUIDE</h1>
        <div className="header-buttons">
          {currentUser ? (
            <div className="user-menu">
              <span className="user-name">{currentUser.name}</span>
              {currentUser.isAdmin && (
                <button onClick={() => setShowAdminDashboard(!showAdminDashboard)} className="admin-button">
                  {showAdminDashboard ? 'Customer View' : 'Admin Dashboard'}
                </button>
              )}
              {currentUser && !currentUser.isAdmin && (
                <button onClick={() => setShowUserProfile(true)} className="profile-button">
                  My Profile
                </button>
              )}
              <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="login-button">
              Login / Signup
            </button>
          )}
          {orderStatus && (
            <button onClick={() => setShowOrderTracking(true)} className="track-order-button">
              Track Order
            </button>
          )}
          <button 
            onClick={() => {
              console.log('Chat button clicked', { 
                isNewUser, 
                currentUser: currentUser?.name,
                isOnboardingActive 
              });
              
              const wasShowingChat = showChat;
              setShowChat(!showChat);
              
              // AUTO-START ONBOARDING for new users when chat opens
              if (!wasShowingChat && isNewUser && currentUser && !isOnboardingActive) {
                console.log('Auto-starting onboarding for new user...');
                setTimeout(() => {
                  startOnboarding();
                }, 500);
              }
            }} 
            className="chat-toggle"
          >
            Smart Assistant {isNewUser && <span className="notification-dot"></span>}
          </button>
          <div className="cart-info">
            Cart ({cart.length})
          </div>
        </div>
      </header>

      <div className="main-container">
        {/* Enhanced Admin Dashboard */}
        {showAdminDashboard && currentUser?.isAdmin ? (
          <div className="admin-view">
            {/* Enhanced Admin Navigation */}
            <nav className="admin-nav">
              <div className="nav-header">
                <h2>Admin Panel</h2>
                <p>Manage your food delivery platform</p>
              </div>
              
              <div className="nav-tabs">
                <button
                  className={`nav-tab ${adminActiveTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setAdminActiveTab('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`nav-tab ${adminActiveTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setAdminActiveTab('orders')}
                >
                  Orders
                </button>
                <button
                  className={`nav-tab ${adminActiveTab === 'restaurants' ? 'active' : ''}`}
                  onClick={() => setAdminActiveTab('restaurants')}
                >
                  Restaurants
                </button>
                <button
                  className={`nav-tab ${adminActiveTab === 'users' ? 'active' : ''}`}
                  onClick={() => setAdminActiveTab('users')}
                >
                  Users
                </button>
              </div>
            </nav>

            {/* Admin Content */}
            <div className="admin-content">
              {adminActiveTab === 'dashboard' && <AdminDashboard />}
              {adminActiveTab === 'orders' && <OrderManagement />}
              {adminActiveTab === 'restaurants' && <RestaurantManagement />}
              {adminActiveTab === 'users' && <UserAnalytics />}
            </div>
          </div>
        ) : (
          <>
            {/* Regular Customer View */}
            <div className="content">
              {!selectedRestaurant ? (
                <div className="restaurants-section">
                  {/* Enhanced Recommendations Section - Show above regular restaurants */}
                  {currentUser && !currentUser.isAdmin && (showEnhancedRecs || loadingEnhancedRecs) && (
                    <EnhancedRecommendationsSection />
                  )}
                  
                  {/* Regular Restaurants Section */}
                  <div className="regular-restaurants">
                    <h2>All Restaurants</h2>
                    {loading ? (
                      <p>Loading restaurants...</p>
                    ) : restaurants && restaurants.length > 0 ? (
                      <div className="restaurant-grid">
                        {restaurants.map(restaurant => (
                          <div 
                            key={restaurant._id || restaurant.id} 
                            className="restaurant-card"
                            onClick={() => selectRestaurant(restaurant)}
                          >
                            <h3>{restaurant?.name || 'Restaurant Name'}</h3>
                            <p className="cuisine">{restaurant?.cuisine ? restaurant.cuisine.join(', ') : 'Cuisine not specified'}</p>
                            <div className="restaurant-info">
                              <span>{restaurant?.rating || 'New'}</span>
                              <span>{getPriceRangeDisplay(restaurant?.priceRange)}</span>
                              <span>{restaurant?.deliveryTime || 'Not specified'}</span>
                            </div>
                            <p className="min-order">Min order: Rs. {restaurant?.minimumOrder || 'Not specified'}</p>
                            
                            {/* Favorite button for regular restaurants */}
                            {currentUser && !currentUser.isAdmin && (
                              <button 
                                className={`favorite-heart ${getUserData(currentUser.id).favorites.includes(restaurant._id) ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(restaurant._id);
                                }}
                              >
                                {getUserData(currentUser.id).favorites.includes(restaurant._id) ? '❤️' : '🤍'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No restaurants available. Please check if the backend server is running.</p>
                    )}
                  </div>
                </div>
              ) : (
                // Menu section
                <div className="menu-section">
                  <button onClick={() => setSelectedRestaurant(null)} className="back-button">
                      ← Back to Restaurants
                  </button>
                  <h2>{selectedRestaurant.name} Menu</h2>
                  {menu && menu.length > 0 ? (
                      <div className="menu-grid">
                          {menu.map(item => (
                              <div key={item._id} className="menu-item">
                                  <div className="item-info">
                                      <h4>{item.name}</h4>
                                      <p>{item.description}</p>
                                      <p className="price">Rs. {item.price}</p>
                                  </div>
                                  <button 
                                      onClick={() => addToCart(item)}
                                      className="add-button"
                                  >
                                      Add +
                                  </button>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="no-menu">No menu items available for this restaurant yet.</p>
                  )}
                </div>
              )}
              
              <div className="cart-section">
                <h3>Your Order</h3>
                {cart.length === 0 ? (
                  <p className="empty-cart">Your cart is empty</p>
                ) : (
                  <>
                    {cart.map(item => (
                      <div key={item._id} className="cart-item">
                        <div>
                          <p>{item.name}</p>
                          <p className="quantity">Qty: {item.quantity} × Rs. {item.price}</p>
                        </div>
                        <div>
                          <p>Rs. {item.price * item.quantity}</p>
                          <button 
                            onClick={() => removeFromCart(item._id)}
                            className="remove-button"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="cart-total">
                      <p>Subtotal: Rs. {calculateTotal().subtotal}</p>
                      <p>Delivery: Rs. {calculateTotal().deliveryFee}</p>
                      <p className="total">Total: Rs. {calculateTotal().total}</p>
                    </div>
                    
                    <button className="order-button" onClick={() => setShowCheckout(true)}>
                      Place Order - Rs. {calculateTotal().total}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

<<<<<<< HEAD
        {/* Enhanced Smart Chatbot */}
        {showChat && (
          <div className="smart-chatbot">
            <div className="chat-header">
              <div className="chat-title">
                <h3>Smart Food Assistant</h3>
                {isNewUser && <span className="onboarding-badge">Setting up your profile...</span>}
=======
{/* Cart Summary Display */}
{msg.cartItems && msg.cartItems.length > 0 && (
  <div className="chat-cart-summary">
    <h4>🛒 Your Cart</h4>
    {msg.cartItems.map((item, idx) => (
      <div key={idx} className="cart-item-summary">
        {item.menuItem.name} x{item.quantity} - Rs. {item.price * item.quantity}
      </div>
    ))}
    {msg.cartTotal && (
      <div className="cart-total-summary">
        <strong>Subtotal: Rs. {msg.cartTotal}</strong>
      </div>
    )}
  </div>
)}

{/* Enhanced Quick Replies */}
{msg.suggestions && msg.suggestions.length > 0 && (
  <div className="quick-replies">
    {msg.suggestions.map((suggestion, idx) => (
      <button
        key={idx}
        className="quick-reply-btn"
        onClick={() => {
          setInputMessage(suggestion);
          sendMessage();
        }}
      >
        {suggestion}
      </button>
    ))}
  </div>
)}

{/* Action Buttons */}
{msg.actions && msg.actions.length > 0 && (
  <div className="chat-actions">
    {msg.actions.map((action, idx) => (
      <button
        key={idx}
        className="chat-action-btn"
        onClick={() => {
          if (action === 'Checkout' && cart.length > 0) {
            setShowCheckout(true);
            setShowChat(false);
          } else if (action === 'View Menu' && selectedRestaurant) {
            setShowChat(false);
          } else {
            setInputMessage(action);
            sendMessage();
          }
        }}
      >
        {action}
      </button>
    ))}
  </div>
)}

    {/* Order History Display (keep existing) */}
    {msg.orderHistory && (
      <ChatOrderHistory orders={msg.orderHistory} />
    )}

    {/* Onboarding options (keep existing) */}
    {msg.questionData && msg.isOnboarding && (
      <div className="onboarding-options">
        <p style={{marginBottom: '10px', fontWeight: 'bold', color: '#667eea'}}>
          Please select an option:
        </p>
        {msg.questionData.options.map((option, idx) => (
          <button
            key={idx}
            className="option-button"
            onClick={() => {
              console.log(' Option selected:', option);
              handleOptionSelect(option, msg.questionData.key);
            }}
            style={{
              margin: '5px',
              padding: '10px 15px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {option}
          </button>
        ))}
      </div>
    )}
  </div>
))}


                  {isTyping && (
                    <div className="typing-indicator">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="typing-text">AI is thinking...</span>
                    </div>
                  )}
                </div>

{/* Enhanced Chat Input with Voice Support */}
<div className="chat-input-section">
  {!isOnboardingActive && (
    <div className="suggestions">
      <button onClick={() => handleQuickReply("Show recommendations")} className="suggestion-chip">
        🎯 Recommendations
      </button>
      <button onClick={() => handleQuickReply("Popular restaurants")} className="suggestion-chip">
        🔥 Popular
      </button>
      <button onClick={() => handleQuickReply("My orders")} className="suggestion-chip">
        📋 My Orders
      </button>
      <button onClick={() => handleQuickReply("My favorites")} className="suggestion-chip">
        ❤️ Favorites
      </button>
    </div>
  )}
   {/* Voice Input Component */}
  <div className="voice-input-wrapper">
    <VoiceInput
      onVoiceResult={handleVoiceResult}
      onTranscriptionStart={handleVoiceTranscriptionStart}
      onTranscriptionEnd={handleVoiceTranscriptionEnd}
      isEnabled={isVoiceEnabled && !isOnboardingActive}
      language="en-US"
    />
  </div>
   <div className="chat-input">
    <input
      type="text"
      value={inputMessage}
      onChange={(e) => setInputMessage(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && !isOnboardingActive && !isProcessingVoice && sendMessage()}
      placeholder={
        isProcessingVoice 
          ? "Processing voice..." 
          : isOnboardingActive 
            ? "Please select an option above..." 
            : "Type or speak your message..."
      }
      disabled={isOnboardingActive || isProcessingVoice}
    />
     <button 
      onClick={sendMessage} 
      disabled={isOnboardingActive || !inputMessage.trim() || isProcessingVoice} 
      className="send-button"
    >
      {isProcessingVoice ? <span>⏳</span> : <span>🚀</span>}
    </button>
    {/* Voice Toggle Button */}
    <button 
      onClick={toggleVoiceInput}
      className={`voice-toggle ${isVoiceEnabled ? 'enabled' : 'disabled'}`}
      title={isVoiceEnabled ? 'Disable voice input' : 'Enable voice input'}
    >
      {isVoiceEnabled ? '🎤' : '🔇'}
    </button>
  </div>
  
  {/* Voice processing indicator */}
  {isProcessingVoice && (
    <div className="voice-processing-indicator">
      <div className="processing-spinner"></div>
      <span>Processing your voice command...</span>
    </div>
  )}
</div>
</div>
)}

            
{/* Personalized Recommendations Full Page */}
{showPersonalizedPage && (
  <div className="modal-overlay" onClick={() => setShowPersonalizedPage(false)}>
    <div className="personalized-page-modal" onClick={(e) => e.stopPropagation()}>
      <div className="personalized-page-header">
        <h2>Your Personalized Recommendations</h2>
        <button onClick={() => setShowPersonalizedPage(false)} className="close-button">✖</button>
      </div>
      
      <div className="personalized-page-content">
        <EnhancedRecommendationsSection />
      </div>
      
      <div className="personalized-page-actions">
        <button 
          className="back-to-main-btn"
          onClick={() => setShowPersonalizedPage(false)}
        >
          ← Back to Restaurants
        </button>
      </div>
    </div>
  </div>
)}
          {/* User Profile Modal */}
          {showUserProfile && currentUser && (
            <div className="modal-overlay" onClick={() => setShowUserProfile(false)}>
              <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>👤 My Profile</h2>
                  <button onClick={() => setShowUserProfile(false)} className="close-button">✖</button>
                </div>
                
                {(() => {
                  const userData = getUserData(currentUser.id);
                  return (
                    <div className="profile-content">
                      {/* User Stats */}
                      <div className="profile-section">
                        <h3>📊 Your Food Journey</h3>
                        <div className="stats-grid">
                          <div className="stat-item">
                            <span className="stat-number">{userData.behaviorData.totalOrders}</span>
                            <span className="stat-label">Total Orders</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-number">Rs. {userData.behaviorData.totalSpent}</span>
                            <span className="stat-label">Total Spent</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-number">Rs. {Math.round(userData.behaviorData.averageOrderValue)}</span>
                            <span className="stat-label">Avg Order</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-number">{userData.favorites.length}</span>
                            <span className="stat-label">Favorites</span>
                          </div>
                        </div>
                      </div>

                      {/* Preferences */}
                      <div className="profile-section">
                        <h3> Your Preferences</h3>
                        <div className="preferences-grid">
                          <div className="pref-item">
                            <strong>Cuisine:</strong> {userData.preferences.cuisine || 'Not set'}
                          </div>
                          <div className="pref-item">
                            <strong>Spice Level:</strong> {userData.preferences.spiceLevel || 'Not set'}
                          </div>
                          <div className="pref-item">
                            <strong>Budget:</strong> {userData.preferences.budget || 'Not set'}
                          </div>
                          <div className="pref-item">
                            <strong>Dietary:</strong> {userData.preferences.dietary || 'Not set'}
                          </div>
                          <div className="pref-item">
                            <strong>Timing:</strong> {userData.preferences.timing || 'Not set'}
                          </div>
                          <div className="pref-item">
                            <strong>Most Ordered:</strong> {userData.behaviorData.mostOrderedCuisine || 'Not enough data'}
                          </div>
                        </div>
                      </div>

                      {/* Recent Orders */}
                      <div className="profile-section">
                        <h3>📋 Recent Orders</h3>
                        {userData.orderHistory.length > 0 ? (
                          <div className="orders-list">
                            {userData.orderHistory.slice(0, 5).map((order, index) => (
                              <div key={order.id} className="order-item">
                                <div className="order-info">
                                  <h4>{order.restaurantName}</h4>
                                  <p>{order.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}</p>
                                  <div className="order-meta">
                                    <span>Rs. {order.total}</span>
                                    <span>{new Date(order.date).toLocaleDateString()}</span>
                                    <span className={`status ${order.status}`}>{order.status}</span>
                                  </div>
                                </div>
                                <div className="order-actions">
                                  {order.rating ? (
                                    <div className="existing-rating">
                                      <span>{'⭐'.repeat(order.rating)}</span>
                                      <span>Rated</span>
                                    </div>
                                  ) : (
                                    <button 
                                      className="rate-btn"
                                      onClick={() => handleRateOrder(order.id)}
                                    >
                                      Rate Order
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-orders">No orders yet. Start exploring restaurants!</p>
                        )}
                      </div>

                      {/* Favorite Restaurants */}
                      <div className="profile-section">
                        <h3>❤️ Favorite Restaurants</h3>
                        {userData.favorites.length > 0 ? (
                          <div className="favorites-grid">
                            {userData.favorites.map(favId => {
                              const restaurant = restaurants.find(r => r._id === favId);
                              return restaurant ? (
                                <div key={favId} className="favorite-item">
                                  <h4>{restaurant.name}</h4>
                                  <p>{restaurant.cuisine?.join(', ')}</p>
                                  <div className="favorite-actions">
                                    <button onClick={() => {
                                      setShowUserProfile(false);
                                      selectRestaurant(restaurant);
                                    }}>View Menu</button>
                                    <button 
                                      className="remove-fav"
                                      onClick={() => removeFromUserFavorites(currentUser.id, favId)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <p className="no-favorites">No favorites yet. Try some restaurants and add them!</p>
                        )}
                      </div>

                      {/* Update Preferences Button */}
                      <div className="profile-actions">
                        <button 
    className="update-preferences-btn"
    onClick={handlePreferenceUpdate}
  >
    🔄 Update Preferences
  </button> 
                      </div>
                    </div>
                  );
                })()}
>>>>>>> bb8633207f371f8d94cc459334c28b317dee01f0
              </div>
              <button onClick={() => setShowChat(false)} className="close-chat">×</button>
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-welcome-container">
                  <div className="ai-avatar">🤖</div>
                  <p className="chat-welcome">Welcome! Let's set up your preferences.</p>
                  
                  {/* SIMPLE START BUTTON */}
                  <button 
                    onClick={() => {
                      console.log('Starting questions...');
                      
                      // Add welcome message
                      const welcome = {
                        role: 'bot',
                        content: `Hi ${currentUser?.name}! Let's set up your food preferences.`,
                        timestamp: new Date().toLocaleTimeString()
                      };
                      
                      setMessages([welcome]);
                      
                      // Add first question after 1 second
                      setTimeout(() => {
                        const question = {
                          role: 'bot',
                          content: "What's your favorite type of cuisine?",
                          questionData: {
                            id: 1,
                            question: "What's your favorite type of cuisine?",
                            options: ["Pakistani", "Chinese", "Fast Food", "Italian", "BBQ"],
                            key: "cuisine"
                          },
                          timestamp: new Date().toLocaleTimeString()
                        };
                        
                        setMessages(prev => [...prev, question]);
                        setIsOnboardingActive(true);
                      }, 1000);
                    }}
                    className="setup-preferences-btn"
                  >
                    Start Setup
                  </button>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((msg, index) => (
                <div key={index} className="message-container">
                  <div className={`message ${msg.role}`}>
                    <div className="message-content">
                      {msg.content}
                    </div>
                    <div className="message-time">{msg.timestamp}</div>
                  </div>
                  
                  {/* Quick Replies */}
                  {msg.quickReplies && (
                    <div className="quick-replies">
                      {msg.quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          className="quick-reply-btn"
                          onClick={() => handleEnhancedQuickReply(reply)}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Onboarding Question Options */}
                  {msg.questionData && (
                    <div style={{margin: '15px 0'}}>
                      <p style={{textAlign: 'center', fontWeight: 'bold', color: '#667eea', marginBottom: '10px'}}>
                        Choose an option:
                      </p>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center'}}>
                        {msg.questionData.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              console.log('Selected:', option);
                              handleOptionSelect(option, msg.questionData.key);
                            }}
                            style={{
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              padding: '10px 15px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Recommendations Display */}
                  {msg.type === 'enhanced_recommendations' && msg.recommendations && (
                    <div className="chat-enhanced-recommendations">
                      <div className="enhanced-rec-header">
                        <h4>Perfect Matches For You</h4>
                      </div>
                      
                      <div className="enhanced-rec-list">
                        {msg.recommendations.map((rec, idx) => (
                          <div 
                            key={rec.id || idx} 
                            className="enhanced-rec-item"
                            onClick={() => {
                              // Find or create restaurant object
                              let restaurant = restaurants.find(r => r._id === rec.id);
                              if (!restaurant) {
                                restaurant = {
                                  _id: rec.id,
                                  name: rec.name,
                                  cuisine: rec.cuisine,
                                  rating: rec.rating,
                                  priceRange: rec.priceRange,
                                  deliveryTime: rec.deliveryTime,
                                  deliveryFee: rec.deliveryFee || 50,
                                  minimumOrder: rec.minimumOrder || 200
                                };
                              }
                              
                              setShowChat(false); // Close chat
                              selectRestaurant(restaurant); // Open restaurant
                            }}
                          >
                            <div className="rec-number">#{idx + 1}</div>
                            <div className="rec-details">
                              <h5>{rec.name}</h5>
                              <p>{Array.isArray(rec.cuisine) ? rec.cuisine.join(', ') : rec.cuisine}</p>
                              <div className="rec-match">
                                <span className="match-score">{rec.matchPercentage}% Match</span>
                                <span className="rating">{rec.rating}</span>
                              </div>
                              {rec.explanations && rec.explanations.length > 0 && (
                                <div className="rec-reason">
                                  {rec.explanations[0]}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="enhanced-rec-actions">
                        <button 
                          onClick={() => {
                            setShowChat(false);
                            // Scroll to main recommendations if they exist
                            setTimeout(() => {
                              const recSection = document.querySelector('.personalized-preview-section');
                              if (recSection) {
                                recSection.scrollIntoView({ behavior: 'smooth' });
                              }
                            }, 100);
                          }}
                          className="view-all-btn"
                        >
                          View All Recommendations
                        </button>
                      </div>
                    </div>
                  )}
   {/* Restaurant Recommendations */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="chat-recommendations">
                      {msg.recommendations.map((restaurant, idx) => (
                        <div 
                          key={idx} 
                          className="recommendation-card order-capable"
                          onClick={() => {
                            const orderMessage = `restaurant_selected:${restaurant._id}`;
                            setInputMessage(orderMessage);
                            sendMessage();
                          }}
                        >
                          <div className="rec-header">
                            <h4>{restaurant.name}</h4>
                            <div className="rec-rating">{restaurant.rating}</div>
                          </div>
                          <p className="rec-cuisine">{restaurant.cuisine ? restaurant.cuisine.join(', ') : 'Various cuisines'}</p>
                          <div className="rec-info">
                            <span className="rec-price">{getPriceRangeDisplay(restaurant.priceRange)}</span>
                            <span className="rec-delivery">{restaurant.deliveryTime}</span>
                          </div>
                          
                          <button 
                            className="chat-order-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const orderMessage = `restaurant_selected:${restaurant._id}`;
                              setInputMessage(orderMessage);
                              sendMessage();
                            }}
                          >
                            View Menu & Order
                          </button>
                          
                          {restaurant.trendingBadge && (
                            <div className="trending-badge-chat">
                              {restaurant.trendingBadge}
                            </div>
                          )}
                          
                          {restaurant.personalizedReason && (
                            <div className="recommendation-reason">
                              {restaurant.personalizedReason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Menu Items Display */}
                  {msg.menuItems && msg.menuItems.length > 0 && (
                    <div className="chat-menu-items">
                      <div className="menu-header">
                        <h4>{selectedRestaurant?.name} Menu:</h4>
                      </div>
                      {msg.menuItems.map((item, idx) => (
                        <div key={idx} className="chat-menu-item">
                          <div className="menu-item-info">
                            <h5>{item.name}</h5>
                            <p className="item-description">{item.description}</p>
                            <span className="item-price">Rs. {item.price}</span>
                          </div>
                          <button 
                            className="add-item-btn"
                            onClick={() => {
                              // Directly add to cart
                              addToCart(item);
                              
                              // Show confirmation
                              const confirmMsg = {
                                role: 'bot',
                                content: `Added ${item.name} to cart! Total items: ${cart.length + 1}`,
                                timestamp: new Date().toLocaleTimeString(),
                                suggestions: ['Add more', 'View cart', 'Checkout']
                              };
                              setMessages(prev => [...prev, confirmMsg]);
                            }}
                          >
                            Add to Cart
                          </button>
                        </div>
                      ))}
                      
                      {/* Cart summary */}
                      {cart.length > 0 && (
                        <div className="chat-cart-status">
                          <p>Cart: {cart.length} items - Rs. {calculateTotal().total}</p>
                          <button onClick={() => setShowCheckout(true)}>
                            Proceed to Checkout
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Regular Restaurant Recommendations */}
                  {msg.restaurants && msg.restaurants.length > 0 && (
                    <div className="chat-recommendations">
                      {msg.restaurants.map((restaurant, idx) => (
                        <div 
                          key={idx} 
                          className="recommendation-card order-capable"
                        >
                          <div className="rec-header">
                            <h4>{restaurant.name}</h4>
                            <div className="rec-rating">{restaurant.rating || 'New'}</div>
                          </div>
                          <p className="rec-cuisine">{restaurant.cuisine ? restaurant.cuisine.join(', ') : 'Various cuisines'}</p>
                          <div className="rec-info">
                            <span className="rec-price">{getPriceRangeDisplay(restaurant.priceRange)}</span>
                            <span className="rec-delivery">{restaurant.deliveryTime}</span>
                          </div>
                          
                          <button 
                            className="chat-order-btn"
                            onClick={async (e) => {
                              e.stopPropagation();
                              console.log('View Menu & Order clicked for:', restaurant.name);
                              
                              // Send restaurant selection message to chatbot
                              const userMsg = {
                                role: 'user',
                                content: `I want to order from ${restaurant.name}`,
                                timestamp: new Date().toLocaleTimeString()
                              };
                              setMessages(prev => [...prev, userMsg]);
                              
                              setIsTyping(true);
                              
                              try {
                                const response = await fetch('http://localhost:5000/api/chat', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    message: `restaurant_selected:${restaurant._id}`,
                                    userId: currentUser?.id || 'guest',
                                    sessionData: {}
                                  })
                                });

                                const data = await response.json();
                                setIsTyping(false);
                                
                                if (data.success) {
                                  const botResponse = {
                                    role: 'bot',
                                    content: data.bot_response,
                                    timestamp: new Date().toLocaleTimeString(),
                                    type: data.response_type,
                                    restaurants: data.data?.restaurants || [],
                                    menuItems: data.data?.menuItems || [],
                                    suggestions: data.data?.suggestions || [],
                                    actions: data.data?.actions || []
                                  };
                                  
                                  setMessages(prev => [...prev, botResponse]);
                                  
                                  // Auto-select restaurant in main app
                                  setSelectedRestaurant(restaurant);
                                  
                                  // Fetch and set menu
                                  if (data.data?.menuItems && data.data.menuItems.length > 0) {
                                    setMenu(data.data.menuItems);
                                  } else {
                                    // Fallback: fetch menu manually
                                    try {
                                      const menuResponse = await fetch(`http://localhost:5000/api/menu/${restaurant._id}`);
                                      const menuData = await menuResponse.json();
                                      if (menuData.success && menuData.items) {
                                        setMenu(menuData.items);
                                      }
                                    } catch (menuError) {
                                      console.error('Menu fetch error:', menuError);
                                    }
                                  }
                                  
                                } else {
                                  console.error('Chatbot response error:', data);
                                  setIsTyping(false);
                                }
                              } catch (error) {
                                console.error('Restaurant selection error:', error);
                                setIsTyping(false);
                                
                                // Fallback: still select restaurant in main app
                                setSelectedRestaurant(restaurant);
                                fetchMenu(restaurant._id);
                                
                                const fallbackResponse = {
                                  role: 'bot',
                                  content: `Great choice! ${restaurant.name} selected. You can now view their menu in the main app!`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  suggestions: ['Add items to cart', 'View menu', 'Different restaurant']
                                };
                                setMessages(prev => [...prev, fallbackResponse]);
                              }
                            }}
                          >
                            View Menu & Order
                          </button>
                          
                          {restaurant.trendingBadge && (
                            <div className="trending-badge-chat">
                              {restaurant.trendingBadge}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cart Summary Display */}
                  {msg.cartItems && msg.cartItems.length > 0 && (
                    <div className="chat-cart-summary">
                      <h4>Your Cart</h4>
                      {msg.cartItems.map((item, idx) => (
                        <div key={idx} className="cart-item-summary">
                          {item.menuItem.name} x{item.quantity} - Rs. {item.price * item.quantity}
                        </div>
                      ))}
                      {msg.cartTotal && (
                        <div className="cart-total-summary">
                          <strong>Subtotal: Rs. {msg.cartTotal}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="quick-replies">
                      {msg.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          className="quick-reply-btn"
                          onClick={() => {
                            setInputMessage(suggestion);
                            sendMessage();
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="chat-actions">
                      {msg.actions.map((action, idx) => (
                        <button
                          key={idx}
                          className="chat-action-btn"
                          onClick={() => {
                            if (action === 'Checkout' && cart.length > 0) {
                              setShowCheckout(true);
                              setShowChat(false);
                            } else if (action === 'View Menu' && selectedRestaurant) {
                              setShowChat(false);
                            } else {
                              setInputMessage(action);
                              sendMessage();
                            }
                          }}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Order History Display */}
                  {msg.orderHistory && (
                    <ChatOrderHistory orders={msg.orderHistory} />
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">AI is thinking...</span>
                </div>
              )}
            </div>

            <div className="chat-input-section">
              {!isOnboardingActive && ( // Only show suggestions when NOT onboarding
                <div className="suggestions">
                  <button onClick={() => handleQuickReply("Show recommendations")} className="suggestion-chip">
                    Recommendations
                  </button>
                  <button onClick={() => handleQuickReply("Popular restaurants")} className="suggestion-chip">
                    Popular
                  </button>
                  <button onClick={() => handleQuickReply("My orders")} className="suggestion-chip">
                    My Orders
                  </button>
                  <button onClick={() => handleQuickReply("My favorites")} className="suggestion-chip">
                    Favorites
                  </button>
                </div>
              )}
              
              <div className="chat-input">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isOnboardingActive && sendMessage()}
                  placeholder={
                    isOnboardingActive 
                      ? "Please select an option above..." 
                      : "Ask me anything about food..."
                  }
                  disabled={isOnboardingActive} // KEEP input disabled during onboarding
                />
                <button 
                  onClick={sendMessage} 
                  disabled={isOnboardingActive || !inputMessage.trim()} 
                  className="send-button"
                >
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        )}
 {/* User Profile Modal */}
        {showUserProfile && currentUser && (
          <div className="modal-overlay" onClick={() => setShowUserProfile(false)}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>My Profile</h2>
                <button onClick={() => setShowUserProfile(false)} className="close-button">×</button>
              </div>
              
              {(() => {
                const userData = getUserData(currentUser.id);
                return (
                  <div className="profile-content">
                    {/* User Stats */}
                    <div className="profile-section">
                      <h3>Your Food Journey</h3>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-number">{userData.behaviorData.totalOrders}</span>
                          <span className="stat-label">Total Orders</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-number">Rs. {userData.behaviorData.totalSpent}</span>
                          <span className="stat-label">Total Spent</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-number">Rs. {Math.round(userData.behaviorData.averageOrderValue)}</span>
                          <span className="stat-label">Avg Order</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-number">{userData.favorites.length}</span>
                          <span className="stat-label">Favorites</span>
                        </div>
                      </div>
                    </div>

                    {/* Preferences */}
                    <div className="profile-section">
                      <h3>Your Preferences</h3>
                      <div className="preferences-grid">
                        <div className="pref-item">
                          <strong>Cuisine:</strong> {userData.preferences.cuisine || 'Not set'}
                        </div>
                        <div className="pref-item">
                          <strong>Spice Level:</strong> {userData.preferences.spiceLevel || 'Not set'}
                        </div>
                        <div className="pref-item">
                          <strong>Budget:</strong> {userData.preferences.budget || 'Not set'}
                        </div>
                        <div className="pref-item">
                          <strong>Dietary:</strong> {userData.preferences.dietary || 'Not set'}
                        </div>
                        <div className="pref-item">
                          <strong>Timing:</strong> {userData.preferences.timing || 'Not set'}
                        </div>
                        <div className="pref-item">
                          <strong>Most Ordered:</strong> {userData.behaviorData.mostOrderedCuisine || 'Not enough data'}
                        </div>
                      </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="profile-section">
                      <h3>Recent Orders</h3>
                      {userData.orderHistory.length > 0 ? (
                        <div className="orders-list">
                          {userData.orderHistory.slice(0, 5).map((order, index) => (
                            <div key={order.id} className="order-item">
                              <div className="order-info">
                                <h4>{order.restaurantName}</h4>
                                <p>{order.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}</p>
                                <div className="order-meta">
                                  <span>Rs. {order.total}</span>
                                  <span>{new Date(order.date).toLocaleDateString()}</span>
                                  <span className={`status ${order.status}`}>{order.status}</span>
                                </div>
                              </div>
                              <div className="order-actions">
                                {order.rating ? (
                                  <div className="existing-rating">
                                    <span>{'⭐'.repeat(order.rating)}</span>
                                    <span>Rated</span>
                                  </div>
                                ) : (
                                  <button 
                                    className="rate-btn"
                                    onClick={() => handleRateOrder(order.id)}
                                  >
                                    Rate Order
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-orders">No orders yet. Start exploring restaurants!</p>
                      )}
                    </div>

                    {/* Favorite Restaurants */}
                    <div className="profile-section">
                      <h3>Favorite Restaurants</h3>
                      {userData.favorites.length > 0 ? (
                        <div className="favorites-grid">
                          {userData.favorites.map(favId => {
                            const restaurant = restaurants.find(r => r._id === favId);
                            return restaurant ? (
                              <div key={favId} className="favorite-item">
                                <h4>{restaurant.name}</h4>
                                <p>{restaurant.cuisine?.join(', ')}</p>
                                <div className="favorite-actions">
                                  <button onClick={() => {
                                    setShowUserProfile(false);
                                    selectRestaurant(restaurant);
                                  }}>View Menu</button>
                                  <button 
                                    className="remove-fav"
                                    onClick={() => removeFromUserFavorites(currentUser.id, favId)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="no-favorites">No favorites yet. Try some restaurants and add them!</p>
                      )}
                    </div>

                    {/* Update Preferences Button */}
                    <div className="profile-actions">
                      <button 
                        className="update-preferences-btn"
                        onClick={handlePreferenceUpdate}
                      >
                        Update Preferences
                      </button> 
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {showRatingModal && selectedOrderForRating && (
          <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
            <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Rate Your Order</h2>
                <button onClick={() => setShowRatingModal(false)} className="close-button">×</button>
              </div>
              
              <div className="rating-content">
                <div className="order-summary">
                  <h3>{selectedOrderForRating.restaurantName}</h3>
                  <div className="rated-items">
                    {selectedOrderForRating.items && selectedOrderForRating.items.length > 0 ? (
                      selectedOrderForRating.items.map((item, index) => (
                        <p key={index}>{item.name} x{item.quantity}</p>
                      ))
                    ) : (
                      <p>Order items</p>
                    )}
                  </div>
                  <p className="order-total">Total: Rs. {selectedOrderForRating.total}</p>
                  <small className="order-date">
                    {selectedOrderForRating.date ? new Date(selectedOrderForRating.date).toLocaleDateString() : 'Today'}
                  </small>
                </div>

                <div className="rating-section">
                  <h4>How was your experience?</h4>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        className={`star ${currentRating >= star ? 'active' : ''}`}
                        onClick={() => setCurrentRating(star)}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  <p className="rating-text">
                    {currentRating === 0 && 'Click to rate'}
                    {currentRating === 1 && 'Poor - Not satisfied'}
                    {currentRating === 2 && 'Fair - Below expectations'}
                    {currentRating === 3 && 'Good - Satisfied'}
                    {currentRating === 4 && 'Very Good - Exceeded expectations'}
                    {currentRating === 5 && 'Excellent - Outstanding!'}
                  </p>
                </div>

                <div className="feedback-section">
                  <h4>Share your feedback (optional)</h4>
                  <textarea
                    value={currentFeedback}
                    onChange={(e) => setCurrentFeedback(e.target.value)}
                    placeholder="Tell us about your experience... Was the food good? How was the delivery? Any suggestions?"
                    rows="4"
                  />
                </div>

                <div className="rating-actions">
                  <button 
                    className="cancel-btn" 
                    onClick={() => setShowRatingModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="submit-rating-btn" 
                    onClick={submitRating}
                    disabled={currentRating === 0}
                  >
                    Submit Rating {currentRating > 0 && `(${currentRating})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

<<<<<<< HEAD
        {/* Checkout Modal */}
        {showCheckout && (
          <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
            <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Complete Your Order</h2>
                <button onClick={() => setShowCheckout(false)} className="close-button">×</button>
              </div>
              
              <div className="checkout-form">
                <h3>Delivery Details</h3>
=======
          
{/* Voice Response Modal */}
{voiceResponse && !showChat && (
  <div className="voice-response-modal">
    <div className="voice-response-content">
      <div className="voice-response-header">
        <span className="voice-icon">🎤</span>
        <span className="voice-label">Voice Assistant</span>
        <button 
          onClick={() => setVoiceResponse(null)}
          className="voice-close"
        >
          ✖
        </button>
      </div>
      
      <div className="voice-response-message">
        {voiceResponse.message}
      </div>
      
      <div className="voice-response-actions">
        <button 
          onClick={() => {
            setShowChat(true);
            setVoiceResponse(null);
          }}
          className="voice-action-btn"
        >
          💬 Open Chat
        </button>
        <button 
          onClick={() => setVoiceResponse(null)}
          className="voice-action-btn secondary"
        >
          ✅ Got it
        </button>
      </div>
      
      <div className="voice-response-timestamp">
        {voiceResponse.timestamp.toLocaleTimeString()}
      </div>
    </div>
  </div>
)}

          {/* Checkout Modal */}
          {showCheckout && (
            <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
              <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Complete Your Order</h2>
                  <button onClick={() => setShowCheckout(false)} className="close-button">✖</button>
                </div>
>>>>>>> bb8633207f371f8d94cc459334c28b317dee01f0
                
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={deliveryAddress.name}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, name: e.target.value})}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={deliveryAddress.phone}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                    placeholder="03XX-XXXXXXX"
                  />
                </div>

                <div className="form-group">
                  <label>Area</label>
                  <select
                    value={deliveryAddress.area}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, area: e.target.value})}
                  >
                    <option value="">Select Area</option>
                    <option value="Gulshan-e-Iqbal">Gulshan-e-Iqbal</option>
                    <option value="DHA">DHA</option>
                    <option value="Clifton">Clifton</option>
                    <option value="PECHS">PECHS</option>
                    <option value="Nazimabad">Nazimabad</option>
                    <option value="FB Area">FB Area</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                    placeholder="House #, Street name"
                  />
                </div>

                <div className="form-group">
                  <label>Delivery Instructions (Optional)</label>
                  <textarea
                    value={deliveryAddress.instructions}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, instructions: e.target.value})}
                    placeholder="Gate code, landmark, etc."
                    rows="3"
                  />
                </div>

                <div className="order-summary">
                  <h3>Order Summary</h3>
                  {cart.map(item => (
                    <div key={item._id} className="summary-item">
                      <span>{item.name} x {item.quantity}</span>
                      <span>Rs. {item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="summary-total">
                    <span>Subtotal:</span>
                    <span>Rs. {calculateTotal().subtotal}</span>
                  </div>
                  <div className="summary-total">
                    <span>Delivery Fee:</span>
                    <span>Rs. {calculateTotal().deliveryFee}</span>
                  </div>
                  <div className="summary-total final">
                    <span>Total:</span>
                    <span>Rs. {calculateTotal().total}</span>
                  </div>
                </div>

                <div className="payment-method">
                  <h3>Payment Method</h3>
                  <div className="payment-option selected">
                    <input type="radio" checked readOnly />
                    <label>Cash on Delivery</label>
                  </div>
                </div>

                <button className="confirm-order-button" onClick={placeOrder}>
                  Confirm Order - Rs. {calculateTotal().total}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Tracking Modal */}
        {showOrderTracking && orderStatus && (
          <div className="modal-overlay">
            <div className="tracking-modal">
              <div className="tracking-header">
                <h2>Track Your Order</h2>
                <button onClick={() => setShowOrderTracking(false)} className="close-button">×</button>
              </div>
              
              <div className="tracking-content">
                <div className="order-info">
                  <h3>Order #{orderStatus.orderNumber}</h3>
                  <p>Estimated delivery: {orderStatus.estimatedDeliveryTime ? 
                    new Date(orderStatus.estimatedDeliveryTime).toLocaleTimeString() : '45 minutes'}</p>
                </div>

                <div className="tracking-steps">
                  <div className={`tracking-step ${currentOrderStatus === 'confirmed' ? 'active' : 'completed'}`}>
                    <div className="step-icon">✅</div>
                    <div className="step-info">
                      <h4>Order Confirmed</h4>
                      <p>Your order has been received</p>
                    </div>
                    <div className="step-time">2:30 PM</div>
                  </div>

                  <div className={`tracking-step ${currentOrderStatus === 'preparing' ? 'active' : currentOrderStatus === 'confirmed' ? 'pending' : 'completed'}`}>
                    <div className="step-icon">👨‍🍳</div>
                    <div className="step-info">
                      <h4>Preparing</h4>
                      <p>Restaurant is preparing your food</p>
                    </div>
                    <div className="step-time">{currentOrderStatus !== 'confirmed' ? '2:35 PM' : '--:--'}</div>
                  </div>

                  <div className={`tracking-step ${currentOrderStatus === 'on-the-way' ? 'active' : ['delivered'].includes(currentOrderStatus) ? 'completed' : 'pending'}`}>
                    <div className="step-icon">🚴</div>
                    <div className="step-info">
                      <h4>On the Way</h4>
                      <p>Your rider is on the way</p>
                    </div>
                    <div className="step-time">{['on-the-way', 'delivered'].includes(currentOrderStatus) ? '2:45 PM' : '--:--'}</div>
                  </div>

                  <div className={`tracking-step ${currentOrderStatus === 'delivered' ? 'completed' : 'pending'}`}>
                    <div className="step-icon">🎉</div>
                    <div className="step-info">
                      <h4>Delivered</h4>
                      <p>Enjoy your meal!</p>
                    </div>
                    <div className="step-time">{currentOrderStatus === 'delivered' ? '3:05 PM' : '--:--'}</div>
                  </div>
                </div>

                {currentOrderStatus === 'delivered' && (
                  <div className="delivery-complete">
                    <h3>Order Delivered Successfully!</h3>
                    <p>We hope you enjoy your meal!</p>
                    <button 
                      className="rate-order-btn"
                      onClick={handleRateFromTracking}
                    >
                      Rate Your Experience
                    </button>
                  </div>
                )}

                <div className="order-details">
                  <h3>Order Details</h3>
                  <p><strong>Restaurant:</strong> {orderStatus.restaurant?.name || selectedRestaurant?.name || 'Restaurant'}</p>
                  <p><strong>Total:</strong> Rs. {orderStatus.pricing?.total || 'N/A'}</p>
                  <p><strong>Payment:</strong> {orderStatus.paymentMethod || 'Cash on Delivery'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        {showAuth && (
          <div className="modal-overlay" onClick={() => setShowAuth(false)}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
              <div className="auth-header">
                <h2>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
                <button onClick={() => setShowAuth(false)} className="close-button">×</button>
              </div>
              
              <form onSubmit={isLogin ? handleLogin : handleSignup} className="auth-form">
                {!isLogin && (
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                      placeholder="Enter your name"
                      required={!isLogin}
                    />
                  </div>
                )}
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                {!isLogin && (
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={authForm.phone}
                      onChange={(e) => setAuthForm({...authForm, phone: e.target.value})}
                      placeholder="03XX-XXXXXXX"
                      required={!isLogin}
                    />
                  </div>
                )}
                
                <button type="submit" className="auth-submit-button">
                  {isLogin ? 'Login' : 'Sign Up'}
                </button>
                
                <div className="auth-switch">
                  {isLogin ? (
                    <p>Don't have an account? <span onClick={() => setIsLogin(false)}>Sign up</span></p>
                  ) : (
                    <p>Already have an account? <span onClick={() => setIsLogin(true)}>Login</span></p>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;