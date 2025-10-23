const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');

// Calcular fecha de expiración del usuario
function calculateUserExpiration(duration) {
  if (duration === 'permanent') return null;
  
  const now = new Date();
  const durations = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
    '2m': 60 * 24 * 60 * 60 * 1000,
    '6m': 180 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };
  
  return new Date(now.getTime() + (durations[duration] || durations['1m']));
}

// GET /api/users - Obtener usuarios
router.get('/', async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    let users;
    if (role === 'admin') {
      // Admin ve todos los usuarios excepto otros admins
      users = await User.find({ role: { $ne: 'admin' } }).select('-password');
    } else if (role === 'vendedor') {
      // Vendedor solo ve los clientes que él creó
      users = await User.find({ role: 'cliente', createdBy: req.user.username }).select('-password');
    } else {
      return res.status(403).json({ success: false, message: 'No tienes permiso' });
    }

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo usuarios', error: error.message });
  }
});

// POST /api/users - Crear usuario
router.post('/', async (req, res) => {
  try {
    const { username, password, role, telegram, duration, allowedEndpoints } = req.body;
    const creatorRole = req.user.role;
    const creatorUsername = req.user.username;

    // Validaciones básicas
    if (!username || !password || !role || !telegram || !duration) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    }

    // Verificar permisos
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'No se pueden crear más administradores' });
    }

    if (role === 'vendedor' && creatorRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo admins pueden crear vendedores' });
    }

    if (role === 'cliente' && creatorRole === 'cliente') {
      return res.status(403).json({ success: false, message: 'Los clientes no pueden crear otros usuarios' });
    }

    // Vendedores: verificar límite de clientes
    if (creatorRole === 'vendedor' && role === 'cliente') {
      const creator = await User.findById(req.user.id);
      if (creator.createdClients >= creator.maxClients) {
        return res.status(403).json({ 
          success: false, 
          message: `Has alcanzado el límite de ${creator.maxClients} clientes` 
        });
      }

      // Generar código de aprobación para admin
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // En este punto, necesitaríamos enviar notificación a admin
      // Por ahora, guardamos el código
      await VerificationCode.create({
        code,
        type: 'vendor_client_creation',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
        metadata: {
          vendorUsername: creatorUsername,
          clientUsername: username,
          telegram
        }
      });

      return res.json({
        success: true,
        needsApproval: true,
        message: 'Solicitud de creación enviada a administradores',
        code,
        note: 'Envía este código a un administrador para aprobación'
      });
    }

    // Verificar si el usuario ya existe
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }

    // Crear usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const expiresAt = calculateUserExpiration(duration);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      telegram,
      active: true,
      expiresAt,
      createdBy: creatorUsername,
      allowedEndpoints: allowedEndpoints || []
    });

    // Si es vendedor quien creó, incrementar contador
    if (creatorRole === 'vendedor' && role === 'cliente') {
      await User.findByIdAndUpdate(req.user.id, { $inc: { createdClients: 1 } });
    }

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        username: newUser.username,
        role: newUser.role,
        expiresAt: newUser.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando usuario', error: error.message });
  }
});

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { telegram, allowedEndpoints, active, duration } = req.body;
    const role = req.user.role;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Solo admin puede editar o el vendedor sus propios clientes
    if (role !== 'admin' && user.createdBy !== req.user.username) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar este usuario' });
    }

    // No se puede editar admins
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'No se pueden editar administradores' });
    }

    // Actualizar campos permitidos
    if (telegram) user.telegram = telegram;
    if (allowedEndpoints) user.allowedEndpoints = allowedEndpoints;
    if (active !== undefined) user.active = active;
    if (duration) user.expiresAt = calculateUserExpiration(duration);

    await user.save();

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando usuario', error: error.message });
  }
});

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const role = req.user.role;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Solo admin puede eliminar o el vendedor sus propios clientes
    if (role !== 'admin' && user.createdBy !== req.user.username) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este usuario' });
    }

    // No se puede eliminar admins
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'No se pueden eliminar administradores' });
    }

    await User.findByIdAndDelete(userId);

    // Si fue creado por vendedor, decrementar contador
    if (user.createdBy && user.role === 'cliente') {
      const creator = await User.findOne({ username: user.createdBy, role: 'vendedor' });
      if (creator) {
        creator.createdClients = Math.max(0, creator.createdClients - 1);
        await creator.save();
      }
    }

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando usuario', error: error.message });
  }
});

// POST /api/users/approve - Aprobar creación de cliente por vendedor
router.post('/approve', async (req, res) => {
  try {
    const { code, allowedEndpoints, duration } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo admins pueden aprobar' });
    }

    const verification = await VerificationCode.findOne({
      code,
      type: 'vendor_client_creation',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).json({ success: false, message: 'Código inválido o expirado' });
    }

    // Crear el usuario
    const { clientUsername, vendorUsername, telegram } = verification.metadata;
    
    const hashedPassword = await bcrypt.hash(Math.random().toString(36).substring(2, 12), 10);
    const expiresAt = calculateUserExpiration(duration || '1m');

    const newUser = await User.create({
      username: clientUsername,
      password: hashedPassword,
      role: 'cliente',
      telegram,
      active: true,
      expiresAt,
      createdBy: vendorUsername,
      allowedEndpoints: allowedEndpoints || []
    });

    // Incrementar contador del vendedor
    await User.findOneAndUpdate(
      { username: vendorUsername },
      { $inc: { createdClients: 1 } }
    );

    verification.used = true;
    await verification.save();

    res.json({
      success: true,
      message: 'Cliente aprobado y creado exitosamente',
      data: newUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error aprobando cliente', error: error.message });
  }
});

module.exports = router;

