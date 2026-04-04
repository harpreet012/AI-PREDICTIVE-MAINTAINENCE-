const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// All routes require auth
router.use(protect);

// GET /api/users — list all (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users — create user (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, error: 'Email already exists' });
    const user = await User.create({ name, email, password, role: role || 'viewer' });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/users/:id — update role/status (admin only)
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { role, isActive, name } = req.body;
    const update = {};
    if (role     !== undefined) update.role     = role;
    if (isActive !== undefined) update.isActive = isActive;
    if (name     !== undefined) update.name     = name;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
