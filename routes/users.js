const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');

// @route   GET /api/users/profile
// @desc    Get logged in user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'savedServices',
        populate: { path: 'category' }
      });
    
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server ERROR', error: error.message });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, upload.single('profileImage'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: "fail", message: 'User not found' });
    }

    const { name, email, phoneNumber, addresses, country } = req.body;

    user.name = name || user.name;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    if (addresses) user.addresses = typeof addresses === 'string' ? JSON.parse(addresses) : addresses;
    user.country = country || user.country;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      user.profileImage = result.secure_url;
    } else if (req.body.profileImage) {
      user.profileImage = req.body.profileImage;
    }

    const updatedUser = await user.save();
    
    const userResponse = await User.findById(updatedUser._id)
      .select('-password')
      .populate({
        path: 'savedServices',
        populate: { path: 'category' }
      });

    res.json({
      status: "success",
      data: {
        doc: userResponse
      }
    });
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server ERROR updating profile', error: error.message });
  }
});

// @route   PUT /api/users/payout-methods
// @desc    Add or remove payout methods
// @access  Private
router.put('/payout-methods', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { payoutMethods, primaryPayoutMethod } = req.body;

    if (payoutMethods) user.payoutMethods = payoutMethods;
    if (primaryPayoutMethod) user.primaryPayoutMethod = primaryPayoutMethod;

    await user.save();
    res.json({ message: 'Payout methods updated successfully', data: { payoutMethods: user.payoutMethods, primaryPayoutMethod: user.primaryPayoutMethod } });
  } catch (error) {
    res.status(500).json({ message: 'Server ERROR updating payout methods', error: error.message });
  }
});

// @route   PUT /api/users/save-service/:id
// @desc    Save/Bookmark a service or remove if already saved
// @access  Private
router.put('/save-service/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Check if service is already in saved list
    const isSaved = user.savedServices.includes(req.params.id);

    if (isSaved) {
      // Remove it
      user.savedServices = user.savedServices.filter(
        (serviceId) => serviceId.toString() !== req.params.id
      );
    } else {
      // Add it
      user.savedServices.push(req.params.id);
    }

    await user.save();
    
    // Return updated list
    const updatedUser = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'savedServices',
        populate: { path: 'category' }
      });
      
    res.json({ savedServices: updatedUser.savedServices, message: isSaved ? 'Service removed from saved' : 'Service saved' });
  } catch (error) {
    res.status(500).json({ message: 'Server ERROR modifying saved services', error: error.message });
  }
});

module.exports = router;
