const pool = require('../config/database');

// Check and award badges based on user actions
async function checkAndAwardBadges(userId, action) {
  try {
    const { type, videoId, parkId, obstacleId } = action;

    switch (type) {
      case 'video_upload':
        await checkVideoCountBadges(userId);
        if (parkId) await checkParkBadges(userId, parkId);
        if (obstacleId) await checkObstacleBadges(userId, obstacleId);
        break;
      
      case 'like_received':
        await checkLikeBasedBadges(userId);
        break;
      
      case 'checkin':
        if (parkId) await checkParkBadges(userId, parkId);
        break;
    }

  } catch (error) {
    console.error('Erro ao verificar badges:', error);
  }
}

// Check video count badges
async function checkVideoCountBadges(userId) {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM videos WHERE user_id = $1', [userId]);
    const videoCount = parseInt(result.rows[0].count);

    const milestones = [1, 5, 10, 25];
    const badgeNames = {
      1: 'Primeiro Post',
      5: 'Wakeboarder Ativo', 
      10: 'Produtor de Conteúdo',
      25: 'Influencer Wakeboard'
    };

    for (const milestone of milestones) {
      if (videoCount >= milestone) {
        await awardBadgeIfNotExists(userId, badgeNames[milestone], 'video_count');
      }
    }

  } catch (error) {
    console.error('Erro ao verificar badges de contagem:', error);
  }
}

// Check park badges
async function checkParkBadges(userId, parkId) {
  try {
    const parkResult = await pool.query('SELECT name FROM parks WHERE id = $1', [parkId]);
    if (parkResult.rows.length === 0) return;

    const parkName = parkResult.rows[0].name;
    let badgeName = '';

    if (parkName.includes('Naga')) badgeName = 'Visitante Naga';
    else if (parkName.includes('Sunset')) badgeName = 'Visitante Sunset';
    else if (parkName.includes('CBL')) badgeName = 'Visitante CBL';

    if (badgeName) {
      await awardBadgeIfNotExists(userId, badgeName, 'park', parkId);
    }

  } catch (error) {
    console.error('Erro ao verificar badges de parque:', error);
  }
}

// Check obstacle badges
async function checkObstacleBadges(userId, obstacleId) {
  try {
    // Get user's unique obstacles
    const result = await pool.query(
      'SELECT COUNT(DISTINCT obstacle_id) as count FROM videos WHERE user_id = $1 AND obstacle_id IS NOT NULL',
      [userId]
    );
    const uniqueObstacles = parseInt(result.rows[0].count);

    // Award badges based on unique obstacles
    if (uniqueObstacles >= 3) {
      await awardBadgeIfNotExists(userId, 'Slider Pro', 'obstacle');
    }
    if (uniqueObstacles >= 5) {
      await awardBadgeIfNotExists(userId, 'Rail Master', 'obstacle');
    }

    // Check specific obstacle type
    const obstacleResult = await pool.query('SELECT type, name FROM obstacles WHERE id = $1', [obstacleId]);
    if (obstacleResult.rows.length > 0) {
      const { type, name } = obstacleResult.rows[0];
      
      if (type === 'kicker' && name.includes('Pequeno')) {
        await awardBadgeIfNotExists(userId, 'Kicker Iniciante', 'obstacle', obstacleId);
      }
    }

  } catch (error) {
    console.error('Erro ao verificar badges de obstáculo:', error);
  }
}

// Check like-based badges
async function checkLikeBasedBadges(userId) {
  try {
    const result = await pool.query(`
      SELECT SUM(likes_count) as total_likes 
      FROM videos 
      WHERE user_id = $1
    `, [userId]);
    
    const totalLikes = parseInt(result.rows[0].total_likes) || 0;

    // Award badges for like milestones
    if (totalLikes >= 100) {
      await awardBadgeIfNotExists(userId, 'Popular', 'engagement');
    }
    if (totalLikes >= 500) {
      await awardBadgeIfNotExists(userId, 'Estrela do Wake', 'engagement');
    }

  } catch (error) {
    console.error('Erro ao verificar badges de curtidas:', error);
  }
}

// Award badge if user doesn't already have it
async function awardBadgeIfNotExists(userId, badgeName, category, referenceId = null) {
  try {
    // Check if badge exists
    const badgeResult = await pool.query(
      'SELECT id FROM badges WHERE name = $1',
      [badgeName]
    );

    if (badgeResult.rows.length === 0) {
      console.log(`Badge não encontrada: ${badgeName}`);
      return;
    }

    const badgeId = badgeResult.rows[0].id;

    // Check if user already has this badge
    const existingResult = await pool.query(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badgeId]
    );

    if (existingResult.rows.length > 0) {
      return; // Already has the badge
    }

    // Award the badge
    await pool.query(
      'INSERT INTO user_badges (user_id, badge_id, earned_through) VALUES ($1, $2, $3)',
      [userId, badgeId, referenceId]
    );

    // Create notification
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5)',
      [
        userId, 
        'badge', 
        'Nova Conquista!', 
        `Você ganhou o badge: ${badgeName}`,
        JSON.stringify({ badge_id: badgeId, category: category })
      ]
    );

    console.log(`Badge concedida: ${badgeName} para usuário ${userId}`);

  } catch (error) {
    console.error('Erro ao conceder badge:', error);
  }
}

// Get user's badge statistics
async function getUserBadgeStats(userId) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_badges,
        COUNT(CASE WHEN b.rarity = 'legendary' THEN 1 END) as legendary_count,
        COUNT(CASE WHEN b.rarity = 'epic' THEN 1 END) as epic_count,
        COUNT(CASE WHEN b.rarity = 'rare' THEN 1 END) as rare_count,
        COUNT(CASE WHEN b.rarity = 'common' THEN 1 END) as common_count
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
    `, [userId]);

    return result.rows[0];

  } catch (error) {
    console.error('Erro ao buscar estatísticas de badges:', error);
    return null;
  }
}

// Get recent badge awards
async function getRecentBadgeAwards(limit = 10) {
  try {
    const result = await pool.query(`
      SELECT 
        ub.earned_at,
        b.name as badge_name, b.icon_url, b.rarity,
        u.username, u.full_name, u.profile_image_url
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      JOIN users u ON ub.user_id = u.id
      ORDER BY ub.earned_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;

  } catch (error) {
    console.error('Erro ao buscar conquistas recentes:', error);
    return [];
  }
}

module.exports = {
  checkAndAwardBadges,
  getUserBadgeStats,
  getRecentBadgeAwards
};
