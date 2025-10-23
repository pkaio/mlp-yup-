const express = require('express');
const pool = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const expSystem = require('../utils/expSystem');

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const router = express.Router();

const toInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Get recent users
router.get('/recent', optionalAuth, async (req, res) => {
  try {
    const limitParam = req.query.limit;
    const limit = Number.isInteger(Number(limitParam)) && Number(limitParam) > 0
      ? Math.min(Number(limitParam), 20)
      : 6;

    const result = await pool.query(
      `
      SELECT id, username, full_name, profile_image_url, created_at
      FROM users
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit],
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Erro ao listar usuários recentes:', error);
    res.status(500).json({ error: 'Erro ao listar usuários recentes' });
  }
});

// XP leaderboard
router.get('/xp/leaderboard', optionalAuth, async (req, res) => {
  try {
    const limitParam = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;

    const result = await pool.query(
      `
        SELECT id, username, full_name, profile_image_url,
               xp_total, xp_current, level, created_at
          FROM users
         WHERE is_active = true
         ORDER BY xp_total DESC, created_at ASC
         LIMIT $1
      `,
      [limit],
    );

    let rank = 1;
    const leaderboard = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      full_name: row.full_name,
      profile_image_url: row.profile_image_url,
      xp_total: Number(row.xp_total ?? 0),
      xp_current: Number(row.xp_current ?? 0),
      level: Number(row.level ?? 1),
      rank: rank++,
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    res.status(500).json({ error: 'Erro ao buscar leaderboard' });
  }
});

// Get user profile
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    if (!isUuid(userId)) {
      return res.status(400).json({ error: 'ID de usuário inválido' });
    }

    const userResult = await pool.query(`
      SELECT 
        id, username, full_name, bio, profile_image_url, created_at,
        xp_total, xp_current, level
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userRow = userResult.rows[0];
    const xpSnapshot = expSystem.getXpSnapshot({
      total: userRow.xp_total,
      current: userRow.xp_current,
      level: userRow.level,
    });

    const user = {
      id: userRow.id,
      username: userRow.username,
      full_name: userRow.full_name,
      bio: userRow.bio,
      profile_image_url: userRow.profile_image_url,
      created_at: userRow.created_at,
    };

    // Get user stats
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM videos WHERE user_id = $1) as videos_count,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = $1) as badges_count,
        (SELECT COUNT(*) FROM likes l JOIN videos v ON l.video_id = v.id WHERE v.user_id = $1) as total_likes_received,
        (SELECT COUNT(*) FROM checkins WHERE user_id = $1) as total_checkins,
        (SELECT COUNT(DISTINCT park_id) FROM videos WHERE user_id = $1 AND park_id IS NOT NULL) as parks_visited,
        (SELECT COUNT(DISTINCT obstacle_id) FROM videos WHERE user_id = $1 AND obstacle_id IS NOT NULL) as obstacles_ridden
    `, [userId]);

    const rawStats = statsResult.rows[0] || {};
    const videosCount = toInt(rawStats.videos_count);
    const badgesCount = toInt(rawStats.badges_count);

    user.stats = {
      videos_count: videosCount,
      badges_count: badgesCount,
      total_videos: videosCount,
      total_badges: badgesCount,
      total_likes_received: toInt(rawStats.total_likes_received),
      total_checkins: toInt(rawStats.total_checkins),
      parks_visited: toInt(rawStats.parks_visited),
      obstacles_ridden: toInt(rawStats.obstacles_ridden),
      xp_total: xpSnapshot.total,
      xp_current: xpSnapshot.current,
      level: xpSnapshot.level,
      xp_next: xpSnapshot.next,
      xp_target: xpSnapshot.next,
      xp_remaining: xpSnapshot.remaining,
      xp_progress: xpSnapshot.progress,
      xp_cap: xpSnapshot.cap,
      xp_max_level: xpSnapshot.maxLevel,
      xp: xpSnapshot,
    };

    const socialResult = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM follows WHERE following_id = $1) AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1) AS following_count
      `,
      [userId]
    );

    const social = socialResult.rows[0];
    user.followers_count = parseInt(social.followers_count ?? 0, 10);
    user.following_count = parseInt(social.following_count ?? 0, 10);

    if (req.user) {
      const followCheck = await pool.query(
        'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1',
        [req.user.id, userId]
      );
      user.is_following = followCheck.rows.length > 0;
    } else {
      user.is_following = false;
    }

    // Get recent badges
    const badgesResult = await pool.query(`
      SELECT 
        b.id, b.name, b.description, b.icon_url, b.rarity,
        ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
      LIMIT 6
    `, [userId]);

    user.recent_badges = badgesResult.rows;

    res.json({ user });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Get user's badges (passaporte)
router.get('/:id/badges', async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await pool.query(`
      SELECT 
        b.id, b.name, b.description, b.icon_url, b.category, b.rarity,
        ub.earned_at, ub.earned_through
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY 
        CASE b.rarity 
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          ELSE 4
        END,
        ub.earned_at DESC
    `, [userId]);

    // Group badges by category
    const badgesByCategory = result.rows.reduce((acc, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = [];
      }
      acc[badge.category].push(badge);
      return acc;
    }, {});

    res.json({ 
      badges: result.rows,
      badges_by_category: badgesByCategory
    });

  } catch (error) {
    console.error('Erro ao buscar badges:', error);
    res.status(500).json({ error: 'Erro ao buscar badges' });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT id, username, full_name, profile_image_url
      FROM users
      WHERE (username ILIKE $1 OR full_name ILIKE $1)
        AND is_active = true
      ORDER BY username ASC
      LIMIT $2 OFFSET $3
    `, [`%${query}%`, limit, offset]);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === limit
      }
    });

  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Get user stats
router.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await pool.query(`
      SELECT 
        u.xp_total,
        u.xp_current,
        u.level,
        (SELECT COUNT(*) FROM videos WHERE user_id = $1) as total_videos,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = $1) as total_badges,
        (SELECT COUNT(*) FROM likes l JOIN videos v ON l.video_id = v.id WHERE v.user_id = $1) as total_likes_received,
        (SELECT COUNT(*) FROM checkins WHERE user_id = $1) as total_checkins,
        (SELECT COUNT(DISTINCT park_id) FROM videos WHERE user_id = $1 AND park_id IS NOT NULL) as parks_visited,
        (SELECT COUNT(DISTINCT obstacle_id) FROM videos WHERE user_id = $1 AND obstacle_id IS NOT NULL) as obstacles_ridden
      FROM users u
     WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const row = result.rows[0];
    const xpSnapshot = expSystem.getXpSnapshot({
      total: row.xp_total,
      current: row.xp_current,
      level: row.level,
    });

    const totalVideos = toInt(row.total_videos);
    const totalBadges = toInt(row.total_badges);

    const stats = {
      total_videos: totalVideos,
      videos_count: totalVideos,
      total_badges: totalBadges,
      badges_count: totalBadges,
      total_likes_received: toInt(row.total_likes_received),
      total_checkins: toInt(row.total_checkins),
      parks_visited: toInt(row.parks_visited),
      obstacles_ridden: toInt(row.obstacles_ridden),
      xp_total: xpSnapshot.total,
      xp_current: xpSnapshot.current,
      level: xpSnapshot.level,
      xp_next: xpSnapshot.next,
      xp_target: xpSnapshot.next,
      xp_remaining: xpSnapshot.remaining,
      xp_progress: xpSnapshot.progress,
      xp_cap: xpSnapshot.cap,
      xp_max_level: xpSnapshot.maxLevel,
      xp: xpSnapshot,
    };

    res.json({ stats });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// XP log (recent combos)
