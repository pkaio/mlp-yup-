import api from './api';

export const parkService = {
  // Get all parks
  getParks: async () => {
    try {
      const response = await api.get('/parks');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get park by ID
  getPark: async (parkId) => {
    try {
      const response = await api.get(`/parks/${parkId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get obstacles
  getObstacles: async () => {
    try {
      const response = await api.get('/parks/obstacles');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Check-in to park
  checkin: async (parkId, videoId = null) => {
    try {
      const response = await api.post(`/parks/${parkId}/checkin`, { videoId });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },

  // Get nearby parks
  getNearbyParks: async (latitude, longitude, radius = 200) => {
    try {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error('Coordenadas inválidas para consulta de parques próximos.');
      }

      const parsedRadius = Number(radius);
      const sanitizedRadius = Math.max(1, Math.min(Number.isFinite(parsedRadius) ? parsedRadius : 200, 500));
      const latParam = lat.toFixed(6);
      const lngParam = lng.toFixed(6);

      const response = await api.get(`/parks/nearby/${latParam}/${lngParam}?radius=${sanitizedRadius}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get obstacles for a specific park
  getParkObstacles: async (parkId) => {
    try {
      const response = await api.get(`/parks/${parkId}/obstacles`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get park leaderboard
  getParkLeaderboard: async (parkId, period = 'all') => {
    try {
      const response = await api.get(`/parks/${parkId}/leaderboard?period=${period}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
