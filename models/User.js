const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'vendedor', 'cliente'],
    required: true
  },
  telegram: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  fullName: {
    type: String
  },
  active: {
    type: Boolean,
    default: true
  },
  verifiedIPs: [{
    type: String
  }],
  expiresAt: {
    type: Date
  },
  createdBy: {
    type: String
  },
  registrationCode: {
    type: String
  },
  allowedEndpoints: [{
    type: String
  }],
  maxClients: {
    type: Number,
    default: 5
  },
  createdClients: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índice para eliminar usuarios expirados
userSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('User', userSchema);