router.get('/:id/xp-log', async (req, res) => {
  try {
    const userId = req.params.id;
    const limitParam = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;

    const result = await pool.query(
      `
        SELECT exp_awarded, breakdown, created_at, video_id
          FROM user_exp_log
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2
      `,
      [userId, limit],
    );

    const log = result.rows.map((row) => ({
      exp_awarded: Number(row.exp_awarded ?? 0),
      breakdown: row.breakdown ?? {},
      created_at: row.created_at,
      video_id: row.video_id,
    }));

    res.json({ log });
  } catch (error) {
    console.error('Erro ao buscar histórico de XP:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de XP' });
  }
});

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB UTF-8 payload limit

// Update profile image (placeholder for now)
router.put('/profile-image', authMiddleware, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      return res.status(400).json({ error: 'Imagem inválida fornecida' });
    }

    const normalizedImage = imageUrl.trim();
    const payloadSize = Buffer.byteLength(normalizedImage, 'utf8');

    if (payloadSize > MAX_PROFILE_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Imagem muito grande. Envie uma imagem com até 5MB.' });
    }

    await pool.query(
      'UPDATE users SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [normalizedImage, req.user.id]
    );

    res.json({
      message: 'Imagem de perfil atualizada com sucesso',
      imageUrl: normalizedImage
    });

  } catch (error) {
    console.error('Erro ao atualizar imagem:', error);
    res.status(500).json({ error: 'Erro ao atualizar imagem de perfil' });
  }
});

