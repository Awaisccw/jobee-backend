const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  status: {
    type: String,
    enum: ['pending', 'held', 'released', 'refunded'],
    default: 'pending'
  },
  easypaisaTransactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  payoutTransactionId: {
    type: String,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  releasedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
