const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const pool = require('../config/database');

const ROOT = path.resolve(__dirname, '..', '..');
const EXCEL_PATH = path.join(ROOT, 'wakeboard_components_tables_final.xlsx');

const divisions = ['approach', 'entry', 'spins', 'grabs', 'base_moves', 'modifiers'];

const sanitizeId = (value) => {
  if (!value) return null;
  return String(value).trim().toLowerCase();
};

const sanitizeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
};

const sanitizeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeSide = (value) => {
  const normalized = sanitizeText(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('toe')) return 'toe';
  if (normalized.includes('heel')) return 'heel';
  if (normalized.includes('tail')) return 'tail';
  if (normalized.includes('nose')) return 'nose';
  return normalized;
};

const normalizeHand = (value) => {
  const normalized = sanitizeText(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('front')) return 'front';
  if (normalized.includes('back')) return 'back';
  return normalized;
};

const readSheet = (workbook, sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Aba "${sheetName}" não encontrada no Excel`);
  }
  return xlsx.utils.sheet_to_json(sheet, { defval: null });
};

const buildApproach = (rows) => rows
  .map((row) => {
    const id = sanitizeId(row.approach_id);
    if (!id) return null;
    const edgeText = sanitizeText(row.edge || row.display_name || row.name || '').toUpperCase();
    const isSwitch = edgeText.includes('SW');
    const edge = edgeText.includes('TS') ? 'TS' : 'HS';

    const metadata = { edge };
    if (isSwitch) {
      metadata.stance = 'switch';
    }

    return {
      component_id: id,
      division: 'approach',
      display_name: edgeText || edge,
      description: sanitizeText(row.description),
      xp_value: sanitizeNumber(row.xp),
      metadata,
    };
  })
  .filter(Boolean);

const buildEntry = (rows) => rows
  .map((row) => {
    const id = sanitizeId(row.entry_id);
    if (!id) return null;
    return {
      component_id: id,
      division: 'entry',
      display_name: sanitizeText(row.type || row.entry_name || id).toUpperCase(),
      description: sanitizeText(row.description),
      xp_value: sanitizeNumber(row.xp),
      metadata: { type: sanitizeText(row.type || id).toLowerCase() },
    };
  })
  .filter(Boolean);

const buildSpins = (rows) => rows
  .map((row) => {
    const id = sanitizeId(row.spin_id);
    if (!id) return null;
    const dir = sanitizeText(row.spin_dir || '').toUpperCase();
    return {
      component_id: id,
      division: 'spins',
      display_name: `${dir || 'FS'} ${sanitizeNumber(row.spin_deg)}`.trim(),
      description: `${dir || 'FS'} ${sanitizeNumber(row.spin_deg)} rotation`.trim(),
      xp_value: sanitizeNumber(row.xp),
      metadata: {
        spin_dir: dir || null,
        spin_deg: sanitizeNumber(row.spin_deg) || null,
      },
    };
  })
  .filter(Boolean);

const buildGrabs = (rows) => rows
  .map((row) => {
    const id = sanitizeId(row.grab_id);
    if (!id) return null;
    return {
      component_id: id,
      division: 'grabs',
      display_name: sanitizeText(row.grab_name || row.display_name || id),
      description: sanitizeText(row.description),
      xp_value: sanitizeNumber(row.xp),
      metadata: {
        side: normalizeSide(row.side),
        hand: normalizeHand(row.hand_used),
      },
    };
  })
  .filter(Boolean);

const buildBaseMoves = (rows) => rows
  .map((row) => {
    const id = sanitizeId(row.base_id);
    if (!id) return null;
    return {
      component_id: id,
      division: 'base_moves',
      display_name: sanitizeText(row.description || row.base_name || id),
      description: sanitizeText(row.description),
      xp_value: sanitizeNumber(row.xp),
      metadata: {
        family: sanitizeText(row.family || '').toLowerCase() || null,
      },
    };
  })
  .filter(Boolean);

const buildModifiers = (rows) => rows
  .map((row) => {
    const id = sanitizeId(row.modifier_id);
    if (!id) return null;
    return {
      component_id: id,
      division: 'modifiers',
      display_name: sanitizeText(row.type || id).replace(/_/g, ' '),
      description: sanitizeText(row.description),
      xp_value: sanitizeNumber(row.xp),
      metadata: {
        type: sanitizeText(row.type || id).toLowerCase(),
      },
    };
  })
  .filter(Boolean);

const builders = {
  approach: buildApproach,
  entry: buildEntry,
  spins: buildSpins,
  grabs: buildGrabs,
  base_moves: buildBaseMoves,
  modifiers: buildModifiers,
};

async function syncComponents() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Arquivo não encontrado: ${EXCEL_PATH}`);
  }

  const workbook = xlsx.readFile(EXCEL_PATH);
  const components = [];

  for (const division of divisions) {
    const sheetName = division === 'base_moves' ? 'Base_Moves' : division.charAt(0).toUpperCase() + division.slice(1);
    const rows = readSheet(workbook, sheetName);
    const builder = builders[division];
    components.push(...builder(rows));
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE maneuver_components SET is_active = false, updated_at = CURRENT_TIMESTAMP');

    for (const component of components) {
      await client.query(
        `INSERT INTO maneuver_components (component_id, division, display_name, description, xp_value, metadata, is_active)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, true)
         ON CONFLICT (component_id)
         DO UPDATE SET
            division = EXCLUDED.division,
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            xp_value = EXCLUDED.xp_value,
            metadata = EXCLUDED.metadata,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP`
        , [
          component.component_id,
          component.division,
          component.display_name,
          component.description || null,
          component.xp_value,
          JSON.stringify(component.metadata || {}),
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ ${components.length} componentes sincronizados a partir do Excel.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  syncComponents()
    .then(() => pool.end())
    .catch((error) => {
      console.error('❌ Erro ao importar componentes:', error.message);
      pool.end();
      process.exitCode = 1;
    });
}
