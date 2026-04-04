const express = require('express');
const router  = express.Router();
const Alert   = require('../models/Alert');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET all alerts (with filters)
router.get('/', async (req, res) => {
  try {
    const { severity, type, acknowledged, equipmentId, limit = 50, skip = 0 } = req.query;
    const filter = { userId: req.user._id };
    if (severity)    filter.severity    = severity;
    if (type)        filter.type        = type;
    if (equipmentId) filter.equipmentId = equipmentId;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

    const alerts = await Alert.find(filter)
      .populate('equipmentId', 'name type location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total    = await Alert.countDocuments(filter);
    const unread   = await Alert.countDocuments({ acknowledged: false, userId: req.user._id });
    const critical = await Alert.countDocuments({ severity: 'critical', acknowledged: false, userId: req.user._id });

    res.json({ success: true, data: alerts, total, unread, critical });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET unread alert count
router.get('/count/unread', async (req, res) => {
  try {
    const count    = await Alert.countDocuments({ acknowledged: false, userId: req.user._id });
    const critical = await Alert.countDocuments({ severity: 'critical', acknowledged: false, userId: req.user._id });
    res.json({ success: true, count, critical });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH acknowledge alert
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { acknowledged: true, acknowledgedBy: req.body.acknowledgedBy || 'Operator', acknowledgedAt: new Date() },
      { new: true }
    ).populate('equipmentId', 'name type');
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH acknowledge ALL alerts
router.patch('/acknowledge/all', async (req, res) => {
  try {
    await Alert.updateMany(
      { acknowledged: false, userId: req.user._id },
      { acknowledged: true, acknowledgedBy: 'Operator', acknowledgedAt: new Date() }
    );
    res.json({ success: true, message: 'All alerts acknowledged' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH resolve alert
router.patch('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { resolved: true, resolvedAt: new Date(), acknowledged: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE alert
router.delete('/:id', async (req, res) => {
  try {
    await Alert.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
