/**
 * LinkedIn Page Analyzer - Content Script
 * Analyzes LinkedIn job pages and extracts relevant information
 */

class LinkedInAnalyzer {
  constructor() {
    this.observers = new Map();
    this.jobCache = new Map();
    this.init();
  }

  init() {
    this.setupMutationObserver();
    this.injectAnalysisUI();
    this.setupMessageListeners();
  }

  /**
   * Setup MutationObserver to detect dynamic content changes
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      this.handlePageChanges(mutations);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-job-id']
    });

    this.observers.set('main', observer);
  }

  /**
   * Handle page changes and trigger appropriate analysis
   */
  handlePageChanges(mutations) {
    const url = window.location.href;
    
    if (url.includes('/jobs/search/')) {
      this.analyzeJobListings();
    } else if (url.includes('/jobs/view/')) {
      this.analyzeJobDetail();
    } else if (url.includes('/jobs/application/')) {
      this.analyzeApplicationForm();
    }
  }

  /**
   * Analyze job listings on search results page
   */
  analyzeJobListings() {
    const jobCards = document.querySelectorAll('[data-job-id], .job-card-container, li[data-occludable-job-id]');
    const jobs = [];

    jobCards.forEach(card => {
      const job = this.extractJobFromCard(card);
      if (job && !this.jobCache.has(job.id)) {
        this.jobCache.set(job.id, job);
        jobs.push(job);
      }
    });

    if (jobs.length > 0) {
      this.sendMessage('JOBS_FOUND', { jobs });
    }
  }

  /**
   * Extract job information from a job card element
   */
  extractJobFromCard(card) {
    try {
      const jobId = card.getAttribute('data-job-id') || 
                   card.getAttribute('data-occludable-job-id') ||
                   card.querySelector('[data-job-id]')?.getAttribute('data-job-id');
      
      if (!jobId) return null;

      // Title extraction
      const titleElement = card.querySelector('.job-card-list__title, [class*="job-card-list__title"], a[id*="job-title"]');
      const title = titleElement?.textContent?.trim() || '';

      // Company extraction
      const companyElement = card.querySelector('.job-card-container__company-name, [class*="company-name"], a[data-control-name="company_link"]');
      const company = companyElement?.textContent?.trim() || '';

      // Location extraction
      const locationElement = card.querySelector('.job-card-container__metadata-item, [class*="job-card-list__location"], .job-card-container__metadata-wrapper');
      const location = this.extractLocation(locationElement?.textContent?.trim() || '');

      // Remote work detection
      const isRemote = this.detectRemoteWork(card);

      // Salary extraction
      const salary = this.extractSalary(card);

      // Easy Apply detection
      const isEasyApply = !!card.querySelector('.job-card-container__apply-method--easy-apply, [class*="easy-apply"], span:contains("Easy Apply")');

      // Posted date
      const postedElement = card.querySelector('time, [class*="posted-date"]');
      const postedDate = this.parsePostedDate(postedElement?.textContent?.trim() || '');

      // Applicants count
      const applicantsElement = card.querySelector('[class*="applicant-count"], [class*="num-applicants"]');
      const applicants = this.parseApplicantCount(applicantsElement?.textContent?.trim() || '');

      return {
        id: jobId,
        url: `https://www.linkedin.com/jobs/view/${jobId}/`,
        title,
        company,
        location: location.city,
        isRemote: isRemote || location.isRemote,
        salary,
        postedDate,
        applicants,
        isEasyApply,
        description: '', // Will be filled when job detail is loaded
        requirements: [],
        benefits: []
      };
    } catch (error) {
      console.error('Error extracting job from card:', error);
      return null;
    }
  }

  /**
   * Analyze detailed job page
   */
  async analyzeJobDetail() {
    await this.waitForElement('.jobs-description, [class*="jobs-description"]', 5000);
    
    const jobId = this.extractJobIdFromUrl();
    if (!jobId) return;

    const job = this.jobCache.get(jobId) || { id: jobId };

    // Update job with detailed information
    const descriptionElement = document.querySelector('.jobs-description__content, [class*="description"]');
    if (descriptionElement) {
      job.description = descriptionElement.textContent?.trim() || '';
      job.requirements = this.extractRequirements(job.description);
      job.benefits = this.extractBenefits(job.description);
    }

    // Extract additional details
    const criteriaList = document.querySelectorAll('.jobs-unified-top-card__job-insight, [class*="job-criteria"]');
    criteriaList.forEach(criteria => {
      const label = criteria.querySelector('h3, .jobs-unified-top-card__job-insight-view-model-secondary')?.textContent?.trim().toLowerCase();
      const value = criteria.querySelector('span:not([class*="label"])')?.textContent?.trim();
      
      if (label && value) {
        if (label.includes('seniority') || label.includes('experience')) {
          job.experienceLevel = this.parseExperienceLevel(value);
        } else if (label.includes('employment') || label.includes('job type')) {
          job.jobType = this.parseJobType(value);
        } else if (label.includes('industry')) {
          job.industry = value;
        }
      }
    });

    // Get company size if available
    const companyLink = document.querySelector('.jobs-unified-top-card__company-name a, [class*="company-name"] a');
    if (companyLink) {
      job.companyUrl = companyLink.href;
      job.companySize = await this.fetchCompanySize(companyLink.href);
    }

    this.jobCache.set(jobId, job);
    this.sendMessage('JOB_DETAIL_ANALYZED', { job });
  }

