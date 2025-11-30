const SPIN_VALUES = [180, 360, 540, 720, 900, 1080, 1260, 1440];
const DEFAULT_PAYLOAD = Object.freeze({
  approach: 'hs',
  entry: 'ride_on',
  spins: 'fs180',
  grabs: 'none',
  base_moves: 'ollie',
  modifiers: []
});

const APPROACH_MAP = {
  hs: 'hs',
  ts: 'ts'
};

const ENTRY_MAP = {
  ride_on: 'ride_on',
  from_water: 'ride_on',
  edge: 'ride_on',
  ollie: 'ollie_on',
  ollie_on: 'ollie_on',
  flat_pop: 'ollie_on',
  pop: 'ollie_on',
  transfer: 'transfer',
  gap: 'transfer'
};

const GRAB_WHITELIST = new Set([
  'indy',
  'tindy',
  'tail',
  'tailfish',
  'stalefish',
  'melon',
  'mute',
  'method',
  'nose',
  'slob',
  'crail',
  'judo',
  'seatbelt',
  'truckdriver'
]);

const MODIFIER_MAP = {
  handlepass: 'hp',
  hp: 'hp',
  blind: 'blind',
  wrapped: 'wrapped',
  baller: 'baller',
  ole: 'ole',
  rewind: 'rewind',
  double: 'rewind',
  switch: 'switch',
  fakie: 'fakie',
  to_blind: 'to_blind',
  to_fakie: 'to_fakie',
  to_revert: 'to_revert',
  revert: 'to_revert',
  on_axis: 'on_axis',
  'on-axis': 'on_axis',
  off_axis: 'off_axis',
  'off-axis': 'off_axis',
  inverted: 'off_axis',
  butter: 'to_fakie'
};

const AIR_FLIP_BASE_MAP = {
  Raley: { regular: 'railey', ts: 'ts_railey' },
  'S-Bend': { regular: 's_bend', ts: 'ts_s_bend' },
  Krypt: { regular: 's_bend', ts: 'ts_s_bend' },
  Backroll: { regular: 'backroll', ts: 'ts_backroll' },
  Frontroll: { regular: 'frontflip', ts: 'frontroll_ts' },
  Tantrum: { regular: 'tantrum', ts: 'tantrum' },
  'KGB': { regular: 'backroll', ts: 'ts_backroll' },
  'KGB 5': { regular: 'backroll', ts: 'ts_backroll' },
  'Pete Rose': { regular: 'scarecrow', ts: 'scarecrow' },
  'Slim Chance': { regular: 'scarecrow', ts: 'scarecrow' },
  'Crow Mobe': { regular: 'scarecrow', ts: 'scarecrow' },
  'Heart Attack': { regular: 'railey', ts: 'ts_railey' },
  'Moby Dick': { regular: 'tantrum', ts: 'ts_backroll' },
  'Blind Judge': { regular: 'railey', ts: 'ts_railey' }
};

const SURFACE_MOVE_MAP = {
  'Surface 180': 'surface_180',
  'Surface 360': 'surface_360',
  'Surface 540': 'surface_360',
  'Butter 180': 'surface_180',
  'Butter 360': 'surface_360',
  Nosepress: 'side_slide',
  Tailpress: 'side_slide',
  Powerslide: 'powerslide',
  Shuvit: 'surface_180'
};

const RAIL_TRICK_MAP = {
  '50-50': '5050',
  boardslide: 'bs_boardslide',
  lipslide: 'front_lip',
  nosepress: 'frontboard',
  tailpress: 'back_lip'
};

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const unique = (list) => Array.from(new Set(list.filter(Boolean)));

const normalizeApproach = (approach, stance) => {
  const normalized = APPROACH_MAP[(approach || 'hs').toLowerCase()] || 'hs';
  if (stance && String(stance).toLowerCase() === 'switch') {
    return normalized === 'ts' ? 'sw_ts' : 'sw_hs';
  }
  return normalized;
};

const normalizeEntry = (value) => ENTRY_MAP[value] || 'ride_on';

