  // frontend/src/App.js - COMPLETE ENHANCED VERSION
  import React, { useState, useEffect, useCallback } from 'react';
  import AdminDashboard from './components/admin/AdminDashboard';
  import OrderManagement from './components/admin/OrderManagement';
  import RestaurantManagement from './components/admin/RestaurantManagement';
  import UserAnalytics from './components/admin/UserAnalytics';
  import dataManager from './components/shared/DataManager';
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
      
      return " Recommended for you";
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
     console.log('🚀 App function called - starting render');
    // ===== ALL STATE VARIABLES =====
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

    
    const [chatLoading, setChatLoading] = useState(false);

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
        let requestUserId = userId;
        
        if (!userId || userId === 'guest' || userId.length < 20) {
            requestUserId = '6870bd22f7b37e4543eebd97';
            console.log('🔄 Using budget test user ObjectId:', requestUserId);
        }
        
        const url = `http://localhost:5000/api/recommendations/advanced/${requestUserId}?count=6&includeNew=true`;
        console.log('📡 Requesting:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📦 RAW API Response:', JSON.stringify(data, null, 2));
        
        // DETAILED DATA INSPECTION
        if (data.recommendations) {
            console.log('📊 Recommendations array length:', data.recommendations.length);
            
            data.recommendations.forEach((rec, index) => {
                console.log(`🔍 Recommendation ${index}:`, {
                    hasRec: !!rec,
                    type: typeof rec,
                    keys: rec ? Object.keys(rec) : 'N/A',
                    name: rec?.name || 'MISSING NAME',
                    id: rec?.id || 'MISSING ID',
                    fullObject: rec
                });
            });
        }
        
        if (data.success && data.recommendations && data.recommendations.length > 0) {
            // SAFE FILTERING WITH DETAILED LOGGING
            const validRecommendations = data.recommendations.filter((rec, index) => {
                const isValid = rec && 
                               typeof rec === 'object' && 
                               rec.name && 
                               typeof rec.name === 'string' &&
                               rec.name.trim().length > 0;
                
                if (!isValid) {
                    console.warn(`⚠️ Invalid recommendation at index ${index}:`, {
                        exists: !!rec,
                        type: typeof rec,
                        hasName: !!rec?.name,
                        nameType: typeof rec?.name,
                        nameValue: rec?.name,
                        fullRec: rec
                    });
                    return false;
                }
                
                console.log(`✅ Valid recommendation ${index}: ${rec.name}`);
                return true;
            });
            
            console.log('✅ Valid recommendations count:', validRecommendations.length);
            
            if (validRecommendations.length > 0) {
                setEnhancedRecommendations(validRecommendations);
                setShowEnhancedRecs(true);
            } else {
                console.log('❌ No valid recommendations after filtering - using empty state');
                setEnhancedRecommendations([]);
                setShowEnhancedRecs(true);
            }
            
        } else {
            console.log('❌ API returned no recommendations');
            setEnhancedRecommendations([]);
            setShowEnhancedRecs(true);
        }
    } catch (error) {
        console.error('❌ Enhanced recommendations error:', error);
        console.error('❌ Error stack:', error.stack);
        
        // SAFE FALLBACK
        setEnhancedRecommendations([]);
        setShowEnhancedRecs(true);
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
  // Initialize enhanced data manager when app loads
  dataManager.initializeData();
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
        console.log('📡 Fetching enhanced recommendations for user:', currentUser.id);
        fetchEnhancedRecommendations(currentUser.id);
    } else {
        console.log('❌ Not fetching recommendations - no user or admin user');
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

    // Fetch pricing when cart or restaurant changes
    useEffect(() => {
  if (selectedRestaurant && cart.length > 0) {
    console.log('🔄 Cart or restaurant changed, fetching pricing...');
    fetchDynamicPricing();
    fetchSurgeStatus();
    
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


    //const normalizedMessage = normalizeUserInput(currentInput);

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
    
    // Handle budget test user
    if (authForm.email === 'budget@test.com') {
        const budgetUser = {
            id: '6870bd22f7b37e4543eebd97', // Your actual budget user ObjectId
            name: 'Ahmed Budget',
            email: authForm.email,
            phone: '0321-1111111',
            isAdmin: false
        };
        
        setCurrentUser(budgetUser);
        localStorage.setItem('currentUser', JSON.stringify(budgetUser));
        setShowAuth(false);
        alert(`Welcome back, ${budgetUser.name}!`);
        
        setAuthForm({ name: '', email: '', password: '', phone: '' });
        return;
    }
    
    // Handle KFC test user
    if (authForm.email === 'kfc@test.com') {
        const kfcUser = {
            id: '6870bd84e75152da7d6afb6a', // Your KFC test user ObjectId
            name: 'Sara KFC Lover',
            email: authForm.email,
            phone: '0333-9876543',
            isAdmin: false
        };
        
        setCurrentUser(kfcUser);
        localStorage.setItem('currentUser', JSON.stringify(kfcUser));
        setShowAuth(false);
        alert(`Welcome back, ${kfcUser.name}!`);
        
        setAuthForm({ name: '', email: '', password: '', phone: '' });
        return;
    }
    
    // Default login for other users
    if (authForm.email && authForm.password) {
        const user = {
            id: '6870bd22f7b37e4543eebd97', // Default to budget user for testing
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
    setIsOnboardingActive(false);
    
    setAuthForm({ name: '', email: '', password: '', phone: '' });
    
    alert(`Welcome ${newUser.name}! Click the chat button to set up your preferences.`);
  }
};

    // ===== ENHANCED CHATBOT FUNCTIONS =====
    const startOnboarding = () => {
    if (isOnboardingActive) {
      console.log('⚠️ Onboarding already in progress, skipping...');
      return;
    }
    
    console.log('🚀 Starting onboarding process...');
    setIsOnboardingActive(true);
    setCurrentOnboardingStep(0);
    setUserPreferences({});
    
    // Clear previous messages and start fresh
    setMessages([{
      role: 'bot',
      content: `Welcome to Pakistani Food Delivery, ${currentUser?.name || 'there'}! 🎉\n\nI'm your AI food assistant and I'll help you discover the perfect meals based on your preferences. Let's get to know your taste!`,
      isOnboarding: true,
      timestamp: new Date().toLocaleTimeString()
    }]);
    
    setTimeout(() => {
      if (isOnboardingActive) {
        console.log('📝 Showing first onboarding question...');
        showNextOnboardingQuestion();
      }
    }, 2000);
  };

  // Updated showNextOnboardingQuestion function
  const showNextOnboardingQuestion = () => {
  if (!isOnboardingActive) {
    console.log('⚠️ Onboarding not active, skipping question...');
    return;
  }
  
  if (currentOnboardingStep >= onboardingQuestions.length) {
    console.log('⚠️ No more questions, completing onboarding...');
    completeOnboarding();
    return;
  }
  
  const question = onboardingQuestions[currentOnboardingStep];
  console.log('📋 Showing question:', question.question, 'Step:', currentOnboardingStep + 1, '/', onboardingQuestions.length);
  
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
          console.log('⚠️ This question already exists, skipping...');
          return prev;
        }
        
        console.log('✅ Adding new question');
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
  
  // Updated handleOptionSelect function
  const handlePreferenceUpdate = () => {
  console.log('🔄 Starting preference update...');
  setShowUserProfile(false);
  setShowChat(true);
  
  // Complete reset with proper timing
  setIsOnboardingActive(false);
  setIsNewUser(false); // Make sure this is false
  setCurrentOnboardingStep(0);
  setUserPreferences({});
  setIsTyping(false);
  setMessages([]); // Clear all messages
  
  // Start fresh onboarding after state has settled
  setTimeout(() => {
    console.log('🚀 Starting fresh preference update onboarding...');
    
    setIsOnboardingActive(true);
    setCurrentOnboardingStep(0);
    
    // Add welcome message
    const welcomeMessage = {
      role: 'bot',
      content: `Let's update your preferences, ${currentUser?.name}! \n\nI'll ask you a few questions to personalize your recommendations better.`,
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
      console.log('✅ First question added for preference update');
    }, 1500);
    
  }, 300); // Reduced delay for better UX
};

const handleOptionSelect = (option, questionKey) => {
  if (!isOnboardingActive) {
    console.log('⚠️ Onboarding not active, ignoring option select...');
    return;
  }
  
  console.log('✅ Processing option selection:', { 
    option, 
    questionKey, 
    currentStep: currentOnboardingStep,
    totalQuestions: onboardingQuestions.length 
  });
  
  // Add user's response to chat
  setMessages(prev => [...prev, {
    role: 'user',
    content: option,
    timestamp: new Date().toLocaleTimeString()
  }]);

  // Update preferences
  const newPrefs = { ...userPreferences, [questionKey]: option };
  setUserPreferences(newPrefs);
  console.log('💾 Updated preferences:', newPrefs);
  
  const nextStep = currentOnboardingStep + 1;
  setCurrentOnboardingStep(nextStep);
  
  // Short delay before next question
  setTimeout(() => {
    if (isOnboardingActive) {
      if (nextStep < onboardingQuestions.length) {
        console.log(`📝 Moving to step ${nextStep + 1}/${onboardingQuestions.length}`);
        showNextOnboardingQuestion();
      } else {
        console.log('🎉 Completing preference update...');
        completeOnboarding(newPrefs);
      }
    }
  }, 800); // Slightly longer delay for better UX
};

  const EnhancedRecommendationsSection = () => {
    console.log('🎯 EnhancedRecommendationsSection rendering...', {
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
        console.log('❌ No user or admin user, not showing enhanced recs');
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
        if (!explanation || typeof explanation !== 'string') return '💡 Recommended';
        
        const iconMap = {
            'Based on your preferences': '🎯',
            'Popular choice': '🔥', 
            'Highly rated': '⭐',
            'Recommended for you': '💫',
            'New restaurant': '🆕',
            'Fast delivery': '⚡',
            'Matches your preferences': '❤️',
            'Popular with similar users': '👥',
            'Perfect for this time': '⏰',
            'Trending now': '🔥'
        };
        
        for (const [key, icon] of Object.entries(iconMap)) {
            if (explanation.toLowerCase().includes(key.toLowerCase())) {
                return `${icon} ${explanation}`;
            }
        }
        return `💡 ${explanation}`;
    };

    return (
        <div className="enhanced-recommendations-section">
            {/* Animated background elements */}
            <div className="bg-decoration">
                <div className="floating-element" style={{top: '10%', left: '80%', animationDelay: '0s'}}>🍕</div>
                <div className="floating-element" style={{top: '70%', left: '10%', animationDelay: '2s'}}>🍔</div>
                <div className="floating-element" style={{top: '30%', left: '90%', animationDelay: '4s'}}>🍜</div>
            </div>

            {loadingEnhancedRecs ? (
                // Enhanced Loading state
                <>
                    <div className="enhanced-rec-header">
                        <h2>🎯 Crafting Your Perfect Menu</h2>
                        <p>Our AI is analyzing your taste profile...</p>
                        <div className="loading-stages">
                            <div className="stage active">📊 Analyzing preferences</div>
                            <div className="stage">🔍 Finding matches</div>
                            <div className="stage">⭐ Ranking restaurants</div>
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
                // Enhanced Empty state
                <>
                    <div className="enhanced-rec-header">
                        <h2>🎯 Your Personalized Dashboard</h2>
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
                                    console.log('🔄 Manual refresh clicked');
                                    fetchEnhancedRecommendations(currentUser.id);
                                }}
                            >
                                🎯 Get My Recommendations
                            </button>
                            <button 
                                className="setup-preferences secondary"
                                onClick={() => {
                                    setShowChat(true);
                                    setTimeout(() => startOnboarding(), 500);
                                }}
                            >
                                ⚙️ Set Up Preferences
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                // Enhanced recommendations display
                <>
                    <div className="enhanced-rec-header">
                        <h2>🎯 Personalized Just For You</h2>
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
                        {loadingEnhancedRecs && <span className="loading-indicator">🔄 Updating...</span>}
                    </div>
                    
                    <div className="enhanced-rec-grid">
                        {safeRecommendations.slice(0, 6).map((rec, index) => {
                            // ULTRA SAFE PROCESSING
                            if (!rec || typeof rec !== 'object') {
                                console.warn('❌ Skipping invalid recommendation at index:', index, rec);
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

                            console.log(`🏪 Rendering restaurant ${index}:`, {
                                name: restaurantName,
                                id: restaurantId,
                                hasValidData: !!restaurantName
                            });
                            
                            return (
                                <div 
                                    key={restaurantId}
                                    className="enhanced-rec-card"
                                    onClick={() => {
                                        console.log('🏪 Restaurant selected:', restaurantName);
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
                                            console.error('❌ Error selecting restaurant:', error);
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
                                                console.error('❌ Error toggling favorite:', error);
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
                                    
                                    {/* Match Score with animated progress */}
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
                                    
                                    {/* Explanations with icons */}
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
                                        <span className="rec-rating">⭐ {rating}</span>
                                        <span className="rec-delivery">🚚 {deliveryTime}</span>
                                        <span className={`rec-price-range ${priceRange.toLowerCase()}`}>
                                            {getPriceRangeDisplay ? getPriceRangeDisplay(priceRange) : priceRange}
                                        </span>
                                    </div>

                                    {/* Hover overlay */}
                                    <div className="card-hover-overlay">
                                        <div className="quick-actions">
                                            <button className="quick-action">👁️ View Menu</button>
                                            <button className="quick-action">📞 Call</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }).filter(Boolean)} {/* Filter out null values */}
                    </div>
                    
                    {/* Action buttons with enhanced styling */}
                    <div className="enhanced-rec-actions">
                        <button 
                            className="refresh-recommendations"
                            onClick={() => {
                                console.log('🔄 Refreshing recommendations...');
                                fetchEnhancedRecommendations(currentUser.id);
                            }}
                            disabled={loadingEnhancedRecs}
                        >
                            {loadingEnhancedRecs ? '🔄 Updating...' : '🔄 Refresh Recommendations'}
                        </button>
                        <button 
                            className="see-all-restaurants"
                            onClick={() => {
                                console.log('🏪 Showing all restaurants...');
                                const regularSection = document.querySelector('.regular-restaurants');
                                if (regularSection) {
                                    regularSection.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                        >
                            🏪 Explore All Restaurants
                        </button>
                    </div>

                    {/* Insights Panel */}
                    <div className="recommendation-insights">
                        <h4>💡 Why These Recommendations?</h4>
                        <div className="insights-grid">
                            <div className="insight">
                                <span className="insight-icon">🎯</span>
                                <span>Matched to your taste preferences</span>
                            </div>
                            <div className="insight">
                                <span className="insight-icon">⭐</span>
                                <span>Highly rated by similar users</span>
                            </div>
                            <div className="insight">
                                <span className="insight-icon">🕒</span>
                                <span>Available for your preferred dining times</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};


// Add this to replace your current SimpleEnhancedRecommendations
const FixedEnhancedRecommendations = () => {
    console.log('🎯 FixedEnhancedRecommendations rendering...', {
        currentUser: currentUser?.name,
        recommendationsCount: enhancedRecommendations?.length || 0,
        loadingEnhancedRecs,
        showEnhancedRecs
    });

    // Safety check for user
    if (!currentUser || currentUser.isAdmin) {
        console.log('❌ No user or admin user, not showing enhanced recs');
        return null;
    }

    // Ensure recommendations is always an array
    const safeRecommendations = Array.isArray(enhancedRecommendations) ? enhancedRecommendations : [];

    const getMatchScoreColor = (score) => {
        if (score >= 80) return '#27ae60';
        if (score >= 60) return '#f39c12';
        return '#e74c3c';
    };

    const formatExplanation = (explanation) => {
        if (!explanation || typeof explanation !== 'string') return '💡 Recommended';
        
        const iconMap = {
            'based on your preferences': '🎯',
            'popular choice': '🔥', 
            'highly rated': '⭐',
            'recommended for you': '💫',
            'new restaurant': '🆕',
            'fast delivery': '⚡',
            'matches your preferences': '❤️',
            'popular with similar users': '👥',
            'perfect for this time': '⏰',
            'trending now': '🔥'
        };
        
        const lowerExplanation = explanation.toLowerCase();
        for (const [key, icon] of Object.entries(iconMap)) {
            if (lowerExplanation.includes(key)) {
                return `${icon} ${explanation}`;
            }
        }
        return `💡 ${explanation}`;
    };

    // Loading State
    if (loadingEnhancedRecs) {
        return (
            <div className="enhanced-recommendations-section" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '15px',
                padding: '30px',
                margin: '20px 0',
                color: 'white',
                textAlign: 'center'
            }}>
                <h2>🎯 Finding Your Perfect Restaurants</h2>
                <p>Our AI is analyzing your preferences...</p>
                <div style={{
                    display: 'inline-block',
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255,255,255,0.3)',
                    borderTop: '4px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '20px 0'
                }}></div>
                <p>This may take a moment...</p>
            </div>
        );
    }

    // Empty State
    if (safeRecommendations.length === 0) {
        return (
            <div className="enhanced-recommendations-section" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '15px',
                padding: '30px',
                margin: '20px 0',
                color: 'white',
                textAlign: 'center'
            }}>
                <h2>🎯 Your Personalized Dashboard</h2>
                <p>We're building your taste profile...</p>
                <div style={{ fontSize: '3rem', margin: '20px 0' }}>🍽️</div>
                <h3>Getting To Know Your Taste</h3>
                <p>Order from restaurants to help us personalize recommendations!</p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            border: '2px solid rgba(255,255,255,0.4)',
                            padding: '12px 24px',
                            borderRadius: '25px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                        onClick={() => {
                            console.log('🔄 Manual refresh clicked');
                            fetchEnhancedRecommendations(currentUser.id);
                        }}
                    >
                        🎯 Get Recommendations
                    </button>
                    <button 
                        style={{
                            background: 'transparent',
                            color: 'white',
                            border: '2px solid rgba(255,255,255,0.4)',
                            padding: '12px 24px',
                            borderRadius: '25px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                        onClick={() => {
                            setShowChat(true);
                            setTimeout(() => startOnboarding(), 500);
                        }}
                    >
                        ⚙️ Set Preferences
                    </button>
                </div>
            </div>
        );
    }

    // Main Recommendations Display
    return (
        <div className="enhanced-recommendations-section" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '15px',
            padding: '30px',
            margin: '20px 0',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎯 Perfect Matches For You</h2>
                <p style={{ opacity: '0.9', marginBottom: '20px' }}>Based on your preferences and ordering history</p>
                
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '40px', 
                    flexWrap: 'wrap' 
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                            {safeRecommendations.length}
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>Perfect Matches</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                            {safeRecommendations.length > 0 ? 
                                Math.round(safeRecommendations.reduce((acc, rec) => {
                                    const score = rec?.matchPercentage || rec?.score || 0;
                                    return acc + (typeof score === 'number' ? score : 0);
                                }, 0) / safeRecommendations.length) : 0
                            }%
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>Avg Match</div>
                    </div>
                </div>
            </div>
            
            {/* Recommendations Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                {safeRecommendations.slice(0, 6).map((rec, index) => {
                    // Safe data extraction
                    if (!rec || typeof rec !== 'object') {
                        console.warn('❌ Invalid recommendation at index:', index);
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

                    return (
                        <div 
                            key={restaurantId}
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '20px',
                                padding: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                border: '2px solid rgba(255,255,255,0.2)',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                                minHeight: '250px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transform: 'translateY(0)',
                                animationDelay: `${index * 0.1}s`
                            }}
                            onClick={() => {
                                console.log('🏪 Restaurant selected:', restaurantName);
                                try {
                                    let restaurant = restaurants.find(r => r._id === restaurantId);
                                    if (!restaurant) {
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
                                    console.error('❌ Error selecting restaurant:', error);
                                }
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-5px) scale(1.02)';
                                e.target.style.boxShadow = '0 15px 30px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0) scale(1)';
                                e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                            }}
                        >
                            {/* Rank Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
                                color: 'white',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                zIndex: 10
                            }}>
                                #{index + 1}
                            </div>
                            
                            {/* Favorite Heart */}
                            <button 
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    background: 'rgba(255,255,255,0.9)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '35px',
                                    height: '35px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    zIndex: 10
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    try {
                                        toggleFavorite(restaurantId);
                                    } catch (error) {
                                        console.error('❌ Error toggling favorite:', error);
                                    }
                                }}
                            >
                                {getUserData(currentUser.id).favorites.includes(restaurantId) ? '❤️' : '🤍'}
                            </button>

                            {/* Restaurant Info */}
                            <div style={{ marginTop: '25px', marginBottom: '15px' }}>
                                <h4 style={{ 
                                    color: '#2c3e50', 
                                    margin: '0 0 8px 0',
                                    fontSize: '1.2rem',
                                    fontWeight: '700'
                                }}>
                                    {restaurantName}
                                    {index === 0 && <span style={{ marginLeft: '8px' }}>👑</span>}
                                </h4>
                                <p style={{ 
                                    color: '#7f8c8d', 
                                    margin: '0 0 12px 0',
                                    fontSize: '0.9rem',
                                    fontStyle: 'italic'
                                }}>
                                    {Array.isArray(cuisine) ? cuisine.join(', ') : cuisine}
                                </p>
                            </div>
                            
                            {/* Match Score */}
                            <div style={{ margin: '15px 0' }}>
                                <div style={{ 
                                    color: getMatchScoreColor(matchScore),
                                    fontWeight: '700',
                                    marginBottom: '8px',
                                    fontSize: '1.1rem'
                                }}>
                                    🎯 {matchScore}% Match
                                </div>
                                <div style={{
                                    height: '6px',
                                    background: 'rgba(0,0,0,0.1)',
                                    borderRadius: '10px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${matchScore}%`,
                                        background: `linear-gradient(90deg, ${getMatchScoreColor(matchScore)}, ${getMatchScoreColor(matchScore)}dd)`,
                                        borderRadius: '10px',
                                        transition: 'width 1.5s ease-out'
                                    }}></div>
                                </div>
                            </div>
                            
                            {/* Explanations */}
                            <div style={{ 
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                margin: '15px 0'
                            }}>
                                {Array.isArray(explanations) ? 
                                    explanations.slice(0, 2).map((explanation, idx) => (
                                        <span key={idx} style={{
                                            background: 'linear-gradient(45deg, #3498db, #2980b9)',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: '500'
                                        }}>
                                            {formatExplanation(explanation)}
                                        </span>
                                    )) :
                                    <span style={{
                                        background: 'linear-gradient(45deg, #3498db, #2980b9)',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                    }}>
                                        {formatExplanation('Recommended for you')}
                                    </span>
                                }
                            </div>
                            
                            {/* Restaurant Details */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 'auto',
                                paddingTop: '15px',
                                borderTop: '1px solid rgba(0,0,0,0.1)',
                                fontSize: '0.85rem',
                                color: '#34495e'
                            }}>
                                <span>⭐ {rating}</span>
                                <span>🚚 {deliveryTime}</span>
                                <span style={{
                                    background: '#27ae60',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem'
                                }}>
                                    {getPriceRangeDisplay ? getPriceRangeDisplay(priceRange) : priceRange}
                                </span>
                            </div>
                        </div>
                    );
                }).filter(Boolean)}
            </div>
            
            {/* Action Buttons */}
            <div style={{ 
                display: 'flex', 
                gap: '15px', 
                justifyContent: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                <button 
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.4)',
                        padding: '12px 24px',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                    }}
                    onClick={() => {
                        console.log('🔄 Refreshing recommendations...');
                        fetchEnhancedRecommendations(currentUser.id);
                    }}
                    disabled={loadingEnhancedRecs}
                    onMouseEnter={(e) => {
                        if (!loadingEnhancedRecs) {
                            e.target.style.background = 'rgba(255,255,255,0.3)';
                            e.target.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.2)';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    {loadingEnhancedRecs ? '🔄 Updating...' : '🔄 Refresh Recommendations'}
                </button>
                
                <button 
                    style={{
                        background: 'transparent',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.4)',
                        padding: '12px 24px',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                    }}
                    onClick={() => {
                        console.log('🏪 Showing all restaurants...');
                        const regularSection = document.querySelector('.regular-restaurants');
                        if (regularSection) {
                            regularSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.1)';
                        e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    🏪 Browse All Restaurants
                </button>
            </div>

            {/* Insights */}
            <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '15px',
                padding: '20px',
                backdropFilter: 'blur(10px)'
            }}>
                <h4 style={{ textAlign: 'center', marginBottom: '15px' }}>💡 Why These Recommendations?</h4>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🎯</span>
                        <span>Matched to your taste preferences</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>⭐</span>
                        <span>Highly rated by similar users</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🕒</span>
                        <span>Perfect for your dining times</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


    // Enhanced Order-Capable Chatbot Response Generator
const generateEnhancedChatbotResponse = (userInput, userId) => {
  const userData = getUserData(userId);
  const lowerInput = userInput.toLowerCase();
  
  let response = {
    role: 'bot',
    timestamp: new Date().toLocaleTimeString(),
    orderAction: null
  };

  // ORDER INITIATION PATTERNS
  if (lowerInput.includes('order') || lowerInput.includes('want to eat') || 
      lowerInput.includes('hungry') || lowerInput.includes('craving')) {
    
    // Extract cuisine/food type from input
    const foodKeywords = extractFoodFromInput(lowerInput);
    
    if (foodKeywords.length > 0) {
      const matchingRestaurants = restaurants.filter(r => 
        r.cuisine && r.cuisine.some(c => 
          foodKeywords.some(food => c.toLowerCase().includes(food.toLowerCase()))
        )
      ).slice(0, 4);
      
      if (matchingRestaurants.length > 0) {
        response.content = `🍽️ Great! I found ${matchingRestaurants.length} restaurants for ${foodKeywords.join(' & ')}. Which one would you like to order from?`;
        response.recommendations = matchingRestaurants;
        response.orderAction = {
          type: 'RESTAURANT_SELECTION',
          restaurants: matchingRestaurants,
          searchedFor: foodKeywords
        };
        response.quickReplies = ["Show menu", "Different cuisine", "Cancel order"];
      } else {
        response.content = "I couldn't find restaurants for that cuisine. Here are some popular options:";
        response.recommendations = getPopularRestaurants().slice(0, 3);
        response.quickReplies = ["Show all restaurants", "My favorites", "Recommend something"];
      }
    } else {
      // General order request - show popular or recommended
      const recommendations = userData.preferences && Object.keys(userData.preferences).length > 0 
        ? enhancedRecommendationEngineArrow.getPersonalizedRecommendations(userId, restaurants).slice(0, 4)
        : getPopularRestaurants().slice(0, 4);
      
      response.content = "🍕 Perfect! I can help you place an order. Here are some great options:";
      response.recommendations = recommendations;
      response.orderAction = {
        type: 'RESTAURANT_SELECTION',
        restaurants: recommendations
      };
      response.quickReplies = ["Show menu", "Browse all restaurants", "My favorites"];
    }
  }
  
  // RESTAURANT SELECTION (when user clicks a restaurant card)
  else if (lowerInput.startsWith('restaurant_selected:')) {
    const restaurantId = lowerInput.split(':')[1];
    const restaurant = restaurants.find(r => r._id === restaurantId);
    
    if (restaurant) {
      response.content = `🏪 Great choice! ${restaurant.name} is known for excellent ${restaurant.cuisine?.join(' & ')}. Let me show you their menu:`;
      response.orderAction = {
        type: 'SHOW_MENU',
        restaurant: restaurant,
        restaurantId: restaurantId
      };
      response.quickReplies = ["Show popular items", "Add to cart", "Different restaurant"];
    }
  }
  
  // MENU ITEM SELECTION
  else if (lowerInput.startsWith('add_item:')) {
    const itemId = lowerInput.split(':')[1];
    response.orderAction = {
      type: 'ADD_TO_CART',
      itemId: itemId
    };
    response.content = "✅ Added to cart! Want to add more items or proceed to checkout?";
    response.quickReplies = ["Add more items", "View cart", "Checkout now", "Remove item"];
  }
  
  // CART MANAGEMENT
  else if (lowerInput.includes('cart') || lowerInput.includes('my order')) {
    if (cart.length > 0) {
      const total = calculateTotal();
      response.content = `🛒 Your current order:\n\n${cart.map(item => 
        `• ${item.name} x${item.quantity} - Rs. ${item.price * item.quantity}`
      ).join('\n')}\n\n💰 Total: Rs. ${total.total} (including Rs. ${total.deliveryFee} delivery)`;
      
      response.orderAction = {
        type: 'SHOW_CART',
        items: cart,
        total: total
      };
      response.quickReplies = ["Checkout now", "Add more items", "Remove items", "Clear cart"];
    } else {
      response.content = "🛒 Your cart is empty. Would you like to browse restaurants?";
      response.quickReplies = ["Browse restaurants", "Show recommendations", "Popular items"];
    }
  }
  
  // CHECKOUT INITIATION
  else if (lowerInput.includes('checkout') || lowerInput.includes('place order') || 
           lowerInput.includes('confirm order')) {
    
    if (!currentUser) {
      response.content = "🔐 Please login first to place an order. I'll save your cart for you!";
      response.quickReplies = ["Login now", "Create account", "Continue browsing"];
      return response;
    }
    
    if (cart.length === 0) {
      response.content = "🛒 Your cart is empty! Let me help you find something delicious.";
      response.recommendations = getPopularRestaurants().slice(0, 3);
      response.quickReplies = ["Browse restaurants", "Show recommendations"];
      return response;
    }
    
    // Check for saved address
    const savedAddress = getSavedUserAddress(currentUser.id);
    
    if (savedAddress) {
      const total = calculateTotal();
      response.content = `📋 Order Summary:\n\n${cart.map(item => 
        `• ${item.name} x${item.quantity} - Rs. ${item.price * item.quantity}`
      ).join('\n')}\n\n📍 Delivery to: ${savedAddress.street}, ${savedAddress.area}\n💰 Total: Rs. ${total.total}\n\n🤖 Shall I place this order for you?`;
      
      response.orderAction = {
        type: 'CONFIRM_ORDER',
        items: cart,
        address: savedAddress,
        total: total
      };
      response.quickReplies = ["Yes, place order!", "Change address", "Modify order", "Cancel"];
    } else {
      response.content = "📍 I need your delivery address to place the order. Please provide:";
      response.orderAction = {
        type: 'COLLECT_ADDRESS'
      };
      response.quickReplies = ["Enter address manually", "Use current location", "Cancel order"];
    }
  }
  
  // ADDRESS COLLECTION
  else if (lowerInput.includes('address:') || lowerInput.includes('deliver to:')) {
    const addressText = lowerInput.split(/address:|deliver to:/)[1]?.trim();
    if (addressText) {
      const parsedAddress = parseAddressFromText(addressText);
      
      response.content = `📍 Address saved: ${parsedAddress.street}, ${parsedAddress.area}\n\n✅ Ready to place your order! Total: Rs. ${calculateTotal().total}`;
      response.orderAction = {
        type: 'ADDRESS_CONFIRMED',
        address: parsedAddress
      };
      response.quickReplies = ["Place order now!", "Change address", "View order"];
    }
  }
  
  // ORDER CONFIRMATION
  else if (lowerInput.includes('yes, place order') || lowerInput.includes('confirm')) {
    response.orderAction = {
      type: 'PLACE_ORDER_NOW'
    };
    response.content = "🚀 Placing your order now... This will take a moment!";
  }
  
  // EXISTING RESPONSES (keep your current ones)
  else if (lowerInput.includes('popular')) {
    const popularRestaurants = getPopularRestaurants();
    response.content = "🔥 Here are our most popular restaurants:";
    response.recommendations = popularRestaurants;
    response.quickReplies = ["Order from these", "Show menus", "My preferences"];
  }
  
  else if (lowerInput.includes('my orders') || lowerInput.includes('order history')) {
    if (userData.orderHistory.length > 0) {
      const recentOrders = userData.orderHistory.slice(0, 5);
      response.content = `📋 Your recent orders:`;
      response.orderHistory = recentOrders;
      response.quickReplies = ["Reorder favorite", "Rate orders", "Track current order"];
    } else {
      response.content = "📋 No previous orders found. Let's order something delicious!";
      response.recommendations = restaurants.slice(0, 3);
      response.quickReplies = ["Browse restaurants", "Show recommendations"];
    }
  }
  
  else if (lowerInput.includes('favorites')) {
    if (userData.favorites.length > 0) {
      const favoriteRestaurants = userData.favorites
        .map(id => restaurants.find(r => r._id === id))
        .filter(Boolean);
      response.content = "❤️ Your favorite restaurants:";
      response.recommendations = favoriteRestaurants;
      response.quickReplies = ["Order from favorites", "Browse all", "Add more favorites"];
    } else {
      response.content = "❤️ No favorites yet. Try some restaurants and add them to favorites!";
      response.recommendations = getPopularRestaurants().slice(0, 3);
      response.quickReplies = ["Browse restaurants", "Show recommendations"];
    }
  }
  
  // DEFAULT RESPONSE
  else {
    response.content = "🍕 I'm your food ordering assistant! I can help you:\n\n🛒 Place orders\n🔍 Find restaurants\n⭐ Show recommendations\n📋 Check order history\n\nWhat would you like to do?";
    response.quickReplies = ["Order food now", "Show recommendations", "Popular restaurants", "My favorites"];
  }

  return response;
};

// Helper function to extract food types from user input
const extractFoodFromInput = (input) => {
  const foodKeywords = {
    'biryani': 'Biryani',
    'pizza': 'Pizza', 
    'burger': 'Burger',
    'chinese': 'Chinese',
    'desi': 'Pakistani',
    'pakistani': 'Pakistani',
    'fast food': 'Fast Food',
    'bbq': 'BBQ',
    'karahi': 'Pakistani',
    'kebab': 'BBQ',
    'sandwich': 'Sandwich',
    'pasta': 'Italian',
    'italian': 'Italian'
  };
  
  const found = [];
  for (const [keyword, cuisine] of Object.entries(foodKeywords)) {
    if (input.includes(keyword)) {
      found.push(cuisine);
    }
  }
  return [...new Set(found)]; // Remove duplicates
};

// Helper function to parse address from text
const parseAddressFromText = (addressText) => {
  // Simple address parsing - you can make this more sophisticated
  const parts = addressText.split(',').map(p => p.trim());
  
  return {
    street: parts[0] || addressText,
    area: parts[1] || 'Karachi',
    city: 'Karachi',
    instructions: parts.length > 2 ? parts.slice(2).join(', ') : ''
  };
};

// Helper function to get saved user address
const getSavedUserAddress = (userId) => {
  const saved = localStorage.getItem(`address_${userId}`);
  return saved ? JSON.parse(saved) : null;
};

    const completeOnboarding = (finalPreferences = userPreferences) => {
  if (!isOnboardingActive) {
    console.log('⚠️ Onboarding not active, skipping completion...');
    return;
  }
  
  console.log('🎊 Completing onboarding with preferences:', finalPreferences);
  
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
      content: `Perfect! I've successfully updated your preferences! \n\nBased on your updated taste profile, here are my top recommendations:`,
      recommendations: recommendations.length > 0 ? recommendations : restaurants.slice(0, 3),
      isOnboarding: false,
      quickReplies: ["Order now", "Show more restaurants", "View my profile"],
      timestamp: new Date().toLocaleTimeString()
    }]);
    
    console.log('✅ Preference update completed successfully!');
  }, 1000);
};


