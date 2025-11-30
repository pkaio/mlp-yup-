const express = require('express');
const pool = require('../config/database');
const { authMiddleware, requireAdmin, requireModerator } = require('../middleware/auth');
const { loadComponents, getComponentsStats, clearCache } = require('../utils/componentXpSystem');
const { deleteVideoAndCleanup } = require('../utils/videoDeletion');

const router = express.Router();
const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/**
 * GET /api/admin/components
 * Lista todos os componentes de manobras
 */
router.get('/components', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { division } = req.query;

    let query = `
      SELECT id, component_id, division, display_name, description,
             xp_value, metadata, is_active, created_at, updated_at
      FROM maneuver_components
    `;
    const params = [];

    if (division) {
      query += ' WHERE division = $1';
      params.push(division);
    }

    query += ' ORDER BY division, xp_value';

    const result = await pool.query(query, params);

    // Organizar por divisão
    const componentsByDivision = {
      approach: [],
      entry: [],
      spins: [],
      grabs: [],
      base_moves: [],
      modifiers: []
    };

    result.rows.forEach(row => {
      componentsByDivision[row.division].push({
        id: row.id,
        component_id: row.component_id,
        division: row.division,
        display_name: row.display_name,
        description: row.description,
        xp_value: row.xp_value,
        metadata: row.metadata,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    });

    res.json({
      total: result.rows.length,
      components: division ? result.rows : componentsByDivision,
      stats: await getComponentsStats()
    });
  } catch (error) {
    console.error('Erro ao listar componentes:', error);
    res.status(500).json({ error: 'Erro ao listar componentes' });
  }
});

/**
 * GET /api/admin/components/:id
 * Busca um componente específico
 */
router.get('/components/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, component_id, division, display_name, description,
              xp_value, metadata, is_active, created_at, updated_at
       FROM maneuver_components
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Componente não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar componente:', error);
    res.status(500).json({ error: 'Erro ao buscar componente' });
  }
});

/**
 * PUT /api/admin/components/:id
 * Atualiza um componente (XP, descrição, etc)
 */
router.put('/components/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { xp_value, display_name, description, is_active, metadata } = req.body;

    // Validar XP value
    if (xp_value !== undefined && (typeof xp_value !== 'number' || xp_value < 0)) {
      return res.status(400).json({ error: 'xp_value deve ser um número maior ou igual a 0' });
    }

    // Construir query dinamicamente
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (xp_value !== undefined) {
      updates.push(`xp_value = $${paramIndex++}`);
      params.push(xp_value);
    }

    if (display_name) {
      updates.push(`display_name = $${paramIndex++}`);
      params.push(display_name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(is_active);
    }

    if (metadata) {
      updates.push(`metadata = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE maneuver_components
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Componente não encontrado' });
    }

    // Limpar cache após atualização
    clearCache();

    console.log(`✅ Componente atualizado: ${result.rows[0].component_id} (${result.rows[0].division})`);

    res.json({
      message: 'Componente atualizado com sucesso',
      component: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar componente:', error);
    res.status(500).json({ error: 'Erro ao atualizar componente' });
  }
});

/**
 * POST /api/admin/components
 * Cria um novo componente
 */
router.post('/components', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { component_id, division, display_name, description, xp_value, metadata } = req.body;

    // Validações
    if (!component_id || !division || !display_name || xp_value === undefined) {
      return res.status(400).json({
        error: 'Campos obrigatórios: component_id, division, display_name, xp_value'
      });
    }

    const validDivisions = ['approach', 'entry', 'spins', 'grabs', 'base_moves', 'modifiers'];
    if (!validDivisions.includes(division)) {
      return res.status(400).json({
        error: `Division deve ser uma das: ${validDivisions.join(', ')}`
      });
    }

    if (typeof xp_value !== 'number' || xp_value < 0) {
      return res.status(400).json({ error: 'xp_value deve ser um número maior ou igual a 0' });
    }

    const result = await pool.query(
      `INSERT INTO maneuver_components
       (component_id, division, display_name, description, xp_value, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [
        component_id,
        division,
        display_name,
        description || null,
        xp_value,
        JSON.stringify(metadata || {})
      ]
    );

    // Limpar cache após criação
    clearCache();

    console.log(`✅ Novo componente criado: ${component_id} (${division}) - ${xp_value} XP`);

    res.status(201).json({
      message: 'Componente criado com sucesso',
      component: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Já existe um componente com este component_id' });
    }
    console.error('Erro ao criar componente:', error);
    res.status(500).json({ error: 'Erro ao criar componente' });
  }
});

/**
 * DELETE /api/admin/components/:id
 * Remove (soft delete) um componente
 */
router.delete('/components/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE maneuver_components
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING component_id, division`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Componente não encontrado' });
    }

    // Limpar cache após desativação
    clearCache();

    console.log(`✅ Componente desativado: ${result.rows[0].component_id} (${result.rows[0].division})`);

    res.json({
      message: 'Componente desativado com sucesso',
      component_id: result.rows[0].component_id
    });
  } catch (error) {
    console.error('Erro ao desativar componente:', error);
    res.status(500).json({ error: 'Erro ao desativar componente' });
  }
});

/**
 * POST /api/admin/videos/:videoId/bonus
 * Adiciona bônus manual de XP a um vídeo
 */
router.post('/videos/:videoId/bonus', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { bonus_xp, reason } = req.body;

    if (bonus_xp === undefined || !reason) {
      return res.status(400).json({
        error: 'Campos obrigatórios: bonus_xp, reason'
      });
    }

    if (typeof bonus_xp !== 'number') {
      return res.status(400).json({ error: 'bonus_xp deve ser um número' });
    }

    // Atualizar vídeo
    const result = await pool.query(
      `UPDATE videos
       SET bonus_xp = bonus_xp + $1,
           bonus_reason = CASE
             WHEN bonus_reason IS NULL OR bonus_reason = '' THEN $2
             ELSE bonus_reason || ' + ' || $2
           END,
           exp_awarded = exp_awarded + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, user_id, exp_awarded, bonus_xp, bonus_reason`,
      [bonus_xp, reason, videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    const video = result.rows[0];

    // Atualizar XP do usuário
    await pool.query(
      `UPDATE users
       SET xp_total = xp_total + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [bonus_xp, video.user_id]
    );

    console.log(`✅ Bônus manual adicionado: ${bonus_xp} XP - ${reason}`);

    res.json({
      message: 'Bônus adicionado com sucesso',
      video: {
        id: video.id,
        exp_awarded: video.exp_awarded,
        bonus_xp: video.bonus_xp,
        bonus_reason: video.bonus_reason
      }
    });
  } catch (error) {
    console.error('Erro ao adicionar bônus:', error);
    res.status(500).json({ error: 'Erro ao adicionar bônus' });
  }
});

