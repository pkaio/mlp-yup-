const pool = require('../config/database');
const { calculateVideoXP } = require('./expSystem');
const { updateUserSpecializationXP } = require('./specializationSystem');

const normalizeNodeStatus = (node) => {
  if (!node || node.status !== 'locked') {
    return node?.status || 'locked';
  }

  const prerequisites = Array.isArray(node.prerequisites)
    ? node.prerequisites
    : [];

  if (node.tier === 1) {
    return 'available';
  }

  if (prerequisites.length === 0) {
    return 'available';
  }

  return 'locked';
};

/**
 * SKILL TREE / QUEST SYSTEM
 *
 * This module handles the gamified quest/skill tree progression system.
 * It manages quest unlocks, completions, evolution tracking, and XP rewards.
 */

// ============================================
// TREE MANAGEMENT
// ============================================

/**
 * Get user's skill tree for a specific specialization
 * Returns all nodes with their unlock status and progress
 * TIER-BASED VIEW (legacy)
 */
async function getUserSkillTree(userId, specialization) {
  try {
    const buildTierQuery = (includeComponentPayload) => {
      const trickPayloadColumn = includeComponentPayload
        ? ',\n        t.component_payload as trick_component_payload'
        : '';

      return `
        SELECT
          stn.id,
          stn.specialization,
          stn.tier,
          stn.position,
          stn.branch_type,
          stn.display_row,
          stn.merge_left_node_id,
          stn.merge_right_node_id,
          stn.is_shared_node,
          stn.title,
          stn.description,
          stn.trick_id,
          stn.tutorial_video_url,
          stn.tips,
          stn.common_mistakes,
          stn.prerequisites,
          stn.required_for_unlock,
          stn.xp_bonus,
          stn.badge_reward,
          stn.repeatable,

          -- Get trick info
          t.nome as trick_name,
          t.nome_curto as trick_short_name,
          t.nivel as trick_difficulty
          ${trickPayloadColumn},

          -- User progress for this node
          COALESCE(usp.status, 'locked') as status,
          COALESCE(usp.times_completed, 0) as times_completed,
          usp.first_completed_at,
          usp.last_completed_at,
          usp.best_video_id,
          usp.best_video_xp

        FROM skill_tree_nodes stn
        LEFT JOIN tricks t ON t.id = stn.trick_id
        LEFT JOIN user_skill_progress usp ON usp.node_id = stn.id AND usp.user_id = $1
        WHERE stn.specialization = $2
        ORDER BY stn.tier ASC, stn.position ASC
      `;
    };

    let result;
    try {
      result = await pool.query(buildTierQuery(true), [userId, specialization]);
    } catch (error) {
      if (error?.code === '42703') {
        console.warn('[skillTree] component_payload missing in DB schema. Falling back (tier view).');
        result = await pool.query(buildTierQuery(false), [userId, specialization]);
      } else {
        throw error;
      }
    }

    // Group by tiers for easier frontend rendering
    const tiers = {};
    const specializationManeuverMap = {
      slider: 'rail',
      kicker: 'kicker',
      surface: 'surface',
    };

    result.rows.forEach((node) => {
      if (!tiers[node.tier]) {
        tiers[node.tier] = [];
      }

      const maneuverPayload = node.trick_component_payload || null;

      tiers[node.tier].push({
        id: node.id,
        specialization: node.specialization,
        tier: node.tier,
        position: node.position,
        branchType: node.branch_type,
        displayRow: node.display_row,
        mergeLeftNodeId: node.merge_left_node_id,
        mergeRightNodeId: node.merge_right_node_id,
        isSharedNode: node.is_shared_node,
        title: node.title,
        description: node.description,

        trick: node.trick_id ? {
          id: node.trick_id,
          name: node.trick_name,
          shortName: node.trick_short_name,
          difficulty: node.trick_difficulty,
          componentPayload: maneuverPayload,
        } : null,

        maneuverPayload,
        maneuverType: specializationManeuverMap[node.specialization] || null,

        educational: {
          tutorialVideoUrl: node.tutorial_video_url,
          tips: node.tips || [],
          commonMistakes: node.common_mistakes || []
        },

        requirements: {
          prerequisites: node.prerequisites || [],
          requiredForUnlock: node.required_for_unlock
        },

        rewards: {
          xpBonus: node.xp_bonus,
          badge: node.badge_reward
        },

        repeatable: node.repeatable,

        userProgress: {
          status: normalizeNodeStatus(node),
          timesCompleted: node.times_completed,
          firstCompletedAt: node.first_completed_at,
          lastCompletedAt: node.last_completed_at,
          bestVideoId: node.best_video_id,
          bestVideoXP: node.best_video_xp
        }
      });
    });

    return {
      specialization,
      tiers,
      totalNodes: result.rows.length,
      completedNodes: result.rows.filter(n => n.status === 'completed').length
    };

  } catch (error) {
    console.error('Error getting user skill tree:', error);
    throw error;
  }
}

