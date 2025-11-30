import api from './api';

/**
 * Skill Tree Service
 * Generic service for managing skill tree grid data across all specializations
 * (Surface, Kicker, Slider)
 */
export const skillTreeService = {
  /**
   * Get skill tree grid for a specific specialization
   * @param {string} specialization - 'surface', 'kicker', or 'slider'
   * @returns {Promise<Object>} Grid data with rows organized by display_row
   */
  async getSkillTreeGrid(specialization) {
    try {
      const response = await api.get(`/skill-tree/${specialization}/grid`);
      return response.data?.skillTree || null;
    } catch (error) {
      // If specialization doesn't have data yet, return empty structure
      if (error.response?.status === 404 || error.response?.data?.error) {
        return {
          specialization,
          layout: 'grid',
          rows: [],
          totalNodes: 0,
          completedNodes: 0,
          sharedNodes: [],
          isEmpty: true
        };
      }
      throw error;
    }
  },

  /**
   * Get skill tree for a specific specialization (legacy tier-based view)
   * @param {string} specialization - 'surface', 'kicker', or 'slider'
   * @returns {Promise<Object>} Tier-based tree data
   */
  async getSkillTree(specialization) {
    try {
      const response = await api.get(`/skill-tree/${specialization}`);
      return response.data?.skillTree || null;
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          specialization,
          tiers: [],
          isEmpty: true
        };
      }
      throw error;
    }
  },

  /**
   * Get details for a specific node
   * @param {string} nodeId - Node UUID
   * @returns {Promise<Object>} Node details
   */
  async getNodeDetails(nodeId) {
    try {
      const response = await api.get(`/skill-tree/node/${nodeId}`);
      return response.data?.node || null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Complete a quest (skill tree node)
   * @param {string} nodeId - Node UUID
   * @param {string} videoId - Video ID that completes the quest
   * @returns {Promise<Object>} Completion result with XP rewards
   */
  async completeQuest(nodeId, videoId) {
    try {
      const response = await api.post(`/skill-tree/complete`, {
        nodeId,
        videoId
      });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        return { error: error.response.data.error };
      }
      throw error;
    }
  },

  /**
   * Get recommended quests for the user
   * @param {number} limit - Maximum number of recommendations
   * @returns {Promise<Array>} Array of recommended quest nodes
   */
  async getRecommendedQuests(limit = 5) {
    try {
      const response = await api.get(`/skill-tree/recommended?limit=${limit}`);
      return response.data?.quests || [];
    } catch (error) {
      console.warn('Error fetching recommended quests:', error);
      return [];
    }
  },

  /**
   * Get quest completion history
   * @param {string} nodeId - Optional node ID to filter history
   * @returns {Promise<Array>} Quest completion history
   */
  async getQuestHistory(nodeId = null) {
    try {
      const endpoint = nodeId
        ? `/skill-tree/history?nodeId=${nodeId}`
        : `/skill-tree/history`;
      const response = await api.get(endpoint);
      return response.data?.history || [];
    } catch (error) {
      console.warn('Error fetching quest history:', error);
      return [];
    }
  },

  /**
   * Get all specializations with their progress
   * @returns {Promise<Array>} Array of specializations with stats
   */
  async getAllSpecializationProgress() {
    try {
      const [surface, kicker, slider] = await Promise.all([
        this.getSkillTreeGrid('surface'),
        this.getSkillTreeGrid('kicker'),
        this.getSkillTreeGrid('slider')
      ]);

      return [
        {
          type: 'surface',
          name: 'Surface',
          icon: '🌊',
          ...this.getProgressStats(surface)
        },
        {
          type: 'kicker',
          name: 'Kicker',
          icon: '🚀',
          ...this.getProgressStats(kicker)
        },
        {
          type: 'slider',
          name: 'Slider',
          icon: '🛹',
          ...this.getProgressStats(slider)
        }
      ];
    } catch (error) {
      console.warn('Error fetching specialization progress:', error);
      return [];
    }
  },

  /**
   * Calculate progress statistics from skill tree data
   * @param {Object} skillTree - Skill tree data
   * @returns {Object} Progress statistics
   */
  getProgressStats(skillTree) {
    if (!skillTree || skillTree.isEmpty) {
      return {
        totalNodes: 0,
        completedNodes: 0,
        availableNodes: 0,
        lockedNodes: 0,
        completionPercentage: 0,
        isEmpty: true
      };
    }

    const totalNodes = skillTree.totalNodes || 0;
    const completedNodes = skillTree.completedNodes || 0;

    // Count available and locked nodes from rows
    let availableNodes = 0;
    let lockedNodes = 0;

    if (skillTree.rows && Array.isArray(skillTree.rows)) {
      skillTree.rows.forEach(row => {
        ['spin', 'merge', 'ollie'].forEach(branch => {
          const node = row[branch];
          if (node) {
            if (node.userProgress?.status === 'available') {
              availableNodes++;
            } else if (node.userProgress?.status === 'locked') {
              lockedNodes++;
            }
          }
        });
      });
    }

    return {
      totalNodes,
      completedNodes,
      availableNodes,
      lockedNodes,
      completionPercentage: totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0,
      isEmpty: false
    };
  }
};
