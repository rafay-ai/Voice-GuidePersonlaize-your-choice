// backend/services/chatbot.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Store conversation context for each user
const userContexts = {};

// Function to get restaurant data
const getRestaurantData = (restaurants, menuItems) => {
  return restaurants.map(restaurant => ({
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating,
    price_range: restaurant.price_range,
    popular_items: restaurant.popular_items
  }));
};

// Function to analyze user preferences from order history
const analyzeUserPreferences = (userId, orderHistory, userPreferences) => {
  const userOrders = orderHistory.orders.filter(order => order.user_id === userId);
  const userPref = userPreferences.user_preferences.find(pref => pref.user_id === userId);
  
  const analysis = {
    orderCount: userOrders.length,
    favoriteRestaurants: [],
    averageSpending: 0,
    preferredCuisines: userPref?.favorite_cuisines || [],
    spiceTolerance: userPref?.spice_tolerance || 2,
    dietaryRestrictions: userPref?.dietary_restrictions || ['halal']
  };
  
  if (userOrders.length > 0) {
    // Calculate average spending
    const totalSpent = userOrders.reduce((sum, order) => sum + order.grand_total, 0);
    analysis.averageSpending = Math.round(totalSpent / userOrders.length);
    
    // Find favorite restaurants
    const restaurantCounts = {};
    userOrders.forEach(order => {
      restaurantCounts[order.restaurant_name] = (restaurantCounts[order.restaurant_name] || 0) + 1;
    });
    analysis.favoriteRestaurants = Object.entries(restaurantCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  }
  
  return analysis;
};

// Main chatbot function - DECLARED ONLY ONCE
async function getChatbotResponse(message, userId, restaurantData, menuData, orderHistory, userPreferences) {
  try {
    // Get or create user context
    if (!userContexts[userId]) {
      userContexts[userId] = {
        messages: [],
        preferences: analyzeUserPreferences(userId, orderHistory, userPreferences)
      };
    }
    
    const context = userContexts[userId];
    
    // Build the prompt
    const systemPrompt = `You are a friendly food delivery assistant for a Pakistani food delivery app. 
    You help users find and order food based on their preferences, mood, and past orders.
    
    Available restaurants: ${JSON.stringify(getRestaurantData(restaurantData, menuData))}
    
    User preferences: ${JSON.stringify(context.preferences)}
    
    Guidelines:
    1. Be conversational and friendly, use some Urdu phrases naturally
    2. Recommend based on user's past orders and preferences
    3. Consider budget (average spending: Rs. ${context.preferences.averageSpending})
    4. Always respect dietary restrictions: ${context.preferences.dietaryRestrictions.join(', ')}
    5. Suggest specific dishes, not just restaurants
    6. If user mentions mood (tired, celebrating, etc.), recommend accordingly
    7. Keep responses concise but helpful
    8. If user wants to order, list specific items with prices
    
    User message: ${message}
    
    Respond naturally and helpfully. If they ask for recommendations, suggest 2-3 specific options with reasons.`;
    
    // Generate response
    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();
    
    // Store conversation
    context.messages.push({ role: 'user', content: message });
    context.messages.push({ role: 'bot', content: response });
    
    // Extract recommendations if any
    const recommendations = extractRecommendations(response, restaurantData);
    
    return {
      response,
      recommendations,
      context: context.preferences
    };
    
  } catch (error) {
    console.error('Chatbot error:', error);
    
    // Fallback to rule-based responses
    return getFallbackResponse(message, restaurantData);
  }
}

// Extract restaurant recommendations from AI response
function extractRecommendations(response, restaurants) {
  const recommendations = [];
  
  restaurants.forEach(restaurant => {
    if (response.toLowerCase().includes(restaurant.name.toLowerCase())) {
      recommendations.push(restaurant);
    }
  });
  
  return recommendations.slice(0, 3); // Return top 3
}

// Fallback responses if AI fails
function getFallbackResponse(message, restaurants) {
  const lowerMessage = message.toLowerCase();
  let response = '';
  let recommendations = [];
  
  if (lowerMessage.includes('hungry') || lowerMessage.includes('bhook')) {
    response = "Aaj kya khana pasand karenge? I can suggest based on your mood:\n" +
               "😊 Celebrating? Try some BBQ or Biryani\n" +
               "😴 Tired? Quick options like burgers or pizza\n" +
               "🏠 Homestyle? Karahi or Nihari\n" +
               "What sounds good?";
  } else if (lowerMessage.includes('biryani')) {
    recommendations = restaurants.filter(r => 
      r.cuisine.some(c => c.toLowerCase().includes('biryani')) || 
      r.name.toLowerCase().includes('biryani')
    );
    response = "Biryani lover! Here are the best options:";
  } else if (lowerMessage.includes('cheap') || lowerMessage.includes('budget')) {
    recommendations = restaurants.filter(r => 
      r.price_range === 'Budget' || r.price_range === 'Moderate'
    );
    response = "Budget-friendly options coming up! These places offer great value:";
  } else if (lowerMessage.includes('late night')) {
    recommendations = restaurants.filter(r => 
      r.cuisine.includes('Fast Food') || r.name.includes('McDonald') || r.name.includes('KFC')
    );
    response = "For late night cravings, these places are usually open:";
  } else {
    response = "I'm here to help you find delicious food! Tell me:\n" +
               "- What cuisine you're craving\n" +
               "- Your budget\n" +
               "- Any dietary preferences\n" +
               "Or just say 'I'm hungry' and I'll suggest something!";
  }
  
  return {
    response,
    recommendations: recommendations.slice(0, 3),
    context: null
  };
}

module.exports = {
  getChatbotResponse,
  analyzeUserPreferences
};