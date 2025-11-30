const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, requireSuperModerator } = require('../middleware/auth');
const { validateManeuverPayload, calculateManeuverXp } = require('../utils/componentXpSystem');

const router = express.Router();

const BASE_TRICK_FIELDS = [
  'id',
  'nome',
  'nome_curto',
  'categoria',
  'obstaculo',
  'tipo',
  'descricao',
  'variacoes',
  'nivel',
  'specialization',
  'tags',
  'exp_base',
];

const COMPONENT_TRICK_FIELDS = ['component_payload', 'component_xp', 'is_component_based'];

const buildTrickSelectClause = (includeComponentColumns = true) => {
  const fields = includeComponentColumns
    ? [...BASE_TRICK_FIELDS, ...COMPONENT_TRICK_FIELDS]
    : BASE_TRICK_FIELDS;

  return fields.map((field) => `        ${field}`).join(',\n');
};

const runTrickQueryWithFallback = async (queryBuilder, params = []) => {
  try {
    return await pool.query(queryBuilder(true), params);
  } catch (error) {
    if (error.code === '42703') {
      console.warn(
        '[tricks] Component-based columns missing on schema. Running fallback query without them.',
      );
      return pool.query(queryBuilder(false), params);
    }
    throw error;
  }
};

const sanitizeLimit = (value, fallback = 10, max = 50) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
};

const sanitizePage = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
};

const specializationOptions = ['slider', 'kicker', 'surface'];

const componentPayloadSchema = Joi.object({
  approach: Joi.string().trim().required(),
  entry: Joi.string().trim().required(),
  spins: Joi.string().trim().required(),
  grabs: Joi.string().trim().required(),
  base_moves: Joi.string().trim().required(),
  modifiers: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim()), Joi.string().trim().allow('', null))
    .optional(),
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
  specialization: Joi.string().valid(...specializationOptions).allow(null, ''),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(60)), Joi.string().allow('', null))
    .optional(),
  componentPayload: componentPayloadSchema.required(),
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

const COMPONENT_ALIASES = {
  spins: {
    none_spin: 'none'
  },
  approach: {
    none_edge: 'none'
  },
  entry: {
    none_entry: 'none'
  },
  grabs: {
    none_grab: 'none'
  }
};

const normalizeComponentValue = (division, value) => {
  if (!value) return value;
  const lookup = COMPONENT_ALIASES[division];
  if (lookup && lookup[value]) {
    return lookup[value];
  }
  return value;
};

const normalizeComponentPayload = (payload) => {
  const modifiersSource = payload.modifiers;
  let modifiers = [];

  if (Array.isArray(modifiersSource)) {
    modifiers = modifiersSource;
  } else if (typeof modifiersSource === 'string' && modifiersSource.trim().length > 0) {
    modifiers = [modifiersSource.trim()];
  }

  return {
    approach: normalizeComponentValue('approach', payload.approach),
    entry: normalizeComponentValue('entry', payload.entry),
    spins: normalizeComponentValue('spins', payload.spins),
    grabs: normalizeComponentValue('grabs', payload.grabs),
    base_moves: payload.base_moves,
    modifiers: modifiers.filter(Boolean),
  };
};

const buildTrickResponse = async (row) => {
  const trick = {
    id: row.id,
    nome: row.nome,
    nome_curto: row.nome_curto,
    categoria: row.categoria,
    obstaculo: row.obstaculo,
    tipo: row.tipo,
    descricao: row.descricao,
    variacoes: row.variacoes,
    nivel: row.nivel,
    specialization: row.specialization,
    tags: Array.isArray(row.tags) ? row.tags : [],
    exp_base: row.exp_base ?? 0,
    component_payload: row.component_payload || null,
    component_xp: row.component_xp ?? null,
    is_component_based: row.is_component_based ?? false,
  };

  if (row.component_payload) {
    try {
      const breakdown = await calculateManeuverXp(row.component_payload);
      trick.component_breakdown = breakdown;
      trick.exp_base = breakdown.maneuver_total;
      trick.component_xp = breakdown.maneuver_total;
    } catch (error) {
      console.warn(`Erro ao calcular breakdown da manobra ${row.id}:`, error.message);
      trick.component_breakdown = null;
    }
  } else {
    trick.component_breakdown = null;
  }

  return trick;
};

