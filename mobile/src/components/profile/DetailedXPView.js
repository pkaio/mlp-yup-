import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { YupCard, YupProgress } from '../ui';
import { colors } from '../../theme/tokens';

/**
 * Visualização detalhada de XP para usuários INTERMEDIATE+
 * Inclui métricas avançadas, mas com opção de colapsar
 */
export const DetailedXPView = ({
  level,
  xpCurrent,
  xpNext,
  xpRemaining,
  xpTotal,
  xpCap,
  xpProgress,
  xpMaxLevel,
  xpTotalPercent,
  xpLog,
  formatNumber,
  showComboHistory = true
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <YupCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Experiência</Text>
          <Text style={styles.subtitle}>
            {xpRemaining > 0
              ? `Faltam ${formatNumber(xpRemaining)} XP para o nível ${Math.min(level + 1, xpMaxLevel)}`
              : 'Você alcançou o nível máximo!'}
          </Text>
        </View>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>
            {formatNumber(xpCurrent)} / {formatNumber(xpNext)} XP
          </Text>
          <TouchableOpacity
            onPress={() => setShowAdvanced(!showAdvanced)}
            style={styles.expandButton}
            activeOpacity={0.7}
          >
            <Text style={styles.expandText}>
              {showAdvanced ? 'Menos detalhes' : 'Mais detalhes'}
            </Text>
            <Icon
              name={showAdvanced ? 'expand-less' : 'expand-more'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <YupProgress
        value={xpProgress}
        gradientColors={['#0ea5e9', '#fb923c']}
        style={styles.progressBar}
      />

      {showAdvanced && (
        <View style={styles.advancedSection}>
          <Text style={styles.advancedTitle}>Métricas Avançadas</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>XP Total</Text>
              <Text style={styles.metaValue}>
                {formatNumber(xpTotal)} / {formatNumber(xpCap)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Progresso Global</Text>
              <Text style={styles.metaValue}>
                {Math.round(xpTotalPercent * 100)}%
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Nível</Text>
              <Text style={styles.metaValue}>
                {level}/{xpMaxLevel}
              </Text>
            </View>
          </View>

          {showComboHistory && xpLog?.[0]?.exp_awarded && (
            <View style={styles.recentCombo}>
              <Text style={styles.recentComboLabel}>Último ganho:</Text>
              <Text style={styles.recentComboValue}>
                +{formatNumber(xpLog[0].exp_awarded)} XP
              </Text>
            </View>
          )}
        </View>
      )}
    </YupCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  progressBar: {
    marginBottom: 16,
  },
  advancedSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  advancedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recentCombo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
  },
  recentComboLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  recentComboValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
});

export default DetailedXPView;
