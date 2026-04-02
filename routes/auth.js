const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { protect } = require('../middleware/authMiddleware');

// Generate JWT Helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// Generate 6 digit OTP Helper
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/send-otp
// @desc    Send OTP to email for registration / forgot password
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ status: "fail", message: 'Please provide an email address' });
  }

  try {
    const otpCode = generateOtp();
    
    // In a real app, send email with Nodemailer here.
    // For now, we will just delete old OTPs and save this one.
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });

    console.log(`\n============== OTP GENERATED ==============\nEmail: ${email}\nOTP: ${otpCode}\n===========================================\n`);

    res.status(200).json({ status: "success", message: 'OTP sent successfully. Check backend console.' });
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify the generated OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const record = await Otp.findOne({ email, otp });
    
    if (record) {
      res.status(200).json({ status: "success", message: 'OTP verified successfully' });
    } else {
      res.status(400).json({ status: "fail", message: 'Invalid or expired OTP' });
    }
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user after OTP
router.post('/register', upload.single('profileImage'), async (req, res) => {
  const { fullName, email, password, countryCode, countryName, name, phone, phoneNumber } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ status: "fail", message: 'User already exists' });
    }

    let finalProfileImage = req.body.profileImage || ''; // From body if any link is sent

    // If a file was uploaded, send it to Cloudinary
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      finalProfileImage = result.secure_url;
    }

    const user = await User.create({
      name: fullName || name,
      email,
      password,
      phoneNumber: countryCode || phoneNumber || phone,
      country: countryName || 'Pakistan',
      profileImage: finalProfileImage,
      role: req.body.role || 'user',
      status: (req.body.role === 'provider') ? 'pending' : 'approved'
    });

    if (user) {
      res.status(201).json({
        status: "success",
        data: {
          token: generateToken(user._id),
          doc: {
            _id: user._id,
            name: user.name,
            email: user.email,
            country: user.country,
            profileImage: user.profileImage,
            role: user.role,
            status: user.status,
          }
        }
      });
    } else {
      res.status(400).json({ status: "fail", message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server ERROR', error: error.message });
  }
});

// @route   POST /api/auth/update-profile
// @desc    Update user profile including image
router.post('/update-profile', protect, upload.single('profileImage'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
      user.country = req.body.country || user.country;

      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        user.profileImage = result.secure_url;
      }

      const updatedUser = await user.save();
      res.status(200).json({
        status: "success",
        data: {
          token: generateToken(updatedUser._id),
          doc: {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            country: updatedUser.country,
            profileImage: updatedUser.profileImage,
            role: updatedUser.role,
            status: updatedUser.status,
          }
        }
      });
    } else {
      res.status(404).json({ status: "fail", message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server ERROR', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Auth user & get token (Login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        status: "success",
        data: {
          token: generateToken(user._id),
          doc: {
            _id: user._id,
            name: user.name,
            email: user.email,
            country: user.country,
            profileImage: user.profileImage,
            role: user.role,
            status: user.status,
          }
        }
      });
    } else {
      res.status(401).json({ status: "fail", message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server ERROR', error: error.message });
  }
});

module.exports = router;
