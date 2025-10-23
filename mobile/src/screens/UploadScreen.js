import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useNavigation, useRoute } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { Video } from 'expo-av';
import { colors, radii, spacing, typography } from '../theme/tokens';
import YupBadge from '../components/ui/YupBadge';
import YupButton from '../components/ui/YupButton';
import YupCard from '../components/ui/YupCard';
import YupSectionHeader from '../components/ui/YupSectionHeader';
import { parkService } from '../services/parkService';
import trickService from '../services/trickService';
import uploadService from '../services/uploadService';

const previewPlaceholder = require('../../assets/splash.png');

const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Público', icon: 'public' },
  { id: 'friends', label: 'Amigos', icon: 'groups' },
  { id: 'private', label: 'Privado', icon: 'lock' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Iniciante' },
  { id: 'medium', label: 'Intermediário' },
  { id: 'hard', label: 'Avançado' },
  { id: 'pro', label: 'Pro' },
];

const DIFFICULTY_LABEL_TO_ID = DIFFICULTY_OPTIONS.reduce((acc, option) => {
  acc[option.label] = option.id;
  return acc;
}, {});

const MIN_TRIM_DURATION = 2;

const UPLOAD_STEPS = [
  { id: 1, label: 'Manobra' },
  { id: 2, label: 'Upload' },
  { id: 3, label: 'Edição' },
];

const RAIL_APPROACH_OPTIONS = [
  { id: 'HS', label: 'HS (HeelSide)' },
  { id: 'TS', label: 'TS (ToeSide)' },
];

const RAIL_TAKEOFF_OPTIONS = [
  { id: 'ollie', label: 'Ollie' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'gap', label: 'Gap' },
  { id: 'from_water', label: 'From Water' },
];

const RAIL_ROTATION_OPTIONS = [
  { id: 0, label: '0°' },
  { id: 90, label: '90°' },
  { id: 180, label: '180°' },
  { id: 270, label: '270°' },
  { id: 360, label: '360°' },
  { id: 450, label: '450°' },
  { id: 540, label: '540°' },
];

const RAIL_ROTATION_IN_OPTIONS = RAIL_ROTATION_OPTIONS.filter((option) =>
  [0, 180, 270, 450, 540].includes(option.id)
);

const RAIL_ROTATION_OUT_OPTIONS = RAIL_ROTATION_OPTIONS.filter((option) =>
  [0, 90, 180, 270, 450, 540].includes(option.id)
);

const RAIL_SWITCHUP_ROTATION_OPTIONS = RAIL_ROTATION_OPTIONS.filter((option) =>
  [0, 90, 180, 270, 360].includes(option.id)
);

const RAIL_DIRECTION_OPTIONS = [
  { id: 'FS', label: 'Frontside' },
  { id: 'BS', label: 'Backside' },
];

const RAIL_TRICK_OPTIONS = [
  { id: '50-50', label: '50-50' },
  { id: 'boardslide', label: 'Boardslide' },
  { id: 'lipslide', label: 'Lipslide' },
  { id: 'nosepress', label: 'Nosepress' },
  { id: 'tailpress', label: 'Tailpress' },
];

const RAIL_STANCE_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'switch', label: 'Switch' },
];

const RAIL_BALANCE_OPTIONS = [
  { id: 'centered', label: 'Centralizado' },
  { id: 'nose-heavy', label: 'Peso no nose' },
  { id: 'tail-heavy', label: 'Peso no tail' },
];

const RAIL_MODIFIER_OPTIONS = [
  { id: 'locked', label: 'Locked' },
  { id: 'tweaked', label: 'Tweaked' },
  { id: 'press', label: 'Press' },
  { id: 'pretzel', label: 'Pretzel' },
  { id: 'shifty', label: 'Shifty' },
  { id: 'grab', label: 'Grab' },
];

const RAIL_SWITCHUP_TYPE_OPTIONS = [
  { id: 'hop', label: 'Hop' },
  { id: 'nollie', label: 'Nollie' },
  { id: 'ollie', label: 'Ollie' },
  { id: 'body_varial', label: 'Body Varial' },
];

const RAIL_EXIT_LANDING_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'switch', label: 'Switch' },
  { id: 'revert', label: 'Revert' },
];

const RAIL_EXIT_EXTRAS = [
  { id: 'to_blind', label: 'To Blind' },
  { id: 'shuv', label: 'Shuv' },
];

const KICKER_APPROACH_OPTIONS = [
  { id: 'HS', label: 'HS (HeelSide)' },
  { id: 'TS', label: 'TS (ToeSide)' },
];

const KICKER_STANCE_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'switch', label: 'Switch' },
];

const KICKER_POP_OPTIONS = [
  { id: 'edge', label: 'Edge' },
  { id: 'ollie', label: 'Ollie' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'flat_pop', label: 'Flat Pop' },
];

const KICKER_AXIS_OPTIONS = [
  { id: 'on-axis', label: 'On-axis' },
  { id: 'off-axis', label: 'Off-axis' },
  { id: 'inverted', label: 'Inverted' },
];

const KICKER_ROTATION_DIRECTION_OPTIONS = [
  { id: 'FS', label: 'Frontside' },
  { id: 'BS', label: 'Backside' },
];

const KICKER_ROTATION_DEGREES_OPTIONS = [
  { id: 0, label: '0°' },
  { id: 180, label: '180°' },
  { id: 360, label: '360°' },
  { id: 540, label: '540°' },
  { id: 720, label: '720°' },
  { id: 900, label: '900°' },
  { id: 1080, label: '1080°' },
  { id: 1260, label: '1260°' },
  { id: 1440, label: '1440°' },
];

const KICKER_FLIP_TYPES = [
  { id: null, label: 'Sem flip' },
  { id: 'kickflip', label: 'Kickflip' },
  { id: 'heelflip', label: 'Heelflip' },
  { id: 'frontflip', label: 'Frontflip' },
  { id: 'backflip', label: 'Backflip' },
  { id: 'shuvit', label: 'Shuvit' },
];

const KICKER_GRAB_OPTIONS = [
  { id: null, label: 'Sem grab' },
  { id: 'mute', label: 'Mute' },
  { id: 'indy', label: 'Indy' },
  { id: 'stalefish', label: 'Stalefish' },
  { id: 'melon', label: 'Melon' },
  { id: 'tail', label: 'Tail' },
  { id: 'nose', label: 'Nose' },
];

const KICKER_MODIFIER_OPTIONS = [
  { id: 'handlepass', label: 'Handlepass' },
  { id: 'blind', label: 'Blind' },
  { id: 'wrapped', label: 'Wrapped' },
  { id: 'late', label: 'Late' },
  { id: 'rewind', label: 'Rewind' },
  { id: 'double', label: 'Double' },
  { id: 'switch', label: 'Switch' },
];

const KICKER_LANDING_STANCE_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'switch', label: 'Switch' },
  { id: 'fakie', label: 'Fakie' },
];

const KICKER_LANDING_STYLE_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'to_blind', label: 'To blind' },
  { id: 'revert', label: 'Revert' },
  { id: 'to_fakie', label: 'To fakie' },
  { id: 'late', label: 'Late' },
];

const AIR_APPROACH_OPTIONS = [
  { id: 'HS', label: 'HS (HeelSide)' },
  { id: 'TS', label: 'TS (ToeSide)' },
];

