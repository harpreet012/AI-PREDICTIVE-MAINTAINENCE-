const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    factoryName: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    originalFileName: {
      type: String,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    machineCount: {
      type: Number,
      default: 0,
    },
    sensorCount: {
      type: Number,
      default: 0,
    },
    alertCount: {
      type: Number,
      default: 0,
    },
    maintenanceCount: {
      type: Number,
      default: 0,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['processing', 'active', 'archived', 'error'],
      default: 'processing',
    },
    healthScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance
datasetSchema.index({ userId: 1, isActive: 1 });
datasetSchema.index({ userId: 1, status: 1 });
datasetSchema.index({ factoryName: 1 });
datasetSchema.index({ uploadDate: -1 });
datasetSchema.index({ userId: 1, factoryName: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Dataset', datasetSchema);
