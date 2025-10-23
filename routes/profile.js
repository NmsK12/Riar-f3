const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /api/profile - Obtener perfil del usuario actual
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo perfil', error: error.message });
  }
});

// PUT /api/profile - Actualizar perfil propio
router.put('/', async (req, res) => {
  try {
    const { telegram, password } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Actualizar telegram si se proporciona
    if (telegram) {
      user.telegram = telegram;
    }

    // Actualizar contraseña si se proporciona
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        username: user.username,
        telegram: user.telegram
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando perfil', error: error.message });
  }
});

module.exports = router;

