import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

const VARIANTS = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    text: {
      color: colors.textPrimary,
    },
    loaderColor: colors.textPrimary,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderColor: colors.primaryOutline,
    },
    text: {
      color: colors.primary,
    },
    loaderColor: colors.primary,
  },
  secondary: {
    container: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
    },
    text: {
      color: colors.textPrimary,
    },
    loaderColor: colors.textPrimary,
  },
};

const pressedStyle = {
  primary: {
    backgroundColor: colors.primaryHover,
  },
  ghost: {
    backgroundColor: colors.primarySoft,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
  },
};

export default function YupButton({
  title,
  variant = 'primary',
  fullWidth = true,
  isLoading = false,
  icon,
  style,
  textStyle,
  children,
  disabled,
  ...props
}) {
  const variantConfig = VARIANTS[variant] ?? VARIANTS.primary;
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantConfig.container,
        fullWidth && styles.fullWidth,
        pressed && pressedStyle[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variantConfig.loaderColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.text, variantConfig.text, textStyle]}>
            {children || title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radii['2xl'],
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.6,
  },
});
