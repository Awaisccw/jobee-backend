const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/users/profile
// @desc    Get logged in user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('savedServices');
    
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server ERROR', error: error.message });
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
      .populate('savedServices');
      
    res.json({ savedServices: updatedUser.savedServices, message: isSaved ? 'Service removed from saved' : 'Service saved' });
  } catch (error) {
    res.status(500).json({ message: 'Server ERROR modifying saved services', error: error.message });
  }
});

module.exports = router;
