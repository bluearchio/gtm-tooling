/**
 * Filter Engine
 * Handles job filtering and matching logic
 */

class FilterEngine {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  /**
   * Load configuration from storage
   */
  async loadConfig() {
    try {
      const result = await chrome.storage.local.get('config');
      this.config = result.config || this.getDefaultConfig();
    } catch (error) {
      console.error('Error loading filter config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      filters: {
        isRemote: 'any',
        keywords: [],
        keywordLogic: 'OR',
        experienceLevel: 'any',
        jobType: ['full-time'],
        postedWithin: 7,
        salaryMin: null,
        excludeCompanies: []
      }
    };
  }

  /**
   * Check if a job matches the filters
   * @param {Object} job - Job details object
   * @returns {Object} - Match result with score and reasons
   */
  matchJob(job) {
    const filters = this.config.filters;
    let score = 0;
    let maxScore = 0;
    const reasons = [];
    const failedFilters = [];

    // Remote filter (20 points)
    if (filters.isRemote !== 'any') {
      maxScore += 20;
      if (filters.isRemote === 'yes' && job.isRemote) {
        score += 20;
        reasons.push('Remote position');
      } else if (filters.isRemote === 'no' && !job.isRemote) {
        score += 20;
        reasons.push('On-site position');
      } else {
        failedFilters.push('Remote preference not matched');
      }
    }

    // Keywords filter (40 points)
    if (filters.keywords && filters.keywords.length > 0) {
      maxScore += 40;
      const keywordResult = this.matchKeywords(job, filters.keywords, filters.keywordLogic);
      
      if (keywordResult.matched) {
        score += 40 * keywordResult.matchRatio;
        reasons.push(`Matches keywords: ${keywordResult.matchedKeywords.join(', ')}`);
      } else {
        failedFilters.push('Keywords not matched');
      }
    }

    // Experience level filter (15 points)
    if (filters.experienceLevel !== 'any') {
      maxScore += 15;
      if (job.experienceLevel === filters.experienceLevel) {
        score += 15;
        reasons.push(`Matches experience level: ${filters.experienceLevel}`);
      } else {
        failedFilters.push('Experience level not matched');
      }
    }

    // Job type filter (10 points)
    if (filters.jobType && filters.jobType.length > 0) {
      maxScore += 10;
      if (filters.jobType.includes(job.jobType)) {
        score += 10;
        reasons.push(`Job type: ${job.jobType}`);
      } else {
        failedFilters.push('Job type not matched');
      }
    }

    // Posted within filter (10 points)
    if (filters.postedWithin) {
      maxScore += 10;
      const daysAgo = this.getDaysAgo(job.postedDate);
      
      if (daysAgo <= filters.postedWithin) {
        score += 10 * ((filters.postedWithin - daysAgo) / filters.postedWithin);
        reasons.push(`Posted ${daysAgo} days ago`);
      } else {
        failedFilters.push('Posted too long ago');
      }
    }

    // Salary filter (5 points)
    if (filters.salaryMin && job.salary) {
      maxScore += 5;
      if (job.salary.max >= filters.salaryMin) {
        score += 5;
        reasons.push('Meets salary requirements');
      } else {
        failedFilters.push('Below minimum salary');
      }
    }

    // Exclude companies (veto)
    if (filters.excludeCompanies && filters.excludeCompanies.length > 0) {
      const companyExcluded = filters.excludeCompanies.some(company => 
        job.company.toLowerCase().includes(company.toLowerCase())
      );
      
      if (companyExcluded) {
        return {
          matches: false,
          score: 0,
          reasons: [],
          failedFilters: ['Company is in exclusion list']
        };
      }
    }

    // Easy Apply bonus (not part of filter, but adds to score)
    if (job.isEasyApply) {
      reasons.push('Easy Apply available');
    }

    // Calculate final match
    const matchScore = maxScore > 0 ? (score / maxScore) : 0;
    const matches = matchScore >= 0.5; // 50% threshold

    return {
      matches,
      score: matchScore,
      reasons,
      failedFilters
    };
  }

  /**
   * Match keywords in job
   * @param {Object} job - Job details
   * @param {Array} keywords - Keywords to match
   * @param {String} logic - 'AND' or 'OR'
   * @returns {Object} - Keyword match result
   */
  matchKeywords(job, keywords, logic) {
    const jobText = this.getJobSearchText(job).toLowerCase();
    const matchedKeywords = [];
    
    for (const keyword of keywords) {
      if (jobText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }
    
    const matched = logic === 'AND' 
      ? matchedKeywords.length === keywords.length
      : matchedKeywords.length > 0;
    
    return {
      matched,
      matchedKeywords,
      matchRatio: matchedKeywords.length / keywords.length
    };
  }

  /**
   * Get searchable text from job
   * @param {Object} job - Job details
   * @returns {String} - Combined searchable text
   */
  getJobSearchText(job) {
    return [
      job.title || '',
      job.company || '',
      job.description || '',
      job.location || '',
      (job.requirements || []).join(' '),
      (job.benefits || []).join(' ')
    ].join(' ');
  }

  /**
   * Calculate days since job was posted
   * @param {String|Date} postedDate - Posted date
   * @returns {Number} - Days ago
   */
  getDaysAgo(postedDate) {
    const posted = new Date(postedDate);
    const now = new Date();
    const diffTime = Math.abs(now - posted);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Filter a list of jobs
   * @param {Array} jobs - Array of job objects
   * @returns {Array} - Filtered and sorted jobs
   */
  filterJobs(jobs) {
    const results = [];
    
    for (const job of jobs) {
      const matchResult = this.matchJob(job);
      
      if (matchResult.matches) {
        results.push({
          ...job,
          matchScore: matchResult.score,
          matchReasons: matchResult.reasons
        });
      }
    }
    
    // Sort by match score (highest first)
    results.sort((a, b) => b.matchScore - a.matchScore);
    
    return results;
  }

  /**
   * Quick check if job should be considered
   * @param {Object} job - Job details
   * @returns {Boolean} - Whether to consider the job
   */
  quickCheck(job) {
    // Quick checks that can eliminate a job immediately
    
    // Must be Easy Apply if configured
    if (this.config.filters.easyApplyOnly && !job.isEasyApply) {
      return false;
    }
    
    // Company exclusion
    if (this.config.filters.excludeCompanies?.length > 0) {
      const excluded = this.config.filters.excludeCompanies.some(company =>
        job.company.toLowerCase().includes(company.toLowerCase())
      );
      if (excluded) return false;
    }
    
    // Posted date check
    if (this.config.filters.postedWithin) {
      const daysAgo = this.getDaysAgo(job.postedDate);
      if (daysAgo > this.config.filters.postedWithin) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get filter summary for display
   * @returns {String} - Human-readable filter summary
   */
  getFilterSummary() {
    const filters = this.config.filters;
    const summary = [];
    
    if (filters.keywords?.length > 0) {
      summary.push(`Keywords: ${filters.keywords.join(', ')}`);
    }
    
    if (filters.isRemote !== 'any') {
      summary.push(`Remote: ${filters.isRemote}`);
    }
    
    if (filters.experienceLevel !== 'any') {
      summary.push(`Experience: ${filters.experienceLevel}`);
    }
    
    if (filters.postedWithin) {
      summary.push(`Posted within ${filters.postedWithin} days`);
    }
    
    if (filters.salaryMin) {
      summary.push(`Min salary: $${filters.salaryMin.toLocaleString()}`);
    }
    
    return summary.join(' | ');
  }
}

// Make FilterEngine available globally if needed
if (typeof window !== 'undefined') {
  window.FilterEngine = FilterEngine;
}