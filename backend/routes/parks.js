const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, requireModerator } = require('../middleware/auth');

const router = express.Router();

const parkSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  address: Joi.string().allow('', null),
  website: Joi.string().uri().allow('', null),
  phone: Joi.string().allow('', null),
  logoUrl: Joi.string().uri().allow('', null),
  isActive: Joi.boolean().optional(),
});

const parkUpdateSchema = parkSchema.fork(
  ['name', 'description', 'latitude', 'longitude', 'address', 'website', 'phone', 'logoUrl', 'isActive'],
  (schema) => schema.optional(),
);

const obstacleSchema = Joi.object({
  name: Joi.string().max(100).required(),
  type: Joi.string().max(50).required(),
  description: Joi.string().allow('', null),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  parkId: Joi.string().uuid().optional(),
  difficultyLevel: Joi.number().integer().min(1).max(5).required(),
});

const obstacleUpdateSchema = obstacleSchema.fork(
  ['name', 'type', 'description', 'difficultyLevel', 'latitude', 'longitude', 'parkId'],
  (schema) => schema.optional(),
);

// Get all parks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, name, description, latitude, longitude, 
        address, website, phone, logo_url, created_at
      FROM parks
      WHERE is_active = true
      ORDER BY name ASC
    `);

    res.json({ parks: result.rows });

  } catch (error) {
    console.error('Erro ao buscar parques:', error);
    res.status(500).json({ error: 'Erro ao buscar parques' });
  }
});

// Moderator: list all parks (including inativos)
router.get('/admin', authMiddleware, requireModerator, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, name, description, latitude, longitude,
        address, website, phone, logo_url, created_at, is_active
      FROM parks
      ORDER BY name ASC
    `);

    res.json({ parks: result.rows });
  } catch (error) {
    console.error('Erro ao buscar parques (admin):', error);
    res.status(500).json({ error: 'Erro ao buscar parques', details: error.message });
  }
});

// Admin: create park
router.post('/', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = parkSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    name,
    description,
    latitude,
    longitude,
    address,
    website,
    phone,
    logoUrl,
    isActive,
  } = value;

  try {
    const result = await pool.query(
      `INSERT INTO parks (name, description, latitude, longitude, address, website, phone, logo_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, true))
       RETURNING id, name, description, latitude, longitude, address, website, phone, logo_url, created_at, is_active`,
      [
        name,
        description || null,
        latitude,
        longitude,
        address || null,
        website || null,
        phone || null,
        logoUrl || null,
        isActive,
      ]
    );

    res.status(201).json({ park: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar parque:', err);
    res.status(500).json({ error: 'Erro ao criar parque' });
  }
});

// Admin: update park
router.put('/:id', authMiddleware, requireModerator, async (req, res) => {
  const parkId = req.params.id;
  const { error, value } = parkUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const fields = [];
  const values = [];
  let index = 1;

  const mapField = (column, val) => {
    fields.push(`${column} = $${index}`);
    values.push(val);
    index += 1;
  };

  if (value.name !== undefined) mapField('name', value.name);
  if (value.description !== undefined) mapField('description', value.description || null);
  if (value.latitude !== undefined) mapField('latitude', value.latitude);
  if (value.longitude !== undefined) mapField('longitude', value.longitude);
  if (value.address !== undefined) mapField('address', value.address || null);
  if (value.website !== undefined) mapField('website', value.website || null);
  if (value.phone !== undefined) mapField('phone', value.phone || null);
  if (value.logoUrl !== undefined) mapField('logo_url', value.logoUrl || null);
  if (value.isActive !== undefined) mapField('is_active', value.isActive);

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  values.push(parkId);

  try {
    const result = await pool.query(
      `UPDATE parks SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, name, description, latitude, longitude, address, website, phone, logo_url, created_at, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parque não encontrado' });
    }

    res.json({ park: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar parque:', err);
    res.status(500).json({ error: 'Erro ao atualizar parque' });
  }
});

// Admin: delete park (soft delete)
router.delete('/:id', authMiddleware, requireModerator, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE parks SET is_active = false WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parque não encontrado' });
    }

    res.json({ message: 'Parque desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao remover parque:', error);
    res.status(500).json({ error: 'Erro ao remover parque' });
  }
});

// Admin: list obstacles
router.get('/obstacles', authMiddleware, requireModerator, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, type, description, latitude, longitude, difficulty_level, park_id
      FROM obstacles
      ORDER BY type ASC, difficulty_level ASC
    `);

    res.json({ obstacles: result.rows });
  } catch (error) {
    console.error('Erro ao buscar obstáculos:', error);
    res.status(500).json({ error: 'Erro ao buscar obstáculos', details: error.message });
  }
});

