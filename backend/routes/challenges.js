const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, requireModerator, requireSuperModerator } = require('../middleware/auth');

const router = express.Router();

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const seasonSchema = Joi.object({
  name: Joi.string().max(120).required(),
  startDate: Joi.date().optional().allow(null, ''),
  endDate: Joi.date().optional().allow(null, ''),
});

const seasonPassSchema = Joi.object({
  seasonId: Joi.string().uuid().required(),
  parkId: Joi.string().uuid().required(),
  name: Joi.string().max(150).required(),
  description: Joi.string().allow('', null),
});

const monthlyPassSchema = Joi.object({
  seasonPassId: Joi.string().uuid().required(),
  month: Joi.number().integer().min(1).max(12).required(),
  name: Joi.string().max(150).required(),
  description: Joi.string().allow('', null),
});

const challengeSchema = Joi.object({
  seasonId: Joi.string().uuid().required(),
  parkId: Joi.string().uuid().optional().allow(null, ''),
  seasonPassId: Joi.string().uuid().required(),
  monthlyPassId: Joi.string().uuid().required(),
  obstacleIds: Joi.array().items(Joi.string().uuid()).optional().allow(null),
  difficulty: Joi.string().max(50).allow('', null),
  maneuverType: Joi.string().valid('rail', 'kicker', 'air', 'surface').required(),
  maneuverName: Joi.string().max(500).required(),
  maneuverPayload: Joi.alternatives(Joi.object().unknown(true), Joi.string()).optional(),
  rewardXp: Joi.number().integer().min(0).optional(),
});

router.get('/seasons', authMiddleware, requireModerator, async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, start_date, end_date, created_at FROM seasons ORDER BY start_date DESC NULLS LAST, created_at DESC'
    );
    res.json({ seasons: result.rows });
  } catch (error) {
    console.error('Erro ao listar temporadas:', error);
    res.status(500).json({ error: 'Erro ao listar temporadas' });
  }
});

router.post('/seasons', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = seasonSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, startDate, endDate } = value;

  try {
    const result = await pool.query(
      `INSERT INTO seasons (name, start_date, end_date)
       VALUES ($1, $2, $3)
       RETURNING id, name, start_date, end_date, created_at`,
      [name, startDate || null, endDate || null]
    );

    res.status(201).json({ season: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar temporada:', err);
    res.status(500).json({ error: 'Erro ao criar temporada' });
  }
});

