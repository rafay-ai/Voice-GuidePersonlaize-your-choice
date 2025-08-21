// backend/routes/auth.js - NEW FILE
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || '1Batmanuscks_12345';

// ===== REGISTER NEW USER =====
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    console.log('📝 Registration attempt:', { name, email, phone });
    
    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save middleware
      phone: phone.trim(),
      preferences: {
        cuisine: [],
        spiceLevel: 3,
        dietary: ['halal'],
        budget: 'Rs. 500-1000',
        timing: ['Lunch', 'Dinner']
      }
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      preferences: user.preferences,
      profileCompleteness: user.profileCompleteness,
      isNewUser: true
    };
    
    console.log('✅ User registered successfully:', userData.id);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: userData,
      token,
      expiresIn: '7d'
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account',
      error: error.message
    });
  }
});

// ===== LOGIN USER =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', { email });
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Check for admin login
    if (email === 'admin@food.pk' && password === 'admin123') {
      const adminUser = {
        id: 'admin_user',
        name: 'Admin',
        email: email,
        role: 'admin',
        isAdmin: true,
        preferences: {}
      };
      
      const adminToken = jwt.sign(
        { userId: 'admin_user', email, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return res.json({
        success: true,
        message: 'Admin login successful',
        user: adminUser,
        token: adminToken,
        isAdmin: true
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('preferences.favoriteRestaurants');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    user.activityLog.unshift({
      action: 'login',
      details: { ip: req.ip, userAgent: req.get('User-Agent') }
    });
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      preferences: user.preferences,
      orderHistory: user.orderHistory.slice(0, 10), // Last 10 orders
      profileCompleteness: user.profileCompleteness,
      loyaltyStatus: user.loyaltyStatus,
      isNewUser: user.preferences.totalOrders === 0 && user.preferences.cuisine.length === 0
    };
    
    console.log('✅ User logged in successfully:', userData.id);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token,
      expiresIn: '7d'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// ===== GET USER PROFILE =====
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('preferences.favoriteRestaurants')
      .populate('orderHistory.order');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      preferences: user.preferences,
      orderHistory: user.orderHistory,
      profileCompleteness: user.profileCompleteness,
      loyaltyStatus: user.loyaltyStatus,
      averageRating: user.averageRating,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
    
    res.json({
      success: true,
      user: userData
    });
    
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// ===== UPDATE USER PREFERENCES =====
router.patch('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update preferences
    const updatedUser = await user.updatePreferences(req.body);
    
    console.log('✅ Preferences updated for user:', user._id);
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences,
      profileCompleteness: updatedUser.profileCompleteness
    });
    
  } catch (error) {
    console.error('❌ Preferences update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

// ===== ADD/REMOVE FAVORITE RESTAURANT =====
router.post('/favorites/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const { restaurantId } = req.params;
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isFavorite = user.preferences.favoriteRestaurants.includes(restaurantId);
    
    if (isFavorite) {
      await user.removeFavorite(restaurantId);
      res.json({
        success: true,
        message: 'Restaurant removed from favorites',
        action: 'removed'
      });
    } else {
      await user.addFavorite(restaurantId);
      res.json({
        success: true,
        message: 'Restaurant added to favorites',
        action: 'added'
      });
    }
    
  } catch (error) {
    console.error('❌ Favorite toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorites'
    });
  }
});

// ===== RATE ORDER =====
router.post('/rate-order', authenticateToken, async (req, res) => {
  try {
    const { orderId, rating, feedback } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    await user.rateOrder(orderId, rating, feedback);
    
    res.json({
      success: true,
      message: 'Order rated successfully'
    });
    
  } catch (error) {
    console.error('❌ Rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate order'
    });
  }
});

// ===== VERIFY TOKEN =====
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

// ===== LOGOUT =====
router.post('/logout', authenticateToken, (req, res) => {
  // In a more complex app, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ===== MIDDLEWARE: Authenticate JWT Token =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    next();
  });
}

module.exports = router;