const mongoose = require('mongoose');
require('dotenv').config();
const Service = require('./models/Service');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/awais_app_db';

const cleanDummy = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB. Cleaning dummy services...');

    const dummyTitles = [
      'Exterior House Washing',
      'Deep House Cleaning',
      'Pipe Leakage Fix'
    ];

    const result = await Service.deleteMany({ title: { $in: dummyTitles } });
    console.log(`Deleted ${result.deletedCount} dummy services.`);

    process.exit(0);
  } catch (error) {
    console.error('Error cleaning dummy services:', error);
    process.exit(1);
  }
};

cleanDummy();
