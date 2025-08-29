// backend/models/MenuItem.js
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'biryani', 'curry', 'bread', 'appetizer', 'dessert', 'beverage',
      'rice', 'kebab', 'chicken', 'beef', 'mutton', 'vegetarian',
      'seafood', 'snacks', 'traditional', 'fast_food'
    ]
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  image: {
    type: String,
    required: false, // Changed from required to allow seeding without images initially
    default: '/api/placeholder/food-item' // Placeholder for items without images
  },
  available: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    default: 15,
    min: 5,
    max: 60
  },
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'very_hot'],
    default: 'medium'
  },
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isHalal: {
    type: Boolean,
    default: true // Most Pakistani food is halal
  },
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  tags: [{
    type: String
  }],
  // Neural recommendation features
  popularityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  orderCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance in recommendations
menuItemSchema.index({ restaurant: 1, category: 1 });
menuItemSchema.index({ popularityScore: -1 });
menuItemSchema.index({ averageRating: -1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);