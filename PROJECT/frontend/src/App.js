// frontend/src/App.js - COMPLETE ENHANCED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

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
      
      // Budget compatibility - FIXED: direct function call
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
      return "❤️ Your favorite";
    }
    
    const previousOrders = userData.orderHistory.filter(order => order.restaurantId === restaurant._id);
    if (previousOrders.length > 0) {
      const avgRating = previousOrders
        .filter(order => order.rating)
        .reduce((sum, order) => sum + order.rating, 0) / previousOrders.filter(order => order.rating).length;
      
      if (avgRating >= 4) return "⭐ You loved this place";
      else if (avgRating >= 3) return "👍 You enjoyed this before";
    }
    
    if (userData.behaviorData.mostOrderedCuisine && restaurant.cuisine?.includes(userData.behaviorData.mostOrderedCuisine)) {
      return `🍽️ Your favorite: ${userData.behaviorData.mostOrderedCuisine}`;
    }
    
    return "🎯 Recommended for you";
  },
  
  getBudgetScore: (userBudget, restaurantPriceRange) => {
    const budgetMap = {
      "Under Rs. 500": 1,
      "Rs. 500-1000": 2,
      "Rs. 1000-1500": 3,
      "Above Rs. 1500": 4
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

// ===== 5. CHATBOT RESPONSES =====
const chatbotResponses = {
  greetings: [
    "Hello! I'm your AI food assistant. How can I help you today? 🍕",
    "Hi there! Ready to find some delicious food? 😋",
    "Welcome! I'm here to help you discover amazing restaurants!"
  ],
  recommendations: [
    "Based on your preferences, here are my top picks:",
    "I think you'll love these restaurants:",
    "Perfect matches for your taste:"
  ],
  orderHelp: [
    "I can help you place an order! What are you craving?",
    "Let's get you some food! What sounds good today?",
    "Ready to order? Tell me what you're in the mood for!"
  ],
  fallback: [
    "I'm not sure about that, but I can help you find great food! What are you looking for?",
    "Let me help you with something food-related! What can I do for you?",
    "I'm here to help with your food needs! How can I assist you?"
  ]
};

// ===== 6. MAIN APP COMPONENT =====
function App() {
  // ===== ALL STATE VARIABLES =====
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [dynamicPricing, setDynamicPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [surgeStatus, setSurgeStatus] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enhancedRecommendations, setEnhancedRecommendations] = useState([]);
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
  const [analyticsData, setAnalyticsData] = useState(null);
  const [salesTrends, setSalesTrends] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
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
  };

const fetchEnhancedRecommendations = async (userId) => {
    console.log('🎯 Fetching enhanced recommendations for:', userId);
    setLoadingEnhancedRecs(true);
    
    try {
        // Use your real ObjectId for testing
        let testUserId = userId;
        
        // If it's a fake user ID, use your real ObjectId
        if (!userId || userId === 'guest' || userId === 'user_001' || userId.length < 20) {
            testUserId = '6870b084e75152da7d6afb69'; // Your real ObjectId
            console.log('🔄 Using real ObjectId for testing:', testUserId);
        }
        
        const url = `http://localhost:5000/api/recommendations/advanced/${testUserId}?count=6&includeNew=true`;
        console.log('📡 Requesting:', url);
        
        const response = await fetch(url);
        console.log('📨 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.success && data.recommendations && data.recommendations.length > 0) {
            setEnhancedRecommendations(data.recommendations);
            setShowEnhancedRecs(true); // THIS WAS MISSING - ALWAYS SET TO TRUE WHEN WE HAVE DATA
            console.log('✅ Enhanced recommendations loaded:', data.recommendations.length);
        } else {
            console.log('⚠️ No recommendations returned');
            setEnhancedRecommendations([]);
            setShowEnhancedRecs(true); // STILL SHOW THE SECTION BUT WITH EMPTY STATE
        }
    } catch (error) {
        console.error('❌ Enhanced recommendations error:', error);
        setEnhancedRecommendations([]);
        setShowEnhancedRecs(true); // STILL SHOW THE SECTION BUT WITH ERROR STATE
    } finally {
        setLoadingEnhancedRecs(false);
    }
};

  // Enhanced calculateTotal function to use dynamic pricing
  const calculateTotalWithDynamicPricing = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = dynamicPricing ? dynamicPricing.dynamicPrice : 50;
    const savings = dynamicPricing ? (dynamicPricing.originalPrice - dynamicPricing.dynamicPrice) : 0;
    
    return { 
      subtotal, 
      deliveryFee, 
      total: subtotal + deliveryFee,
      savings
    };
  };

  // Function to fetch dynamic pricing
  const fetchDynamicPricing = async () => {
    if (!selectedRestaurant || cart.length === 0) return;
    
    console.log('💰 Fetching dynamic pricing for:', selectedRestaurant.name);
    setPricingLoading(true);
    
    try {
      const baseDeliveryFee = selectedRestaurant.deliveryFee || 50;
      const location = {
        type: 'Point',
        coordinates: [67.0011, 24.8607] // Karachi coordinates
      };
      
      const response = await fetch('http://localhost:5000/api/pricing/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: selectedRestaurant._id,
          baseDeliveryFee,
          location
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDynamicPricing(data.pricing);
        console.log('✅ Dynamic pricing received:', data.pricing);
      }
    } catch (error) {
      console.error('❌ Error fetching dynamic pricing:', error);
    } finally {
      setPricingLoading(false);
    }
  };

  // ===== ANALYTICS FUNCTION =====
  const fetchAnalytics = useCallback(() => {
    setAnalyticsLoading(true);
    
    setTimeout(() => {
      const totalRevenue = allOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = allOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const restaurantOrders = {};
      allOrders.forEach(order => {
        const restName = order.restaurant;
        restaurantOrders[restName] = (restaurantOrders[restName] || 0) + 1;
      });
      
      const popularRestaurants = Object.entries(restaurantOrders)
        .map(([name, count]) => ({ name, orders: count }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);
      
      const statusCounts = {};
      allOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      
      const orderStatusData = Object.entries(statusCounts)
        .map(([status, count]) => ({ status, count }));
      
      const salesData = [
        { date: '2024-01-08', sales: 1200 },
        { date: '2024-01-09', sales: 1500 },
        { date: '2024-01-10', sales: 1800 },
        { date: '2024-01-11', sales: 1400 },
        { date: '2024-01-12', sales: 1600 },
        { date: '2024-01-13', sales: 2000 },
        { date: '2024-01-14', sales: totalRevenue }
      ];
      
      setAnalyticsData({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        popularRestaurants,
        orderStatusData,
        activeCustomers: 89,
        growthRate: 15.3
      });
      
      setSalesTrends(salesData);
      setAnalyticsLoading(false);
    }, 1000);
  }, [allOrders]);

  // ===== useEffect HOOKS =====
  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    console.log('👤 User changed, checking for enhanced recommendations...', {
        user: currentUser?.name,
        isAdmin: currentUser?.isAdmin,
        userId: currentUser?.id
    });
    
    // Always fetch recommendations for any logged-in non-admin user
    if (currentUser && !currentUser.isAdmin) {
        // Use real ObjectId for testing
        const testUserId = '6870b084e75152da7d6afb69';
        console.log('📡 Fetching enhanced recommendations for user:', testUserId);
        fetchEnhancedRecommendations(testUserId);
    } else {
        console.log('❌ Not fetching recommendations - no user or admin user');
        setEnhancedRecommendations([]);
    }
}, [currentUser]);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchAnalytics]);

  // Fetch pricing when cart or restaurant changes
  useEffect(() => {
    if (selectedRestaurant && cart.length > 0) {
      console.log('🎯 Cart or restaurant changed, fetching pricing...');
      fetchDynamicPricing();
      fetchSurgeStatus();
      
      // Refresh pricing every 2 minutes while user is on the page
      const interval = setInterval(() => {
        fetchDynamicPricing();
        fetchSurgeStatus();
      }, 120000);
      
      return () => clearInterval(interval);
    }
  }, [selectedRestaurant, cart.length]);

