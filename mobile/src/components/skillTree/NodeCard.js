import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, typography, radii, shadows } from '../../theme/tokens';

const STATUS_CONFIG = {
  completed: {
    bgColor: colors.success,
    bgColorSoft: 'rgba(34, 197, 94, 0.15)',
    borderColor: colors.success,
    icon: 'check-circle',
    iconColor: colors.success,
    textColor: colors.textPrimary,
  },
  available: {
    bgColor: colors.primary,
    bgColorSoft: colors.primarySoft,
    borderColor: colors.primary,
    icon: 'radio-button-unchecked',
    iconColor: colors.primary,
    textColor: colors.textPrimary,
  },
  locked: {
    bgColor: colors.border,
    bgColorSoft: colors.surfaceMuted,
    borderColor: colors.borderMuted,
    icon: 'lock',
    iconColor: colors.textSecondary,
    textColor: colors.textSecondary,
  },
};

const BRANCH_LABELS = {
  spin: 'SPIN',
  merge: 'MERGE',
  ollie: 'OLLIE',
};

export default function NodeCard({ node, onPress, onInfoPress, isShared }) {
  if (!node) {
    return <View style={styles.emptyCard} />;
  }

  const status = node.userProgress?.status || 'locked';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.locked;
  const timesCompleted = node.userProgress?.timesCompleted || 0;
  const isRepeatable = node.repeatable;

  const handlePress = () => {
    if (status === 'locked') {
      onInfoPress && onInfoPress(node);
      return;
    }
    onPress && onPress(node);
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: config.borderColor },
        status === 'locked' && styles.cardLocked,
      ]}
      onPress={handlePress}
      activeOpacity={status === 'locked' ? 1 : 0.7}
    >
      <LinearGradient
        colors={[config.bgColorSoft, colors.surface]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Header with status icon */}
        <View style={styles.header}>
          <MaterialIcons name={config.icon} size={20} color={config.iconColor} />
          <View style={styles.headerActions}>
            {isShared && (
              <View style={styles.sharedBadge}>
                <MaterialIcons name="link" size={12} color={colors.accent} />
              </View>
            )}
            {onInfoPress && (
              <TouchableOpacity onPress={() => onInfoPress(node)} hitSlop={8}>
                <MaterialIcons name="info-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Branch type label */}
        <View style={[styles.branchBadge, { backgroundColor: config.bgColorSoft }]}>
          <Text style={[styles.branchText, { color: config.iconColor }]}>
            {BRANCH_LABELS[node.branchType] || node.branchType?.toUpperCase()}
          </Text>
        </View>

        {/* Trick title */}
        <Text
          style={[styles.title, { color: config.textColor }]}
          numberOfLines={2}
        >
          {node.title}
        </Text>

        {/* Tier badge */}
        <View style={styles.footer}>
          <Text style={[styles.tierText, { color: config.textColor }]}>
            Tier {node.tier}
          </Text>

          {/* Completion count for repeatable nodes */}
          {isRepeatable && timesCompleted > 0 && (
            <View style={styles.completionBadge}>
              <MaterialIcons name="replay" size={12} color={colors.textSecondary} />
              <Text style={styles.completionText}>×{timesCompleted}</Text>
            </View>
          )}
        </View>

        {/* XP Bonus indicator */}
        {node.rewards?.xpBonus && status === 'available' && (
          <View style={styles.xpBadge}>
            <MaterialIcons name="star" size={12} color={colors.warning} />
            <Text style={styles.xpText}>+{node.rewards.xpBonus} XP</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 140,
    borderRadius: radii.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...shadows.soft,
  },
  cardLocked: {
    opacity: 0.6,
  },
  emptyCard: {
    flex: 1,
    minHeight: 140,
  },
  gradient: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sharedBadge: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 191, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs / 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  branchBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  branchText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.sm * typography.lineHeights.snug,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  completionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  xpBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.sm,
  },
  xpText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
});
