const express = require('express');
const router = express.Router();
const VerificationCode = require('../models/VerificationCode');
const User = require('../models/User');

// GET /api/notifications - Obtener todas las notificaciones (solo admin)
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo admins pueden ver notificaciones' });
    }

    const notifications = await VerificationCode.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'username telegram');

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo notificaciones', error: error.message });
  }
});

// POST /api/notifications/approve - Aprobar un código
router.post('/approve', async (req, res) => {
  try {
    const { code, duration, allowedEndpoints } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo admins pueden aprobar' });
    }

    const verification = await VerificationCode.findOne({
      code,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).json({ success: false, message: 'Código inválido o expirado' });
    }

    // Si es un registro de cliente, activar el usuario
    if (verification.type === 'client_registration' && verification.userId) {
      const user = await User.findById(verification.userId);
      
      if (user) {
        user.active = true;
        
        // Configurar endpoints permitidos si se proporcionan
        if (allowedEndpoints && allowedEndpoints.length > 0) {
          user.allowedEndpoints = allowedEndpoints;
        }
        
        // Configurar expiración si se proporciona
        if (duration) {
          const durations = {
            '1d': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '1m': 30 * 24 * 60 * 60 * 1000,
            '2m': 60 * 24 * 60 * 60 * 1000,
            '6m': 180 * 24 * 60 * 60 * 1000,
            '1y': 365 * 24 * 60 * 60 * 1000
          };
          
          if (duration !== 'permanent') {
            user.expiresAt = new Date(Date.now() + (durations[duration] || durations['1m']));
          }
        } else {
          // Por defecto: 1 mes
          user.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        await user.save();
      }
    }

    verification.used = true;
    await verification.save();

    res.json({
      success: true,
      message: 'Código aprobado y usuario activado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error aprobando código', error: error.message });
  }
});

// DELETE /api/notifications/:id - Eliminar una notificación específica
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo admins pueden eliminar notificaciones' });
    }

    const { id } = req.params;
    const deleted = await VerificationCode.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }

    res.json({
      success: true,
      message: 'Notificación eliminada'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando notificación', error: error.message });
  }
});

// DELETE /api/notifications - Limpiar todas las notificaciones
router.delete('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo admins pueden limpiar notificaciones' });
    }

    const result = await VerificationCode.deleteMany({});

    res.json({
      success: true,
      message: `${result.deletedCount} notificaciones eliminadas`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error limpiando notificaciones', error: error.message });
  }
});

module.exports = router;