/**
 * Get user's skill tree in GRID layout
 * Returns nodes organized by rows and columns (SPIN | MERGE | OLLIE)
 * Designed for the 3-column grid UI
 */
async function getUserSkillTreeGrid(userId, specialization) {
  try {
    const buildGridQuery = (includeComponentPayload) => {
      const trickPayloadColumn = includeComponentPayload
        ? ',\n        t.component_payload as trick_component_payload'
        : '';

      return `
        SELECT
          stn.id,
          stn.specialization,
          stn.tier,
          stn.branch_type,
          stn.display_row,
          stn.position,
          stn.title,
          stn.description,
          stn.trick_id,
          stn.tutorial_video_url,
          stn.tips,
          stn.common_mistakes,
          stn.prerequisites,
          stn.required_for_unlock,
          stn.xp_bonus,
          stn.badge_reward,
          stn.repeatable,
          stn.is_shared_node,
          stn.merge_left_node_id,
          stn.merge_right_node_id,

          -- Get trick info
          t.nome as trick_name,
          t.nome_curto as trick_short_name,
          t.nivel as trick_difficulty
          ${trickPayloadColumn},

          -- User progress for this node
          COALESCE(usp.status, 'locked') as status,
          COALESCE(usp.times_completed, 0) as times_completed,
          usp.first_completed_at,
          usp.last_completed_at,
          usp.best_video_id,
          usp.best_video_xp

        FROM skill_tree_nodes stn
        LEFT JOIN tricks t ON t.id = stn.trick_id
        LEFT JOIN user_skill_progress usp ON usp.node_id = stn.id AND usp.user_id = $1
        WHERE stn.specialization = $2 AND stn.branch_type IS NOT NULL
        ORDER BY stn.display_row ASC,
                 CASE stn.branch_type
                   WHEN 'spin' THEN 1
                   WHEN 'merge' THEN 2
                   WHEN 'ollie' THEN 3
                 END ASC
      `;
    };

    let result;
    try {
      result = await pool.query(buildGridQuery(true), [userId, specialization]);
    } catch (error) {
      if (error?.code === '42703') {
        console.warn('[skillTree] component_payload missing in DB schema. Falling back (grid view).');
        result = await pool.query(buildGridQuery(false), [userId, specialization]);
      } else {
        throw error;
      }
    }

    // Group by rows for grid rendering
    const rows = {};
    const specializationManeuverMap = {
      slider: 'rail',
      kicker: 'kicker',
      surface: 'surface'
    };
    result.rows.forEach(node => {
      const rowNum = node.display_row;

      if (!rows[rowNum]) {
        rows[rowNum] = {
          rowNumber: rowNum,
          tier: node.tier,
          spin: null,
          merge: null,
          ollie: null
        };
      }

      const maneuverPayload = node.trick_component_payload || null;

      const computedStatus = normalizeNodeStatus(node);

      const nodeData = {
        id: node.id,
        specialization: node.specialization,
        tier: node.tier,
        branchType: node.branch_type,
        displayRow: node.display_row,
        position: node.position,
        title: node.title,
        description: node.description,
        isSharedNode: node.is_shared_node,

        trick: node.trick_id ? {
          id: node.trick_id,
          name: node.trick_name,
          shortName: node.trick_short_name,
          difficulty: node.trick_difficulty,
          componentPayload: maneuverPayload
        } : null,

        maneuverPayload,
        maneuverType: specializationManeuverMap[node.specialization] || null,

        educational: {
          tutorialVideoUrl: node.tutorial_video_url,
          tips: node.tips || [],
          commonMistakes: node.common_mistakes || []
        },

        requirements: {
          prerequisites: node.prerequisites || [],
          requiredForUnlock: node.required_for_unlock
        },

        rewards: {
          xpBonus: node.xp_bonus,
          badge: node.badge_reward
        },

        repeatable: node.repeatable,

        userProgress: {
          status: computedStatus,
          timesCompleted: node.times_completed,
          firstCompletedAt: node.first_completed_at,
          lastCompletedAt: node.last_completed_at,
          bestVideoId: node.best_video_id,
          bestVideoXP: node.best_video_xp
        }
      };

      // Add merge references if this is a MERGE node
      if (node.branch_type === 'merge') {
        nodeData.mergeRefs = {
          leftNodeId: node.merge_left_node_id,
          rightNodeId: node.merge_right_node_id
        };
      }

      // Place in appropriate column
      rows[rowNum][node.branch_type] = nodeData;
    });

    // Convert rows object to array and sort
    const rowsArray = Object.values(rows).sort((a, b) => a.rowNumber - b.rowNumber);

    return {
      specialization,
      layout: 'grid',
      rows: rowsArray,
      totalNodes: result.rows.length,
      completedNodes: result.rows.filter(n => n.status === 'completed').length,
      sharedNodes: result.rows.filter(n => n.is_shared_node).map(n => ({
        id: n.id,
        title: n.title,
        branchType: n.branch_type,
        usedInRows: result.rows.filter(r => r.id === n.id).map(r => r.display_row)
      }))
    };

  } catch (error) {
    console.error('Error getting user skill tree grid:', error);
    throw error;
  }
}

