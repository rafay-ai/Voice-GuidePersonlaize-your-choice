// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
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

  // Load restaurants when app starts
  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Check for existing user on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch all restaurants
  const fetchRestaurants = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/restaurants');
      const data = await response.json();
      console.log('Fetched data:', data); // Debug log
      setRestaurants(data.data || []); // Set empty array if data is undefined
      setLoading(false);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setRestaurants([]); // Set empty array on error
      setLoading(false);
    }
  };

  // Fetch menu for selected restaurant
  const fetchMenu = async (restaurantId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/menu/${restaurantId}`);
      const data = await response.json();
      
      if (data.success && data.items) {
        setMenu(data.items);
      } else {
        // No menu items found
        setMenu([]);
        alert(`No menu items found for this restaurant. Restaurant ID: ${restaurantId}`);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      setMenu([]);
      alert('Error loading menu. Please try again.');
    }
  };

  // Handle restaurant selection
  const selectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    fetchMenu(restaurant.id);
  };

  // Add item to cart
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Remove from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Calculate total
  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = 50;
    return { subtotal, deliveryFee, total: subtotal + deliveryFee };
  };

  // Send message to chatbot
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    setMessages([...messages, { role: 'user', content: inputMessage }]);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage, userId: currentUser?.id || 'guest' })
      });
      const data = await response.json();
      
      // Add bot response
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: data.bot_response,
        recommendations: data.recommendations 
      }]);
      
    } catch (error) {
      console.error('Error sending message:', error);
    }

    setInputMessage('');
  };

  // Convert price range to readable format
  const getPriceRangeDisplay = (priceRange) => {
    if (!priceRange) return 'Price not specified';
    
    // Count the number of ₨ symbols or Rs
    const count = (priceRange.match(/₨|Rs/g) || []).length;
    
    // Return text labels for better display
    switch(count) {
      case 1: return 'Budget';
      case 2: return 'Moderate';
      case 3: return 'Premium';
      case 4: return 'Luxury';
      default: return 'Moderate';
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (authForm.email && authForm.password) {
      const user = {
        id: 'user_001',
        name: authForm.name || 'Guest User',
        email: authForm.email,
        phone: authForm.phone
      };
      
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setShowAuth(false);
      alert(`Welcome back, ${user.name}!`);
      
      setAuthForm({ name: '', email: '', password: '', phone: '' });
    }
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (authForm.name && authForm.email && authForm.password && authForm.phone) {
      const newUser = {
        id: `user_${Date.now()}`,
        name: authForm.name,
        email: authForm.email,
        phone: authForm.phone
      };
      
      setCurrentUser(newUser);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      setShowAuth(false);
      alert(`Welcome to Pakistani Food Delivery, ${newUser.name}!`);
      
      setAuthForm({ name: '', email: '', password: '', phone: '' });
    }
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setOrderStatus(null);
  };

  // Place order function
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

    const orderData = {
      userId: currentUser.id,
      userEmail: currentUser.email,
      restaurantId: cart[0].restaurant_id,
      items: cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price
      })),
      deliveryAddress: deliveryAddress,
      paymentMethod: 'Cash on Delivery'
    };

    try {
      const response = await fetch('http://localhost:5000/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOrderStatus(data.order);
        setCart([]); // Clear cart
        setShowCheckout(false);
        setShowOrderTracking(true); // Show tracking instead of alert
        setCurrentOrderStatus('confirmed');
        
        // Simulate order progress
        setTimeout(() => setCurrentOrderStatus('preparing'), 3000);
        setTimeout(() => setCurrentOrderStatus('on-the-way'), 10000);
        setTimeout(() => setCurrentOrderStatus('delivered'), 20000);
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
            💬 Chat with Bot
          </button>
          <div className="cart-info">
            🛒 Cart ({cart.length})
          </div>
        </div>
      </header>

      <div className="main-container">
        {/* Left Side - Restaurants or Menu */}
        <div className="content">
          {!selectedRestaurant ? (
            // Restaurant List
            <div className="restaurants-section">
              <h2>Choose a Restaurant</h2>
              {loading ? (
                <p>Loading restaurants...</p>
              ) : restaurants && restaurants.length > 0 ? (
                <div className="restaurant-grid">
                  {restaurants.map(restaurant => (
                    <div 
                      key={restaurant.id} 
                      className="restaurant-card"
                      onClick={() => selectRestaurant(restaurant)}
                    >
                      <h3>{restaurant.name}</h3>
                      <p className="cuisine">{restaurant.cuisine ? restaurant.cuisine.join(', ') : 'Cuisine not specified'}</p>
                      <div className="restaurant-info">
                        <span>⭐ {restaurant.rating}</span>
                        <span>{getPriceRangeDisplay(restaurant.price_range)}</span>
                        <span>🚚 {restaurant.delivery_time}</span>
                      </div>
                      <p className="min-order">Min order: Rs. {restaurant.minimum_order}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No restaurants available. Please check if the backend server is running.</p>
              )}
            </div>
          ) : (
            // Menu View
            <div className="menu-section">
              <button onClick={() => setSelectedRestaurant(null)} className="back-button">
                ← Back to Restaurants
              </button>
              <h2>{selectedRestaurant.name} Menu</h2>
              {menu.length > 0 ? (
                <div className="menu-grid">
                  {menu.map(item => (
                    <div key={item.id} className="menu-item">
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

        {/* Right Side - Cart */}
        <div className="cart-section">
          <h3>Your Order</h3>
          {cart.length === 0 ? (
            <p className="empty-cart">Your cart is empty</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div>
                    <p>{item.name}</p>
                    <p className="quantity">Qty: {item.quantity} × Rs. {item.price}</p>
                  </div>
                  <div>
                    <p>Rs. {item.price * item.quantity}</p>
                    <button 
                      onClick={() => removeFromCart(item.id)}
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
      </div>

      {/* Chatbot */}
      {showChat && (
        <div className="chatbot">
          <div className="chat-header">
            <h3>Food Assistant 🤖</h3>
            <button onClick={() => setShowChat(false)}>✖</button>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-welcome">Hi! I can help you find the perfect meal. What are you craving today?</p>
            )}
            {messages.map((msg, index) => (
              <div key={index}>
                <div className={`message ${msg.role}`}>
                  {msg.content}
                </div>
                {/* Show recommendations if this is a bot message with recommendations */}
                {msg.role === 'bot' && msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="chat-recommendations">
                    {msg.recommendations.map((restaurant, idx) => (
                      <div key={idx} className="chat-restaurant-card" onClick={() => selectRestaurant(restaurant)}>
                        <h4>{restaurant.name}</h4>
                        <p>{restaurant.cuisine.join(', ')}</p>
                        <div className="restaurant-info-small">
                          <span>⭐ {restaurant.rating}</span>
                          <span>{restaurant.price_range}</span>
                          <span>🚚 {restaurant.delivery_time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
            />
            <button onClick={sendMessage}>Send</button>
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
                  <div key={item.id} className="summary-item">
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
                <h3>Order #{orderStatus.order_id}</h3>
                <p>Estimated delivery: {orderStatus.estimated_delivery}</p>
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
                <p><strong>Restaurant:</strong> {orderStatus.items[0]?.restaurant_name || 'Restaurant'}</p>
                <p><strong>Total:</strong> Rs. {orderStatus.grand_total}</p>
                <p><strong>Payment:</strong> {orderStatus.payment_method}</p>
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