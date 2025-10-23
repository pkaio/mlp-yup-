import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import VideoCard from '../components/VideoCard';
import { videoService } from '../services/videoService';
import { colors, spacing, typography } from '../theme/tokens';

const { height } = Dimensions.get('window');

export default function FeedScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const insets = useSafeAreaInsets();
  const listPaddingBottom = insets.bottom;

  const loadVideos = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

        const response = await videoService.getFeed(pageNum, 10);

        if (pageNum === 1) {
          const nextVideos = response.videos ?? [];
          setVideos(nextVideos);
          setActiveVideoId(nextVideos[0]?.id ?? null);
        } else {
          setVideos((prev) => [...prev, ...(response.videos ?? [])]);
        }

        setHasMore(Boolean(response.pagination?.hasMore));
      setPage(pageNum);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os vídeos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadInitial = async () => {
        const cached = await videoService.getFeed(1, 10);
        if (cached?.videos) {
          setVideos(cached.videos);
          setActiveVideoId(cached.videos[0]?.id ?? null);
          setHasMore(Boolean(cached.pagination?.hasMore));
        }
        loadVideos(1, true);
      };

      loadInitial();
      return () => {
        setActiveVideoId(null);
      };
    }, [loadVideos])
  );

  const handleRefresh = useCallback(() => {
    loadVideos(1, true);
  }, [loadVideos]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !refreshing) {
      loadVideos(page + 1);
    }
  }, [loading, hasMore, refreshing, loadVideos, page]);

  const handleLike = useCallback(async (videoId) => {
    try {
      const result = await videoService.likeVideo(videoId);
      if (result.error) {
        Alert.alert('Erro', result.error);
        return;
      }

      setVideos((prev) =>
        prev.map((item) => {
          if (item.id !== videoId) return item;

          const currentLikes = item.likes_count || 0;
          const fallbackLikes = result.liked
            ? currentLikes + 1
            : Math.max(currentLikes - 1, 0);

          return {
            ...item,
            likes_count:
              typeof result.likes_count === 'number'
                ? result.likes_count
                : fallbackLikes,
            user_liked: result.liked,
          };
        })
      );
    } catch (error) {
      console.error('Erro ao curtir vídeo:', error);
      Alert.alert('Erro', 'Não foi possível curtir o vídeo');
    }
  }, []);

  const handleComment = useCallback(
    (videoId) => {
      navigation.navigate('VideoPlayer', { videoId, showComments: true });
    },
    [navigation]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 300,
  });

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const topItem = viewableItems[0]?.item;
      if (topItem?.id) {
        setActiveVideoId(topItem.id);
      }
    }
  });

  const renderVideo = useCallback(
    ({ item }) => (
      <VideoCard
        video={item}
        onLike={handleLike}
        onComment={handleComment}
        isActive={item.id === activeVideoId}
      />
    ),
    [handleLike, handleComment, activeVideoId]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum vídeo encontrado</Text>
        <Text style={styles.emptySubtext}>
          Siga atletas e parques para ver vídeos aqui.
        </Text>
      </View>
    );
  }, [loading]);

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['left', 'right']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={videos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderVideo}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        windowSize={5}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        pagingEnabled
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={height}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={renderEmpty}
        style={styles.list}
        contentContainerStyle={
          videos.length === 0
            ? [styles.emptyList, { paddingBottom: listPaddingBottom }]
            : { paddingBottom: listPaddingBottom }
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['3xl'] * 2,
  },
  emptyText: {
    fontSize: typography.sizes['xl'],
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes['xl'],
  },
  emptyList: {
    flex: 1,
  },
});
