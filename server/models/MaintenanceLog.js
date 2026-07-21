const mongoose = require('mongoose');

const maintenanceLogSchema = new mongoose.Schema(
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
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
    },
    type: {
      type: String,
      enum: ['preventive', 'corrective', 'predictive', 'inspection', 'emergency'],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    technician: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    completedDate: { type: Date, default: null },
    duration: { type: Number, default: null }, // minutes
    cost: { type: Number, default: 0 }, // USD
    partsReplaced: [{ type: String }],
    description: { type: String, default: '' },
    notes: { type: String, default: '' },
    healthScoreBefore: { type: Number, default: null },
    healthScoreAfter: { type: Number, default: null },
    triggerAlert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      default: null,
    },
  },
  { timestamps: true }
);

maintenanceLogSchema.index({ userId: 1, equipmentId: 1 });
maintenanceLogSchema.index({ userId: 1, datasetId: 1 });
maintenanceLogSchema.index({ datasetId: 1, scheduledDate: -1 });
maintenanceLogSchema.index({ equipmentId: 1, status: 1 });

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
