import api from './api';

export const challengeService = {
  async getChallenges() {
    const response = await api.get('/challenges');
    return response.data?.challenges ?? [];
  },

  async getSeasons() {
    const response = await api.get('/challenges/seasons');
    return response.data?.seasons ?? [];
  },

  async getSeasonPasses(params = {}) {
    const response = await api.get('/challenges/season-passes', { params });
    return response.data?.seasonPasses ?? [];
  },

  async getMonthlyPasses(params = {}) {
    const response = await api.get('/challenges/monthly-passes', { params });
    return response.data?.monthlyPasses ?? [];
  },

  async getCompletions() {
    try {
      const response = await api.get('/challenges/completions');
      return response.data?.completions ?? [];
    } catch (error) {
      console.warn('Não foi possível carregar conclusões de desafios:', error?.response?.status);
      return [];
    }
  },
};
