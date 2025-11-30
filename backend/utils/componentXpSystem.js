const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// Cache de componentes em memória
let componentsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega todos os componentes do banco de dados
 * Usa cache em memória para evitar queries repetidas
 */
async function loadComponents() {
  const now = Date.now();

  // Usar cache se ainda válido
  if (componentsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return componentsCache;
  }

  let components = null;

  // 1) Tentar carregar de arquivo JSON (ex.: backend/data/kicker_xp.json)
  const dataFile = process.env.COMPONENTS_DATA_FILE || path.join(__dirname, '..', 'data', 'kicker_xp.json');
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf-8');
      const json = JSON.parse(raw);
      components = {
        approach: {},
        entry: {},
        spins: {},
        grabs: {},
        base_moves: {},
        modifiers: {},
      };
      const mapDivision = (key, division) => {
        (json[key] || []).forEach((item) => {
          const id = item[`${division}_id`] || item.component_id || item.id;
          const name = item.display_name || item.shortcut || item.description || id;
          const xp = Number(item.xp) || 0;
          components[division][id] = {
            id,
            name,
            description: item.description || name,
            xp,
            metadata: {},
          };
        });
      };
      mapDivision('Approach', 'approach');
      mapDivision('Entry', 'entry');
      mapDivision('Spins', 'spins');
      mapDivision('Grabs', 'grabs');
      mapDivision('Base_Moves', 'base_moves');
      mapDivision('Modifiers', 'modifiers');
    }
  } catch (fileError) {
    console.warn('⚠️ Não foi possível carregar componentes do arquivo:', fileError.message);
    components = null;
  }

  // 2) Se não carregou do arquivo, usa banco
  if (!components) {
    const result = await pool.query(
      `SELECT component_id, division, display_name, description, xp_value, metadata
       FROM maneuver_components
       WHERE is_active = true
       ORDER BY division, xp_value`
    );

    components = {
      approach: {},
      entry: {},
      spins: {},
      grabs: {},
      base_moves: {},
      modifiers: {}
    };

    result.rows.forEach(row => {
      components[row.division][row.component_id] = {
        id: row.component_id,
        name: row.display_name,
        description: row.description,
        xp: row.xp_value,
        metadata: row.metadata || {}
      };
    });
  }

  const ensureNoneComponent = (division, name, description) => {
    if (!components[division].none) {
      components[division].none = {
        id: 'none',
        name,
        description,
        xp: 0,
        metadata: { type: 'none' }
      };
    }
  };

  ensureNoneComponent('approach', 'Sem approach/edge', 'Nenhuma borda/approach aplicado');
  ensureNoneComponent('entry', 'Sem entry', 'Nenhuma entrada aplicada');
  ensureNoneComponent('grabs', 'Sem grab', 'Sem grab selecionado');
  ensureNoneComponent('spins', 'Sem rotação', 'Nenhuma rotação aplicada');
  ensureNoneComponent('base_moves', 'Sem base move', 'Nenhum base move selecionado');

  componentsCache = components;
  cacheTimestamp = now;

  return components;
}

/**
 * Busca um componente específico por código e divisão
 */
async function getComponentByCode(componentId, division) {
  const components = await loadComponents();

  if (!components[division]) {
    throw new Error(`Divisão inválida: ${division}`);
  }

  const component = components[division][componentId];

  if (!component) {
    throw new Error(`Componente não encontrado: ${componentId} na divisão ${division}`);
  }

  return component;
}

/**
 * Valida a estrutura do payload de manobra
 */
function validateManeuverPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('maneuverPayload inválido ou ausente');
  }

  // Divisões obrigatórias (exceto modifiers que é opcional)
  const requiredDivisions = ['approach', 'entry', 'spins', 'grabs', 'base_moves'];

  for (const division of requiredDivisions) {
    if (!payload[division]) {
      throw new Error(`Divisão obrigatória ausente: ${division}`);
    }
  }

  // modifiers é opcional, mas se existir deve ser array ou string
  if (payload.modifiers) {
    if (!Array.isArray(payload.modifiers) && typeof payload.modifiers !== 'string') {
      throw new Error('modifiers deve ser um array ou string');
    }
  }

  return true;
}

/**
 * Calcula o XP total da manobra baseado nos componentes selecionados
 *
 * @param {Object} maneuverPayload - Payload com seleções de cada divisão
 * @returns {Object} Breakdown completo com XP de cada divisão
 */
