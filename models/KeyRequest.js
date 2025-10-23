const mongoose = require('mongoose');

const keyRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  endpoints: [{
    endpoint: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  generatedKeys: [{
    endpoint: String,
    key: String,
    expiresAt: Date
  }],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('KeyRequest', keyRequestSchema);

