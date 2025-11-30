import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme/tokens';
import { skillTreeService } from '../services/skillTreeService';
import SpecializationSelector from '../components/skillTree/SpecializationSelector';
import StanceSelector from '../components/skillTree/StanceSelector';
import SkillTreeGrid from '../components/skillTree/SkillTreeGrid';
import EmptyGridView from '../components/skillTree/EmptyGridView';
import NodeDetailModal from '../components/skillTree/NodeDetailModal';
import {
  deriveManeuverType,
  ensureManeuverPayload
} from '../utils/maneuver';

export default function SkillTreeScreen({ navigation, route }) {
  const initialSpecialization = route?.params?.specialization || 'surface';

  const [selectedSpecialization, setSelectedSpecialization] = useState(initialSpecialization);
  const [selectedStance, setSelectedStance] = useState('TS'); // Default to Toeside
  const [skillTree, setSkillTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Load skill tree data
  const loadSkillTree = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      const data = await skillTreeService.getSkillTreeGrid(selectedSpecialization);
      setSkillTree(data);
    } catch (err) {
      console.error('Error loading skill tree:', err);
      setError('Não foi possível carregar a skill tree. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSpecialization]);

  // Load data on mount and when specialization changes
  useEffect(() => {
    loadSkillTree();
  }, [loadSkillTree]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSkillTree(false);
    }, [loadSkillTree])
  );

  // Handle specialization change
  const handleSpecializationChange = (specialization) => {
    setSelectedSpecialization(specialization);
    setSkillTree(null);
  };

  // Apply stance tag to node titles for Kicker specialization
  const applyStanceToTree = useCallback((tree) => {
    if (!tree || selectedSpecialization !== 'kicker') {
      return tree;
    }

    // Clone tree and apply stance prefix to all node titles
    const updatedTree = { ...tree };
    updatedTree.rows = tree.rows?.map(row => ({
      ...row,
      spin: row.spin ? { ...row.spin, title: `${selectedStance} ${row.spin.title}` } : null,
      merge: row.merge ? { ...row.merge, title: `${row.merge.title.replace(/^(TS|HS) /, selectedStance + ' ')}` } : null,
      // Grabs don't get stance prefix
      grab: row.grab
    }));

    return updatedTree;
  }, [selectedSpecialization, selectedStance]);

  // Handle node info (details modal)
  const handleNodeInfo = (node) => {
    setSelectedNode(node);
    setModalVisible(true);
  };

  // Primary action when tapping a node card
  const handleNodePrimaryAction = (node) => {
    const status = node?.userProgress?.status || 'locked';
    if (status === 'locked') {
      handleNodeInfo(node);
      return;
    }
    handleStartChallenge(node);
  };

  // Handle start challenge
  const handleStartChallenge = (node) => {
    setModalVisible(false);

    const payload = node?.maneuverPayload
      ? ensureManeuverPayload(node.maneuverPayload)
      : null;

    if (!payload) {
      Alert.alert(
        'Manobra não vinculada',
        'Este nó ainda não possui uma manobra do sistema de XP. Edite-o no dashboard antes de registrar vídeos.'
      );
      return;
    }

    const maneuverType = node?.maneuverType || deriveManeuverType({ specialization: node?.specialization });

    navigation.navigate('QuickUpload', {
      presetChallenge: {
        maneuverName: node?.trick?.name || node.title,
        maneuverType,
        maneuverPayload: payload,
        questNodeId: node.id,
        trickId: node.trick?.id,
        difficulty: node.trick?.difficulty || null,
      },
      onUploadSuccess: () => loadSkillTree(false),
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadSkillTree(false);
  };

  const isEmpty = skillTree?.isEmpty || (skillTree?.rows && skillTree.rows.length === 0);
  const displayTree = applyStanceToTree(skillTree);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Skill Tree</Text>
        <Text style={styles.subtitle}>
          Aprenda nomenclaturas e evolua suas habilidades
        </Text>
      </View>

      {/* Specialization Selector */}
      <SpecializationSelector
        selectedSpecialization={selectedSpecialization}
        onSelectSpecialization={handleSpecializationChange}
      />

      {/* Stance Selector (only for Kicker) */}
      {selectedSpecialization === 'kicker' && !isEmpty && (
        <StanceSelector
          selectedStance={selectedStance}
          onSelectStance={setSelectedStance}
        />
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando skill tree...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : isEmpty ? (
        <EmptyGridView specialization={selectedSpecialization} />
      ) : (
        <SkillTreeGrid
          skillTree={displayTree}
          onNodePress={handleNodePrimaryAction}
          onNodeInfoPress={handleNodeInfo}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Node Detail Modal */}
      <NodeDetailModal
        visible={modalVisible}
        node={selectedNode}
        onClose={() => setModalVisible(false)}
        onStartChallenge={handleStartChallenge}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.danger,
    textAlign: 'center',
  },
});
