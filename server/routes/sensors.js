const express = require('express');
const router  = express.Router();
const SensorReading = require('../models/SensorReading');
const mlEngine = require('../services/mlEngine');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET sensor readings for a specific equipment (with pagination)
router.get('/:equipmentId', async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const limit  = parseInt(req.query.limit)  || 100;
    const skip   = parseInt(req.query.skip)   || 0;
    const hours  = parseInt(req.query.hours)  || 24;

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await SensorReading.find({
      equipmentId,
      userId: req.user._id,
      timestamp: { $gte: since },
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);

    const total = await SensorReading.countDocuments({ equipmentId, userId: req.user._id, timestamp: { $gte: since } });

    res.json({ success: true, data: readings.reverse(), total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET latest reading for each equipment
router.get('/latest/all', async (req, res) => {
  try {
    const latest = await SensorReading.aggregate([
      { $match: { userId: req.user._id } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$equipmentId', reading: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$reading' } },
    ]);
    res.json({ success: true, data: latest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET historical statistics (mean/std for anomaly detection)
router.get('/:equipmentId/stats', async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const hours = parseInt(req.query.hours) || 168; // default 7 days
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await SensorReading.aggregate([
      { $match: { equipmentId: require('mongoose').Types.ObjectId.createFromHexString(equipmentId), userId: req.user._id, timestamp: { $gte: since } } },
      {
        $group: {
          _id: null,
          tempMean:  { $avg: '$temperature' },
          tempStd:   { $stdDevPop: '$temperature' },
          vibMean:   { $avg: '$vibration' },
          vibStd:    { $stdDevPop: '$vibration' },
          presMean:  { $avg: '$pressure' },
          presStd:   { $stdDevPop: '$pressure' },
          rpmMean:   { $avg: '$rpm' },
          rpmStd:    { $stdDevPop: '$rpm' },
          curMean:   { $avg: '$current' },
          curStd:    { $stdDevPop: '$current' },
          count:     { $sum: 1 },
        },
      },
    ]);

    if (!stats.length) {
      return res.json({ success: true, data: null, message: 'No historical data available' });
    }

    const s = stats[0];
    res.json({
      success: true,
      data: {
        temperature: { mean: s.tempMean, std: s.tempStd },
        vibration:   { mean: s.vibMean,  std: s.vibStd  },
        pressure:    { mean: s.presMean, std: s.presStd  },
        rpm:         { mean: s.rpmMean,  std: s.rpmStd   },
        current:     { mean: s.curMean,  std: s.curStd   },
        sampleCount: s.count,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST ingest a new manual sensor reading
router.post('/', async (req, res) => {
  try {
    const { equipmentId, equipmentType, ...sensorData } = req.body;
    const analysis = mlEngine.analyzeReading(sensorData, equipmentType);

    const reading = new SensorReading({
      equipmentId,
      userId: req.user._id,
      ...sensorData,
      anomalyScore:       analysis.anomalyScore,
      isAnomaly:          analysis.isAnomaly,
      healthScore:        analysis.healthScore,
      failureProbability: analysis.failureProbability,
      predictedFailureIn: analysis.predictedFailureIn,
      sensorFlags:        analysis.sensorFlags,
    });

    await reading.save();
    res.status(201).json({ success: true, data: reading, analysis });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
