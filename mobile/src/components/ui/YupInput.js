import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

const YupInput = forwardRef(
  (
    {
      label,
      error,
      helperText,
      containerStyle,
      style,
      inputStyle,
      ...props
    },
    ref
  ) => {
    const showHelper = Boolean(helperText) && !error;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.inputPlaceholder}
          style={[styles.input, error && styles.inputError, style, inputStyle]}
          {...props}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {showHelper ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>
    );
  }
);

YupInput.displayName = 'YupInput';

export default YupInput;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.xs,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    letterSpacing: 0.2,
  },
  input: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.input,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
});
