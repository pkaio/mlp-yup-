const pool = require('../config/database');

const SOPHISTICATION_LEVELS = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  PRO: 'PRO'
};

const SOPHISTICATION_THRESHOLDS = {
  INTERMEDIATE: 50,
  ADVANCED: 150,
  PRO: 300
};

async function calculateSophisticationScore(userId) {
  const client = await pool.connect();
  try {
    const metricsQuery = `
      SELECT
        COUNT(DISTINCT v.id) as uploads,
        COUNT(DISTINCT v.trick_id) as maneuver_variety,
        COUNT(DISTINCT v.park_id) as parks_visited,
        COUNT(DISTINCT CASE WHEN v.metrics IS NOT NULL AND v.metrics != '[]'::jsonb THEN v.id END) as detailed_uploads,
        COUNT(DISTINCT CASE WHEN v.thumbnail_url IS NOT NULL AND v.thumbnail_url != '' THEN v.id END) as edited_videos,
        COUNT(DISTINCT cc.challenge_id) as challenges_completed,
        COALESCE(MAX(u.level), 1) as user_level
      FROM users u
      LEFT JOIN videos v ON v.user_id = u.id
      LEFT JOIN user_challenge_completions cc ON cc.user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id
    `;
    const result = await client.query(metricsQuery, [userId]);
    if (result.rows.length === 0) {
      return { score: 0, level: SOPHISTICATION_LEVELS.BEGINNER, metrics: {} };
    }
    const metrics = result.rows[0];
    const score = (parseInt(metrics.uploads) * 2) + (parseInt(metrics.maneuver_variety) * 5) +
                  (parseInt(metrics.parks_visited) * 3) + (parseInt(metrics.detailed_uploads) * 4) +
                  (parseInt(metrics.edited_videos) * 4) + (parseInt(metrics.challenges_completed) * 6) +
                  (parseInt(metrics.user_level) * 1.5);
    let level;
    if (score < SOPHISTICATION_THRESHOLDS.INTERMEDIATE) level = SOPHISTICATION_LEVELS.BEGINNER;
    else if (score < SOPHISTICATION_THRESHOLDS.ADVANCED) level = SOPHISTICATION_LEVELS.INTERMEDIATE;
    else if (score < SOPHISTICATION_THRESHOLDS.PRO) level = SOPHISTICATION_LEVELS.ADVANCED;
    else level = SOPHISTICATION_LEVELS.PRO;
    return {
      score: Math.round(score),
      level,
      metrics: {
        uploads: parseInt(metrics.uploads),
        maneuverVariety: parseInt(metrics.maneuver_variety),
        parksVisited: parseInt(metrics.parks_visited),
        detailedUploads: parseInt(metrics.detailed_uploads),
        editedVideos: parseInt(metrics.edited_videos),
        challengesCompleted: parseInt(metrics.challenges_completed),
        userLevel: parseInt(metrics.user_level)
      }
    };
  } finally {
    client.release();
  }
}

function getSophisticationFeatures(level) {
  const featureMap = {
    [SOPHISTICATION_LEVELS.BEGINNER]: {
      features: ['quick_upload', 'basic_xp_view', 'challenge_upload', 'preset_maneuvers'],
      uploadFlow: 'quick', xpDisplay: 'simple', showAdvancedFeatures: false,
      showXpBreakdown: false, showComboHistory: false, showGlobalProgress: false,
      enableVideoEditing: false, maxManeuverComplexity: 'basic'
    },
    [SOPHISTICATION_LEVELS.INTERMEDIATE]: {
      features: ['quick_upload', 'manual_upload', 'detailed_xp_view', 'challenge_upload', 'preset_maneuvers', 'custom_maneuvers', 'basic_video_editing'],
      uploadFlow: 'choice', xpDisplay: 'expandable', showAdvancedFeatures: true,
      showXpBreakdown: true, showComboHistory: true, showGlobalProgress: false,
      enableVideoEditing: true, maxManeuverComplexity: 'intermediate'
    },
    [SOPHISTICATION_LEVELS.ADVANCED]: {
      features: ['quick_upload', 'manual_upload', 'detailed_xp_view', 'challenge_upload', 'preset_maneuvers', 'custom_maneuvers', 'advanced_video_editing', 'xp_analytics', 'combo_tracker'],
      uploadFlow: 'advanced', xpDisplay: 'detailed', showAdvancedFeatures: true,
      showXpBreakdown: true, showComboHistory: true, showGlobalProgress: true,
      enableVideoEditing: true, maxManeuverComplexity: 'advanced'
    },
    [SOPHISTICATION_LEVELS.PRO]: {
      features: ['quick_upload', 'manual_upload', 'detailed_xp_view', 'challenge_upload', 'preset_maneuvers', 'custom_maneuvers', 'advanced_video_editing', 'xp_analytics', 'combo_tracker', 'global_leaderboard', 'achievement_dashboard', 'create_challenges'],
      uploadFlow: 'pro', xpDisplay: 'full', showAdvancedFeatures: true,
      showXpBreakdown: true, showComboHistory: true, showGlobalProgress: true,
      enableVideoEditing: true, maxManeuverComplexity: 'pro'
    }
  };
  return featureMap[level] || featureMap[SOPHISTICATION_LEVELS.BEGINNER];
}

async function getUserSophisticationConfig(userId) {
  const { score, level, metrics } = await calculateSophisticationScore(userId);
  const features = getSophisticationFeatures(level);
  let nextLevel = null, pointsToNextLevel = null;
  if (level === SOPHISTICATION_LEVELS.BEGINNER) {
    nextLevel = SOPHISTICATION_LEVELS.INTERMEDIATE;
    pointsToNextLevel = SOPHISTICATION_THRESHOLDS.INTERMEDIATE - score;
  } else if (level === SOPHISTICATION_LEVELS.INTERMEDIATE) {
    nextLevel = SOPHISTICATION_LEVELS.ADVANCED;
    pointsToNextLevel = SOPHISTICATION_THRESHOLDS.ADVANCED - score;
  } else if (level === SOPHISTICATION_LEVELS.ADVANCED) {
    nextLevel = SOPHISTICATION_LEVELS.PRO;
    pointsToNextLevel = SOPHISTICATION_THRESHOLDS.PRO - score;
  }
  return {
    level, score, features: features.features,
    config: {
      uploadFlow: features.uploadFlow, xpDisplay: features.xpDisplay,
      showAdvancedFeatures: features.showAdvancedFeatures,
      showXpBreakdown: features.showXpBreakdown,
      showComboHistory: features.showComboHistory,
      showGlobalProgress: features.showGlobalProgress,
      enableVideoEditing: features.enableVideoEditing,
      maxManeuverComplexity: features.maxManeuverComplexity
    },
    nextLevel: nextLevel ? { level: nextLevel, pointsRequired: pointsToNextLevel } : null,
    metrics
  };
}

async function updateUserSophistication(userId) {
  const { level } = await calculateSophisticationScore(userId);
  const client = await pool.connect();
  try {
    await client.query('UPDATE users SET sophistication_level = $1 WHERE id = $2', [level, userId]);
    return level;
  } finally {
    client.release();
  }
}

module.exports = {
  SOPHISTICATION_LEVELS,
  SOPHISTICATION_THRESHOLDS,
  calculateSophisticationScore,
  getSophisticationFeatures,
  getUserSophisticationConfig,
  updateUserSophistication
};
