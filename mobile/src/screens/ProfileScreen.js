import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import YupHeader from '../components/ui/YupHeader';
import YupCard from '../components/ui/YupCard';
import YupBadge from '../components/ui/YupBadge';
import YupProgress from '../components/ui/YupProgress';
import { colors, gradients, radii, spacing, typography } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { badgeService } from '../services/badgeService';
import { videoService } from '../services/videoService';
import { notificationService } from '../services/notificationService';
import { challengeService } from '../services/challengeService';
import { useFocusEffect } from '@react-navigation/native';

const difficultyThemes = {
  Iniciante: {
    text: colors.success,
    tint: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
  },
  'Intermediário': {
    text: colors.accent,
    tint: 'rgba(0, 191, 255, 0.15)',
    border: 'rgba(0, 191, 255, 0.4)',
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

const formatCompletionDate = (iso) => {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  } catch (error) {
    return '';
  }
};

const formatVideoDuration = (durationMs) => {
  if (!durationMs || Number.isNaN(durationMs)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const formatNumber = (value) => {
  if (value == null || Number.isNaN(value)) return '0';
  try {
    return Number(value).toLocaleString('pt-BR');
  } catch (error) {
    return String(value);
  }
};

const formatComboTimestamp = (iso) => {
  if (!iso) return 'instante';
  try {
    const date = new Date(iso);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'instante';
  }
};

const getInitials = (name = '', fallback = '?') => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  const first = parts[0].slice(0, 1).toUpperCase();
  const last = parts[parts.length - 1].slice(0, 1).toUpperCase();
  return `${first}${last}`;
};

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [userVideos, setUserVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [challengeCompletions, setChallengeCompletions] = useState([]);
  const [xpLog, setXpLog] = useState([]);
  const [xpLeaderboard, setXpLeaderboard] = useState([]);
  const [levelUpData, setLevelUpData] = useState(null);
  const levelUpAnim = useRef(new Animated.Value(0)).current;
  const previousLevelRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user) {
      loadUserData();
      loadNotificationCount();
    }
  }, [user, loadUserData]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadUserData();
      }
    }, [user, loadUserData])
  );

  useEffect(() => {
    if (!levelUpData) {
      return;
    }

    levelUpAnim.setValue(0);
    Animated.sequence([
      Animated.timing(levelUpAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(levelUpAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLevelUpData(null);
    });
  }, [levelUpData, levelUpAnim]);

  const loadUserData = useCallback(async () => {
    try {
      const [
        statsResponse,
        badgesResponse,
        videosResponse,
        completionsResponse,
        xpLogResponse,
        xpLeaderboardResponse,
      ] = await Promise.all([
        userService.getUserStats(user.id),
        badgeService.getUserBadges(user.id),
        videoService.getUserVideos(user.id, 1, 60),
        challengeService.getCompletions(),
        userService.getXpLog(user.id, 10),
        userService.getXpLeaderboard(6),
      ]);

      const statsData = statsResponse?.stats ?? null;
      setStats(statsData);
      setBadges(badgesResponse?.badges ?? []);
      setUserVideos(videosResponse?.videos ?? []);
      setChallengeCompletions(completionsResponse ?? []);
      setXpLog(xpLogResponse ?? []);
      setXpLeaderboard(xpLeaderboardResponse ?? []);

      if (
        statsData?.level &&
        typeof statsData.level === 'number' &&
        previousLevelRef.current != null &&
        statsData.level > previousLevelRef.current
      ) {
        setLevelUpData({
          from: previousLevelRef.current,
          to: statsData.level,
        });
      }
      if (statsData?.level) {
        previousLevelRef.current = statsData.level;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setChallengeCompletions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const loadNotificationCount = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadNotifications(res?.unreadCount ?? 0);
    } catch (error) {
      console.error('Erro ao carregar contagem de notificações:', error);
    }
  };

  const handleAchievements = () => {
    navigation.navigate('Achievements');
  };

  const handleOpenVideo = (video) => {
    navigation.navigate('VideoPlayer', { videoId: video.id, video });
  };

  const handleDeleteVideo = (video) => {
    Alert.alert('Remover vídeo', 'Deseja realmente remover este vídeo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await videoService.deleteVideo(video.id);
            if (response?.error) {
              Alert.alert('Erro', response.error);
              return;
            }
            setUserVideos((prev) => prev.filter((item) => item.id !== video.id));
          } catch (error) {
            console.error('Erro ao remover vídeo:', error);
            Alert.alert('Erro', 'Não foi possível remover o vídeo.');
          }
        },
      },
    ]);
  };

  const xpData = stats?.xp ?? {};
  const level = xpData.level ?? stats?.level ?? 1;
  const xpCurrent = xpData.current ?? stats?.xp_current ?? stats?.xpCurrent ?? 0;
  const xpNext = xpData.next ?? stats?.xp_next ?? stats?.xpTarget ?? xpData.target ?? 1000;
  const xpProgress = (() => {
    const progressValue =
      typeof xpData.progress === 'number'
        ? xpData.progress * 100
        : xpNext > 0
          ? (xpCurrent / xpNext) * 100
          : 0;
    return Math.min(Math.max(progressValue, 0), 100);
  })();
  const xpRemaining = xpData.remaining ?? stats?.xp_remaining ?? Math.max(xpNext - xpCurrent, 0);
  const xpTotal = xpData.total ?? stats?.xp_total ?? stats?.xpTotal ?? 0;
  const xpCap = xpData.cap ?? stats?.xp_cap ?? 1000000;
  const xpMaxLevel = xpData.maxLevel ?? stats?.xp_max_level ?? 99;
  const xpTotalPercent = xpCap > 0 ? Math.min(xpTotal / xpCap, 1) : 0;
  const levelUpOverlayStyle = useMemo(
    () => ({
      opacity: levelUpAnim,
      transform: [
        {
          scale: levelUpAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.85, 1],
          }),
        },
      ],
    }),
    [levelUpAnim]
  );

  const achievements = useMemo(() => badges.slice(0, 6), [badges]);
  const legendaryCount = useMemo(
    () => badges.filter((badge) => badge.rarity === 'legendary').length,
    [badges]
  );
  const premiumCount = useMemo(
    () => badges.filter((badge) => badge.rarity === 'epic' || badge.rarity === 'rare').length,
    [badges]
  );
  const totalAchievements = badges.length + challengeCompletions.length;
  const seasonLabel = `Temporada ${new Date().getFullYear()}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {levelUpData ? (
        <Animated.View style={[styles.levelUpOverlay, levelUpOverlayStyle]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(14,165,233,0.95)', 'rgba(251,146,60,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.levelUpGradient}
          />
          <Text style={styles.levelUpTitle}>Level Up!</Text>
          <Text style={styles.levelUpNumber}>
            {levelUpData.from} → {levelUpData.to}
          </Text>
          <Text style={styles.levelUpHint}>
            Rumo ao nível {Math.min(level + 1, xpMaxLevel)}
          </Text>
        </Animated.View>
      ) : null}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <YupHeader title="Perfil" showBackButton={false} />

        <YupCard style={styles.profileCard}>
          <View style={styles.profileCardHeaderRow}>
            <View style={styles.profileHeaderSpacer} />
            <View style={styles.profileHeaderActions}>
              <TouchableOpacity
                style={[styles.cardIconButton, unreadNotifications > 0 && styles.cardIconButtonActive]}
                activeOpacity={0.85}
                onPress={handleNotifications}
              >
                <Icon
                  name={unreadNotifications > 0 ? 'notifications-active' : 'notifications-none'}
                  size={18}
                  color={colors.textPrimary}
                />
                {unreadNotifications > 0 && (
                  <View style={styles.cardIconBadge}>
                    <Text style={styles.cardIconBadgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardIconButton} activeOpacity={0.85} onPress={handleEditProfile}>
                <Icon name="settings" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.avatarWrapper}>
            <LinearGradient colors={gradients.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarHalo}>
              {user?.profile_image_url ? (
                <Image source={{ uri: user.profile_image_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Icon name="person" size={42} color={colors.textSecondary} />
                </View>
              )}
            </LinearGradient>
            <YupBadge variant="primary" style={styles.levelBadge} textStyle={styles.levelBadgeText}>
              Nível {level}
            </YupBadge>
          </View>

          <Text style={styles.fullName}>{user?.full_name || user?.username}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
          <Text style={styles.bio} numberOfLines={3}>
            {user?.bio || 'Compartilhe suas sessions e evolua com a crew da Y’UP.'}
          </Text>

          <View style={styles.xpInline}>
            <View style={styles.xpInlineHeader}>
              <View>
                <Text style={styles.xpTitle}>Experiência</Text>
                <Text style={styles.xpSubtitle}>
                  {xpRemaining > 0
                    ? `Faltam ${formatNumber(xpRemaining)} XP para o nível ${Math.min(level + 1, xpMaxLevel)}`
                    : 'Você alcançou o nível máximo!'}
                </Text>
              </View>
              <View style={styles.xpValueContainer}>
                <Text style={styles.xpValue}>
                  {formatNumber(xpCurrent)} / {formatNumber(xpNext)} XP
                </Text>
                <Text style={styles.xpValueSecondary}>
                  Total {formatNumber(xpTotal)} / {formatNumber(xpCap)} XP
                </Text>
              </View>
            </View>
            <YupProgress
              value={xpProgress}
              gradientColors={['#0ea5e9', '#fb923c']}
            />
            <View style={styles.xpMetaRow}>
              <View style={styles.xpMetaItem}>
                <Text style={styles.xpMetaLabel}>Progresso global</Text>
                <Text style={styles.xpMetaValue}>{Math.round(xpTotalPercent * 100)}%</Text>
              </View>
              <View style={styles.xpMetaItem}>
                <Text style={styles.xpMetaLabel}>Nível atual</Text>
                <Text style={styles.xpMetaValue}>{level}/{xpMaxLevel}</Text>
              </View>
              <View style={styles.xpMetaItem}>
                <Text style={styles.xpMetaLabel}>Combo recente</Text>
                <Text style={styles.xpMetaValue}>
                  {xpLog?.[0]?.exp_awarded ? `+${formatNumber(xpLog[0].exp_awarded)} XP` : '—'}
                </Text>
              </View>
            </View>
          </View>
        </YupCard>

        <YupCard style={styles.leaderboardCard}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.sectionCardTitle}>Ranking XP</Text>
            <Text style={styles.sectionCardSubtitle}>Top riders mais experientes</Text>
          </View>
          <View style={styles.leaderboardList}>
            {xpLeaderboard.length > 0 ? (
              xpLeaderboard.map((athlete) => {
                const isCurrentUser = athlete.id === user?.id;
                const displayName = athlete.full_name || athlete.username;
                const initials = getInitials(displayName, athlete.username?.slice(0, 2));
                return (
                  <View
                    key={`${athlete.id}-${athlete.rank}`}
                    style={[styles.leaderboardRow, isCurrentUser && styles.leaderboardRowActive]}
                  >
                    <Text style={styles.leaderboardRank}>{athlete.rank}º</Text>
                    {athlete.profile_image_url ? (
                      <Image
                        source={{ uri: athlete.profile_image_url }}
                        style={styles.leaderboardAvatar}
                      />
                    ) : (
                      <View style={styles.leaderboardAvatarFallback}>
                        <Text style={styles.leaderboardAvatarInitials}>{initials}</Text>
                      </View>
                    )}
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName} numberOfLines={1}>{displayName}</Text>
                      <Text style={styles.leaderboardMeta}>Lvl {athlete.level} • {formatNumber(athlete.xp_total)} XP</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.leaderboardEmpty}>O ranking aparece assim que os rides acumularem XP.</Text>
            )}
          </View>
        </YupCard>

        <YupCard style={styles.comboCard}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.sectionCardTitle}>Histórico de Combos</Text>
            <Text style={styles.sectionCardSubtitle}>Últimas manobras e bônus de XP</Text>
          </View>
          <View style={styles.comboList}>
            {xpLog.length > 0 ? (
              xpLog.map((entry, index) => {
                const contributions = Array.isArray(entry?.breakdown?.contributions)
                  ? entry.breakdown.contributions.slice(0, 4)
                  : [];
                return (
                  <View key={`${entry.created_at}-${index}`} style={styles.comboItem}>
                    <View style={styles.comboHeader}>
                      <Text style={styles.comboXp}>+{formatNumber(entry.exp_awarded)} XP</Text>
                      <Text style={styles.comboDate}>{formatComboTimestamp(entry.created_at)}</Text>
                    </View>
                    {contributions.length > 0 ? (
                      <View style={styles.comboTags}>
                        {contributions.map((contribution, contributionIndex) => (
                          <View key={`${contribution.code}-${contributionIndex}`} style={styles.comboTag}>
                            <Text style={styles.comboTagText}>
                              {contribution.label} • +{formatNumber(contribution.value)} XP
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.comboEmpty}>XP base do vídeo</Text>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.comboEmpty}>Publique um vídeo com manobras para desbloquear seu primeiro combo.</Text>
            )}
          </View>
        </YupCard>

        <YupCard style={styles.seasonCard}>
          <View style={styles.seasonHeader}>
            <View style={styles.sectionInfo}>
              <Text style={styles.seasonTitle}>Season Tracker</Text>
              <Text style={styles.seasonSubtitle}>Status de conquistas e badges desta temporada</Text>
            </View>
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonBadgeText}>{seasonLabel}</Text>
            </View>
          </View>

          <View style={styles.seasonStatsRow}>
            <View style={[styles.seasonStat, styles.seasonStatFirst]}>
              <Text style={styles.seasonStatValue}>{totalAchievements}</Text>
              <Text style={styles.seasonStatLabel}>Conquistas</Text>
            </View>
            <View style={styles.seasonStat}>
              <Text style={styles.seasonStatValue}>{legendaryCount}</Text>
              <Text style={styles.seasonStatLabel}>Lendárias</Text>
            </View>
            <View style={styles.seasonStat}>
              <Text style={styles.seasonStatValue}>{premiumCount}</Text>
              <Text style={styles.seasonStatLabel}>Premium</Text>
            </View>
          </View>

          {challengeCompletions.length > 0 ? (
            <View style={styles.completionSection}>
              <Text style={styles.completionSectionTitle}>Desafios concluídos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.completionRow}
              >
                {challengeCompletions.map((completion) => {
                  const theme = getDifficultyTheme(completion.difficulty);
                  return (
                    <View
                      key={completion.id}
                      style={[
                        styles.completionBadge,
                        {
                          backgroundColor: theme.tint,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.completionBadgeLabel, { color: theme.text }]}
                      >
                        {completion.difficulty || 'Desafio'}
                      </Text>
                      <Text style={styles.completionBadgeTitle} numberOfLines={2}>
                        {completion.trick || 'Sem nome'}
                      </Text>
                      <Text style={styles.completionBadgeSubtitle} numberOfLines={1}>
                        {completion.monthly_pass_name || completion.season_pass_name || 'Monthly pass'}
                      </Text>
                      <Text style={styles.completionBadgeDate}>
                        Concluído em {formatCompletionDate(completion.completed_at)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {achievements.length > 0 ? (
            <TouchableOpacity style={styles.seasonCta} onPress={handleAchievements} activeOpacity={0.85}>
              <Text style={styles.seasonCtaText}>Ver todas as achievements</Text>
              <Icon name="chevron-right" size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.seasonEmpty}>
              <Icon name="emoji-events" size={28} color={colors.primary} />
              <Text style={styles.seasonEmptyText}>
                Conquiste badges nesta temporada para desbloquear estatísticas exclusivas.
              </Text>
            </View>
          )}
        </YupCard>

        <View style={styles.videoSection}>
          <View style={styles.videoHeader}>
            <Text style={styles.videoTitle}>Meus vídeos</Text>
            <Text style={styles.videoCount}>{userVideos.length}</Text>
          </View>

          {userVideos.length > 0 ? (
            <View style={styles.videoGrid}>
              {userVideos.map((video) => {
                const trickLabel =
                  [video?.trick, video?.trick_name, video?.description]
                    .map((value) => (typeof value === 'string' ? value.trim() : ''))
                    .find(Boolean) || '';

                return (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoTile}
                    activeOpacity={0.85}
                    onPress={() => handleOpenVideo(video)}
                    onLongPress={() => handleDeleteVideo(video)}
                  >
                    <View style={styles.videoThumbnailWrapper}>
                      {video.thumbnail_url ? (
                        <>
                          <Image
                            source={{ uri: video.thumbnail_url }}
                            style={styles.videoThumbnailImage}
                            resizeMode="cover"
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.75)']}
                            style={styles.videoThumbnailOverlay}
                          />
                          {trickLabel ? (
                            <View style={styles.videoThumbnailTrick} pointerEvents="none">
                              <Text
                                style={styles.videoThumbnailTrickText}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {trickLabel}
                              </Text>
                            </View>
                          ) : null}
                          <View style={styles.videoThumbnailMeta}>
                            <View style={styles.videoThumbnailIcon}>
                              <Icon name="play-arrow" size={18} color={colors.surface} />
                            </View>
                            <Text style={styles.videoThumbnailDuration}>
                              {formatVideoDuration(video.duration)}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.videoTilePlaceholder}>
                          <Icon name="play-circle-outline" size={28} color={colors.textSecondary} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.videoEmpty}>
              <Icon name="movie" size={28} color={colors.textSecondary} />
              <Text style={styles.videoEmptyText}>Você ainda não publicou vídeos.</Text>
            </View>
          )}
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
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing['xl'],
  },
  profileCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  profileHeaderSpacer: {
    flex: 1,
  },
  profileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardIconButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  cardIconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconBadgeText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -spacing.sm,
    alignSelf: 'center',
  },
  levelBadgeText: {
    textTransform: 'none',
  },
  fullName: {
    color: colors.textPrimary,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  username: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: typography.sizes.md,
  },
  xpInline: {
    alignSelf: 'stretch',
    marginTop: spacing['xl'],
    gap: spacing.md,
  },
  xpInlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  xpTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  xpSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  xpValueContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs / 2,
  },
  xpValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  xpValueSecondary: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  xpMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  xpMetaItem: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs / 2,
  },
  xpMetaLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  xpMetaValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  leaderboardCard: {
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing['2xl'],
  },
  leaderboardHeader: {
    gap: spacing.xs / 2,
  },
  sectionCardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  sectionCardSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  leaderboardList: {
    gap: spacing.sm,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  leaderboardRowActive: {
    borderColor: '#0ea5e9',
    backgroundColor: 'rgba(14,165,233,0.12)',
  },
  leaderboardRank: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    width: 32,
  },
  leaderboardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  leaderboardAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(14,165,233,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardAvatarInitials: {
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  leaderboardInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  leaderboardName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  leaderboardMeta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  leaderboardEmpty: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  comboCard: {
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing['2xl'],
  },
  comboList: {
    gap: spacing.sm,
  },
  comboItem: {
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  comboHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comboXp: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  comboDate: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  comboTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  comboTag: {
    borderRadius: radii.full,
    backgroundColor: 'rgba(251,146,60,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs / 2,
  },
  comboTagText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  comboEmpty: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  levelUpOverlay: {
    position: 'absolute',
    top: spacing['3xl'],
    left: spacing['xl'],
    right: spacing['xl'],
    backgroundColor: 'transparent',
    borderRadius: radii['3xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    zIndex: 2,
  },
  levelUpGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii['3xl'],
  },
  levelUpTitle: {
    color: '#0f172a',
    fontSize: typography.sizes['xl'],
    fontWeight: typography.weights.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  levelUpNumber: {
    color: '#081226',
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
  levelUpHint: {
    color: '#0f172a',
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  seasonCard: {
    gap: spacing['xl'],
    backgroundColor: colors.surface,
    borderRadius: radii['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing['2xl'],
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  sectionInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  seasonTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  seasonSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  seasonBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    flexShrink: 0,
    maxWidth: '60%',
  },
  seasonBadgeText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  seasonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  seasonStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,15,0.35)',
    borderRadius: radii['2xl'],
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  seasonStatFirst: {
    borderColor: colors.primary,
  },
  seasonStatValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes['xl'],
    fontWeight: typography.weights.bold,
  },
  seasonStatLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  seasonCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seasonCtaText: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  seasonEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(15,15,15,0.35)',
    borderRadius: radii['2xl'],
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  seasonEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: typography.sizes.lg,
  },
  completionSection: {
    gap: spacing.sm,
  },
  completionSectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  completionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  completionBadge: {
    width: 200,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  completionBadgeLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  completionBadgeTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  completionBadgeSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  completionBadgeDate: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  videoSection: {
    gap: spacing.lg,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  videoCount: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  videoTile: {
    width: '48%',
    aspectRatio: 9 / 16,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  videoThumbnailWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  videoThumbnailImage: {
    ...StyleSheet.absoluteFillObject,
  },
  videoThumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  videoThumbnailMeta: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  videoThumbnailTrick: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing['2xl'],
  },
  videoThumbnailTrickText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.md,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoThumbnailIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbnailDuration: {
    color: colors.surface,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 1.5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.full,
  },
  videoTilePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoEmpty: {
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,15,0.35)',
    alignItems: 'center',
    gap: spacing.sm,
  },
  videoEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
