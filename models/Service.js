const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  priceUnit: {
    type: String,
    default: 'hour', // e.g., 'hour', 'job', etc.
  },
  discount: {
    type: String, // e.g., '20% OFF'
  },
  rating: {
    type: Number,
    default: 0,
  },
  reviewsCount: {
    type: Number,
    default: 0,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  photos: [{
    type: String, // Array of strings (img urls)
  }],
  aboutService: {
    type: String,
    required: true,
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  providerInfo: { // Keeping these for UI flexibility
    name: { type: String },
    avatarUrl: { type: String },
    tagline: { type: String },
  }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
