// frontend/src/App.js - Fixed ESLint Warnings
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Enhanced onboarding questions with options
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

// Smart recommendation engine
const smartRecommendationEngine = {
  getRecommendations: (userPrefs, restaurants) => {
    if (!userPrefs || restaurants.length === 0) return [];
    
    let scored = restaurants.map(restaurant => {
      let score = 0;
      
      // Cuisine preference matching
      if (userPrefs.cuisine && restaurant.cuisine) {
        const cuisineMatch = restaurant.cuisine.some(c => 
          userPrefs.cuisine.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase().includes(userPrefs.cuisine.toLowerCase())
        );
        if (cuisineMatch) score += 50;
      }
      
      // Budget matching
      if (userPrefs.budget) {
        const budgetScore = smartRecommendationEngine.getBudgetScore(userPrefs.budget, restaurant.priceRange);
        score += budgetScore;
      }
      
      // Rating boost
      score += (restaurant.rating || 0) * 5;
      
      // Popular restaurants boost
      if (restaurant.name.toLowerCase().includes('student biryani')) score += 20;
      if (restaurant.name.toLowerCase().includes('kfc')) score += 15;
      
      return { ...restaurant, score };
    });
    
    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
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
    const restLevel = priceMap[restaurantPriceRange] || 2;
    
    return Math.max(0, 30 - Math.abs(userLevel - restLevel) * 10);
  }
};

// Smart chatbot responses
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

