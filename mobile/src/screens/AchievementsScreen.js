import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import YupHeader from '../components/ui/YupHeader';
import YupCard from '../components/ui/YupCard';
import YupBadge from '../components/ui/YupBadge';
import YupSectionHeader from '../components/ui/YupSectionHeader';
import YupButton from '../components/ui/YupButton';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { badgeService } from '../services/badgeService';
import { challengeService } from '../services/challengeService';
import { useAuth } from '../context/AuthContext';
import {
  deriveManeuverType,
  ensureManeuverPayload,
  parseManeuverPayload
} from '../utils/maneuver';
const Icon = MaterialIcons;

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todas', icon: 'apps' },
  { id: 'park', label: 'Parques', icon: 'place' },
  { id: 'obstacle', label: 'Obstáculos', icon: 'terrain' },
  { id: 'video_count', label: 'Vídeos', icon: 'videocam' },
  { id: 'special_trick', label: 'Tricks', icon: 'bolt' },
];

const rarityPreset = {
  legendary: { label: 'Lendária', colors: ['#FF6B00', '#FF8533'] },
  epic: { label: 'Épica', colors: ['#818CF8', '#6366F1'] },
  rare: { label: 'Rara', colors: ['#22D3EE', '#0EA5E9'] },
  common: { label: 'Comum', colors: ['#CBD5F5', '#94A3B8'] },
};

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DIFFICULTY_ORDER = ['Iniciante', 'Intermediário', 'Avançado', 'Pro'];
const DIFFICULTY_FALLBACK = 'Sem dificuldade';

const difficultyThemes = {
  Iniciante: {
    text: colors.success,
    tint: 'rgba(34, 197, 94, 0.16)',
    border: 'rgba(34, 197, 94, 0.45)',
  },
  'Intermediário': {
    text: colors.accent,
    tint: 'rgba(0, 191, 255, 0.16)',
    border: 'rgba(0, 191, 255, 0.45)',
  },
  'Avançado': {
    text: colors.warning,
    tint: 'rgba(250, 204, 21, 0.18)',
    border: 'rgba(250, 204, 21, 0.45)',
  },
  Pro: {
    text: colors.primary,
    tint: colors.primarySoft,
    border: 'rgba(255, 107, 0, 0.45)',
  },
  default: {
    text: colors.textSecondary,
    tint: colors.surfaceMuted,
    border: colors.border,
  },
};

const getDifficultyTheme = (label) =>
  difficultyThemes[label] ?? difficultyThemes.default;

const formatMonthLabel = (month) => {
  if (!month || month < 1 || month > 12) {
    return 'Mês não definido';
  }
  return MONTH_NAMES_PT[month - 1];
};

