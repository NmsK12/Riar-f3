const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');

// GET /api/stats - Obtener estadísticas
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let stats = {
      totalKeys: 0,
      totalUsers: 0,
      activeEndpoints: 0,
      expiringKeys: 0
    };

    if (role === 'admin') {
      // Stats generales para admin
      stats.totalKeys = await ApiKey.countDocuments({ active: true });
      stats.totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
      
      const endpoints = await ApiKey.distinct('endpoint', { active: true });
      stats.activeEndpoints = endpoints.length;

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      stats.expiringKeys = await ApiKey.countDocuments({
        active: true,
        expiresAt: { $lte: sevenDaysFromNow, $gt: new Date() }
      });
    } else {
      // Stats personales para vendedores y clientes
      stats.totalKeys = await ApiKey.countDocuments({ userId, active: true });
      
      if (role === 'vendedor') {
        stats.totalUsers = await User.countDocuments({ 
          role: 'cliente', 
          createdBy: req.user.username 
        });
      }

      const endpoints = await ApiKey.distinct('endpoint', { userId, active: true });
      stats.activeEndpoints = endpoints.length;

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      stats.expiringKeys = await ApiKey.countDocuments({
        userId,
        active: true,
        expiresAt: { $lte: sevenDaysFromNow, $gt: new Date() }
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo estadísticas', error: error.message });
  }
});

module.exports = router;