async function calculateManeuverXp(maneuverPayload) {
  // Validar payload
  validateManeuverPayload(maneuverPayload);

  // Carregar componentes
  const components = await loadComponents();

  const breakdown = {
    approach: null,
    entry: null,
    spins: null,
    grabs: null,
    base_moves: null,
    modifiers: [],
    maneuver_total: 0,
    components_used: []
  };

  // 1. APPROACH
  const approachId = maneuverPayload.approach;
  if (!components.approach[approachId]) {
    throw new Error(`Componente de approach inválido: ${approachId}`);
  }
  breakdown.approach = {
    component_id: approachId,
    name: components.approach[approachId].name,
    xp: components.approach[approachId].xp
  };
  breakdown.components_used.push(approachId);

  // 2. ENTRY
  const entryId = maneuverPayload.entry;
  if (!components.entry[entryId]) {
    throw new Error(`Componente de entry inválido: ${entryId}`);
  }
  breakdown.entry = {
    component_id: entryId,
    name: components.entry[entryId].name,
    xp: components.entry[entryId].xp
  };
  breakdown.components_used.push(entryId);

  // 3. SPINS
  const spinsId = maneuverPayload.spins;
  if (!components.spins[spinsId]) {
    throw new Error(`Componente de spins inválido: ${spinsId}`);
  }
  breakdown.spins = {
    component_id: spinsId,
    name: components.spins[spinsId].name,
    xp: components.spins[spinsId].xp
  };
  breakdown.components_used.push(spinsId);

  // 4. GRABS
  const grabsId = maneuverPayload.grabs;
  if (!components.grabs[grabsId]) {
    throw new Error(`Componente de grabs inválido: ${grabsId}`);
  }
  breakdown.grabs = {
    component_id: grabsId,
    name: components.grabs[grabsId].name,
    xp: components.grabs[grabsId].xp
  };
  breakdown.components_used.push(grabsId);

  // 5. BASE_MOVES
  const baseMovesId = maneuverPayload.base_moves;
  if (!components.base_moves[baseMovesId]) {
    throw new Error(`Componente de base_moves inválido: ${baseMovesId}`);
  }
  breakdown.base_moves = {
    component_id: baseMovesId,
    name: components.base_moves[baseMovesId].name,
    xp: components.base_moves[baseMovesId].xp
  };
  breakdown.components_used.push(baseMovesId);

  // 6. MODIFIERS (pode ser múltiplo ou nenhum)
  const modifiersInput = maneuverPayload.modifiers || [];
  const modifiersList = Array.isArray(modifiersInput) ? modifiersInput : [modifiersInput];

  modifiersList.forEach(modifierId => {
    if (modifierId && modifierId !== 'none') {
      if (!components.modifiers[modifierId]) {
        throw new Error(`Componente de modifier inválido: ${modifierId}`);
      }
      breakdown.modifiers.push({
        component_id: modifierId,
        name: components.modifiers[modifierId].name,
        xp: components.modifiers[modifierId].xp
      });
      breakdown.components_used.push(modifierId);
    }
  });

  // Calcular total da manobra
  breakdown.maneuver_total =
    breakdown.approach.xp +
    breakdown.entry.xp +
    breakdown.spins.xp +
    breakdown.grabs.xp +
    breakdown.base_moves.xp +
    breakdown.modifiers.reduce((sum, mod) => sum + mod.xp, 0);

  return breakdown;
}

/**
 * Gera uma descrição textual legível da manobra
 */
function generateManeuverDescription(breakdown) {
  const parts = [];

  if (breakdown.approach) parts.push(breakdown.approach.name);
  if (breakdown.entry) parts.push(breakdown.entry.name);
  if (breakdown.spins) parts.push(breakdown.spins.name);
  if (breakdown.grabs) parts.push(breakdown.grabs.name);
  if (breakdown.base_moves) parts.push(breakdown.base_moves.name);

  if (breakdown.modifiers && breakdown.modifiers.length > 0) {
    const modNames = breakdown.modifiers.map(m => m.name).join(' + ');
    parts.push(modNames);
  }

  return parts.join(' ');
}

/**
 * Limpa o cache de componentes (útil para testes ou após updates)
 */
function clearCache() {
  componentsCache = null;
  cacheTimestamp = null;
}

/**
 * Retorna estatísticas dos componentes disponíveis
 */
async function getComponentsStats() {
  const components = await loadComponents();

  const stats = {
    total: 0,
    by_division: {}
  };

  for (const [division, comps] of Object.entries(components)) {
    const count = Object.keys(comps).length;
    stats.by_division[division] = count;
    stats.total += count;
  }

  return stats;
}

module.exports = {
  loadComponents,
  getComponentByCode,
  validateManeuverPayload,
  calculateManeuverXp,
  generateManeuverDescription,
  clearCache,
  getComponentsStats
};