function App() {
  // All your existing state variables
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
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

  // Enhanced chatbot state
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [userPreferences, setUserPreferences] = useState({});
  const [isTyping, setIsTyping] = useState(false);

  // Fixed fetchAnalytics with useCallback to prevent dependency warning
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

  // All existing useEffect hooks
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
    console.log('Current user changed:', currentUser);
    if (currentUser && !currentUser.isAdmin) {
      const userPrefs = localStorage.getItem(`userPrefs_${currentUser.id}`);
      console.log('User preferences:', userPrefs);
      
      if (!userPrefs || currentUser.isNewUser) {
        console.log('New user detected, starting onboarding...');
        setIsNewUser(true);
        setShowChat(true);
        startOnboarding();
      } else {
        // Load existing preferences
        setUserPreferences(JSON.parse(userPrefs));
      }
    }
  }, [currentUser]);

  // Fixed useEffect with proper dependencies
  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchAnalytics]);

  // All existing functions
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

  // Enhanced chatbot functions
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
  // Add user response
  setMessages(prev => [...prev, {
    role: 'user',
    content: option,
    timestamp: new Date().toLocaleTimeString()
  }]);

  // Update preferences
  const newPrefs = { ...userPreferences, [questionKey]: option };
  setUserPreferences(newPrefs);
  
  // Move to next question
  const nextStep = currentOnboardingStep + 1;
  setCurrentOnboardingStep(nextStep);
  
  // Continue with next question or complete onboarding
  setTimeout(() => {
    if (nextStep < onboardingQuestions.length) {
      showNextOnboardingQuestion();
    } else {
      completeOnboarding();
    }
  }, 500);
};
  const completeOnboarding = () => {
  // Save preferences
  localStorage.setItem(`userPrefs_${currentUser.id}`, JSON.stringify(userPreferences));
  setIsNewUser(false);
  
  // Show completion message with recommendations
  setIsTyping(true);
  setTimeout(() => {
    setIsTyping(false);
    const recommendations = smartRecommendationEngine.getRecommendations(userPreferences, restaurants);
    
    setMessages(prev => [...prev, {
      role: 'bot',
      content: `Perfect! I've learned your preferences. 🎯\n\nBased on what you told me, here are my top recommendations for you:`,
      recommendations: recommendations,
      isOnboarding: false,
      timestamp: new Date().toLocaleTimeString()
    }]);
  }, 1000);
};

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Smart response logic
    setTimeout(() => {
      setIsTyping(false);
      const response = generateSmartResponse(inputMessage.toLowerCase());
      setMessages(prev => [...prev, response]);
    }, 1500);
  };

  const generateSmartResponse = (userInput) => {
  let response = {
    role: 'bot',
    timestamp: new Date().toLocaleTimeString()
  };

  // Enhanced intent detection with more keywords
  if (userInput.includes('recommend') || userInput.includes('suggest') || userInput.includes('what should')) {
    const recommendations = smartRecommendationEngine.getRecommendations(userPreferences, restaurants);
    response.content = chatbotResponses.recommendations[Math.floor(Math.random() * chatbotResponses.recommendations.length)];
    response.recommendations = recommendations.length > 0 ? recommendations : restaurants.slice(0, 3);
  }
  else if (userInput.includes('popular') || userInput.includes('trending') || userInput.includes('best') || userInput.includes('top')) {
    // Show popular restaurants based on ratings and sample data
    const popularRestaurants = restaurants
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);
    
    response.content = "Here are our most popular restaurants right now! 🔥";
    response.recommendations = popularRestaurants;
  }
  else if (userInput.includes('order') || userInput.includes('buy') || userInput.includes('want') || userInput.includes('get')) {
    response.content = chatbotResponses.orderHelp[Math.floor(Math.random() * chatbotResponses.orderHelp.length)];
    // Show top rated restaurants for ordering
    response.recommendations = restaurants.slice(0, 3);
  }
  else if (userInput.includes('hello') || userInput.includes('hi') || userInput.includes('hey')) {
    response.content = chatbotResponses.greetings[Math.floor(Math.random() * chatbotResponses.greetings.length)];
    // Show quick action buttons after greeting
    response.quickReplies = ["Show recommendations", "Popular restaurants", "Budget options"];
  }
  else if (userInput.includes('budget') || userInput.includes('cheap') || userInput.includes('affordable') || userInput.includes('inexpensive')) {
    // Filter restaurants by budget-friendly options
    const budgetRestaurants = restaurants.filter(r => {
      const priceCategory = getPriceRangeDisplay(r.priceRange);
      return priceCategory === 'Budget' || priceCategory === 'Moderate';
    });
    
    response.content = "Great! Here are some budget-friendly options for you: 💰";
    response.recommendations = budgetRestaurants.slice(0, 3);
    response.quickReplies = ["Under Rs. 500", "Rs. 500-1000"];
  }
  else if (userInput.includes('spicy') || userInput.includes('mild') || userInput.includes('hot')) {
    response.content = "Looking for something with the right spice level! How spicy do you like it? 🌶️";
    response.quickReplies = ["Mild", "Medium", "Spicy", "Very Spicy"];
    // Show restaurants known for spicy food
    const spicyRestaurants = restaurants.filter(r => 
      r.cuisine && r.cuisine.some(c => 
        c.toLowerCase().includes('pakistani') || 
        c.toLowerCase().includes('chinese') ||
        c.toLowerCase().includes('bbq')
      )
    );
    response.recommendations = spicyRestaurants.slice(0, 3);
  }
  else if (userInput.includes('vegetarian') || userInput.includes('vegan') || userInput.includes('veg')) {
    const vegRestaurants = restaurants.filter(r => 
      r.cuisine && r.cuisine.some(c => 
        c.toLowerCase().includes('vegetarian') || 
        c.toLowerCase().includes('healthy') ||
        c.toLowerCase().includes('italian')
      )
    );
    response.content = "Perfect! Here are some vegetarian-friendly options: 🥗";
    response.recommendations = vegRestaurants.length > 0 ? vegRestaurants.slice(0, 3) : restaurants.slice(0, 3);
  }
  else if (userInput.includes('fast food') || userInput.includes('quick') || userInput.includes('fast')) {
    const fastFoodRestaurants = restaurants.filter(r => 
      r.cuisine && r.cuisine.some(c => 
        c.toLowerCase().includes('fast food') || 
        c.toLowerCase().includes('american') ||
        r.name.toLowerCase().includes('kfc') ||
        r.name.toLowerCase().includes('subway')
      )
    );
    response.content = "Here are some great fast food options for a quick bite! ⚡";
    response.recommendations = fastFoodRestaurants.length > 0 ? fastFoodRestaurants.slice(0, 3) : restaurants.slice(0, 3);
  }
  else if (userInput.includes('pakistani') || userInput.includes('biryani') || userInput.includes('karahi')) {
    const pakistaniRestaurants = restaurants.filter(r => 
      r.cuisine && r.cuisine.some(c => 
        c.toLowerCase().includes('pakistani')
      ) || r.name.toLowerCase().includes('biryani')
    );
    response.content = "Authentic Pakistani cuisine coming right up! 🇵🇰";
    response.recommendations = pakistaniRestaurants.length > 0 ? pakistaniRestaurants.slice(0, 3) : restaurants.slice(0, 3);
  }
  else if (userInput.includes('chinese') || userInput.includes('noodles') || userInput.includes('fried rice')) {
    const chineseRestaurants = restaurants.filter(r => 
      r.cuisine && r.cuisine.some(c => 
        c.toLowerCase().includes('chinese')
      )
    );
    response.content = "Delicious Chinese food options for you! 🥢";
    response.recommendations = chineseRestaurants.length > 0 ? chineseRestaurants.slice(0, 3) : restaurants.slice(0, 3);
  }
  else if (userInput.includes('pizza') || userInput.includes('italian')) {
    const italianRestaurants = restaurants.filter(r => 
      r.cuisine && r.cuisine.some(c => 
        c.toLowerCase().includes('italian') ||
        c.toLowerCase().includes('pizza')
      ) || r.name.toLowerCase().includes('pizza')
    );
    response.content = "Great choice! Here are the best pizza places: 🍕";
    response.recommendations = italianRestaurants.length > 0 ? italianRestaurants.slice(0, 3) : restaurants.slice(0, 3);
  }
  else if (userInput.includes('change preferences') || userInput.includes('reset') || userInput.includes('update preferences')) {
    response.content = "I can help you update your preferences! Would you like to go through the setup again?";
    response.quickReplies = ["Yes, update preferences", "Show current preferences", "No, keep current"];
  }
  else if (userInput.includes('help') || userInput.includes('what can you do')) {
    response.content = "I can help you with many things! Here's what I can do:\n\n🎯 Find personalized recommendations\n🔥 Show popular restaurants\n💰 Filter by budget\n🌶️ Match spice preferences\n🍕 Find specific cuisines\n📋 Help place orders\n\nWhat would you like to try?";
    response.quickReplies = ["Show recommendations", "Popular restaurants", "Budget options", "Spicy food"];
  }
  else {
    // Enhanced fallback with helpful suggestions
    response.content = "I'd love to help you find great food! Here are some things you can try:";
    response.quickReplies = ["Show recommendations", "Popular restaurants", "Budget options", "Spicy food", "Fast food", "Pakistani food"];
  }

  return response;
};

  const handleQuickReply = (reply) => {
    setInputMessage(reply);
    sendMessage();
  };

  // All other existing functions remain the same
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

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (authForm.email === 'admin@food.pk' && authForm.password === 'admin123') {
      const adminUser = {
        id: 'admin',
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
        id: 'user_001',
        name: authForm.name || 'Guest User',
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
      userId: "686fabb1c1fb439f2e230c81",
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
        {/* Admin Dashboard and Regular Content - same as before */}
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
                  <h2>Choose a Restaurant</h2>
                  {loading ? (
                    <p>Loading restaurants...</p>
                  ) : restaurants && restaurants.length > 0 ? (
                    <div className="restaurant-grid">
                      {restaurants && restaurants.map(restaurant => (
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No restaurants available. Please check if the backend server is running.</p>
                  )}
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
            </div>

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
                          ❌
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
                    Place Order
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

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
                {currentUser && !localStorage.getItem(`userPrefs_${currentUser.id}`) && (
                  <button 
                    className="setup-preferences-btn"
                    onClick={startOnboarding}
                  >
                    🎯 Set Up My Preferences
                  </button>
                )}
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className="message-container">
                <div className={`message ${msg.role}`}>
                  <div className="message-content">
                    {msg.content}
                  </div>
                  <div className="message-time">{msg.timestamp}</div>
                </div>

                {/* Onboarding options */}
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

                {/* Quick replies */}
                {msg.quickReplies && (
                  <div className="quick-replies">
                    {msg.quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        className="quick-reply-btn"
                        onClick={() => handleQuickReply(reply)}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}

                {/* Restaurant recommendations */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="chat-recommendations">
                    {msg.recommendations.map((restaurant, idx) => (
                      <div 
                        key={idx} 
                        className="recommendation-card"
                        onClick={() => selectRestaurant(restaurant)}
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
                        {restaurant.score && (
                          <div className="match-score">
                            {Math.round(restaurant.score)}% match
                          </div>
                        )}
                      </div>
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
                <button onClick={() => handleQuickReply("Budget options")} className="suggestion-chip">
                  💰 Budget
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

      {/* All existing modals remain the same */}
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

      {/* Order Tracking Modal */}
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
                <p>Estimated delivery: {orderStatus.estimatedDeliveryTime}</p>
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
                  <button className="rate-order-btn">Rate Your Experience</button>
                </div>
              )}

              <div className="order-details">
                <h3>Order Details</h3>
                <p><strong>Restaurant:</strong> {selectedRestaurant?.name || 'Restaurant'}</p>
                <p><strong>Total:</strong> Rs. {orderStatus.pricing?.total || 'N/A'}</p>
                <p><strong>Payment:</strong> {orderStatus.paymentMethod}</p>
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
  );
}

export default App;