/**
 * Check if a node is unlocked for a user
 * A node is unlocked if:
 * 1. It's tier 1 (always unlocked), OR
 * 2. All its prerequisites are completed
 */
async function checkNodeUnlocked(userId, nodeId) {
  try {
    // Get node info and current status
    const nodeQuery = `
      SELECT
        stn.tier,
        stn.prerequisites,
        COALESCE(usp.status, 'locked') as current_status
      FROM skill_tree_nodes stn
      LEFT JOIN user_skill_progress usp ON usp.node_id = stn.id AND usp.user_id = $1
      WHERE stn.id = $2
    `;

    const nodeResult = await pool.query(nodeQuery, [userId, nodeId]);

    if (nodeResult.rows.length === 0) {
      return false;
    }

    const node = nodeResult.rows[0];

    // Tier 1 is always unlocked
    if (node.tier === 1) {
      return true;
    }

    // Check if already unlocked
    if (node.current_status !== 'locked') {
      return true;
    }

    // Check prerequisites
    const prerequisites = node.prerequisites || [];

    if (prerequisites.length === 0) {
      return true; // No prerequisites, should be unlocked
    }

    // Check if all prerequisites are completed
    const prereqQuery = `
      SELECT COUNT(*) as completed_count
      FROM user_skill_progress
      WHERE user_id = $1
        AND node_id = ANY($2::uuid[])
        AND status = 'completed'
    `;

    const prereqResult = await pool.query(prereqQuery, [userId, prerequisites]);
    const completedCount = parseInt(prereqResult.rows[0].completed_count);

    return completedCount === prerequisites.length;

  } catch (error) {
    console.error('Error checking node unlock status:', error);
    throw error;
  }
}

/**
 * Unlock a node for a user
 * Changes status from 'locked' to 'available'
 */
