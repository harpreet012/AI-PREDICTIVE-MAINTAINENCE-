const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  revokeRefreshToken,
  revokeAllUserTokens,
  protect 
} = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(
      user._id, 
      req.ip, 
      req.get('user-agent')
    );

    res.json({ 
      success: true, 
      accessToken, 
      refreshToken, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token required' });
    }

    const tokenDoc = await verifyRefreshToken(refreshToken);
    const user = await User.findById(tokenDoc.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = await generateRefreshToken(
      user._id, 
      req.ip, 
      req.get('user-agent')
    );

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken);

    res.json({ 
      success: true, 
      accessToken, 
      refreshToken: newRefreshToken 
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(401).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Server error during logout' });
  }
});

// POST /api/auth/logout-all
router.post('/logout-all', protect, async (req, res) => {
  try {
    await revokeAllUserTokens(req.user._id);
    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (err) {
    console.error('Logout all error:', err);
    res.status(500).json({ success: false, error: 'Server error during logout' });
  }
});

// POST /api/auth/register  (admin-only or initial setup)
router.post('/register', authLimiter, async (req, res) => {
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
    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(
      user._id, 
      req.ip, 
      req.get('user-agent')
    );
    res.status(201).json({ 
      success: true, 
      accessToken, 
      refreshToken, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
