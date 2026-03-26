/**
 * Seed script to create the first Platform Admin
 * Run with: node scripts/seedPlatformAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createFirstPlatformAdmin = async () => {
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/insurematch';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Check if Platform Admin already exists
    const existingAdmin = await User.findOne({ role: 'platform_admin' });
    if (existingAdmin) {
      console.log('⚠ Platform Admin already exists:');
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Name: ${existingAdmin.name}`);
      console.log('\nTo create a new Platform Admin, use the API endpoint after logging in.');
      process.exit(0);
    }

    // Default credentials
    const adminData = {
      email: process.env.ADMIN_EMAIL || 'admin@insurematch.com',
      password: process.env.ADMIN_PASSWORD || 'AdminPass123',
      name: process.env.ADMIN_NAME || 'Platform Admin',
      role: 'platform_admin',
      isEmailVerified: true,
      dateOfBirth: new Date('1990-01-01') // Placeholder date for admin accounts
    };

    // Create Platform Admin
    const admin = new User(adminData);
    await admin.save();

    console.log('✓ Platform Admin created successfully!');
    console.log('\nAdmin Credentials:');
    console.log(`  Email: ${adminData.email}`);
    console.log(`  Password: ${adminData.password}`);
    console.log('\n⚠ IMPORTANT: Change the default password immediately after first login!');
    console.log('\nYou can now:');
    console.log('1. Login with these credentials to get a JWT token');
    console.log('2. Use the token to create additional Platform Admins');
    console.log('3. Invite Insurer Admins and Agents');

  } catch (error) {
    console.error('✗ Error creating Platform Admin:', error.message);

    if (error.code === 11000) {
      console.log('\n⚠ A user with this email already exists.');
      console.log('If you need to create a Platform Admin with a different email,');
      console.log('set the ADMIN_EMAIL environment variable and try again.');
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  }
};

// Run the seed function
createFirstPlatformAdmin();
