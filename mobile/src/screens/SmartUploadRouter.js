import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import { useUserSophistication } from '../hooks/useUserSophistication';
import UploadModeSelectionScreen from './UploadModeSelectionScreen';

/**
 * SmartUploadRouter - Routes upload based on user sophistication level
 *
 * - BEGINNER: Shows UploadModeSelection inline
 * - INTERMEDIATE+: Shows UploadModeSelection inline
 *
 * NOTE: Renders inline to keep tab bar visible
 */
export default function SmartUploadRouter() {
  const sophistication = useUserSophistication();

  // Show loading while sophistication data loads
  if (sophistication.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Render UploadModeSelection inline to preserve tab bar
  return <UploadModeSelectionScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
