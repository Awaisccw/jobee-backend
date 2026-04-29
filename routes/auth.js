const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { protect } = require('../middleware/authMiddleware');

const sendEmail = require('../utils/email');

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
    // Check if user already exists (for registration flow)
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: "fail", message: 'User already exists with this email' });
    }

    const otpCode = generateOtp();
    
    // Save to DB
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });

    // Send Real Email
    try {
      await sendEmail({
        email: email,
        subject: 'Jobee - Your Verification Code',
        message: `Your verification code is ${otpCode}. It will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #001427; text-align: center;">Welcome to Jobee</h2>
            <p>Verification Code:</p>
            <div style="background: #f4f6f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #001427; border-radius: 5px;">
              ${otpCode}
            </div>
            <p style="margin-top: 20px;">Please enter this code in the app to verify your identity.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (mailError) {
      console.error("Email sending failed:", mailError);
    }

    console.log(`\n============== OTP GENERATED ==============\nEmail: ${email}\nOTP: ${otpCode}\n===========================================\n`);

    res.status(200).json({ status: "success", message: 'OTP sent successfully to your email.' });
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify the generated OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    console.log("\n--- DEBUG: OTP VERIFICATION ---");
    console.log(`Email provided: ${email}`);
    console.log(`OTP provided: ${otp} (Type: ${typeof otp})`);

    // Force OTP to string for comparison and find record
    const otpString = otp.toString();
    const record = await Otp.findOne({ email, otp: otpString });
    
    if (record) {
      console.log("MATCH FOUND: Verification Success!");
      res.status(200).json({ status: "success", message: 'OTP verified successfully' });
    } else {
      // Find by email only to check if the OTP simply didn't match
      const emailOnly = await Otp.findOne({ email });
      if (emailOnly) {
        console.log("FAIL: Email exists but OTP is wrong.");
        console.log(`Expected: ${emailOnly.otp}, Received: ${otpString}`);
      } else {
        console.log("FAIL: No OTP record found for this email (maybe expired?).");
      }
      res.status(400).json({ status: "fail", message: 'Invalid or expired OTP' });
    }
    console.log("-------------------------------\n");
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ status: "fail", message: 'Server Error', error: error.message });
  }
});


// @route   POST /api/auth/register
// @desc    Register a new user after OTP
router.post('/register', upload.single('profileImage'), async (req, res) => {
  const { fullName, email, password, countryCode, countryName, name, phone, phoneNumber, address, city, state } = req.body;

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
      phoneNumber: `${countryCode || '+92'} ${phoneNumber || phone || ''}`.trim(),
      country: countryName || 'Pakistan',
      addresses: (address || city || state) ? [{
        addressType: 'Home',
        address: address,
        city: city,
        state: state
      }] : [],
      profileImage: finalProfileImage,
      role: req.body.role || 'user',
      status: (req.body.role === 'provider') ? 'pending' : 'approved'
    });

    if (user) {
      const populatedUser = await User.findById(user._id).populate({
        path: 'savedServices',
        populate: { path: 'category' }
      });

      res.status(201).json({
        status: "success",
        data: {
          token: generateToken(user._id),
          doc: {
            _id: user._id,
            name: user.name,
            email: user.email,
            country: user.country,
            addresses: user.addresses,
            profileImage: user.profileImage,
            phoneNumber: user.phoneNumber,
            role: user.role,
            status: user.status,
            savedServices: populatedUser.savedServices
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
      const { addressType, address, city, state } = req.body;
      if (addressType) {
        const addrIndex = user.addresses.findIndex(a => a.addressType === addressType);
        if (addrIndex > -1) {
          user.addresses[addrIndex].address = address || user.addresses[addrIndex].address;
          user.addresses[addrIndex].city = city || user.addresses[addrIndex].city;
          user.addresses[addrIndex].state = state || user.addresses[addrIndex].state;
        } else {
          user.addresses.push({ addressType, address, city, state });
        }
      }

      if (req.body.easypaisaAccountName || req.body.easypaisaAccountNumber || req.body.easypaisaCnic) {
        user.easypaisaAccount = {
          accountName: req.body.easypaisaAccountName || user.easypaisaAccount?.accountName,
          accountNumber: req.body.easypaisaAccountNumber || user.easypaisaAccount?.accountNumber,
          cnic: req.body.easypaisaCnic || user.easypaisaAccount?.cnic,
          isVerified: true
        };
      }

      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        user.profileImage = result.secure_url;
      }

      const updatedUser = await user.save();
      const populatedUser = await User.findById(updatedUser._id).populate({
        path: 'savedServices',
        populate: { path: 'category' }
      });

      res.status(200).json({
        status: "success",
        data: {
          token: generateToken(updatedUser._id),
          doc: {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            country: updatedUser.country,
            addresses: updatedUser.addresses,
            profileImage: updatedUser.profileImage,
            phoneNumber: updatedUser.phoneNumber,
            role: updatedUser.role,
            status: updatedUser.status,
            savedServices: populatedUser.savedServices,
            easypaisaAccount: updatedUser.easypaisaAccount
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
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // Role validation if requested
      if (role && user.role !== role) {
        return res.status(401).json({ 
          status: "fail", 
          message: `Access denied. This account is registered as a ${user.role}, not a ${role}.` 
        });
      }
      const populatedUser = await User.findById(user._id).populate({
        path: 'savedServices',
        populate: { path: 'category' }
      });

      res.status(200).json({
        status: "success",
        data: {
          token: generateToken(user._id),
          doc: {
            _id: user._id,
            name: user.name,
            email: user.email,
            country: user.country,
            addresses: user.addresses,
            profileImage: user.profileImage,
            phoneNumber: user.phoneNumber,
            role: user.role,
            status: user.status,
            savedServices: populatedUser.savedServices,
            easypaisaAccount: user.easypaisaAccount
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

// @route   POST /api/auth/forgot-password
// @desc    Check if user exists and send OTP for password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ status: "fail", message: 'Please provide an email address' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "fail", message: 'No account found with this email' });
    }

    // Reuse OTP generation logic
    const otpCode = generateOtp();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });

    // Send Email
    try {
      await sendEmail({
        email: email,
        subject: 'Jobee - Password Reset Code',
        message: `Your password reset code is ${otpCode}.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #001427; text-align: center;">Password Reset</h2>
            <p>You requested a password reset. Use the code below to proceed:</p>
            <div style="background: #f4f6f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #001427; border-radius: 5px;">
              ${otpCode}
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      console.error("Email sending failed:", mailError);
    }

    console.log(`\n============== FORGOT PASSWORD OTP ==============\nEmail: ${email}\nOTP: ${otpCode}\n================================================\n`);

    res.status(200).json({ status: "success", message: 'Reset code sent to your email.' });
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Verify OTP and reset password
router.post('/reset-password', async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ status: "fail", message: 'Please provide email, otp and new password' });
  }

  try {
    const record = await Otp.findOne({ email, otp: otp.toString() });
    if (!record) {
      return res.status(400).json({ status: "fail", message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "fail", message: 'User not found' });
    }

    user.password = password;
    await user.save();

    // Delete OTP after use
    await Otp.deleteMany({ email });

    res.status(200).json({ status: "success", message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/auth/update-password
// @desc    Update password for logged in user
router.post('/update-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: "fail", message: 'User not found' });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ status: "fail", message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ status: "success", message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ status: "fail", message: 'Server Error', error: error.message });
  }
});

module.exports = router;
