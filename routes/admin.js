const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeProviders = await User.countDocuments({ role: 'provider', status: 'approved' });
    const pendingApprovals = await User.countDocuments({ role: 'provider', status: 'pending' });
    const totalBookings = await Booking.countDocuments();
    
    // Calculate total revenue
    const revenueResult = await Booking.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Get recent monitoring (brief)
    const recentBookings = await Booking.find()
      .populate('user', 'name email')
      .populate('service', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          activeProviders,
          totalBookings,
          totalRevenue: `Rs. ${totalRevenue.toLocaleString()}`,
          pendingApprovals
        },
        recentBookings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// @route   GET /api/admin/providers
// @desc    Get all service providers (with optional status filter)
// @access  Private/Admin
router.get('/providers', protect, adminOnly, async (req, res) => {
  const { status } = req.query;
  const filter = { role: 'provider' };
  
  if (status && status !== 'all') {
    filter.status = status;
  }

  try {
    const providers = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: providers });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server Error', error: error.message });
  }
});

// @route   GET /api/admin/pending-providers
// @desc    Get all service providers waiting for approval
// ... (keeping existing for backward compat)
router.get('/pending-providers', protect, adminOnly, async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider', status: 'pending' }).select('-password');
    res.status(200).json({ status: 'success', data: providers });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server Error', error: error.message });
  }
});

// @route   PUT /api/admin/approve-provider/:id
// @desc    Approve or reject a provider
// @access  Private/Admin
router.put('/approve-provider/:id', protect, adminOnly, async (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid status' });
  }

  try {
    const provider = await User.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ status: 'fail', message: 'Provider not found' });
    }

    provider.status = status;
    await provider.save();

    res.status(200).json({ status: 'success', message: `Provider status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server Error', error: error.message });
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings for monitoring
// @access  Private/Admin
router.get('/bookings', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email profileImage')
      .populate('service', 'title price provider')
      .sort('-createdAt');
    res.status(200).json({ status: 'success', data: bookings });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server Error', error: error.message });
  }
});

// @route   PUT /api/admin/bookings/:id/status
// @desc    Update booking status (e.g. confirming escrow, or releasing payout)
// @access  Private/Admin
router.put('/bookings/:id/status', protect, adminOnly, async (req, res) => {
  const { status, payoutStatus } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Booking not found' });
    }

    if (status) booking.status = status;
    if (payoutStatus) booking.payoutStatus = payoutStatus;
    if (req.body.markedCompletedByProvider !== undefined) {
      booking.markedCompletedByProvider = req.body.markedCompletedByProvider;
    }

    await booking.save();

    res.status(200).json({ status: 'success', message: 'Booking updated', data: booking });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server Error', error: error.message });
  }
});

// @route   GET /api/admin/settings
// @desc    Get global platform settings
// @access  Private/Admin
router.get('/settings', protect, adminOnly, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json({ status: 'success', data: settings });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server Error', error: error.message });
  }
});

// @route   PATCH /api/admin/settings
// @desc    Update global platform settings
// @access  Private/Admin
router.patch('/settings', protect, adminOnly, async (req, res) => {
  try {
    const { adminEasypaisaNumber, adminEasypaisaName, platformFeePercentage, easypayStoreId, easypayHashKey } = req.body;
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    if (adminEasypaisaNumber !== undefined) settings.adminEasypaisaNumber = adminEasypaisaNumber;
    if (adminEasypaisaName !== undefined) settings.adminEasypaisaName = adminEasypaisaName;
    if (platformFeePercentage !== undefined) settings.platformFeePercentage = platformFeePercentage;
    if (easypayStoreId !== undefined) settings.easypayStoreId = easypayStoreId;
    if (easypayHashKey !== undefined) settings.easypayHashKey = easypayHashKey;

    await settings.save();
    res.status(200).json({ status: 'success', data: settings });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/admin/settings/slider
// @desc    Upload up to 4 slider images
// @access  Private/Admin
router.post('/settings/slider', protect, adminOnly, upload.array('sliderImages', 4), async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'No images uploaded' });
    }

    const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
    const results = await Promise.all(uploadPromises);
    const imageUrls = results.map(result => result.secure_url);

    // Replace or append? User said "Admin can upload 4 slider pictures that will be showed in the slider"
    // Usually, this means setting the current pool of images.
    settings.sliderImages = imageUrls;

    await settings.save();
    res.status(200).json({ status: 'success', data: settings });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server Error', error: error.message });
  }
});

module.exports = router;