useEffect(() => {
    console.log('👤 User changed, checking for enhanced recommendations...', {
        user: currentUser?.name,
        isAdmin: currentUser?.isAdmin,
        userId: currentUser?.id
    });
    
    // Always fetch recommendations for any logged-in non-admin user
    if (currentUser && !currentUser.isAdmin) {
        // Use real ObjectId for testing
        const testUserId = '6870b084e75152da7d6afb69';
        console.log('📡 Fetching enhanced recommendations for user:', testUserId);
        fetchEnhancedRecommendations(testUserId);
    } else {
        console.log('❌ Not fetching recommendations - no user or admin user');
        setEnhancedRecommendations([]);
        setShowEnhancedRecs(false);
    }
}, [currentUser]);

useEffect(() => {
    console.log('🔍 State Debug:', {
        showEnhancedRecs,
        enhancedRecommendationsCount: enhancedRecommendations.length,
        currentUser: currentUser?.name,
        loadingEnhancedRecs
    });
}, [showEnhancedRecs, enhancedRecommendations, currentUser, loadingEnhancedRecs]);
  // ===== API FUNCTIONS =====
  const fetchRestaurants = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/restaurants');
      const data = await response.json();
      console.log('Fetched data:', data);
      setRestaurants(data.data || []);
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
const handleLogin = async (e) => {
    e.preventDefault();
    
    if (authForm.email === 'admin@food.pk' && authForm.password === 'admin123') {
        const adminUser = {
            id: '6870b084e75152da7d6afb69', // Use your real ObjectId
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
    
    if (authForm.email && authForm.password) {
        const user = {
            id: '6870b084e75152da7d6afb69', // Use your real ObjectId for testing
            name: authForm.name || 'Test User',
            email: authForm.email,
            phone: authForm.phone,
            isAdmin: false
        };
        
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setShowAuth(false);
        alert(`Welcome back, ${user.name}!`);
        
        setAuthForm({ name: '', email: '', password: '', phone: '' });
    }
};

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (authForm.name && authForm.email && authForm.password && authForm.phone) {
      const newUser = {
        id: `user_${Date.now()}`,
        name: authForm.name,
        email: authForm.email,
        phone: authForm.phone,
        isAdmin: false,
        isNewUser: true
      };
      
      setCurrentUser(newUser);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      setShowAuth(false);
      setIsNewUser(true);
      setShowChat(true);
      
      setAuthForm({ name: '', email: '', password: '', phone: '' });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setOrderStatus(null);
  };

  // ===== ENHANCED CHATBOT FUNCTIONS =====
  const startOnboarding = () => {
    setCurrentOnboardingStep(0);
    setUserPreferences({});
    setMessages([{
      role: 'bot',
      content: `Welcome to Pakistani Food Delivery, ${currentUser?.name || 'there'}! 🎉\n\nI'm your AI food assistant and I'll help you discover the perfect meals based on your preferences. Let's get to know your taste!`,
      isOnboarding: true,
      timestamp: new Date().toLocaleTimeString()
    }]);
    
    setTimeout(() => {
      showNextOnboardingQuestion();
    }, 1500);
  };

  const showNextOnboardingQuestion = () => {
    const question = onboardingQuestions[currentOnboardingStep];
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'bot',
        content: question.question,
        isOnboarding: true,
        questionData: question,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }, 1000);
  };

  const handleOptionSelect = (option, questionKey) => {
    setMessages(prev => [...prev, {
      role: 'user',
      content: option,
      timestamp: new Date().toLocaleTimeString()
    }]);

    const newPrefs = { ...userPreferences, [questionKey]: option };
    setUserPreferences(newPrefs);
    
    const nextStep = currentOnboardingStep + 1;
    setCurrentOnboardingStep(nextStep);
    
    setTimeout(() => {
      if (nextStep < onboardingQuestions.length) {
        showNextOnboardingQuestion();
      } else {
        completeOnboarding(newPrefs);
      }
    }, 500);
  };
