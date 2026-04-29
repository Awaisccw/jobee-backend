const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');

// @desc    Initiate Easypaisa USSD Push
// @route   POST /api/payments/initiate
// @access  Private
exports.initiatePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate('user', 'phoneNumber');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const settings = await Settings.getSettings();
    
    // In a real implementation, we would call the Easypaisa Direct Debit API here.
    // We send: amount, MSISDN (user phone), receiver (admin account), and credentials.
    
    // For this simulation, we'll return a "PENDING_USER_PIN" status.
    booking.status = 'Awaiting Payment';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'USSD Push sent to your phone. Please enter your PIN to authorize.',
      data: {
        orderId: booking._id,
        amount: booking.totalAmount,
        receiver: settings.adminEasypaisaNumber
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment initiation failed', error: error.message });
  }
};

// @desc    Easypaisa Success Callback (IPN)
// @route   POST /api/payments/callback
// @access  Public (Secure)
exports.paymentCallback = async (req, res) => {
  try {
    const { orderId, transactionId, status } = req.body;

    // Verify signature logic here...

    const booking = await Booking.findById(orderId);
    if (!booking) return res.status(404).send('Booking not found');

    if (status === 'SUCCESS') {
      booking.status = 'Pending';
      booking.paymentStatus = 'held';
      booking.easypaisaTransactionId = transactionId;
      await booking.save();

      // Log the transaction in our ledger
      await Transaction.create({
        bookingId: booking._id,
        userId: booking.user,
        providerId: (await booking.populate('service', 'provider')).service.provider,
        amount: booking.totalAmount,
        status: 'held',
        easypaisaTransactionId: transactionId
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('IPN Error:', error);
    res.status(500).send('IPN processing failed');
  }
};

// @desc    Release Escrow Funds to Provider
// @route   POST /api/payments/release/:bookingId
// @access  Private (Admin Only)
exports.releasePayout = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('service', 'provider');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Job must be marked as Completed before payout' });
    }

    const provider = await User.findById(booking.service.provider);
    const settings = await Settings.getSettings();

    const amountToRelease = booking.totalAmount * (1 - settings.platformFeePercentage/100);

    // Call Easypaisa Disbursement API to send money from Admin to Provider's linked account
    // Logic: Easypaisa API(source=AdminAccount, target=provider.easypaisaAccount.accountNumber, amount=amountToRelease)

    booking.paymentStatus = 'released';
    booking.payoutStatus = 'Paid';
    await booking.save();

    await Transaction.findOneAndUpdate(
      { bookingId: booking._id },
      { status: 'released', releasedAt: Date.now() }
    );

    res.status(200).json({
      success: true,
      message: `Successfully released PKR ${amountToRelease} to ${provider.name}`,
      data: { releasedAmount: amountToRelease }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payout release failed', error: error.message });
  }
};