export default function AchievementsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [monthlyPasses, setMonthlyPasses] = useState([]);
  const [passChallenges, setPassChallenges] = useState([]);
  const [loadingPasses, setLoadingPasses] = useState(true);
  const [loadingPassChallenges, setLoadingPassChallenges] = useState(true);
  const [passError, setPassError] = useState(null);
  const [passChallengesError, setPassChallengesError] = useState(null);
  const [joiningPassId, setJoiningPassId] = useState(null);
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    loadBadges();
    loadPasses();
    loadPassChallenges();
  }, []);

  const loadBadges = async () => {
    try {
      const response = await badgeService.getUserBadges(user.id);
      setBadges(response?.badges ?? []);
    } catch (error) {
      console.error('Erro ao carregar badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPasses = async () => {
    setPassError(null);
    setLoadingPasses(true);
    try {
      const list = await challengeService.getMonthlyPasses();
      setMonthlyPasses(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar passes ativos:', error);
      setMonthlyPasses([]);
      setPassError('Não foi possível carregar os passes ativos.');
    } finally {
      setLoadingPasses(false);
    }
  };

  const loadPassChallenges = async () => {
    setPassChallengesError(null);
    setLoadingPassChallenges(true);
    try {
      const list = await challengeService.getChallenges();
      setPassChallenges(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar desafios dos passes:', error);
      setPassChallenges([]);
      setPassChallengesError('Não foi possível carregar os desafios dos passes.');
    } finally {
      setLoadingPassChallenges(false);
    }
  };

  const handleJoinPass = useCallback(
    async (passId) => {
      if (!passId) {
        return;
      }

      try {
        setJoiningPassId(passId);
        const data = await challengeService.joinMonthlyPass(passId);
        const joinedAt = data?.membership?.joined_at ?? new Date().toISOString();

        setMonthlyPasses((prev) =>
          prev.map((pass) =>
            pass.id === passId
              ? {
                  ...pass,
                  isJoined: true,
                  joinedAt,
                  joined_at: joinedAt,
                }
              : pass
          )
        );

        Alert.alert('Tudo certo!', 'Você agora participa deste passe.');
      } catch (error) {
        console.error('Erro ao entrar no passe:', error);
        const message =
          error?.response?.data?.error ||
          error?.message ||
          'Não foi possível entrar neste passe. Tente novamente.';
        Alert.alert('Erro', message);
      } finally {
        setJoiningPassId(null);
      }
    },
    [setMonthlyPasses]
  );

  const filteredBadges = useMemo(() => {
    if (selectedFilter === 'all') return badges;
    return badges.filter((badge) => badge.category === selectedFilter);
  }, [badges, selectedFilter]);

  const badgeStats = useMemo(() => {
    const legendaryCount = badges.filter((badge) => badge.rarity === 'legendary').length;
    const rareCount = badges.filter((badge) => badge.rarity === 'rare' || badge.rarity === 'epic').length;
    return [
      { label: 'Conquistas', value: badges.length },
      { label: 'Lendárias', value: legendaryCount },
      { label: 'Premium', value: rareCount },
    ];
  }, [badges]);

  const passChallengeMap = useMemo(() => {
    const orderMap = new Map(DIFFICULTY_ORDER.map((label, index) => [label, index]));
    const grouped = {};

    passChallenges.forEach((challenge) => {
      const passId = challenge?.monthly_pass_id;
      if (!passId) return;

      const difficultyLabel = challenge?.difficulty || DIFFICULTY_FALLBACK;
      const rewardXp = Number(challenge?.reward_xp ?? 0);
      let maneuverPayload = parseManeuverPayload(challenge?.maneuver_payload);
      maneuverPayload = maneuverPayload ? ensureManeuverPayload(maneuverPayload) : null;
      const maneuverType = deriveManeuverType({
        maneuverType: challenge?.maneuver_type,
        specialization: challenge?.specialization
      });
      const normalized = {
        id: challenge?.id ?? `${passId}-${Math.random().toString(36).slice(2, 8)}`,
        title: (challenge?.maneuver_name || '').trim() || 'Desafio sem nome',
        description: rewardXp > 0 ? `${rewardXp} XP` : '',
        difficulty: difficultyLabel,
        passName: challenge?.monthly_pass_name || challenge?.season_pass_name || 'Monthly pass',
        parkName: challenge?.park_name || null,
        seasonName: challenge?.season_name || null,
        createdAt: challenge?.created_at || null,
        maneuverPayload,
        maneuverType,
      };

      if (!grouped[passId]) {
        grouped[passId] = [];
      }
      grouped[passId].push(normalized);
    });

    Object.keys(grouped).forEach((passId) => {
      grouped[passId].sort((a, b) => {
        const idxA = orderMap.has(a.difficulty)
          ? orderMap.get(a.difficulty)
          : DIFFICULTY_ORDER.length + 1;
        const idxB = orderMap.has(b.difficulty)
          ? orderMap.get(b.difficulty)
          : DIFFICULTY_ORDER.length + 1;

        if (idxA !== idxB) {
          return idxA - idxB;
        }

        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return dateB - dateA;
      });
    });

    return grouped;
  }, [passChallenges]);

  const activePasses = useMemo(() => {
    if (!monthlyPasses.length) return [];

    const sorted = [...monthlyPasses].sort((a, b) => {
      const monthA = typeof a?.month === 'number' ? a.month : 13;
      const monthB = typeof b?.month === 'number' ? b.month : 13;
      if (monthA !== monthB) {
        return monthA - monthB;
      }
      return (a?.name || '').localeCompare(b?.name || '');
    });

    const joined = sorted.filter((pass) => pass?.isJoined);
    if (joined.length > 0) {
      return joined;
    }

    const inCurrentMonth = sorted.filter((pass) => pass?.month === currentMonth);
    if (inCurrentMonth.length > 0) {
      return inCurrentMonth;
    }

    const upcoming = sorted.filter(
      (pass) => typeof pass?.month === 'number' && pass.month > currentMonth
    );
    if (upcoming.length > 0) {
      return upcoming;
    }

    return sorted.slice(0, 3);
  }, [monthlyPasses, currentMonth]);

  const activePassesWithChallenges = useMemo(() => {
    return activePasses.map((pass) => ({
      ...pass,
      challenges: passChallengeMap[pass.id] ?? [],
    }));
  }, [activePasses, passChallengeMap]);

  const hasAnyActivePass = activePassesWithChallenges.length > 0;
  const passSectionError = passError || passChallengesError;

  const seasonLabel = 'Temporada 2025';

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const isInitialLoading = loading || loadingPasses || loadingPassChallenges;

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
        showsVerticalScrollIndicator={false}
      >
        <YupHeader title="Achievements" showBackButton />

        {/* Skill Tree Access Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SkillTree')}
          style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.lg }}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryHover]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: radii.md,
              padding: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                <MaterialIcons name="account-tree" size={24} color={colors.textPrimary} />
                <Text
                  style={{
                    fontSize: typography.sizes.xl,
                    fontWeight: typography.weights.bold,
                    color: colors.textPrimary,
                    marginLeft: spacing.sm,
                  }}
                >
                  Skill Tree
                </Text>
              </View>
              <Text
                style={{
                  fontSize: typography.sizes.sm,
                  color: 'rgba(245, 245, 245, 0.85)',
                  lineHeight: typography.sizes.sm * 1.4,
                }}
              >
                Aprenda nomenclaturas e evolua suas habilidades passo a passo
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={28} color={colors.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectedFilter('all')}>
          <YupCard style={styles.passportCard}>
            <View style={styles.passportTop}>
              {user?.profile_image_url ? (
                <Image source={{ uri: user.profile_image_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <MaterialIcons name="person" size={32} color={colors.textPrimary} />
                </View>
              )}
              <View style={styles.passportInfo}>
                <Text style={styles.passportName}>{user?.full_name || user?.username}</Text>
                <Text style={styles.passportUsername}>@{user?.username}</Text>
                <Text style={styles.passportId}>ID {String(user?.id ?? '').slice(0, 8)}</Text>
              </View>
              <View style={styles.passportSeasonBadge}>
                <Text style={styles.passportSeasonText}>{seasonLabel}</Text>
              </View>
            </View>

            <View style={styles.passportStats}>
              {badgeStats.map((item, index) => (
                <View
                  key={item.label}
                  style={[styles.passportStat, index === 0 && styles.passportStatHighlight]}
                >
                  <Text style={styles.passportStatValue}>{item.value}</Text>
                  <Text style={styles.passportStatLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </YupCard>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORY_FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.85}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <Icon
                  name={filter.icon}
                  size={18}
                  color={isActive ? colors.textPrimary : colors.textSecondary}
                />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <YupSectionHeader
          title="Passes ativos"
          subtitle="Complete os desafios em destaque e evolua nos passes."
          style={styles.sectionSpacing}
        />

        <View style={[styles.sectionSpacing, styles.passList]}>
          {passSectionError ? (
            <Text style={styles.passErrorText}>{passSectionError}</Text>
          ) : hasAnyActivePass ? (
            activePassesWithChallenges.map((pass) => {
              const displayedChallenges = pass.challenges.slice(0, 4);
              const remainingChallenges = pass.challenges.length - displayedChallenges.length;
              const monthLabel =
                typeof pass?.month === 'number' ? formatMonthLabel(pass.month) : 'Passe ativo';
              const isCurrentPass = typeof pass?.month === 'number' && pass.month === currentMonth;
              const passKey = pass.id || `pass-${monthLabel}-${pass.name}`;

              return (
                <YupCard key={passKey} style={styles.passCard}>
                  <View style={styles.passHeader}>
                    <View style={styles.passHeaderInfo}>
                      <View
                        style={[
                          styles.passMonthBadge,
                          isCurrentPass && styles.passMonthBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.passMonthText,
                            isCurrentPass && styles.passMonthTextActive,
                          ]}
                        >
                          {monthLabel}
                        </Text>
                      </View>
                      <Text style={styles.passName} numberOfLines={2}>
                        {pass.name}
                      </Text>
                      {pass.season_pass_name ? (
                        <Text style={styles.passSeason} numberOfLines={1}>
                          {pass.season_pass_name}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.passMetaBadge}>
                      <Text style={styles.passMetaText}>
                        {pass.challenges.length}{' '}
                        {pass.challenges.length === 1 ? 'desafio' : 'desafios'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.passActions}>
                    {pass.isJoined ? (
                      <View style={styles.passJoinedBadge}>
                        <MaterialIcons name="check-circle" size={18} color={colors.success} />
                        <Text style={styles.passJoinedText}>Você está inscrito</Text>
                      </View>
                    ) : (
                      <YupButton
                        title="Entrar neste passe"
                        onPress={() => handleJoinPass(pass.id)}
                        isLoading={joiningPassId === pass.id}
                        fullWidth={false}
                        style={styles.passJoinButton}
                      />
                    )}
                  </View>

                  {pass.description ? (
                    <Text style={styles.passDescription} numberOfLines={2}>
                      {pass.description}
                    </Text>
                  ) : null}

                  <View style={styles.passChallengeList}>
                    {displayedChallenges.length > 0 ? (
                      displayedChallenges.map((challenge) => {
                        const theme = getDifficultyTheme(challenge.difficulty);
                        const challengeKey =
                          challenge.id ||
                          `${passKey}-${challenge.title}-${challenge.difficulty}`;
                        return (
                          <View key={challengeKey} style={styles.passChallengeItem}>
                            <View
                              style={[
                                styles.passChallengeDifficulty,
                                { backgroundColor: theme.tint, borderColor: theme.border },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.passChallengeDifficultyText,
                                  { color: theme.text },
                                ]}
                              >
                                {challenge.difficulty}
                              </Text>
                            </View>
                            <View style={styles.passChallengeContent}>
                              <Text style={styles.passChallengeTitle} numberOfLines={2}>
                                {challenge.title}
                              </Text>
                              {challenge.description ? (
                                <Text style={styles.passChallengeDescription} numberOfLines={2}>
                                  {challenge.description}
                                </Text>
                              ) : null}
                              {challenge.parkName ? (
                                <Text style={styles.passChallengeMeta} numberOfLines={1}>
                                  {challenge.parkName}
                                </Text>
                              ) : null}
                            </View>
                            <TouchableOpacity
                              style={styles.passChallengeButton}
                              activeOpacity={0.85}
                              onPress={() => {
                                if (!challenge.maneuverPayload) {
                                  Alert.alert(
                                    'Configuração indisponível',
                                    'Este desafio ainda não possui a manobra configurada. Atualize o painel de desafios e tente novamente.'
                                  );
                                  return;
                                }
                                navigation.navigate('QuickUpload', {
                                  presetChallenge: {
                                    challengeId: challenge.id,
                                    maneuverName: challenge.title,
                                    difficulty: challenge.difficulty,
                                    parkName: challenge.parkName,
                                    parkId: pass.park_id,
                                    obstacleId: pass.obstacle_id,
                                    maneuverPayload: challenge.maneuverPayload,
                                    maneuverType: challenge.maneuverType,
                                    rewardXp: challenge.rewardXp,
                                  },
                                });
                              }}
                            >
                              <MaterialIcons name="videocam" size={16} color={colors.textPrimary} />
                              <Text style={styles.passChallengeButtonText}>Registrar</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.passChallengeEmpty}>
                        <MaterialIcons name="emoji-events" size={20} color={colors.textSecondary} />
                        <Text style={styles.passChallengeEmptyText}>
                          Nenhum desafio cadastrado para este passe ainda.
                        </Text>
                      </View>
                    )}
                  </View>

                  {remainingChallenges > 0 ? (
                    <Text style={styles.passChallengeMore}>
                      +{remainingChallenges}{' '}
                      {remainingChallenges === 1 ? 'desafio disponível' : 'desafios disponíveis'}
                    </Text>
                  ) : null}
                </YupCard>
              );
            })
          ) : (
            <YupCard style={styles.passEmptyCard}>
              <MaterialIcons name="event-busy" size={28} color={colors.textSecondary} />
              <Text style={styles.passEmptyTitle}>Nenhum passe ativo encontrado</Text>
              <Text style={styles.passEmptySubtitle}>
                Assim que um novo monthly pass for liberado, os desafios aparecerão aqui.
              </Text>
            </YupCard>
          )}
        </View>

        <YupSectionHeader
          title={
            selectedFilter === 'all'
              ? 'Todas as conquistas'
              : CATEGORY_FILTERS.find((filter) => filter.id === selectedFilter)?.label || ''
          }
          subtitle="Evolua nas sessions e desbloqueie novas badges"
          style={styles.sectionSpacing}
        />

        {filteredBadges.length > 0 ? (
          <View style={styles.badgeGrid}>
            {filteredBadges.map((badge) => {
              const preset = rarityPreset[badge.rarity] ?? rarityPreset.common;
              return (
                <YupCard key={badge.id} style={styles.badgeCard}>
                  <View style={styles.badgeHeader}>
                    <MaterialIcons name="emoji-events" size={28} color={colors.primary} />
                    <YupBadge variant="neutral" style={styles.badgeCategory}>
                      {badge.category?.replace('_', ' ') || 'Badge'}
                    </YupBadge>
                  </View>
                  <Text style={styles.badgeName} numberOfLines={2}>
                    {badge.name}
                  </Text>
                  <Text style={styles.badgeDescription} numberOfLines={3}>
                    {badge.description || 'Complete desafios e atividades para conquistar novas badges.'}
                  </Text>
                  <View style={styles.badgeFooter}>
                    <View style={styles.badgeMeta}>
                      <MaterialIcons name="calendar-today" size={16} color={colors.textSecondary} />
                      <Text style={styles.badgeMetaText}>Conquistado em {formatDate(badge.earned_at)}</Text>
                    </View>
                    <View style={styles.rarityPill}>
                      <LinearGradient
                        colors={preset.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.rarityBackground}
                      >
                        <Text style={styles.rarityText}>{preset.label}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                </YupCard>
              );
            })}
          </View>
        ) : (
          <YupCard style={styles.emptyCard}>
            <MaterialIcons name="emoji-events" size={48} color="rgba(255,255,255,0.35)" />
            <Text style={styles.emptyTitle}>Nada por aqui ainda</Text>
            <Text style={styles.emptySubtitle}>
              Participe de desafios, registre sessões em novos parques e conclua missões para desbloquear badges exclusivas.
            </Text>
          </YupCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportCard: {
    gap: spacing['2xl'],
    backgroundColor: colors.surface,
    borderRadius: radii['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing['2xl'],
    marginTop: spacing['2xl'],
  },
  passportTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  passportName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  passportUsername: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  passportId: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    letterSpacing: 1.2,
  },
  passportSeasonBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  passportSeasonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  passportStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  passportStat: {
    flex: 1,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,15,15,0.35)',
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  passportStatHighlight: {
    borderColor: colors.primary,
  },
  passportStatValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  passportStatLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  filterRow: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryOutline,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  filterTextActive: {
    color: colors.textPrimary,
  },
  passList: {
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  passErrorText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  passCard: {
    gap: spacing.md,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  passHeaderInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  passMonthBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  passMonthBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  passMonthText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  passMonthTextActive: {
    color: colors.primary,
  },
  passName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  passSeason: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  passMetaBadge: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,15,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  passMetaText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  passActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passJoinButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  passJoinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  passJoinedText: {
    color: colors.success,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  passDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.md,
  },
  passChallengeList: {
    gap: spacing.sm,
  },
  passChallengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,15,0.35)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  passChallengeDifficulty: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  passChallengeDifficultyText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  passChallengeContent: {
    flex: 1,
    gap: spacing.xs,
  },
  passChallengeTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  passChallengeDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.md,
  },
  passChallengeMeta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  passChallengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  passChallengeButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  passChallengeEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,15,0.35)',
    padding: spacing.md,
  },
  passChallengeEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  passChallengeMore: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
  },
  passEmptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,15,0.35)',
    padding: spacing['2xl'],
  },
  passEmptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  passEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: typography.sizes.md,
  },
  sectionSpacing: {
    paddingHorizontal: spacing.screenPadding,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  badgeCard: {
    width: '48%',
    gap: spacing.md,
  },
  badgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeCategory: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  badgeDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.md,
  },
  badgeFooter: {
    gap: spacing.sm,
  },
  badgeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeMetaText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  rarityPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  rarityBackground: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rarityText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.8,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing['2xl'],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: typography.sizes.lg,
  },
});