const EnhancedRecommendationsSection = () => {
    console.log('🎯 EnhancedRecommendationsSection rendering...', {
        currentUser: currentUser?.name,
        recommendationsCount: enhancedRecommendations.length,
        loadingEnhancedRecs,
        showEnhancedRecs
    });

    // Show for logged-in non-admin users only
    if (!currentUser || currentUser.isAdmin) {
        console.log('❌ No user or admin user, not showing enhanced recs');
        return null;
    }

    // Always show the section for logged-in users (remove showEnhancedRecs dependency)
    return (
        <div className="enhanced-recommendations-section">
            {loadingEnhancedRecs ? (
                // Loading state
                <>
                    <div className="enhanced-rec-header">
                        <h2>🎯 Loading Your Personalized Recommendations...</h2>
                        <p>We're analyzing your preferences</p>
                        <span className="loading-indicator">🔄</span>
                    </div>
                    <div className="loading-placeholder">
                        <div className="loading-spinner"></div>
                        <p>Finding the perfect restaurants for you...</p>
                    </div>
                </>
            ) : enhancedRecommendations.length === 0 ? (
                // Empty state
                <>
                    <div className="enhanced-rec-header">
                        <h2>🎯 Personalized Recommendations</h2>
                        <p>Let us find the perfect restaurants for you</p>
                    </div>
                    <div className="no-recommendations-state">
                        <div className="empty-state-icon">🍽️</div>
                        <h3>Getting your recommendations ready...</h3>
                        <p>We're learning your preferences to provide better suggestions.</p>
                        <button 
                            className="refresh-recommendations"
                            onClick={() => {
                                console.log('🔄 Manual refresh clicked');
                                fetchEnhancedRecommendations('6870b084e75152da7d6afb69');
                            }}
                        >
                            🔄 Get My Recommendations
                        </button>
                    </div>
                </>
            ) : (
                // Show recommendations
                <>
                    <div className="enhanced-rec-header">
                        <h2>🎯 Personalized Just For You</h2>
                        <p>Based on your preferences and ordering history</p>
                        {loadingEnhancedRecs && <span className="loading-indicator">🔄 Updating...</span>}
                    </div>
                    
                    <div className="enhanced-rec-grid">
                        {enhancedRecommendations.slice(0, 6).map((rec, index) => (
                            <div 
                                key={rec.restaurant._id}
                                className="enhanced-rec-card"
                                onClick={() => {
                                    console.log('🏪 Restaurant selected:', rec.restaurant.name);
                                    selectRestaurant(rec.restaurant);
                                }}
                            >
                                <div className="rec-rank">#{index + 1}</div>
                                
                                <div className="rec-restaurant-info">
                                    <h4>{rec.restaurant.name}</h4>
                                    <p className="rec-cuisine">{rec.restaurant.cuisine?.join(', ') || 'Various'}</p>
                                </div>
                                
                                <div className="rec-match-score">
                                    <div className="match-percentage">
                                        {Math.round((rec.finalScore || 0.5) * 100)}% Match
                                    </div>
                                    <div className="match-bar">
                                        <div 
                                            className="match-fill" 
                                            style={{ width: `${(rec.finalScore || 0.5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                <div className="rec-explanations">
                                    {(rec.explanations || ['Recommended for you']).slice(0, 2).map((explanation, idx) => (
                                        <span key={idx} className="explanation-tag">
                                            {explanation}
                                        </span>
                                    ))}
                                </div>
                                
                                <div className="rec-restaurant-details">
                                    <span className="rec-rating">⭐ {rec.restaurant.rating || 'New'}</span>
                                    <span className="rec-delivery">{rec.restaurant.deliveryTime}</span>
                                    <span className={`rec-price-range ${(rec.restaurant.priceRange || 'moderate').toLowerCase()}`}>
                                        {rec.restaurant.priceRange || 'Moderate'}
                                    </span>
                                </div>
                                
                                {/* Favorite heart button */}
                                <button 
                                    className={`rec-favorite-heart ${getUserData(currentUser.id).favorites.includes(rec.restaurant._id) ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(rec.restaurant._id);
                                    }}
                                >
                                    {getUserData(currentUser.id).favorites.includes(rec.restaurant._id) ? '❤️' : '🤍'}
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <div className="enhanced-rec-actions">
                        <button 
                            className="refresh-recommendations"
                            onClick={() => {
                                console.log('🔄 Refreshing recommendations...');
                                fetchEnhancedRecommendations('6870b084e75152da7d6afb69');
                            }}
                            disabled={loadingEnhancedRecs}
                        >
                            🔄 Refresh Recommendations
                        </button>
                        <button 
                            className="see-all-restaurants"
                            onClick={() => {
                                console.log('🏪 Showing all restaurants...');
                                // Just scroll down to all restaurants
                                const regularSection = document.querySelector('.regular-restaurants');
                                if (regularSection) {
                                    regularSection.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                        >
                            🏪 See All Restaurants
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
  const generateEnhancedChatbotResponse = (userInput, userId) => {
  const userData = getUserData(userId);
  const lowerInput = userInput.toLowerCase();
  
  let response = {
    role: 'bot',
    timestamp: new Date().toLocaleTimeString()
  };

  // Handle "Popular" button click
  if (lowerInput.includes('popular') || lowerInput === 'popular restaurants') {
    const popularRestaurants = getPopularRestaurants();
    response.content = "🔥 Here are our most popular restaurants based on ratings, order count, and customer reviews:";
    response.recommendations = popularRestaurants;
    response.quickReplies = ["Order from these", "Show more restaurants", "My preferences"];
  }
  
  // Handle "My Orders" button click
  else if (lowerInput.includes('my orders') || lowerInput.includes('order history')) {
    if (userData.orderHistory.length > 0) {
      const recentOrders = userData.orderHistory.slice(0, 5);
      response.content = `📋 You've placed ${userData.orderHistory.length} orders. Here are your recent orders:`;
      response.orderHistory = recentOrders;
      response.quickReplies = ["Reorder favorite", "Rate orders", "View all orders"];
    } else {
      response.content = "📋 You haven't placed any orders yet! Let me show you some great restaurants to get started:";
      response.recommendations = restaurants.slice(0, 3);
      response.quickReplies = ["Show popular", "Browse by cuisine", "Get recommendations"];
    }
  }

  
  
  
  // Handle "Favorites" button click
  else if (lowerInput.includes('favorites') || lowerInput.includes('favourite')) {
    if (userData.favorites.length > 0) {
      const favoriteRestaurants = userData.favorites
        .map(id => restaurants.find(r => r._id === id))
        .filter(Boolean);
      response.content = "❤️ Here are your favorite restaurants:";
      response.recommendations = favoriteRestaurants;
      response.quickReplies = ["Order from favorites", "Remove from favorites", "Add more favorites"];
    } else {
      response.content = "❤️ You haven't added any favorites yet. Try some restaurants and add them to your favorites by clicking the heart button! Here are some popular options:";
      response.recommendations = getPopularRestaurants().slice(0, 3);
      response.quickReplies = ["Show popular", "Browse restaurants", "Get recommendations"];
    }
  }
  
  // Handle recommendations request
  else if (lowerInput.includes('recommend') || lowerInput.includes('suggest')) {
    const recommendations = enhancedRecommendationEngineArrow.getPersonalizedRecommendations(userId, restaurants);
    
    if (userData.behaviorData.totalOrders > 0) {
      response.content = `🎯 Based on your ${userData.behaviorData.totalOrders} previous orders and preferences, here are my top picks:`;
    } else {
      response.content = "🎯 Based on your preferences, here are my personalized recommendations:";
    }
    response.recommendations = recommendations;
    response.quickReplies = ["Order now", "Show more", "Update preferences"];
  }
  
  // Handle cuisine-specific requests
  else if (lowerInput.includes('biryani') || lowerInput.includes('pizza') || lowerInput.includes('burger') || lowerInput.includes('chinese')) {
    const cuisine = extractCuisineFromInput(lowerInput);
    const cuisineRestaurants = restaurants.filter(r => 
      r.cuisine && r.cuisine.some(c => c.toLowerCase().includes(cuisine.toLowerCase()))
    ).slice(0, 4);
    
    response.content = `🍽️ Great choice! Here are the best ${cuisine} restaurants:`;
    response.recommendations = cuisineRestaurants;
    response.quickReplies = ["Order now", "Show more cuisines", "Back to popular"];
  }
  
  // Handle stats request
  else if (lowerInput.includes('stats') || lowerInput.includes('my data')) {
    const stats = userData.behaviorData;
    response.content = `📊 Your Food Journey:\n\n🛒 Total Orders: ${stats.totalOrders}\n💰 Total Spent: Rs. ${stats.totalSpent}\n📈 Average Order: Rs. ${Math.round(stats.averageOrderValue)}\n🍽️ Favorite Cuisine: ${stats.mostOrderedCuisine || 'Still discovering!'}\n❤️ Favorites: ${userData.favorites.length} restaurants`;
    response.quickReplies = ["View favorites", "Order history", "Get recommendations"];
  }
  
  // Default response with helpful options
  else {
    response.content = "I'm here to help you discover amazing food! What would you like to do?";
    response.quickReplies = ["Show popular restaurants", "Get recommendations", "Browse by cuisine", "My order history"];
  }

  return response;
};

// Function to get popular restaurants based on multiple factors
const getPopularRestaurants = () => {
  return restaurants
    .map(restaurant => {
      // Calculate popularity score
      let popularityScore = 0;
      
      // Rating weight (40%)
      popularityScore += (restaurant.rating || 0) * 40;
      
      // Order count simulation (30%)
      // In real app, this would come from database
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
        trendingBadge: popularityScore > 350 ? '🔥 Trending' : popularityScore > 300 ? '⭐ Popular' : ''
      };
    })
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 5);
};

// Function to extract cuisine from user input
const extractCuisineFromInput = (input) => {
  const cuisineKeywords = {
    'biryani': 'Biryani',
    'pizza': 'Pizza',
    'burger': 'Burger',
    'chinese': 'Chinese',
    'fast food': 'Fast Food',
    'pakistani': 'Pakistani',
    'desi': 'Pakistani',
    'italian': 'Italian',
    'bbq': 'BBQ'
  };
  
  for (const [keyword, cuisine] of Object.entries(cuisineKeywords)) {
    if (input.includes(keyword)) {
      return cuisine;
    }
  }
  return 'food';
};

  const completeOnboarding = (finalPreferences = userPreferences) => {
    updateUserPreferences(currentUser.id, finalPreferences);
    setIsNewUser(false);
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const recommendations = enhancedRecommendationEngineArrow.getPersonalizedRecommendations(currentUser.id, restaurants);
      
      setMessages(prev => [...prev, {
        role: 'bot',
        content: `Perfect! I've learned your preferences and created your personal profile. 🎯\n\nBased on your taste, here are my top recommendations:`,
        recommendations: recommendations,
        isOnboarding: false,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }, 1000);
  };

  const generatePersonalizedResponse = (userInput, userId) => {
    const userData = getUserData(userId);
    let response = {
      role: 'bot',
      timestamp: new Date().toLocaleTimeString()
    };

    if (userInput.includes('recommend') || userInput.includes('suggest')) {
      const recommendations = enhancedRecommendationEngineArrow.getPersonalizedRecommendations(userId, restaurants);
      
      if (userData.behaviorData.totalOrders > 0) {
        response.content = `Based on your ${userData.behaviorData.totalOrders} previous orders and preferences, here are my top picks for you:`;
      } else {
        response.content = "Based on your preferences, here are my recommendations:";
      }
      response.recommendations = recommendations;
    }
    else if (userInput.includes('order history') || userInput.includes('my orders')) {
      if (userData.orderHistory.length > 0) {
        response.content = `You've placed ${userData.orderHistory.length} orders. Here are your recent favorites:`;
        const recentFavorites = userData.orderHistory
          .filter(order => order.rating >= 4)
          .slice(0, 3)
          .map(order => restaurants.find(r => r._id === order.restaurantId))
          .filter(Boolean);
        response.recommendations = recentFavorites;
      } else {
        response.content = "You haven't placed any orders yet. Let me recommend some great restaurants!";
        response.recommendations = restaurants.slice(0, 3);
      }
    }
    else if (userInput.includes('favorites')) {
      if (userData.favorites.length > 0) {
        response.content = "Here are your favorite restaurants:";
        const favoriteRestaurants = userData.favorites
          .map(id => restaurants.find(r => r._id === id))
          .filter(Boolean);
        response.recommendations = favoriteRestaurants;
      } else {
        response.content = "You haven't added any favorites yet. Try some restaurants and add them to your favorites!";
        response.quickReplies = ["Show recommendations", "Popular restaurants"];
      }
    }
    else if (userInput.includes('stats') || userInput.includes('my data')) {
      const stats = userData.behaviorData;
      response.content = `📊 Your Food Stats:\n\n🛒 Total Orders: ${stats.totalOrders}\n💰 Total Spent: Rs. ${stats.totalSpent}\n📈 Average Order: Rs. ${Math.round(stats.averageOrderValue)}\n🍽️ Favorite Cuisine: ${stats.mostOrderedCuisine || 'Not enough data'}`;
    }
    else if (userInput.includes('popular')) {
      const popularRestaurants = restaurants
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);
      
      response.content = "Here are our most popular restaurants right now! 🔥";
      response.recommendations = popularRestaurants;
    }
    else {
      response.content = chatbotResponses.fallback[Math.floor(Math.random() * chatbotResponses.fallback.length)];
      response.quickReplies = ["Show recommendations", "Popular restaurants", "My orders", "My favorites"];
    }

    return response;
  };

  const sendMessage = async () => {
  if (!inputMessage.trim()) return;

  const userMsg = {
    role: 'user',
    content: inputMessage,
    timestamp: new Date().toLocaleTimeString()
  };
  
  setMessages(prev => [...prev, userMsg]);
  const currentInput = inputMessage;
  setInputMessage('');
  setIsTyping(true);

  // First try the enhanced chatbot response
  setTimeout(() => {
    setIsTyping(false);
    
    // Use enhanced response for specific commands
    if (currentInput.toLowerCase().includes('popular') || 
        currentInput.toLowerCase().includes('my orders') || 
        currentInput.toLowerCase().includes('favorites') ||
        currentInput.toLowerCase().includes('recommend') ||
        currentInput.toLowerCase().includes('stats')) {
      
      const response = generateEnhancedChatbotResponse(currentInput.toLowerCase(), currentUser?.id || 'guest');
      setMessages(prev => [...prev, response]);
    } else {
      // Fallback to existing chatbot or simple response
      const response = generatePersonalizedResponse(currentInput.toLowerCase(), currentUser?.id || 'guest');
      setMessages(prev => [...prev, response]);
    }
  }, 1000);
};

// 2. Add function to handle special chat responses
const handleSpecialChatResponse = (responseData) => {
  switch (responseData.type) {
    case 'reorder_confirmation':
      // Auto-fill cart with reorder items
      if (responseData.orderData) {
        setSelectedRestaurant(responseData.orderData.restaurant);
        setCart(responseData.orderData.items.map(item => ({
          ...item.menuItem,
          quantity: item.quantity
        })));
      }
      break;
      
    case 'quick_recommendations':
      // Show restaurant cards in chat
      break;
      
    case 'menu_display':
      // Show menu items
      if (responseData.restaurant) {
        setSelectedRestaurant(responseData.restaurant);
      }
      break;
      
    case 'cart_update':
      // Update cart state
      if (responseData.cart) {
        setCart(responseData.cart.map(item => ({
          ...item.menuItem,
          quantity: item.quantity
        })));
      }
      break;
      
    case 'order_confirmation':
      // Show order summary
      if (responseData.orderSummary) {
        setShowCheckout(true);
        // Pre-fill checkout data
        setDeliveryAddress({
          name: currentUser?.name || '',
          phone: responseData.orderSummary.address.phone || '',
          area: responseData.orderSummary.address.area || '',
          street: responseData.orderSummary.address.street || '',
          instructions: ''
        });
      }
      break;
      
    case 'order_success':
      // Handle successful order
      if (responseData.order) {
        setOrderStatus(responseData.order);
        setCart([]);
        setShowCheckout(false);
        setShowOrderTracking(true);
        
        // Add order to user history
        addToUserOrderHistory(currentUser.id, {
          id: responseData.order.orderNumber,
          restaurantId: responseData.order.restaurant,
          restaurantName: selectedRestaurant?.name || 'Restaurant',
          items: responseData.order.items,
          total: responseData.order.pricing.total,
          status: 'confirmed'
        }, restaurants);
      }
      break;
  }
};


const renderChatMessage = (msg, index) => {
  return (
    <div key={index} className="message-container">
      <div className={`message ${msg.role}`}>
        <div className="message-content">
          {msg.content}
        </div>
        <div className="message-time">{msg.timestamp}</div>
      </div>

      {/* Enhanced message content */}
      {msg.data && renderEnhancedMessageContent(msg.data)}
    </div>
  );
};

// 4. Add function to render enhanced message content
const renderEnhancedMessageContent = (data) => {
  switch (data.type) {
    case 'reorder_confirmation':
      return (
        <div className="chat-order-confirmation">
          <div className="reorder-summary">
            <h4>Reorder from {data.orderData.restaurant.name}</h4>
            <div className="reorder-items">
              {data.orderData.items.map((item, idx) => (
                <div key={idx} className="reorder-item">
                  {item.menuItem.name} x{item.quantity} - Rs. {item.price * item.quantity}
                </div>
              ))}
            </div>
          </div>
          <div className="reorder-actions">
            <button 
              className="action-btn confirm"
              onClick={() => handleChatOrderAction('confirm_reorder', data.orderData)}
            >
              ✅ Confirm Reorder
            </button>
            <button 
              className="action-btn modify"
              onClick={() => handleChatOrderAction('modify_order', data.orderData)}
            >
              ✏️ Modify Order
            </button>
          </div>
        </div>
      );

    case 'quick_recommendations':
    case 'menu_display':
      return (
        <div className="chat-recommendations">
          {data.restaurants?.map((restaurant, idx) => (
            <div 
              key={idx} 
              className="recommendation-card"
              onClick={() => selectRestaurant(restaurant)}
            >
              <div className="rec-header">
                <h4>{restaurant.name}</h4>
                <div className="rec-rating">⭐ {restaurant.rating}</div>
              </div>
              <p className="rec-cuisine">{restaurant.cuisine?.join(', ')}</p>
              <div className="rec-info">
                <span className="rec-price">{getPriceRangeDisplay(restaurant.priceRange)}</span>
                <span className="rec-delivery">🚚 {restaurant.deliveryTime}</span>
              </div>
            </div>
          ))}
          
          {data.menuItems?.map((item, idx) => (
            <div 
              key={idx} 
              className="menu-item-card"
              onClick={() => addToCart(item)}
            >
              <div className="menu-item-info">
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <span className="price">Rs. {item.price}</span>
              </div>
              <button className="add-to-cart-btn">Add +</button>
            </div>
          ))}
        </div>
      );

    case 'cart_update':
      return (
        <div className="chat-cart-summary">
          <h4>🛒 Your Cart</h4>
          {data.cart?.map((item, idx) => (
            <div key={idx} className="cart-item-summary">
              {item.menuItem.name} x{item.quantity} - Rs. {item.price * item.quantity}
            </div>
          ))}
          <div className="cart-total">Total: Rs. {data.total}</div>
        </div>
      );

    case 'address_collection':
      return (
        <div className="chat-address-form">
          <div className="address-fields">
            {data.fields?.map(field => (
              <input
                key={field}
                type="text"
                placeholder={`Enter ${field}`}
                className="chat-input-field"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const value = e.target.value;
                    handleQuickReply(`${field}: ${value}`);
                    e.target.value = '';
                  }
                }}
              />
            ))}
          </div>
        </div>
      );

    case 'order_success':
      return (
        <div className="chat-order-success">
          <div className="success-animation">🎉</div>
          <h4>Order #{data.order?.orderNumber}</h4>
          <p>Estimated delivery: {data.trackingInfo?.estimatedDelivery}</p>
          <button 
            className="track-order-btn"
            onClick={() => setShowOrderTracking(true)}
          >
            📍 Track Order
          </button>
        </div>
      );

    default:
      // Render suggestions if available
      if (data.suggestions) {
        return (
          <div className="chat-suggestions">
            {data.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-btn"
                onClick={() => handleQuickReply(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        );
      }
      return null;
  }
};

// 5. Add function to handle chat order actions
const handleChatOrderAction = async (action, orderData) => {
  try {
    const response = await fetch('http://localhost:5000/api/chat/order-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        userId: currentUser?.id || 'guest',
        orderData
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Add bot response to chat
      const botResponse = {
        role: 'bot',
        content: data.response.message,
        timestamp: new Date().toLocaleTimeString(),
        data: data.response
      };
      
      setMessages(prev => [...prev, botResponse]);
      handleSpecialChatResponse(data.response);
    }
  } catch (error) {
    console.error('Order action error:', error);
  }
};
  const handleQuickReply = (reply) => {
    setInputMessage(reply);
    sendMessage();
  };

  // Enhanced quick reply handler
const handleEnhancedQuickReply = (reply) => {
  console.log('🎯 Quick reply clicked:', reply);
  
  // Map quick replies to appropriate responses
  const quickReplyMap = {
    'Show popular restaurants': 'popular restaurants',
    'Get recommendations': 'recommend restaurants',
    'Browse by cuisine': 'show me different cuisines',
    'My order history': 'my orders',
    'View favorites': 'my favorites',
    'Order now': 'I want to order',
    'Show more': 'show more restaurants',
    'Back to popular': 'popular restaurants'
  };
  
  const mappedReply = quickReplyMap[reply] || reply;
  setInputMessage('');
  
  // Generate response
  const response = generateEnhancedChatbotResponse(mappedReply, currentUser?.id || 'guest');
  setMessages(prev => [
    ...prev,
    {
      role: 'user',
      content: reply,
      timestamp: new Date().toLocaleTimeString()
    },
    response
  ]);
};

  // Enhanced recommendation card click handler
// Enhanced recommendation card click handler
const handleRecommendationClick = (restaurant) => {
  console.log('🏪 Restaurant selected from chat:', restaurant.name);

  // Close chat and select restaurant
  setShowChat(false);
  selectRestaurant(restaurant);

  // Add a helpful message
  setTimeout(() => {
  alert(`🎉 Great choice! ${restaurant.name} is now selected. You can view their menu and add items to your cart.`);
}, 500);
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
      alert('Thank you for your feedback! Your rating helps us improve our service. 🌟');
      
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

  // ===== RENDER COMPONENT =====
  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <h1>🍕 Pakistani Food Delivery</h1>
        <div className="header-buttons">
          {currentUser ? (
            <div className="user-menu">
              <span className="user-name">👤 {currentUser.name}</span>
              {currentUser.isAdmin && (
                <button onClick={() => setShowAdminDashboard(!showAdminDashboard)} className="admin-button">
                  {showAdminDashboard ? '🏠 Customer View' : '📊 Admin Dashboard'}
                </button>
              )}
              {currentUser && !currentUser.isAdmin && (
                <button onClick={() => setShowUserProfile(true)} className="profile-button">
                  📊 My Profile
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
              📍 Track Order
            </button>
          )}
          <button onClick={() => setShowChat(!showChat)} className="chat-toggle">
            💬 Smart Assistant {isNewUser && <span className="notification-dot"></span>}
          </button>
          <div className="cart-info">
            🛒 Cart ({cart.length})
          </div>
        </div>
      </header>

      <div className="main-container">
        {/* Admin Dashboard */}
        {showAdminDashboard && currentUser?.isAdmin ? (
          <div className="admin-dashboard">
            <div className="dashboard-header">
              <div>
                <h2>📊 Analytics Dashboard</h2>
                <p className="dashboard-subtitle">Real-time business insights</p>
              </div>
              <div className="dashboard-actions">
                <button className="refresh-btn" onClick={fetchAnalytics} disabled={analyticsLoading}>
                  {analyticsLoading ? '🔄' : '↻'} Refresh
                </button>
                <div className="last-updated">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {analyticsLoading ? (
              <div className="analytics-loading">
                <div className="loading-spinner"></div>
                <p>Loading analytics...</p>
              </div>
            ) : analyticsData ? (
              <>
                <div className="metrics-grid">
                  <div className="metric-card revenue">
                    <div className="metric-icon">💰</div>
                    <div className="metric-content">
                      <h3>Total Revenue</h3>
                      <div className="metric-value">Rs. {analyticsData.totalRevenue.toLocaleString()}</div>
                      <div className="metric-change positive">+{analyticsData.growthRate}% this month</div>
                    </div>
                  </div>

                  <div className="metric-card orders">
                    <div className="metric-icon">📦</div>
                    <div className="metric-content">
                      <h3>Total Orders</h3>
                      <div className="metric-value">{analyticsData.totalOrders}</div>
                      <div className="metric-change positive">+12% this week</div>
                    </div>
                  </div>

                  <div className="metric-card customers">
                    <div className="metric-icon">👥</div>
                    <div className="metric-content">
                      <h3>Active Customers</h3>
                      <div className="metric-value">{analyticsData.activeCustomers}</div>
                      <div className="metric-change positive">+5 new today</div>
                    </div>
                  </div>

                  <div className="metric-card avg-order">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                      <h3>Avg Order Value</h3>
                      <div className="metric-value">Rs. {Math.round(analyticsData.avgOrderValue)}</div>
                      <div className="metric-change positive">+8% vs last month</div>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <h3>🏆 Popular Restaurants</h3>
                    <div className="chart-content">
                      {analyticsData.popularRestaurants.map((restaurant, index) => (
                        <div key={restaurant.name} className="chart-bar">
                          <div className="bar-label">
                            <span className="rank">#{index + 1}</span>
                            <span className="name">{restaurant.name}</span>
                          </div>
                          <div className="bar-container">
                            <div 
                              className="bar-fill" 
                              style={{ 
                                width: `${(restaurant.orders / Math.max(...analyticsData.popularRestaurants.map(r => r.orders))) * 100}%`,
                                backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'][index]
                              }}
                            ></div>
                          </div>
                          <span className="bar-value">{restaurant.orders} orders</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="chart-card">
                    <h3>📋 Order Status Distribution</h3>
                    <div className="status-chart">
                      {analyticsData.orderStatusData.map((status, index) => (
                        <div key={status.status} className="status-item">
                          <div className="status-indicator" style={{
                            backgroundColor: status.status === 'Delivered' ? '#27ae60' : 
                                           status.status === 'Confirmed' ? '#f39c12' : 
                                           status.status === 'Preparing' ? '#e74c3c' : '#3498db'
                          }}></div>
                          <span className="status-label">{status.status}</span>
                          <span className="status-count">{status.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="chart-card sales-trend">
                    <h3>📈 Sales Trend (Last 7 Days)</h3>
                    <div className="trend-chart">
                      {salesTrends.map((day, index) => (
                        <div key={day.date} className="trend-bar">
                          <div 
                            className="trend-fill" 
                            style={{ 
                              height: `${(day.sales / Math.max(...salesTrends.map(d => d.sales))) * 100}%`
                            }}
                          ></div>
                          <span className="trend-label">{day.date.split('-')[2]}</span>
                          <span className="trend-value">Rs. {day.sales}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="recent-activity">
                  <h3>⚡ Recent Activity</h3>
                  <div className="activity-list">
                    <div className="activity-item">
                      <div className="activity-icon new-order">📦</div>
                      <div className="activity-content">
                        <p><strong>New order</strong> from Ahmed Khan</p>
                        <span className="activity-time">2 minutes ago</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon delivered">✅</div>
                      <div className="activity-content">
                        <p><strong>Order delivered</strong> to Fatima Ali</p>
                        <span className="activity-time">15 minutes ago</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon restaurant">🏪</div>
                      <div className="activity-content">
                        <p><strong>Student Biryani</strong> updated menu</p>
                        <span className="activity-time">1 hour ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-data">
                <p>No analytics data available</p>
                <button onClick={fetchAnalytics}>Retry</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Regular Customer View */}
            <div className="content">
              {!selectedRestaurant ? (
    <div className="restaurants-section">
        {/* Debug component to verify React is working */}
        {currentUser && !currentUser.isAdmin && (
            <div style={{ 
                background: '#f0f8ff', 
                padding: '10px', 
                margin: '10px 0', 
                border: '1px solid #007bff',
                borderRadius: '5px'
            }}>
                <h3>🔍 Debug Info</h3>
                <p>User: {currentUser.name}</p>
                <p>Recommendations loaded: {enhancedRecommendations.length}</p>
                <p>Loading: {loadingEnhancedRecs ? 'Yes' : 'No'}</p>
                <p>Should show enhanced section: {(!currentUser?.isAdmin) ? 'Yes' : 'No'}</p>
            </div>
        )}
        
        {/* Enhanced Recommendations Section */}
        {currentUser && !currentUser.isAdmin && <EnhancedRecommendationsSection />}
        
        {/* Regular Restaurants Section */}
        <div className="regular-restaurants">
            <h2>All Restaurants</h2>
            {loading ? (
                <p>Loading restaurants...</p>
            ) : restaurants && restaurants.length > 0 ? (
                <div className="restaurant-grid">
                    {restaurants.map(restaurant => (
                        <div 
                            key={restaurant._id} 
                            className="restaurant-card"
                            onClick={() => selectRestaurant(restaurant)}
                        >
                            <h3>{restaurant.name}</h3>
                            <p className="cuisine">{restaurant.cuisine ? restaurant.cuisine.join(', ') : 'Cuisine not specified'}</p>
                            <div className="restaurant-info">
                                <span>⭐ {restaurant.rating}</span>
                                <span>{getPriceRangeDisplay(restaurant.priceRange)}</span>
                                <span>🚚 {restaurant.deliveryTime}</span>
                            </div>
                            <p className="min-order">Min order: Rs. {restaurant.minimumOrder}</p>
                            
                            {/* Add favorite button to regular restaurants too */}
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
              {/* Surge Status Banner */}
              {surgeStatus && surgeStatus.active && (
                <div className={`surge-banner ${surgeStatus.level}`}>
                  🔥 {surgeStatus.level.toUpperCase()} DEMAND - {surgeStatus.multiplier}x Pricing
                  <div className="surge-factors">
                    {surgeStatus.factors.time && <span>⏰ Peak Time</span>}
                    {surgeStatus.factors.weather && <span>🌦️ Weather</span>}
                    {surgeStatus.factors.demand && <span>📈 High Demand</span>}
                  </div>
                </div>
              )}
              
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
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="cart-total">
                    <p>Subtotal: Rs. {calculateTotalWithDynamicPricing().subtotal}</p>
                    
                    {/* Dynamic Pricing Display */}
                    <div className="delivery-fee-section">
                      {dynamicPricing ? (
                        <div className="dynamic-pricing-display">
                          <div className="delivery-fee-line">
                            <span>Delivery Fee:</span>
                            <div className="price-breakdown">
                              {dynamicPricing.multiplier !== 1.0 && (
                                <span className="original-price">Rs. {dynamicPricing.originalPrice}</span>
                              )}
                              <span className={`dynamic-price ${dynamicPricing.surgeActive ? 'surge' : calculateTotalWithDynamicPricing().savings > 0 ? 'discount' : ''}`}>
                                Rs. {dynamicPricing.dynamicPrice}
                              </span>
                            </div>
                          </div>
                          
                          {dynamicPricing.surgeActive && (
                            <div className="pricing-notice surge">
                              🔥 Surge pricing active ({dynamicPricing.multiplier}x)
                            </div>
                          )}
                          
                          {calculateTotalWithDynamicPricing().savings > 0 && (
                            <div className="pricing-notice discount">
                              💰 You save Rs. {calculateTotalWithDynamicPricing().savings.toFixed(2)} with off-peak pricing!
                            </div>
                          )}
                          
                          {pricingLoading && (
                            <div className="pricing-loading">
                              <span className="spinner">⟳</span> Updating prices...
                            </div>
                          )}
                          
                          {/* Pricing Breakdown */}
                          <div className="pricing-breakdown-mini">
                            <div className="breakdown-item">
                              <span>Time factor:</span>
                              <span>{dynamicPricing.breakdown.time}x</span>
                            </div>
                            <div className="breakdown-item">
                              <span>Demand factor:</span>
                              <span>{dynamicPricing.breakdown.demand}x</span>
                            </div>
                            <div className="breakdown-item">
                              <span>Weather factor:</span>
                              <span>{dynamicPricing.breakdown.weather}x</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p>Delivery: Rs. {calculateTotalWithDynamicPricing().deliveryFee}</p>
                      )}
                    </div>
                    
                    <p className="total">Total: Rs. {calculateTotalWithDynamicPricing().total}</p>
                  </div>
                  
                  <button className="order-button" onClick={() => setShowCheckout(true)}>
                    Place Order - Rs. {calculateTotalWithDynamicPricing().total}
                  </button>
                </>
              )}
            </div>
            </div>
          </>
        )}

        {/* Enhanced Smart Chatbot */}
        {showChat && (
          <div className="smart-chatbot">
            <div className="chat-header">
              <div className="chat-title">
                <h3>🤖 Smart Food Assistant</h3>
                {isNewUser && <span className="onboarding-badge">Setting up your profile...</span>}
              </div>
              <button onClick={() => setShowChat(false)} className="close-chat">✖</button>
            </div>

            <div className="chat-messages">
              {messages.length === 0 && !isNewUser && (
                <div className="chat-welcome-container">
                  <div className="ai-avatar">🍕</div>
                  <p className="chat-welcome">Hi! I'm your AI food assistant. I can help you:</p>
                  <div className="welcome-features">
                    <div className="feature">🎯 Get personalized recommendations</div>
                    <div className="feature">🍔 Find restaurants by cuisine</div>
                    <div className="feature">💰 Filter by budget</div>
                    <div className="feature">🌶️ Match spice preferences</div>
                  </div>
                  {currentUser && Object.keys(getUserData(currentUser.id).preferences).length === 0 && (
                    <button 
                      className="setup-preferences-btn"
                      onClick={startOnboarding}
                    >
                      🎯 Set Up My Preferences
                    </button>
                  )}
                </div>
              )}

                {/* Update your chat messages JSX section to handle new response types */}
{/* Find your messages.map() in the chat and update it: */}

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

    {/* Restaurant Recommendations */}
    {msg.recommendations && msg.recommendations.length > 0 && (
      <div className="chat-recommendations">
        {msg.recommendations.map((restaurant, idx) => (
          <div 
            key={idx} 
            className="recommendation-card"
            onClick={() => handleRecommendationClick(restaurant)}
          >
            <div className="rec-header">
              <h4>{restaurant.name}</h4>
              <div className="rec-rating">⭐ {restaurant.rating}</div>
            </div>
            <p className="rec-cuisine">{restaurant.cuisine ? restaurant.cuisine.join(', ') : 'Various cuisines'}</p>
            <div className="rec-info">
              <span className="rec-price">{getPriceRangeDisplay(restaurant.priceRange)}</span>
              <span className="rec-delivery">🚚 {restaurant.deliveryTime}</span>
            </div>
            
            {/* Show trending badge */}
            {restaurant.trendingBadge && (
              <div className="trending-badge-chat">
                {restaurant.trendingBadge}
              </div>
            )}
            
            {/* Show order count for popular restaurants */}
            {restaurant.orderCount && (
              <div className="order-count">
                📦 {restaurant.orderCount}+ orders
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

    {/* Order History Display */}
    {msg.orderHistory && (
      <ChatOrderHistory orders={msg.orderHistory} />
    )}

    {/* Onboarding options (keep existing) */}
    {msg.questionData && (
      <div className="onboarding-options">
        {msg.questionData.options.map((option, idx) => (
          <button
            key={idx}
            className="option-button"
            onClick={() => handleOptionSelect(option, msg.questionData.key)}
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

              <div className="chat-input-section">
                {!isNewUser && (
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
                
                <div className="chat-input">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isNewUser && sendMessage()}
                    placeholder={isNewUser ? "Please select an option above..." : "Ask me anything about food..."}
                    disabled={isNewUser}
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={isNewUser || !inputMessage.trim()}
                    className="send-button"
                  >
                    <span>🚀</span>
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
                      <h3>🎯 Your Preferences</h3>
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
                        onClick={() => {
                          setShowUserProfile(false);
                          setIsNewUser(true);
                          setShowChat(true);
                          startOnboarding();
                        }}
                      >
                        🔄 Update Preferences
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
                <h2>⭐ Rate Your Order</h2>
                <button onClick={() => setShowRatingModal(false)} className="close-button">✖</button>
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
                    {currentRating === 1 && 'Poor - Not satisfied 😞'}
                    {currentRating === 2 && 'Fair - Below expectations 😐'}
                    {currentRating === 3 && 'Good - Satisfied 😊'}
                    {currentRating === 4 && 'Very Good - Exceeded expectations 😄'}
                    {currentRating === 5 && 'Excellent - Outstanding! 🤩'}
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
                    Submit Rating {currentRating > 0 && `(${currentRating} ⭐)`}
                  </button>
                </div>
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
              
              <div className="checkout-form">
                <h3>Delivery Details</h3>
                
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

        {/* Enhanced Order Tracking Modal */}
        {showOrderTracking && orderStatus && (
          <div className="modal-overlay">
            <div className="tracking-modal">
              <div className="tracking-header">
                <h2>Track Your Order</h2>
                <button onClick={() => setShowOrderTracking(false)} className="close-button">✖</button>
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

                {currentOrderStatus === 'on-the-way' && (
                  <div className="rider-info">
                    <h3>Rider Details</h3>
                    <div className="rider-card">
                      <div className="rider-avatar">🏍️</div>
                      <div className="rider-details">
                        <h4>Muhammad Ali</h4>
                        <p>+92 321-1234567</p>
                        <div className="rider-rating">⭐ 4.8</div>
                      </div>
                      <button className="call-rider">📞 Call</button>
                    </div>
                  </div>
                )}

                {currentOrderStatus === 'delivered' && (
                  <div className="delivery-complete">
                    <h3>🎉 Order Delivered Successfully!</h3>
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
                  
                  {/* Show Dynamic Pricing Info if Available */}
                  {orderStatus.pricing?.surgeActive && (
                    <div className="order-pricing-info">
                      <p><strong>Pricing:</strong> Surge pricing was active ({orderStatus.pricing.pricingMultiplier}x)</p>
                      <small>Original delivery fee: Rs. {orderStatus.pricing.baseDeliveryFee || orderStatus.pricing.deliveryFee}</small>
                    </div>
                  )}
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
                <button onClick={() => setShowAuth(false)} className="close-button">✖</button>
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
              
              <div className="auth-divider">OR</div>
              
              <div className="social-auth">
                <button className="social-button google">
                  <img src="https://www.google.com/favicon.ico" alt="Google" />
                  Continue with Google
                </button>
                <button className="social-button facebook">
                  <img src="https://www.facebook.com/favicon.ico" alt="Facebook" />
                  Continue with Facebook
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;