/**
 * Specialization System - RPG-style progression for wakeboard tricks
 *
 * Three specialization tracks:
 * - Slider Specialist (🛹): Rails and slider obstacles
 * - Kicker Specialist (🚀): Ramps and kickers
 * - Surface Specialist (🌊): Surface and air tricks
 *
 * Each specialization has 10 levels with exponential XP requirements
 * and provides multiplier bonuses for performing tricks in that specialization.
 */

const pool = require('../config/database');

// XP requirements for each level (1-10)
// Exponential progression with total of ~22,500 XP to reach level 10
const SPECIALIZATION_XP_TABLE = {
  1: 0,      // Starting level
  2: 500,    // Apprentice → Novice
  3: 1200,   // Novice → Intermediate
  4: 2100,   // Intermediate → Skilled
  5: 3200,   // Skilled → Advanced
  6: 4500,   // Advanced → Expert
  7: 6000,   // Expert → Master
  8: 8000,   // Master → Elite
  9: 10500,  // Elite → Champion
  10: 22500  // Champion → Legend (max level)
};

// Level titles for each specialization
const LEVEL_TITLES = {
  1: 'Aprendiz',      // Apprentice
  2: 'Novato',        // Novice
  3: 'Intermediário', // Intermediate
  4: 'Habilidoso',    // Skilled
  5: 'Avançado',      // Advanced
  6: 'Especialista',  // Expert
  7: 'Mestre',        // Master
  8: 'Elite',         // Elite
  9: 'Campeão',       // Champion
  10: 'Lenda'         // Legend
};

// Multipliers for each level (applied to trick XP when performing specialized tricks)
const LEVEL_MULTIPLIERS = {
  1: 1.0,    // No bonus at level 1
  2: 1.05,   // +5%
  3: 1.08,   // +8%
  4: 1.11,   // +11%
  5: 1.14,   // +14%
  6: 1.17,   // +17%
  7: 1.20,   // +20%
  8: 1.23,   // +23%
  9: 1.26,   // +26%
  10: 1.30   // +30% max bonus
};

// Specialization display info
const SPECIALIZATION_INFO = {
  slider: {
    name: 'Slider Specialist',
    emoji: '🛹',
    description: 'Master of rails and slider obstacles'
  },
  kicker: {
    name: 'Kicker Specialist',
    emoji: '🚀',
    description: 'Expert in ramps and kickers'
  },
  surface: {
    name: 'Surface Specialist',
    emoji: '🌊',
    description: 'Pro at surface tricks and air maneuvers'
  }
};

/**
 * Calculate which level a user should be based on total XP
 * @param {number} totalXP - Total XP earned in this specialization
 * @returns {number} - Current level (1-10)
 */
function calculateLevel(totalXP) {
  let level = 1;
  for (let lvl = 10; lvl >= 1; lvl--) {
    if (totalXP >= SPECIALIZATION_XP_TABLE[lvl]) {
      level = lvl;
      break;
    }
  }
  return level;
}

/**
 * Calculate current XP progress within the current level
 * @param {number} totalXP - Total XP earned
 * @param {number} currentLevel - Current level
 * @returns {Object} - { current, needed, percentage }
 */
function calculateLevelProgress(totalXP, currentLevel) {
  if (currentLevel >= 10) {
    return {
      current: totalXP - SPECIALIZATION_XP_TABLE[10],
      needed: 0,
      percentage: 100,
      isMaxLevel: true
    };
  }

  const currentLevelXP = SPECIALIZATION_XP_TABLE[currentLevel];
  const nextLevelXP = SPECIALIZATION_XP_TABLE[currentLevel + 1];
  const xpInCurrentLevel = totalXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  const percentage = Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);

  return {
    current: xpInCurrentLevel,
    needed: xpNeededForNextLevel,
    percentage: Math.round(percentage),
    isMaxLevel: false
  };
}

/**
 * Get multiplier for a specific level
 * @param {number} level - Current level (1-10)
 * @returns {number} - Multiplier (1.0 to 1.30)
 */
function getMultiplier(level) {
  return LEVEL_MULTIPLIERS[level] || 1.0;
}

/**
 * Get level title
 * @param {number} level - Current level (1-10)
 * @returns {string} - Level title
 */
function getLevelTitle(level) {
  return LEVEL_TITLES[level] || 'Desconhecido';
}

/**
 * Get specialization info
 * @param {string} type - Specialization type (slider/kicker/surface)
 * @returns {Object} - Specialization info
 */
function getSpecializationInfo(type) {
  return SPECIALIZATION_INFO[type] || { name: 'Unknown', emoji: '❓', description: '' };
}

/**
 * Initialize specializations for a new user
 * @param {string} userId - User UUID
 */
