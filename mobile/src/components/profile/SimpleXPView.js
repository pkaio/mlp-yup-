import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { YupCard, YupProgress, YupBadge } from '../ui';
import { colors } from '../../theme/tokens';

/**
 * Visualização simplificada de XP para usuários BEGINNER
 * Mostra apenas: Nível, progresso para próximo nível, e XP necessário
 */
export const SimpleXPView = ({
  level,
  xpCurrent,
  xpNext,
  xpRemaining,
  xpProgress,
  xpMaxLevel,
  formatNumber
}) => {
  return (
    <YupCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Experiência</Text>
        <YupBadge variant="primary" style={styles.levelBadge}>
          Nível {level}
        </YupBadge>
      </View>

      <Text style={styles.subtitle}>
        {xpRemaining > 0
          ? `Faltam ${formatNumber(xpRemaining)} XP para o nível ${Math.min(level + 1, xpMaxLevel)}`
          : 'Você alcançou o nível máximo! 🎉'}
      </Text>

      <YupProgress
        value={xpProgress}
        gradientColors={['#0ea5e9', '#fb923c']}
        style={styles.progressBar}
      />

      <View style={styles.xpValues}>
        <Text style={styles.xpCurrent}>{formatNumber(xpCurrent)}</Text>
        <Text style={styles.xpSeparator}>/</Text>
        <Text style={styles.xpTarget}>{formatNumber(xpNext)} XP</Text>
      </View>

      <Text style={styles.motivation}>
        Continue postando vídeos para ganhar mais XP e subir de nível!
      </Text>
    </YupCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  progressBar: {
    marginBottom: 12,
  },
  xpValues: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  xpCurrent: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  xpSeparator: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  xpTarget: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  motivation: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SimpleXPView;
