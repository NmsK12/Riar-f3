const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLogger');

// ===== TICKETS DE SOPORTE =====

// Obtener tickets
router.get('/', async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const isStaff = req.user.role === 'admin' || req.user.role === 'vendedor';

    const query = {};

    // Si no es staff, solo ver sus propios tickets
    if (!isStaff) {
      query.user = req.user.id;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const tickets = await Ticket.find(query)
      .populate('user', 'username telegram')
      .populate('assignedTo', 'username')
      .populate('messages.sender', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo tickets',
      error: error.message
    });
  }
});

// Crear ticket
router.post('/', logAction('other', { resource: 'ticket' }), async (req, res) => {
  try {
    const { subject, category, priority, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Asunto y mensaje son requeridos'
      });
    }

    const ticket = await Ticket.create({
      user: req.user.id,
      username: req.user.username,
      subject,
      category: category || 'other',
      priority: priority || 'medium',
      messages: [{
        sender: req.user.id,
        senderName: req.user.username,
        message,
        isStaff: false
      }]
    });

    await ticket.populate('user', 'username telegram');

    res.json({
      success: true,
      message: 'Ticket creado exitosamente',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando ticket',
      error: error.message
    });
  }
});

// Obtener un ticket específico
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'username telegram')
      .populate('assignedTo', 'username')
      .populate('messages.sender', 'username role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Verificar permisos
    const isStaff = req.user.role === 'admin' || req.user.role === 'vendedor';
    const isOwner = ticket.user._id.toString() === req.user.id.toString();

    if (!isStaff && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este ticket'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo ticket',
      error: error.message
    });
  }
});

// Agregar mensaje al ticket
router.post('/:id/messages', logAction('other', { resource: 'ticket' }), async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Mensaje es requerido'
      });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Verificar permisos
    const isStaff = req.user.role === 'admin' || req.user.role === 'vendedor';
    const isOwner = ticket.user.toString() === req.user.id.toString();

    if (!isStaff && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para responder este ticket'
      });
    }

    ticket.messages.push({
      sender: req.user.id,
      senderName: req.user.username,
      message,
      isStaff
    });

    // Si es staff respondiendo, cambiar estado
    if (isStaff && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    // Si es cliente respondiendo y estaba en "waiting_response"
    if (!isStaff && ticket.status === 'waiting_response') {
      ticket.status = 'in_progress';
    }

    await ticket.save();
    await ticket.populate('messages.sender', 'username role');

    res.json({
      success: true,
      message: 'Mensaje agregado exitosamente',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error agregando mensaje',
      error: error.message
    });
  }
});

// Actualizar estado del ticket (staff only)
router.patch('/:id/status', authorize(['admin', 'vendedor']), logAction('other', { resource: 'ticket', severity: 'low' }), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Estado es requerido'
      });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    ticket.status = status;

    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
      ticket.resolvedBy = req.user.id;
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error actualizando estado',
      error: error.message
    });
  }
});

// Asignar ticket (staff only)
router.patch('/:id/assign', authorize(['admin', 'vendedor']), logAction('other', { resource: 'ticket', severity: 'low' }), async (req, res) => {
  try {
    const { assignTo } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    ticket.assignedTo = assignTo || req.user.id;
    await ticket.save();
    await ticket.populate('assignedTo', 'username');

    res.json({
      success: true,
      message: 'Ticket asignado exitosamente',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error asignando ticket',
      error: error.message
    });
  }
});

// Calificar ticket (después de cerrado)
router.post('/:id/rate', logAction('other', { resource: 'ticket' }), async (req, res) => {
  try {
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Calificación debe ser entre 1 y 5'
      });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Verificar que sea el dueño
    if (ticket.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo el creador puede calificar el ticket'
      });
    }

    // Verificar que esté cerrado
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes calificar tickets cerrados'
      });
    }

    ticket.rating = rating;
    await ticket.save();

    res.json({
      success: true,
      message: 'Gracias por tu calificación',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calificando ticket',
      error: error.message
    });
  }
});

// Estadísticas de tickets (staff only)
router.get('/stats/summary', authorize(['admin', 'vendedor']), async (req, res) => {
  try {
    const total = await Ticket.countDocuments();
    const open = await Ticket.countDocuments({ status: 'open' });
    const inProgress = await Ticket.countDocuments({ status: 'in_progress' });
    const resolved = await Ticket.countDocuments({ status: 'resolved' });
    const closed = await Ticket.countDocuments({ status: 'closed' });

    const avgRating = await Ticket.aggregate([
      { $match: { rating: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    const byCategory = await Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byPriority = await Ticket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: {
          open,
          inProgress,
          resolved,
          closed
        },
        avgRating: avgRating[0]?.avg || 0,
        byCategory,
        byPriority
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

module.exports = router;

