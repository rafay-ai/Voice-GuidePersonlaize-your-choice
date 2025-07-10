const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: String,
  rating: {
    type: Number,
    default: 0
  },
  priceRange: {
    type: String,
    enum: ['Budget', 'Moderate', 'Premium', 'Luxury'],
    default: 'Moderate'
  },
  cuisine: [String],
  deliveryTime: {
    type: String,
    default: '30-45 mins'
  },
  deliveryFee: {
    type: Number,
    default: 50
  },
  minimumOrder: {
    type: Number,
    default: 200
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Restaurant', restaurantSchema);