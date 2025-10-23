const express = require('express');
const pool = require('../config/database');
const { authMiddleware, requireSuperModerator } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', authMiddleware, requireSuperModerator, async (_req, res) => {
  try {
    const [[pendingVideos], [xpWeek], [activeUsers], [badgesAwarded]] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM videos'),
      pool.query(
        `SELECT COALESCE(SUM(exp_awarded), 0)::int AS total
           FROM user_exp_log
          WHERE created_at > NOW() - INTERVAL '7 days'`
      ),
      pool.query('SELECT COUNT(*)::int as count FROM users WHERE is_active = true'),
      pool.query('SELECT COUNT(*)::int as count FROM user_badges'),
    ]);

    res.json({
      pendingVideos: pendingVideos.rows[0]?.count ?? 0,
      xpWeek: xpWeek.rows[0]?.total ?? 0,
      activeUsers: activeUsers.rows[0]?.count ?? 0,
      badgesAwarded: badgesAwarded.rows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error('Erro ao calcular resumo do dashboard:', error);
    res.status(500).json({ error: 'Erro ao carregar resumo do dashboard' });
  }
});

module.exports = router;
