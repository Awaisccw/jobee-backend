const express = require('express');
const router = express.Router();
const { initiatePayment, paymentCallback, releasePayout } = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @route   POST /api/payments/initiate
// @desc    Initiate Easypaisa USSD Push to User
// @access  Private (User)
router.post('/initiate', protect, initiatePayment);

// @route   POST /api/payments/callback
// @desc    Easypaisa Success Callback (IPN)
// @access  Public (Secure/Industry standard)
router.post('/callback', paymentCallback);

// @route   POST /api/payments/release/:id
// @desc    Release Escrow Funds to Provider
// @access  Private (Admin Only)
router.post('/release/:bookingId', protect, adminOnly, releasePayout);

module.exports = router;