  /**
   * Analyze application form structure
   */
  analyzeApplicationForm() {
    const formFields = [];
    const formElements = document.querySelectorAll('input, select, textarea, [role="combobox"]');
    
    formElements.forEach(element => {
      const field = this.extractFormField(element);
      if (field) {
        formFields.push(field);
      }
    });

    // Check for file upload fields
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      const label = this.findFieldLabel(input);
      formFields.push({
        id: input.id || input.name,
        name: input.name,
        type: 'file',
        label: label,
        required: input.hasAttribute('required') || input.hasAttribute('aria-required'),
        accept: input.accept
      });
    });

    // Check for multi-step form
    const steps = document.querySelectorAll('[class*="application-form-steps"], [class*="progress"]');
    const isMultiStep = steps.length > 0;
    const currentStep = this.getCurrentFormStep();

    this.sendMessage('FORM_ANALYZED', { 
      formFields, 
      isMultiStep,
      currentStep,
      totalSteps: steps.length
    });
  }

  /**
   * Extract form field information
   */
  extractFormField(element) {
    const field = {
      id: element.id || element.name || element.getAttribute('aria-labelledby'),
      name: element.name || element.id,
      type: element.type || element.tagName.toLowerCase(),
      label: this.findFieldLabel(element),
      required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
      value: element.value
    };

    // Extract select options
    if (element.tagName === 'SELECT') {
      field.options = Array.from(element.options).map(option => ({
        value: option.value,
        label: option.textContent.trim()
      }));
    }

    // Extract validation rules
    field.validation = {
      pattern: element.pattern,
      minLength: element.minLength,
      maxLength: element.maxLength,
      min: element.min,
      max: element.max
    };

    return field;
  }

  /**
   * Find label for a form field
   */
  findFieldLabel(element) {
    // Try direct label
    const labelFor = element.id ? document.querySelector(`label[for="${element.id}"]`) : null;
    if (labelFor) return labelFor.textContent.trim();

    // Try aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const label = document.getElementById(labelledBy);
      if (label) return label.textContent.trim();
    }

    // Try parent label
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();

    // Try adjacent text
    const previousSibling = element.previousElementSibling;
    if (previousSibling && (previousSibling.tagName === 'LABEL' || previousSibling.tagName === 'SPAN')) {
      return previousSibling.textContent.trim();
    }

    // Try placeholder as fallback
    return element.placeholder || element.getAttribute('aria-label') || '';
  }

  /**
   * Detect remote work from job card
   */
  detectRemoteWork(card) {
    const text = card.textContent.toLowerCase();
    const remoteKeywords = ['remote', 'work from home', 'wfh', 'distributed', 'anywhere', 'telecommute'];
    return remoteKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Extract location information
   */
  extractLocation(locationText) {
    const isRemote = /remote|anywhere|wfh/i.test(locationText);
    const parts = locationText.split(/[,·]/);
    const city = parts[0]?.trim() || '';
    const state = parts[1]?.trim() || '';
    const country = parts[2]?.trim() || '';

    return { city, state, country, isRemote, full: locationText };
  }

  /**
   * Extract salary information
   */
  extractSalary(card) {
    const salaryElement = card.querySelector('[class*="salary"], [class*="compensation"]');
    if (!salaryElement) return null;

    const salaryText = salaryElement.textContent.trim();
    const salaryMatch = salaryText.match(/\$?([\d,]+)k?\s*-?\s*\$?([\d,]+)k?/i);
    
    if (salaryMatch) {
      const min = parseFloat(salaryMatch[1].replace(',', '')) * (salaryText.includes('k') ? 1000 : 1);
      const max = salaryMatch[2] ? parseFloat(salaryMatch[2].replace(',', '')) * (salaryText.includes('k') ? 1000 : 1) : min;
      const period = salaryText.toLowerCase().includes('hour') ? 'hourly' : 'yearly';
      
      return { min, max, currency: 'USD', period };
    }

    return null;
  }

  /**
   * Parse posted date text
   */
  parsePostedDate(dateText) {
    const now = new Date();
    
    if (dateText.includes('minute')) {
      const minutes = parseInt(dateText.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - minutes * 60000);
    } else if (dateText.includes('hour')) {
      const hours = parseInt(dateText.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - hours * 3600000);
    } else if (dateText.includes('day')) {
      const days = parseInt(dateText.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - days * 86400000);
    } else if (dateText.includes('week')) {
      const weeks = parseInt(dateText.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - weeks * 604800000);
    } else if (dateText.includes('month')) {
      const months = parseInt(dateText.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - months * 2592000000);
    }
    
    return now;
  }

  /**
   * Parse applicant count text
   */
  parseApplicantCount(text) {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  /**
   * Parse experience level
   */
  parseExperienceLevel(text) {
    const lower = text.toLowerCase();
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('entry') || lower.includes('junior')) return 'entry';
    if (lower.includes('associate')) return 'associate';
    if (lower.includes('mid') || lower.includes('intermediate')) return 'mid';
    if (lower.includes('senior') || lower.includes('lead')) return 'senior';
    if (lower.includes('executive') || lower.includes('vp')) return 'executive';
    if (lower.includes('director')) return 'director';
    return 'mid';
  }

  /**
   * Parse job type
   */
  parseJobType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('full-time') || lower.includes('full time')) return 'full-time';
    if (lower.includes('part-time') || lower.includes('part time')) return 'part-time';
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('temporary') || lower.includes('temp')) return 'temporary';
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('volunteer')) return 'volunteer';
    return 'full-time';
  }

  /**
   * Extract requirements from job description
   */
  extractRequirements(description) {
    const requirements = [];
    const sections = description.split(/\n\n|\n•|\n-/);
    
    sections.forEach(section => {
      if (/requirements|qualifications|must have|required/i.test(section)) {
        const items = section.split(/\n/).filter(line => line.trim().length > 10);
        requirements.push(...items.map(item => item.replace(/^[•\-\*]\s*/, '').trim()));
      }
    });

    return requirements.slice(0, 10); // Limit to 10 requirements
  }

  /**
   * Extract benefits from job description
   */
  extractBenefits(description) {
    const benefits = [];
    const sections = description.split(/\n\n|\n•|\n-/);
    
    sections.forEach(section => {
      if (/benefits|perks|we offer|what we offer/i.test(section)) {
        const items = section.split(/\n/).filter(line => line.trim().length > 10);
        benefits.push(...items.map(item => item.replace(/^[•\-\*]\s*/, '').trim()));
      }
    });

    return benefits.slice(0, 10); // Limit to 10 benefits
  }

  /**
   * Extract job ID from current URL
   */
  extractJobIdFromUrl() {
    const match = window.location.href.match(/\/jobs\/view\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Get current form step
   */
  getCurrentFormStep() {
    const stepIndicator = document.querySelector('[class*="current-step"], [aria-current="step"]');
    if (stepIndicator) {
      const stepText = stepIndicator.textContent.trim();
      const stepMatch = stepText.match(/\d+/);
      return stepMatch ? parseInt(stepMatch[0]) : 1;
    }
    return 1;
  }

  /**
   * Wait for element to appear
   */
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Inject analysis UI overlay
   */
  injectAnalysisUI() {
    const overlay = document.createElement('div');
    overlay.id = 'linkedin-auto-apply-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      display: none;
      max-width: 300px;
    `;
    
    overlay.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #28a745; margin-right: 8px;"></div>
        <strong>Auto-Apply Active</strong>
      </div>
      <div id="analysis-status" style="font-size: 14px; color: #666;"></div>
      <div id="analysis-stats" style="margin-top: 8px; font-size: 12px;"></div>
    `;
    
    document.body.appendChild(overlay);
  }

  /**
   * Update analysis UI
   */
  updateAnalysisUI(status, stats) {
    const overlay = document.getElementById('linkedin-auto-apply-overlay');
    const statusElement = document.getElementById('analysis-status');
    const statsElement = document.getElementById('analysis-stats');
    
    if (overlay && statusElement) {
      overlay.style.display = 'block';
      statusElement.textContent = status;
      
      if (stats && statsElement) {
        statsElement.innerHTML = `
          Jobs found: ${stats.jobsFound || 0}<br>
          Matches: ${stats.matches || 0}<br>
          Applied: ${stats.applied || 0}
        `;
      }
    }
  }

  /**
   * Setup message listeners for communication with background script
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case 'ANALYZE_PAGE':
          this.handlePageChanges([]);
          sendResponse({ success: true });
          break;
          
        case 'GET_JOB_DETAILS':
          const job = this.jobCache.get(request.jobId);
          sendResponse({ job });
          break;
          
        case 'GET_ALL_JOBS':
          const jobs = Array.from(this.jobCache.values());
          sendResponse({ jobs });
          break;
          
        case 'UPDATE_UI':
          this.updateAnalysisUI(request.status, request.stats);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
      
      return true; // Keep message channel open for async response
    });
  }

  /**
   * Send message to background script
   */
  sendMessage(type, payload) {
    chrome.runtime.sendMessage({ type, payload }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
      }
    });
  }

  /**
   * Fetch company size from company page
   */
  async fetchCompanySize(companyUrl) {
    // This would require additional navigation or API call
    // For now, return a placeholder
    return 'medium';
  }
}

// Initialize the analyzer when the content script loads
const linkedInAnalyzer = new LinkedInAnalyzer();

// Export for use in other content scripts
window.linkedInAnalyzer = linkedInAnalyzer;