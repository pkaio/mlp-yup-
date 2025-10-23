import api from './api';

export const userService = {
  // Get recent users
  getRecentUsers: async (limit = 6) => {
    try {
      const response = await api.get(`/users/recent`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getXpLog: async (userId, limit = 10) => {
    try {
      const response = await api.get(`/users/${userId}/xp-log?limit=${limit}`);
      return response.data?.log ?? [];
    } catch (error) {
      console.warn('Erro ao buscar histórico de XP:', error?.message || error);
      return [];
    }
  },

  getXpLeaderboard: async (limit = 20) => {
    try {
      const response = await api.get(`/users/xp/leaderboard?limit=${limit}`);
      return response.data?.leaderboard ?? [];
    } catch (error) {
      console.warn('Erro ao buscar leaderboard de XP:', error?.message || error);
      return [];
    }
  },

  // Get user stats
  getUserStats: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/stats`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Search users
  searchUsers: async (query, page = 1, limit = 10) => {
    try {
      const response = await api.get(`/users/search/${query}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update profile image
  updateProfileImage: async (imageUrl) => {
    try {
      const response = await api.put('/users/profile-image', { imageUrl });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },
};
