const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      required: true,
    },
    type: {
      type: String,
      enum: ['anomaly', 'degradation', 'threshold', 'scheduled', 'prediction'],
      required: true,
    },
    message: { type: String, required: true },
    details: { type: String, default: '' },
    sensorValues: {
      temperature: Number,
      vibration: Number,
      pressure: Number,
      rpm: Number,
      current: Number,
    },
    anomalyScore: { type: Number, default: null },
    healthScore: { type: Number, default: null },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

alertSchema.index({ acknowledged: 1 });
alertSchema.index({ equipmentId: 1, resolved: 1 });

module.exports = mongoose.model('Alert', alertSchema);
