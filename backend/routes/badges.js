const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, requireSuperModerator } = require('../middleware/auth');

const router = express.Router();

const badgeSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  icon_url: Joi.string().uri().allow('', null),
  category: Joi.string().max(50).required(),
  requirement_type: Joi.string().max(50).required(),
  requirement_value: Joi.number().integer().allow(null),
  rarity: Joi.string().valid('common', 'rare', 'epic', 'legendary').default('common'),
});

// Get all available badges
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, name, description, icon_url, category, 
        requirement_type, requirement_value, rarity
      FROM badges
      ORDER BY 
        CASE rarity 
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          ELSE 4
        END,
        name ASC
    `);

    res.json({ badges: result.rows });

  } catch (error) {
    console.error('Erro ao buscar badges:', error);
    res.status(500).json({ error: 'Erro ao buscar badges' });
  }
});

// Get user's earned badges
router.get('/earned', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id, b.name, b.description, b.icon_url, b.category, b.rarity,
        ub.earned_at, ub.earned_through
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `, [req.user.id]);

    res.json({ badges: result.rows });

  } catch (error) {
    console.error('Erro ao buscar badges do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar badges do usuário' });
  }
});

// Get badges by category
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    
    const result = await pool.query(`
      SELECT 
        id, name, description, icon_url, category, 
        requirement_type, requirement_value, rarity
      FROM badges
      WHERE category = $1
      ORDER BY rarity DESC, name ASC
    `, [category]);

    res.json({ badges: result.rows });

  } catch (error) {
    console.error('Erro ao buscar badges por categoria:', error);
    res.status(500).json({ error: 'Erro ao buscar badges por categoria' });
  }
});

// Get badge progress for authenticated user
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current stats
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM videos WHERE user_id = $1) as video_count,
        (SELECT COUNT(DISTINCT park_id) FROM videos WHERE user_id = $1 AND park_id IS NOT NULL) as parks_count,
        (SELECT COUNT(DISTINCT obstacle_id) FROM videos WHERE user_id = $1 AND obstacle_id IS NOT NULL) as obstacles_count
    `, [userId]);

    const stats = statsResult.rows[0];

    // Get all badges with progress
    const badgesResult = await pool.query(`
      SELECT 
        b.id, b.name, b.description, b.icon_url, b.category, 
        b.requirement_type, b.requirement_value, b.rarity,
        CASE 
          WHEN ub.user_id IS NOT NULL THEN true 
          ELSE false 
        END as earned,
        ub.earned_at
      FROM badges b
      LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
      ORDER BY 
        CASE b.rarity 
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          ELSE 4
        END,
        b.name ASC
    `, [userId]);

    // Calculate progress for each badge
    const badgesWithProgress = badgesResult.rows.map(badge => {
      let progress = 0;
      let currentValue = 0;

      switch (badge.requirement_type) {
        case 'count':
          if (badge.category === 'video_count') {
            currentValue = stats.video_count;
          } else if (badge.category === 'obstacle') {
            currentValue = stats.obstacles_count;
          }
          progress = Math.min((currentValue / badge.requirement_value) * 100, 100);
          break;
        case 'first_post':
          if (badge.category === 'park') {
            progress = stats.parks_count > 0 ? 100 : 0;
          } else if (badge.category === 'video_count') {
            progress = stats.video_count > 0 ? 100 : 0;
          }
          break;
      }

      return {
        ...badge,
        progress: Math.round(progress),
        current_value: currentValue
      };
    });

    res.json({ 
      badges: badgesWithProgress,
      user_stats: stats
    });

  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso dos badges' });
  }
});

router.post('/', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = badgeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO badges (name, description, icon_url, category, requirement_type, requirement_value, rarity)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, description, icon_url, category, requirement_type, requirement_value, rarity, created_at
      `,
      [
        value.name,
        value.description || null,
        value.icon_url || null,
        value.category,
        value.requirement_type,
        value.requirement_value ?? null,
        value.rarity ?? 'common',
      ],
    );

    res.status(201).json({ badge: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar badge:', err);
    res.status(500).json({ error: 'Erro ao criar badge' });
  }
});

router.put('/:id', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = badgeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `
        UPDATE badges
           SET name = $2,
               description = $3,
               icon_url = $4,
               category = $5,
               requirement_type = $6,
               requirement_value = $7,
               rarity = $8
         WHERE id = $1
     RETURNING id, name, description, icon_url, category, requirement_type, requirement_value, rarity, created_at
      `,
      [
        req.params.id,
        value.name,
        value.description || null,
        value.icon_url || null,
        value.category,
        value.requirement_type,
        value.requirement_value ?? null,
        value.rarity ?? 'common',
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Badge não encontrada' });
    }

    res.json({ badge: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar badge:', err);
    res.status(500).json({ error: 'Erro ao atualizar badge' });
  }
});

router.delete('/:id', authMiddleware, requireSuperModerator, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM badges WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Badge não encontrada' });
    }

    res.json({ message: 'Badge removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover badge:', error);
    res.status(500).json({ error: 'Erro ao remover badge' });
  }
});

// Award manual badge (for admin/curator use)
router.post('/award', authMiddleware, async (req, res) => {
  try {
    const { badgeId, userId, reason } = req.body;
    
    // In a real app, you'd check if the user is an admin/curator
    // For now, we'll just allow it for testing
    
    const badgeResult = await pool.query('SELECT id FROM badges WHERE id = $1', [badgeId]);
    if (badgeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Badge não encontrada' });
    }

    // Check if user already has this badge
    const existingBadge = await pool.query(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badgeId]
    );

    if (existingBadge.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já possui este badge' });
    }

    // Award badge
    await pool.query(
      'INSERT INTO user_badges (user_id, badge_id, earned_through) VALUES ($1, $2, $3)',
      [userId, badgeId, reason || 'manual_award']
    );

    // Create notification
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
      [userId, 'badge', 'Nova Conquista!', 'Você ganhou um novo badge especial']
    );

    res.json({ message: 'Badge concedida com sucesso' });

  } catch (error) {
    console.error('Erro ao conceder badge:', error);
    res.status(500).json({ error: 'Erro ao conceder badge' });
  }
});

module.exports = router;
