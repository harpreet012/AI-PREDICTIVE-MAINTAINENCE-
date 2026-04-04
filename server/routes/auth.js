const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'No account found with that email' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, error: 'Account is deactivated. Contact admin.' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    res.json({ success: true, token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// POST /api/auth/register  (admin-only or initial setup)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || 'viewer',
    });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/auth/logout  (client-side token removal, server acknowledges)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
