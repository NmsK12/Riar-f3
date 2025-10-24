const AuditLog = require('../models/AuditLog');

/**
 * Middleware para registrar acciones en auditoría
 */
const logAction = (action, options = {}) => {
  return async (req, res, next) => {
    // Guardar el método original de res.json
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      try {
        // Solo registrar si la acción fue exitosa
        if (data.success !== false) {
          const { resource, resourceId, details, severity = 'low' } = options;

          await AuditLog.create({
            user: req.user?.id || req.user?._id,
            username: req.user?.username || 'System',
            action,
            resource: resource || req.body?.resource,
            resourceId: resourceId || req.params?.id || req.body?.resourceId,
            details: {
              ...details,
              body: req.body,
              params: req.params,
              query: req.query
            },
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            status: data.success === false ? 'failed' : 'success',
            severity
          });
        }
      } catch (error) {
        console.error('❌ Error guardando audit log:', error);
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Log manual de auditoría
 */
const createAuditLog = async (data) => {
  try {
    await AuditLog.create(data);
  } catch (error) {
    console.error('❌ Error creando audit log:', error);
  }
};

module.exports = {
  logAction,
  createAuditLog
};

