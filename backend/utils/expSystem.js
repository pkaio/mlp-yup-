const pool = require('../config/database');

const LEVEL_CAP = 99;
const XP_TOTAL_CAP = 1000000;
const GROWTH_BASE = 200;
const GROWTH_FACTOR = 1.05772872705916;

const VIDEO_BASE_XP = 150;
const VIDEO_PARK_BONUS = 35;
const VIDEO_OBSTACLE_BONUS = 35;
const VIDEO_DESCRIPTION_BONUS = 20;
const VIDEO_CHALLENGE_BONUS = 120;
const VIDEO_FIRST_OF_DAY_BONUS = 50;
const VIDEO_FIRST_VIDEO_BONUS = 120;

const TAG_METRIC_MAP = {
  invert: 'invert',
  railey: 'railey',
  handlepass: 'handlepass',
  blind: 'blind',
  wrapped: 'wrapped',
  switch: 'switch',
};

const buildXpTable = () => {
  const requirements = new Array(LEVEL_CAP + 1).fill(0);
  const cumulative = new Array(LEVEL_CAP + 1).fill(0);
  let total = 0;

  for (let level = 1; level <= LEVEL_CAP; level += 1) {
    cumulative[level] = total;
    let required = Math.round(GROWTH_BASE * Math.pow(GROWTH_FACTOR, level - 1));
    if (level === LEVEL_CAP) {
      const remaining = XP_TOTAL_CAP - total;
      if (remaining > 0) {
        required = Math.max(required, remaining);
      }
    }
    requirements[level] = required;
    total += required;
  }

  return { requirements, cumulative, total };
};

const XP_TABLE = buildXpTable();

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getNextLevelTarget = (level = 1) => {
  const safeLevel = Math.max(toInt(level, 1), 1);
  if (safeLevel >= LEVEL_CAP) {
    return 0;
  }
  return XP_TABLE.requirements[safeLevel] ?? 0;
};

const getLevelStateFromTotal = (total = 0) => {
  const sanitizedTotal = Math.min(Math.max(toInt(total, 0), 0), XP_TOTAL_CAP);

  for (let level = 1; level <= LEVEL_CAP; level += 1) {
    const requirement = XP_TABLE.requirements[level] ?? 0;
    const levelStart = XP_TABLE.cumulative[level] ?? 0;
    const levelEnd = levelStart + requirement;

    if (sanitizedTotal < levelEnd || level === LEVEL_CAP) {
      const current = level === LEVEL_CAP && requirement === 0
        ? 0
        : Math.min(Math.max(sanitizedTotal - levelStart, 0), requirement);
      return { level, current, total: sanitizedTotal };
    }
  }

  return {
    level: LEVEL_CAP,
    current: XP_TABLE.requirements[LEVEL_CAP] ?? 0,
    total: sanitizedTotal,
  };
};

const getXpSnapshot = ({ total = 0 } = {}) => {
  const state = getLevelStateFromTotal(total);
  const nextTarget = getNextLevelTarget(state.level);
  const remaining = state.level >= LEVEL_CAP ? 0 : Math.max(nextTarget - state.current, 0);
  const progress = state.level >= LEVEL_CAP || nextTarget <= 0
    ? 1
    : Math.min(state.current / nextTarget, 1);

  return {
    level: state.level,
    current: state.current,
    next: nextTarget,
    remaining,
    total: state.total,
    progress,
    cap: XP_TOTAL_CAP,
    maxLevel: LEVEL_CAP,
  };
};

const sanitizeBreakdown = (breakdown = []) => {
  if (!Array.isArray(breakdown)) {
    return [];
  }

  return breakdown
    .map((item) => ({
      code: item?.code,
      label: item?.label,
      value: toInt(item?.value, 0),
      ...(item?.meta ? { meta: item.meta } : {}),
    }))
    .filter((item) => item.value > 0 && item.code && item.label);
};

