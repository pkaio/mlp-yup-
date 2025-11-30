import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../../theme/tokens';

const SPECIALIZATIONS = [
  { type: 'surface', name: 'Surface', icon: '🌊' },
  { type: 'kicker', name: 'Kicker', icon: '🚀' },
  { type: 'slider', name: 'Slider', icon: '🛹' }
];

export default function SpecializationSelector({ selectedSpecialization, onSelectSpecialization }) {
  return (
    <View style={styles.container}>
      {SPECIALIZATIONS.map((spec) => {
        const isSelected = selectedSpecialization === spec.type;
        return (
          <TouchableOpacity
            key={spec.type}
            style={[
              styles.tab,
              isSelected && styles.tabSelected
            ]}
            onPress={() => onSelectSpecialization(spec.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{spec.icon}</Text>
            <Text style={[
              styles.tabText,
              isSelected && styles.tabTextSelected
            ]}>
              {spec.name}
            </Text>
            {isSelected && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    position: 'relative',
  },
  tabSelected: {
    backgroundColor: colors.primarySoft,
  },
  tabIcon: {
    fontSize: typography.sizes.lg,
    marginRight: spacing.xs,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  tabTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
});
