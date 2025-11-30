import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../../theme/tokens';

const STANCES = [
  { value: 'TS', label: 'Toeside', icon: '🦶', description: 'Entrada pela borda dos dedos' },
  { value: 'HS', label: 'Heelside', icon: '👠', description: 'Entrada pela borda do calcanhar' }
];

export default function StanceSelector({ selectedStance, onSelectStance }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Escolha sua cavada preferida</Text>
        <Text style={styles.subtitle}>
          Selecione a entrada que você se sente mais confortável para executar
        </Text>
      </View>

      <View style={styles.options}>
        {STANCES.map((stance) => {
          const isSelected = selectedStance === stance.value;
          return (
            <TouchableOpacity
              key={stance.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected
              ]}
              onPress={() => onSelectStance(stance.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <Text style={styles.icon}>{stance.icon}</Text>
                <View style={styles.optionText}>
                  <View style={styles.labelRow}>
                    <Text style={[
                      styles.label,
                      isSelected && styles.labelSelected
                    ]}>
                      {stance.label}
                    </Text>
                    <View style={[
                      styles.badge,
                      isSelected && styles.badgeSelected
                    ]}>
                      <Text style={[
                        styles.badgeText,
                        isSelected && styles.badgeTextSelected
                      ]}>
                        {stance.value}
                      </Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.description,
                    isSelected && styles.descriptionSelected
                  ]}>
                    {stance.description}
                  </Text>
                </View>
              </View>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkIcon}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          💡 Dica: Você pode mudar a cavada a qualquer momento nas configurações
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  options: {
    gap: spacing.md,
  },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    position: 'relative',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    fontSize: 36,
  },
  optionText: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.primary,
  },
  badge: {
    backgroundColor: colors.borderMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.sm,
  },
  badgeSelected: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  badgeTextSelected: {
    color: colors.textPrimary,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  descriptionSelected: {
    color: 'rgba(245, 245, 245, 0.8)',
  },
  checkmark: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkIcon: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  hint: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
  },
  hintText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: typography.sizes.xs * typography.lineHeights.relaxed,
  },
});
