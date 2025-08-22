/**
 * Storage utility module for Chrome storage API
 */

const Storage = {
  /**
   * Get data from Chrome storage
   * @param {string|string[]} keys - Key(s) to retrieve
   * @returns {Promise<any>}
   */
  async get(keys) {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  /**
   * Set data in Chrome storage
   * @param {Object} data - Data to store
   * @returns {Promise<void>}
   */
  async set(data) {
    try {
      await chrome.storage.local.set(data);
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  },

  /**
   * Remove data from Chrome storage
   * @param {string|string[]} keys - Key(s) to remove
   * @returns {Promise<void>}
   */
  async remove(keys) {
    try {
      await chrome.storage.local.remove(keys);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw error;
    }
  },

  /**
   * Clear all data from Chrome storage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  },

  /**
   * Get user profile
   * @returns {Promise<Object>}
   */
  async getUserProfile() {
    const result = await this.get('userProfile');
    return result?.userProfile || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentTitle: '',
      currentCompany: '',
      yearsOfExperience: 0,
      linkedInUrl: '',
      city: '',
      state: '',
      country: 'United States',
      zipCode: '',
      workAuthorization: 'Authorized to work in the US',
      requireSponsorship: 'No',
      willingToRelocate: 'Yes',
      startDate: 'Immediately',
      noticePeriod: '2 weeks',
      desiredSalary: 'Negotiable',
      skills: [],
      education: [],
      resumes: [],
      coverLetterTemplates: [],
      customAnswers: []
    };
  },

  /**
   * Save user profile
   * @param {Object} profile - User profile data
   * @returns {Promise<void>}
   */
  async saveUserProfile(profile) {
    await this.set({ userProfile: profile });
  },

  /**
   * Get automation config
   * @returns {Promise<Object>}
   */
  async getConfig() {
    const result = await this.get('config');
    return result?.config || null;
  },

  /**
   * Save automation config
   * @param {Object} config - Configuration data
   * @returns {Promise<void>}
   */
  async saveConfig(config) {
    await this.set({ config });
  },

  /**
   * Get applications history
   * @returns {Promise<Array>}
   */
  async getApplications() {
    const result = await this.get('applications');
    return result?.applications || [];
  },

  /**
   * Add application to history
   * @param {Object} application - Application data
   * @returns {Promise<void>}
   */
  async addApplication(application) {
    const applications = await this.getApplications();
    applications.push(application);
    await this.set({ applications });
  },

  /**
   * Get statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    const result = await this.get('statistics');
    return result?.statistics || {
      totalApplications: 0,
      successfulApplications: 0,
      failedApplications: 0,
      skippedJobs: 0,
      averageTimePerApplication: 0,
      applicationsByDay: [],
      topCompanies: [],
      topLocations: [],
      successRate: 0,
      lastApplicationDate: null
    };
  },

  /**
   * Update statistics
   * @param {Object} stats - Statistics updates
   * @returns {Promise<void>}
   */
  async updateStatistics(stats) {
    const current = await this.getStatistics();
    const updated = { ...current, ...stats };
    await this.set({ statistics: updated });
  },

  /**
   * Get custom answers
   * @returns {Promise<Array>}
   */
  async getCustomAnswers() {
    const result = await this.get('customAnswers');
    return result?.customAnswers || [];
  },

  /**
   * Save custom answers
   * @param {Array} answers - Custom answers array
   * @returns {Promise<void>}
   */
  async saveCustomAnswers(answers) {
    await this.set({ customAnswers: answers });
  },

  /**
   * Check if applied to job
   * @param {string} jobId - Job ID to check
   * @returns {Promise<boolean>}
   */
  async hasAppliedToJob(jobId) {
    const applications = await this.getApplications();
    return applications.some(app => app.jobId === jobId);
  },

  /**
   * Get today's application count
   * @returns {Promise<number>}
   */
  async getTodayApplicationCount() {
    const applications = await this.getApplications();
    const today = new Date().toISOString().split('T')[0];
    return applications.filter(app => 
      app.appliedAt && app.appliedAt.startsWith(today)
    ).length;
  }
};

// Make available globally if in service worker context
if (typeof globalThis !== 'undefined') {
  globalThis.Storage = Storage;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}