router.get('/season-passes', authMiddleware, requireModerator, async (req, res) => {
  try {
    const { seasonId, parkId } = req.query;
    const filters = [];
    const values = [];

    if (seasonId) {
      values.push(seasonId);
      filters.push(`season_id = $${values.length}`);
    }
    if (parkId) {
      values.push(parkId);
      filters.push(`park_id = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT sp.id, sp.name, sp.description, sp.created_at, sp.season_id, sp.park_id,
              s.name AS season_name, p.name AS park_name
         FROM season_passes sp
         LEFT JOIN seasons s ON sp.season_id = s.id
         LEFT JOIN parks p ON sp.park_id = p.id
        ${whereClause}
        ORDER BY sp.created_at DESC`,
      values
    );
    res.json({ seasonPasses: result.rows });
  } catch (error) {
    console.error('Erro ao listar season passes:', error);
    res.status(500).json({ error: 'Erro ao listar season passes' });
  }
});

router.post('/season-passes', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = seasonPassSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { seasonId, parkId, name, description } = value;

  try {
    const result = await pool.query(
      `INSERT INTO season_passes (season_id, park_id, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, season_id, park_id, name, description, created_at`,
      [seasonId, parkId, name, description || null]
    );

    res.status(201).json({ seasonPass: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar season pass:', err);
    res.status(500).json({ error: 'Erro ao criar season pass' });
  }
});

// Public endpoint for all users to view monthly passes
const isMissingPassSchemaError = (error) => ['42P01', '42703'].includes(error?.code);

const runMonthlyPassQuery = async ({ userId, seasonPassId }) => {
  const values = [userId];
  let whereClause = '';

  if (seasonPassId) {
    values.push(seasonPassId);
    whereClause = `WHERE mp.season_pass_id = $2`;
  }

  const query = `
      SELECT mp.id,
             mp.name,
             mp.description,
             mp.month,
             mp.created_at,
             mp.season_pass_id,
             sp.name AS season_pass_name,
             sp.season_id,
             sp.park_id,
             upm.status IS NOT NULL AS is_joined,
             upm.joined_at
        FROM monthly_passes mp
        LEFT JOIN season_passes sp ON mp.season_pass_id = sp.id
        LEFT JOIN user_pass_memberships upm
          ON upm.monthly_pass_id = mp.id
         AND upm.user_id = $1
         AND upm.status = 'active'
       ${whereClause}
       ORDER BY mp.month ASC NULLS LAST, mp.created_at DESC
    `;

  try {
    const result = await pool.query(query, values);
    return result.rows.map((row) => ({
      ...row,
      is_joined: row.is_joined,
      joined_at: row.joined_at,
    }));
  } catch (error) {
    if (!isMissingPassSchemaError(error)) {
      throw error;
    }

    console.warn(
      '[challenges] user_pass_memberships não encontrado; retornando passes sem status de inscrição.',
    );
    const fallbackValues = [];
    let fallbackWhere = '';
    if (seasonPassId) {
      fallbackValues.push(seasonPassId);
      fallbackWhere = 'WHERE mp.season_pass_id = $1';
    }

    const fallbackResult = await pool.query(
      `
        SELECT mp.id,
               mp.name,
               mp.description,
               mp.month,
               mp.created_at,
               mp.season_pass_id,
               sp.name AS season_pass_name,
               sp.season_id,
               sp.park_id
          FROM monthly_passes mp
          LEFT JOIN season_passes sp ON mp.season_pass_id = sp.id
        ${fallbackWhere}
        ORDER BY mp.month ASC NULLS LAST, mp.created_at DESC
      `,
      fallbackValues,
    );

    return fallbackResult.rows.map((row) => ({
      ...row,
      is_joined: false,
      joined_at: null,
    }));
  }
};

router.get('/monthly-passes/public', authMiddleware, async (req, res) => {
  try {
    const { seasonPassId } = req.query;
    const monthlyPasses = await runMonthlyPassQuery({
      userId: req.user.id,
      seasonPassId,
    });
    res.json({ monthlyPasses });
  } catch (error) {
    if (isMissingPassSchemaError(error)) {
      console.warn(
        `[challenges] Estrutura de passes incompleta (code=${error.code}). Respondendo com lista vazia.`,
      );
      return res.json({ monthlyPasses: [] });
    }
    console.error('Erro ao listar monthly passes:', error);
    res.status(500).json({ error: 'Erro ao listar monthly passes' });
  }
});

// Moderator endpoint for managing monthly passes
router.get('/monthly-passes', authMiddleware, requireModerator, async (req, res) => {
  try {
    const { seasonPassId } = req.query;
    const values = [];
    let whereClause = '';

    if (seasonPassId) {
      values.push(seasonPassId);
      whereClause = `WHERE mp.season_pass_id = $1`;
    }

    const result = await pool.query(
      `SELECT mp.id, mp.name, mp.description, mp.month, mp.created_at, mp.season_pass_id,
              sp.name AS season_pass_name, sp.season_id, sp.park_id
         FROM monthly_passes mp
         LEFT JOIN season_passes sp ON mp.season_pass_id = sp.id
        ${whereClause}
        ORDER BY mp.month ASC, mp.created_at DESC`,
      values
    );

    res.json({ monthlyPasses: result.rows });
  } catch (error) {
    if (isMissingPassSchemaError(error)) {
      console.warn(
        `[challenges] Estrutura de passes incompleta (code=${error.code}). Respondendo com lista vazia.`,
      );
      return res.json({ monthlyPasses: [] });
    }
    console.error('Erro ao listar monthly passes:', error);
    res.status(500).json({ error: 'Erro ao listar monthly passes' });
  }
});

router.post('/monthly-passes', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = monthlyPassSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { seasonPassId, month, name, description } = value;

  try {
    const result = await pool.query(
      `INSERT INTO monthly_passes (season_pass_id, month, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, season_pass_id, month, name, description, created_at`,
      [seasonPassId, month, name, description || null]
    );

    res.status(201).json({ monthlyPass: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar monthly pass:', err);
    res.status(500).json({ error: 'Erro ao criar monthly pass' });
  }
});

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id,
              c.season_id,
              s.name AS season_name,
              c.park_id,
              p.name AS park_name,
              c.season_pass_id,
              sp.name AS season_pass_name,
              c.monthly_pass_id,
              mp.name AS monthly_pass_name,
              c.obstacle_ids,
              c.difficulty,
              c.maneuver_type,
              c.maneuver_name,
              c.maneuver_payload,
              c.reward_xp,
              c.created_at
         FROM challenges c
         LEFT JOIN seasons s ON c.season_id = s.id
         LEFT JOIN parks p ON c.park_id = p.id
         LEFT JOIN season_passes sp ON c.season_pass_id = sp.id
         LEFT JOIN monthly_passes mp ON c.monthly_pass_id = mp.id
        ORDER BY c.created_at DESC`
    );

    res.json({ challenges: result.rows });
  } catch (error) {
    console.error('Erro ao listar desafios:', error);
    res.status(500).json({ error: 'Erro ao listar desafios' });
  }
});

router.post('/monthly-passes/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id: passId } = req.params;

    if (!isUuid(passId)) {
      return res.status(400).json({ error: 'Passe inválido' });
    }

    const passResult = await pool.query(
      `SELECT mp.id,
              mp.name,
              mp.month,
              mp.season_pass_id
         FROM monthly_passes mp
        WHERE mp.id = $1`,
      [passId]
    );

    if (passResult.rows.length === 0) {
      return res.status(404).json({ error: 'Passe não encontrado' });
    }

    const pass = passResult.rows[0];
    const userId = req.user.id;

    const membershipResult = await pool.query(
      `SELECT id, status
         FROM user_pass_memberships
        WHERE user_id = $1 AND monthly_pass_id = $2`,
      [userId, passId]
    );

    if (membershipResult.rows.length > 0) {
      const membership = membershipResult.rows[0];

      if (membership.status === 'active') {
        const activeMembership = await pool.query(
          `SELECT id, status, joined_at
             FROM user_pass_memberships
            WHERE id = $1`,
          [membership.id]
        );

        return res.json({
          message: 'Você já está inscrito neste passe.',
          membership: activeMembership.rows[0],
        });
      }

      await pool.query(
        `UPDATE user_pass_memberships
            SET status = 'active', joined_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [membership.id]
      );
    } else {
      await pool.query(
        `INSERT INTO user_pass_memberships (user_id, season_pass_id, monthly_pass_id, status)
         VALUES ($1, $2, $3, 'active')`,
        [userId, pass.season_pass_id, pass.id]
      );
    }

    const membershipRecord = await pool.query(
      `SELECT id, status, joined_at
         FROM user_pass_memberships
        WHERE user_id = $1 AND monthly_pass_id = $2`,
      [userId, passId]
    );

    res.status(201).json({
      message: 'Inscrição no passe confirmada.',
      membership: {
        ...membershipRecord.rows[0],
        season_pass_id: pass.season_pass_id,
        monthly_pass_id: pass.id,
      },
    });
  } catch (error) {
    console.error('Erro ao entrar no passe:', error);
    res.status(500).json({ error: 'Erro ao entrar no passe' });
  }
});

