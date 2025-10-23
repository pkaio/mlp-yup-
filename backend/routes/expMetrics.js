const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, requireSuperModerator } = require('../middleware/auth');

const router = express.Router();

const metricSchema = Joi.object({
  code: Joi.string().max(80).required(),
  display: Joi.string().max(120).required(),
  exp_bonus: Joi.number().integer().min(0).required(),
  category: Joi.string().max(60).allow('', null),
  priority: Joi.number().integer().min(0).default(0),
});

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT code, display, exp_bonus, category, priority
          FROM exp_metrics
         ORDER BY priority ASC, display ASC
      `,
    );

    res.json({ metrics: result.rows });
  } catch (error) {
    console.error('Erro ao listar métricas de XP:', error);
    res.status(500).json({ error: 'Erro ao listar métricas de XP' });
  }
});

router.post('/', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = metricSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO exp_metrics (code, display, exp_bonus, category, priority)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING code, display, exp_bonus, category, priority
      `,
      [
        value.code,
        value.display,
        value.exp_bonus,
        value.category || null,
        value.priority ?? 0,
      ],
    );

    res.status(201).json({ metric: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar métrica de XP:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma métrica com este código.' });
    }
    res.status(500).json({ error: 'Erro ao criar métrica de XP' });
  }
});

router.put('/:code', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = metricSchema.validate({ ...req.body, code: req.params.code });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `
        UPDATE exp_metrics
           SET display = $2,
               exp_bonus = $3,
               category = $4,
               priority = $5
         WHERE code = $1
     RETURNING code, display, exp_bonus, category, priority
      `,
      [
        value.code,
        value.display,
        value.exp_bonus,
        value.category || null,
        value.priority ?? 0,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Métrica de XP não encontrada' });
    }

    res.json({ metric: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar métrica de XP:', err);
    res.status(500).json({ error: 'Erro ao atualizar métrica de XP' });
  }
});

router.delete('/:code', authMiddleware, requireSuperModerator, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM exp_metrics WHERE code = $1 RETURNING code', [req.params.code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Métrica de XP não encontrada' });
    }

    res.json({ message: 'Métrica de XP removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover métrica de XP:', error);
    res.status(500).json({ error: 'Erro ao remover métrica de XP' });
  }
});

module.exports = router;
