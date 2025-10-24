const mongoose = require('mongoose');

const apiLogSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    index: true
  },
  keyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    default: 'GET'
  },
  query: {
    type: mongoose.Schema.Types.Mixed // Parámetros de la consulta (dni, tel, etc)
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  responseStatus: {
    type: Number // 200, 400, 500, etc
  },
  responseTime: {
    type: Number // milisegundos
  },
  fromCache: {
    type: Boolean,
    default: false
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Índices para análisis
apiLogSchema.index({ userId: 1, timestamp: -1 });
apiLogSchema.index({ endpoint: 1, timestamp: -1 });
apiLogSchema.index({ ip: 1, timestamp: -1 });
apiLogSchema.index({ success: 1, timestamp: -1 });

// TTL: Mantener logs por 30 días
apiLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 días

module.exports = mongoose.model('ApiLog', apiLogSchema);

