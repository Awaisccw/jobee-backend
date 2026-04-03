const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  date: {
    type: String, // e.g., '12/04/2026'
    required: true
  },
  time: {
    type: String, // e.g., '14:30'
    required: true
  },
  address: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    addressType: { type: String, default: 'Home' }
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'On the way', 'Arrived', 'Started', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  markedCompletedByProvider: {
    type: Boolean,
    default: false
  },
  paymentReference: {
    type: String // To store payment session or receipt id
  },
  payoutStatus: {
    type: String,
    enum: ['None', 'Requested', 'Processing', 'Paid'],
    default: 'None'
  },
  userFeedback: {
    rating: Number,
    comment: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
