const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, requireSuperModerator } = require('../middleware/auth');

const router = express.Router();

const sanitizeLimit = (value, fallback = 10) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 50);
};

router.get('/', async (req, res) => {
  try {
    const searchRaw = typeof req.query.search === 'string' ? req.query.search : '';
    const searchTerm = searchRaw.trim();
    const limit = sanitizeLimit(req.query.limit, 12);

    const params = [];
    let query = `
      SELECT id, nome, nome_curto, categoria, obstaculo, tipo, tags, exp_base
        FROM tricks
    `;

    if (searchTerm) {
      params.push(`%${searchTerm.toLowerCase()}%`);
      query += `
        WHERE LOWER(nome) LIKE $1
           OR LOWER(nome_curto) LIKE $1
           OR LOWER(COALESCE(descricao, '')) LIKE $1
      `;
    }

    query += `
      ORDER BY exp_base DESC, nome ASC
      LIMIT ${limit}
    `;

    const result = await pool.query(query, params);

    res.json({
      tricks: result.rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        nome_curto: row.nome_curto,
        categoria: row.categoria,
        obstaculo: row.obstaculo,
        tipo: row.tipo,
        tags: Array.isArray(row.tags) ? row.tags : [],
        exp_base: row.exp_base ?? 0,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar tricks:', error);
    res.status(500).json({ error: 'Erro ao buscar tricks' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const trickId = req.params.id;
    const result = await pool.query(
      `
        SELECT id, nome, nome_curto, categoria, obstaculo, tipo, descricao, variacoes, tags, exp_base
          FROM tricks
         WHERE id = $1
         LIMIT 1
      `,
      [trickId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trick não encontrada' });
    }

    res.json({ trick: result.rows[0] });
  } catch (error) {
    console.error('Erro ao obter trick:', error);
    res.status(500).json({ error: 'Erro ao obter trick' });
  }
});

const trickSchema = Joi.object({
  nome: Joi.string().max(120).required(),
  nome_curto: Joi.string().max(40).allow('', null),
  categoria: Joi.string().max(80).allow('', null),
  obstaculo: Joi.string().max(80).allow('', null),
  tipo: Joi.string().max(80).allow('', null),
  descricao: Joi.string().allow('', null),
  variacoes: Joi.string().allow('', null),
  nivel: Joi.string().max(40).allow('', null),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(60)), Joi.string().allow('', null))
    .optional(),
  exp_base: Joi.number().integer().min(0).required(),
});

const parseTags = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
  return [];
};

router.post('/', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = trickSchema.validate(req.body, { abortEarly: true });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const tagsArray = parseTags(value.tags);

  try {
    const result = await pool.query(
      `
        INSERT INTO tricks (
          nome, nome_curto, categoria, obstaculo, tipo, descricao, variacoes, nivel, tags, exp_base
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
        RETURNING id, nome, nome_curto, categoria, obstaculo, tipo, descricao, variacoes, nivel, tags, exp_base
      `,
      [
        value.nome,
        value.nome_curto || null,
        value.categoria || null,
        value.obstaculo || null,
        value.tipo || null,
        value.descricao || null,
        value.variacoes || null,
        value.nivel || null,
        JSON.stringify(tagsArray),
        value.exp_base,
      ],
    );

    res.status(201).json({ trick: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar trick:', err);
    res.status(500).json({ error: 'Erro ao criar trick' });
  }
});

router.put('/:id', authMiddleware, requireSuperModerator, async (req, res) => {
  const trickId = req.params.id;

  const { error, value } = trickSchema.min(1).validate(req.body, { abortEarly: true });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const tagsArray = value.tags !== undefined ? parseTags(value.tags) : undefined;

  const fields = [];
  const params = [];
  let index = 1;

  const addField = (column, columnValue) => {
    fields.push(`${column} = $${index}`);
    params.push(columnValue);
    index += 1;
  };

  if (value.nome !== undefined) addField('nome', value.nome);
  if (value.nome_curto !== undefined) addField('nome_curto', value.nome_curto || null);
  if (value.categoria !== undefined) addField('categoria', value.categoria || null);
  if (value.obstaculo !== undefined) addField('obstaculo', value.obstaculo || null);
  if (value.tipo !== undefined) addField('tipo', value.tipo || null);
  if (value.descricao !== undefined) addField('descricao', value.descricao || null);
  if (value.variacoes !== undefined) addField('variacoes', value.variacoes || null);
  if (value.nivel !== undefined) addField('nivel', value.nivel || null);
  if (tagsArray !== undefined) addField('tags', JSON.stringify(tagsArray));
  if (value.exp_base !== undefined) addField('exp_base', value.exp_base);

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  params.push(trickId);

  try {
    const result = await pool.query(
      `
        UPDATE tricks
           SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${index}
     RETURNING id, nome, nome_curto, categoria, obstaculo, tipo, descricao, variacoes, nivel, tags, exp_base
      `,
      params,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trick não encontrada' });
    }

    res.json({ trick: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar trick:', err);
    res.status(500).json({ error: 'Erro ao atualizar trick' });
  }
});

router.delete('/:id', authMiddleware, requireSuperModerator, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tricks WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trick não encontrada' });
    }

    res.json({ message: 'Trick removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover trick:', error);
    res.status(500).json({ error: 'Erro ao remover trick' });
  }
});

module.exports = router;