router.post('/', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = challengeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    seasonId,
    parkId,
    seasonPassId,
    monthlyPassId,
    obstacleIds,
    difficulty,
    maneuverType,
    maneuverName,
    maneuverPayload,
    rewardXp,
  } = value;

  const normalizedManeuverType = (maneuverType || '').toLowerCase();
  const normalizedManeuverName = (maneuverName || '').trim();
  if (!normalizedManeuverName) {
    return res.status(400).json({ error: 'Informe o nome da manobra.' });
  }

  let parsedPayload = {};
  if (maneuverPayload) {
    try {
      parsedPayload = typeof maneuverPayload === 'string'
        ? JSON.parse(maneuverPayload)
        : maneuverPayload;
    } catch (payloadError) {
      return res.status(400).json({ error: 'Payload da manobra inválido.' });
    }
  }

  const payloadXp = Number(parsedPayload?.xp?.total ?? 0);
  const normalizedRewardXp = Number.isFinite(Number(rewardXp))
    ? Number(rewardXp)
    : payloadXp;

  try {
    const result = await pool.query(
      `INSERT INTO challenges (
         season_id,
         park_id,
         season_pass_id,
         monthly_pass_id,
         obstacle_ids,
         difficulty,
         maneuver_type,
         maneuver_name,
         maneuver_payload,
         reward_xp
       )
       VALUES ($1, $2, $3, $4, $5::uuid[], $6, $7, $8, $9::jsonb, $10)
       RETURNING id, season_id, park_id, season_pass_id, monthly_pass_id, obstacle_ids, difficulty, maneuver_type, maneuver_name, maneuver_payload, reward_xp, created_at`,
      [
        seasonId,
        parkId,
        seasonPassId,
        monthlyPassId,
        obstacleIds,
        difficulty || null,
        normalizedManeuverType,
        normalizedManeuverName,
        JSON.stringify(parsedPayload || {}),
        normalizedRewardXp,
      ]
    );

    res.status(201).json({ challenge: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar desafio:', err);
    res.status(500).json({ error: 'Erro ao criar desafio' });
  }
});

