import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../../theme/tokens';
import NodeCard from './NodeCard';

export default function SkillTreeGrid({ skillTree, onNodePress, onNodeInfoPress }) {
  if (!skillTree || !skillTree.rows || skillTree.rows.length === 0) {
    return null;
  }

  const { rows, sharedNodes } = skillTree;

  // Function to check if a node is shared
  const isSharedNode = (nodeId) => {
    return sharedNodes?.some(shared => shared.id === nodeId);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header explaining the grid */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Skill Tree Progression</Text>
        <Text style={styles.headerSubtitle}>
          {skillTree.specialization === 'kicker'
            ? 'Master tricks from left to right. MERGE tricks combine SPIN + GRAB techniques.'
            : 'Master tricks from left to right. MERGE tricks combine SPIN + OLLIE techniques.'
          }
        </Text>
      </View>

      {/* Grid Rows */}
      {rows.map((row, index) => (
        <View key={row.rowNumber || index} style={styles.row}>
          {/* Row header */}
          <View style={styles.rowHeader}>
            <Text style={styles.rowNumber}>Row {row.rowNumber}</Text>
            <Text style={styles.rowTier}>Tier {row.tier}</Text>
          </View>

          {/* 3-column grid: SPIN | MERGE | OLLIE/GRAB */}
          <View style={styles.gridRow}>
            {/* SPIN column */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>SPIN</Text>
              <NodeCard
                node={row.spin}
                onPress={onNodePress}
                onInfoPress={onNodeInfoPress}
                isShared={row.spin && isSharedNode(row.spin.id)}
              />
            </View>

            {/* MERGE column */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>MERGE</Text>
              <NodeCard
                node={row.merge}
                onPress={onNodePress}
                onInfoPress={onNodeInfoPress}
                isShared={row.merge && isSharedNode(row.merge.id)}
              />
            </View>

            {/* OLLIE/GRAB column (dynamic based on specialization) */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>
                {skillTree.specialization === 'kicker' ? 'GRAB' : 'OLLIE'}
              </Text>
              <NodeCard
                node={skillTree.specialization === 'kicker' ? row.grab : row.ollie}
                onPress={onNodePress}
                onInfoPress={onNodeInfoPress}
                isShared={
                  (skillTree.specialization === 'kicker' ? row.grab : row.ollie) &&
                  isSharedNode((skillTree.specialization === 'kicker' ? row.grab : row.ollie).id)
                }
              />
            </View>
          </View>

          {/* Connection indicators for merge nodes */}
          {row.merge && (
            <View style={styles.connectionIndicator}>
              <View style={styles.connectionLine} />
              <Text style={styles.connectionText}>
                Combines {row.spin ? '←' : ''} SPIN + {skillTree.specialization === 'kicker' ? 'GRAB' : 'OLLIE'} {(row.grab || row.ollie) ? '→' : ''}
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Footer with progress stats */}
      <View style={styles.footer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{skillTree.completedNodes}/{skillTree.totalNodes}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {skillTree.totalNodes > 0
              ? Math.round((skillTree.completedNodes / skillTree.totalNodes) * 100)
              : 0}%
          </Text>
          <Text style={styles.statLabel}>Progress</Text>
        </View>
        {sharedNodes && sharedNodes.length > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sharedNodes.length}</Text>
            <Text style={styles.statLabel}>Shared Nodes</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
  row: {
    marginBottom: spacing['2xl'],
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  rowNumber: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  rowTier: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  connectionIndicator: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  connectionLine: {
    width: '60%',
    height: 1,
    backgroundColor: colors.borderMuted,
    marginBottom: spacing.xs,
  },
  connectionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    marginTop: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
