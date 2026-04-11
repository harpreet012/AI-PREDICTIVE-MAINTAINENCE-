const express = require('express');
const router  = express.Router();
const Equipment     = require('../models/Equipment');
const SensorReading = require('../models/SensorReading');
const Alert         = require('../models/Alert');
const MaintenanceLog = require('../models/MaintenanceLog');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET fleet-wide analytics overview
router.get('/overview', async (req, res) => {
  try {
    const [equipStats] = await Equipment.aggregate([
      { $match: { isActive: true, userId: req.user._id } },
      {
        $facet: {
          totalStats: [{ $count: "count" }],
          healthStats: [{ $group: { _id: null, avg: { $avg: { $ifNull: ["$healthScore", 100] } } } }],
          atRiskStats: [{ $match: { healthScore: { $lt: 60 } } }, { $count: "count" }],
          criticalStats: [{ $match: { status: "critical" } }, { $count: "count" }],
          statusCountsArr: [{ $group: { _id: "$status", count: { $sum: 1 } } }]
        }
      }
    ]);

    const total = equipStats.totalStats[0]?.count || 0;
    const avgHealth = Math.round(equipStats.healthStats[0]?.avg || 0);
    const atRisk = equipStats.atRiskStats[0]?.count || 0;
    const critical = equipStats.criticalStats[0]?.count || 0;
    
    // Convert array structure from $group into simple object map
    const statusCounts = equipStats.statusCountsArr.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const recentAlerts = await Alert.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      userId: req.user._id,
    });

    const maintenanceDue = await MaintenanceLog.countDocuments({
      status: 'scheduled',
      scheduledDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      userId: req.user._id,
    });

    res.json({
      success: true,
      data: {
        totalEquipment:  total,
        avgHealthScore:  avgHealth,
        atRisk,
        critical,
        statusCounts,
        recentAlerts,
        maintenanceDue,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET health score trend for all equipment (last N hours)
router.get('/health-trend', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const trend = await SensorReading.aggregate([
      { $match: { timestamp: { $gte: since }, userId: req.user._id } },
      {
        $group: {
          _id: {
            equipmentId: '$equipmentId',
            bucket: {
              $dateTrunc: { date: '$timestamp', unit: 'minute', binSize: 15 },
            },
          },
          avgHealth: { $avg: '$healthScore' },
          avgAnomaly: { $avg: '$anomalyScore' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.bucket': 1 } },
    ]);

    res.json({ success: true, data: trend });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET failure risk matrix (Limit to Top 100 most at-risk to prevent UI lag)
router.get('/risk-matrix', async (req, res) => {
  try {
    const equipment = await Equipment.find({ isActive: true, userId: req.user._id })
      .select('name type location status healthScore failureProbability predictedFailureIn operatingHours')
      .sort({ failureProbability: -1 }) 
      .limit(100);

    const riskMatrix = equipment.map(e => ({
      id:                 e._id,
      name:               e.name,
      type:               e.type,
      location:           e.location,
      status:             e.status,
      healthScore:        e.healthScore,
      failureProbability: e.failureProbability,
      predictedFailureIn: e.predictedFailureIn,
      operatingHours:     e.operatingHours,
      riskLevel: e.failureProbability > 70 ? 'high' :
                 e.failureProbability > 40 ? 'medium' : 'low',
    }));

    res.json({ success: true, data: riskMatrix });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET per-equipment anomaly summary
router.get('/anomalies', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const anomalies = await SensorReading.aggregate([
      { $match: { timestamp: { $gte: since }, isAnomaly: true, userId: req.user._id } },
      {
        $group: {
          _id: '$equipmentId',
          anomalyCount: { $sum: 1 },
          avgAnomalyScore: { $avg: '$anomalyScore' },
          maxAnomalyScore: { $max: '$anomalyScore' },
        },
      },
      {
        $lookup: {
          from: 'equipment',
          localField: '_id',
          foreignField: '_id',
          as: 'equipment',
        },
      },
      { $unwind: '$equipment' },
      { $sort: { anomalyCount: -1 } },
    ]);

    res.json({ success: true, data: anomalies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET sensor correlation data for heatmap
router.get('/correlation/:equipmentId', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await SensorReading.find({
      equipmentId: req.params.equipmentId,
      timestamp: { $gte: since },
      userId: req.user._id,
    })
      .select('temperature vibration pressure rpm current healthScore -_id')
      .limit(500);

    res.json({ success: true, data: readings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET per-day calendar data (heatmap) — last N days
router.get('/calendar', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 15, 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Aggregate sensor readings per day
    const sensorByDay = await SensorReading.aggregate([
      { $match: { timestamp: { $gte: since }, userId: req.user._id } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          avgHealth:      { $avg: '$healthScore' },
          maxAnomalyScore:{ $max: '$anomalyScore' },
          anomalyCount:   { $sum: { $cond: ['$isAnomaly', 1, 0] } },
          totalReadings:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate alert counts per day
    const alertByDay = await Alert.aggregate([
      { $match: { createdAt: { $gte: since }, userId: req.user._id } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          alertCount:    { $sum: 1 },
          criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        },
      },
    ]);

    // Build a lookup map for alerts
    const alertMap = alertByDay.reduce((acc, a) => {
      acc[a._id] = { alertCount: a.alertCount, criticalCount: a.criticalCount };
      return acc;
    }, {});

    // Build the full day range (fill gaps with null data)
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const sensor  = sensorByDay.find(s => s._id === dateStr);
      const alert   = alertMap[dateStr] || { alertCount: 0, criticalCount: 0 };

      const avgHealth = sensor ? Math.round(sensor.avgHealth || 0) : null;
      const status = avgHealth === null ? 'no-data'
        : avgHealth >= 80 ? 'healthy'
        : avgHealth >= 65 ? 'good'
        : avgHealth >= 50 ? 'warning'
        : 'critical';

      result.push({
        date:           dateStr,
        dayLabel:       d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        avgHealth,
        anomalyCount:   sensor?.anomalyCount   || 0,
        maxAnomalyScore:sensor ? Math.round((sensor.maxAnomalyScore || 0) * 100) / 100 : 0,
        totalReadings:  sensor?.totalReadings   || 0,
        alertCount:     alert.alertCount,
        criticalCount:  alert.criticalCount,
        status,
        isToday: dateStr === new Date().toISOString().split('T')[0],
      });
    }

    res.json({ success: true, data: result, days });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
