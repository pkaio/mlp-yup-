export const colors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceMuted: '#141414',
  surfaceRaised: '#1F1F22',
  border: '#27272A',
  borderMuted: 'rgba(39, 39, 42, 0.65)',
  input: '#1A1A1A',
  inputBorder: '#374151',
  inputPlaceholder: '#9CA3AF',
  textPrimary: '#F5F5F5',
  textSecondary: '#9CA3AF',
  textMuted: '#CBD5F5',
  primary: '#FF6B00',
  primaryHover: '#FF8533',
  primarySoft: 'rgba(255, 107, 0, 0.12)',
  primaryOutline: '#FF6B00',
  accent: '#00BFFF',
  accentSoft: 'rgba(0, 191, 255, 0.12)',
  success: '#22C55E',
  warning: '#FACC15',
  danger: '#EF4444',
  overlay: 'rgba(13, 13, 13, 0.75)',
  divider: 'rgba(148, 163, 184, 0.15)',
  cardShadow: 'rgba(0, 0, 0, 0.25)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  gutter: 18,
  screenPadding: 20,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  full: 9999,
};

export const typography = {
  fontFamily: {
    primary: 'Inter',
    display: 'Inter',
    mono: 'Menlo',
    fallback: 'System',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 26,
    '3xl': 32,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeights: {
    tight: 1.1,
    snug: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const shadows = {
  card: {
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 18,
  },
  soft: {
    shadowColor: 'rgba(0, 0, 0, 0.18)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
};

export const gradients = {
  hero: ['rgba(13,13,13,0.92)', 'rgba(13,13,13,0.55)', 'rgba(13,13,13,1)'],
  badge: ['rgba(255,107,0,0.85)', 'rgba(255,133,51,0.65)'],
  cardOverlay: ['rgba(13,13,13,0.1)', 'rgba(13,13,13,0.95)'],
};

const theme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  gradients,
};

export default theme;
