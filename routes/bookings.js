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
      status: 'Pending'
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
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({
        path: 'service',
        populate: { path: 'provider', select: 'name email profileImage' }
      })
      .sort({ createdAt: -1 });
    res.json({ status: 'success', data: bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// @route   PATCH /api/bookings/:id/accept
// @desc    SP accepts the booking
router.patch('/:id/accept', protect, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ message: 'Only providers can accept' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'Pending') return res.status(400).json({ message: 'Only pending bookings can be accepted' });
    
    booking.status = 'Accepted';
    await booking.save();
    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/bookings/:id/on-the-way
router.patch('/:id/on-the-way', protect, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ message: 'Only providers' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (booking.status !== 'Accepted') return res.status(400).json({ message: 'Must be accepted first' });
    booking.status = 'On the way';
    await booking.save();
    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/bookings/:id/arrived
router.patch('/:id/arrived', protect, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ message: 'Only providers' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'On the way') return res.status(400).json({ message: 'Must be on the way first' });
    booking.status = 'Arrived';
    booking.userConfirmedArrival = false; // Reset just in case
    await booking.save();
    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/bookings/:id/confirm-arrival
// @desc    User confirms that the provider has arrived
router.patch('/:id/confirm-arrival', protect, async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ message: 'Only users can confirm arrival' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'Arrived') return res.status(400).json({ message: 'Provider has not marked as arrived yet' });
    
    booking.userConfirmedArrival = true;
    await booking.save();
    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/bookings/:id/start-work
// @desc    Provider starts working (only after user confirms arrival)
router.patch('/:id/start-work', protect, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ message: 'Only providers can start work' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'Arrived') return res.status(400).json({ message: 'Status must be Arrived' });
    if (!booking.userConfirmedArrival) return res.status(400).json({ message: 'Wait for user to confirm your arrival' });
    
    booking.status = 'Working';
    await booking.save();
    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/bookings/:id/mark-completed
router.patch('/:id/mark-completed', protect, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ message: 'Only providers' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'Working') return res.status(400).json({ message: 'Job must be in Working status first' });
    
    booking.markedCompletedByProvider = true;
    await booking.save();
    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/bookings/:id/confirm-completion
router.patch('/:id/confirm-completion', protect, async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ message: 'Only users' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.markedCompletedByProvider) return res.status(400).json({ message: 'Provider has not marked as completed yet' });
    
    booking.status = 'Completed';
    await booking.save();
    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/bookings/:id/request-payout
router.patch('/:id/request-payout', protect, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ message: 'Only providers' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (booking.status !== 'Completed') return res.status(400).json({ message: 'Job must be marked as Completed first' });
    if (booking.payoutStatus !== 'None') return res.status(400).json({ message: 'Payout already requested or paid' });
    
    booking.payoutStatus = 'Requested';
    await booking.save();
    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const activeJobs = bookings.filter(b => !['Completed', 'Cancelled'].includes(b.status)).length;
    
    // Get 3 most recent bookings
    const recentRequests = await Booking.find({ service: { $in: serviceIds } })
      .populate('service', 'title')
      .populate('user', 'name email profileImage')
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

// @route   PATCH /api/bookings/:id/rate
// @desc    User rates the completed service
router.patch('/:id/rate', protect, async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ message: 'Only users can rate services' });
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Please provide a valid rating between 1 and 5' });

  try {
    const booking = await Booking.findById(req.params.id).populate('service');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'Completed') return res.status(400).json({ message: 'Only completed services can be rated' });
    if (booking.userFeedback && booking.userFeedback.rating) return res.status(400).json({ message: 'You have already rated this service' });

    // Update booking feedback
    booking.userFeedback = { rating, comment: comment || "" };
    await booking.save();

    // Update Provider average rating
    const Service = require('../models/Service');
    const User = require('../models/User');
    const service = await Service.findById(booking.service);
    if (service) {
      const provider = await User.findById(service.provider);
      if (provider) {
        const totalRatingPoints = (provider.averageRating || 0) * (provider.numReviews || 0);
        provider.numReviews = (provider.numReviews || 0) + 1;
        provider.averageRating = (totalRatingPoints + rating) / provider.numReviews;
        await provider.save();
      }
    }

    res.json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
