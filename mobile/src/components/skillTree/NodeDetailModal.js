import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, typography, radii, shadows } from '../../theme/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NodeDetailModal({ visible, node, onClose, onStartChallenge }) {
  if (!node) return null;

  const status = node.userProgress?.status || 'locked';
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const timesCompleted = node.userProgress?.timesCompleted || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={[colors.primary, colors.primaryHover]}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>{node.title}</Text>
                <Text style={styles.headerSubtitle}>
                  Tier {node.tier} • {node.branchType?.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              isCompleted && styles.statusCompleted,
              isLocked && styles.statusLocked,
            ]}>
              <MaterialIcons
                name={isCompleted ? 'check-circle' : isLocked ? 'lock' : 'radio-button-unchecked'}
                size={16}
                color={isCompleted ? colors.success : isLocked ? colors.textSecondary : colors.textPrimary}
              />
              <Text style={[
                styles.statusText,
                isCompleted && styles.statusTextCompleted,
                isLocked && styles.statusTextLocked,
              ]}>
                {isCompleted ? 'Completed' : isLocked ? 'Locked' : 'Available'}
              </Text>
              {isCompleted && timesCompleted > 1 && (
                <Text style={styles.statusCount}>×{timesCompleted}</Text>
              )}
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About This Trick</Text>
              <Text style={styles.description}>{node.description}</Text>
            </View>

            {/* XP Reward */}
            {node.rewards?.xpBonus && (
              <View style={styles.rewardBox}>
                <MaterialIcons name="star" size={20} color={colors.warning} />
                <Text style={styles.rewardText}>
                  Earn <Text style={styles.rewardValue}>+{node.rewards.xpBonus} XP</Text> on first completion
                </Text>
              </View>
            )}

            {/* Tips */}
            {node.educational?.tips && node.educational.tips.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="lightbulb-outline" size={20} color={colors.accent} />
                  <Text style={styles.sectionTitle}>Tips</Text>
                </View>
                {node.educational.tips.map((tip, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.listText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Common Mistakes */}
            {node.educational?.commonMistakes && node.educational.commonMistakes.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="warning-amber" size={20} color={colors.danger} />
                  <Text style={styles.sectionTitle}>Common Mistakes</Text>
                </View>
                {node.educational.commonMistakes.map((mistake, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.bulletPointWarning}>✗</Text>
                    <Text style={styles.listText}>{mistake}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Prerequisites */}
            {node.requirements?.prerequisites && node.requirements.prerequisites.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="check-circle-outline" size={20} color={colors.success} />
                  <Text style={styles.sectionTitle}>Prerequisites</Text>
                </View>
                <Text style={styles.prerequisiteHint}>
                  Complete these tricks first to unlock this node:
                </Text>
                {node.requirements.prerequisites.map((prereqId, index) => (
                  <View key={index} style={styles.prerequisiteItem}>
                    <MaterialIcons name="arrow-forward" size={16} color={colors.textSecondary} />
                    <Text style={styles.prerequisiteText}>Required Node</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Badge Reward */}
            {node.rewards?.badge && (
              <View style={styles.badgeBox}>
                <MaterialIcons name="military-tech" size={24} color={colors.warning} />
                <View>
                  <Text style={styles.badgeLabel}>Badge Reward</Text>
                  <Text style={styles.badgeName}>{node.rewards.badge}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {!isLocked && (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => onStartChallenge && onStartChallenge(node)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="play-arrow" size={24} color={colors.textPrimary} />
                <Text style={styles.buttonTextPrimary}>
                  {isCompleted ? 'Retry Challenge' : 'Start Challenge'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonTextSecondary}>
                {isLocked ? 'Close' : 'Maybe Later'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: SCREEN_HEIGHT * 0.9,
    ...shadows.card,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(245, 245, 245, 0.8)',
  },
  closeButton: {
    padding: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusLocked: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
  },
  statusText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  statusTextCompleted: {
    color: colors.success,
  },
  statusTextLocked: {
    color: colors.textSecondary,
  },
  statusCount: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    padding: spacing.md,
    borderRadius: radii.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  rewardText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  rewardValue: {
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    fontSize: typography.sizes.lg,
    color: colors.accent,
    marginRight: spacing.sm,
    marginTop: -2,
  },
  bulletPointWarning: {
    fontSize: typography.sizes.md,
    color: colors.danger,
    marginRight: spacing.sm,
  },
  listText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
  prerequisiteHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  prerequisiteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  prerequisiteText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radii.md,
    marginVertical: spacing.md,
  },
  badgeLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonTextPrimary: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  buttonTextSecondary: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
});
