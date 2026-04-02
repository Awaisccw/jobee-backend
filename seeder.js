const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');
const Service = require('./models/Service');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/awais_app_db';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB. Starting database seed...');

    // Clear existing data to avoid duplicates
    await Category.deleteMany({});
    await Service.deleteMany({});

    // 1. Create Categories
    const categories = await Category.insertMany([
      { name: 'Cleaning', image: 'assets/images/cleaning.png' },
      { name: 'Plumbing', image: 'assets/images/plumber.png' },
      { name: 'Electrical', image: 'assets/images/electrician.png' },
      { name: 'Painting', image: 'assets/images/painter.png' },
      { name: 'Carpentry', image: 'assets/images/carpentry.png' }
    ]);

    const cleaningId = categories[0]._id;
    const plumbingId = categories[1]._id;

    // 2. Create Services (Empty - only real services from app)
    // await Service.insertMany([...]);

    console.log('Categories successfully imported!');
  } catch (error) {
    console.error('Error importing data:', error);
  }
};

module.exports = seedData;
