const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const JWT_SECRET = process.env.JWT_SECRET || 'pm_secret_key_2024_fallback_for_development_only';
const JWT_ACCESS_EXPIRY = '15m';
const JWT_REFRESH_EXPIRY = '7d';

// Log warning if using fallback secret
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: Using fallback JWT_SECRET. Set JWT_SECRET environment variable for production.');
}

// Verify JWT token middleware
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Role guard
exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
  next();
};

// Generate access token
exports.generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });

// Generate refresh token
exports.generateRefreshToken = async (userId, ipAddress, userAgent) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await RefreshToken.create({
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  });
  
  return token;
};

// Verify refresh token
exports.verifyRefreshToken = async (token) => {
  const refreshToken = await RefreshToken.findOne({ token, revoked: false });
  
  if (!refreshToken) {
    throw new Error('Invalid refresh token');
  }
  
  if (refreshToken.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ _id: refreshToken._id });
    throw new Error('Refresh token expired');
  }
  
  return refreshToken;
};

// Revoke refresh token
exports.revokeRefreshToken = async (token) => {
  await RefreshToken.updateOne({ token }, { revoked: true });
};

// Revoke all user refresh tokens
exports.revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany({ userId }, { revoked: true });
};