const AIR_STANCE_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'switch', label: 'Switch' },
];

const AIR_EDGE_LOAD_OPTIONS = [
  { id: 'light', label: 'Light load' },
  { id: 'medium', label: 'Medium load' },
  { id: 'heavy', label: 'Heavy load' },
];

const AIR_RELEASE_OPTIONS = [
  { id: 'progressive', label: 'Progressive' },
  { id: 'trip', label: 'Trip' },
  { id: 'ollie', label: 'Ollie' },
  { id: 'ole_wrapped', label: 'Ole / Wrapped' },
];

const AIR_AXIS_OPTIONS = [
  { id: 'on-axis', label: 'On-axis' },
  { id: 'off-axis', label: 'Off-axis' },
  { id: 'inverted', label: 'Inverted' },
];

const AIR_DIRECTION_OPTIONS = [
  { id: 'FS', label: 'Frontside' },
  { id: 'BS', label: 'Backside' },
];

const AIR_DEGREES_OPTIONS = [
  { id: 0, label: '0°' },
  { id: 180, label: '180°' },
  { id: 360, label: '360°' },
  { id: 540, label: '540°' },
  { id: 720, label: '720°' },
  { id: 900, label: '900°' },
  { id: 1080, label: '1080°' },
  { id: 1260, label: '1260°' },
  { id: 1440, label: '1440°' },
];

const AIR_FLIP_OPTIONS = [
  { id: null, label: 'Sem flip' },
  { id: 'Raley', label: 'Raley' },
  { id: 'S-Bend', label: 'S-Bend' },
  { id: 'Krypt', label: 'Krypt' },
  { id: 'Backroll', label: 'Backroll' },
  { id: 'Frontroll', label: 'Frontroll' },
  { id: 'Tantrum', label: 'Tantrum' },
  { id: 'KGB', label: 'KGB' },
  { id: 'KGB 5', label: 'KGB 5' },
  { id: 'Pete Rose', label: 'Pete Rose' },
  { id: 'Slim Chance', label: 'Slim Chance' },
  { id: 'Heart Attack', label: 'Heart Attack' },
  { id: 'Crow Mobe', label: 'Crow Mobe' },
  { id: 'Moby Dick', label: 'Moby Dick' },
  { id: 'Blind Judge', label: 'Blind Judge' },
];

const AIR_MODIFIER_OPTIONS = [
  { id: 'handlepass', label: 'Handlepass' },
  { id: 'wrapped', label: 'Wrapped' },
  { id: 'blind', label: 'Blind' },
  { id: 'late', label: 'Late' },
  { id: 'double', label: 'Double' },
  { id: 'rewind', label: 'Rewind' },
];

const AIR_LANDING_STANCE_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'switch', label: 'Switch' },
  { id: 'fakie', label: 'Fakie' },
];

const AIR_LANDING_STYLE_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'to_blind', label: 'To blind' },
  { id: 'revert', label: 'Revert' },
  { id: 'to_fakie', label: 'To fakie' },
  { id: 'late', label: 'Late' },
];

const AIR_EDGE_LOAD_BONUS = {
  light: 0,
  medium: 4,
  heavy: 8,
};

const AIR_FLIP_BONUS = {
  null: 0,
  Raley: 25,
  'S-Bend': 30,
  Krypt: 30,
  Backroll: 30,
  Frontroll: 30,
  Tantrum: 30,
  KGB: 40,
  'KGB 5': 40,
  'Pete Rose': 40,
  'Slim Chance': 40,
  'Crow Mobe': 40,
  'Heart Attack': 40,
  'Moby Dick': 40,
  'Blind Judge': 40,
};

const AIR_MODIFIER_BONUS = {
  handlepass: 20,
  blind: 15,
  wrapped: 10,
  late: 8,
  double: 12,
  rewind: 8,
};

const AIR_LANDING_STYLE_BONUS = {
  normal: 0,
  to_blind: 15,
  revert: 10,
  to_fakie: 10,
  late: 8,
};

const AIR_FLIP_AXIS_EXCEPTIONS = new Set(['Raley', 'S-Bend', 'Blind Judge', 'Heart Attack']);

const SURFACE_APPROACH_OPTIONS = [
  { id: 'HS', label: 'HS (HeelSide)' },
  { id: 'TS', label: 'TS (ToeSide)' },
];

const SURFACE_STANCE_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'switch', label: 'Switch' },
];

const SURFACE_SPEED_OPTIONS = [
  { id: null, label: 'Velocidade padrão' },
  { id: 'low', label: 'Low' },
  { id: 'mid', label: 'Mid' },
  { id: 'high', label: 'High' },
];

const SURFACE_MOVE_OPTIONS = [
  { id: 'Surface 180', label: 'Surface 180' },
  { id: 'Surface 360', label: 'Surface 360' },
  { id: 'Surface 540', label: 'Surface 540' },
  { id: 'Butter 180', label: 'Butter 180' },
  { id: 'Butter 360', label: 'Butter 360' },
  { id: 'Nosepress', label: 'Nosepress' },
  { id: 'Tailpress', label: 'Tailpress' },
  { id: 'Powerslide', label: 'Powerslide' },
  { id: 'Shuvit', label: 'Shuvit' },
];

const SURFACE_DEGREES_OPTIONS = [
  { id: 0, label: '0°' },
  { id: 180, label: '180°' },
  { id: 360, label: '360°' },
  { id: 540, label: '540°' },
];

const SURFACE_DIRECTION_OPTIONS = [
  { id: null, label: 'Sem direção' },
  { id: 'FS', label: 'Frontside' },
  { id: 'BS', label: 'Backside' },
];

const SURFACE_MODIFIER_OPTIONS = [
  { id: 'handlepass', label: 'Handlepass' },
  { id: 'blind', label: 'Blind' },
  { id: 'revert', label: 'Revert' },
  { id: 'rewind', label: 'Rewind' },
  { id: 'butter', label: 'Butter' },
];

const SURFACE_EXIT_STANCE_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'switch', label: 'Switch' },
];

const SURFACE_EXIT_STYLE_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'revert', label: 'Revert' },
  { id: 'to_blind', label: 'To blind' },
];

const SURFACE_MOVE_DEGREE_MAP = {
  'Surface 180': [180],
  'Surface 360': [360],
  'Surface 540': [540],
  'Butter 180': [180],
  'Butter 360': [360],
  Nosepress: [0],
  Tailpress: [0],
  Powerslide: [0, 180],
  Shuvit: [180],
};

const SURFACE_MOVE_BONUS = {
  'Surface 180': 8,
  'Surface 360': 16,
  'Surface 540': 24,
  'Butter 180': 10,
  'Butter 360': 10,
  Nosepress: 10,
  Tailpress: 10,
  Powerslide: 8,
  Shuvit: 16,
};

const SURFACE_MODIFIER_BONUS = {
  handlepass: 12,
  blind: 10,
  revert: 8,
  rewind: 6,
  butter: 6,
};

const SURFACE_EXIT_STYLE_BONUS = {
  normal: 0,
  revert: 6,
  to_blind: 10,
};

const createDefaultRailEntry = () => ({
  approach: 'HS',
  takeoff: 'ollie',
  rotation_in: 0,
  direction_in: 'FS',
});

const createDefaultRailSegment = () => ({
  trick: 'boardslide',
  stance: 'regular',
  balance: 'centered',
  modifiers: [],
  switchUp: null,
});

