import api from './api';

export const authService = {
  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return null; // Not authenticated
      }
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
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

  // Verify email with code
  verifyEmail: async (email, code) => {
    try {
      const response = await api.post('/auth/verify-email', { email, code });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },

  // Resend verification code
  resendVerification: async (email) => {
    try {
      const response = await api.post('/auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },
};
