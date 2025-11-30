const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { authMiddleware, requireSuperModerator } = require('../middleware/auth');
const pool = require('../config/database');

const nodeFieldSchema = {
  specialization: Joi.string().valid('slider', 'kicker', 'surface'),
  tier: Joi.number().integer().min(1).max(10),
  position: Joi.number().integer().min(0),
  title: Joi.string().max(120),
  description: Joi.string().allow('', null),
  trickId: Joi.string().guid({ version: 'uuidv4' }).allow(null, ''),
  tutorialVideoUrl: Joi.string().uri().allow('', null, ''),
  tips: Joi.array().items(Joi.string().trim().max(240)),
  commonMistakes: Joi.array().items(Joi.string().trim().max(240)),
  prerequisites: Joi.array().items(Joi.string().trim().max(200)),
  requiredForUnlock: Joi.boolean(),
  xpBonus: Joi.number().integer().min(0),
  badgeReward: Joi.string().allow('', null),
  repeatable: Joi.boolean(),
  branchType: Joi.string().valid('spin', 'merge', 'ollie', 'grab').allow(null, ''),
  displayRow: Joi.number().integer().min(1).max(20).allow(null),
  mergeLeftNodeId: Joi.string().guid({ version: 'uuidv4' }).allow(null, ''),
  mergeRightNodeId: Joi.string().guid({ version: 'uuidv4' }).allow(null, ''),
  isSharedNode: Joi.boolean(),
};

const createNodeSchema = Joi.object({
  ...nodeFieldSchema,
  specialization: nodeFieldSchema.specialization.required(),
  tier: nodeFieldSchema.tier.required(),
  position: nodeFieldSchema.position.required(),
  title: nodeFieldSchema.title.required(),
  tips: nodeFieldSchema.tips.default([]),
  commonMistakes: nodeFieldSchema.commonMistakes.default([]),
  prerequisites: nodeFieldSchema.prerequisites.default([]),
  requiredForUnlock: nodeFieldSchema.requiredForUnlock.default(false),
  repeatable: nodeFieldSchema.repeatable.default(true),
  xpBonus: nodeFieldSchema.xpBonus.default(50),
  isSharedNode: nodeFieldSchema.isSharedNode.default(false),
});

const updateNodeSchema = Joi.object({
  ...nodeFieldSchema,
  tips: nodeFieldSchema.tips,
  commonMistakes: nodeFieldSchema.commonMistakes,
  prerequisites: nodeFieldSchema.prerequisites,
}).min(1);

const normalizeStringArray = (input) => {
  if (!input) return [];
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
};

const toNullable = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};

const normalizeNodePayload = (value) => {
  const normalized = {};

  if (value.specialization !== undefined) normalized.specialization = value.specialization;
  if (value.tier !== undefined) normalized.tier = value.tier;
  if (value.position !== undefined) normalized.position = value.position;
  if (value.title !== undefined) normalized.title = value.title;
  if (value.description !== undefined) normalized.description = toNullable(value.description);
  if (value.trickId !== undefined) normalized.trick_id = toNullable(value.trickId);
  if (value.tutorialVideoUrl !== undefined) {
    normalized.tutorial_video_url = toNullable(value.tutorialVideoUrl);
  }
  if (value.tips !== undefined) normalized.tips = JSON.stringify(normalizeStringArray(value.tips));
  if (value.commonMistakes !== undefined) {
    normalized.common_mistakes = JSON.stringify(normalizeStringArray(value.commonMistakes));
  }
  if (value.prerequisites !== undefined) {
    normalized.prerequisites = JSON.stringify(normalizeStringArray(value.prerequisites));
  }
  if (value.requiredForUnlock !== undefined) {
    normalized.required_for_unlock = value.requiredForUnlock;
  }
  if (value.xpBonus !== undefined) normalized.xp_bonus = value.xpBonus;
  if (value.badgeReward !== undefined) normalized.badge_reward = toNullable(value.badgeReward);
  if (value.repeatable !== undefined) normalized.repeatable = value.repeatable;
  if (value.branchType !== undefined) {
    normalized.branch_type = value.branchType ? value.branchType : null;
  }
  if (value.displayRow !== undefined) {
    normalized.display_row = value.displayRow === null ? null : value.displayRow;
  }
  if (value.mergeLeftNodeId !== undefined) {
    normalized.merge_left_node_id = toNullable(value.mergeLeftNodeId);
  }
  if (value.mergeRightNodeId !== undefined) {
    normalized.merge_right_node_id = toNullable(value.mergeRightNodeId);
  }
  if (value.isSharedNode !== undefined) normalized.is_shared_node = value.isSharedNode;

  return normalized;
};