const normalizeSpin = (direction, degrees) => {
  const abs = Math.abs(Number(degrees) || 0);
  if (abs < 1) {
    return 'none';
  }

  const dir = String(direction || 'FS').toUpperCase() === 'BS' ? 'bs' : 'fs';
  const target = SPIN_VALUES.reduce((closest, current) => {
    const diffCurrent = Math.abs(current - abs);
    const diffClosest = Math.abs(closest - abs);
    return diffCurrent < diffClosest ? current : closest;
  }, SPIN_VALUES[0]);
  const finalValue = abs >= SPIN_VALUES[0] ? target : SPIN_VALUES[0];
  return `${dir}${finalValue}`;
};

const normalizeGrab = (grab) => {
  if (!grab) return 'none';
  const key = String(grab).toLowerCase();
  if (GRAB_WHITELIST.has(key)) {
    return key;
  }
  return 'none';
};

const normalizeModifiers = (...sources) => {
  const mapped = [];
  sources.filter(Boolean).forEach((source) => {
    toArray(source).forEach((modifier) => {
      const key = modifier && modifier.component_id ? modifier.component_id : modifier;
      const mappedKey = MODIFIER_MAP[String(key || '').toLowerCase()];
      if (mappedKey) {
        mapped.push(mappedKey);
      }
    });
  });
  return unique(mapped);
};

const applyLandingModifiers = (modifiers, landingStyle, landingStance) => {
  if (!landingStyle && !landingStance) return modifiers;
  const list = [...modifiers];
  if (landingStyle) {
    const mappedLanding = MODIFIER_MAP[String(landingStyle).toLowerCase()];
    if (mappedLanding) list.push(mappedLanding);
  }
  if (landingStance && landingStance !== 'regular') {
    list.push('switch');
  }
  return unique(list);
};

const buildRailPayload = (rail) => {
  if (!rail) return null;
  const entry = rail.entry || {};
  const segments = Array.isArray(rail.segments) ? rail.segments : [];
  const exit = rail.exit || {};
  const firstSegment = segments[0] || {};
  const approach = normalizeApproach(entry.approach);
  const entryComponent = normalizeEntry(entry.takeoff);
  const spins = normalizeSpin(entry.direction_in, entry.rotation_in);
  let baseMove = RAIL_TRICK_MAP[firstSegment.trick] || '5050';
  const direction = String(entry.direction_in || '').toUpperCase();
  if (firstSegment.trick === 'boardslide' && direction === 'FS') {
    baseMove = 'frontboard';
  }
  if (firstSegment.trick === 'lipslide' && direction === 'BS') {
    baseMove = 'back_lip';
  }
  const modifiers = normalizeModifiers(exit.extras);
  const withLanding = applyLandingModifiers(modifiers, exit.landing, null);
  return {
    approach,
    entry: entryComponent,
    spins,
    grabs: 'none',
    base_moves: baseMove,
    modifiers: withLanding
  };
};

const buildKickerPayload = (kicker) => {
  if (!kicker) return null;
  const entry = kicker.entry || {};
  const body = kicker.body || {};
  const exit = kicker.exit || {};
  const approach = normalizeApproach(entry.approach, entry.stance);
  const entryComponent = normalizeEntry(entry.pop);
  const spins = normalizeSpin(body.rotation_direction, body.rotation_degrees);
  const grabs = normalizeGrab(body.grab);
  const base_moves = (() => {
    const pop = String(body.flip_type || '').toLowerCase();
    if (pop === 'backflip') {
      return entry.approach === 'TS' ? 'ts_backroll' : 'tantrum';
    }
    if (pop === 'frontflip') {
      return entry.approach === 'TS' ? 'frontroll_ts' : 'frontflip';
    }
    if (pop === 'shuvit') {
      return 'surface_180';
    }
    return 'ollie';
  })();
  let modifiers = normalizeModifiers(body.modifiers, body.rotation_axis);
  modifiers = applyLandingModifiers(modifiers, exit.landing_style, exit.landing_stance);
  return {
    approach,
    entry: entryComponent,
    spins,
    grabs,
    base_moves,
    modifiers
  };
};

