const rateLimit = require('express-rate-limit');
const Blacklist = require('../models/Blacklist');
const AuditLog = require('../models/AuditLog');

// Store para tracking en memoria
const requestStore = new Map();

/**
 * Rate limiter personalizado por usuario
 */
const createUserRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos
    maxRequests = 100,
    message = 'Demasiadas peticiones, intenta de nuevo más tarde'
  } = options;

  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const ip = req.ip || req.connection.remoteAddress;

      // Verificar si IP está bloqueada
      const isBlocked = await Blacklist.isBlocked(ip);
      if (isBlocked) {
        return res.status(403).json({
          success: false,
          message: '🚫 Tu IP ha sido bloqueada. Contacta al administrador.'
        });
      }

      const identifier = userId || ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Obtener o crear registro
      let record = requestStore.get(identifier);
      if (!record) {
        record = { requests: [], firstRequest: now };
        requestStore.set(identifier, record);
      }

      // Filtrar requests dentro de la ventana
      record.requests = record.requests.filter(time => time > windowStart);

      // Verificar límite
      if (record.requests.length >= maxRequests) {
        // Incrementar contador de abusos
        record.abuseCount = (record.abuseCount || 0) + 1;

        // Si hay muchos abusos, bloquear automáticamente
        if (record.abuseCount >= 5 && ip) {
          await Blacklist.create({
            ip,
            reason: 'rate_limit_exceeded',
            description: `Excedió el límite de ${maxRequests} peticiones en ${windowMs/1000/60} minutos`,
            attemptCount: record.abuseCount,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
            attemptContext: {
              path: req.path,
              method: req.method,
              requestCount: record.requests.length,
              timestamp: new Date()
            },
            userAgent: req.headers['user-agent'],
            endpoint: req.path,
            method: req.method
          });

          // Log de auditoría
          if (userId) {
            await AuditLog.create({
              user: userId,
              username: req.user?.username || 'Unknown',
              action: 'block_ip',
              details: {
                reason: 'rate_limit_exceeded',
                requestCount: record.requests.length,
                abuseCount: record.abuseCount
              },
              ip,
              userAgent: req.get('user-agent'),
              status: 'success',
              severity: 'high'
            });
          }

          return res.status(403).json({
            success: false,
            message: '🚫 Tu IP ha sido bloqueada automáticamente por exceso de peticiones.'
          });
        }

        return res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Agregar request actual
      record.requests.push(now);
      record.abuseCount = 0; // Reset abuse count on successful request

      next();
    } catch (error) {
      console.error('❌ Error en rate limiter:', error);
      next(); // Continuar en caso de error
    }
  };
};

/**
 * Detector de patrones sospechosos
 */
const detectSuspiciousPatterns = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id;
    const path = req.path;

    // Patrones sospechosos
    const suspiciousPatterns = [
      /\.\./g, // Path traversal
      /<script/gi, // XSS
      /union.*select/gi, // SQL Injection
      /eval\(/gi, // Code injection
      /base64_decode/gi, // Obfuscation
      /\bor\b.*=.*\bor\b/gi // SQL Injection
    ];

    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const body = JSON.stringify(req.body || {});

    let isSuspicious = false;
    let matchedPattern = '';

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fullUrl) || pattern.test(body)) {
        isSuspicious = true;
        matchedPattern = pattern.toString();
        break;
      }
    }

    if (isSuspicious) {
      console.warn(`⚠️ Patrón sospechoso detectado desde IP ${ip}: ${matchedPattern}`);

      // Log de auditoría
      if (userId) {
        await AuditLog.create({
          user: userId,
          username: req.user?.username || 'Unknown',
          action: 'other',
          details: {
            type: 'suspicious_pattern',
            pattern: matchedPattern,
            path,
            body: req.body
          },
          ip,
          userAgent: req.get('user-agent'),
          status: 'warning',
          severity: 'high'
        });
      }

      // Verificar si ya tiene intentos previos
      const existingBlock = await Blacklist.findOne({ ip });
      if (existingBlock) {
        existingBlock.attemptCount += 1;
        existingBlock.lastAttempt = new Date();

        if (existingBlock.attemptCount >= 3) {
          existingBlock.active = true;
          existingBlock.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
          await existingBlock.save();

          return res.status(403).json({
            success: false,
            message: '🚫 Actividad sospechosa detectada. Tu IP ha sido bloqueada.'
          });
        }

        await existingBlock.save();
      } else {
        // Crear registro de advertencia
        await Blacklist.create({
          ip,
          reason: 'suspicious_pattern',
          description: `Patrón sospechoso detectado: ${matchedPattern}`,
          attemptCount: 1,
          active: false, // Solo advertencia por ahora
          attemptContext: {
            path: req.path,
            method: req.method,
            pattern: matchedPattern,
            body: req.body ? JSON.stringify(req.body).substring(0, 200) : null,
            timestamp: new Date()
          },
          userAgent: req.headers['user-agent'],
          endpoint: req.path,
          method: req.method
        });
      }
    }

    next();
  } catch (error) {
    console.error('❌ Error en detector de patrones:', error);
    next(); // Continuar en caso de error
  }
};

/**
 * Limpiar store periódicamente
 */
setInterval(() => {
  const now = Date.now();
  const expireTime = 60 * 60 * 1000; // 1 hora

  for (const [key, record] of requestStore.entries()) {
    if (now - record.firstRequest > expireTime) {
      requestStore.delete(key);
    }
  }
}, 10 * 60 * 1000); // Cada 10 minutos

module.exports = {
  createUserRateLimit,
  detectSuspiciousPatterns
};

