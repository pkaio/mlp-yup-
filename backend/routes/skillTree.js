const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getUserSkillTree,
  getUserSkillTreeGrid,
  checkNodeUnlocked,
  unlockNode,
  completeQuest,
  getQuestHistory,
  getUserQuestStats,
  getUserQuestsBySpecialization,
  getQuestEvolution,
  getRecommendedQuests,
  getSuggestedRetries,
  initializeUserSkillTree
} = require('../utils/skillTreeSystem');

/**
 * GET /api/skill-tree/:specialization
 * Get skill tree for a specific specialization (tier-based legacy view)
 */
router.get('/:specialization', authMiddleware, async (req, res) => {
  try {
    const { specialization } = req.params;
    const userId = req.user.id;

    // Validate specialization
    if (!['slider', 'kicker', 'surface'].includes(specialization)) {
      return res.status(400).json({
        success: false,
        error: 'Especialização inválida. Use: slider, kicker, ou surface'
      });
    }

    const skillTree = await getUserSkillTree(userId, specialization);

    res.json({
      success: true,
      skillTree
    });
  } catch (error) {
    console.error('Error fetching skill tree:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar árvore de habilidades'
    });
  }
});

/**
 * GET /api/skill-tree/:specialization/grid
 * Get skill tree in 3-column grid layout (SPIN | MERGE | OLLIE)
 * New grid-based view for Surface specialization
 */
router.get('/:specialization/grid', authMiddleware, async (req, res) => {
  try {
    const { specialization } = req.params;
    const userId = req.user.id;

    // Validate specialization
    if (!['slider', 'kicker', 'surface'].includes(specialization)) {
      return res.status(400).json({
        success: false,
        error: 'Especialização inválida. Use: slider, kicker, ou surface'
      });
    }

    const gridTree = await getUserSkillTreeGrid(userId, specialization);

    res.json({
      success: true,
      skillTree: gridTree
    });
  } catch (error) {
    console.error('Error fetching skill tree grid:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar árvore de habilidades em grid'
    });
  }
});

/**
 * GET /api/skill-tree/node/:nodeId/check-unlock
 * Check if a specific node is unlocked for the user
 */
router.get('/node/:nodeId/check-unlock', authMiddleware, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const userId = req.user.id;

    const isUnlocked = await checkNodeUnlocked(userId, nodeId);

    res.json({
      success: true,
      nodeId,
      isUnlocked
    });
  } catch (error) {
    console.error('Error checking node unlock:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar desbloqueio do nó'
    });
  }
});

/**
 * POST /api/skill-tree/node/:nodeId/unlock
 * Manually unlock a node (if prerequisites are met)
 */
router.post('/node/:nodeId/unlock', authMiddleware, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const userId = req.user.id;

    const result = await unlockNode(userId, nodeId);

    res.json({
      success: true,
      message: 'Nó desbloqueado com sucesso',
      progress: result
    });
  } catch (error) {
    console.error('Error unlocking node:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao desbloquear nó'
    });
  }
});

/**
 * GET /api/skill-tree/quest/:nodeId/history
 * Get completion history for a specific quest
 */
router.get('/quest/:nodeId/history', authMiddleware, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const userId = req.user.id;

    const history = await getQuestHistory(userId, nodeId);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching quest history:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar histórico da quest'
    });
  }
});

/**
 * GET /api/skill-tree/quest/:nodeId/evolution
 * Get evolution/improvement stats for a specific quest
 */
router.get('/quest/:nodeId/evolution', authMiddleware, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const userId = req.user.id;

    const evolution = await getQuestEvolution(userId, nodeId);

    res.json({
      success: true,
      evolution
    });
  } catch (error) {
    console.error('Error fetching quest evolution:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar evolução da quest'
    });
  }
});

/**
 * GET /api/skill-tree/quests/stats
 * Get user's overall quest stats
 */
router.get('/quests/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await getUserQuestStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching quest stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas de quests'
    });
  }
});

/**
 * GET /api/skill-tree/quests/:specialization
 * Get user's completed quests for a specialization
 * Used for the quest profile tab
 */
router.get('/quests/:specialization', authMiddleware, async (req, res) => {
  try {
    const { specialization } = req.params;
    const userId = req.user.id;

    // Validate specialization
    if (!['slider', 'kicker', 'surface'].includes(specialization)) {
      return res.status(400).json({
        success: false,
        error: 'Especialização inválida. Use: slider, kicker, ou surface'
      });
    }

    const quests = await getUserQuestsBySpecialization(userId, specialization);

    res.json({
      success: true,
      quests
    });
  } catch (error) {
    console.error('Error fetching user quests:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar quests do usuário'
    });
  }
});

/**
 * GET /api/skill-tree/recommendations
 * Get recommended quests for the user
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const recommendations = await getRecommendedQuests(userId, limit);

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar recomendações'
    });
  }
});

/**
 * GET /api/skill-tree/retries
 * Get suggested quests to retry
 */
router.get('/retries', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const retries = await getSuggestedRetries(userId, limit);

    res.json({
      success: true,
      retries
    });
  } catch (error) {
    console.error('Error fetching retry suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar sugestões de retry'
    });
  }
});

/**
 * POST /api/skill-tree/initialize
 * Initialize skill tree for current user
 */
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await initializeUserSkillTree(userId);

    res.json({
      success: true,
      message: 'Árvore de habilidades inicializada com sucesso'
    });
  } catch (error) {
    console.error('Error initializing skill tree:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao inicializar árvore de habilidades'
    });
  }
});

/**
 * POST /api/skill-tree/quest/:nodeId/complete
 * Complete a quest (internal use - called from video upload)
 * This endpoint is mainly for testing - in production, quest completion
 * is triggered automatically when a quest video is uploaded
 */
router.post('/quest/:nodeId/complete', authMiddleware, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { videoId, videoXP } = req.body;
    const userId = req.user.id;

    if (!videoId || !videoXP) {
      return res.status(400).json({
        success: false,
        error: 'videoId e videoXP são obrigatórios'
      });
    }

    const result = await completeQuest(userId, nodeId, videoId, videoXP);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error completing quest:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao completar quest'
    });
  }
});

module.exports = router;
