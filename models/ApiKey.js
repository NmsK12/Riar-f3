const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  endpoint: {
    type: String,
    required: true,
    enum: ['dni', 'telp', 'nom', 'arg', 'risk', 'foto', 'sunat', 'meta', 'reniec', 'sentinel', 'denuncias-placa', 'denuncias-dni', 'all']
  },
  duration: {
    type: String,
    required: true
  },
  durationAmount: {
    type: Number,
    required: true
  },
  durationUnit: {
    type: String,
    enum: ['horas', 'dias', 'meses'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
    // Índice TTL definido abajo, no duplicar aquí
  },
  active: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },
  createdBy: {
    type: String,
    required: true
  },
  canRenew: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Método virtual para calcular tiempo restante en milisegundos
apiKeySchema.virtual('timeRemaining').get(function() {
  return this.expiresAt - new Date();
});

// Método virtual para calcular tiempo restante en formato legible
apiKeySchema.virtual('timeRemainingFormatted').get(function() {
  const remaining = this.timeRemaining;
  if (remaining <= 0) return 'Expirado';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  
  if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`;
  if (days > 0) return `${days} día${days > 1 ? 's' : ''}`;
  return `${hours} hora${hours > 1 ? 's' : ''}`;
});

// Configurar virtuals en JSON
apiKeySchema.set('toJSON', { virtuals: true });
apiKeySchema.set('toObject', { virtuals: true });

// Índice para eliminar keys expiradas automáticamente
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ApiKey', apiKeySchema);

