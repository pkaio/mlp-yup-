import api from './api';

export const notificationService = {
  getNotifications: async (page = 1, limit = 20) => {
    const res = await api.get(`/notifications?page=${page}&limit=${limit}`);
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count');
    return res.data;
  },

  markAsRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.put('/notifications/mark-all-read');
    return res.data;
  },

  getPreferences: async () => {
    const res = await api.get('/notifications/preferences');
    return res.data;
  },

  updatePreferences: async (preferences) => {
    const res = await api.put('/notifications/preferences', preferences);
    return res.data;
  },
};