router.put('/:id', authMiddleware, requireModerator, async (req, res) => {
  const challengeId = req.params.id;
  const { error, value } = challengeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    seasonId,
    parkId,
    seasonPassId,
    monthlyPassId,
    obstacleIds,
    difficulty,
    maneuverType,
    maneuverName,
    maneuverPayload,
    rewardXp,
  } = value;

  const normalizedManeuverType = (maneuverType || '').toLowerCase();
  const normalizedManeuverName = (maneuverName || '').trim();
  if (!normalizedManeuverName) {
    return res.status(400).json({ error: 'Informe o nome da manobra.' });
  }

  let parsedPayload = {};
  if (maneuverPayload) {
    try {
      parsedPayload = typeof maneuverPayload === 'string'
        ? JSON.parse(maneuverPayload)
        : maneuverPayload;
    } catch (payloadError) {
      return res.status(400).json({ error: 'Payload da manobra inválido.' });
    }
  }

  const payloadXp = Number(parsedPayload?.xp?.total ?? 0);
  const normalizedRewardXp = Number.isFinite(Number(rewardXp))
    ? Number(rewardXp)
    : payloadXp;

  try {
    const result = await pool.query(
      `UPDATE challenges
         SET season_id = $1,
             park_id = $2,
             season_pass_id = $3,
             monthly_pass_id = $4,
             obstacle_ids = $5::uuid[],
             difficulty = $6,
             maneuver_type = $7,
             maneuver_name = $8,
             maneuver_payload = $9::jsonb,
             reward_xp = $10,
             created_at = created_at
       WHERE id = $11
       RETURNING id, season_id, park_id, season_pass_id, monthly_pass_id, obstacle_ids, difficulty, maneuver_type, maneuver_name, maneuver_payload, reward_xp, created_at`,
      [
        seasonId,
        parkId,
        seasonPassId,
        monthlyPassId,
        obstacleIds,
        difficulty || null,
        normalizedManeuverType,
        normalizedManeuverName,
        JSON.stringify(parsedPayload || {}),
        normalizedRewardXp,
        challengeId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Desafio não encontrado' });
    }

    res.json({ challenge: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar desafio:', err);
    res.status(500).json({ error: 'Erro ao atualizar desafio' });
  }
});

router.get('/completions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         ucc.id,
         ucc.video_id,
         ucc.completed_at,
         c.id AS challenge_id,
         c.maneuver_type,
         c.maneuver_name,
         c.maneuver_payload,
         c.reward_xp,
         c.difficulty,
         c.obstacle_ids,
         c.season_id,
         c.park_id,
         c.season_pass_id,
         c.monthly_pass_id,
         mp.name AS monthly_pass_name,
         sp.name AS season_pass_name,
         s.name AS season_name,
         p.name AS park_name
       FROM user_challenge_completions ucc
       JOIN challenges c ON c.id = ucc.challenge_id
       LEFT JOIN monthly_passes mp ON mp.id = c.monthly_pass_id
       LEFT JOIN season_passes sp ON sp.id = c.season_pass_id
       LEFT JOIN seasons s ON s.id = c.season_id
       LEFT JOIN parks p ON p.id = c.park_id
       WHERE ucc.user_id = $1
       ORDER BY ucc.completed_at DESC`,
      [req.user.id]
    );

    res.json({ completions: result.rows });
  } catch (error) {
    console.error('Erro ao buscar desafios concluídos:', error);
    res.status(500).json({ error: 'Erro ao buscar desafios concluídos' });
  }
});

module.exports = router;
