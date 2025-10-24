const express = require('express');
const router = express.Router();
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
  
  return new Date(now.getTime() + (durations[duration] || durations['1d']));
}

// GET /api/keys - Obtener todas las keys del usuario
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let keys;
    if (role === 'admin') {
      // Admin ve todas las keys
      keys = await ApiKey.find().populate('userId', 'username role');
    } else {
      // Vendedores y clientes solo ven sus keys
      keys = await ApiKey.find({ userId });
    }

    res.json({
      success: true,
      data: keys
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo keys', error: error.message });
  }
});

// POST /api/keys - Crear nueva key
router.post('/', async (req, res) => {
  try {
    const { endpoint, durationAmount, durationUnit, userId } = req.body;
    const creatorId = req.user.id;
    const creatorRole = req.user.role;

    // Validaciones
    if (!endpoint || !durationAmount || !durationUnit) {
      return res.status(400).json({ success: false, message: 'Endpoint, cantidad y unidad de tiempo son requeridos' });
    }

    const validEndpoints = ['dni', 'telp', 'nom', 'arg', 'corr', 'risk', 'foto', 'sunat', 'meta', 'all'];
    if (!validEndpoints.includes(endpoint)) {
      return res.status(400).json({ success: false, message: 'Endpoint inválido' });
    }

    const validUnits = ['horas', 'dias', 'meses'];
    if (!validUnits.includes(durationUnit)) {
      return res.status(400).json({ success: false, message: 'Unidad de tiempo inválida' });
    }

    if (durationAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Cantidad debe ser mayor a 0' });
    }

    // Validar duración máxima: 12 meses (1 año)
    const maxDurations = {
      'horas': 8760, // 365 días * 24 horas
      'dias': 365,   // 1 año
      'meses': 12    // 1 año
    };

    if (durationAmount > maxDurations[durationUnit]) {
      return res.status(400).json({ 
        success: false, 
        message: `⚠️ La duración máxima permitida es de 12 meses (1 año). Intentaste crear ${durationAmount} ${durationUnit}. Máximo: ${maxDurations[durationUnit]} ${durationUnit}.` 
      });
    }

    // Verificar endpoint 'all'
    if (endpoint === 'all' && creatorRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo admins pueden crear keys con acceso total' });
    }

    // Determinar para quién es la key
    let targetUserId = creatorId;
    if (userId && (creatorRole === 'admin' || creatorRole === 'vendedor')) {
      targetUserId = userId;
    }

    // Clientes solo pueden tener 1 key por endpoint
    if (creatorRole === 'cliente') {
      const existingKey = await ApiKey.findOne({
        userId: creatorId,
        endpoint,
        active: true,
        expiresAt: { $gt: new Date() }
      });

      if (existingKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya tienes una key activa para este endpoint. Los clientes solo pueden tener 1 key por endpoint.' 
        });
      }

      // Clientes solo pueden crear keys de hasta 2 meses
      const maxMonths = 2;
      if (durationUnit === 'meses' && durationAmount > maxMonths) {
        return res.status(403).json({ 
          success: false, 
          message: `Los clientes solo pueden crear keys de máximo ${maxMonths} meses` 
        });
      }
    }

    // Generar key única
    let key;
    let keyExists = true;
    while (keyExists) {
      key = generateKey();
      const existing = await ApiKey.findOne({ key });
      keyExists = !!existing;
    }

    // Calcular expiración basada en cantidad y unidad
    const now = new Date();
    let expiresAt;
    
    switch(durationUnit) {
      case 'horas':
        expiresAt = new Date(now.getTime() + durationAmount * 60 * 60 * 1000);
        break;
      case 'dias':
        expiresAt = new Date(now.getTime() + durationAmount * 24 * 60 * 60 * 1000);
        break;
      case 'meses':
        expiresAt = new Date(now.getTime() + durationAmount * 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default: 1 mes
    }

    const newKey = await ApiKey.create({
      key,
      userId: targetUserId,
      endpoint,
      duration: `${durationAmount} ${durationUnit}`,
      durationAmount,
      durationUnit,
      expiresAt,
      createdBy: req.user.username,
      canRenew: true
    });

    res.json({
      success: true,
      message: 'Key creada exitosamente',
      data: newKey
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando key', error: error.message });
  }
});

// DELETE /api/keys/:id - Eliminar key
router.delete('/:id', async (req, res) => {
  try {
    const keyId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    const key = await ApiKey.findById(keyId);
    if (!key) {
      return res.status(404).json({ success: false, message: 'Key no encontrada' });
    }

    // Solo el dueño o un admin puede eliminar
    if (role !== 'admin' && key.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar esta key' });
    }

    await ApiKey.findByIdAndDelete(keyId);

    res.json({
      success: true,
      message: 'Key eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando key', error: error.message });
  }
});

// POST /api/keys/:id/renew - Renovar una key
router.post('/:id/renew', async (req, res) => {
  try {
    const keyId = req.params.id;
    const { durationAmount, durationUnit } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!durationAmount || !durationUnit) {
      return res.status(400).json({ success: false, message: 'Cantidad y unidad de tiempo son requeridas' });
    }

    const apiKey = await ApiKey.findById(keyId);
    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'Key no encontrada' });
    }

    // Solo el dueño o un admin puede renovar
    if (role !== 'admin' && apiKey.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para renovar esta key' });
    }

    if (!apiKey.canRenew) {
      return res.status(403).json({ success: false, message: 'Esta key no puede ser renovada' });
    }

    // Calcular nueva expiración desde AHORA (no desde la expiración anterior)
    const now = new Date();
    let newExpiresAt;
    
    switch(durationUnit) {
      case 'horas':
        newExpiresAt = new Date(now.getTime() + durationAmount * 60 * 60 * 1000);
        break;
      case 'dias':
        newExpiresAt = new Date(now.getTime() + durationAmount * 24 * 60 * 60 * 1000);
        break;
      case 'meses':
        newExpiresAt = new Date(now.getTime() + durationAmount * 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    apiKey.expiresAt = newExpiresAt;
    apiKey.durationAmount = durationAmount;
    apiKey.durationUnit = durationUnit;
    apiKey.duration = `${durationAmount} ${durationUnit}`;
    apiKey.active = true; // Reactivar si estaba inactiva
    await apiKey.save();

    res.json({
      success: true,
      message: `Key renovada por ${durationAmount} ${durationUnit}`,
      data: apiKey
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error renovando key', error: error.message });
  }
});

// POST /api/keys/validate - Validar una key (para la API principal)
router.post('/validate', async (req, res) => {
  try {
    const { key, endpoint } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, message: 'Key requerida' });
    }

    const apiKey = await ApiKey.findOne({ key, active: true });
    
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Key inválida', valid: false });
    }

    // Verificar expiración
    if (new Date() > apiKey.expiresAt) {
      apiKey.active = false;
      await apiKey.save();
      return res.status(401).json({ success: false, message: 'Key expirada', valid: false });
    }

    // Verificar endpoint
    if (apiKey.endpoint !== 'all' && endpoint && apiKey.endpoint !== endpoint) {
      return res.status(403).json({ 
        success: false, 
        message: `Esta key solo es válida para el endpoint: ${apiKey.endpoint}`, 
        valid: false 
      });
    }

    // Actualizar uso
    apiKey.usageCount += 1;
    apiKey.lastUsed = new Date();
    await apiKey.save();

    res.json({
      success: true,
      message: 'Key válida',
      valid: true,
      data: {
        endpoint: apiKey.endpoint,
        expiresAt: apiKey.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error validando key', error: error.message, valid: false });
  }
});

module.exports = router;

