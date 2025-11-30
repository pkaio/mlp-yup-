import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { videoService } from '../services/videoService';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing, typography } from '../theme/tokens';
const Icon = MaterialIcons;

export default function VideoPlayerScreen({ route, navigation }) {
  const {
    videoId,
    showComments = false,
    video: initialVideo = null,
  } = route.params;
  const { user } = useAuth();
  const videoRef = useRef(null);
  const { width, height } = useWindowDimensions();

  const [video, setVideo] = useState(initialVideo);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(!initialVideo);
  const [videoLoading, setVideoLoading] = useState(!initialVideo);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(showComments);

  // Calculate responsive video height
  const videoHeight = Platform.OS === 'web'
    ? Math.min(height * 0.6, width * (16/9)) // Web: max 60% of screen height or 16:9 aspect ratio
    : Math.min(height * 0.4, 500); // Native: max 40% of screen height or 500px

  const maneuverMeta = video?.score_breakdown?.xp?.maneuver || {};
  const maneuverName = (maneuverMeta.name || video?.maneuver_name || video?.trick || video?.trick_name || '').trim();
  const maneuverType = typeof maneuverMeta.type === 'string' && maneuverMeta.type
    ? maneuverMeta.type.toUpperCase()
    : null;

  useEffect(() => {
    if (initialVideo) {
      setVideo(initialVideo);
      setLoading(false);
      setVideoLoading(false);
    } else {
      setLoading(true);
      setVideoLoading(true);
    }
    loadVideo(!initialVideo);
    loadComments();
  }, [videoId]);

  const loadVideo = async (showLoader = true) => {
    try {
      if (showLoader) {
        setVideoLoading(true);
      }
      const response = await videoService.getVideoById(videoId);
      const fetchedVideo = response?.video ?? response;

      if (!fetchedVideo?.id) {
        throw new Error('Vídeo indisponível');
      }

      setVideo(fetchedVideo);
    } catch (error) {
      console.error('Erro ao carregar vídeo:', error);
      Alert.alert('Erro', 'Não foi possível carregar o vídeo');
    } finally {
      setLoading(false);
      setVideoLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await videoService.getComments(videoId);
      setComments(response.comments || []);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    }
  };

  const handleLike = async () => {
    try {
      const result = await videoService.likeVideo(videoId);
      if (result.error) {
        Alert.alert('Erro', result.error);
        return;
      }

      setVideo(prev => {
        if (!prev) {
          return prev;
        }

        const currentLikes = prev.likes_count || 0;
        const fallbackLikes = result.liked
          ? currentLikes + 1
          : Math.max(currentLikes - 1, 0);

        return {
          ...prev,
          likes_count: typeof result.likes_count === 'number' ? result.likes_count : fallbackLikes,
          user_liked: result.liked
        };
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível curtir o vídeo');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Erro', 'O comentário não pode estar vazio');
      return;
    }

    try {
      const result = await videoService.commentVideo(videoId, newComment);
      if (result.error) {
        Alert.alert('Erro', result.error);
        return;
      }

      setComments(prev => [result.comment, ...prev]);
      setNewComment('');
      setVideo(prev => {
        if (!prev) {
          return prev;
        }

        const currentComments = prev.comments_count || 0;

        return {
          ...prev,
          comments_count: typeof result.comments_count === 'number'
            ? result.comments_count
            : currentComments + 1
        };
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o comentário');
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'agora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentUserInfo}>
          <Text style={styles.commentUsername}>
            {item.user?.full_name || item.user?.username}
          </Text>
          <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.videoContainer, { height: videoHeight }]}>
          {video && (
            <Video
              ref={videoRef}
              source={{ uri: video.video_url }}
              style={styles.video}
              resizeMode={Platform.OS === 'web' ? 'contain' : 'cover'}
              shouldPlay
              isLooping
              onLoad={() => {
                setVideoLoading(false);
                setIsPlaying(true);
              }}
              onError={(error) => {
                console.error('Video error:', error);
                setVideoLoading(false);
              }}
            />
          )}
          
          {videoLoading && (
            <View style={styles.videoLoading}>
              <ActivityIndicator size="large" color={colors.textPrimary} />
            </View>
          )}

          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={togglePlayPause}
          >
            <Icon
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={32}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.videoInfo}>
          <View style={styles.userInfo}>
            <Text style={styles.username}>
              {video?.user?.full_name || video?.user?.username}
            </Text>
            <Text style={styles.timeAgo}>
              {video && formatTimeAgo(video.created_at)}
            </Text>
          </View>

          {maneuverName ? (
            <View style={styles.maneuverInfo}>
              <MaterialIcons name="insights" size={16} color={colors.primary} />
              <View style={styles.maneuverInfoCopy}>
                {maneuverType ? (
                  <Text style={styles.maneuverType}>{maneuverType}</Text>
                ) : null}
                <Text style={styles.maneuverName}>{maneuverName}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <MaterialIcons name="favorite-border" size={24} color={colors.textSecondary} />
              <Text style={styles.actionText}>{video?.likes_count || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowCommentInput(!showCommentInput)}
            >
              <MaterialIcons name="comment" size={24} color={colors.textSecondary} />
              <Text style={styles.actionText}>{video?.comments_count || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="share" size={24} color={colors.textSecondary} />
              <Text style={styles.actionText}>Compartilhar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showCommentInput && (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Adicione um comentário..."
              placeholderTextColor={colors.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.postButton, !newComment.trim() && styles.disabledButton]}
              onPress={handleComment}
              disabled={!newComment.trim()}
            >
              <MaterialIcons name="send" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.commentsList}
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>
                Seja o primeiro a comentar!
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  videoContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 800 : undefined,
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  playPauseButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -28,
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(13,13,13,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing['2xl'],
    right: spacing['2xl'],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13,13,13,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['2xl'],
    gap: spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  timeAgo: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  maneuverInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  maneuverInfoCopy: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  maneuverType: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  maneuverName: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  commentInput: {
    flex: 1,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    maxHeight: 100,
  },
  postButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: colors.textSecondary,
    opacity: 0.4,
  },
  commentsList: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  commentItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentUsername: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  commentTime: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  commentContent: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.md,
  },
  emptyComments: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  emptyCommentsText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
});
