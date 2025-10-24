const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'create_key',
      'delete_key',
      'renew_key',
      'create_user',
      'update_user',
      'delete_user',
      'approve_notification',
      'reject_request',
      'approve_request',
      'block_ip',
      'unblock_ip',
      'update_profile',
      'change_password',
      'export_data',
      'clear_cache',
      'other'
    ]
  },
  resource: {
    type: String // 'key', 'user', 'notification', etc
  },
  resourceId: {
    type: String // ID del recurso afectado
  },
  details: {
    type: mongoose.Schema.Types.Mixed // Detalles específicos de la acción
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'warning'],
    default: 'success'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  }
}, {
  timestamps: true
});

// Índices para búsqueda rápida
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ ip: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// TTL: Mantener logs por 90 días
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 días

module.exports = mongoose.model('AuditLog', auditLogSchema);

