const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['manual', 'abuse', 'brute_force', 'suspicious_pattern', 'rate_limit_exceeded']
  },
  description: {
    type: String
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blockedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date // null = permanente
  },
  attemptCount: {
    type: Number,
    default: 1
  },
  lastAttempt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  },
  // Nuevo: contexto de lo que intentó hacer
  attemptContext: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  userAgent: {
    type: String
  },
  endpoint: {
    type: String
  },
  method: {
    type: String
  }
}, {
  timestamps: true
});

// Índice para expiración automática
blacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Método para verificar si IP está bloqueada
blacklistSchema.statics.isBlocked = async function(ip) {
  const blocked = await this.findOne({
    ip,
    active: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
  return !!blocked;
};

module.exports = mongoose.model('Blacklist', blacklistSchema);

