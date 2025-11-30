import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Hook para acessar o nível de sofisticação do usuário
 * e adaptar a interface de acordo
 *
 * @returns {Object} Configuração de sofisticação do usuário
 */
export const useUserSophistication = () => {
  const { user } = useAuth();
  const [sophistication, setSophistication] = useState({
    level: 'BEGINNER',
    score: 0,
    features: ['quick_upload', 'basic_xp_view', 'challenge_upload'],
    config: {
      uploadFlow: 'quick',
      xpDisplay: 'simple',
      showAdvancedFeatures: false,
      showXpBreakdown: false,
      showComboHistory: false,
      showGlobalProgress: false,
      enableVideoEditing: false,
      maxManeuverComplexity: 'basic'
    },
    nextLevel: null,
    isLoading: true,
    error: null
  });

  const fetchSophistication = useCallback(async () => {
    if (!user?.id) {
      setSophistication(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await api.get(`/users/${user.id}/sophistication`);
      setSophistication({
        level: response.data.level,
        features: response.data.features,
        config: response.data.config,
        nextLevel: response.data.nextLevel,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Erro ao buscar sophistication:', error);
      // Fallback para BEGINNER em caso de erro
      setSophistication(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  }, [user?.id]);

  const recalculate = useCallback(async () => {
    if (!user?.id) return;

    try {
      await api.post(`/users/${user.id}/sophistication/recalculate`);
      await fetchSophistication();
    } catch (error) {
      console.error('Erro ao recalcular sophistication:', error);
    }
  }, [user?.id, fetchSophistication]);

  useEffect(() => {
    fetchSophistication();
  }, [fetchSophistication]);

  // Helpers para verificar features específicas
  const hasFeature = useCallback((featureName) => {
    return sophistication.features.includes(featureName);
  }, [sophistication.features]);

  const canUseAdvancedUpload = useCallback(() => {
    return ['INTERMEDIATE', 'ADVANCED', 'PRO'].includes(sophistication.level);
  }, [sophistication.level]);

  const canEditVideo = useCallback(() => {
    return sophistication.config.enableVideoEditing;
  }, [sophistication.config.enableVideoEditing]);

  const shouldShowXpBreakdown = useCallback(() => {
    return sophistication.config.showXpBreakdown;
  }, [sophistication.config.showXpBreakdown]);

  const shouldShowComboHistory = useCallback(() => {
    return sophistication.config.showComboHistory;
  }, [sophistication.config.showComboHistory]);

  return {
    ...sophistication,
    refresh: fetchSophistication,
    recalculate,
    hasFeature,
    canUseAdvancedUpload,
    canEditVideo,
    shouldShowXpBreakdown,
    shouldShowComboHistory,
    // Atalhos para níveis específicos
    isBeginner: sophistication.level === 'BEGINNER',
    isIntermediate: sophistication.level === 'INTERMEDIATE',
    isAdvanced: sophistication.level === 'ADVANCED',
    isPro: sophistication.level === 'PRO'
  };
};

export default useUserSophistication;
