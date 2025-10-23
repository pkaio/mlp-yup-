import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import YupCard from '../components/ui/YupCard';
import { colors, spacing, typography } from '../theme/tokens';
import { parkService } from '../services/parkService';
import { challengeService } from '../services/challengeService';
import { userService } from '../services/userService';

const FILTERS = [
  { id: 'riders', label: 'New Riders', icon: 'person-add' },
  { id: 'parks', label: 'Parks', icon: 'map' },
  { id: 'monthly', label: 'Monthly Pass', icon: 'event-note' },
];

const DEFAULT_PARK_IMAGE =
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80';
const DEFAULT_AVATAR =
  'https://ui-avatars.com/api/?name=Y%27UP&background=FF6B00&color=FFFFFF';

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

const formatMonth = (month) => {
  if (!month || month < 1 || month > 12) {
    return 'Mês não definido';
  }
  return MONTH_NAMES_PT[month - 1];
};

const formatSignupDate = (isoDate) => {
  if (!isoDate) {
    return 'Entrou recentemente';
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Entrou recentemente';
  }
  return `Entrou em ${date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })}`;
};

const normalizeObstacleIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    return value
      .replace(/[{}]/g, '')
      .split(',')
      .map((segment) => segment.replace(/"/g, '').trim())
      .filter(Boolean);
  }
  return [];
};

const difficultyThemes = {
  Iniciante: {
    text: colors.success,
    tint: 'rgba(34, 197, 94, 0.16)',
    activeTint: 'rgba(34, 197, 94, 0.26)',
    border: 'rgba(34, 197, 94, 0.45)',
  },
  'Intermediário': {
    text: colors.accent,
    tint: 'rgba(0, 191, 255, 0.16)',
    activeTint: 'rgba(0, 191, 255, 0.26)',
    border: 'rgba(0, 191, 255, 0.45)',
  },
  'Avançado': {
    text: colors.warning,
    tint: 'rgba(250, 204, 21, 0.18)',
    activeTint: 'rgba(250, 204, 21, 0.3)',
    border: 'rgba(250, 204, 21, 0.45)',
  },
  Pro: {
    text: colors.primary,
    tint: colors.primarySoft,
    activeTint: 'rgba(255, 107, 0, 0.28)',
    border: 'rgba(255, 107, 0, 0.45)',
  },
  default: {
    text: colors.textSecondary,
    tint: colors.surfaceMuted,
    activeTint: colors.surfaceMuted,
    border: colors.border,
  },
};

const getDifficultyTheme = (label) =>
  difficultyThemes[label] ?? difficultyThemes.default;

