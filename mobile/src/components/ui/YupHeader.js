import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../../theme/tokens';

export default function YupHeader({
  title,
  subtitle,
  showBackButton = true,
  leftAction,
  rightAction,
  style,
  status = 'default',
}) {
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, status === 'raised' && styles.raised, style]}>
      <View style={styles.leftSlot}>
        {leftAction
          ? leftAction
          : showBackButton
          ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )
          : <View style={styles.placeholder} />
        }
      </View>

      <View style={styles.center}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightSlot}>
        {rightAction ? rightAction : <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  raised: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSlot: {
    width: 48,
    alignItems: 'flex-start',
  },
  rightSlot: {
    width: 48,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