async function initializeUserSpecializations(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const specializations = ['slider', 'kicker', 'surface'];
    for (const type of specializations) {
      await client.query(`
        INSERT INTO user_specializations (user_id, specialization_type, level, xp_current, xp_total, tricks_completed)
        VALUES ($1, $2, 1, 0, 0, 0)
        ON CONFLICT (user_id, specialization_type) DO NOTHING
      `, [userId, type]);
    }

    await client.query('COMMIT');
    console.log(`✅ Specializations initialized for user ${userId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing specializations:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Award specialization XP to a user
 * @param {string} userId - User UUID
 * @param {string} specializationType - Type (slider/kicker/surface)
 * @param {number} baseXP - Base XP from the trick
 * @param {string} trickId - Trick UUID
 * @returns {Object} - Updated specialization data with level changes
 */
async function awardSpecializationXP(userId, specializationType, baseXP, trickId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current specialization data
    const specResult = await client.query(`
      SELECT * FROM user_specializations
      WHERE user_id = $1 AND specialization_type = $2
    `, [userId, specializationType]);

    if (specResult.rows.length === 0) {
      // Initialize if doesn't exist
      await initializeUserSpecializations(userId);
      return awardSpecializationXP(userId, specializationType, baseXP, trickId);
    }

    const spec = specResult.rows[0];
    const currentLevel = spec.level;
    const currentMultiplier = getMultiplier(currentLevel);

    // Calculate XP to award (base XP × current multiplier)
    const xpToAward = Math.round(baseXP * currentMultiplier);

    // Calculate new totals
    const newXPTotal = spec.xp_total + xpToAward;
    const newLevel = calculateLevel(newXPTotal);
    const newXPCurrent = newXPTotal - SPECIALIZATION_XP_TABLE[newLevel];

    // Check if this is their best trick in this specialization
    const isBestTrick = xpToAward > (spec.best_trick_xp || 0);

    // Update specialization
    await client.query(`
      UPDATE user_specializations
      SET
        level = $1,
        xp_current = $2,
        xp_total = $3,
        tricks_completed = tricks_completed + 1,
        best_trick_id = CASE WHEN $4 THEN $5 ELSE best_trick_id END,
        best_trick_xp = CASE WHEN $4 THEN $6 ELSE best_trick_xp END,
        updated_at = NOW()
      WHERE user_id = $7 AND specialization_type = $8
    `, [
      newLevel,
      newXPCurrent,
      newXPTotal,
      isBestTrick,
      trickId,
      xpToAward,
      userId,
      specializationType
    ]);

    await client.query('COMMIT');

    const leveledUp = newLevel > currentLevel;
    const progress = calculateLevelProgress(newXPTotal, newLevel);

    return {
      specializationType,
      xpAwarded: xpToAward,
      multiplier: currentMultiplier,
      level: newLevel,
      levelTitle: getLevelTitle(newLevel),
      xpTotal: newXPTotal,
      progress,
      leveledUp,
      previousLevel: currentLevel,
      tricksCompleted: spec.tricks_completed + 1,
      isBestTrick
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error awarding specialization XP:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get user's specializations with detailed info
 * @param {string} userId - User UUID
 * @returns {Array} - Array of specialization objects
 */
async function getUserSpecializations(userId) {
  try {
    const result = await pool.query(`
      SELECT
        us.*,
        t.nome as best_trick_name
      FROM user_specializations us
      LEFT JOIN tricks t ON us.best_trick_id = t.id
      WHERE us.user_id = $1
      ORDER BY us.specialization_type
    `, [userId]);

    return result.rows.map(spec => {
      const info = getSpecializationInfo(spec.specialization_type);
      const progress = calculateLevelProgress(spec.xp_total, spec.level);
      const multiplier = getMultiplier(spec.level);

      return {
        id: spec.id,
        type: spec.specialization_type,
        name: info.name,
        emoji: info.emoji,
        description: info.description,
        level: spec.level,
        levelTitle: getLevelTitle(spec.level),
        xpTotal: spec.xp_total,
        progress,
        multiplier,
        tricksCompleted: spec.tricks_completed,
        bestTrick: {
          id: spec.best_trick_id,
          name: spec.best_trick_name,
          xp: spec.best_trick_xp
        },
        createdAt: spec.created_at,
        updatedAt: spec.updated_at
      };
    });
  } catch (error) {
    console.error('Error getting user specializations:', error);
    throw error;
  }
}

/**
 * Get specialization leaderboard
 * @param {string} specializationType - Type (slider/kicker/surface)
 * @param {number} limit - Number of results to return
 * @returns {Array} - Top users in this specialization
 */
async function getSpecializationLeaderboard(specializationType, limit = 10) {
  try {
    const result = await pool.query(`
      SELECT
        us.user_id,
        u.username,
        u.profile_image_url,
        us.level,
        us.xp_total,
        us.tricks_completed,
        us.best_trick_xp
      FROM user_specializations us
      JOIN users u ON us.user_id = u.id
      WHERE us.specialization_type = $1
      ORDER BY us.level DESC, us.xp_total DESC
      LIMIT $2
    `, [specializationType, limit]);

    return result.rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      profileImage: row.profile_image_url,
      level: row.level,
      levelTitle: getLevelTitle(row.level),
      xpTotal: row.xp_total,
      tricksCompleted: row.tricks_completed,
      bestTrickXP: row.best_trick_xp
    }));
  } catch (error) {
    console.error('Error getting specialization leaderboard:', error);
    throw error;
  }
}

module.exports = {
  SPECIALIZATION_XP_TABLE,
  LEVEL_TITLES,
  LEVEL_MULTIPLIERS,
  SPECIALIZATION_INFO,
  calculateLevel,
  calculateLevelProgress,
  getMultiplier,
  getLevelTitle,
  getSpecializationInfo,
  initializeUserSpecializations,
  awardSpecializationXP,
  getUserSpecializations,
  getSpecializationLeaderboard
};
