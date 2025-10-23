import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Animated } from 'react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme/tokens';

const { width, height } = Dimensions.get('window');
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
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  const postInfoBottomOffset = insets.bottom + POST_INFO_BOTTOM_MARGIN + POST_INFO_VERTICAL_SHIFT;
  const actionsBottomOffset = insets.bottom + POST_INFO_BOTTOM_MARGIN;

  const trickLabel = getTrimmed(video?.trick ?? video?.trick_name);
  const rawDescription = getTrimmed(video?.description);
  const maneuverText = trickLabel || rawDescription || 'Compartilhe sua session com a crew.';
  const metaSegments = [];
  const timeAgo = formatTimeAgo(video?.created_at);
  if (timeAgo) metaSegments.push(timeAgo);
  if (video?.obstacle_name) metaSegments.push(video.obstacle_name);
  if (video?.park_name) metaSegments.push(video.park_name);
  const metaInfo = metaSegments.join(' • ');

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
    <TouchableOpacity
      style={styles.touchable}
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
            <Icon name="videocam-off" size={48} color="#94a3b8" />
            <Text style={styles.placeholderText}>Fonte indisponível</Text>
          </View>
        )}

        <LinearGradient colors={['rgba(13,13,13,0.75)', 'transparent']} style={styles.topGradient} />
        <LinearGradient colors={['transparent', 'rgba(13,13,13,0.92)']} style={styles.bottomGradient} />

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
              <Icon name="chat-bubble-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>{formatCount(video.comments_count)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Icon name="share" size={24} color="#FFFFFF" />
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
                  <Icon name="person" size={22} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.userText}>
                <Text style={styles.postUsername} numberOfLines={1}>
                  @{video?.username || 'rider'}
                </Text>
                {maneuverText ? (
                  <Text
                    style={styles.postDescription}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {maneuverText}
                  </Text>
                ) : null}
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
    width,
    height,
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
    height: height * 0.35,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.55,
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
  postDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: spacing.xs,
    fontWeight: typography.weights.regular,
    ...TEXT_SHADOW_STYLE,
  },
  postMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: typography.weights.medium,
    ...TEXT_SHADOW_STYLE,
  },
});
