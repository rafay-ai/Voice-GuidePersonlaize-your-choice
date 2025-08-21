// backend/routes/auth.js - FIXED VERSION
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || '1Batmanuscks_12345';

// ===== MIDDLEWARE: Authenticate JWT Token =====
async function authenticateToken(req, res, next) {
  try {
    console.log('🔐 Authentication middleware triggered');
    console.log('🔐 Headers received:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    console.log('🔐 Token received, length:', token.length);
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token decoded successfully, userId:', decoded.userId);
    
    // Find the user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('❌ User not found in database:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }
    
    console.log('✅ User found:', user.name);
    
    // Set user info in request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    console.log('✅ Authentication successful, proceeding to next middleware');
    next();
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token format'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
}
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
    
    // Create new user with proper preferences structure
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save middleware
      phone: phone.trim(),
      preferences: {
        preferredCuisines: [],
        spiceLevel: 'Medium',
        dietaryRestrictions: ['halal'],
        budgetRange: {
          min: 200,
          max: 1500
        },
        favoriteRestaurants: [],
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0
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
      loyaltyStatus: user.loyaltyStatus,
      loyaltyPoints: user.loyaltyPoints,
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
      
      console.log('✅ Admin token generated, length:', adminToken.length);
      
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
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    console.log('✅ User found:', user.name, 'ID:', user._id);
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    console.log('✅ Password validated for user:', user.name);
    
    // CRITICAL FIX: Ensure user._id is properly converted to string
    const userIdString = user._id.toString();
    console.log('🔧 User ID for token:', userIdString, 'Type:', typeof userIdString);
    
    // Generate JWT token with proper payload
    const tokenPayload = {
      userId: userIdString,
      email: user.email,
      role: user.role
    };
    
    console.log('🔧 Token payload:', tokenPayload);
    console.log('🔧 JWT Secret length:', JWT_SECRET.length);
    
    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Token generated successfully');
    console.log('🔧 Token length:', token.length);
    console.log('🔧 Token first 50 chars:', token.substring(0, 50) + '...');
    
    // Verify the token immediately after creation
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verification successful:', decoded.userId);
    } catch (verifyError) {
      console.error('❌ Token verification failed immediately after creation:', verifyError);
      return res.status(500).json({
        success: false,
        message: 'Token generation failed'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Return user data without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      preferences: user.preferences,
      loyaltyStatus: user.loyaltyStatus,
      loyaltyPoints: user.loyaltyPoints,
      isNewUser: user.preferences?.totalOrders === 0
    };
    
    console.log('✅ User logged in successfully:', userData.id);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token: token,
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

// ALSO ADD THIS AT THE TOP OF YOUR auth.js FILE TO VERIFY JWT_SECRET:
console.log('🔧 JWT_SECRET defined:', !!JWT_SECRET);
console.log('🔧 JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 'undefined');
console.log('🔧 JWT_SECRET value:', JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'undefined');

// ===== GET USER PROFILE =====
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('preferences.favoriteRestaurants');
    
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
      loyaltyStatus: user.loyaltyStatus,
      loyaltyPoints: user.loyaltyPoints,
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
// Replace the preferences route in your auth.js with this fixed version:

// ===== UPDATE USER PREFERENCES (FIXED) =====
router.patch('/preferences', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Preferences update request:', req.body);
    console.log('🔧 User ID from token:', req.user.userId);
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      console.log('❌ User not found:', req.user.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('✅ User found:', user.name);
    console.log('📋 Current preferences:', user.preferences);
    
    // Ensure preferences object exists
    if (!user.preferences) {
      user.preferences = {};
    }
    
    // Update preferences safely
    const updateData = req.body;
    
    // Handle each preference field individually
    if (updateData.preferredCuisines !== undefined) {
      user.preferences.preferredCuisines = updateData.preferredCuisines;
      console.log('✅ Updated preferredCuisines:', updateData.preferredCuisines);
    }
    
    if (updateData.spiceLevel !== undefined) {
      user.preferences.spiceLevel = updateData.spiceLevel;
      console.log('✅ Updated spiceLevel:', updateData.spiceLevel);
    }
    
    if (updateData.dietaryRestrictions !== undefined) {
      user.preferences.dietaryRestrictions = updateData.dietaryRestrictions;
      console.log('✅ Updated dietaryRestrictions:', updateData.dietaryRestrictions);
    }
    
    if (updateData.budgetRange !== undefined) {
      user.preferences.budgetRange = updateData.budgetRange;
      console.log('✅ Updated budgetRange:', updateData.budgetRange);
    }
    
    if (updateData.favoriteRestaurants !== undefined) {
      user.preferences.favoriteRestaurants = updateData.favoriteRestaurants;
      console.log('✅ Updated favoriteRestaurants:', updateData.favoriteRestaurants);
    }
    
    // Mark the preferences field as modified for MongoDB
    user.markModified('preferences');
    
    // Save the user
    await user.save();
    
    console.log('✅ User preferences saved successfully');
    console.log('📋 New preferences:', user.preferences);
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
    
  } catch (error) {
    console.error('❌ Preferences update error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message
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
      user.preferences.favoriteRestaurants = user.preferences.favoriteRestaurants.filter(
        id => id.toString() !== restaurantId
      );
      await user.save();
      
      res.json({
        success: true,
        message: 'Restaurant removed from favorites',
        action: 'removed'
      });
    } else {
      user.preferences.favoriteRestaurants.push(restaurantId);
      await user.save();
      
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
        preferences: user.preferences,
        loyaltyStatus: user.loyaltyStatus,
        loyaltyPoints: user.loyaltyPoints
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

// ✅ FIXED: Export router instead of middleware
module.exports = router;