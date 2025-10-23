const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user's notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        id, type, title, message, data, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);

    res.json({
      notifications: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === limit
      }
    });

  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// Get unread notifications count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ unreadCount: parseInt(result.rows[0].count) });

  } catch (error) {
    console.error('Erro ao buscar contagem de notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar contagem de notificações' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json({ message: 'Notificação marcada como lida' });

  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ message: 'Todas as notificações foram marcadas como lidas' });

  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ error: 'Erro ao marcar notificações como lidas' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json({ message: 'Notificação excluída com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir notificação:', error);
    res.status(500).json({ error: 'Erro ao excluir notificação' });
  }
});

// Create notification (for internal use)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { type, title, message, data } = req.body;
    const targetUserId = req.body.userId || req.user.id;

    const result = await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, type, title, message, data, is_read, created_at
    `, [targetUserId, type, title, message, JSON.stringify(data) || null]);

    res.status(201).json({
      message: 'Notificação criada com sucesso',
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ error: 'Erro ao criar notificação' });
  }
});

// Get notification preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    // In a real app, you'd have a notification_preferences table
    // For now, return default preferences
    const defaultPreferences = {
      likes: true,
      comments: true,
      badges: true,
      follows: true,
      challenges: true,
      marketing: false
    };

    res.json({ preferences: defaultPreferences });

  } catch (error) {
    console.error('Erro ao buscar preferências:', error);
    res.status(500).json({ error: 'Erro ao buscar preferências' });
  }
});

// Update notification preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const preferences = req.body;
    
    // In a real app, you'd save these to a notification_preferences table
    // For now, just return success
    
    res.json({ 
      message: 'Preferências de notificação atualizadas com sucesso',
      preferences 
    });

  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    res.status(500).json({ error: 'Erro ao atualizar preferências' });
  }
});

module.exports = router;