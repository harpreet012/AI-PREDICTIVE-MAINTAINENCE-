const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    messages: [{
      role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      context: {
        equipmentName: String,
        healthScore: Number,
        failureProbability: Number,
        temperature: Number,
        vibration: Number,
      },
    }],
    lastActivity: {
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

// TTL index to automatically delete old conversations (30 days)
conversationSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
conversationSchema.index({ userId: 1, sessionId: 1 });
conversationSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
