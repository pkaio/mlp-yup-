const express = require('express');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, requireSuperModerator } = require('../middleware/auth');
const { loadComponents, clearCache } = require('../utils/componentXpSystem');

const router = express.Router();

const updateSchema = Joi.object({
  name: Joi.string().max(120).allow('', null),
  display_name: Joi.string().max(120).allow('', null),
  description: Joi.string().allow('', null),
  xp: Joi.number().integer().min(0),
  xp_value: Joi.number().integer().min(0),
  metadata: Joi.object().unknown(true),
  is_active: Joi.boolean(),
}).min(1);

const normalizeUpdatePayload = (payload) => {
  const normalized = {
    display_name: payload.display_name ?? payload.name,
    description: payload.description,
    xp_value: payload.xp_value ?? payload.xp,
    metadata: payload.metadata,
    is_active: typeof payload.is_active === 'boolean' ? payload.is_active : undefined,
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined),
  );
};

const serializeComponentRow = (row) => ({
  id: row.id,
  component_id: row.component_id,
  division: row.division,
  name: row.display_name,
  description: row.description,
  xp: row.xp_value,
  metadata: row.metadata || {},
  is_active: row.is_active,
});

const buildComponentResponse = (componentsMap) =>
  Object.entries(componentsMap).reduce((acc, [division, items]) => {
    acc[division] = Object.values(items).map((component) => ({
      component_id: component.id,
      division,
      name: component.name,
      description: component.description,
      xp: component.xp,
      metadata: component.metadata || {},
      is_active: true,
    }));
    return acc;
  }, {});

router.get('/', authMiddleware, requireSuperModerator, async (req, res) => {
  try {
    const componentsMap = await loadComponents();
    const components = buildComponentResponse(componentsMap);

    res.json({
      success: true,
      components,
    });
  } catch (error) {
    console.error('Erro ao carregar componentes:', error);
    res.status(500).json({ error: 'Erro ao carregar componentes de manobra' });
  }
});

// Public endpoint for mobile/app clients (read-only)
router.get('/public', async (req, res) => {
  try {
    const componentsMap = await loadComponents();
    const components = buildComponentResponse(componentsMap);

    res.json({
      components,
    });
  } catch (error) {
    console.error('Erro ao carregar componentes (public):', error);
    res.status(500).json({ error: 'Erro ao carregar componentes de manobra' });
  }
});

router.put('/:componentId', authMiddleware, requireSuperModerator, async (req, res) => {
  const { componentId } = req.params;
  const { error, value } = updateSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({ error: error.details.map((detail) => detail.message).join(', ') });
  }

  const payload = normalizeUpdatePayload(value);

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo válido informado para atualização' });
  }

  const fields = [];
  const params = [];
  let index = 1;

  if (payload.display_name !== undefined) {
    fields.push(`display_name = $${index}`);
    params.push(payload.display_name || null);
    index += 1;
  }

  if (payload.description !== undefined) {
    fields.push(`description = $${index}`);
    params.push(payload.description || null);
    index += 1;
  }

  if (payload.xp_value !== undefined) {
    fields.push(`xp_value = $${index}`);
    params.push(payload.xp_value);
    index += 1;
  }

  if (payload.metadata !== undefined) {
    fields.push(`metadata = $${index}::jsonb`);
    params.push(JSON.stringify(payload.metadata || {}));
    index += 1;
  }

  if (payload.is_active !== undefined) {
    fields.push(`is_active = $${index}`);
    params.push(payload.is_active);
    index += 1;
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo válido informado para atualização' });
  }

  params.push(componentId.toLowerCase());

  try {
    const result = await pool.query(
      `
        UPDATE maneuver_components
           SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE component_id = $${index}
     RETURNING id, component_id, division, display_name, description, xp_value, metadata, is_active
      `,
      params,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Componente não encontrado' });
    }

    clearCache();
    res.json({
      success: true,
      component: serializeComponentRow(result.rows[0]),
    });
  } catch (err) {
    console.error(`Erro ao atualizar componente ${componentId}:`, err);
    res.status(500).json({ error: 'Erro ao atualizar componente' });
  }
});

module.exports = router;