// In your sendMessage function, add better context handling:
// COMPLETE ENHANCED CHATBOT SYSTEM
// Replace your entire sendMessage function and related chat functions with this

// Enhanced sendMessage function that uses all the advanced features
const sendMessage = async () => {
  if (!inputMessage.trim()) return;

  const currentInput = inputMessage.trim();
  console.log('📤 Processing message:', currentInput);
  
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
      console.log('📥 Backend response:', data);
      
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
      console.error('❌ Backend chat error:', error);
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
  
  // RECOMMENDATIONS
  if (lowerInput.includes('recommend') || lowerInput.includes('suggestion')) {
    console.log('🎯 Generating recommendations...');
    
    if (!currentUser || currentUser.isAdmin) {
      return {
        role: 'bot',
        content: "Please login to get personalized recommendations! 🔐",
        timestamp: new Date().toLocaleTimeString(),
        suggestions: ['Login', 'Browse restaurants', 'Popular items']
      };
    }
    
    // Get enhanced recommendations
    const recommendations = enhancedRecommendationEngineArrow.getPersonalizedRecommendations(userId, restaurants);
    
    if (recommendations.length > 0) {
      return {
        role: 'bot',
        content: `🎯 Based on your taste profile, here are my top recommendations for you:`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'enhanced_recommendations',
        recommendations: recommendations.map(rec => ({
          id: rec._id,
          name: rec.name,
          cuisine: rec.cuisine,
          rating: rec.rating,
          deliveryTime: rec.deliveryTime,
          priceRange: rec.priceRange,
          matchPercentage: Math.round(rec.score * 10) || 85,
          explanations: [rec.personalizedReason || 'Perfect match for your taste'],
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
  }
  
  // POPULAR RESTAURANTS
  if (lowerInput.includes('popular') || lowerInput.includes('trending')) {
    const popularRestaurants = getPopularRestaurants();
    return {
      role: 'bot',
      content: "🔥 Here are the most popular restaurants right now:",
      timestamp: new Date().toLocaleTimeString(),
      restaurants: popularRestaurants,
      suggestions: ['Order from these', 'Show recommendations', 'Different cuisine']
    };
  }
  
  // ORDER HISTORY
  if (lowerInput.includes('my orders') || lowerInput.includes('order history')) {
    if (!currentUser) {
      return {
        role: 'bot',
        content: "Please login to see your order history! 🔐",
        timestamp: new Date().toLocaleTimeString(),
        suggestions: ['Login', 'Browse restaurants']
      };
    }
    
    const userData = getUserData(userId);
    if (userData.orderHistory.length > 0) {
      return {
        role: 'bot',
        content: `📋 You've placed ${userData.orderHistory.length} orders. Here's your history:`,
        timestamp: new Date().toLocaleTimeString(),
        orderHistory: userData.orderHistory.slice(0, 5),
        suggestions: ['Reorder favorite', 'Rate orders', 'Browse new restaurants']
      };
    } else {
      return {
        role: 'bot',
        content: "📋 No previous orders found. Let's order something delicious!",
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
        content: "Please login to see your favorites! 🔐",
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
        content: "❤️ Your favorite restaurants:",
        timestamp: new Date().toLocaleTimeString(),
        restaurants: favoriteRestaurants,
        suggestions: ['Order from favorites', 'Add more favorites', 'Browse all']
      };
    } else {
      return {
        role: 'bot',
        content: "❤️ No favorites yet. Try some restaurants and add them to favorites!",
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
        content: `🛒 Your current order from ${selectedRestaurant?.name || 'restaurant'}:`,
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
        content: "🛒 Your cart is empty. What would you like to order?",
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
        content: `🍽️ Great choice! Here are the best ${foundCuisine} restaurants:`,
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
        content: "I'd love to help you order! Please login first to get personalized recommendations. 🔐",
        timestamp: new Date().toLocaleTimeString(),
        suggestions: ['Login', 'Browse as guest', 'Popular restaurants']
      };
    }
    
    const recommendations = enhancedRecommendationEngineArrow.getPersonalizedRecommendations(userId, restaurants);
    
    if (recommendations.length > 0) {
      return {
        role: 'bot',
        content: "🍕 Perfect! Based on your preferences, here are some great options to order from:",
        timestamp: new Date().toLocaleTimeString(),
        restaurants: recommendations.slice(0, 4),
        suggestions: ['Order from these', 'Show menu', 'Different options']
      };
    } else {
      return {
        role: 'bot',
        content: "🍕 I'd love to help you order! Here are some popular restaurants:",
        timestamp: new Date().toLocaleTimeString(),
        restaurants: getPopularRestaurants().slice(0, 4),
        suggestions: ['Order from these', 'Set preferences', 'Browse all']
      };
    }
  }
  
  return null; // Not a local command, will try backend
};

// Generate enhanced local response for fallback
const generateEnhancedLocalResponse = async (input) => {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
    return {
      role: 'bot',
      content: `Hello${currentUser ? `, ${currentUser.name}` : ''}! 👋 I'm your smart food assistant. I can help you find restaurants, place orders, and get personalized recommendations!`,
      timestamp: new Date().toLocaleTimeString(),
      suggestions: ['Show recommendations', 'Popular restaurants', 'My favorites', 'Order food']
    };
  }
  
  if (lowerInput.includes('help')) {
    return {
      role: 'bot',
      content: "🤖 I'm here to help! I can assist you with:\n\n🎯 Personalized restaurant recommendations\n🍔 Finding restaurants by cuisine\n🛒 Placing food orders\n📋 Checking your order history\n❤️ Managing your favorites\n\nWhat would you like to do?",
      timestamp: new Date().toLocaleTimeString(),
      suggestions: ['Get recommendations', 'Browse restaurants', 'Order food', 'My account']
    };
  }
  
  // Default enhanced response
  return {
    role: 'bot',
    content: "🍕 I'm your smart food assistant! I can help you find amazing restaurants, get personalized recommendations, and place orders. What are you craving today?",
    timestamp: new Date().toLocaleTimeString(),
    suggestions: ['Show recommendations', 'Popular restaurants', 'Order food', 'Help me choose']
  };
};

// Handle backend responses
const handleBackendResponse = (data) => {
  if (data.data?.type === 'restaurant_selected_with_menu' && data.data?.restaurant) {
    console.log('🏪 Auto-selecting restaurant:', data.data.restaurant.name);
    setSelectedRestaurant(data.data.restaurant);
    if (data.data.menuItems && data.data.menuItems.length > 0) {
      setMenu(data.data.menuItems);
    }
  }
  
  if (data.data?.type === 'item_added_to_cart' && data.data?.cartItems) {
    console.log('🛒 Updating cart from chatbot');
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
  console.log('🚀 Quick reply clicked:', reply);
  
  setInputMessage('');
  
  // Add user message
  const userMsg = {
    role: 'user',
    content: reply,
    timestamp: new Date().toLocaleTimeString()
  };
  setMessages(prev => [...prev, userMsg]);
  
  // Generate enhanced response based on the reply
  setIsTyping(true);
  
  setTimeout(async () => {
    let response;
    
    switch (reply.toLowerCase()) {
      case 'show recommendations':
      case 'get recommendations':
        response = await handleLocalChatCommand('recommend restaurants');
        break;
        
      case 'popular restaurants':
      case 'popular':
        response = await handleLocalChatCommand('popular restaurants');
        break;
        
      case 'my orders':
      case 'order history':
        response = await handleLocalChatCommand('my orders');
        break;
        
      case 'my favorites':
      case 'favorites':
        response = await handleLocalChatCommand('my favorites');
        break;
        
      case 'order food':
      case 'order now':
        response = await handleLocalChatCommand('I want to order food');
        break;
        
      case 'browse restaurants':
        response = {
          role: 'bot',
          content: "🏪 Here are all our available restaurants. You can also ask me for personalized recommendations!",
          timestamp: new Date().toLocaleTimeString(),
          restaurants: restaurants.slice(0, 6),
          suggestions: ['Show recommendations', 'Popular only', 'Filter by cuisine']
        };
        break;
        
      case 'help me choose':
        response = {
          role: 'bot',
          content: "🤔 I'd love to help you choose! Tell me what you're in the mood for:\n\n• What cuisine do you want?\n• How spicy do you like your food?\n• What's your budget range?\n• Any dietary restrictions?",
          timestamp: new Date().toLocaleTimeString(),
          suggestions: ['Pakistani food', 'Chinese food', 'Fast food', 'Italian food', 'Show recommendations']
        };
        break;
        
      default:
        // Try to process as a regular message
        response = await handleLocalChatCommand(reply) || await generateEnhancedLocalResponse(reply);
    }
    
    setIsTyping(false);
    if (response) {
      setMessages(prev => [...prev, response]);
    }
  }, 800);
};

// Enhanced message renderer
const renderEnhancedChatMessage = (msg, index) => {
  return (
    <div key={index} className="message-container">
      <div className={`message ${msg.role}`}>
        <div className="message-content">
          {msg.content}
        </div>
        <div className="message-time">{msg.timestamp}</div>
      </div>

      {/* Enhanced Recommendations Display */}
      {msg.type === 'enhanced_recommendations' && msg.recommendations && (
        <div className="chat-enhanced-recommendations" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '15px',
          padding: '20px',
          margin: '10px 0',
          color: 'white'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>🎯 Perfect Matches For You</h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              Based on your preferences and history
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {msg.recommendations.map((rec, idx) => (
              <div 
                key={rec.id || idx} 
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(255,255,255,0.2)',
                  position: 'relative'
                }}
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
                  
                  // Close chat and select restaurant
                  setShowChat(false);
                  selectRestaurant(restaurant);
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                {/* Rank badge */}
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
                  color: 'white',
                  width: '25px',
                  height: '25px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  #{idx + 1}
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <h5 style={{ 
                    margin: '0 0 4px 0',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    {rec.name}
                  </h5>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '0.85rem',
                    opacity: '0.9'
                  }}>
                    {Array.isArray(rec.cuisine) ? rec.cuisine.join(', ') : rec.cuisine}
                  </p>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    background: 'rgba(46, 204, 113, 0.8)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '15px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    {rec.matchPercentage}% Match
                  </div>
                  <span style={{ fontSize: '0.9rem' }}>⭐ {rec.rating}</span>
                </div>
                
                {rec.explanations && rec.explanations.length > 0 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontStyle: 'italic'
                  }}>
                    💡 {rec.explanations[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => {
              setShowChat(false);
              setTimeout(() => {
                const recSection = document.querySelector('.personalized-preview-section');
                if (recSection) {
                  recSection.scrollIntoView({ behavior: 'smooth' });
                }
              }, 100);
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.4)',
              padding: '10px 20px',
              borderRadius: '25px',
              cursor: 'pointer',
              width: '100%',
              marginTop: '15px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            🏪 View All Recommendations
          </button>
        </div>
      )}

      {/* Quick Replies */}
      {msg.suggestions && (
        <div className="quick-replies" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '12px'
        }}>
          {msg.suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleEnhancedQuickReply(suggestion)}
              style={{
                background: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                color: '#667eea',
                padding: '6px 12px',
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                e.target.style.color = '#667eea';
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Restaurant Cards */}
      {msg.restaurants && msg.restaurants.length > 0 && (
        <div style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {msg.restaurants.map((restaurant, idx) => (
            <div 
              key={idx} 
              style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => {
                setShowChat(false);
                selectRestaurant(restaurant);
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h4 style={{ margin: 0, color: '#2c3e50', fontSize: '1rem' }}>{restaurant.name}</h4>
                <span style={{ color: '#f39c12', fontSize: '0.9rem' }}>⭐ {restaurant.rating || 'New'}</span>
              </div>
              <p style={{ margin: 0, color: '#7f8c8d', fontSize: '0.85rem' }}>
                {restaurant.cuisine ? restaurant.cuisine.join(', ') : 'Various cuisines'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.8rem', color: '#6c757d' }}>
                <span>🚚 {restaurant.deliveryTime}</span>
                <span>{getPriceRangeDisplay(restaurant.priceRange)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order History */}
      {msg.orderHistory && (
        <div style={{ margin: '12px 0', maxHeight: '200px', overflowY: 'auto' }}>
          {msg.orderHistory.map((order, idx) => (
            <div key={idx} style={{
              background: 'white',
              padding: '10px',
              marginBottom: '8px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ color: '#2c3e50', fontSize: '0.9rem' }}>{order.restaurantName}</strong>
                <span style={{ color: '#27ae60', fontSize: '0.85rem' }}>Rs. {order.total}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6c757d' }}>
                {order.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem' }}>
                <span style={{ color: '#7f8c8d' }}>{new Date(order.date).toLocaleDateString()}</span>
                <span style={{ color: order.status === 'delivered' ? '#27ae60' : '#3498db' }}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Items */}
      {msg.cartItems && msg.cartItems.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff3e0, #ffeaa7)',
          borderRadius: '12px',
          padding: '12px',
          margin: '10px 0'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#e67e22' }}>🛒 Your Cart</h4>
          {msg.cartItems.map((item, idx) => (
            <div key={idx} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
              {item.menuItem.name} x{item.quantity} - Rs. {item.price * item.quantity}
            </div>
          ))}
          {msg.cartTotal && (
            <div style={{ fontWeight: 'bold', marginTop: '8px', color: '#e67e22' }}>
              Total: Rs. {msg.cartTotal}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {msg.actions && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
          {msg.actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (action === 'Checkout now') {
                  setShowCheckout(true);
                  setShowChat(false);
                } else {
                  handleEnhancedQuickReply(action);
                }
              }}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '15px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Onboarding Options */}
      {msg.questionData && msg.isOnboarding && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '8px',
          marginTop: '12px'
        }}>
          <p style={{
            gridColumn: '1 / -1',
            marginBottom: '10px',
            fontWeight: 'bold',
            color: '#667eea',
            textAlign: 'center'
          }}>
            Please select an option:
          </p>
          {msg.questionData.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleOptionSelect(option, msg.questionData.key)}
              style={{
                background: 'white',
                border: '2px solid #667eea',
                color: '#667eea',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.color = '#667eea';
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
        trendingBadge: popularityScore > 350 ? '🔥 Trending' : popularityScore > 300 ? '⭐ Popular' : ''
      };
    })
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 5);
};

// Usage Instructions for your App.js:
/*
1. REPLACE your existing sendMessage function with the sendMessage function above
2. REPLACE your existing message rendering with: {messages.map((msg, index) => renderEnhancedChatMessage(msg, index))}
3. ADD these functions to your App.js (they are now being used):
   - handleLocalChatCommand
   - generateEnhancedLocalResponse  
   - handleBackendResponse
   - handleEnhancedQuickReply (replaces your current one)
   - renderEnhancedChatMessage (replaces your current one)
   - getPopularRestaurants (replaces your current one)

4. REMOVE these unused functions to fix ESLint warnings:
   - renderChatMessage
   - handleRecommendationClick
   - handleChatMenuItemClick
   - generatePersonalizedResponse
   - extractCuisineFromInput
   - normalizeUserInput
   - TestEnhancedRecommendations
   - chatOrderFlow, setChatOrderFlow (unused state)
   - setChatLoading (unused state)
   - analyticsData, salesTrends, analyticsLoading (if not used in admin)
*/

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
        surgeMultiplier: dynamicPricing?.multiplier || 1.0,
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
                 Track Order
              </button>
            )}
            <button 
    onClick={() => {
      const wasShowingChat = showChat;
      setShowChat(!showChat);
      
      // Only start onboarding if chat is being opened and user is new
      if (!wasShowingChat && isNewUser && currentUser && !isOnboardingActive) {
        setTimeout(() => {
          startOnboarding();
        }, 500);
      }
    }} 
    className="chat-toggle"
  >
    💬 Smart Assistant {isNewUser && <span className="notification-dot"></span>}
  </button>
            <div className="cart-info">
              🛒 Cart ({cart.length})
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
          📊 Dashboard
        </button>
        <button
          className={`nav-tab ${adminActiveTab === 'orders' ? 'active' : ''}`}
          onClick={() => setAdminActiveTab('orders')}
        >
          📋 Orders
        </button>
        <button
          className={`nav-tab ${adminActiveTab === 'restaurants' ? 'active' : ''}`}
          onClick={() => setAdminActiveTab('restaurants')}
        >
          🏪 Restaurants
        </button>
        <button
          className={`nav-tab ${adminActiveTab === 'users' ? 'active' : ''}`}
          onClick={() => setAdminActiveTab('users')}
        >
          👥 Users
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
    
    {/* Show Personalized Recommendations Preview for logged-in users */}
    {currentUser && !currentUser.isAdmin && (
                      <div className="personalized-preview-section">
                        <div className="preview-header">
                          <h2>🎯 Suggestions Just For You</h2>
                          <p>Discover restaurants</p>
                        </div>
                        
                        {/* REPLACE the complex EnhancedRecommendationsSection with our test component */}
                        <FixedEnhancedRecommendations />
                      </div>
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
              <span>⭐ {restaurant?.rating || 'New'}</span>
              <span>{getPriceRangeDisplay(restaurant?.priceRange)}</span>
              <span>🚚 {restaurant?.deliveryTime || 'Not specified'}</span>
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
  // Menu section remains the same...
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
                         Set Up My Preferences
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
{msg.type === 'enhanced_recommendations' && msg.recommendations && (
  <div className="chat-enhanced-recommendations">
    <div className="enhanced-rec-header">
      <h4>🎯 Perfect Matches For You</h4>
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
              <span className="rating">⭐ {rec.rating}</span>
            </div>
            {rec.explanations && rec.explanations.length > 0 && (
              <div className="rec-reason">
                💡 {rec.explanations[0]}
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
        🏪 View All Recommendations
      </button>
    </div>
  </div>
)}
    {/* Restaurant Recommendations with Order Capability */}
    {msg.recommendations && msg.recommendations.length > 0 && (
      <div className="chat-recommendations">
        {msg.recommendations.map((restaurant, idx) => (
          <div 
            key={idx} 
            className="recommendation-card order-capable"
            onClick={() => {
              // Instead of just selecting, start order flow
              const orderMessage = `restaurant_selected:${restaurant._id}`;
              setInputMessage(orderMessage);
              sendMessage();
            }}
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
            
            {/* Order button */}
            <button 
              className="chat-order-btn"
              onClick={(e) => {
                e.stopPropagation();
                const orderMessage = `restaurant_selected:${restaurant._id}`;
                setInputMessage(orderMessage);
                sendMessage();
              }}
            >
              🛒 View Menu & Order
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
      <h4>🍽️ {selectedRestaurant?.name} Menu:</h4>
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
              content: `✅ Added ${item.name} to cart! Total items: ${cart.length + 1}`,
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
        <p>🛒 Cart: {cart.length} items - Rs. {calculateTotal().total}</p>
        <button onClick={() => setShowCheckout(true)}>
          Proceed to Checkout
        </button>
      </div>
    )}
  </div>
)}

{/* Restaurant Recommendations with Order Capability - FIXED VERSION */}
{msg.restaurants && msg.restaurants.length > 0 && (
  <div className="chat-recommendations">
    {msg.restaurants.map((restaurant, idx) => (
      <div 
        key={idx} 
        className="recommendation-card order-capable"
      >
        <div className="rec-header">
          <h4>{restaurant.name}</h4>
          <div className="rec-rating">⭐ {restaurant.rating || 'New'}</div>
        </div>
        <p className="rec-cuisine">{restaurant.cuisine ? restaurant.cuisine.join(', ') : 'Various cuisines'}</p>
        <div className="rec-info">
          <span className="rec-price">{getPriceRangeDisplay(restaurant.priceRange)}</span>
          <span className="rec-delivery">🚚 {restaurant.deliveryTime}</span>
        </div>
        
        {/* FIXED: The button that was causing "Unknown action" */}
        <button 
          className="chat-order-btn"
          onClick={async (e) => {
            e.stopPropagation();
            console.log('🍕 View Menu & Order clicked for:', restaurant.name);
            
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
          🛒 View Menu & Order
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

    {/* Loading indicator for order processing */}
    {chatLoading && index === messages.length - 1 && (
      <div className="chat-loading">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span>Processing your order...</span>
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
                {!isOnboardingActive && ( // Simplified condition - only check onboarding active
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
                    disabled={isOnboardingActive} // Only disable during onboarding
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={isOnboardingActive || !inputMessage.trim()} // Only disable during onboarding
                    className="send-button"
                  >
                    <span>🚀</span>
                  </button>
                </div>
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