const createDefaultRailExit = () => ({
  rotation_out: 0,
  direction_out: 'FS',
  landing: 'regular',
  extras: [],
});

const defaultSwitchUp = {
  type: 'hop',
  rotation: 0,
  direction: 'FS',
};

const createDefaultKickerEntry = () => ({
  approach: 'HS',
  stance: 'regular',
  pop: 'ollie',
});

const createDefaultKickerBody = () => ({
  rotation_axis: 'on-axis',
  rotation_direction: 'FS',
  rotation_degrees: 360,
  flip_type: null,
  grab: null,
  modifiers: [],
});

const createDefaultKickerExit = () => ({
  landing_stance: 'regular',
  landing_style: 'normal',
});

const createDefaultAirEntry = () => ({
  approach: 'HS',
  stance: 'regular',
  edge_load: 'medium',
  release: 'progressive',
});

const createDefaultAirBody = () => ({
  axis: 'on-axis',
  direction: 'FS',
  degrees: 0,
  flip: null,
  modifiers: [],
});

const createDefaultAirExit = () => ({
  landing_stance: 'regular',
  landing_style: 'normal',
});

const createDefaultSurfaceEntry = () => ({
  approach: 'HS',
  stance: 'regular',
  speed: null,
});

const createDefaultSurfaceBody = () => ({
  move: 'Surface 180',
  degrees: 180,
  direction: null,
  modifiers: [],
});

const createDefaultSurfaceExit = () => ({
  end_stance: 'regular',
  end_style: 'normal',
});

const findLabel = (options, id) => options.find((option) => option.id === id)?.label || id;

const formatRotationDirection = (direction, rotation) => {
  if (!rotation || rotation === 0) {
    return direction;
  }
  return `${direction}${rotation}`;
};

