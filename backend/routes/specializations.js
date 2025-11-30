const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getUserSpecializations,
  getSpecializationLeaderboard,
  initializeUserSpecializations
} = require('../utils/specializationSystem');

/**
 * GET /api/specializations/me
 * Get current user's specializations
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const specializations = await getUserSpecializations(userId);

    res.json({
      success: true,
      specializations
    });
  } catch (error) {
    console.error('Error fetching user specializations:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar especializações do usuário'
    });
  }
});

/**
 * GET /api/specializations/user/:userId
 * Get specializations for a specific user (public)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const specializations = await getUserSpecializations(userId);

    res.json({
      success: true,
      specializations
    });
  } catch (error) {
    console.error('Error fetching user specializations:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar especializações do usuário'
    });
  }
});

/**
 * GET /api/specializations/leaderboard/:type
 * Get leaderboard for a specific specialization type
 * Type can be: slider, kicker, surface
 */
router.get('/leaderboard/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Validate specialization type
    if (!['slider', 'kicker', 'surface'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de especialização inválido. Use: slider, kicker, ou surface'
      });
    }

    const leaderboard = await getSpecializationLeaderboard(type, limit);

    res.json({
      success: true,
      type,
      leaderboard
    });
  } catch (error) {
    console.error('Error fetching specialization leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar ranking de especialização'
    });
  }
});

/**
 * POST /api/specializations/initialize
 * Initialize specializations for the current user (if not already initialized)
 */
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await initializeUserSpecializations(userId);

    const specializations = await getUserSpecializations(userId);

    res.json({
      success: true,
      message: 'Especializações inicializadas com sucesso',
      specializations
    });
  } catch (error) {
    console.error('Error initializing specializations:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao inicializar especializações'
    });
  }
});

module.exports = router;
