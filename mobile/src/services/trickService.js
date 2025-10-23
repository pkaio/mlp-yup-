import api from './api';

export const trickService = {
  async searchTricks(search = '', limit = 12) {
    try {
      const params = new URLSearchParams();
      if (search && search.trim().length > 0) {
        params.append('search', search.trim());
      }
      params.append('limit', String(limit));

      const response = await api.get(`/tricks?${params.toString()}`);
      return response.data?.tricks ?? [];
    } catch (error) {
      console.warn('Erro ao buscar tricks:', error?.message || error);
      return [];
    }
  },

  async getTrickById(trickId) {
    try {
      const response = await api.get(`/tricks/${trickId}`);
      return response.data?.trick ?? null;
    } catch (error) {
      return null;
    }
  },
};

export default trickService;