export default function DiscoverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState('monthly');
  const [parks, setParks] = useState([]);
  const [loadingParks, setLoadingParks] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [challengeError, setChallengeError] = useState(null);
  const [monthlyPasses, setMonthlyPasses] = useState([]);
  const [loadingMonthlyPasses, setLoadingMonthlyPasses] = useState(true);
  const [monthlyPassError, setMonthlyPassError] = useState(null);
  const [selectedMonthlyPassId, setSelectedMonthlyPassId] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [riders, setRiders] = useState([]);
  const [loadingRiders, setLoadingRiders] = useState(true);
  const [ridersError, setRidersError] = useState(null);

  const normalizedChallenges = useMemo(() => {
    return challenges.map((challenge) => {
      const obstacleIds = normalizeObstacleIds(challenge?.obstacle_ids);
      const difficultyLabel = challenge?.difficulty || DIFFICULTY_FALLBACK;
      return {
        id: challenge?.id ?? String(Math.random()),
        title: challenge?.trick || 'Desafio sem nome',
        description: challenge?.description || '',
        difficulty: difficultyLabel,
        badge: difficultyLabel,
        seasonName: challenge?.season_name || 'Temporada não definida',
        parkName: challenge?.park_name || 'Parque não definido',
        passName:
          challenge?.monthly_pass_name ||
          challenge?.season_pass_name ||
          'Passe não definido',
        monthlyPassId: challenge?.monthly_pass_id ?? null,
        challengeId: challenge?.id ?? null,
        seasonId: challenge?.season_id ?? null,
        seasonPassId: challenge?.season_pass_id ?? null,
        parkId: challenge?.park_id ?? null,
        obstacleIds,
        obstaclesCount: obstacleIds.length,
      };
    });
  }, [challenges]);

  const monthlyPassChallengeCounts = useMemo(() => {
    const counts = new Map();
    normalizedChallenges.forEach((challenge) => {
      if (!challenge.monthlyPassId) return;
      counts.set(
        challenge.monthlyPassId,
        (counts.get(challenge.monthlyPassId) || 0) + 1
      );
    });
    return counts;
  }, [normalizedChallenges]);

  const selectedMonthlyPass = useMemo(() => {
    if (!selectedMonthlyPassId) return null;
    return monthlyPasses.find((pass) => pass.id === selectedMonthlyPassId) ?? null;
  }, [monthlyPasses, selectedMonthlyPassId]);

  const difficultyBreakdown = useMemo(() => {
    if (!selectedMonthlyPassId) return [];
    const counts = new Map();
    normalizedChallenges.forEach((challenge) => {
      if (challenge.monthlyPassId === selectedMonthlyPassId) {
        const label = challenge.difficulty || DIFFICULTY_FALLBACK;
        counts.set(label, (counts.get(label) || 0) + 1);
      }
    });

    const orderMap = new Map(DIFFICULTY_ORDER.map((label, index) => [label, index]));

    return Array.from(counts.entries())
      .sort((a, b) => {
        const indexA = orderMap.has(a[0])
          ? orderMap.get(a[0])
          : DIFFICULTY_ORDER.length + 1;
        const indexB = orderMap.has(b[0])
          ? orderMap.get(b[0])
          : DIFFICULTY_ORDER.length + 1;
        if (indexA !== indexB) {
          return indexA - indexB;
        }
        return a[0].localeCompare(b[0]);
      })
      .map(([label, count]) => ({ label, count }));
  }, [normalizedChallenges, selectedMonthlyPassId]);

  const baseMonthlyChallenges = useMemo(() => {
    if (!selectedMonthlyPassId) return normalizedChallenges;
    return normalizedChallenges.filter(
      (challenge) => challenge.monthlyPassId === selectedMonthlyPassId,
    );
  }, [normalizedChallenges, selectedMonthlyPassId]);

  const filteredChallenges = useMemo(() => {
    if (!selectedMonthlyPassId || !selectedDifficulty) {
      return baseMonthlyChallenges;
    }
    return baseMonthlyChallenges.filter(
      (challenge) => challenge.difficulty === selectedDifficulty,
    );
  }, [baseMonthlyChallenges, selectedDifficulty, selectedMonthlyPassId]);

  const handleChallengePress = (challenge) => {
    navigation.navigate?.('Upload', {
      presetChallenge: {
        trick: challenge.title,
        parkId: challenge.parkId,
        obstacleId: Array.isArray(challenge.obstacleIds)
          ? challenge.obstacleIds[0]
          : challenge.obstacleIds,
        difficulty: challenge.difficulty,
        monthlyPassId: challenge.monthlyPassId,
        seasonPassId: challenge.seasonPassId,
        seasonId: challenge.seasonId,
        challengeId: challenge.challengeId || challenge.id,
      },
    });
  };

  const handleFilterPress = (filterId) => {
    setSelectedFilter(filterId);
    if (filterId !== 'monthly') {
      setSelectedMonthlyPassId(null);
      setSelectedDifficulty(null);
    }
  };

  const handleSeeAllPasses = () => {
    navigation.navigate?.('Achievements');
  };

  const handleMonthlyPassPress = (passId) => {
    setSelectedDifficulty(null);
    setSelectedMonthlyPassId((previous) => (previous === passId ? null : passId));
  };

  const handleDifficultyPress = (difficultyLabel) => {
    setSelectedDifficulty((previous) =>
      previous === difficultyLabel ? null : difficultyLabel
    );
  };

  const handleClearSelections = () => {
    setSelectedMonthlyPassId(null);
    setSelectedDifficulty(null);
  };

  useEffect(() => {
    const loadParks = async () => {
      try {
        const response = await parkService.getParks();
        const list = response?.parks ?? [];
        setParks(list);
      } catch (error) {
        console.error('Erro ao carregar parques:', error);
        setParks([]);
      } finally {
        setLoadingParks(false);
      }
    };

    loadParks();
  }, []);

  useEffect(() => {
    const loadChallenges = async () => {
      setChallengeError(null);
      setLoadingChallenges(true);
      try {
        const list = await challengeService.getChallenges();
        setChallenges(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error('Erro ao carregar desafios:', error);
        setChallenges([]);
        setChallengeError('Não foi possível carregar os desafios.');
      } finally {
        setLoadingChallenges(false);
      }
    };

    loadChallenges();
  }, []);

  useEffect(() => {
    const loadMonthlyPasses = async () => {
      setMonthlyPassError(null);
      setLoadingMonthlyPasses(true);
      try {
        const list = await challengeService.getMonthlyPasses();
        setMonthlyPasses(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error('Erro ao carregar monthly passes:', error);
        setMonthlyPasses([]);
        setMonthlyPassError('Não foi possível carregar os monthly passes.');
      } finally {
        setLoadingMonthlyPasses(false);
      }
    };

    loadMonthlyPasses();
  }, []);

  useEffect(() => {
    const loadRiders = async () => {
      setRidersError(null);
      setLoadingRiders(true);
      try {
        const response = await userService.getRecentUsers(6);
        const list = response?.users ?? [];
        setRiders(list);
      } catch (error) {
        console.error('Erro ao carregar riders recentes:', error);
        setRiders([]);
        setRidersError('Não foi possível carregar os novos riders.');
      } finally {
        setLoadingRiders(false);
      }
    };

    loadRiders();
  }, []);

  const showFilteredChallenges = Boolean(selectedMonthlyPassId && selectedDifficulty);
  const challengesToDisplay = filteredChallenges;
  const challengesEmptyMessage = showFilteredChallenges
    ? 'Nenhum desafio encontrado para esta dificuldade.'
    : selectedMonthlyPassId
      ? 'Nenhum desafio disponível para este monthly pass.'
      : 'Nenhum desafio disponível';
  const selectedMonthlyPassChallengeCount = selectedMonthlyPassId
    ? monthlyPassChallengeCounts.get(selectedMonthlyPassId) ?? 0
    : 0;
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar atletas, parques ou manobras"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity style={styles.filterButton}>
              <Icon name="tune" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => handleFilterPress(filter.id)}
                activeOpacity={0.85}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
              >
                <Icon
                  name={filter.icon}
                  size={18}
                  color={isActive ? colors.textPrimary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.filterLabel,
                    isActive && styles.filterLabelActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedFilter === 'riders' && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>Novos riders</Text>
                <Text style={styles.sectionSubtitle}>
                  Veja quem acabou de chegar na comunidade Ŷ&apos;UP.
                </Text>
              </View>
            </View>

            {ridersError && !loadingRiders ? (
              <Text style={styles.challengeErrorText}>{ridersError}</Text>
            ) : null}

            <View style={styles.riderGrid}>
              {(loadingRiders ? Array.from({ length: 6 }) : riders).map((rider, index) => {
                if (loadingRiders) {
                  return (
                    <YupCard key={`rider-skeleton-${index}`} style={styles.riderCard}>
                      <View style={styles.riderSkeletonAvatar} />
                      <View style={styles.riderSkeletonLine} />
                      <View style={[styles.riderSkeletonLine, styles.riderSkeletonLineShort]} />
                    </YupCard>
                  );
                }

                return (
                  <YupCard key={rider.id} style={styles.riderCard}>
                    <View style={styles.riderHeader}>
                      <Image
                        source={{ uri: rider.profile_image_url || DEFAULT_AVATAR }}
                        style={styles.riderAvatar}
                      />
                      <View style={styles.riderInfo}>
                        <Text style={styles.riderName} numberOfLines={1}>
                          {rider.full_name || rider.username}
                        </Text>
                        <Text style={styles.riderHandle} numberOfLines={1}>
                          @{rider.username}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.riderMeta}>{formatSignupDate(rider.created_at)}</Text>
                  </YupCard>
                );
              })}
            </View>

            {!loadingRiders && !ridersError && riders.length === 0 ? (
              <YupCard style={styles.riderEmptyCard}>
                <View style={styles.riderEmptyContent}>
                  <Icon name="sentiment-neutral" size={28} color={colors.textSecondary} />
                  <Text style={styles.riderEmptyTitle}>Nenhum rider recente</Text>
                  <Text style={styles.riderEmptySubtitle}>
                    Assim que novos atletas criarem conta, eles aparecerão por aqui.
                  </Text>
                </View>
              </YupCard>
            ) : null}
          </>
        )}

        {selectedFilter === 'parks' && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>Parques oficiais Ŷ’UP</Text>
                <Text style={styles.sectionSubtitle}>
                  Selecione um parque para ver desafios e crew ativa.
                </Text>
              </View>
            </View>

            <View style={styles.parksGrid}>
              {(loadingParks ? Array.from({ length: 3 }) : parks).map((park, index) => (
                <YupCard key={park?.id ?? `skeleton-${index}`} style={styles.parkCard}>
                  <ImageBackground
                    source={{
                      uri:
                        park?.hero_image_url ||
                        park?.cover_image_url ||
                        park?.logo_url ||
                        DEFAULT_PARK_IMAGE,
                    }}
                    style={styles.parkImage}
                    imageStyle={styles.parkImageRadius}
                  >
                    <LinearGradient
                      colors={['rgba(13,13,13,0.65)', 'transparent']}
                      style={styles.parkOverlay}
                    />
                  </ImageBackground>
                  <View style={styles.parkContent}>
                    <Text style={styles.parkName}>{park?.name || 'Parque Ŷ’UP'}</Text>
                    <Text style={styles.parkCity}>{park?.address || 'Endereço em breve'}</Text>
                    {park?.description ? (
                      <Text style={styles.parkAddress} numberOfLines={2}>
                        {park.description}
                      </Text>
                    ) : null}
                    <View style={styles.parkFeatureRow}>
                      {(park?.highlights ||
                        park?.features || [
                          'Crew ativa',
                          'Obstáculos variados',
                          'Sessões diárias',
                        ]
                      )
                        .slice(0, 3)
                        .map((feature, featureIndex) => (
                          <View
                            key={`${park?.id ?? index}-${featureIndex}`}
                            style={styles.parkFeatureChip}
                          >
                            <Text style={styles.parkFeatureText}>{feature}</Text>
                          </View>
                        ))}
                    </View>
                    <TouchableOpacity
                      style={[styles.parkAction, !park?.id && styles.parkActionDisabled]}
                      activeOpacity={0.85}
                      disabled={!park?.id}
                      onPress={() => navigation.navigate?.('Mapa', { parkId: park?.id })}
                    >
                      <Text
                        style={[
                          styles.parkActionText,
                          !park?.id && styles.parkActionTextDisabled,
                        ]}
                      >
                        Ver no mapa
                      </Text>
                      <Icon name="chevron-right" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </YupCard>
              ))}
              {!loadingParks && parks.length === 0 && (
                <YupCard style={styles.parkEmptyCard}>
                  <View style={styles.parkEmptyContent}>
                    <Icon name="travel-explore" size={32} color={colors.textSecondary} />
                    <Text style={styles.parkEmptyTitle}>Nenhum parque cadastrado</Text>
                    <Text style={styles.parkEmptySubtitle}>
                      Assim que um moderador adicionar um parque, ele aparecerá aqui.
                    </Text>
                  </View>
                </YupCard>
              )}
            </View>
          </>
        )}

        {selectedFilter === 'monthly' && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>Monthly pass em destaque</Text>
                <Text style={styles.sectionSubtitle}>
                  Escolha um monthly pass para explorar seus desafios.
                </Text>
              </View>
            </View>

            {monthlyPassError && !loadingMonthlyPasses ? (
              <Text style={styles.challengeErrorText}>{monthlyPassError}</Text>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthlyPassList}
            >
              {(loadingMonthlyPasses ? Array.from({ length: 3 }) : monthlyPasses).map(
                (monthlyPass, index) => {
                  if (loadingMonthlyPasses) {
                    return (
                      <YupCard key={`monthly-skeleton-${index}`} style={styles.monthlyPassCard}>
                        <View style={styles.monthlyPassSkeletonLine} />
                        <View
                          style={[styles.monthlyPassSkeletonLine, styles.monthlyPassSkeletonLineShort]}
                        />
                        <View
                          style={[styles.monthlyPassSkeletonLine, styles.monthlyPassSkeletonLineThin]}
                        />
                      </YupCard>
                    );
                  }

                  const isActive = monthlyPass.id === selectedMonthlyPassId;
                  const challengeCount = monthlyPassChallengeCounts.get(monthlyPass.id) ?? 0;

                  return (
                    <TouchableOpacity
                      key={monthlyPass.id}
                      activeOpacity={0.85}
                      onPress={() => handleMonthlyPassPress(monthlyPass.id)}
                    >
                      <YupCard
                        style={[
                          styles.monthlyPassCard,
                          isActive && styles.monthlyPassCardActive,
                        ]}
                      >
                        <Text style={styles.monthlyPassMonth}>{formatMonth(monthlyPass.month)}</Text>
                        <Text style={styles.monthlyPassName} numberOfLines={2}>
                          {monthlyPass.name}
                        </Text>
                        {monthlyPass.season_pass_name ? (
                          <Text style={styles.monthlyPassMeta} numberOfLines={1}>
                            {monthlyPass.season_pass_name}
                          </Text>
                        ) : null}
                        <Text style={styles.monthlyPassMeta}>
                          {challengeCount} {challengeCount === 1 ? 'desafio' : 'desafios'}
                        </Text>
                      </YupCard>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>

            {!loadingMonthlyPasses && !monthlyPassError && monthlyPasses.length === 0 ? (
              <YupCard style={styles.monthlyPassEmptyCard}>
                <View style={styles.monthlyPassEmptyContent}>
                  <Icon name="event-busy" size={28} color={colors.textSecondary} />
                  <Text style={styles.monthlyPassEmptyTitle}>Nenhum monthly pass disponível</Text>
                  <Text style={styles.monthlyPassEmptySubtitle}>
                    Assim que um moderador cadastrar um monthly pass, você poderá explorá-lo por aqui.
                  </Text>
                </View>
              </YupCard>
            ) : null}

            {selectedMonthlyPassId ? (
              <View style={styles.difficultySection}>
                <View style={styles.difficultyHeader}>
                  <View style={styles.sectionInfo}>
                    <Text style={styles.difficultyTitle} numberOfLines={1}>
                      {selectedMonthlyPass?.name || 'Monthly pass selecionado'}
                    </Text>
                    <Text style={styles.difficultySubtitle}>
                      {selectedMonthlyPassChallengeCount > 0
                        ? `${selectedMonthlyPassChallengeCount} ${
                            selectedMonthlyPassChallengeCount === 1
                              ? 'desafio disponível'
                              : 'desafios disponíveis'
                          }`
                        : 'Nenhum desafio cadastrado para este pass ainda.'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleClearSelections} activeOpacity={0.8}>
                    <Text style={styles.sectionAction}>Limpar</Text>
                  </TouchableOpacity>
                </View>

                {difficultyBreakdown.length === 0 ? (
                  <YupCard style={styles.difficultyEmptyCard}>
                    <View style={styles.difficultyEmptyContent}>
                      <Icon name="emoji-events" size={28} color={colors.textSecondary} />
                      <Text style={styles.challengeEmptyTitle}>
                        Nenhum desafio cadastrado para este monthly pass.
                      </Text>
                      <Text style={styles.challengeEmptySubtitle}>
                        Assim que o time moderador adicionar novos desafios, eles aparecerão aqui.
                      </Text>
                    </View>
                  </YupCard>
                ) : (
                  <View style={styles.difficultyGrid}>
                    {difficultyBreakdown.map(({ label, count }) => {
                      const isDifficultyActive = selectedDifficulty === label;
                      const theme = getDifficultyTheme(label);
                      const cardPalette = isDifficultyActive
                        ? { backgroundColor: theme.activeTint, borderColor: theme.text }
                        : { backgroundColor: theme.tint, borderColor: theme.border };

                      return (
                        <TouchableOpacity
                          key={label}
                          activeOpacity={0.85}
                          onPress={() => handleDifficultyPress(label)}
                        >
                          <YupCard style={[styles.difficultyCard, cardPalette]}>
                            <Text style={[styles.difficultyCardTitle, { color: theme.text }]}>
                              {label}
                            </Text>
                            <Text style={[styles.difficultyCardCount, { color: theme.text }]}>
                              {count} {count === 1 ? 'desafio' : 'desafios'}
                            </Text>
                          </YupCard>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {selectedMonthlyPassId && selectedDifficulty ? (
              <View style={styles.challengeList}>
                {(loadingChallenges ? Array.from({ length: 2 }) : challengesToDisplay).map(
                  (challenge, index) => {
                    if (loadingChallenges) {
                      return (
                        <YupCard key={`challenge-skeleton-${index}`} style={styles.challengeCard}>
                          <View style={styles.challengeSkeletonLine} />
                          <View
                            style={[styles.challengeSkeletonLine, styles.challengeSkeletonLineShort]}
                          />
                          <View
                            style={[styles.challengeSkeletonLine, styles.challengeSkeletonLineThin]}
                          />
                        </YupCard>
                      );
                    }

                    const theme = getDifficultyTheme(challenge.difficulty);

                    return (
                      <TouchableOpacity
                        key={challenge.id}
                        activeOpacity={0.85}
                        onPress={() => handleChallengePress(challenge)}
                      >
                        <YupCard style={styles.challengeCard}>
                          <View style={styles.challengeHeader}>
                            <View
                              style={[
                                styles.challengeBadge,
                                { backgroundColor: theme.tint, borderColor: theme.border },
                              ]}
                            >
                              <Text
                                style={[styles.challengeBadgeText, { color: theme.text }]}
                              >
                                {challenge.difficulty}
                              </Text>
                            </View>
                            <Text style={styles.challengeStatus} numberOfLines={1} ellipsizeMode="tail">
                              {challenge.passName}
                            </Text>
                          </View>

                        <Text style={styles.challengeTitle} numberOfLines={2} ellipsizeMode="tail">
                          {challenge.title}
                        </Text>

                        {challenge.description ? (
                          <Text style={styles.challengeDescription}>{challenge.description}</Text>
                        ) : null}

                        <View style={styles.challengeMetaRow}>
                          <View style={styles.challengeMetaChip}>
                            <Icon name="event" size={14} color={colors.primary} />
                            <Text style={styles.challengeMetaText}>{challenge.seasonName}</Text>
                          </View>
                          <View style={styles.challengeMetaChip}>
                            <Icon name="landscape" size={14} color={colors.primary} />
                            <Text style={styles.challengeMetaText}>{challenge.parkName}</Text>
                          </View>
                        </View>

                          <Text style={styles.challengeProgressText}>
                            Obstáculos selecionados: {challenge.obstaclesCount}
                          </Text>
                        </YupCard>
                      </TouchableOpacity>
                    );
                  }
                )}

                {!loadingChallenges && !challengeError && challengesToDisplay.length === 0 ? (
                  <YupCard style={styles.challengeEmptyCard}>
                    <View style={styles.challengeEmptyContent}>
                      <Icon name="emoji-events" size={28} color={colors.textSecondary} />
                      <Text style={styles.challengeEmptyTitle}>{challengesEmptyMessage}</Text>
                      <Text style={styles.challengeEmptySubtitle}>
                        {showFilteredChallenges
                          ? 'Selecione outra dificuldade ou outro monthly pass para continuar explorando.'
                          : 'Quando os moderadores publicarem novos desafios, eles aparecerão aqui.'}
                      </Text>
                    </View>
                  </YupCard>
                ) : null}
              </View>
            ) : null}
          </>
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
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing['2xl'],
    gap: spacing['2xl'],
  },
  searchBarWrapper: {
    paddingBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  parksGrid: {
    gap: spacing.lg,
  },
  parkCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: spacing['3xl'],
  },
  parkImage: {
    height: 140,
    width: '100%',
  },
  parkImageRadius: {
    borderTopLeftRadius: spacing['3xl'],
    borderTopRightRadius: spacing['3xl'],
  },
  parkOverlay: {
    flex: 1,
  },
  parkContent: {
    padding: spacing['2xl'],
    gap: spacing.sm,
  },
  parkName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  parkCity: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  parkAddress: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.sm * 1.4,
  },
  parkFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  parkFeatureChip: {
    borderRadius: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  parkFeatureText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  parkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  parkActionText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  parkActionDisabled: {
    opacity: 0.5,
  },
  parkActionTextDisabled: {
    color: colors.textSecondary,
  },
  parkEmptyCard: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
  parkEmptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  parkEmptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  parkEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: typography.sizes.md,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryOutline,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  filterLabelActive: {
    color: colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  sectionInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes['xl'],
    fontWeight: typography.weights.bold,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.md,
  },
  sectionAction: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  riderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  riderCard: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.md,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: spacing['2xl'],
    backgroundColor: colors.surfaceMuted,
  },
  riderSkeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: spacing['2xl'],
    backgroundColor: colors.surfaceMuted,
  },
  riderInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  riderName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  riderHandle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  riderMeta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  riderSkeletonLine: {
    height: 12,
    borderRadius: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  riderSkeletonLineShort: {
    width: '60%',
  },
  riderEmptyCard: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  riderEmptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  riderEmptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  riderEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * 1.4,
    paddingHorizontal: spacing.xl,
  },
  monthlyPassList: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  monthlyPassCard: {
    width: 220,
    gap: spacing.sm,
    padding: spacing['2xl'],
    borderRadius: spacing['3xl'],
  },
  monthlyPassCardActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
  },
  monthlyPassMonth: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  monthlyPassName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  monthlyPassMeta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  monthlyPassSkeletonLine: {
    height: 16,
    borderRadius: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  monthlyPassSkeletonLineShort: {
    width: '75%',
  },
  monthlyPassSkeletonLineThin: {
    width: '45%',
    height: 12,
  },
  monthlyPassEmptyCard: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthlyPassEmptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthlyPassEmptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  monthlyPassEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * 1.4,
    paddingHorizontal: spacing.xl,
  },
  difficultySection: {
    gap: spacing.md,
  },
  difficultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  difficultyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  difficultySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  difficultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  difficultyCard: {
    width: 160,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  difficultyCardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  difficultyCardCount: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  difficultyEmptyCard: {
    paddingVertical: spacing['2xl'],
  },
  difficultyEmptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeList: {
    gap: spacing.lg,
  },
  challengeCard: {
    gap: spacing.md,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.lg,
    borderWidth: 1,
  },
  challengeBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1.2,
  },
  challengeStatus: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  challengeTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.2,
  },
  challengeDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.4,
  },
  challengeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  challengeMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeMetaText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  challengeProgressText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  challengeSkeletonLine: {
    height: 16,
    borderRadius: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  challengeSkeletonLineShort: {
    width: '70%',
  },
  challengeSkeletonLineThin: {
    width: '50%',
    height: 12,
  },
  challengeErrorText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
  },
  challengeEmptyCard: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeEmptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeEmptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  challengeEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * 1.4,
    paddingHorizontal: spacing.xl,
  },
});
