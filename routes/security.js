const express = require('express');
const router = express.Router();
const Blacklist = require('../models/Blacklist');
const AuditLog = require('../models/AuditLog');
const ApiLog = require('../models/ApiLog');
const { authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLogger');

// ===== ALERTAS CRÍTICAS =====

// Obtener alertas críticas (errores 500, IPs bloqueadas, ataques)
router.get('/critical-alerts', authorize(['admin']), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Buscar logs críticos de las últimas 24 horas
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const criticalLogs = await AuditLog.find({
      createdAt: { $gte: yesterday },
      $or: [
        { severity: 'critical' },
        { severity: 'high' },
        { action: 'suspicious_activity_detected' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
    
    // Buscar IPs bloqueadas recientes
    const recentBlocks = await Blacklist.find({
      blockedAt: { $gte: yesterday },
      active: true
    })
    .sort({ blockedAt: -1 })
    .limit(5);
    
    res.json({
      success: true,
      data: {
        criticalLogs,
        recentBlocks,
        summary: {
          criticalCount: criticalLogs.length,
          blockedIPsCount: recentBlocks.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo alertas críticas',
      error: error.message
    });
  }
});

// ===== BLACKLIST =====

// Obtener IPs bloqueadas
router.get('/blacklist', authorize(['admin']), async (req, res) => {
  try {
    const blacklist = await Blacklist.find({ active: true })
      .populate('blockedBy', 'username')
      .sort({ blockedAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: blacklist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo blacklist',
      error: error.message
    });
  }
});

// Bloquear IP manualmente
router.post('/blacklist', authorize(['admin']), logAction('block_ip', { severity: 'high' }), async (req, res) => {
  try {
    const { ip, reason, description, duration } = req.body;

    if (!ip || !reason) {
      return res.status(400).json({
        success: false,
        message: 'IP y razón son requeridos'
      });
    }

    // Verificar si ya existe
    const existing = await Blacklist.findOne({ ip });
    if (existing) {
      existing.active = true;
      existing.reason = reason;
      existing.description = description;
      existing.blockedBy = req.user.id;
      existing.blockedAt = new Date();
      
      if (duration) {
        existing.expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
      }
      
      await existing.save();
      
      return res.json({
        success: true,
        message: 'IP bloqueada exitosamente',
        data: existing
      });
    }

    const blocked = await Blacklist.create({
      ip,
      reason,
      description,
      blockedBy: req.user.id,
      expiresAt: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null
    });

    res.json({
      success: true,
      message: 'IP bloqueada exitosamente',
      data: blocked
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error bloqueando IP',
      error: error.message
    });
  }
});

// Desbloquear IP
router.delete('/blacklist/:id', authorize(['admin']), logAction('unblock_ip', { severity: 'medium' }), async (req, res) => {
  try {
    const blocked = await Blacklist.findById(req.params.id);
    
    if (!blocked) {
      return res.status(404).json({
        success: false,
        message: 'IP no encontrada'
      });
    }

    blocked.active = false;
    await blocked.save();

    res.json({
      success: true,
      message: 'IP desbloqueada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error desbloqueando IP',
      error: error.message
    });
  }
});

// ===== AUDIT LOGS =====

// Obtener logs de auditoría
router.get('/audit-logs', authorize(['admin']), async (req, res) => {
  try {
    const { user, action, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (user) query.user = user;
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
      .populate('user', 'username role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo logs de auditoría',
      error: error.message
    });
  }
});

// Obtener estadísticas de auditoría
router.get('/audit-logs/stats', authorize(['admin']), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            action: '$action',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const severityStats = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        actions: stats,
        severity: severityStats,
        period: `Last ${days} days`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
});

// ===== API LOGS =====

// Obtener logs de API
router.get('/api-logs', authorize(['admin', 'vendedor']), async (req, res) => {
  try {
    const { userId, endpoint, page = 1, limit = 50 } = req.query;
    
    const query = {};
    
    // Si no es admin, solo ver sus propios logs
    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
    } else if (userId) {
      query.userId = userId;
    }
    
    if (endpoint) query.endpoint = endpoint;

    const logs = await ApiLog.find(query)
      .populate('userId', 'username')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ApiLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo logs de API',
      error: error.message
    });
  }
});

// Estadísticas de uso de API
router.get('/api-logs/stats', authorize(['admin', 'vendedor']), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = {
      timestamp: { $gte: startDate }
    };

    // Si no es admin, solo sus stats
    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
    }

    const endpointStats = await ApiLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          successRate: {
            $avg: { $cond: ['$success', 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const dailyStats = await ApiLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          requests: { $sum: 1 },
          errors: {
            $sum: { $cond: ['$success', 0, 1] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalRequests = await ApiLog.countDocuments(query);
    const successfulRequests = await ApiLog.countDocuments({ ...query, success: true });
    const cacheHits = await ApiLog.countDocuments({ ...query, fromCache: true });

    res.json({
      success: true,
      data: {
        endpoints: endpointStats,
        daily: dailyStats,
        summary: {
          totalRequests,
          successRate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : 0,
          cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
});

// Exportar logs (CSV)
router.get('/api-logs/export', authorize(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const query = {};
    if (startDate) query.timestamp = { $gte: new Date(startDate) };
    if (endDate) query.timestamp = { ...query.timestamp, $lte: new Date(endDate) };

    const logs = await ApiLog.find(query)
      .populate('userId', 'username')
      .sort({ timestamp: -1 })
      .limit(10000);

    if (format === 'csv') {
      const csv = convertToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=api-logs.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: logs
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exportando logs',
      error: error.message
    });
  }
});

// Helper para convertir a CSV
function convertToCSV(logs) {
  const headers = ['Timestamp', 'User', 'Endpoint', 'IP', 'Status', 'Response Time', 'From Cache'];
  const rows = logs.map(log => [
    log.timestamp,
    log.userId?.username || 'N/A',
    log.endpoint,
    log.ip,
    log.responseStatus,
    log.responseTime,
    log.fromCache
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

module.exports = router;