const slugify = (value) => {
  if (value == null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const buildSlug = (prefix, ...parts) => {
  const cleaned = parts.map(slugify).filter(Boolean);
  return [slugify(prefix), ...cleaned].filter(Boolean).join('-');
};

const ensureArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const buildRailPreview = (entry, segments, exit) => {
  if (!entry || !segments?.length || !exit) {
    return 'Configure a linha RAIL para visualizar a prévia.';
  }

  const entryRotation = formatRotationDirection(entry.direction_in, entry.rotation_in);
  const entryText = `${entry.approach} ${findLabel(RAIL_TAKEOFF_OPTIONS, entry.takeoff)} ${entryRotation} in`;

  let preview = entryText;
  segments.forEach((segment, index) => {
    const parts = [findLabel(RAIL_TRICK_OPTIONS, segment.trick)];
    if (segment.stance === 'switch') {
      parts.push('[switch]');
    }
    if (segment.balance && segment.balance !== 'centered') {
      parts.push(`(${findLabel(RAIL_BALANCE_OPTIONS, segment.balance)})`);
    }
    if (segment.modifiers?.length) {
      parts.push(`{${segment.modifiers.map((modifier) => findLabel(RAIL_MODIFIER_OPTIONS, modifier)).join(' + ')}}`);
    }

    const segmentLabel = parts.join(' ');
    if (index === 0) {
      preview += `, ${segmentLabel}`;
      return;
    }

    const previous = segments[index - 1];
    const switchUp = previous.switchUp
      ? `${findLabel(RAIL_SWITCHUP_TYPE_OPTIONS, previous.switchUp.type)} ${formatRotationDirection(
          previous.switchUp.direction,
          previous.switchUp.rotation
        )}`
      : '';
    preview += switchUp ? ` → (${switchUp}) ${segmentLabel}` : `, ${segmentLabel}`;
  });

  const exitRotation = formatRotationDirection(exit.direction_out, exit.rotation_out);
  const landingText = exit.landing !== 'regular' ? ` ${findLabel(RAIL_EXIT_LANDING_OPTIONS, exit.landing)}` : '';
  const extrasText = exit.extras?.length
    ? ` +${exit.extras.map((extra) => findLabel(RAIL_EXIT_EXTRAS, extra)).join(' + ')}`
    : '';

  preview += `, ${exitRotation} out${landingText}${extrasText}`;
  return preview;
};

const validateRailFlow = (entry, segments) => {
  const messages = [];
  if (!segments?.length) {
    messages.push({ type: 'error', text: 'Adicione ao menos um segmento para compor a linha.' });
    return messages;
  }

  const first = segments[0];
  if (entry.rotation_in >= 270 && entry.direction_in === 'FS') {
    const allowed = ['boardslide', 'lipslide'];
    if (!allowed.includes(first.trick)) {
      messages.push({
        type: 'warning',
        text: 'FS270 in normalmente conecta em boardslide/backlip. Ajuste o primeiro segmento.',
      });
    }
  }

  if (entry.direction_in === 'BS' && entry.rotation_in >= 180) {
    const allowed = ['50-50', 'nosepress', 'tailpress'];
    if (!allowed.includes(first.trick)) {
      messages.push({
        type: 'warning',
        text: 'Backside in com muita rotação pede locks estáveis (50-50, nose/tail press).',
      });
    }
  }

  segments.forEach((segment, index) => {
    if (index < segments.length - 1 && !segment.switchUp) {
      messages.push({
        type: 'error',
        text: `Defina o switch-up entre os segmentos ${index + 1} e ${index + 2}.`,
      });
    }
  });

  return messages;
};

const calculateRailXp = (entry, segments, exit, obstacle = null) => {
  const baseObstacle =
    Number(obstacle?.exp_base ?? obstacle?.base_xp ?? obstacle?.xp ?? 25) || 25;

  const approachScore = entry.approach === 'TS' ? 12 : 10;
  const takeoffScore =
    {
      ollie: 12,
      transfer: 14,
      gap: 16,
      from_water: 10,
    }[entry.takeoff] ?? 10;
  const rotationScore =
    {
      0: 0,
      180: 8,
      270: 12,
      450: 18,
      540: 22,
    }[entry.rotation_in] ?? 0;
  const directionScore = entry.direction_in === 'BS' ? 8 : 6;
  const entryScore = approachScore + takeoffScore + rotationScore + directionScore;

  let segmentsScore = 0;
  let switchUpsScore = 0;

  segments.forEach((segment, index) => {
    const segmentBase =
      {
        '50-50': 14,
        boardslide: 16,
        lipslide: 18,
        nosepress: 17,
        tailpress: 17,
      }[segment.trick] ?? 12;
    const stanceScore = segment.stance === 'switch' ? 8 : 0;
    const balanceScore =
      {
        centered: 0,
        'nose-heavy': 5,
        'tail-heavy': 5,
      }[segment.balance] ?? 0;
    const modifiersScore = (segment.modifiers?.length ?? 0) * 4;
    segmentsScore += segmentBase + stanceScore + balanceScore + modifiersScore;

    if (segment.switchUp && index < segments.length - 1) {
      const typeScore =
        {
          hop: 8,
          nollie: 10,
          ollie: 10,
          body_varial: 12,
        }[segment.switchUp.type] ?? 6;
      const rotationSwitchScore =
        {
          0: 0,
          90: 4,
          180: 8,
          270: 12,
          360: 16,
        }[segment.switchUp.rotation] ?? 0;
      const directionSwitchScore = segment.switchUp.direction === 'BS' ? 6 : 4;
      switchUpsScore += typeScore + rotationSwitchScore + directionSwitchScore;
    }
  });

  const exitRotationScore =
    {
      0: 0,
      90: 6,
      180: 10,
      270: 14,
      450: 18,
      540: 22,
    }[exit.rotation_out] ?? 0;
  const exitDirectionScore = exit.direction_out === 'BS' ? 6 : 5;
  const landingScore =
    {
      regular: 0,
      switch: 8,
      revert: 6,
    }[exit.landing] ?? 0;
  const extrasScore = (exit.extras?.length ?? 0) * 6;
  const exitScore = exitRotationScore + exitDirectionScore + landingScore + extrasScore;

  const baseTotal = baseObstacle + entryScore + segmentsScore + switchUpsScore + exitScore;

  let synergyFactor = 0;
  if (segments.length > 1) synergyFactor += 0.08;
  if (entry.rotation_in >= 270 && exit.rotation_out >= 180) synergyFactor += 0.06;
  if (segments.some((segment) => segment.modifiers?.includes('pretzel'))) synergyFactor += 0.04;
  if (segments.every((segment) => segment.stance === segments[0].stance)) synergyFactor += 0.03;
  if (exit.landing === 'switch') synergyFactor += 0.02;
  synergyFactor = Math.min(0.25, synergyFactor);
  const synergyBonus = Math.round(baseTotal * synergyFactor);

  return {
    baseObstacle,
    entry: entryScore,
    segments: segmentsScore,
    switchUps: switchUpsScore,
    exit: exitScore,
    synergyBonus,
    synergyPercent: Math.round(synergyFactor * 100),
    total: baseTotal + synergyBonus,
  };
};

const buildKickerPreview = (entry, body, exit) => {
  if (!entry || !body || !exit) {
    return 'Configure a manobra no kicker para visualizar a prévia.';
  }

  const baseParts = [
    entry.approach,
    entry.stance === 'switch' ? 'switch' : null,
    body.rotation_degrees ? `${body.rotation_direction}${body.rotation_degrees}` : body.rotation_direction,
  ];

  if (body.flip_type) {
    baseParts.push(findLabel(KICKER_FLIP_TYPES, body.flip_type));
  }

  if (body.grab) {
    baseParts.push(`${findLabel(KICKER_GRAB_OPTIONS, body.grab)} grab`);
  }

  if (body.rotation_axis !== 'on-axis') {
    baseParts.push(`(${findLabel(KICKER_AXIS_OPTIONS, body.rotation_axis)})`);
  }

  const modifiers = ensureArray(body.modifiers);
  const modifierText = modifiers.length
    ? ` (${modifiers.map((modifier) => findLabel(KICKER_MODIFIER_OPTIONS, modifier)).join(' • ')})`
    : '';

  const landingParts = [];
  if (exit.landing_style !== 'normal') {
    landingParts.push(findLabel(KICKER_LANDING_STYLE_OPTIONS, exit.landing_style));
  }
  if (exit.landing_stance !== 'regular') {
    landingParts.push(findLabel(KICKER_LANDING_STANCE_OPTIONS, exit.landing_stance));
  }

  const landingText = landingParts.length ? `, ${landingParts.join(' ')}` : '';
  return `${baseParts.filter(Boolean).join(' ')}${modifierText}${landingText}`.trim();
};

const validateKickerCombo = (entry, body, exit) => {
  const messages = [];
  const modifiers = ensureArray(body?.modifiers);
  const degrees = Number(body?.rotation_degrees ?? 0);

  if (degrees > 0 && !body?.rotation_direction) {
    messages.push({ type: 'error', text: 'Defina a direção (FS ou BS) quando houver rotação.' });
  }

  if (
    exit?.landing_style === 'to_blind' &&
    !modifiers.includes('handlepass') &&
    !modifiers.includes('wrapped')
  ) {
    messages.push({
      type: 'error',
      text: 'Landing to blind exige handlepass ou wrapped.',
    });
  }

  if (modifiers.includes('double') && body?.rotation_axis !== 'inverted' && degrees < 540) {
    messages.push({
      type: 'error',
      text: 'Double precisa de invertido ou spin 540°+ para fechar seguro.',
    });
  }

  if (body?.flip_type && body.rotation_axis !== 'inverted' && !['Blind Judge', 'Raley'].includes(body.flip_type)) {
    messages.push({
      type: 'warning',
      text: 'Considere eixo inverted para este flip — exceções como Blind Judge são toleradas.',
    });
  }

  return messages;
};

const calculateKickerXp = (entry, body, exit) => {
  const modifiers = ensureArray(body?.modifiers);
  const baseAir = 60;
  const entryBonus =
    (entry?.stance === 'switch' ? 8 : 0) +
    (entry?.approach === 'TS' ? 2 : 0) +
    ({
      edge: 10,
      ollie: 12,
      transfer: 16,
      flat_pop: 14,
    }[entry?.pop] ?? 10);

  const degrees = Number(body?.rotation_degrees ?? 0);
  const spinBonus = Math.max(0, (degrees / 180) * 8);
  const flipBonus =
    {
      null: 0,
      Raley: 25,
      'S-Bend': 30,
      Krypt: 30,
      Backroll: 30,
      Frontroll: 30,
      Tantrum: 30,
      KGB: 40,
      'KGB 5': 40,
      'Pete Rose': 40,
      'Slim Chance': 40,
      'Heart Attack': 40,
      'Crow Mobe': 40,
      'Moby Dick': 40,
      'Blind Judge': 40,
    }[body?.flip_type ?? 'null'] ?? 0;
  const grabBonus =
    {
      null: 0,
      mute: 12,
      indy: 12,
      stalefish: 14,
      melon: 14,
      tail: 10,
      nose: 10,
    }[body?.grab ?? 'null'] ?? 0;

  const modifiersBonus = modifiers.reduce(
    (total, modifier) =>
      total +
      ({
        handlepass: 20,
        blind: 15,
        wrapped: 10,
        late: 8,
        double: 12,
        rewind: 8,
        switch: 6,
      }[modifier] ?? 6),
    0
  );

  const landingBonus =
    (exit?.landing_stance && exit.landing_stance !== 'regular' ? 10 : 0) +
    ({
      normal: 0,
      to_blind: 15,
      revert: 10,
      to_fakie: 12,
      late: 8,
    }[exit?.landing_style] ?? 0);

  const baseTotal = baseAir + entryBonus + spinBonus + flipBonus + grabBonus + modifiersBonus + landingBonus;

  const synergyFlags = [
    Boolean(body?.flip_type),
    degrees >= 540,
    modifiers.includes('handlepass'),
    modifiers.includes('blind'),
    modifiers.includes('wrapped') || entry?.pop === 'transfer',
  ];

  const synergyFactor = Math.min(synergyFlags.filter(Boolean).length * 0.05, 0.25);
  const synergyBonus = Math.round(baseTotal * synergyFactor);
  const total = Math.round(baseTotal + synergyBonus);

  const progress = Math.min(total / 540, 1);
  let level = 'Iniciante';
  if (total >= 320) level = 'Avançado';
  else if (total >= 200) level = 'Intermediário';

  return {
    entry: Math.round(entryBonus),
    spin: Math.round(spinBonus),
    flip: flipBonus,
    grab: grabBonus,
    modifiers: modifiersBonus,
    landing: landingBonus,
    synergyBonus,
    synergyPercent: Math.round(synergyFactor * 100),
    total,
    progress,
    level,
  };
};

const renderAir = (entry, body, exit) => {
  if (!entry || !body || !exit) return 'Configure a manobra no air trick para visualizar a prévia.';

  const modifiers = ensureArray(body.modifiers);
  const baseParts = [
    entry.approach,
    entry.stance === 'switch' ? 'switch' : null,
    body.degrees ? `${body.direction}${body.degrees}` : body.direction,
  ];

  if (body.flip) baseParts.push(body.flip);
  if (body.axis !== 'on-axis') baseParts.push(`(${findLabel(AIR_AXIS_OPTIONS, body.axis)})`);

  const modifierText = modifiers.length
    ? ` (${modifiers.map((modifier) => findLabel(AIR_MODIFIER_OPTIONS, modifier)).join(' • ')})`
    : '';

  const landingParts = [];
  if (exit.landing_style !== 'normal') landingParts.push(findLabel(AIR_LANDING_STYLE_OPTIONS, exit.landing_style));
  if (exit.landing_stance !== 'regular') landingParts.push(findLabel(AIR_LANDING_STANCE_OPTIONS, exit.landing_stance));
  const landingText = landingParts.length ? `, ${landingParts.join(' ')}` : '';

  return `${baseParts.filter(Boolean).join(' ')}${modifierText}${landingText}`.trim();
};

const validateAir = (entry, body, exit) => {
  const messages = [];
  const modifiers = ensureArray(body?.modifiers);
  const degrees = Number(body?.degrees ?? 0);

  if (degrees > 0 && !body?.direction) {
    messages.push({ type: 'error', text: 'Defina a direção (FS ou BS) quando houver rotação.' });
  }

  if (
    exit?.landing_style === 'to_blind' &&
    !modifiers.includes('handlepass') &&
    !modifiers.includes('wrapped')
  ) {
    messages.push({ type: 'error', text: 'Landing to blind exige handlepass ou wrapped.' });
  }

  if (modifiers.includes('double') && body?.axis !== 'inverted' && degrees < 540) {
    messages.push({
      type: 'error',
      text: 'Double precisa de invertido ou spin 540°+ para fechar seguro.',
    });
  }

  if (body?.flip && body.axis !== 'inverted' && !AIR_FLIP_AXIS_EXCEPTIONS.has(body.flip)) {
    messages.push({
      type: 'warning',
      text: 'Considere usar eixo inverted para esse flip — exceções como Blind Judge são aceitas.',
    });
  }

  return messages;
};

const scoreAir = (entry, body, exit) => {
  const modifiers = ensureArray(body?.modifiers);
  const baseAir = 60;
  const entryBonus =
    (entry?.stance === 'switch' ? 8 : 0) +
    (AIR_EDGE_LOAD_BONUS[entry?.edge_load] ?? 0) +
    (entry?.release === 'ole_wrapped' ? 6 : 0);

  const degrees = Number(body?.degrees ?? 0);
  const spinBonus = Math.max(0, (degrees / 180) * 8);
  const flipBonus = AIR_FLIP_BONUS[body?.flip ?? 'null'] ?? 0;
  const axisBonus = body?.axis === 'inverted' ? 4 : 0;

  const modifiersBonus = modifiers.reduce(
    (total, modifier) => total + (AIR_MODIFIER_BONUS[modifier] ?? 6),
    0
  );

  const landingBonus =
    (exit?.landing_stance !== 'regular' ? 10 : 0) + (AIR_LANDING_STYLE_BONUS[exit?.landing_style] ?? 0);

  const baseTotal = baseAir + entryBonus + spinBonus + flipBonus + modifiersBonus + landingBonus + axisBonus;

  const synergyFlags = [
    Boolean(body?.flip),
    degrees >= 540,
    modifiers.includes('handlepass'),
    modifiers.includes('blind'),
    modifiers.includes('wrapped') || entry?.release === 'ole_wrapped',
  ];

  const synergyFactor = Math.min(synergyFlags.filter(Boolean).length * 0.05, 0.25);
  const synergyBonus = Math.round(baseTotal * synergyFactor);
  const total = Math.round(baseTotal + synergyBonus);

  const progress = Math.min(total / 540, 1);
  let level = 'Iniciante';
  if (total >= 320) level = 'Avançado';
  else if (total >= 220) level = 'Intermediário';

  return {
    base: baseAir,
    entry: Math.round(entryBonus),
    spin: Math.round(spinBonus),
    flip: flipBonus,
    modifiers: modifiersBonus,
    landing: landingBonus,
    synergyBonus,
    synergyPercent: Math.round(synergyFactor * 100),
    total,
    progress,
    level,
  };
};

const renderSurface = (entry, body, exit) => {
  if (!entry || !body || !exit) return 'Monte a surface trick para visualizar a prévia.';

  const modifiers = ensureArray(body.modifiers);
  const baseParts = [
    entry.approach,
    entry.stance === 'switch' ? 'switch' : null,
    findLabel(SURFACE_MOVE_OPTIONS, body.move),
  ];

  if (body.degrees) {
    baseParts.push(body.direction ? `${body.direction}${body.degrees}` : `${body.degrees}°`);
  }

  const modifierText = modifiers.length
    ? ` (${modifiers.map((modifier) => findLabel(SURFACE_MODIFIER_OPTIONS, modifier)).join(' • ')})`
    : '';

  const landingParts = [];
  if (exit.end_style !== 'normal') landingParts.push(findLabel(SURFACE_EXIT_STYLE_OPTIONS, exit.end_style));
  if (exit.end_stance !== 'regular') landingParts.push(findLabel(SURFACE_EXIT_STANCE_OPTIONS, exit.end_stance));
  const landingText = landingParts.length ? `, ${landingParts.join(' ')}` : '';

  return `${baseParts.filter(Boolean).join(' ')}${modifierText}${landingText}`.trim();
};

const validateSurface = (entry, body, exit) => {
  const messages = [];
  const modifiers = ensureArray(body?.modifiers);

  if (
    exit?.end_style === 'to_blind' &&
    !modifiers.includes('handlepass') &&
    !modifiers.includes('blind')
  ) {
    messages.push({
      type: 'error',
      text: 'Para sair to blind, adicione handlepass ou blind.',
    });
  }

  const allowedDegrees = SURFACE_MOVE_DEGREE_MAP[body?.move] ?? [];
  if (allowedDegrees.length && !allowedDegrees.includes(body?.degrees ?? 0)) {
    messages.push({
      type: 'warning',
      text: 'A rotação escolhida não é comum para esse movimento de surface.',
    });
  }

  if (modifiers.includes('butter') && !String(body?.move ?? '').toLowerCase().includes('butter')) {
    messages.push({
      type: 'warning',
      text: 'O modifier butter costuma acompanhar manobras Butter — confirme se faz sentido.',
    });
  }

  return messages;
};

const scoreSurface = (entry, body, exit) => {
  const modifiers = ensureArray(body?.modifiers);
  const baseSurface = 20;
  const moveBonus = SURFACE_MOVE_BONUS[body?.move] ?? 6;
  const spinBonus = Math.max(0, (Number(body?.degrees ?? 0) / 180) * 6);

  const modifiersBonus = modifiers.reduce(
    (total, modifier) => total + (SURFACE_MODIFIER_BONUS[modifier] ?? 4),
    0
  );

  const exitBonus =
    (exit?.end_stance !== 'regular' ? 6 : 0) + (SURFACE_EXIT_STYLE_BONUS[exit?.end_style] ?? 0);

  const baseTotal = baseSurface + moveBonus + spinBonus + modifiersBonus + exitBonus;

  const synergyFlags = [
    entry?.stance === 'switch',
    Number(body?.degrees ?? 0) >= 360,
    modifiers.includes('handlepass'),
    modifiers.includes('blind') || exit?.end_style === 'to_blind',
    modifiers.includes('butter') || String(body?.move ?? '').includes('Butter'),
  ];

  const synergyFactor = Math.min(synergyFlags.filter(Boolean).length * 0.05, 0.2);
  const synergyBonus = Math.round(baseTotal * synergyFactor);
  const total = Math.round(baseTotal + synergyBonus);

  const progress = Math.min(total / 180, 1);
  let level = 'Iniciante';
  if (total >= 110) level = 'Avançado';
  else if (total >= 70) level = 'Intermediário';

  return {
    base: baseSurface,
    move: moveBonus,
    spin: Math.round(spinBonus),
    modifiers: modifiersBonus,
    exit: exitBonus,
    synergyBonus,
    synergyPercent: Math.round(synergyFactor * 100),
    total,
    progress,
    level,
  };
};


const AirForm = ({
  entry,
  body,
  exit,
  onEntryChange,
  onBodyChange,
  onToggleModifier,
  onExitChange,
  preview,
  xp,
  validationMessages,
  exportJson,
  slug,
}) => {
  const modifiers = ensureArray(body.modifiers);

  return (
    <YupCard style={styles.editorCard}>
      <View style={styles.slugRow}>
        <Icon name="tag" size={16} color={colors.textSecondary} />
        <Text style={styles.slugText}>{slug}</Text>
      </View>

      <View style={styles.editorSection}>
        <View style={styles.editorHeader}>
          <Icon name="airplanemode-active" size={18} color={colors.primary} />
          <Text style={styles.editorTitle}>Air trick</Text>
        </View>

        <Text style={styles.fieldLabel}>Approach</Text>
        <View style={styles.railChipRow}>
          {AIR_APPROACH_OPTIONS.map((option) => {
            const isActive = entry.approach === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChip, isActive && styles.railChipActive]}
                onPress={() => onEntryChange('approach', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Stance</Text>
        <View style={styles.railChipRow}>
          {AIR_STANCE_OPTIONS.map((option) => {
            const isActive = entry.stance === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChipSmall, isActive && styles.railChipActive]}
                onPress={() => onEntryChange('stance', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Edge load</Text>
        <View style={styles.railChipRow}>
          {AIR_EDGE_LOAD_OPTIONS.map((option) => {
            const isActive = entry.edge_load === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChipSmall, isActive && styles.railChipActive]}
                onPress={() => onEntryChange('edge_load', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Release</Text>
        <View style={styles.railChipRowWrap}>
          {AIR_RELEASE_OPTIONS.map((option) => {
            const isActive = entry.release === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChip, isActive && styles.railChipActive]}
                onPress={() => onEntryChange('release', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.editorSection}>
        <View style={styles.editorHeader}>
          <Icon name="360" size={18} color={colors.primary} />
          <Text style={styles.editorTitle}>Rotação</Text>
        </View>

        <Text style={styles.fieldLabel}>Axis</Text>
        <View style={styles.railChipRow}>
          {AIR_AXIS_OPTIONS.map((option) => {
            const isActive = body.axis === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChipSmall, isActive && styles.railChipActive]}
                onPress={() => onBodyChange('axis', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.railOptionGrid}>
          <View style={styles.railOptionColumn}>
            <Text style={styles.fieldLabel}>Direção</Text>
            <View style={styles.railChipRow}>
              {AIR_DIRECTION_OPTIONS.map((option) => {
                const isActive = body.direction === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.railChipSmall, isActive && styles.railChipActive]}
                    onPress={() => onBodyChange('direction', option.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.railOptionColumn}>
            <Text style={styles.fieldLabel}>Graus</Text>
            <View style={styles.railChipRowWrap}>
              {AIR_DEGREES_OPTIONS.map((option) => {
                const isActive = body.degrees === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.railChipSmall, isActive && styles.railChipActive]}
                    onPress={() => onBodyChange('degrees', option.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Flip</Text>
        <View style={styles.railChipRowWrap}>
          {AIR_FLIP_OPTIONS.map((option) => {
            const isActive = body.flip === option.id;
            return (
              <TouchableOpacity
                key={option.label ?? 'sem-flip'}
                style={[styles.railChip, isActive && styles.railChipActive]}
                onPress={() => onBodyChange('flip', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Modifiers</Text>
        <View style={styles.railChipRowWrap}>
          {AIR_MODIFIER_OPTIONS.map((option) => {
            const isActive = modifiers.includes(option.id);
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railModifierChip, isActive && styles.railModifierChipActive]}
                onPress={() => onToggleModifier(option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railModifierText, isActive && styles.railModifierTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.editorSection}>
        <View style={styles.editorHeader}>
          <Icon name="flight-land" size={18} color={colors.primary} />
          <Text style={styles.editorTitle}>Saída</Text>
        </View>

        <Text style={styles.fieldLabel}>Landing stance</Text>
        <View style={styles.railChipRow}>
          {AIR_LANDING_STANCE_OPTIONS.map((option) => {
            const isActive = exit.landing_stance === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChipSmall, isActive && styles.railChipActive]}
                onPress={() => onExitChange('landing_stance', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Landing style</Text>
        <View style={styles.railChipRowWrap}>
          {AIR_LANDING_STYLE_OPTIONS.map((option) => {
            const isActive = exit.landing_style === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChip, isActive && styles.railChipActive]}
                onPress={() => onExitChange('landing_style', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.editorSection}>
        <View style={styles.editorHeader}>
          <Icon name="textsms" size={18} color={colors.primary} />
          <Text style={styles.editorTitle}>Prévia</Text>
        </View>
        <Text style={styles.previewText}>{preview}</Text>
        <View style={styles.kickerXpSummary}>
          <View style={styles.kickerXpBar}>
            <View style={[styles.kickerXpFill, { width: `${Math.max(xp.progress * 100, 6)}%` }]} />
          </View>
          <Text style={styles.kickerXpLevel}>{xp.level}</Text>
          <Text style={styles.kickerXpBreakdownLabel}>
            {`Entrada ${formatNumber(xp.entry)} • Spin ${formatNumber(xp.spin)} • Flip ${formatNumber(xp.flip)} • Mods ${formatNumber(xp.modifiers)} • Landing ${formatNumber(xp.landing)} • Sinergia +${formatNumber(xp.synergyBonus)} (${xp.synergyPercent}%) = ${formatNumber(xp.total)} XP`}
          </Text>
        </View>
        <View style={styles.kickerJsonBox}>
          <Text style={styles.kickerJsonLabel}>JSON exportado</Text>
          <Text style={styles.kickerJsonText}>{exportJson}</Text>
        </View>
      </View>

      {validationMessages.length ? (
        <View style={styles.railMessages}>
          {validationMessages.map((message, index) => (
            <View
              key={`air-msg-${index}`}
              style={[
                styles.railMessage,
                message.type === 'error' ? styles.railMessageError : styles.railMessageWarning,
              ]}
            >
              <Icon
                name={message.type === 'error' ? 'error-outline' : 'warning'}
                size={18}
                color={message.type === 'error' ? colors.danger : colors.warning}
              />
              <Text style={styles.railMessageText}>{message.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </YupCard>
  );
};

const SurfaceForm = ({
  entry,
  body,
  exit,
  onEntryChange,
  onBodyChange,
  onToggleModifier,
  onExitChange,
  preview,
  xp,
  validationMessages,
  exportJson,
  slug,
}) => {
  const modifiers = ensureArray(body.modifiers);

  return (
    <YupCard style={styles.editorCard}>
      <View style={styles.slugRow}>
        <Icon name="tag" size={16} color={colors.textSecondary} />
        <Text style={styles.slugText}>{slug}</Text>
      </View>

      <View style={styles.editorSection}>
        <View style={styles.editorHeader}>
          <Icon name="waves" size={18} color={colors.primary} />
          <Text style={styles.editorTitle}>Surface trick</Text>
        </View>

        <Text style={styles.fieldLabel}>Approach</Text>
        <View style={styles.railChipRow}>
          {SURFACE_APPROACH_OPTIONS.map((option) => {
            const isActive = entry.approach === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChip, isActive && styles.railChipActive]}
                onPress={() => onEntryChange('approach', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Stance</Text>
        <View style={styles.railChipRow}>
          {SURFACE_STANCE_OPTIONS.map((option) => {
            const isActive = entry.stance === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChipSmall, isActive && styles.railChipActive]}
                onPress={() => onEntryChange('stance', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Velocidade</Text>
        <View style={styles.railChipRowWrap}>
          {SURFACE_SPEED_OPTIONS.map((option) => {
            const isActive = entry.speed === option.id;
            return (
              <TouchableOpacity
                key={option.label ?? 'speed'}
                style={[styles.railChipSmall, isActive && styles.railChipActive]}
                onPress={() => onEntryChange('speed', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.editorSection}>
        <View style={styles.editorHeader}>
          <Icon name="sync" size={18} color={colors.primary} />
          <Text style={styles.editorTitle}>Corpo</Text>
        </View>

        <Text style={styles.fieldLabel}>Move</Text>
        <View style={styles.railChipRowWrap}>
          {SURFACE_MOVE_OPTIONS.map((option) => {
            const isActive = body.move === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChip, isActive && styles.railChipActive]}
                onPress={() => onBodyChange('move', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.railOptionGrid}>
          <View style={styles.railOptionColumn}>
            <Text style={styles.fieldLabel}>Graus</Text>
            <View style={styles.railChipRowWrap}>
              {SURFACE_DEGREES_OPTIONS.map((option) => {
                const isActive = body.degrees === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.railChipSmall, isActive && styles.railChipActive]}
                    onPress={() => onBodyChange('degrees', option.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.railOptionColumn}>
            <Text style={styles.fieldLabel}>Direção</Text>
            <View style={styles.railChipRowWrap}>
              {SURFACE_DIRECTION_OPTIONS.map((option) => {
                const isActive = body.direction === option.id;
                return (
                  <TouchableOpacity
                    key={option.label ?? 'sem-direcao'}
                    style={[styles.railChipSmall, isActive && styles.railChipActive]}
                    onPress={() => onBodyChange('direction', option.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Modifiers</Text>
        <View style={styles.railChipRowWrap}>
          {SURFACE_MODIFIER_OPTIONS.map((option) => {
            const isActive = modifiers.includes(option.id);
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railModifierChip, isActive && styles.railModifierChipActive]}
                onPress={() => onToggleModifier(option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railModifierText, isActive && styles.railModifierTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.editorSection}>
        <View style={styles.editorHeader}>
          <Icon name="flag" size={18} color={colors.primary} />
          <Text style={styles.editorTitle}>Saída</Text>
        </View>

        <Text style={styles.fieldLabel}>Stance final</Text>
        <View style={styles.railChipRow}>
          {SURFACE_EXIT_STANCE_OPTIONS.map((option) => {
            const isActive = exit.end_stance === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChipSmall, isActive && styles.railChipActive]}
                onPress={() => onExitChange('end_stance', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Estilo final</Text>
        <View style={styles.railChipRowWrap}>
          {SURFACE_EXIT_STYLE_OPTIONS.map((option) => {
            const isActive = exit.end_style === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.railChip, isActive && styles.railChipActive]}
                onPress={() => onExitChange('end_style', option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.railChipText, isActive && styles.railChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.editorSection}>
        <View style={styles.editorHeader}>
          <Icon name="textsms" size={18} color={colors.primary} />
          <Text style={styles.editorTitle}>Prévia</Text>
        </View>
        <Text style={styles.previewText}>{preview}</Text>
        <View style={styles.kickerXpSummary}>
          <View style={styles.kickerXpBar}>
            <View style={[styles.kickerXpFill, { width: `${Math.max(xp.progress * 100, 6)}%` }]} />
          </View>
          <Text style={styles.kickerXpLevel}>{xp.level}</Text>
          <Text style={styles.kickerXpBreakdownLabel}>
            {`Base ${formatNumber(xp.base)} • Move ${formatNumber(xp.move)} • Spin ${formatNumber(xp.spin)} • Mods ${formatNumber(xp.modifiers)} • Saída ${formatNumber(xp.exit)} • Sinergia +${formatNumber(xp.synergyBonus)} (${xp.synergyPercent}%) = ${formatNumber(xp.total)} XP`}
          </Text>
        </View>
        <View style={styles.kickerJsonBox}>
          <Text style={styles.kickerJsonLabel}>JSON exportado</Text>
          <Text style={styles.kickerJsonText}>{exportJson}</Text>
        </View>
      </View>

      {validationMessages.length ? (
        <View style={styles.railMessages}>
          {validationMessages.map((message, index) => (
            <View
              key={`surface-msg-${index}`}
              style={[
                styles.railMessage,
                message.type === 'error' ? styles.railMessageError : styles.railMessageWarning,
              ]}
            >
              <Icon
                name={message.type === 'error' ? 'error-outline' : 'warning'}
                size={18}
                color={message.type === 'error' ? colors.danger : colors.warning}
              />
              <Text style={styles.railMessageText}>{message.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </YupCard>
  );
};

const formatNumber = (value) => {
  if (value == null) return '0';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toLocaleString('pt-BR');
};

const formatTimestamp = (value) => {
  if (value == null || Number.isNaN(value)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export default function UploadScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const presetChallenge = route.params?.presetChallenge;
  const safeInsets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [trick, setTrick] = useState('');
  const [selectedTrick, setSelectedTrick] = useState(null);
  const [trickSuggestions, setTrickSuggestions] = useState([]);
  const [isLoadingTricks, setIsLoadingTricks] = useState(false);
  const [isTrickInputFocused, setIsTrickInputFocused] = useState(false);
  const trickRequestIdRef = useRef(0);
  const trickBlurTimeoutRef = useRef(null);

  const [videoPreview, setVideoPreview] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [thumbnailTime, setThumbnailTime] = useState(0);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [targetFrameRate, setTargetFrameRate] = useState(30);

  const [privacy, setPrivacy] = useState(PRIVACY_OPTIONS[0].id);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  const [parks, setParks] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [selectedPark, setSelectedPark] = useState(null);
  const [selectedObstacle, setSelectedObstacle] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('Aguardando seleção de vídeo');

  const [railEntry, setRailEntry] = useState(createDefaultRailEntry());
  const [railSegments, setRailSegments] = useState([createDefaultRailSegment()]);
  const [railExit, setRailExit] = useState(createDefaultRailExit());
  const [railMode, setRailMode] = useState('simple');

  const [kickerEntry, setKickerEntry] = useState(createDefaultKickerEntry());
  const [kickerBody, setKickerBody] = useState(createDefaultKickerBody());
  const [kickerExit, setKickerExit] = useState(createDefaultKickerExit());

  const [airEntry, setAirEntry] = useState(createDefaultAirEntry());
  const [airBody, setAirBody] = useState(createDefaultAirBody());
  const [airExit, setAirExit] = useState(createDefaultAirExit());

  const [surfaceEntry, setSurfaceEntry] = useState(createDefaultSurfaceEntry());
  const [surfaceBody, setSurfaceBody] = useState(createDefaultSurfaceBody());
  const [surfaceExit, setSurfaceExit] = useState(createDefaultSurfaceExit());

  const editorVideoRef = useRef(null);

  const normalizedDuration = useMemo(() => {
    if (!videoPreview?.duration) return videoDuration;
    const raw = videoPreview.duration;
    return raw > 600 ? raw / 1000 : raw;
  }, [videoPreview, videoDuration]);

  const clampedTrimStart = useMemo(
    () => Math.min(trimStart, Math.max(0, trimEnd - MIN_TRIM_DURATION)),
    [trimStart, trimEnd]
  );
  const clampedTrimEnd = useMemo(
    () => Math.max(trimEnd, clampedTrimStart + MIN_TRIM_DURATION),
    [trimEnd, clampedTrimStart]
  );

  useEffect(() => {
    if (clampedTrimStart !== trimStart) {
      setTrimStart(clampedTrimStart);
    }
    if (clampedTrimEnd !== trimEnd) {
      setTrimEnd(clampedTrimEnd);
    }
  }, [clampedTrimStart, clampedTrimEnd, trimStart, trimEnd]);

  useEffect(() => {
    if (thumbnailTime < trimStart) {
      setThumbnailTime(trimStart);
    } else if (thumbnailTime > trimEnd) {
      setThumbnailTime(trimEnd);
    }
  }, [trimStart, trimEnd, thumbnailTime]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const [parksResponse, obstaclesResponse] = await Promise.all([
          parkService.getParks(),
          parkService.getObstacles(),
        ]);
        setParks(parksResponse?.parks ?? []);
        setObstacles(obstaclesResponse?.obstacles ?? []);
      } catch (error) {
        console.error('Erro ao carregar parques/obstáculos:', error);
        Alert.alert('Erro', 'Não foi possível carregar parques e obstáculos no momento.');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!presetChallenge) return;

    if (presetChallenge.trick) setTrick(presetChallenge.trick);
    if (presetChallenge.parkId) setSelectedPark(presetChallenge.parkId);
    if (presetChallenge.obstacleId) setSelectedObstacle(presetChallenge.obstacleId);
    if (presetChallenge.difficulty) {
      const difficultyId = DIFFICULTY_LABEL_TO_ID[presetChallenge.difficulty] ?? null;
      setSelectedDifficulty(difficultyId);
    }
    if (presetChallenge.challengeId) setSelectedChallengeId(presetChallenge.challengeId);

    setUploadStatus('Trick aplicada! Agora escolha um vídeo da galeria.');
    navigation.setParams?.({ presetChallenge: undefined });
  }, [presetChallenge, navigation]);

  useEffect(() => () => {
    if (trickBlurTimeoutRef.current) {
      clearTimeout(trickBlurTimeoutRef.current);
      trickBlurTimeoutRef.current = null;
    }
  }, []);

  const filteredObstacles = useMemo(() => {
    if (!selectedPark) return obstacles;
    const filtered = obstacles.filter((obstacle) => obstacle.park_id === selectedPark);
    return filtered.length > 0 ? filtered : obstacles;
  }, [obstacles, selectedPark]);

  const selectedParkData = useMemo(
    () => parks.find((park) => park.id === selectedPark),
    [parks, selectedPark]
  );

  const handleChangeTrick = useCallback((value) => {
    setTrick(value);
    if (selectedTrick) {
      const normalized = value.trim().toLowerCase();
      const selectedName = (selectedTrick.nome || '').trim().toLowerCase();
      const selectedShort = (selectedTrick.nome_curto || '').trim().toLowerCase();
      if (!normalized || (normalized !== selectedName && normalized !== selectedShort)) {
        setSelectedTrick(null);
      }
    }
  }, [selectedTrick]);

  const handleSelectTrickSuggestion = useCallback((suggestion) => {
    setSelectedTrick(suggestion);
    setTrick(suggestion.nome);
    setTrickSuggestions([]);
    setIsTrickInputFocused(false);
    if (trickBlurTimeoutRef.current) {
      clearTimeout(trickBlurTimeoutRef.current);
      trickBlurTimeoutRef.current = null;
    }
    Keyboard.dismiss();
  }, []);

  const canAccessStep = useCallback(
    (step) => {
      if (step === 1) return true;
      if (step === 2) return Boolean(trick.trim());
      if (step === 3) return Boolean(videoPreview);
      return false;
    },
    [trick, videoPreview]
  );

  const goToStep = useCallback(
    (step) => {
      if (step === currentStep) return;
      if (!canAccessStep(step)) return;
      setCurrentStep(step);
    },
    [currentStep, canAccessStep]
  );

  // Additional handlers, memoized calculations and the UI will be defined below.

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <YupBadge variant=\"primary\" style={styles.headerBadge}>
            Upload Session
          </YupBadge>
          <Text style={styles.headerTitle}>Fluxo de upload Y'UP</Text>
          <Text style={styles.headerSubtitle}>
            Preencha as etapas para conectar a manobra ao desafio, enviar o vídeo e registrar os detalhes técnicos.
          </Text>
        </View>

        <View style={styles.stepper}>
          {UPLOAD_STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            const reachable = canAccessStep(step.id);
            return (
              <React.Fragment key={step.id}>
                <TouchableOpacity
                  style={styles.stepItem}
                  activeOpacity={reachable ? 0.85 : 1}
                  onPress={() => {
                    if (reachable) goToStep(step.id);
                  }}
                  disabled={!reachable}
                >
                  <View
                    style={[
                      styles.stepBadge,
                      isActive && styles.stepBadgeActive,
                      isComplete && styles.stepBadgeComplete,
                      !reachable && styles.stepBadgeDisabled,
                    ]}
                  >
                    {isComplete ? (
                      <Icon name=\"check\" size={16} color={colors.background} />
                    ) : (
                      <Text style={styles.stepBadgeText}>{step.id}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      (isActive || isComplete) && styles.stepLabelActive,
                      !reachable && styles.stepLabelDisabled,
                    ]}
                  >
                    {step.label}
                  </Text>
                </TouchableOpacity>
                {index < UPLOAD_STEPS.length - 1 ? (
                  <View
                    style={[
                      styles.stepConnector,
                      currentStep > step.id && styles.stepConnectorActive,
                    ]}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>

        {/* Placeholder for step-specific content; actual rendering will be added below. */}
      </ScrollView>
    </SafeAreaView>
  );
}