/**
 * GET /api/admin/xp-stats
 * Retorna estatísticas gerais de XP
 */
router.get('/xp-stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    // Stats de componentes
    const componentsStats = await getComponentsStats();

    // Stats de vídeos
    const videosResult = await pool.query(`
      SELECT
        COUNT(*) as total_videos,
        AVG(maneuver_xp) as avg_maneuver_xp,
        MAX(maneuver_xp) as max_maneuver_xp,
        AVG(bonus_xp) as avg_bonus_xp,
        SUM(bonus_xp) as total_bonus_awarded
      FROM videos
      WHERE maneuver_xp > 0
    `);

    // Top 10 manobras mais valiosas
    const topManeuvesResult = await pool.query(`
      SELECT
        id,
        maneuver_xp,
        bonus_xp,
        exp_awarded,
        component_breakdown
      FROM videos
      WHERE maneuver_xp > 0
      ORDER BY exp_awarded DESC
      LIMIT 10
    `);

    // Distribuição de XP por divisão
    const divisionDistribution = await pool.query(`
      SELECT
        division,
        COUNT(*) as components_count,
        AVG(xp_value) as avg_xp,
        MIN(xp_value) as min_xp,
        MAX(xp_value) as max_xp,
        SUM(xp_value) as total_xp_potential
      FROM maneuver_components
      WHERE is_active = true
      GROUP BY division
      ORDER BY division
    `);

    res.json({
      components: componentsStats,
      videos: videosResult.rows[0],
      top_maneuvers: topManeuvesResult.rows,
      division_distribution: divisionDistribution.rows
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

router.delete('/videos/:videoId', authMiddleware, requireModerator, async (req, res) => {
  const { videoId } = req.params;

  if (!isUuid(videoId)) {
    return res.status(400).json({ error: 'ID do vídeo inválido' });
  }

  try {
    const result = await deleteVideoAndCleanup({
      videoId,
      actingUser: req.user,
      force: true,
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      videoId,
    });
  } catch (error) {
    console.error('Erro ao remover vídeo via painel admin:', error);
    res.status(500).json({ error: 'Erro ao remover vídeo' });
  }
});

module.exports = router;
