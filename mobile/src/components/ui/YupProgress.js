import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../../theme/tokens';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export default function YupProgress({
  value = 0,
  trackStyle,
  gradientColors = ['#00A3FF', '#FF6B00'],
}) {
  const progress = useRef(new Animated.Value(Math.min(Math.max(value, 0), 100))).current;

  useEffect(() => {
    const clamped = Math.min(Math.max(value, 0), 100);
    Animated.timing(progress, {
      toValue: clamped,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const widthStyle = useMemo(
    () => ({
      width: progress.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
      }),
    }),
    [progress]
  );

  return (
    <View style={[styles.track, trackStyle]}>
      <AnimatedGradient
        colors={gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fill, widthStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: spacing.lg,
  },
});
