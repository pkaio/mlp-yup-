import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const FEED_CACHE_PREFIX = 'feed_cache_page_';
const FEED_CACHE_META = 'feed_cache_meta';
const MAX_CACHE_PAGES = 3;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

const applyDisplayNameFallback = (video) => {
  if (!video) return video;
  const payloadDisplay =
    video.maneuver_payload?.displayName ||
    video.maneuver_payload?.display_name ||
    null;

  if (!video.maneuver_display_name && payloadDisplay) {
    video.maneuver_display_name = payloadDisplay;
  }

  if (!video.trick_short_name && payloadDisplay) {
    video.trick_short_name = payloadDisplay;
  }

  return video;
};

export const videoService = {
  
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiBaseUrl ||
    'http://yupapp.us-east-2.elasticbeanstalk.com/api',
  
  getToken: async () => {
    return await AsyncStorage.getItem('authToken');
  },
  // Get videos feed
  getFeed: async (page = 1, limit = 10, options = {}) => {
    const { forceRefresh = false } = options;
    const cacheKey = `${FEED_CACHE_PREFIX}${page}_${limit}`;

    const now = Date.now();
    let cachedPayload = null;

    if (!forceRefresh) {
      try {
        const stringified = await AsyncStorage.getItem(cacheKey);
        if (stringified) {
          const parsed = JSON.parse(stringified);
          if (parsed?.timestamp && now - parsed.timestamp < CACHE_TTL_MS) {
            cachedPayload = parsed.data;
          }
        }
      } catch (cacheError) {
        console.warn('Erro ao ler cache do feed:', cacheError);
      }
    }

    if (cachedPayload && !forceRefresh) {
      return { ...cachedPayload, fromCache: true };
    }

      try {
        const response = await api.get(`/videos?page=${page}&limit=${limit}`);
      const payload = response.data;

      if (Array.isArray(payload?.videos)) {
        payload.videos = payload.videos.map((video) => applyDisplayNameFallback(video));
      }

      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ timestamp: now, data: payload })
        );
        await videoService.trimFeedCache(page, limit);
      } catch (cacheWriteError) {
        console.warn('Não foi possível salvar cache do feed:', cacheWriteError);
      }

      return { ...payload, fromCache: false };
    } catch (error) {
      if (cachedPayload) {
        return { ...cachedPayload, fromCache: true, stale: true };
      }
      throw error;
    }
  },

    clearFeedCache: async () => {
    try {
      const metaString = await AsyncStorage.getItem(FEED_CACHE_META);
      if (metaString) {
        const meta = JSON.parse(metaString);
        if (Array.isArray(meta?.keys)) {
          await Promise.all(meta.keys.map((key) => AsyncStorage.removeItem(key)));
        }
      }
      await AsyncStorage.removeItem(FEED_CACHE_META);
    } catch (error) {
      console.warn('Erro ao limpar cache do feed:', error);
    }
  },

trimFeedCache: async (latestPage, limit) => {
    try {
      const metaString = await AsyncStorage.getItem(FEED_CACHE_META);
      let meta = metaString ? JSON.parse(metaString) : { keys: [] };
      meta.keys = Array.isArray(meta.keys) ? meta.keys : [];

      const currentKey = `${FEED_CACHE_PREFIX}${latestPage}_${limit}`;
      meta.keys = meta.keys.filter((key) => key !== currentKey);
      meta.keys.push(currentKey);

      if (meta.keys.length > MAX_CACHE_PAGES) {
        const keysToRemove = meta.keys.splice(0, meta.keys.length - MAX_CACHE_PAGES);
        await Promise.all(
          keysToRemove.map((key) => AsyncStorage.removeItem(key))
        );
      }

      await AsyncStorage.setItem(FEED_CACHE_META, JSON.stringify(meta));
    } catch (error) {
      console.warn('Erro ao limpar cache do feed:', error);
    }
  },

  getObstacleVideos: async (obstacleId, page = 1, limit = 10) => {
    if (!obstacleId) {
      return { videos: [], pagination: { page: 1, limit, hasMore: false } };
    }
    try {
      const response = await api.get(
        `/videos/obstacle/${obstacleId}?page=${page}&limit=${limit}`
      );
      const payload = response.data;
      if (Array.isArray(payload?.videos)) {
        payload.videos = payload.videos.map((video) => applyDisplayNameFallback(video));
      }
      return payload;
    } catch (error) {
      throw error;
    }
  },

  // Get single video
  getVideoById: async (videoId) => {
    try {
      const response = await api.get(`/videos/${videoId}`);
      return applyDisplayNameFallback(response.data);
    } catch (error) {
      throw error;
    }
  },

  // Upload video
  uploadVideo: async (videoData) => {
    try {
      const formData = new FormData();
      const clientUploadId =
        videoData.clientUploadId || `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      videoData.clientUploadId = clientUploadId;
      
      // Add video file
      if (videoData.videoFile) {
        formData.append('video', {
          uri: videoData.videoFile.uri,
          type: videoData.videoFile.type,
          name: videoData.videoFile.fileName || 'video.mp4',
        });
      }

      // Add other fields
      if (videoData.maneuverType) {
        formData.append('maneuverType', videoData.maneuverType);
      }
      if (videoData.maneuverName) {
        formData.append('maneuverName', videoData.maneuverName);
      }
      if (videoData.maneuverDisplayName) {
        formData.append('maneuverDisplayName', videoData.maneuverDisplayName);
      }
      if (videoData.trickShortName) {
        formData.append('trickShortName', videoData.trickShortName);
      }
      if (videoData.maneuverPayload) {
        formData.append('maneuverPayload', JSON.stringify(videoData.maneuverPayload));
      }
      if (videoData.expPayload) {
        formData.append('expPayload', JSON.stringify(videoData.expPayload));
      }
      if (videoData.parkId) {
        formData.append('parkId', videoData.parkId);
      }
      if (videoData.obstacleId) {
        formData.append('obstacleId', videoData.obstacleId);
      }
      if (videoData.questNodeId) {
        formData.append('questNodeId', videoData.questNodeId);
      }
      if (clientUploadId) {
        formData.append('clientUploadId', clientUploadId);
      }

      const response = await api.post('/videos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },

  // Like/unlike video
  likeVideo: async (videoId) => {
    try {
      const response = await api.post(`/videos/${videoId}/like`);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },

  // Comment on video
  commentVideo: async (videoId, content) => {
    try {
      const response = await api.post(`/videos/${videoId}/comments`, { content });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },

  // Get video comments
  getComments: async (videoId, page = 1, limit = 10) => {
    try {
      const response = await api.get(`/videos/${videoId}/comments?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user's videos
  getUserVideos: async (userId, page = 1, limit = 10) => {
    try {
      const response = await api.get(`/videos/user/${userId}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteVideo: async (videoId) => {
    try {
      const response = await api.delete(`/videos/${videoId}`);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },
};
