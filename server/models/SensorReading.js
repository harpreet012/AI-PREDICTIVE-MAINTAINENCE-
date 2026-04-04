const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
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
      index: true,
    },
    timestamp: { type: Date, default: Date.now },
    temperature: { type: Number, default: 0 }, // °C
    vibration: { type: Number, default: 0 },   // mm/s
    pressure: { type: Number, default: 0 },    // bar
    rpm: { type: Number, default: 0 },
    current: { type: Number, default: 0 },     // Amperes
    humidity: { type: Number, default: 50 },       // %
    noiseLevel: { type: Number, default: 60 },     // dB
    anomalyScore: { type: Number, default: 0, min: 0, max: 1 },
    isAnomaly: { type: Boolean, default: false },
    healthScore: { type: Number, default: 100, min: 0, max: 100 },
    failureProbability: { type: Number, default: 0, min: 0, max: 100 },
    predictedFailureIn: { type: Number, default: null }, // hours
    sensorFlags: {
      temperatureFlag: { type: Boolean, default: false },
      vibrationFlag: { type: Boolean, default: false },
      pressureFlag: { type: Boolean, default: false },
      rpmFlag: { type: Boolean, default: false },
      currentFlag: { type: Boolean, default: false },
    },
    rawData: { type: Map, of: mongoose.Schema.Types.Mixed }, // Store arbitrary data
  },
  { timestamps: false }
);

// TTL index to auto-expire old readings after 90 days
sensorReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
sensorReadingSchema.index({ equipmentId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