// Follow user
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Você não pode seguir você mesmo.' });
    }

    const userResult = await pool.query('SELECT id FROM users WHERE id = $1 AND is_active = true', [targetUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, targetUserId]
    );

    res.json({ message: 'Agora você segue este usuário.' });
  } catch (error) {
    console.error('Erro ao seguir usuário:', error);
    res.status(500).json({ error: 'Erro ao seguir usuário' });
  }
});

// Unfollow user
router.delete('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;

    const userResult = await pool.query('SELECT id FROM users WHERE id = $1 AND is_active = true', [targetUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, targetUserId]
    );

    res.json({ message: 'Você deixou de seguir este usuário.' });
  } catch (error) {
    console.error('Erro ao deixar de seguir usuário:', error);
    res.status(500).json({ error: 'Erro ao deixar de seguir usuário' });
  }
});

// List followers of a user
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const userResult = await pool.query('SELECT id FROM users WHERE id = $1 AND is_active = true', [targetUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const followersResult = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.profile_image_url,
        EXISTS(
          SELECT 1 FROM follows f2 WHERE f2.follower_id = $1 AND f2.following_id = u.id
        ) AS is_following
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $2
      ORDER BY f.created_at DESC
      LIMIT $3 OFFSET $4
      `,
      [req.user?.id ?? null, targetUserId, limit, offset]
    );

    const followers = followersResult.rows.map((row) => ({
      id: row.id,
      username: row.username,
      full_name: row.full_name,
      profile_image_url: row.profile_image_url,
      is_following: row.is_following ?? false,
    }));

    res.json({
      followers,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        hasMore: followers.length === parseInt(limit, 10),
      },
    });
  } catch (error) {
    console.error('Erro ao listar seguidores:', error);
    res.status(500).json({ error: 'Erro ao listar seguidores' });
  }
});

// List following users
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const userResult = await pool.query('SELECT id FROM users WHERE id = $1 AND is_active = true', [targetUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const followingResult = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.profile_image_url,
        EXISTS(
          SELECT 1 FROM follows f2 WHERE f2.follower_id = $1 AND f2.following_id = u.id
        ) AS is_following
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $2
      ORDER BY f.created_at DESC
      LIMIT $3 OFFSET $4
      `,
      [req.user?.id ?? null, targetUserId, limit, offset]
    );

    const following = followingResult.rows.map((row) => ({
      id: row.id,
      username: row.username,
      full_name: row.full_name,
      profile_image_url: row.profile_image_url,
      is_following: row.is_following ?? false,
    }));

    res.json({
      following,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        hasMore: following.length === parseInt(limit, 10),
      },
    });
  } catch (error) {
    console.error('Erro ao listar seguindo:', error);
    res.status(500).json({ error: 'Erro ao listar seguindo' });
  }
});

module.exports = router;
