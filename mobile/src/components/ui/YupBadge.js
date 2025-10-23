import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

const BADGE_VARIANTS = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    textColor: colors.textPrimary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryOutline,
    textColor: colors.primary,
  },
  neutral: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    textColor: colors.textSecondary,
  },
};

export default function YupBadge({
  children,
  variant = 'neutral',
  style,
  textStyle,
}) {
  const preset = BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.neutral;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: preset.backgroundColor,
          borderColor: preset.borderColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: preset.textColor,
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.6,
  },
});
