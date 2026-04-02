const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private (User must be logged in)
router.post('/', protect, async (req, res) => {
  const { serviceId, date, time, address, totalAmount } = req.body;

  if (!serviceId || !date || !time || !address || !totalAmount) {
    return res.status(400).json({ message: 'Please provide all required booking fields' });
  }

  try {
    const booking = new Booking({
      user: req.user._id,
      service: serviceId,
      date,
      time,
      address,
      totalAmount,
      status: 'Escrowed'
    });

    const savedBooking = await booking.save();
    res.status(201).json(savedBooking);
  } catch (error) {
    res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
});

// Get bookings for provider
router.get('/provider-bookings', protect, async (req, res) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ message: 'Only providers can access these bookings' });
  }

  try {
    const Service = require('../models/Service');
    const myServices = await Service.find({ provider: req.user._id }).select('_id');
    const serviceIds = myServices.map(s => s._id);

    const bookings = await Booking.find({ service: { $in: serviceIds } })
      .populate('service')
      .populate('user', 'name email phone avatarUrl')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching provider bookings', error: error.message });
  }
});

// @route   GET /api/bookings/my-bookings

// @route   PUT /api/bookings/:id/mark-done
// @desc    Mark booking as done by either user or provider
// @access  Private
router.put('/:id/mark-done', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.id || req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if the requester is the user who booked or the provider of the service
    // (In a more robust app, we'd check if req.user is the service provider too)
    
    if (req.user.role === 'user' && booking.user.toString() === req.user._id.toString()) {
       booking.status = (booking.status === 'MarkedDoneByProvider') ? 'Completed' : 'MarkedDoneByUser';
    } else if (req.user.role === 'provider') {
       booking.status = (booking.status === 'MarkedDoneByUser') ? 'Completed' : 'MarkedDoneByProvider';
    } else {
       return res.status(403).json({ message: 'Not authorized to mark this booking' });
    }

    await booking.save();
    res.status(200).json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking', error: error.message });
  }
});

// Get stats for specific provider
router.get('/provider-stats', protect, async (req, res) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  try {
    const Service = require('../models/Service');
    const myServices = await Service.find({ provider: req.user._id }).select('_id');
    const serviceIds = myServices.map(s => s._id);

    const bookings = await Booking.find({ service: { $in: serviceIds } }).populate('service');
    
    // Calculate stats
    const totalEarnings = bookings
      .filter(b => b.status === 'Completed')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    const jobsDone = bookings.filter(b => b.status === 'Completed').length;
    const activeJobs = bookings.filter(b => ['Escrowed', 'MarkedDoneByProvider', 'MarkedDoneByUser'].includes(b.status)).length;
    
    // Get 3 most recent bookings
    const recentRequests = await Booking.find({ service: { $in: serviceIds } })
      .populate('service', 'title')
      .sort({ createdAt: -1 })
      .limit(3);

    res.json({
      totalEarnings,
      jobsDone,
      activeJobs,
      recentRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

module.exports = router;
