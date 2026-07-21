const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dataset',
      required: false,
      index: true,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['Compressor', 'Pump', 'Motor', 'Turbine', 'Generator', 'Conveyor', 'CNC Machine', 'Boiler'],
      required: true,
    },
    location: { type: String, required: true },
    manufacturer: { type: String, default: 'Unknown' },
    model: { type: String, default: 'N/A' },
    serialNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['healthy', 'warning', 'critical', 'offline', 'maintenance'],
      default: 'healthy',
    },
    healthScore: { type: Number, default: 100, min: 0, max: 100 },
    failureProbability: { type: Number, default: 0, min: 0, max: 100 },
    predictedFailureIn: { type: Number, default: null }, // hours
    installDate: { type: Date, default: Date.now },
    lastMaintenance: { type: Date, default: null },
    nextScheduledMaintenance: { type: Date, default: null },
    operatingHours: { type: Number, default: 0 },
    specs: {
      maxTemperature: { type: Number, default: 90 },
      maxVibration: { type: Number, default: 10 },
      maxPressure: { type: Number, default: 150 },
      ratedRPM: { type: Number, default: 3000 },
      ratedCurrent: { type: Number, default: 50 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

equipmentSchema.index({ isActive: 1, status: 1 });
equipmentSchema.index({ healthScore: 1 });
equipmentSchema.index({ userId: 1, isActive: 1 });
equipmentSchema.index({ type: 1, status: 1 });
equipmentSchema.index({ userId: 1, serialNumber: 1 }, { unique: true });
equipmentSchema.index({ datasetId: 1, isActive: 1 });
equipmentSchema.index({ userId: 1, datasetId: 1 });

module.exports = mongoose.model('Equipment', equipmentSchema);
