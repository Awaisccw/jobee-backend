const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/awais_app_db';

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@jobee.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (adminExists) {
      console.log('Admin user already exists. Updating role to admin...');
      adminExists.role = 'admin';
      adminExists.status = 'approved';
      await adminExists.save();
      console.log('Admin role updated successfully!');
    } else {
      console.log('Creating new admin user...');
      await User.create({
        name: 'Jobee Admin',
        email: adminEmail,
        password: 'admin123',
        role: 'admin',
        status: 'approved'
      });
      console.log('Admin user created successfully! (admin@jobee.com / admin123)');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
