const pool = require('../config/database');
const { updateUserSophistication } = require('./userSophistication');
const { awardSpecializationXP } = require('./specializationSystem');
const { completeQuest } = require('./skillTreeSystem');
const { calculateManeuverXp, generateManeuverDescription } = require('./componentXpSystem');

const LEVEL_CAP = 99;
const XP_TOTAL_CAP = 1000000;
const GROWTH_BASE = 200;
const GROWTH_FACTOR = 1.05772872705916;

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

/**
 * Calcula as contribuições de XP para um vídeo baseado no novo sistema de componentes
 * Apenas XP da manobra + bônus opcional (challenges/quests)
 */
const calculateVideoContributions = async (client, context) => {
  const {
    userId,
    videoId,
    maneuverPayload,
    challengeId = null,
    questNodeId = null,
  } = context;

  // Validar que maneuverPayload existe
  if (!maneuverPayload) {
    throw new Error('maneuverPayload é obrigatório para calcular XP');
  }

  // 1. Calcular XP da manobra usando o sistema de componentes
  const maneuverBreakdown = await calculateManeuverXp(maneuverPayload);

  // 2. Montar contributions (detalhamento do XP)
  const contributions = [];

  const push = (code, label, value, meta = {}) => {
    const xpValue = toInt(value, 0);
    if (xpValue <= 0) return;
    contributions.push({ code, label, value: xpValue, ...(Object.keys(meta).length > 0 ? { meta } : {}) });
  };

  // Adicionar cada divisão como contribuição
  push('maneuver.approach', maneuverBreakdown.approach.name, maneuverBreakdown.approach.xp);
  push('maneuver.entry', maneuverBreakdown.entry.name, maneuverBreakdown.entry.xp);
  push('maneuver.spins', maneuverBreakdown.spins.name, maneuverBreakdown.spins.xp);
  push('maneuver.grabs', maneuverBreakdown.grabs.name, maneuverBreakdown.grabs.xp);
  push('maneuver.base_moves', maneuverBreakdown.base_moves.name, maneuverBreakdown.base_moves.xp);

  // Modifiers podem ser múltiplos
  maneuverBreakdown.modifiers.forEach(modifier => {
    push('maneuver.modifiers', modifier.name, modifier.xp);
  });

  // 3. Buscar e adicionar bonus_xp se for challenge ou quest
  let bonusXp = 0;
  let bonusReason = null;
  let specialization = null;

  // Bônus de Challenge
  if (challengeId) {
    try {
      const challengeResult = await client.query(
        'SELECT bonus_xp, maneuver_name FROM challenges WHERE id = $1',
        [challengeId]
      );
      if (challengeResult.rows.length > 0) {
        const challenge = challengeResult.rows[0];
        bonusXp += toInt(challenge.bonus_xp, 0);
        bonusReason = `Desafio: ${challenge.maneuver_name}`;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar bônus de challenge:', error.message);
    }
  }

  // Bônus de Quest
  if (questNodeId) {
    try {
      const questResult = await client.query(
        'SELECT bonus_xp, title, specialization FROM skill_tree_nodes WHERE id = $1',
        [questNodeId]
      );
      if (questResult.rows.length > 0) {
        const quest = questResult.rows[0];
        const questBonus = toInt(quest.bonus_xp, 0);
        bonusXp += questBonus;

        const questLabel = `Quest: ${quest.title}`;
        bonusReason = bonusReason ? `${bonusReason} + ${questLabel}` : questLabel;

        // Capturar specialization da quest
        if (quest.specialization) {
          specialization = quest.specialization;
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar bônus de quest:', error.message);
    }
  }

  // Adicionar bônus se existe
  if (bonusXp > 0 && bonusReason) {
    push('bonus', bonusReason, bonusXp);
  }

  // 4. Calcular total
  const total = maneuverBreakdown.maneuver_total + bonusXp;

  // 5. Gerar descrição da manobra
  const maneuverDescription = generateManeuverDescription(maneuverBreakdown);

  return {
    contributions,
    total,
    maneuver_total: maneuverBreakdown.maneuver_total,
    bonus_xp: bonusXp,
    bonus_reason: bonusReason,
    component_breakdown: maneuverBreakdown,
    maneuver_description: maneuverDescription,
    specialization,
  };
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
  let contributionsData = null;
  let expResult = null;
  let specializationResult = null;

  try {
    await client.query('BEGIN');

    // Calcular XP usando o novo sistema de componentes
    contributionsData = await calculateVideoContributions(client, context);

    const {
      contributions,
      total,
      maneuver_total,
      bonus_xp,
      bonus_reason,
      component_breakdown,
      maneuver_description,
      specialization
    } = contributionsData;

    // Aplicar XP ao usuário
    expResult = await applyExp(client, {
      userId: context.userId,
      amount: total,
      videoId: context.videoId,
      breakdown: contributions,
      source: 'video_upload',
      context: {
        type: 'video_upload',
        video_id: context.videoId,
        maneuver: maneuver_description,
      },
    });

    // Atualizar vídeo com XP detalhado
    await client.query(
      `UPDATE videos
       SET exp_awarded = $2,
           maneuver_xp = $3,
           bonus_xp = $4,
           bonus_reason = $5,
           component_breakdown = $6::jsonb,
           score_breakdown = jsonb_set(
             COALESCE(score_breakdown, '{}'::jsonb),
             '{xp}',
             $7::jsonb,
             true
           )
       WHERE id = $1`,
      [
        context.videoId,
        total,
        maneuver_total,
        bonus_xp,
        bonus_reason,
        JSON.stringify(component_breakdown),
        JSON.stringify({
          total,
          maneuver_total,
          bonus_xp,
          contributions,
          maneuver_description,
        })
      ]
    );

    // Award specialization XP se a quest/manobra tiver specialization
    if (specialization && maneuver_total > 0) {
      try {
        specializationResult = await awardSpecializationXP(
          context.userId,
          specialization,
          maneuver_total,
          null // Não temos trick_id no novo sistema
        );
        console.log(`✨ Awarded ${specializationResult.xpAwarded} specialization XP (${specialization})`);
      } catch (specError) {
        console.error('Error awarding specialization XP:', specError);
        // Don't fail the entire upload if specialization XP fails
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Atualizar nível de sofisticação do usuário após o upload (fora da transação)
  updateUserSophistication(context.userId).catch(err => {
    console.error('Erro ao atualizar sophistication após upload:', err);
  });

  // Disparar processamento de quest de forma assíncrona (não bloquear upload)
  if (context.questNodeId) {
    setImmediate(() => {
      completeQuest(
        context.userId,
        context.questNodeId,
        context.videoId,
        contributionsData ? contributionsData.total : 0
      )
        .then(async (questResult) => {
          console.log(`🎯 Quest completed! Attempt #${questResult.attemptNumber}, Bonus: ${questResult.xp.bonus} XP`);

          try {
            await pool.query(
              `UPDATE videos
                 SET is_quest_video = true,
                     quest_node_id = $1,
                     quest_attempt_number = $2
               WHERE id = $3`,
              [context.questNodeId, questResult.attemptNumber, context.videoId]
            );
          } catch (updateError) {
            console.error('Error updating video quest metadata:', updateError);
          }
        })
        .catch((questError) => {
          console.error('Error completing quest:', questError);
          // Quando falhar, marcamos no vídeo para reprocessar manualmente
          pool.query(
            `UPDATE videos
               SET quest_node_id = $1,
                   is_quest_video = false,
                   quest_attempt_number = NULL
             WHERE id = $2`,
            [context.questNodeId, context.videoId]
          ).catch((updateError) => {
            console.error('Error flagging quest failure on video:', updateError);
          });
        });
    });
  }

  return {
    video: contributionsData
      ? {
          total: contributionsData.total,
          maneuver_total: contributionsData.maneuver_total,
          bonus_xp: contributionsData.bonus_xp,
          bonus_reason: contributionsData.bonus_reason,
          contributions: contributionsData.contributions,
          maneuver_description: contributionsData.maneuver_description,
          component_breakdown: contributionsData.component_breakdown,
        }
      : null,
    user: expResult,
    specialization: specializationResult,
    quest: context.questNodeId ? { status: 'processing' } : null,
  };
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
  calculateVideoContributions,
};
