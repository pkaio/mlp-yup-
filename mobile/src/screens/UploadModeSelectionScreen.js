import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, radii, spacing, typography } from '../theme/tokens';
import YupBadge from '../components/ui/YupBadge';
import YupCard from '../components/ui/YupCard';

/**
 * UploadModeSelectionScreen - Upload mode choice for INTERMEDIATE+ users
 *
 * Allows users to choose between:
 * - Quick Upload: Simplified flow with challenge presets
 * - Manual Upload: Full control with advanced editing
 */
export default function UploadModeSelectionScreen() {
  const navigation = useNavigation();

  const handleQuickUpload = () => {
    navigation.navigate('Achievements');
  };

  const handleManualUpload = () => {
    navigation.navigate('UploadManual');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <YupBadge variant="primary" style={styles.headerBadge}>
            Escolha o modo
          </YupBadge>
          <Text style={styles.headerTitle}>Como você quer fazer upload?</Text>
          <Text style={styles.headerSubtitle}>
            Escolha o modo de upload que melhor se adapta ao seu estilo.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {/* Quick Upload Option */}
          <TouchableOpacity
            style={styles.optionCard}
            activeOpacity={0.85}
            onPress={handleQuickUpload}
          >
            <YupCard style={styles.optionCardInner}>
              <View style={styles.optionHeader}>
                <View style={styles.optionIconContainer}>
                  <MaterialIcons name="flash-on" size={32} color={colors.primary} />
                </View>
                <YupBadge variant="primary" style={styles.optionBadge}>
                  Recomendado
                </YupBadge>
              </View>

              <Text style={styles.optionTitle}>Upload Rápido</Text>
              <Text style={styles.optionDescription}>
                Escolha um desafio e faça upload rapidamente. Tudo pré-configurado para você.
              </Text>

              <View style={styles.optionFeatures}>
                <View style={styles.optionFeature}>
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                  <Text style={styles.optionFeatureText}>Desafios pré-configurados</Text>
                </View>
                <View style={styles.optionFeature}>
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                  <Text style={styles.optionFeatureText}>Upload em 2 passos</Text>
                </View>
                <View style={styles.optionFeature}>
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                  <Text style={styles.optionFeatureText}>Ideal para sessions rápidas</Text>
                </View>
              </View>

              <View style={styles.optionAction}>
                <Text style={styles.optionActionText}>Ir para Achievements</Text>
                <MaterialIcons name="arrow-forward" size={20} color={colors.primary} />
              </View>
            </YupCard>
          </TouchableOpacity>

          {/* Manual Upload Option */}
          <TouchableOpacity
            style={styles.optionCard}
            activeOpacity={0.85}
            onPress={handleManualUpload}
          >
            <YupCard style={styles.optionCardInner}>
              <View style={styles.optionHeader}>
                <View style={styles.optionIconContainer}>
                  <MaterialIcons name="tune" size={32} color={colors.accent} />
                </View>
                <YupBadge variant="neutral" style={styles.optionBadge}>
                  Avançado
                </YupBadge>
              </View>

              <Text style={styles.optionTitle}>Upload Manual</Text>
              <Text style={styles.optionDescription}>
                Controle total sobre manobras, edição e metadados do vídeo.
              </Text>

              <View style={styles.optionFeatures}>
                <View style={styles.optionFeature}>
                  <MaterialIcons name="check-circle" size={18} color={colors.accent} />
                  <Text style={styles.optionFeatureText}>Editor de manobras completo</Text>
                </View>
                <View style={styles.optionFeature}>
                  <MaterialIcons name="check-circle" size={18} color={colors.accent} />
                  <Text style={styles.optionFeatureText}>Corte e slow-motion</Text>
                </View>
                <View style={styles.optionFeature}>
                  <MaterialIcons name="check-circle" size={18} color={colors.accent} />
                  <Text style={styles.optionFeatureText}>Configuração avançada de XP</Text>
                </View>
              </View>

              <View style={styles.optionAction}>
                <Text style={styles.optionActionText}>Ir para Upload Manual</Text>
                <MaterialIcons name="arrow-forward" size={20} color={colors.accent} />
              </View>
            </YupCard>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Você pode alternar entre os modos a qualquer momento. O Upload Rápido é perfeito para
            completar desafios, enquanto o Upload Manual oferece controle total.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing['3xl'],
    paddingTop: spacing['2xl'],
    gap: spacing['2xl'],
  },
  header: {
    gap: spacing.sm,
  },
  headerBadge: {
    alignSelf: 'flex-start',
  },
  headerTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  optionsContainer: {
    gap: spacing.lg,
  },
  optionCard: {
    width: '100%',
  },
  optionCardInner: {
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  optionTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  optionDescription: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  optionFeatures: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  optionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionFeatureText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  optionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  optionActionText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
});