router.get('/', async (req, res) => {
  try {
    const searchRaw = typeof req.query.search === 'string' ? req.query.search : '';
    const searchTerm = searchRaw.trim();
    const limit = sanitizeLimit(req.query.limit, 12, 1000);
    const page = sanitizePage(req.query.page, 1);
    const offset = (page - 1) * limit;

    const params = [];
    if (searchTerm) {
      params.push(`%${searchTerm.toLowerCase()}%`);
    }

    const whereClause = searchTerm
      ? `
          WHERE LOWER(nome) LIKE $1
             OR LOWER(nome_curto) LIKE $1
             OR LOWER(COALESCE(descricao, '')) LIKE $1
        `
      : '';

    const buildQuery = (includeComponentColumns) => {
      let query = `
        SELECT
${buildTrickSelectClause(includeComponentColumns)}
        FROM tricks
      `;

      if (whereClause) {
        query += whereClause;
      }

      query += `
        ORDER BY exp_base DESC, nome ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return query;
    };

    const countQuery = `
      SELECT COUNT(*) AS total
        FROM tricks
        ${whereClause}
    `;

    const result = await runTrickQueryWithFallback(buildQuery, params);
    const countResult = await pool.query(countQuery, params);
    const total = Number.parseInt(countResult.rows[0]?.total || '0', 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const tricks = await Promise.all(result.rows.map((row) => buildTrickResponse(row)));

    res.json({
      tricks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar tricks:', error);
    res.status(500).json({ error: 'Erro ao buscar tricks' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const trickId = req.params.id;
    const params = [trickId];
    const buildQuery = (includeComponentColumns) => `
        SELECT
${buildTrickSelectClause(includeComponentColumns)}
          FROM tricks
         WHERE id = $1
         LIMIT 1
      `;
    const result = await runTrickQueryWithFallback(buildQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trick não encontrada' });
    }

    const trick = await buildTrickResponse(result.rows[0]);
    res.json({ trick });
  } catch (error) {
    console.error('Erro ao obter trick:', error);
    res.status(500).json({ error: 'Erro ao obter trick' });
  }
});

router.post('/', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = trickSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const tagsArray = parseTags(value.tags);
  const specialization = value.specialization ? value.specialization : null;
  const componentPayload = normalizeComponentPayload(value.componentPayload);

  try {
    validateManeuverPayload(componentPayload);
  } catch (validationError) {
    return res.status(400).json({ error: validationError.message });
  }

  try {
    const breakdown = await calculateManeuverXp(componentPayload);
    const result = await pool.query(
      `
        INSERT INTO tricks (
          nome, nome_curto, categoria, obstaculo, tipo,
          descricao, variacoes, nivel, specialization,
          tags, exp_base, component_payload, component_xp, is_component_based
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10::jsonb, $11, $12::jsonb, $13, true
        )
        RETURNING
          id, nome, nome_curto, categoria, obstaculo, tipo,
          descricao, variacoes, nivel, specialization,
          tags, exp_base, component_payload, component_xp, is_component_based
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
        specialization,
        JSON.stringify(tagsArray),
        breakdown.maneuver_total,
        JSON.stringify(componentPayload),
        breakdown.maneuver_total,
      ],
    );

    const trick = await buildTrickResponse(result.rows[0]);
    res.status(201).json({ trick });
  } catch (err) {
    console.error('Erro ao criar trick:', err);
    res.status(500).json({ error: 'Erro ao criar trick' });
  }
});

router.put('/:id', authMiddleware, requireSuperModerator, async (req, res) => {
  const trickId = req.params.id;

  const { error, value } = trickSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const tagsArray = parseTags(value.tags);
  const specialization = value.specialization ? value.specialization : null;
  const componentPayload = normalizeComponentPayload(value.componentPayload);

  try {
    validateManeuverPayload(componentPayload);
  } catch (validationError) {
    return res.status(400).json({ error: validationError.message });
  }

  try {
    const breakdown = await calculateManeuverXp(componentPayload);
    const result = await pool.query(
      `
        UPDATE tricks
           SET nome = $1,
               nome_curto = $2,
               categoria = $3,
               obstaculo = $4,
               tipo = $5,
               descricao = $6,
               variacoes = $7,
               nivel = $8,
               specialization = $9,
               tags = $10::jsonb,
               exp_base = $11,
               component_payload = $12::jsonb,
               component_xp = $13,
               is_component_based = true,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = $14
     RETURNING
       id, nome, nome_curto, categoria, obstaculo, tipo,
       descricao, variacoes, nivel, specialization,
       tags, exp_base, component_payload, component_xp, is_component_based
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
        specialization,
        JSON.stringify(tagsArray),
        breakdown.maneuver_total,
        JSON.stringify(componentPayload),
        breakdown.maneuver_total,
        trickId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trick não encontrada' });
    }

    const trick = await buildTrickResponse(result.rows[0]);
    res.json({ trick });
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
