const express = require('express');
const router  = express.Router();
const MaintenanceLog = require('../models/MaintenanceLog');
const Equipment      = require('../models/Equipment');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET all maintenance logs (with filters)
router.get('/', async (req, res) => {
  try {
    const { equipmentId, status, type, limit = 50, skip = 0 } = req.query;
    const filter = { userId: req.user._id };
    if (equipmentId) filter.equipmentId = equipmentId;
    if (status)      filter.status      = status;
    if (type)        filter.type        = type;

    const logs = await MaintenanceLog.find(filter)
      .populate('equipmentId', 'name type location')
      .sort({ scheduledDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await MaintenanceLog.countDocuments(filter);
    res.json({ success: true, data: logs, total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET upcoming maintenance
router.get('/upcoming', async (req, res) => {
  try {
    const logs = await MaintenanceLog.find({
      status: 'scheduled',
      scheduledDate: { $gte: new Date() },
      userId: req.user._id,
    })
      .populate('equipmentId', 'name type location healthScore')
      .sort({ scheduledDate: 1 })
      .limit(20);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET maintenance cost summary
router.get('/stats/cost', async (req, res) => {
  try {
    const stats = await MaintenanceLog.aggregate([
      { $match: { status: 'completed', userId: req.user._id } },
      {
        $group: {
          _id: { $month: '$completedDate' },
          totalCost:  { $sum: '$cost' },
          totalJobs:  { $sum: 1 },
          avgDuration: { $avg: '$duration' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single log
router.get('/:id', async (req, res) => {
  try {
    const log = await MaintenanceLog.findOne({ _id: req.params.id, userId: req.user._id }).populate('equipmentId', 'name type location');
    if (!log) return res.status(404).json({ success: false, error: 'Log not found' });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create maintenance log
router.post('/', async (req, res) => {
  try {
    const log = new MaintenanceLog({ ...req.body, userId: req.user._id });
    await log.save();

    // Update equipment nextScheduledMaintenance
    if (req.body.status === 'scheduled') {
      await Equipment.findOneAndUpdate({ _id: req.body.equipmentId, userId: req.user._id }, {
        nextScheduledMaintenance: req.body.scheduledDate,
      });
    }

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update maintenance log
router.put('/:id', async (req, res) => {
  try {
    const log = await MaintenanceLog.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!log) return res.status(404).json({ success: false, error: 'Log not found' });

    // If completed, update equipment lastMaintenance
    if (req.body.status === 'completed') {
      await Equipment.findOneAndUpdate(
        { _id: log.equipmentId, userId: req.user._id },
        {
        lastMaintenance: req.body.completedDate || new Date(),
        status: 'healthy',
        healthScore: req.body.healthScoreAfter || 90,
      });
    }

    res.json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE maintenance log
router.delete('/:id', async (req, res) => {
  try {
    await MaintenanceLog.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Log deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
