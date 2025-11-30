import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Animated, useWindowDimensions, Modal, ScrollView } from 'react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../theme/tokens';
const Icon = MaterialIcons;

const { width: initialWidth, height: initialHeight } = Dimensions.get('window');
const ACTIONS_COLUMN_WIDTH = 64;
const POST_INFO_BOTTOM_MARGIN = spacing['2xl'];
const POST_INFO_VERTICAL_SHIFT = 30;
const POST_INFO_HORIZONTAL_MARGIN = spacing.lg;
const TEXT_SHADOW_STYLE = {
  textShadowColor: 'rgba(0,0,0,0.6)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};

const getTrimmed = (value) => (typeof value === 'string' ? value.trim() : '');
const sanitizeManeuverText = (value) => {
  if (!value) return '';
  let text = value;
  // remove frases que começam com Sem ... ou none
  text = text.replace(/\\bsem\\s+[^•]+/gi, '');
  text = text.replace(/\\bnone\\b/gi, '');
  text = text.replace(/\\bno\\b/gi, '');
  text = text.replace(/\\bwithout\\b/gi, '');
  text = text.replace(/\\s+/g, ' ');
  text = text.replace(/•\\s*•/g, '•');
  return text.trim().replace(/^•\\s*/, '').replace(/\\s*•\\s*$/, '');
};

const formatCount = (count) => {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return `${count}`;
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'agora';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

function VideoCard({ video, onLike, onComment, isActive }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showManeuverModal, setShowManeuverModal] = useState(false);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const { width: windowWidth = initialWidth, height: windowHeight = initialHeight } = useWindowDimensions();

  const postInfoBottomOffset = insets.bottom + POST_INFO_BOTTOM_MARGIN + POST_INFO_VERTICAL_SHIFT;
  const actionsBottomOffset = insets.bottom + POST_INFO_BOTTOM_MARGIN;

  const maneuverMeta = video?.score_breakdown?.xp?.maneuver || {};
  const trickShortName = getTrimmed(video?.trick_short_name);
  const maneuverDescription = getTrimmed(video?.score_breakdown?.xp?.maneuver_description);
  const payloadDisplayName = getTrimmed(
    video?.maneuver_payload?.displayName ||
    video?.maneuver_payload?.display_name
  );
  const displayNameRaw = getTrimmed(
    video?.maneuver_display_name ||
    video?.maneuverDisplayName ||
    maneuverMeta.display_name ||
    maneuverMeta.short_name ||
    payloadDisplayName
  );
  const displayName = sanitizeManeuverText(displayNameRaw);
  const fallbackName = getTrimmed(
    video?.maneuver_name ||
    maneuverMeta.name ||
    maneuverDescription ||
    video?.trick ||
    video?.trick_name ||
    trickShortName
  );
  const maneuverName = displayName || fallbackName;
  const maneuverType = typeof maneuverMeta.type === 'string' && maneuverMeta.type
    ? maneuverMeta.type.toUpperCase()
    : null;
  const maneuverTextRaw = displayName || maneuverName || maneuverDescription;
  const maneuverText = sanitizeManeuverText(maneuverTextRaw) || 'Manobra';
  const locationSegments = [];
  if (video?.obstacle_name) locationSegments.push(video.obstacle_name);
  if (video?.park_name) locationSegments.push(video.park_name);
  const locationText = locationSegments.join(' • ');

  const metaSegments = [];
  if (maneuverType) {
    metaSegments.push(maneuverType);
  }
  const timeAgo = formatTimeAgo(video?.created_at);
  if (timeAgo) metaSegments.push(timeAgo);
  const metaInfo = metaSegments.join(' • ');

  const xpBreakdown = video?.score_breakdown?.xp || {};
  const xpContributions = Array.isArray(xpBreakdown.contributions)
    ? xpBreakdown.contributions
    : Array.isArray(xpBreakdown.breakdown?.contributions)
      ? xpBreakdown.breakdown.contributions
      : [];
  const totalXp =
    xpBreakdown.total_xp ??
    xpBreakdown.total ??
    xpBreakdown.xp_total ??
    xpBreakdown.exp_awarded ??
    null;

  const videoSource = useMemo(
    () => (video?.video_url ? { uri: video.video_url } : null),
    [video?.video_url]
  );
  const thumbnailSource = useMemo(
    () =>
      video?.thumbnail_url
        ? {
            uri: video.thumbnail_url,
          }
        : undefined,
    [video?.thumbnail_url]
  );

  const handleTogglePlayback = async () => {
    if (!videoRef.current || !isReady) return;
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.warn('Erro ao alternar reprodução do vídeo:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const syncPlayback = async () => {
      if (!videoRef.current || !videoSource || !isReady) return;

      try {
        if (isActive) {
          await videoRef.current.playAsync();
          if (isMounted) {
            setIsPlaying(true);
          }
        } else {
          await videoRef.current.pauseAsync();
          await videoRef.current.setPositionAsync(0);
          if (isMounted) {
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.warn('Erro ao sincronizar reprodução do vídeo:', error);
      }
    };

    Animated.timing(fadeAnim, {
      toValue: isActive ? 1 : 0,
      duration: isActive ? 200 : 150,
      useNativeDriver: true,
    }).start();

    syncPlayback();

    return () => {
      isMounted = false;
    };
  }, [isActive, videoSource, isReady, fadeAnim]);

  useEffect(() => {
    setIsReady(false);
    setIsPlaying(false);
  }, [videoSource]);

  return (
    <>
      <TouchableOpacity
        style={[styles.touchable, { width: windowWidth, height: windowHeight }]}
        activeOpacity={0.9}
        onPress={handleTogglePlayback}
      >
        <View style={styles.mediaWrapper}>
        {videoSource ? (
          <Video
            ref={videoRef}
            style={styles.video}
            source={videoSource}
            resizeMode="cover"
            isLooping
            shouldPlay={isActive}
            useNativeControls={false}
            onLoad={() => setIsReady(true)}
            onPlaybackStatusUpdate={(status) => setIsPlaying(Boolean(status?.isPlaying))}
            posterSource={thumbnailSource}
            onError={(error) => console.warn('Erro ao carregar vídeo:', error)}
          />
        ) : thumbnailSource ? (
          <Image source={thumbnailSource} style={styles.video} resizeMode="cover" />
        ) : (
          <View style={[styles.video, styles.videoPlaceholder]}>
            <MaterialIcons name="videocam-off" size={48} color="#94a3b8" />
            <Text style={styles.placeholderText}>Fonte indisponível</Text>
          </View>
        )}

        <LinearGradient
          colors={['rgba(13,13,13,0.75)', 'transparent']}
          style={[styles.topGradient, { height: windowHeight * 0.35 }]}
        />
        <LinearGradient
          colors={['transparent', 'rgba(13,13,13,0.92)']}
          style={[styles.bottomGradient, { height: windowHeight * 0.55 }]}
        />

        <View style={[styles.topContent, { top: insets.top + spacing['2xl'] }]}> 
          <Image source={require('../../assets/icon.png')} style={styles.brandMark} />
        </View>

        <View style={[styles.actionsContainer, { bottom: actionsBottomOffset }]}> 
            <TouchableOpacity style={styles.actionButton} onPress={() => onLike?.(video.id)}>
              <View style={[styles.actionIcon, video.user_liked && styles.actionIconActive]}>
                <Icon
                  name={video.user_liked ? 'favorite' : 'favorite-border'}
                  size={26}
                  color={video.user_liked ? colors.primary : '#FFFFFF'}
                />
              </View>
              <Text style={styles.actionLabel}>{formatCount(video.likes_count)}</Text>
            </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onComment?.(video.id)}
          >
            <View style={styles.actionIcon}>
              <MaterialIcons name="chat-bubble-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>{formatCount(video.comments_count)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <MaterialIcons name="share" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>{formatCount(video.views_count)}</Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.postInfoOverlay,
            {
              bottom: postInfoBottomOffset,
              opacity: fadeAnim,
            },
          ]}
        >
          <View pointerEvents="box-none" style={styles.postInfoContent}>
            <View style={styles.userInfo}>
              {video?.profile_image_url ? (
                <Image source={{ uri: video.profile_image_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={22} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.userText}>
                <Text style={styles.postUsername} numberOfLines={1}>
                  @{video?.username || 'rider'}
                </Text>
                <View style={styles.metaBadges}>
                  {maneuverText ? (
                    <TouchableOpacity
                      style={styles.metaBadge}
                      activeOpacity={0.85}
                      onPress={() => setShowManeuverModal(true)}
                    >
                      <MaterialIcons name="bolt" size={18} color="#FFFFFF" />
                      <View style={styles.metaBadgeText}>
                        <Text style={styles.metaBadgeLabel}>Manobra</Text>
                        <Text
                          style={styles.metaBadgeValue}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {maneuverText}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                  {locationText ? (
                    <View style={styles.metaBadge}>
                      <MaterialIcons name="place" size={18} color="#FFFFFF" />
                      <View style={styles.metaBadgeText}>
                        <Text style={styles.metaBadgeLabel}>Local</Text>
                        <Text
                          style={styles.metaBadgeValue}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {locationText}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                {metaInfo ? (
                  <Text style={styles.postMeta} numberOfLines={1}>
                    {metaInfo}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </Animated.View>
        </View>
      </TouchableOpacity>

      <Modal
        transparent
        visible={showManeuverModal}
        animationType="fade"
        onRequestClose={() => setShowManeuverModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowManeuverModal(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="insights" size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>{maneuverText || 'Manobra'}</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {xpBreakdown?.maneuver_description || 'Resumo de XP da manobra executada.'}
            </Text>
            <View style={styles.modalDivider} />
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {totalXp != null ? (
                <View style={styles.modalRow}>
                  <Text style={styles.modalRowLabel}>XP total</Text>
                  <Text style={styles.modalRowValue}>{formatCount(totalXp)}</Text>
                </View>
              ) : null}
              {xpContributions.length > 0 ? (
                xpContributions.map((item, index) => (
                  <View key={`${item.code || item.label || index}`} style={styles.modalContribution}>
                    <Text style={styles.modalContributionLabel} numberOfLines={1}>
                      {item.label || item.code || 'Ação'}
                    </Text>
                    <Text style={styles.modalContributionValue}>+{formatCount(item.value || 0)} XP</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.modalEmpty}>Sem detalhamento de XP disponível.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowManeuverModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const arePropsEqual = (prevProps, nextProps) =>
  prevProps.video === nextProps.video &&
  prevProps.isActive === nextProps.isActive &&
  prevProps.onLike === nextProps.onLike &&
  prevProps.onComment === nextProps.onComment;

export default memo(VideoCard, arePropsEqual);

const styles = StyleSheet.create({
  touchable: {
    backgroundColor: colors.background,
  },
  mediaWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  topContent: {
    position: 'absolute',
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    alignItems: 'flex-start',
  },
  brandMark: {
    width: 68,
    height: 68,
    resizeMode: 'contain',
  },
  actionsContainer: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
    width: ACTIONS_COLUMN_WIDTH,
    zIndex: 6,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  actionIconActive: {
    backgroundColor: 'transparent',
  },
  actionLabel: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  postInfoOverlay: {
    position: 'absolute',
    left: POST_INFO_HORIZONTAL_MARGIN,
    right: POST_INFO_HORIZONTAL_MARGIN,
    zIndex: 5,
  },
  postInfoContent: {
    width: '100%',
    paddingLeft: 0,
    paddingRight: POST_INFO_HORIZONTAL_MARGIN + ACTIONS_COLUMN_WIDTH,
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userText: {
    flex: 1,
    gap: spacing.xs,
  },
  postUsername: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
    ...TEXT_SHADOW_STYLE,
  },
  metaBadges: {
    gap: spacing.xs,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaBadgeText: {
    flex: 1,
  },
  metaBadgeLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    ...TEXT_SHADOW_STYLE,
  },
  metaBadgeValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    ...TEXT_SHADOW_STYLE,
  },
  postMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: typography.weights.medium,
    ...TEXT_SHADOW_STYLE,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: radii['2xl'],
    padding: spacing['2xl'],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalRowLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  modalRowValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  modalContribution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  modalContributionLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    marginRight: spacing.sm,
  },
  modalContributionValue: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  modalEmpty: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  modalCloseButton: {
    marginTop: spacing['xl'],
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