async function unlockNode(userId, nodeId) {
  try {
    const isUnlocked = await checkNodeUnlocked(userId, nodeId);

    if (!isUnlocked) {
      throw new Error('Node prerequisites not met');
    }

    const query = `
      INSERT INTO user_skill_progress (user_id, node_id, status)
      VALUES ($1, $2, 'available')
      ON CONFLICT (user_id, node_id)
      DO UPDATE SET
        status = CASE
          WHEN user_skill_progress.status = 'locked' THEN 'available'
          ELSE user_skill_progress.status
        END,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [userId, nodeId]);
    return result.rows[0];

  } catch (error) {
    console.error('Error unlocking node:', error);
    throw error;
  }
}

/**
 * Check and unlock nodes in the next tier if prerequisites are met
 */
async function checkAndUnlockNextTier(userId, specialization, currentTier) {
  try {
    // Get nodes in next tier for this specialization
    const nextTierQuery = `
      SELECT id, prerequisites
      FROM skill_tree_nodes
      WHERE specialization = $1 AND tier = $2
    `;

    const nextTierNodes = await pool.query(nextTierQuery, [specialization, currentTier + 1]);

    // Try to unlock each node
    const unlocked = [];
    for (const node of nextTierNodes.rows) {
      try {
        const canUnlock = await checkNodeUnlocked(userId, node.id);
        if (canUnlock) {
          await unlockNode(userId, node.id);
          unlocked.push(node.id);
        }
      } catch (err) {
        // Node couldn't be unlocked, continue to next
        continue;
      }
    }

    return unlocked;

  } catch (error) {
    console.error('Error checking next tier unlocks:', error);
    throw error;
  }
}

// ============================================
// QUEST COMPLETION
// ============================================

/**
 * Complete a quest by uploading a video
 * This is called after a video is successfully uploaded and validated
 *
 * @param {string} userId - User ID
 * @param {string} nodeId - Quest node ID
 * @param {string} videoId - Video ID that completes the quest
 * @param {number} videoXP - Total XP earned from the video
 * @returns {object} Completion details with XP breakdown
 */
async function completeQuest(userId, nodeId, videoId, videoXP) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get node info
    const nodeQuery = `
      SELECT
        stn.*,
        COALESCE(usp.times_completed, 0) as times_completed,
        usp.best_video_xp
      FROM skill_tree_nodes stn
      LEFT JOIN user_skill_progress usp ON usp.node_id = stn.id AND usp.user_id = $1
      WHERE stn.id = $2
    `;

    const nodeResult = await client.query(nodeQuery, [userId, nodeId]);

    if (nodeResult.rows.length === 0) {
      throw new Error('Quest node not found');
    }

    const node = nodeResult.rows[0];
    const isFirstCompletion = node.times_completed === 0;
    const attemptNumber = node.times_completed + 1;

    // Calculate XP bonus (only on first completion)
    const xpBonus = isFirstCompletion ? node.xp_bonus : 0;
    const totalXP = videoXP + xpBonus;

    // Record quest completion in history
    const completionQuery = `
      INSERT INTO user_quest_completions (
        user_id, node_id, video_id, attempt_number,
        is_first_completion, xp_awarded, xp_bonus_received
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const completion = await client.query(completionQuery, [
      userId, nodeId, videoId, attemptNumber,
      isFirstCompletion, videoXP, xpBonus
    ]);

    // Update user skill progress
    const isBestVideo = !node.best_video_xp || videoXP > node.best_video_xp;

    const progressQuery = `
      INSERT INTO user_skill_progress (
        user_id, node_id, status, times_completed,
        first_completed_at, last_completed_at,
        best_video_id, best_video_xp
      )
      VALUES (
        $1, $2, 'completed', 1,
        NOW(), NOW(),
        $3, $4
      )
      ON CONFLICT (user_id, node_id)
      DO UPDATE SET
        status = 'completed',
        times_completed = user_skill_progress.times_completed + 1,
        last_completed_at = NOW(),
        best_video_id = CASE
          WHEN $4 > COALESCE(user_skill_progress.best_video_xp, 0) THEN $3
          ELSE user_skill_progress.best_video_id
        END,
        best_video_xp = CASE
          WHEN $4 > COALESCE(user_skill_progress.best_video_xp, 0) THEN $4
          ELSE user_skill_progress.best_video_xp
        END,
        updated_at = NOW()
      RETURNING *
    `;

    const progress = await client.query(progressQuery, [
      userId, nodeId, videoId, videoXP
    ]);

    // Award bonus XP to user if first completion
    if (xpBonus > 0) {
      await client.query(
        'UPDATE users SET xp_total = xp_total + $1 WHERE id = $2',
        [xpBonus, userId]
      );
    }

    // Check if this unlocks nodes in the next tier
    const unlockedNodes = await checkAndUnlockNextTier(userId, node.specialization, node.tier);

    await client.query('COMMIT');

    return {
      success: true,
      completion: completion.rows[0],
      progress: progress.rows[0],
      isFirstCompletion,
      attemptNumber,
      xp: {
        video: videoXP,
        bonus: xpBonus,
        total: totalXP
      },
      isBestVideo,
      badge: isFirstCompletion ? node.badge_reward : null,
      unlockedNodes
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error completing quest:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get quest completion history for a user and specific node
 * Shows evolution over time
 */
async function getQuestHistory(userId, nodeId) {
  try {
    const query = `
      SELECT
        uqc.*,
        v.video_url,
        v.thumbnail_url,
        v.xp_total as video_xp,
        v.created_at as video_created_at
      FROM user_quest_completions uqc
      JOIN videos v ON v.id = uqc.video_id
      WHERE uqc.user_id = $1 AND uqc.node_id = $2
      ORDER BY uqc.completed_at ASC
    `;

    const result = await pool.query(query, [userId, nodeId]);

    return {
      nodeId,
      totalAttempts: result.rows.length,
      history: result.rows.map(row => ({
        id: row.id,
        attemptNumber: row.attempt_number,
        isFirstCompletion: row.is_first_completion,
        completedAt: row.completed_at,
        xp: {
          awarded: row.xp_awarded,
          bonus: row.xp_bonus_received,
          total: row.xp_awarded + row.xp_bonus_received
        },
        video: {
          id: row.video_id,
          url: row.video_url,
          thumbnail: row.thumbnail_url,
          totalXP: row.video_xp,
          createdAt: row.video_created_at
        }
      }))
    };

  } catch (error) {
    console.error('Error getting quest history:', error);
    throw error;
  }
}

// ============================================
// PROFILE & STATS QUERIES
// ============================================

/**
 * Get user's overall quest stats
 */
async function getUserQuestStats(userId) {
  try {
    const query = `
      SELECT
        COUNT(DISTINCT usp.node_id) FILTER (WHERE usp.status = 'completed') as quests_completed,
        COUNT(DISTINCT usp.node_id) FILTER (WHERE usp.status = 'available') as quests_available,
        COUNT(DISTINCT usp.node_id) FILTER (WHERE usp.status = 'in_progress') as quests_in_progress,
        SUM(usp.times_completed) as total_attempts,
        SUM(uqc.xp_bonus_received) as total_bonus_xp,
        COUNT(DISTINCT uqc.id) FILTER (WHERE uqc.is_first_completion = true) as first_time_completions
      FROM user_skill_progress usp
      LEFT JOIN user_quest_completions uqc ON uqc.user_id = usp.user_id AND uqc.node_id = usp.node_id
      WHERE usp.user_id = $1
    `;

    const result = await pool.query(query, [userId]);

    return {
      questsCompleted: parseInt(result.rows[0].quests_completed) || 0,
      questsAvailable: parseInt(result.rows[0].quests_available) || 0,
      questsInProgress: parseInt(result.rows[0].quests_in_progress) || 0,
      totalAttempts: parseInt(result.rows[0].total_attempts) || 0,
      totalBonusXP: parseInt(result.rows[0].total_bonus_xp) || 0,
      firstTimeCompletions: parseInt(result.rows[0].first_time_completions) || 0
    };

  } catch (error) {
    console.error('Error getting user quest stats:', error);
    throw error;
  }
}

/**
 * Get user's quest videos by specialization
 * Used for the dedicated quest tab in profile
 */
async function getUserQuestsBySpecialization(userId, specialization) {
  try {
    const query = `
      SELECT
        stn.id as node_id,
        stn.title as quest_title,
        stn.specialization,
        stn.tier,
        usp.times_completed,
        usp.first_completed_at,
        usp.last_completed_at,

        -- Get all videos for this quest
        COALESCE(
          json_agg(
            json_build_object(
              'videoId', v.id,
              'videoUrl', v.video_url,
              'thumbnailUrl', v.thumbnail_url,
              'attemptNumber', uqc.attempt_number,
              'isFirstCompletion', uqc.is_first_completion,
              'xp', uqc.xp_awarded,
              'bonusXP', uqc.xp_bonus_received,
              'completedAt', uqc.completed_at
            )
            ORDER BY uqc.completed_at ASC
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'::json
        ) as videos

      FROM skill_tree_nodes stn
      JOIN user_skill_progress usp ON usp.node_id = stn.id AND usp.user_id = $1
      LEFT JOIN user_quest_completions uqc ON uqc.node_id = stn.id AND uqc.user_id = $1
      LEFT JOIN videos v ON v.id = uqc.video_id
      WHERE stn.specialization = $2 AND usp.status = 'completed'
      GROUP BY stn.id, stn.title, stn.specialization, stn.tier, usp.times_completed, usp.first_completed_at, usp.last_completed_at
      ORDER BY stn.tier ASC, usp.last_completed_at DESC
    `;

    const result = await pool.query(query, [userId, specialization]);

    return {
      specialization,
      quests: result.rows.map(row => ({
        nodeId: row.node_id,
        title: row.quest_title,
        tier: row.tier,
        timesCompleted: row.times_completed,
        firstCompletedAt: row.first_completed_at,
        lastCompletedAt: row.last_completed_at,
        videos: row.videos
      }))
    };

  } catch (error) {
    console.error('Error getting user quests by specialization:', error);
    throw error;
  }
}

/**
 * Get quest evolution - detailed view of improvement over time
 */
async function getQuestEvolution(userId, nodeId) {
  try {
    const history = await getQuestHistory(userId, nodeId);

    // Calculate evolution metrics
    const attempts = history.history;

    if (attempts.length === 0) {
      return {
        nodeId,
        hasAttempts: false
      };
    }

    const firstAttempt = attempts[0];
    const lastAttempt = attempts[attempts.length - 1];
    const bestAttempt = attempts.reduce((best, current) =>
      current.video.totalXP > best.video.totalXP ? current : best
    );

    const xpImprovement = lastAttempt.video.totalXP - firstAttempt.video.totalXP;
    const xpImprovementPercentage = firstAttempt.video.totalXP > 0
      ? Math.round((xpImprovement / firstAttempt.video.totalXP) * 100)
      : 0;

    return {
      nodeId,
      hasAttempts: true,
      totalAttempts: attempts.length,
      firstAttempt: {
        date: firstAttempt.completedAt,
        xp: firstAttempt.video.totalXP,
        video: firstAttempt.video
      },
      lastAttempt: {
        date: lastAttempt.completedAt,
        xp: lastAttempt.video.totalXP,
        video: lastAttempt.video
      },
      bestAttempt: {
        attemptNumber: bestAttempt.attemptNumber,
        date: bestAttempt.completedAt,
        xp: bestAttempt.video.totalXP,
        video: bestAttempt.video
      },
      improvement: {
        xp: xpImprovement,
        percentage: xpImprovementPercentage
      },
      allAttempts: attempts
    };

  } catch (error) {
    console.error('Error getting quest evolution:', error);
    throw error;
  }
}

// ============================================
// RECOMMENDATIONS
// ============================================

/**
 * Get recommended quests for user
 * Returns available quests that user hasn't completed yet
 */
async function getRecommendedQuests(userId, limit = 5) {
  try {
    const query = `
      SELECT
        stn.*,
        t.nome as trick_name,
        t.nome_curto as trick_short_name,
        t.nivel as trick_difficulty,
        usp.status
      FROM skill_tree_nodes stn
      LEFT JOIN tricks t ON t.id = stn.trick_id
      LEFT JOIN user_skill_progress usp ON usp.node_id = stn.id AND usp.user_id = $1
      WHERE (usp.status = 'available' OR usp.status IS NULL)
      ORDER BY stn.tier ASC, stn.position ASC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);

    return result.rows.map(node => ({
      id: node.id,
      title: node.title,
      description: node.description,
      specialization: node.specialization,
      tier: node.tier,
      trick: node.trick_id ? {
        id: node.trick_id,
        name: node.trick_name,
        shortName: node.trick_short_name,
        difficulty: node.trick_difficulty
      } : null,
      educational: {
        tutorialVideoUrl: node.tutorial_video_url,
        tips: node.tips || [],
        commonMistakes: node.common_mistakes || []
      },
      rewards: {
        xpBonus: node.xp_bonus,
        badge: node.badge_reward
      }
    }));

  } catch (error) {
    console.error('Error getting recommended quests:', error);
    throw error;
  }
}

/**
 * Get suggested retries - completed quests user might want to retry
 * Prioritizes older completions and lower XP scores
 */
async function getSuggestedRetries(userId, limit = 5) {
  try {
    const query = `
      SELECT
        stn.*,
        t.nome as trick_name,
        usp.times_completed,
        usp.last_completed_at,
        usp.best_video_xp
      FROM skill_tree_nodes stn
      LEFT JOIN tricks t ON t.id = stn.trick_id
      JOIN user_skill_progress usp ON usp.node_id = stn.id AND usp.user_id = $1
      WHERE usp.status = 'completed' AND stn.repeatable = true
      ORDER BY usp.last_completed_at ASC, usp.best_video_xp ASC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);

    return result.rows.map(node => ({
      id: node.id,
      title: node.title,
      description: node.description,
      specialization: node.specialization,
      tier: node.tier,
      trick: {
        id: node.trick_id,
        name: node.trick_name
      },
      currentStats: {
        timesCompleted: node.times_completed,
        lastCompletedAt: node.last_completed_at,
        bestVideoXP: node.best_video_xp
      }
    }));

  } catch (error) {
    console.error('Error getting suggested retries:', error);
    throw error;
  }
}

/**
 * Initialize skill tree for a new user
 * Creates progress entries for all existing nodes
 */
async function initializeUserSkillTree(userId) {
  try {
    // Use the database function we created in migration
    await pool.query('SELECT initialize_user_skill_tree($1)', [userId]);

    return {
      success: true,
      message: 'Skill tree initialized successfully'
    };

  } catch (error) {
    console.error('Error initializing user skill tree:', error);
    throw error;
  }
}

/**
 * Recalculate quest progress after removing a completion (e.g., video deleted)
 */
async function recalculateQuestProgress(userId, nodeId) {
  if (!userId || !nodeId) {
    return null;
  }

  const client = await pool.connect();
  try {
    const completionResult = await client.query(
      `
        SELECT video_id, xp_awarded, completed_at
          FROM user_quest_completions
         WHERE user_id = $1 AND node_id = $2
         ORDER BY completed_at ASC
      `,
      [userId, nodeId]
    );

    const completions = completionResult.rows;

    if (completions.length === 0) {
      await client.query(
        `
          UPDATE user_skill_progress
             SET status = 'available',
                 times_completed = 0,
                 first_completed_at = NULL,
                 last_completed_at = NULL,
                 best_video_id = NULL,
                 best_video_xp = 0,
                 updated_at = NOW()
           WHERE user_id = $1 AND node_id = $2
        `,
        [userId, nodeId]
      );
      return { timesCompleted: 0 };
    }

    const timesCompleted = completions.length;
    const firstCompletedAt = completions[0].completed_at;
    const lastCompletedAt = completions[completions.length - 1].completed_at;
    const bestCompletion = completions.reduce(
      (best, row) => (row.xp_awarded > best.xp_awarded ? row : best),
      completions[0]
    );

    await client.query(
      `
        UPDATE user_skill_progress
           SET status = 'completed',
               times_completed = $3,
               first_completed_at = $4,
               last_completed_at = $5,
               best_video_id = $6,
               best_video_xp = $7,
               updated_at = NOW()
         WHERE user_id = $1 AND node_id = $2
      `,
      [
        userId,
        nodeId,
        timesCompleted,
        firstCompletedAt,
        lastCompletedAt,
        bestCompletion.video_id,
        bestCompletion.xp_awarded
      ]
    );

    return {
      timesCompleted,
      bestVideoId: bestCompletion.video_id
    };
  } catch (error) {
    console.error('Error recalculating quest progress:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  // Tree Management
  getUserSkillTree,
  getUserSkillTreeGrid, // NEW: Grid layout for 3-column UI
  checkNodeUnlocked,
  unlockNode,
  checkAndUnlockNextTier,

  // Quest Completion
  completeQuest,
  getQuestHistory,

  // Profile & Stats
  getUserQuestStats,
  getUserQuestsBySpecialization,
  getQuestEvolution,

  // Recommendations
  getRecommendedQuests,
  getSuggestedRetries,

  // Initialization
  initializeUserSkillTree,
  recalculateQuestProgress
};
