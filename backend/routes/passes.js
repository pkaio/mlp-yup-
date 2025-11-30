const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, requireModerator } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const seasonSchema = Joi.object({
  name: Joi.string().max(120).required(),
  start_date: Joi.date().optional().allow(null, ''),
  end_date: Joi.date().optional().allow(null, ''),
});

const seasonPassSchema = Joi.object({
  season_id: Joi.string().uuid().required(),
  park_id: Joi.string().uuid().required(),
  name: Joi.string().max(150).required(),
  description: Joi.string().allow('', null),
});

const monthlyPassSchema = Joi.object({
  season_pass_id: Joi.string().uuid().required(),
  month: Joi.number().integer().min(1).max(12).required(),
  name: Joi.string().max(150).required(),
  description: Joi.string().allow('', null),
});

// ========== SEASONS ==========

// Get all seasons
router.get('/seasons', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, start_date, end_date, created_at
      FROM seasons
      ORDER BY start_date DESC NULLS LAST, created_at DESC
    `);

    res.json({ seasons: result.rows });
  } catch (error) {
    console.error('Erro ao buscar temporadas:', error);
    res.status(500).json({ error: 'Erro ao buscar temporadas' });
  }
});

// Get season by ID
router.get('/seasons/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, start_date, end_date, created_at FROM seasons WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Temporada não encontrada' });
    }

    res.json({ season: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar temporada:', error);
    res.status(500).json({ error: 'Erro ao buscar temporada' });
  }
});

// Create season (admin only)
router.post('/seasons', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = seasonSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `INSERT INTO seasons (name, start_date, end_date)
       VALUES ($1, $2, $3)
       RETURNING id, name, start_date, end_date, created_at`,
      [value.name, value.start_date || null, value.end_date || null]
    );

    res.status(201).json({ season: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar temporada:', err);
    res.status(500).json({ error: 'Erro ao criar temporada' });
  }
});

// Update season (admin only)
router.put('/seasons/:id', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = seasonSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `UPDATE seasons
       SET name = $1, start_date = $2, end_date = $3
       WHERE id = $4
       RETURNING id, name, start_date, end_date, created_at`,
      [value.name, value.start_date || null, value.end_date || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Temporada não encontrada' });
    }

    res.json({ season: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar temporada:', err);
    res.status(500).json({ error: 'Erro ao atualizar temporada' });
  }
});

// Delete season (admin only)
router.delete('/seasons/:id', authMiddleware, requireModerator, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM seasons WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Temporada não encontrada' });
    }

    res.json({ message: 'Temporada removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover temporada:', error);
    res.status(500).json({ error: 'Erro ao remover temporada' });
  }
});

// ========== SEASON PASSES ==========

// Get all season passes
router.get('/season-passes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        sp.id, sp.season_id, sp.park_id, sp.name, sp.description, sp.created_at,
        s.name as season_name,
        p.name as park_name
      FROM season_passes sp
      LEFT JOIN seasons s ON sp.season_id = s.id
      LEFT JOIN parks p ON sp.park_id = p.id
      ORDER BY sp.created_at DESC
    `);

    res.json({ seasonPasses: result.rows });
  } catch (error) {
    console.error('Erro ao buscar season passes:', error);
    res.status(500).json({ error: 'Erro ao buscar season passes' });
  }
});

// Get season pass by ID
router.get('/season-passes/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        sp.id, sp.season_id, sp.park_id, sp.name, sp.description, sp.created_at,
        s.name as season_name,
        p.name as park_name
       FROM season_passes sp
       LEFT JOIN seasons s ON sp.season_id = s.id
       LEFT JOIN parks p ON sp.park_id = p.id
       WHERE sp.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Season pass não encontrado' });
    }

    res.json({ seasonPass: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar season pass:', error);
    res.status(500).json({ error: 'Erro ao buscar season pass' });
  }
});

// Create season pass (admin only)
router.post('/season-passes', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = seasonPassSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `INSERT INTO season_passes (season_id, park_id, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, season_id, park_id, name, description, created_at`,
      [value.season_id, value.park_id, value.name, value.description || null]
    );

    res.status(201).json({ seasonPass: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar season pass:', err);
    res.status(500).json({ error: 'Erro ao criar season pass' });
  }
});

// Update season pass (admin only)
router.put('/season-passes/:id', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = seasonPassSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `UPDATE season_passes
       SET season_id = $1, park_id = $2, name = $3, description = $4
       WHERE id = $5
       RETURNING id, season_id, park_id, name, description, created_at`,
      [value.season_id, value.park_id, value.name, value.description || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Season pass não encontrado' });
    }

    res.json({ seasonPass: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar season pass:', err);
    res.status(500).json({ error: 'Erro ao atualizar season pass' });
  }
});

// Delete season pass (admin only)
router.delete('/season-passes/:id', authMiddleware, requireModerator, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM season_passes WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Season pass não encontrado' });
    }

    res.json({ message: 'Season pass removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover season pass:', error);
    res.status(500).json({ error: 'Erro ao remover season pass' });
  }
});

// ========== MONTHLY PASSES ==========

// Get all monthly passes
router.get('/monthly-passes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        mp.id, mp.season_pass_id, mp.month, mp.name, mp.description, mp.created_at,
        sp.name as season_pass_name
      FROM monthly_passes mp
      LEFT JOIN season_passes sp ON mp.season_pass_id = sp.id
      ORDER BY mp.month ASC, mp.created_at DESC
    `);

    res.json({ monthlyPasses: result.rows });
  } catch (error) {
    console.error('Erro ao buscar monthly passes:', error);
    res.status(500).json({ error: 'Erro ao buscar monthly passes' });
  }
});

// Get monthly pass by ID
router.get('/monthly-passes/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        mp.id, mp.season_pass_id, mp.month, mp.name, mp.description, mp.created_at,
        sp.name as season_pass_name
       FROM monthly_passes mp
       LEFT JOIN season_passes sp ON mp.season_pass_id = sp.id
       WHERE mp.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monthly pass não encontrado' });
    }

    res.json({ monthlyPass: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar monthly pass:', error);
    res.status(500).json({ error: 'Erro ao buscar monthly pass' });
  }
});

// Create monthly pass (admin only)
router.post('/monthly-passes', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = monthlyPassSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `INSERT INTO monthly_passes (season_pass_id, month, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, season_pass_id, month, name, description, created_at`,
      [value.season_pass_id, value.month, value.name, value.description || null]
    );

    res.status(201).json({ monthlyPass: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar monthly pass:', err);
    res.status(500).json({ error: 'Erro ao criar monthly pass' });
  }
});

// Update monthly pass (admin only)
router.put('/monthly-passes/:id', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = monthlyPassSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `UPDATE monthly_passes
       SET season_pass_id = $1, month = $2, name = $3, description = $4
       WHERE id = $5
       RETURNING id, season_pass_id, month, name, description, created_at`,
      [value.season_pass_id, value.month, value.name, value.description || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monthly pass não encontrado' });
    }

    res.json({ monthlyPass: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar monthly pass:', err);
    res.status(500).json({ error: 'Erro ao atualizar monthly pass' });
  }
});

// Delete monthly pass (admin only)
router.delete('/monthly-passes/:id', authMiddleware, requireModerator, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM monthly_passes WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monthly pass não encontrado' });
    }

    res.json({ message: 'Monthly pass removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover monthly pass:', error);
    res.status(500).json({ error: 'Erro ao remover monthly pass' });
  }
});

module.exports = router;
