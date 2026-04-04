require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  try {
    await connectDB();
    console.log('Connected to DB');
    
    // Check if the hashing is broken
    let admin = await User.findOne({ email: 'admin@factory.com' });
    if (!admin) {
      admin = await User.create({ name: 'Admin', email: 'admin@factory.com', password: 'Admin@1234', role: 'admin' });
      console.log('✅ Created admin');
    } else {
      admin.password = 'Admin@1234';
      await admin.save();
      console.log('✅ Reset admin password (re-hashed properly)');
    }

    let operator = await User.findOne({ email: 'operator@factory.com' });
    if (!operator) {
      operator = await User.create({ name: 'Operator', email: 'operator@factory.com', password: 'Op@1234', role: 'operator' });
      console.log('✅ Created operator');
    } else {
      operator.password = 'Op@1234';
      await operator.save();
      console.log('✅ Reset operator password');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
