const express = require('express');
const router  = express.Router();
const Equipment = require('../models/Equipment');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

router.use(protect);


// GET all equipment (Paginated)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type, status } = req.query;
    
    const query = { isActive: true, userId: req.user._id };
    if (type && type !== 'All') query.type = type;
    if (status && status !== 'All') query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const skipNum = (parseInt(page) - 1) * parseInt(limit);

    const equipment = await Equipment.find(query)
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(parseInt(limit));

    const total = await Equipment.countDocuments(query);

    res.json({ 
      success: true, 
      data: equipment, 
      total, 
      page: parseInt(page), 
      pages: Math.ceil(total / limit) 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single equipment
router.get('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!equipment) return res.status(404).json({ success: false, error: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create equipment
router.post('/', async (req, res) => {
  try {
    const equipment = new Equipment({ ...req.body, userId: req.user._id });
    await equipment.save();
    res.status(201).json({ success: true, data: equipment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update equipment
router.put('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!equipment) return res.status(404).json({ success: false, error: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE equipment (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await Equipment.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'Equipment deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET equipment stats overview
router.get('/:id/stats', async (req, res) => {
  try {
    const equipment = await Equipment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!equipment) return res.status(404).json({ success: false, error: 'Equipment not found' });

    const latestReading = await SensorReading.findOne({ equipmentId: req.params.id, userId: req.user._id }).sort({ timestamp: -1 });
    const alertCount    = await Alert.countDocuments({ equipmentId: req.params.id, userId: req.user._id, resolved: false });
    const readingCount  = await SensorReading.countDocuments({ equipmentId: req.params.id, userId: req.user._id });

    res.json({
      success: true,
      data: {
        equipment,
        latestReading,
        activeAlerts: alertCount,
        totalReadings: readingCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
