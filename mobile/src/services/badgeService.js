import api from './api';

export const badgeService = {
  // Get all badges
  getBadges: async () => {
    try {
      const response = await api.get('/badges');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user's earned badges
  getUserBadges: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/badges`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get badge progress
  getBadgeProgress: async () => {
    try {
      const response = await api.get('/badges/progress');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get badges by category
  getBadgesByCategory: async (category) => {
    try {
      const response = await api.get(`/badges/category/${category}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Award badge (admin function)
  awardBadge: async (badgeId, userId, reason) => {
    try {
      const response = await api.post('/badges/award', {
        badgeId,
        userId,
        reason,
      });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },
};