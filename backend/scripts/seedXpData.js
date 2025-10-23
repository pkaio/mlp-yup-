const fs = require('fs/promises');
const path = require('path');
const pool = require('../config/database');

const ROOT = path.resolve(__dirname, '..', '..');
const TRICKS_FILE = path.join(ROOT, 'database', 'data', 'tricks.tsv');
const EXP_METRICS_FILE = path.join(ROOT, 'database', 'data', 'exp_metrics.tsv');

const parseTsv = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const toTags = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const seedTricks = async (client) => {
  const rows = await parseTsv(TRICKS_FILE);
  const header = rows.shift();
  if (!header) {
    throw new Error('Arquivo de tricks vazio');
  }

  const stats = {
    inserted: 0,
    updated: 0,
  };

  for (const row of rows) {
    const [
      ,
      nome,
      nomeCurto,
      categoria,
      obstaculo,
      tipo,
      descricao,
      variacoes,
      nivel,
      tags,
      expBase,
    ] = row.split('\t');

    if (!nome) {
      continue;
    }

    const normalizedNome = nome.trim();
    const normalizedNomeCurto = (nomeCurto || normalizedNome).trim();

    const existing = await client.query(
      `
        SELECT id
          FROM tricks
         WHERE LOWER(nome) = LOWER($1)
            OR LOWER(nome_curto) = LOWER($2)
         LIMIT 1
      `,
      [normalizedNome, normalizedNomeCurto],
    );

    const payload = [
      normalizedNome,
      normalizedNomeCurto,
      categoria?.trim() || null,
      obstaculo?.trim() || null,
      tipo?.trim() || null,
      descricao?.trim() || null,
      variacoes?.trim() || null,
      nivel?.trim() || null,
      JSON.stringify(toTags(tags)),
      Number.parseInt(expBase, 10) || 0,
    ];

    if (existing.rows.length > 0) {
      await client.query(
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
                 tags = $9::jsonb,
                 exp_base = $10
           WHERE id = $11
        `,
        [...payload, existing.rows[0].id],
      );
      stats.updated += 1;
    } else {
      await client.query(
        `
          INSERT INTO tricks (
            nome, nome_curto, categoria, obstaculo, tipo,
            descricao, variacoes, nivel, tags, exp_base
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
        `,
        payload,
      );
      stats.inserted += 1;
    }
  }

  return stats;
};

const seedExpMetrics = async (client) => {
  const rows = await parseTsv(EXP_METRICS_FILE);
  const header = rows.shift();
  if (!header) {
    throw new Error('Arquivo de métricas de XP vazio');
  }

  const stats = {
    upserted: 0,
  };

  for (const row of rows) {
    const [code, display, bonus] = row.split('\t');
    if (!code) continue;

    await client.query(
      `
        INSERT INTO exp_metrics (code, display, exp_bonus)
        VALUES ($1, $2, $3)
        ON CONFLICT (code)
        DO UPDATE SET
          display = EXCLUDED.display,
          exp_bonus = EXCLUDED.exp_bonus
      `,
      [code.trim(), display?.trim() || code.trim(), Number.parseInt(bonus, 10) || 0],
    );
    stats.upserted += 1;
  }

  return stats;
};

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tricksStats = await seedTricks(client);
    const metricsStats = await seedExpMetrics(client);
    await client.query('COMMIT');

    console.log('✅ Seed concluído:');
    console.log(`  Tricks -> ${tricksStats.inserted} inseridos, ${tricksStats.updated} atualizados`);
    console.log(`  Métricas -> ${metricsStats.upserted} atualizadas`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao popular dados de XP:', error);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  main().then(() => pool.end());
}
