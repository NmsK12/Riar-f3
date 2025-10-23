const express = require('express');
const router = express.Router();
const KeyRequest = require('../models/KeyRequest');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');

// Generar key aleatoria
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Calcular fecha de expiración
function calculateExpiration(duration) {
  const now = new Date();
  const durations = {
    '1h': 1 * 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
    '2m': 60 * 24 * 60 * 60 * 1000,
    '6m': 180 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };
  
  return new Date(now.getTime() + (durations[duration] || durations['1m']));
}

// GET /api/key-requests - Obtener solicitudes
router.get('/', async (req, res) => {
  try {
    const role = req.user.role;
    const username = req.user.username;

    let requests;
    
    if (role === 'admin') {
      // Admin ve todas las solicitudes
      requests = await KeyRequest.find().sort({ createdAt: -1 }).populate('userId', 'username telegram');
    } else if (role === 'vendedor') {
      // Vendedor ve solicitudes de sus clientes
      const myClients = await User.find({ role: 'cliente', createdBy: username }).select('_id');
      const clientIds = myClients.map(c => c._id);
      requests = await KeyRequest.find({ userId: { $in: clientIds } }).sort({ createdAt: -1 }).populate('userId', 'username telegram');
    } else {
      // Cliente ve solo sus propias solicitudes
      requests = await KeyRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo solicitudes', error: error.message });
  }
});

// POST /api/key-requests - Crear solicitud (solo clientes)
router.post('/', async (req, res) => {
  try {
    const { endpoints } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!endpoints || endpoints.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar al menos un endpoint' });
    }

    // Verificar que el usuario existe y está activo
    const user = await User.findById(userId);
    if (!user || !user.active) {
      return res.status(403).json({ success: false, message: 'Usuario inactivo o no encontrado' });
    }

    // Crear solicitud
    const request = await KeyRequest.create({
      userId,
      username,
      endpoints,
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Solicitud enviada exitosamente. Espera la aprobación del administrador.',
      data: request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando solicitud', error: error.message });
  }
});

// POST /api/key-requests/:id/approve - Aprobar solicitud (admin/vendedor)
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role;
    const username = req.user.username;

    if (role !== 'admin' && role !== 'vendedor') {
      return res.status(403).json({ success: false, message: 'No tienes permiso' });
    }

    const request = await KeyRequest.findById(id).populate('userId');
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Esta solicitud ya fue procesada' });
    }

    // Si es vendedor, verificar que sea su cliente
    if (role === 'vendedor') {
      const client = await User.findById(request.userId._id);
      if (client.createdBy !== username) {
        return res.status(403).json({ success: false, message: 'Solo puedes aprobar solicitudes de tus clientes' });
      }
    }

    // Generar keys para cada endpoint solicitado
    const generatedKeys = [];

    for (const endpointRequest of request.endpoints) {
      // Generar key única
      let key;
      let keyExists = true;
      while (keyExists) {
        key = generateKey();
        const existing = await ApiKey.findOne({ key });
        keyExists = !!existing;
      }

      const expiresAt = calculateExpiration(endpointRequest.duration);

      // Crear la key en la base de datos
      await ApiKey.create({
        key,
        userId: request.userId._id,
        endpoint: endpointRequest.endpoint,
        duration: endpointRequest.duration,
        expiresAt,
        createdBy: username
      });

      generatedKeys.push({
        endpoint: endpointRequest.endpoint,
        key,
        expiresAt
      });
    }

    // Actualizar solicitud
    request.status = 'approved';
    request.approvedBy = username;
    request.approvedAt = new Date();
    request.generatedKeys = generatedKeys;
    await request.save();

    res.json({
      success: true,
      message: `Solicitud aprobada. ${generatedKeys.length} keys generadas exitosamente.`,
      data: {
        request,
        keys: generatedKeys
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error aprobando solicitud', error: error.message });
  }
});

// POST /api/key-requests/:id/reject - Rechazar solicitud (admin/vendedor)
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const role = req.user.role;
    const username = req.user.username;

    if (role !== 'admin' && role !== 'vendedor') {
      return res.status(403).json({ success: false, message: 'No tienes permiso' });
    }

    const request = await KeyRequest.findById(id).populate('userId');
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Esta solicitud ya fue procesada' });
    }

    // Si es vendedor, verificar que sea su cliente
    if (role === 'vendedor') {
      const client = await User.findById(request.userId._id);
      if (client.createdBy !== username) {
        return res.status(403).json({ success: false, message: 'Solo puedes rechazar solicitudes de tus clientes' });
      }
    }

    request.status = 'rejected';
    request.approvedBy = username;
    request.approvedAt = new Date();
    request.notes = notes || 'Rechazado';
    await request.save();

    res.json({
      success: true,
      message: 'Solicitud rechazada',
      data: request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rechazando solicitud', error: error.message });
  }
});

module.exports = router;

