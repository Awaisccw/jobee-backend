const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/awais_app_db';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
  });

// Basic Route
app.get('/', (req, res) => {
  res.send('Welcome to Awais App Backend API!');
});

// Public route for settings
app.get('/api/settings', async (req, res) => {
  try {
    const Settings = require('./models/Settings');
    const settings = await Settings.getSettings();
    res.json({ status: "success", data: settings });
  } catch (err) {
    res.status(500).json({ status: "fail", message: "Error fetching settings" });
  }
});

// Import and use routes here as you build them
// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const serviceRoutes = require('./routes/services');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);