const fetchExpMetrics = async (client) => {
  const result = await client.query(
    'SELECT code, display, exp_bonus FROM exp_metrics',
  );
  const map = new Map();
  result.rows.forEach((row) => {
    map.set(row.code, {
      code: row.code,
      display: row.display,
      bonus: toInt(row.exp_bonus, 0),
    });
  });
  return map;
};

const resolveTrick = async (client, context) => {
  const { trickId = null, trickName = null, description = '' } = context;

  if (trickId) {
    const result = await client.query(
      `
        SELECT id, nome, nome_curto, descricao, variacoes, tags, exp_base
          FROM tricks
         WHERE id = $1
         LIMIT 1
      `,
      [trickId],
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }

  const candidate = (trickName || description || '').trim();
  if (!candidate) {
    return null;
  }

  const direct = await client.query(
    `
      SELECT id, nome, nome_curto, descricao, variacoes, tags, exp_base
        FROM tricks
       WHERE LOWER(nome) = LOWER($1)
          OR LOWER(nome_curto) = LOWER($1)
       LIMIT 1
    `,
    [candidate],
  );
  if (direct.rows.length > 0) {
    return direct.rows[0];
  }

  const fuzzy = await client.query(
    `
      SELECT id, nome, nome_curto, descricao, variacoes, tags, exp_base
        FROM tricks
       WHERE LOWER(nome) LIKE $1
          OR LOWER(nome_curto) LIKE $1
       ORDER BY LENGTH(nome) ASC
       LIMIT 1
    `,
    [`%${candidate.toLowerCase()}%`],
  );

  return fuzzy.rows[0] || null;
};

const collectSpinCodes = (text = '') => {
  const matches = new Set();
  const regex = /(180|360|540|720|900|1080|1260|1440)/g;
  let found = regex.exec(text);
  while (found) {
    matches.add(found[1]);
    found = regex.exec(text);
  }
  return Array.from(matches);
};

const calculateVideoContributions = async (client, context) => {
  const {
    userId,
    videoId,
    parkId = null,
    obstacleId = null,
    challengeId = null,
    trickId = null,
    trickName = null,
    description = '',
  } = context;

  const contributions = [];

  const push = (code, label, value, meta) => {
    const xpValue = toInt(value, 0);
    if (xpValue <= 0) return;
    contributions.push(meta ? { code, label, value: xpValue, meta } : { code, label, value: xpValue });
  };

  push('video.base', 'Upload de vídeo', VIDEO_BASE_XP);

  if (parkId) {
    push('video.park_tag', 'Parque identificado', VIDEO_PARK_BONUS, { parkId });
  }

  if (obstacleId) {
    push('video.obstacle_tag', 'Obstáculo marcado', VIDEO_OBSTACLE_BONUS, { obstacleId });
  }

  const hasDescription = typeof description === 'string' && description.trim().length >= 3;
  if (hasDescription) {
    push('video.description', 'Trick descrita', VIDEO_DESCRIPTION_BONUS);
  }

  if (challengeId) {
    push('video.challenge_completion', 'Desafio concluído', VIDEO_CHALLENGE_BONUS, { challengeId });
  }

  const metricsMap = await fetchExpMetrics(client);
  let trickData = null;

  try {
    trickData = await resolveTrick(client, { trickId, trickName, description });
  } catch (trickError) {
    console.warn('⚠️ Não foi possível resolver trick para XP:', trickError.message);
  }

  if (trickData) {
    const trickTags = Array.isArray(trickData.tags) ? trickData.tags : [];
    const trickBase = toInt(trickData.exp_base, 0);
    if (trickBase > 0) {
      push(
        'trick.base',
        `Trick • ${trickData.nome}`,
        trickBase,
        {
          trickId: trickData.id,
          trickName: trickData.nome,
        },
      );
    }

    const addMetricContribution = (code, label, extraMeta = {}) => {
      if (!code || !metricsMap.has(code)) return;
      const metric = metricsMap.get(code);
      if (!metric || metric.bonus <= 0) return;
      push(
        `trick.metric.${metric.code}`,
        label || metric.display,
        metric.bonus,
        {
          trickId: trickData.id,
          trickName: trickData.nome,
          metric: metric.code,
          ...extraMeta,
        },
      );
    };

    const baseText = `${trickData.nome} ${trickData.nome_curto || ''} ${trickData.descricao || ''} ${trickData.variacoes || ''}`.toLowerCase();
    const spinCodes = collectSpinCodes(baseText);
    spinCodes.forEach((value) => {
      addMetricContribution(
        `spin_${value}`,
        `Spin ${value}`,
        { spin: Number.parseInt(value, 10) },
      );
    });

    trickTags
      .map((tag) => String(tag || '').toLowerCase())
      .filter(Boolean)
      .forEach((tag) => {
        const metricCode = TAG_METRIC_MAP[tag];
        if (metricCode) {
          addMetricContribution(metricCode);
        }
      });
  }

  let previousVideosCount = 0;
  let hasUploadToday = false;

  if (userId) {
    const previousVideosResult = await client.query(
      `
        SELECT COUNT(*)::int AS count 
          FROM videos 
         WHERE user_id = $1 
           AND ($2::uuid IS NULL OR id <> $2::uuid)
      `,
      [userId, videoId || null],
    );
    previousVideosCount = previousVideosResult.rows[0]?.count ?? 0;

    const sameDayResult = await client.query(
      `
        SELECT 1 
          FROM videos 
         WHERE user_id = $1 
           AND ($2::uuid IS NULL OR id <> $2::uuid)
           AND created_at >= DATE_TRUNC('day', NOW())
         LIMIT 1
      `,
      [userId, videoId || null],
    );
    hasUploadToday = sameDayResult.rows.length > 0;
  }

  const isFirstVideoEver = previousVideosCount === 0;
  if (isFirstVideoEver) {
    push('video.first_upload', 'Primeiro vídeo na comunidade', VIDEO_FIRST_VIDEO_BONUS);
  }

  if (!hasUploadToday) {
    push('video.first_of_day', 'Primeiro envio do dia', VIDEO_FIRST_OF_DAY_BONUS);
  }

  const total = contributions.reduce((sum, item) => sum + item.value, 0);
  const flags = {
    hasPark: Boolean(parkId),
    hasObstacle: Boolean(obstacleId),
    hasDescription,
    challengeCompleted: Boolean(challengeId),
    firstVideoEver: isFirstVideoEver,
    firstUploadToday: !hasUploadToday,
    trickResolved: Boolean(trickData),
  };

  return { contributions, total, flags };
};

const applyExp = async (client, payload) => {
  const {
    userId,
    amount,
    videoId = null,
    breakdown = [],
    source = 'video_upload',
    context = null,
    notify = true,
    logEntry = true,
  } = payload;

  const xpToAdd = toInt(amount, 0);

  const userQuery = xpToAdd > 0
    ? 'SELECT xp_total, xp_current, level FROM users WHERE id = $1 FOR UPDATE'
    : 'SELECT xp_total, xp_current, level FROM users WHERE id = $1';

  const userResult = await client.query(userQuery, [userId]);
  if (userResult.rows.length === 0) {
    throw new Error('Usuário não encontrado ao aplicar XP');
  }

  const row = userResult.rows[0];
  let xpTotal = toInt(row.xp_total, 0);
  let state = getLevelStateFromTotal(xpTotal);
  let level = state.level;
  let xpCurrent = state.current;
  const previousLevel = level;

  let levelUps = 0;
  const shouldLog = xpToAdd > 0 && logEntry;
  const shouldNotify = xpToAdd > 0 && notify;

  if (xpToAdd !== 0) {
    xpTotal = Math.min(Math.max(xpTotal + xpToAdd, 0), XP_TOTAL_CAP);
    state = getLevelStateFromTotal(xpTotal);
    levelUps = Math.max(state.level - previousLevel, 0);
    level = state.level;
    xpCurrent = state.current;

    await client.query(
      `
        UPDATE users
           SET xp_total = $2,
               xp_current = $3,
               level = $4,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
      `,
      [userId, xpTotal, xpCurrent, level],
    );

    if (shouldLog) {
      const sanitizedBreakdown = sanitizeBreakdown(breakdown);
      const logPayload = {
        source,
        total: xpToAdd,
        contributions: sanitizedBreakdown,
        ...(context ? { context } : {}),
      };

      await client.query(
        `
          INSERT INTO user_exp_log (user_id, video_id, exp_awarded, breakdown)
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [userId, videoId, xpToAdd, JSON.stringify(logPayload)],
      );

      if (shouldNotify) {
        const nextTarget = getNextLevelTarget(level);
        await client.query(
          `
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES ($1, $2, $3, $4, $5::jsonb)
          `,
          [
            userId,
            'xp',
            level > previousLevel ? 'Subiu de nível!' : 'Você ganhou XP!',
            level > previousLevel
              ? `+${xpToAdd} XP • Nível ${level}`
              : `+${xpToAdd} XP pelo ${source === 'video_upload' ? 'vídeo publicado' : 'progresso recente'}`,
            JSON.stringify({
              xp: xpToAdd,
              total: xpTotal,
              level,
              previousLevel,
              levelUps,
              source,
              breakdown: sanitizedBreakdown,
              ...(videoId ? { video_id: videoId } : {}),
              ...(context ? { context } : {}),
            }),
          ],
        );
      }
    }
  }

  const snapshot = getXpSnapshot({ total: xpTotal });

  return {
    awarded: xpToAdd,
    total: snapshot.total,
    current: snapshot.current,
    next: snapshot.next,
    remaining: snapshot.remaining,
    progress: snapshot.progress,
    cap: snapshot.cap,
    maxLevel: snapshot.maxLevel,
    level: snapshot.level,
    previousLevel,
    leveledUp: snapshot.level > previousLevel,
    levelUps,
    source,
  };
};

const handleVideoUpload = async (context) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const contributionsData = await calculateVideoContributions(client, context);

    const { contributions, total, flags } = contributionsData;

    const expResult = await applyExp(client, {
      userId: context.userId,
      amount: total,
      videoId: context.videoId,
      breakdown: contributions,
      source: 'video_upload',
      context: {
        type: 'video_upload',
        video_id: context.videoId,
        flags,
      },
    });

    const xpPayload = {
      total,
      contributions,
      flags,
    };

    await client.query(
      `
        UPDATE videos
           SET exp_awarded = $2,
               score_breakdown = jsonb_set(
                 COALESCE(score_breakdown, '{}'::jsonb),
                 '{xp}',
                 $3::jsonb,
                 true
               )
         WHERE id = $1
      `,
      [context.videoId, total, JSON.stringify(xpPayload)],
    );

    await client.query('COMMIT');

    return {
      video: xpPayload,
      user: expResult,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const revokeVideoExp = async ({ userId, videoId }) => {
  if (!userId || !videoId) {
    return 0;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sumResult = await client.query(
      `
        SELECT COALESCE(SUM(exp_awarded), 0) AS total
          FROM user_exp_log
         WHERE user_id = $1 AND video_id = $2
      `,
      [userId, videoId],
    );

    const totalToRevoke = Math.max(toInt(sumResult.rows[0]?.total ?? 0, 0), 0);

    if (totalToRevoke > 0) {
      await applyExp(client, {
        userId,
        amount: -totalToRevoke,
        videoId,
        source: 'video_deleted',
        notify: false,
        logEntry: false,
      });
    }

    await client.query(
      'DELETE FROM user_exp_log WHERE user_id = $1 AND video_id = $2',
      [userId, videoId],
    );

    await client.query('COMMIT');
    return totalToRevoke;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  handleVideoUpload,
  getNextLevelTarget,
  getXpSnapshot,
  revokeVideoExp,
};