// Admin: create obstacle
router.post('/obstacles', authMiddleware, requireModerator, async (req, res) => {
  const { error, value } = obstacleSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const result = await pool.query(
      `INSERT INTO obstacles (name, type, description, latitude, longitude, difficulty_level, park_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, type, description, latitude, longitude, difficulty_level, park_id`,
      [
        value.name,
        value.type,
        value.description || null,
        value.latitude,
        value.longitude,
        value.difficultyLevel,
        value.parkId || null,
      ]
    );

    res.status(201).json({ obstacle: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar obstáculo:', err);
    res.status(500).json({ error: 'Erro ao criar obstáculo' });
  }
});

// Admin: update obstacle
router.put('/obstacles/:id', authMiddleware, requireModerator, async (req, res) => {
  const obstacleId = req.params.id;
  const { error, value } = obstacleUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const fields = [];
  const values = [];
  let index = 1;

  if (value.name !== undefined) {
    fields.push(`name = $${index}`);
    values.push(value.name);
    index += 1;
  }
  if (value.type !== undefined) {
    fields.push(`type = $${index}`);
    values.push(value.type);
    index += 1;
  }
  if (value.latitude !== undefined) {
    fields.push(`latitude = $${index}`);
    values.push(value.latitude);
    index += 1;
  }
  if (value.longitude !== undefined) {
    fields.push(`longitude = $${index}`);
    values.push(value.longitude);
    index += 1;
  }
  if (value.description !== undefined) {
    fields.push(`description = $${index}`);
    values.push(value.description || null);
    index += 1;
  }
  if (value.difficultyLevel !== undefined) {
    fields.push(`difficulty_level = $${index}`);
    values.push(value.difficultyLevel);
    index += 1;
  }
  if (value.parkId !== undefined) {
    fields.push(`park_id = $${index}`);
    values.push(value.parkId || null);
    index += 1;
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  values.push(obstacleId);

  try {
    const result = await pool.query(
      `UPDATE obstacles SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, name, type, description, latitude, longitude, difficulty_level, park_id`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Obstáculo não encontrado' });
    }

    res.json({ obstacle: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar obstáculo:', err);
    res.status(500).json({ error: 'Erro ao atualizar obstáculo' });
  }
});

// Admin: delete obstacle
router.delete('/obstacles/:id', authMiddleware, requireModerator, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM obstacles WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Obstáculo não encontrado' });
    }

    res.json({ message: 'Obstáculo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover obstáculo:', error);
    res.status(500).json({ error: 'Erro ao remover obstáculo' });
  }
});

// Get park by ID
router.get('/:id', async (req, res) => {
  try {
    const parkId = req.params.id;

    const parkResult = await pool.query(`
      SELECT 
        id, name, description, latitude, longitude, 
        address, website, phone, logo_url, created_at
      FROM parks
      WHERE id = $1 AND is_active = true
    `, [parkId]);

    if (parkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parque não encontrado' });
    }

    const park = parkResult.rows[0];

    // Get park stats
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM videos WHERE park_id = $1) as total_videos,
        (SELECT COUNT(DISTINCT user_id) FROM videos WHERE park_id = $1) as unique_visitors,
        (SELECT COUNT(*) FROM checkins WHERE park_id = $1 AND checked_in_at > NOW() - INTERVAL '30 days') as recent_checkins
    `, [parkId]);

    park.stats = statsResult.rows[0];

    // Get recent videos from this park
    const videosResult = await pool.query(`
      SELECT 
        v.id, v.video_url, v.thumbnail_url, v.description, v.created_at,
        u.id as user_id, u.username, u.full_name, u.profile_image_url
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.park_id = $1
      ORDER BY v.created_at DESC
      LIMIT 6
    `, [parkId]);

    park.recent_videos = videosResult.rows;

    res.json({ park });

  } catch (error) {
    console.error('Erro ao buscar parque:', error);
    res.status(500).json({ error: 'Erro ao buscar parque' });
  }
});

// Get park obstacles
router.get('/:id/obstacles', async (req, res) => {
  try {
    const parkId = req.params.id;

    const result = await pool.query(`
      SELECT 
        id, name, type, description, latitude, longitude, difficulty_level, park_id
      FROM obstacles
      WHERE park_id = $1
      ORDER BY type ASC, difficulty_level ASC
    `, [parkId]);

    res.json({ obstacles: result.rows });

  } catch (error) {
    console.error('Erro ao buscar obstáculos:', error);
    res.status(500).json({ error: 'Erro ao buscar obstáculos' });
  }
});

// Check-in to park (when user posts video)
router.post('/:id/checkin', authMiddleware, async (req, res) => {
  try {
    const parkId = req.params.id;
    const userId = req.user.id;
    const { videoId } = req.body;

    // Check if park exists
    const parkResult = await pool.query('SELECT id FROM parks WHERE id = $1 AND is_active = true', [parkId]);
    if (parkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parque não encontrado' });
    }

    // Create check-in
    await pool.query(
      'INSERT INTO checkins (user_id, park_id, video_id) VALUES ($1, $2, $3)',
      [userId, parkId, videoId || null]
    );

    res.json({ message: 'Check-in realizado com sucesso' });

  } catch (error) {
    console.error('Erro ao fazer check-in:', error);
    res.status(500).json({ error: 'Erro ao fazer check-in' });
  }
});

// Get nearby parks (placeholder - would use real geolocation)
router.get('/nearby/:lat/:lng', async (req, res) => {
  try {
    const latitude = Number.parseFloat(req.params.lat);
    const longitude = Number.parseFloat(req.params.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: 'Coordenadas inválidas para buscar parques próximos.' });
    }

    const radiusParam = Number.parseFloat(req.query.radius);
    const radius = Number.isFinite(radiusParam)
      ? Math.min(Math.max(radiusParam, 1), 500)
      : 200;

    const result = await pool.query(
      `
        SELECT 
          id, name, description, latitude, longitude, address,
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          ) as distance_km
        FROM parks
        WHERE is_active = true
        HAVING 6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(latitude))
        ) <= $3
        ORDER BY distance_km ASC
      `,
      [latitude, longitude, radius]
    );

    res.json({ parks: result.rows });
  } catch (error) {
    console.error('Erro ao buscar parques próximos:', error);
    res.status(500).json({ error: 'Erro ao buscar parques próximos' });
  }
});

// Get park leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const parkId = req.params.id;
    const { period = 'all' } = req.query;

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND v.created_at > NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND v.created_at > NOW() - INTERVAL '30 days'";
    }

    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.full_name, u.profile_image_url,
        COUNT(v.id) as videos_count,
        SUM(v.likes_count) as total_likes,
        MAX(v.created_at) as last_video_date
      FROM users u
      JOIN videos v ON u.id = v.user_id
      WHERE v.park_id = $1 ${dateFilter}
      GROUP BY u.id, u.username, u.full_name, u.profile_image_url
      ORDER BY total_likes DESC, videos_count DESC
      LIMIT 10
    `, [parkId]);

    res.json({ leaderboard: result.rows });

  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    res.status(500).json({ error: 'Erro ao buscar leaderboard' });
  }
});

module.exports = router;
