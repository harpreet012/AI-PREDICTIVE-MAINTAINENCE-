const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Equipment = require('../models/Equipment');
const SensorReading = require('../models/SensorReading');
const { protect } = require('../middleware/auth');

router.use(protect);

// Get real anomalies from database
router.get('/', async (req, res) => {
  try {
    const { limit = 50, severity } = req.query;
    
    // Build query
    const query = { acknowledged: false, userId: req.user._id };
    if (severity && severity !== 'All') {
      query.severity = severity.toLowerCase();
    }
    
    // Fetch alerts from database
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('equipmentId', 'name type location')
      .populate('userId', 'name email');
    
    // Transform alerts to anomaly format
    const anomalies = alerts.map(alert => ({
      id: alert._id.toString(),
      machine: alert.equipmentId?.name || 'Unknown Equipment',
      issue: alert.message,
      severity: alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1),
      score: alert.anomalyScore ? Math.round(alert.anomalyScore * 100) : (100 - (alert.healthScore || 50)),
      confidence: alert.healthScore ? (100 - alert.healthScore + 50) : 75,
      timestamp: alert.createdAt.toISOString(),
      prediction: alert.details || 'Predictive analysis based on sensor data',
      rootCause: alert.type === 'anomaly' ? 'Sensor pattern deviation detected' : 'Threshold exceeded',
      recommendation: alert.message,
      equipmentId: alert.equipmentId?._id,
      sensorValues: alert.sensorValues
    }));
    
    res.json({ success: true, count: anomalies.length, data: anomalies });
  } catch (error) {
    console.error('Anomalies Endpoint Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
  }
});

module.exports = router;
