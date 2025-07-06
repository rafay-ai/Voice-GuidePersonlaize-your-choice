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
  const [loading, setLoading] = useState(true);

  // Load restaurants when app starts
  useEffect(() => {
    fetchRestaurants();
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
        body: JSON.stringify({ message: inputMessage, userId: 'user_001' })
      });
      const data = await response.json();
      
      // Add bot response
      setMessages(prev => [...prev, { role: 'bot', content: data.bot_response }]);
      
      // If recommendations, show them
      if (data.recommendations && data.recommendations.length > 0) {
        // You can display recommendations here
      }
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

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <h1>🍕 Pakistani Food Delivery</h1>
        <div className="header-buttons">
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
              <button className="order-button">
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
              <div key={index} className={`message ${msg.role}`}>
                {msg.content}
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
    </div>
  );
}

export default App;