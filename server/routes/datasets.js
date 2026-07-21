const express = require('express');
const router = express.Router();
const Dataset = require('../models/Dataset');
const Equipment = require('../models/Equipment');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const MaintenanceLog = require('../models/MaintenanceLog');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET all datasets (paginated)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    const query = { userId: req.user._id, isActive: true };
    if (status && status !== 'All') query.status = status;
    if (search) {
      query.$or = [
        { factoryName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skipNum = (parseInt(page) - 1) * parseInt(limit);

    const datasets = await Dataset.find(query)
      .sort({ uploadDate: -1 })
      .skip(skipNum)
      .limit(parseInt(limit));

    const total = await Dataset.countDocuments(query);

    res.json({ 
      success: true, 
      data: datasets, 
      total, 
      page: parseInt(page), 
      pages: Math.ceil(total / limit) 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single dataset
router.get('/:id', async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) return res.status(404).json({ success: false, error: 'Dataset not found' });
    res.json({ success: true, data: dataset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create dataset
router.post('/', async (req, res) => {
  try {
    const dataset = new Dataset({ ...req.body, userId: req.user._id });
    await dataset.save();
    res.status(201).json({ success: true, data: dataset });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update dataset
router.put('/:id', async (req, res) => {
  try {
    const dataset = await Dataset.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!dataset) return res.status(404).json({ success: false, error: 'Dataset not found' });
    res.json({ success: true, data: dataset });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE dataset (cascade delete all related records)
router.delete('/:id', async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) return res.status(404).json({ success: false, error: 'Dataset not found' });

    // Start a session for transaction
    const session = await Dataset.startSession();
    session.startTransaction();

    try {
      // Delete all equipment in this dataset
      await Equipment.deleteMany({ datasetId: req.params.id }, { session });
      
      // Delete all sensor readings in this dataset
      await SensorReading.deleteMany({ datasetId: req.params.id }, { session });
      
      // Delete all alerts in this dataset
      await Alert.deleteMany({ datasetId: req.params.id }, { session });
      
      // Delete all maintenance logs in this dataset
      await MaintenanceLog.deleteMany({ datasetId: req.params.id }, { session });
      
      // Delete the dataset itself
      await Dataset.deleteOne({ _id: req.params.id }, { session });
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({ success: true, message: 'Dataset and all related records deleted successfully' });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET dataset statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) return res.status(404).json({ success: false, error: 'Dataset not found' });

    const [machineCount, sensorCount, alertCount, maintenanceCount] = await Promise.all([
      Equipment.countDocuments({ datasetId: req.params.id, isActive: true }),
      SensorReading.countDocuments({ datasetId: req.params.id }),
      Alert.countDocuments({ datasetId: req.params.id }),
      MaintenanceLog.countDocuments({ datasetId: req.params.id })
    ]);

    // Calculate average health score
    const equipment = await Equipment.find({ datasetId: req.params.id, isActive: true }).select('healthScore');
    const avgHealth = equipment.length > 0 
      ? Math.round(equipment.reduce((sum, eq) => sum + (eq.healthScore || 100), 0) / equipment.length)
      : 100;

    res.json({
      success: true,
      data: {
        dataset,
        machineCount,
        sensorCount,
        alertCount,
        maintenanceCount,
        avgHealth
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update dataset status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['processing', 'active', 'archived', 'error'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const dataset = await Dataset.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status, lastUpdated: new Date() },
      { new: true }
    );
    
    if (!dataset) return res.status(404).json({ success: false, error: 'Dataset not found' });
    res.json({ success: true, data: dataset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
