import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

export default function YupCard({ children, onPress, style, ...props }) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      {...(onPress ? { onPress } : {})}
      style={[
        styles.base,
        onPress ? styles.interactive : null,
        style,
      ]}
      {...props}
    >
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['2xl'],
    ...shadows.card,
  },
  interactive: {
    borderColor: colors.primarySoft,
  },
});
