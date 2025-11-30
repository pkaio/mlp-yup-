import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, typography, radii } from '../../theme/tokens';

const SPECIALIZATION_INFO = {
  surface: {
    icon: '🌊',
    name: 'Surface',
    description: 'Master surface tricks and rotations on the water'
  },
  kicker: {
    icon: '🚀',
    name: 'Kicker',
    description: 'Launch into the air with kicker obstacles'
  },
  slider: {
    icon: '🛹',
    name: 'Slider',
    description: 'Slide and grind on rails and features'
  }
};

export default function EmptyGridView({ specialization }) {
  const info = SPECIALIZATION_INFO[specialization] || {
    icon: '🎯',
    name: 'Skill Tree',
    description: 'Progressive skill development system'
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{info.icon}</Text>
        <MaterialIcons name="construction" size={48} color={colors.textSecondary} />
      </View>

      <Text style={styles.title}>{info.name} Skill Tree</Text>
      <Text style={styles.subtitle}>Em Desenvolvimento</Text>

      <Text style={styles.description}>
        {info.description}
      </Text>

      <View style={styles.comingSoonBox}>
        <MaterialIcons name="schedule" size={20} color={colors.accent} />
        <Text style={styles.comingSoonText}>Coming Soon</Text>
      </View>

      <Text style={styles.hint}>
        Este sistema de progressão estará disponível em breve. Continue treinando e aprimorando suas habilidades!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['3xl'],
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing['2xl'],
  },
  icon: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    marginBottom: spacing['2xl'],
  },
  comingSoonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xl,
  },
  comingSoonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
    fontStyle: 'italic',
  },
});