const serializeNode = (row) => ({
  id: row.id,
  specialization: row.specialization,
  tier: row.tier,
  position: row.position,
  branchType: row.branch_type,
  displayRow: row.display_row,
  mergeLeftNodeId: row.merge_left_node_id,
  mergeRightNodeId: row.merge_right_node_id,
  isSharedNode: row.is_shared_node,
  title: row.title,
  description: row.description,
  trickId: row.trick_id,
  trickName: row.trick_name || null,
  trickShortName: row.trick_short_name || null,
  tutorialVideoUrl: row.tutorial_video_url,
  tips: row.tips || [],
  commonMistakes: row.common_mistakes || [],
  prerequisites: row.prerequisites || [],
  requiredForUnlock: row.required_for_unlock,
  xpBonus: row.xp_bonus,
  badgeReward: row.badge_reward,
  repeatable: row.repeatable,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fetchNodeById = async (nodeId) => {
  const result = await pool.query(
    `
      SELECT stn.*, t.nome AS trick_name, t.nome_curto AS trick_short_name
        FROM skill_tree_nodes stn
        LEFT JOIN tricks t ON t.id = stn.trick_id
       WHERE stn.id = $1
       LIMIT 1
    `,
    [nodeId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return serializeNode(result.rows[0]);
};

const handleDbError = (error, res) => {
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Já existe um nó com esta combinação de especialização, tier e posição.' });
  }
  if (error.code === '23514') {
    return res.status(400).json({ error: 'Dados inválidos para o nó (violação de constraint). Verifique branch_type e merges.' });
  }
  console.error('Erro no skill-tree-admin:', error);
  return res.status(500).json({ error: 'Erro interno ao gerenciar skill tree' });
};

router.get('/nodes', authMiddleware, requireSuperModerator, async (req, res) => {
  try {
    const { specialization, branchType, search } = req.query;
    const params = [];
    const conditions = [];

    if (specialization) {
      params.push(specialization);
      conditions.push(`stn.specialization = $${params.length}`);
    }
    if (branchType) {
      params.push(branchType);
      conditions.push(`stn.branch_type = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(stn.title) LIKE $${params.length} OR LOWER(stn.description) LIKE $${params.length})`);
    }

    let query = `
      SELECT stn.*, t.nome AS trick_name, t.nome_curto AS trick_short_name
        FROM skill_tree_nodes stn
        LEFT JOIN tricks t ON t.id = stn.trick_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY stn.specialization, stn.tier, stn.position';

    const result = await pool.query(query, params);
    res.json({
      success: true,
      nodes: result.rows.map(serializeNode),
    });
  } catch (error) {
    console.error('Erro ao listar nós da skill tree:', error);
    res.status(500).json({ error: 'Erro ao listar nós da skill tree' });
  }
});

router.get('/nodes/:nodeId', authMiddleware, requireSuperModerator, async (req, res) => {
  try {
    const node = await fetchNodeById(req.params.nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Nó não encontrado' });
    }
    res.json({ success: true, node });
  } catch (error) {
    console.error('Erro ao obter nó da skill tree:', error);
    res.status(500).json({ error: 'Erro ao obter nó da skill tree' });
  }
});

router.post('/nodes', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = createNodeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.details.map((d) => d.message).join(', ') });
  }

  const payload = normalizeNodePayload(value);

  if (payload.branch_type === 'merge') {
    if (!payload.merge_left_node_id || !payload.merge_right_node_id) {
      return res.status(400).json({ error: 'Nó do tipo merge exige merge_left_node_id e merge_right_node_id' });
    }
  } else {
    payload.merge_left_node_id = null;
    payload.merge_right_node_id = null;
  }

  try {
    const insertResult = await pool.query(
      `
        INSERT INTO skill_tree_nodes (
          specialization, tier, position, title, description,
          trick_id, tutorial_video_url, tips, common_mistakes,
          prerequisites, required_for_unlock, xp_bonus, badge_reward,
          repeatable, branch_type, display_row, merge_left_node_id,
          merge_right_node_id, is_shared_node
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8::jsonb, $9::jsonb,
          $10::jsonb, $11, $12, $13,
          $14, $15, $16, $17, $18, $19
        )
        RETURNING id
      `,
      [
        payload.specialization,
        payload.tier,
        payload.position,
        payload.title,
        payload.description ?? null,
        payload.trick_id,
        payload.tutorial_video_url,
        payload.tips || '[]',
        payload.common_mistakes || '[]',
        payload.prerequisites || '[]',
        payload.required_for_unlock ?? false,
        payload.xp_bonus ?? 0,
        payload.badge_reward ?? null,
        payload.repeatable ?? true,
        payload.branch_type ?? null,
        payload.display_row ?? null,
        payload.merge_left_node_id ?? null,
        payload.merge_right_node_id ?? null,
        payload.is_shared_node ?? false,
      ],
    );

    const node = await fetchNodeById(insertResult.rows[0].id);
    res.status(201).json({ success: true, node });
  } catch (err) {
    handleDbError(err, res);
  }
});

router.put('/nodes/:nodeId', authMiddleware, requireSuperModerator, async (req, res) => {
  const { error, value } = updateNodeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.details.map((d) => d.message).join(', ') });
  }

  const payload = normalizeNodePayload(value);
  if (payload.branch_type !== undefined) {
    if (payload.branch_type === 'merge') {
      if (!payload.merge_left_node_id || !payload.merge_right_node_id) {
        return res.status(400).json({ error: 'Nó do tipo merge exige merge_left_node_id e merge_right_node_id' });
      }
    } else {
      payload.merge_left_node_id = null;
      payload.merge_right_node_id = null;
    }
  }

  const fields = [];
  const params = [];
  let index = 1;

  Object.entries(payload).forEach(([column, val]) => {
    if (val !== undefined) {
      if (['tips', 'common_mistakes', 'prerequisites'].includes(column)) {
        fields.push(`${column} = $${index}::jsonb`);
      } else {
        fields.push(`${column} = $${index}`);
      }
      params.push(val);
      index += 1;
    }
  });

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  params.push(req.params.nodeId);

  try {
    const updateResult = await pool.query(
      `
        UPDATE skill_tree_nodes
           SET ${fields.join(', ')},
               updated_at = NOW()
         WHERE id = $${index}
      `,
      params,
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Nó não encontrado' });
    }

    const node = await fetchNodeById(req.params.nodeId);
    res.json({ success: true, node });
  } catch (err) {
    handleDbError(err, res);
  }
});

/**
 * POST /api/skill-tree-admin/seed
 * Seed the skill tree with initial quest nodes
 * ADMIN ONLY
 */
router.post('/seed', authMiddleware, requireSuperModerator, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if nodes already exist
    const checkResult = await client.query('SELECT COUNT(*) FROM skill_tree_nodes');
    const existingCount = parseInt(checkResult.rows[0].count);

    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Found ${existingCount} existing nodes. Delete them first if you want to re-seed.`
      });
    }

    // Sample skill tree nodes for each specialization
    const skillTreeNodes = [
      // SLIDER SPECIALIST
      {
        specialization: 'slider',
        tier: 1,
        position: 1,
        title: 'First Boardslide',
        description: 'Learn the basic boardslide on a low rail. Keep your weight centered.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Approach the rail at a 45-degree angle',
            'Pop up and rotate 90 degrees',
            'Keep your knees bent and weight centered'
          ],
          commonMistakes: [
            'Leaning too far back or forward',
            'Not committing to the rotation'
          ]
        },
        requirements: {
          prerequisites: [],
          requiredForUnlock: true
        },
        rewards: {
          xpBonus: 100,
          badge: null
        },
        repeatable: true
      },
      {
        specialization: 'slider',
        tier: 1,
        position: 2,
        title: 'First Lipslide',
        description: 'Master the lipslide - the opposite of a boardslide.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Approach from the opposite side compared to boardslide',
            'Rotate in the opposite direction',
            'Keep your eyes on the end of the rail'
          ],
          commonMistakes: [
            'Under-rotating the initial pop',
            'Not looking where you want to go'
          ]
        },
        requirements: {
          prerequisites: [],
          requiredForUnlock: false
        },
        rewards: {
          xpBonus: 100,
          badge: null
        },
        repeatable: true
      },
      {
        specialization: 'slider',
        tier: 2,
        position: 1,
        title: 'Advanced Boardslide',
        description: 'Take your boardslide to a taller rail or add style.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Maintain balance throughout the entire rail',
            'Add grabs or tweaks for style points',
            'Practice smooth exits'
          ],
          commonMistakes: [
            'Rushing the trick',
            'Not maintaining speed'
          ]
        },
        requirements: {
          prerequisites: ['First Boardslide'],
          requiredForUnlock: true
        },
        rewards: {
          xpBonus: 200,
          badge: null
        },
        repeatable: true
      },

      // KICKER SPECIALIST
      {
        specialization: 'kicker',
        tier: 1,
        position: 1,
        title: 'First Straight Air',
        description: 'Launch off the kicker and land smoothly without rotation.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Build up good speed approaching the kicker',
            'Stay balanced in the air',
            'Spot your landing early'
          ],
          commonMistakes: [
            'Not enough speed',
            'Leaning back in the air'
          ]
        },
        requirements: {
          prerequisites: [],
          requiredForUnlock: true
        },
        rewards: {
          xpBonus: 100,
          badge: null
        },
        repeatable: true
      },
      {
        specialization: 'kicker',
        tier: 1,
        position: 2,
        title: 'First Grab',
        description: 'Add your first grab to a straight air for style.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Tuck your knees up to reach the board',
            'Hold the grab for at least 1 second',
            'Common grabs: Indy, Method, Mute'
          ],
          commonMistakes: [
            'Reaching too early',
            'Not tucking knees enough'
          ]
        },
        requirements: {
          prerequisites: [],
          requiredForUnlock: false
        },
        rewards: {
          xpBonus: 150,
          badge: null
        },
        repeatable: true
      },
      {
        specialization: 'kicker',
        tier: 2,
        position: 1,
        title: 'First 180',
        description: 'Rotate 180 degrees in the air and land switch.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Wind up your shoulders before takeoff',
            'Spot your landing halfway through',
            'Land with knees bent to absorb impact'
          ],
          commonMistakes: [
            'Over-rotating or under-rotating',
            'Not looking at the landing'
          ]
        },
        requirements: {
          prerequisites: ['First Straight Air'],
          requiredForUnlock: true
        },
        rewards: {
          xpBonus: 250,
          badge: null
        },
        repeatable: true
      },

      // SURFACE SPECIALIST
      {
        specialization: 'surface',
        tier: 1,
        position: 1,
        title: 'First Surface 180',
        description: 'Perform a 180-degree rotation on the water surface.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Start with good edge control',
            'Use your shoulders to initiate the spin',
            'Keep your weight centered'
          ],
          commonMistakes: [
            'Leaning too far forward or back',
            'Not committing to the rotation'
          ]
        },
        requirements: {
          prerequisites: [],
          requiredForUnlock: true
        },
        rewards: {
          xpBonus: 100,
          badge: null
        },
        repeatable: true
      },
      {
        specialization: 'surface',
        tier: 1,
        position: 2,
        title: 'First Ollie',
        description: 'Pop an ollie off the water to practice your timing.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Load the tail of the board',
            'Pop off the back foot',
            'Level out in the air'
          ],
          commonMistakes: [
            'Not loading enough weight on the tail',
            'Popping too late or too early'
          ]
        },
        requirements: {
          prerequisites: [],
          requiredForUnlock: false
        },
        rewards: {
          xpBonus: 120,
          badge: null
        },
        repeatable: true
      },
      {
        specialization: 'surface',
        tier: 2,
        position: 1,
        title: 'Surface 360',
        description: 'Complete a full 360-degree rotation on the surface.',
        trick_id: null,
        educational_data: {
          tutorialVideoUrl: null,
          tips: [
            'Build on your 180 technique',
            'Maintain speed throughout the rotation',
            'Keep your eyes on where you want to go'
          ],
          commonMistakes: [
            'Losing speed mid-rotation',
            'Not spotting your exit'
          ]
        },
        requirements: {
          prerequisites: ['First Surface 180'],
          requiredForUnlock: true
        },
        rewards: {
          xpBonus: 200,
          badge: 'Surface Spinner'
        },
        repeatable: true
      }
    ];

    // Insert nodes
    let insertedCount = 0;
    const insertedNodes = [];

    for (const node of skillTreeNodes) {
      const result = await client.query(`
        INSERT INTO skill_tree_nodes (
          specialization,
          tier,
          position,
          title,
          description,
          trick_id,
          educational_data,
          requirements,
          rewards,
          repeatable
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, title, specialization, tier
      `, [
        node.specialization,
        node.tier,
        node.position,
        node.title,
        node.description,
        node.trick_id,
        JSON.stringify(node.educational_data),
        JSON.stringify(node.requirements),
        JSON.stringify(node.rewards),
        node.repeatable
      ]);

      insertedCount++;
      insertedNodes.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully seeded ${insertedCount} skill tree nodes`,
      breakdown: {
        slider: skillTreeNodes.filter(n => n.specialization === 'slider').length,
        kicker: skillTreeNodes.filter(n => n.specialization === 'kicker').length,
        surface: skillTreeNodes.filter(n => n.specialization === 'surface').length
      },
      nodes: insertedNodes
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding skill tree:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao popular skill tree',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/skill-tree-admin/seed-grid
 * Seed the Surface specialization grid (SPIN | MERGE | OLLIE layout)
 * ADMIN ONLY
 */
router.post('/seed-grid', authMiddleware, requireSuperModerator, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if grid nodes already exist
    const checkResult = await client.query(
      "SELECT COUNT(*) FROM skill_tree_nodes WHERE branch_type IS NOT NULL"
    );
    const existingGridNodes = parseInt(checkResult.rows[0].count);

    if (existingGridNodes > 0) {
      return res.status(400).json({
        success: false,
        message: `Found ${existingGridNodes} existing grid nodes. Delete them first if you want to re-seed.`
      });
    }

    // ROW 1: FRONTSIDE 180 (Tier 1)
    const ollieBasicResult = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node
      ) VALUES (
        'surface', 1, 3, 'ollie', 1,
        'Ollie',
        'Master the basic ollie - the foundation for all tricks. Pop off the water and land smoothly.',
        NULL,
        $1, $2, $3, true,
        100, NULL, true, true
      ) RETURNING id
    `, [
      JSON.stringify(['Load weight on the tail of the board', 'Pop explosively off the back foot', 'Level out in the air with front foot', 'Spot your landing early']),
      JSON.stringify(['Not loading enough weight on the tail', 'Popping too late or too early', 'Landing with stiff legs']),
      JSON.stringify([])
    ]);
    const ollieBasicId = ollieBasicResult.rows[0].id;

    const spinFS180Result = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node
      ) VALUES (
        'surface', 1, 1, 'spin', 1,
        'Frontside "FS" 180',
        'Perform a 180-degree frontside rotation on the water surface. Your first spin trick!',
        NULL,
        $1, $2, $3, true,
        120, NULL, true, false
      ) RETURNING id
    `, [
      JSON.stringify(['Start with good edge control', 'Use your shoulders to initiate the spin', 'Keep your weight centered throughout', 'Look where you want to go']),
      JSON.stringify(['Leaning too far forward or back', 'Not committing to the full rotation', 'Losing balance mid-spin']),
      JSON.stringify([])
    ]);
    const spinFS180Id = spinFS180Result.rows[0].id;

    await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node,
        merge_left_node_id, merge_right_node_id
      ) VALUES (
        'surface', 1, 2, 'merge', 1,
        'Ollie Frontside "FS" 180',
        'Combine an ollie with a frontside 180 rotation. Pop up and spin!',
        NULL,
        $1, $2, $3, true,
        250, NULL, true, false, $4, $5
      )
    `, [
      JSON.stringify(['Master both Ollie and FS 180 first', 'Pop the ollie, then initiate rotation', 'Keep the rotation smooth and controlled', 'Spot your landing at 90 degrees']),
      JSON.stringify(['Rotating before popping', 'Over-rotating or under-rotating', 'Not maintaining height during spin']),
      JSON.stringify([spinFS180Id, ollieBasicId]),
      spinFS180Id,
      ollieBasicId
    ]);

    // ROW 2: SWITCH FRONTSIDE 180 (Tier 2)
    const ollieSwitchResult = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node
      ) VALUES (
        'surface', 2, 3, 'ollie', 2,
        'Ollie Switch',
        'Execute an ollie while riding switch (opposite stance). Advanced pop control required.',
        NULL,
        $1, $2, $3, true,
        150, NULL, true, true
      ) RETURNING id
    `, [
      JSON.stringify(['Get comfortable riding switch first', 'Load the tail just like regular ollie', 'Build confidence with small pops first', 'Practice landing switch smoothly']),
      JSON.stringify(['Not being comfortable in switch stance', 'Weak pop due to unfamiliar foot position', 'Landing off-balance']),
      JSON.stringify([ollieBasicId])
    ]);
    const ollieSwitchId = ollieSwitchResult.rows[0].id;

    const spinSWFS180Result = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node
      ) VALUES (
        'surface', 2, 1, 'spin', 2,
        'Switch "SW" Frontside "FS" 180',
        'Frontside 180 while riding switch. Combines switch riding with frontside rotation.',
        NULL,
        $1, $2, $3, true,
        180, NULL, true, false
      ) RETURNING id
    `, [
      JSON.stringify(['Master regular FS 180 first', 'Get comfortable riding switch', 'Initiate rotation with shoulders', 'Land in regular stance']),
      JSON.stringify(['Rushing the rotation', 'Not being stable in switch stance', 'Over-rotating due to unfamiliar mechanics']),
      JSON.stringify([spinFS180Id])
    ]);
    const spinSWFS180Id = spinSWFS180Result.rows[0].id;

    await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node,
        merge_left_node_id, merge_right_node_id
      ) VALUES (
        'surface', 2, 2, 'merge', 2,
        'Ollie Switch "SW" Frontside "FS" 180',
        'The ultimate combo: ollie while switch, then rotate frontside 180. Advanced trick!',
        NULL,
        $1, $2, $3, true,
        350, 'Switch Master', true, false, $4, $5
      )
    `, [
      JSON.stringify(['Master both switch ollie and switch FS 180', 'Pop explosively while switch', 'Rotate smoothly through the air', 'Land in regular stance with confidence']),
      JSON.stringify(['Not committing to the full movement', 'Weak pop from switch stance', 'Landing off-balance']),
      JSON.stringify([spinSWFS180Id, ollieSwitchId]),
      spinSWFS180Id,
      ollieSwitchId
    ]);

    // ROW 3: BACKSIDE 180 (Tier 1)
    const spinBS180Result = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node
      ) VALUES (
        'surface', 1, 1, 'spin', 3,
        'Backside "BS" 180',
        'Perform a 180-degree backside rotation on the water surface. Opposite direction from frontside.',
        NULL,
        $1, $2, $3, true,
        120, NULL, true, false
      ) RETURNING id
    `, [
      JSON.stringify(['Rotate in the opposite direction from frontside', 'Use your shoulders to lead the spin', 'Keep your head turned toward landing', 'Maintain edge control throughout']),
      JSON.stringify(['Not looking where you\'re going', 'Rotating too fast or too slow', 'Losing balance on landing']),
      JSON.stringify([])
    ]);
    const spinBS180Id = spinBS180Result.rows[0].id;

    await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node,
        merge_left_node_id, merge_right_node_id
      ) VALUES (
        'surface', 1, 2, 'merge', 3,
        'Ollie Backside "BS" 180',
        'Combine an ollie with a backside 180 rotation. Pop up and spin backside!',
        NULL,
        $1, $2, $3, true,
        250, NULL, true, false, $4, $5
      )
    `, [
      JSON.stringify(['Master both Ollie and BS 180 first', 'Pop the ollie, then initiate backside rotation', 'Look over your shoulder during rotation', 'Commit to the full 180']),
      JSON.stringify(['Not looking at the landing', 'Under-rotating the backside spin', 'Weak pop due to focusing on rotation']),
      JSON.stringify([spinBS180Id, ollieBasicId]),
      spinBS180Id,
      ollieBasicId
    ]);

    // ROW 4: SWITCH BACKSIDE 180 (Tier 2)
    const spinSWBS180Result = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node
      ) VALUES (
        'surface', 2, 1, 'spin', 4,
        'Switch "SW" Backside "BS" 180',
        'Backside 180 while riding switch. Advanced switch rotation trick.',
        NULL,
        $1, $2, $3, true,
        180, NULL, true, false
      ) RETURNING id
    `, [
      JSON.stringify(['Master regular BS 180 first', 'Be solid in switch stance', 'Initiate rotation with shoulders and hips', 'Look over shoulder throughout rotation']),
      JSON.stringify(['Not being comfortable riding switch', 'Hesitating on the rotation', 'Landing off-balance']),
      JSON.stringify([spinBS180Id])
    ]);
    const spinSWBS180Id = spinSWBS180Result.rows[0].id;

    await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        tips, common_mistakes, prerequisites, required_for_unlock,
        xp_bonus, badge_reward, repeatable, is_shared_node,
        merge_left_node_id, merge_right_node_id
      ) VALUES (
        'surface', 2, 2, 'merge', 4,
        'Ollie Switch "SW" Backside "BS" 180',
        'Elite combo: ollie while switch, then rotate backside 180. Master-level trick!',
        NULL,
        $1, $2, $3, true,
        350, 'Backside Legend', true, false, $4, $5
      )
    `, [
      JSON.stringify(['Master both switch ollie and switch BS 180', 'Pop hard from switch stance', 'Rotate backside with commitment', 'Land in regular stance smoothly']),
      JSON.stringify(['Weak pop from switch', 'Not committing to full rotation', 'Landing unbalanced']),
      JSON.stringify([spinSWBS180Id, ollieSwitchId]),
      spinSWBS180Id,
      ollieSwitchId
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Surface skill tree grid seeded successfully!',
      summary: {
        rows: 4,
        totalNodes: 10,
        sharedNodes: 2,
        layout: 'SPIN | MERGE | OLLIE'
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding skill tree grid:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao popular skill tree grid',
      details: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
