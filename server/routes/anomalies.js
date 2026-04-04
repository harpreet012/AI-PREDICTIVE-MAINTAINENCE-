const express = require('express');
const router = express.Router();

// Mock data generation for Anomalies
router.get('/', (req, res) => {
  try {
    const anomalies = [
      {
        id: 1,
        machine: "CNC Machine A",
        issue: "High Temperature",
        severity: "Critical",
        score: parseInt(process.env.TEST_SCORE || Math.floor(Math.random() * (100 - 85 + 1) + 85)),
        confidence: 94,
        timestamp: new Date().toISOString(),
        prediction: "Spindle failure within 2 hours",
        rootCause: "Coolant system blockage",
        recommendation: "Immediate shutdown and inspect coolant lines."
      },
      {
        id: 2,
        machine: "Robotic Arm B",
        issue: "Vibration Spike",
        severity: "Warning",
        score: parseInt(process.env.TEST_SCORE || Math.floor(Math.random() * (84 - 60 + 1) + 60)),
        confidence: 82,
        timestamp: new Date(Date.now() - 5000).toISOString(),
        prediction: "Joint wear increasing",
        rootCause: "Lack of lubrication",
        recommendation: "Schedule maintenance at next shift change."
      },
      {
        id: 3,
        machine: "Conveyor Belt C",
        issue: "Speed Fluctuation",
        severity: "Normal",
        score: parseInt(process.env.TEST_SCORE || Math.floor(Math.random() * (40 - 10 + 1) + 10)),
        confidence: 90,
        timestamp: new Date(Date.now() - 15000).toISOString(),
        prediction: "No immediate failure likely",
        rootCause: "Minor load imbalance",
        recommendation: "Monitor load distribution."
      }
    ];
    res.json({ success: true, count: anomalies.length, data: anomalies });
  } catch (error) {
    console.error('Anomalies Endpoint Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
  }
});

module.exports = router;