const buildAirPayload = (air) => {
  if (!air) return null;
  const entry = air.entry || {};
  const body = air.body || {};
  const exit = air.exit || {};
  const approach = normalizeApproach(entry.approach, entry.stance);
  const entryComponent = normalizeEntry('ollie');
  const spins = normalizeSpin(body.direction, body.degrees);
  const stanceKey = entry.approach === 'TS' ? 'ts' : 'regular';
  const baseMove = (() => {
    const flipKey = body.flip && AIR_FLIP_BASE_MAP[body.flip];
    if (flipKey) {
      return flipKey[stanceKey] || flipKey.regular;
    }
    if (body.axis === 'inverted') {
      return stanceKey === 'ts' ? 'ts_backroll' : 'backroll';
    }
    return 'ollie';
  })();
  let modifiers = normalizeModifiers(body.modifiers, body.axis);
  modifiers = applyLandingModifiers(modifiers, exit.landing_style, exit.landing_stance);
  return {
    approach,
    entry: entryComponent,
    spins,
    grabs: 'none',
    base_moves: baseMove,
    modifiers
  };
};

const buildSurfacePayload = (surface) => {
  if (!surface) return null;
  const entry = surface.entry || {};
  const body = surface.body || {};
  const exit = surface.exit || {};
  const approach = normalizeApproach(entry.approach, entry.stance);
  const entryComponent = normalizeEntry('ride_on');
  const spins = normalizeSpin(body.direction, body.degrees);
  const baseMove = SURFACE_MOVE_MAP[body.move] || 'surface_180';
  let modifiers = normalizeModifiers(body.modifiers);
  modifiers = applyLandingModifiers(modifiers, exit.end_style, exit.end_stance);
  return {
    approach,
    entry: entryComponent,
    spins,
    grabs: 'none',
    base_moves: baseMove,
    modifiers
  };
};

export const parseManeuverPayload = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw;
  }
  return null;
};

export const deriveManeuverType = ({ maneuverType, specialization, fallback } = {}) => {
  if (maneuverType) {
    return String(maneuverType).toLowerCase();
  }
  if (specialization) {
    const map = { slider: 'rail', kicker: 'kicker', surface: 'surface' };
    return map[specialization] || null;
  }
  return fallback || null;
};

export const buildManeuverPayloadFromExp = (expPayload, maneuverType) => {
  if (!expPayload || !maneuverType) return null;
  const normalizedType = String(maneuverType).toLowerCase();
  switch (normalizedType) {
    case 'rail':
      return buildRailPayload(expPayload.rail) || { ...DEFAULT_PAYLOAD };
    case 'kicker':
      return buildKickerPayload(expPayload.kicker) || { ...DEFAULT_PAYLOAD };
    case 'air':
      return buildAirPayload(expPayload.air) || { ...DEFAULT_PAYLOAD };
    case 'surface':
      return buildSurfacePayload(expPayload.surface) || { ...DEFAULT_PAYLOAD };
    default:
      return null;
  }
};

export const ensureManeuverPayload = (payload) => {
  if (!payload) {
    return { ...DEFAULT_PAYLOAD };
  }
  return {
    approach: payload.approach || DEFAULT_PAYLOAD.approach,
    entry: payload.entry || DEFAULT_PAYLOAD.entry,
    spins: payload.spins || DEFAULT_PAYLOAD.spins,
    grabs: payload.grabs || DEFAULT_PAYLOAD.grabs,
    base_moves: payload.base_moves || DEFAULT_PAYLOAD.base_moves,
    modifiers: Array.isArray(payload.modifiers) ? payload.modifiers : []
  };
};

export const buildPresetFromChallenge = (challenge) => {
  if (!challenge) return null;
  const payload = parseManeuverPayload(challenge.maneuver_payload || challenge.maneuverPayload);
  const maneuverType = deriveManeuverType({
    maneuverType: challenge.maneuver_type || challenge.maneuverType,
    specialization: challenge.specialization,
    fallback: null
  });
  if (!payload) {
    return null;
  }
  return {
    id: challenge.id,
    title: (challenge.maneuver_name || challenge.maneuverName || '').trim() || 'Desafio',
    description: challenge.description || '',
    difficulty: challenge.difficulty || null,
    rewardXp: Number(challenge.reward_xp ?? challenge.rewardXp ?? 0),
    maneuverPayload: ensureManeuverPayload(payload),
    maneuverType,
    parkId: challenge.park_id || challenge.parkId || null,
    obstacleIds: challenge.obstacle_ids || challenge.obstacleIds || null,
    parkName: challenge.park_name || challenge.parkName || null,
    challengeId: challenge.id || null,
    monthlyPassId: challenge.monthly_pass_id || challenge.monthlyPassId || null,
    seasonPassId: challenge.season_pass_id || challenge.seasonPassId || null,
    seasonId: challenge.season_id || challenge.seasonId || null
  };
};
