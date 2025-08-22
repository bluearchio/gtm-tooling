/**
 * Background Service Worker
 * Manages extension state, message passing, and automation orchestration
 */

// Storage utility functions (inlined to avoid importScripts issues)
const StorageUtils = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },
  
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },
  
  async remove(key) {
    await chrome.storage.local.remove(key);
  },
  
  async clear() {
    await chrome.storage.local.clear();
  }
};

// Global state management
const state = {
  isRunning: false,
  isPaused: false,
  currentTab: null,
  currentJob: null,
  currentStep: '',
  applicationsToday: 0,
  applicationsThisSession: 0,
  sessionStartTime: null,
  dailyLimit: 50,
  sessionLimit: 10,
  queue: [],
  errors: [],
  config: null
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('LinkedIn Auto-Apply Extension installed');
  
  // Set default configuration
  const defaultConfig = {
    enabled: true,
    mode: 'semi-auto',
    dailyLimit: 50,
    sessionLimit: 10,
    rateLimit: 15, // applications per hour
    delayBetweenActions: {
      min: 3000,
      max: 8000
    },
    workingHours: {
      enabled: false,
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York'
    },
    filters: {
      isRemote: 'any',
      keywords: ['finops', 'cloud optimization', 'cost optimization', 'aws', 'cloud'],
      keywordLogic: 'OR',
      experienceLevel: 'any',
      jobType: ['full-time'],
      postedWithin: 7
    },
    antiDetection: {
      enabled: true,
      humanizeActions: true,
      randomizeDelays: true,
      simulateMouseMovement: true,
      simulateScrolling: true,
      breakPatterns: {
        enabled: true,
        minApplications: 3,
        maxApplications: 7,
        breakDuration: 15
      },
      sessionRotation: {
        enabled: true,
        maxSessionDuration: 45
      }
    },
    notifications: {
      onApplicationSubmitted: true,
      onDailyLimitReached: true,
      onError: true,
      onSessionComplete: true,
      sound: false
    }
  };
  
  // Load existing config or set default
  const stored = await chrome.storage.local.get('config');
  if (!stored.config) {
    await chrome.storage.local.set({ config: defaultConfig });
    state.config = defaultConfig;
  } else {
    state.config = stored.config;
  }
  
  // Load application history
  await loadApplicationHistory();
  
  // Set up alarms for rate limiting
  chrome.alarms.create('rateLimitReset', { periodInMinutes: 60 });
  chrome.alarms.create('dailyReset', { periodInMinutes: 1440 }); // 24 hours
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.type);
  
  switch (request.type) {
    case 'START_AUTOMATION':
      startAutomation(request.payload).then(sendResponse);
      return true;
      
    case 'STOP_AUTOMATION':
      stopAutomation().then(sendResponse);
      return true;
      
    case 'PAUSE_AUTOMATION':
      pauseAutomation().then(sendResponse);
      return true;
      
    case 'RESUME_AUTOMATION':
      resumeAutomation().then(sendResponse);
      return true;
      
    case 'GET_STATUS':
      sendResponse(getStatus());
      break;
      
    case 'UPDATE_CONFIG':
      updateConfig(request.payload).then(sendResponse);
      return true;
      
    case 'GET_CONFIG':
      sendResponse({ config: state.config });
      break;
      
    case 'JOBS_FOUND':
      handleJobsFound(request.payload.jobs, sender.tab.id).then(sendResponse);
      return true;
      
    case 'JOB_DETAIL_ANALYZED':
      handleJobDetail(request.payload.job).then(sendResponse);
      return true;
      
    case 'FORM_ANALYZED':
      handleFormAnalysis(request.payload).then(sendResponse);
      return true;
      
    case 'APPLICATION_SUBMITTED':
      handleApplicationSubmitted(request.payload).then(sendResponse);
      return true;
      
    case 'SESSION_ROTATION_REQUIRED':
      handleSessionRotation().then(sendResponse);
      return true;
      
    case 'BREAK_STARTED':
      handleBreakStarted(request.payload).then(sendResponse);
      return true;
      
    case 'BREAK_ENDED':
      handleBreakEnded().then(sendResponse);
      return true;
      
    case 'GET_STATISTICS':
      getStatistics().then(sendResponse);
      return true;
      
    case 'EXPORT_DATA':
      exportData().then(sendResponse);
      return true;
      
    case 'ERROR':
      handleError(request.payload).then(sendResponse);
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Start automation
async function startAutomation(options = {}) {
  if (state.isRunning) {
    return { success: false, error: 'Automation already running' };
  }
  
  try {
    // Check daily limit
    if (state.applicationsToday >= state.config.dailyLimit) {
      showNotification('Daily Limit Reached', `You've reached your daily limit of ${state.config.dailyLimit} applications`);
      return { success: false, error: 'Daily limit reached' };
    }
    
    // Check working hours
    if (state.config.workingHours.enabled && !isWithinWorkingHours()) {
      return { success: false, error: 'Outside of configured working hours' };
    }
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url.includes('linkedin.com')) {
      return { success: false, error: 'Please navigate to LinkedIn jobs page' };
    }
    
    state.currentTab = tab.id;
    state.isRunning = true;
    state.isPaused = false;
    state.sessionStartTime = Date.now();
    state.applicationsThisSession = 0;
    state.errors = [];
    
    // Update icon
    await updateIcon('active');
    
    // Inject content scripts if needed
    await ensureContentScriptsInjected(tab.id);
    
    // Start analyzing the page
    await chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_PAGE' });
    
    // Start automation loop
    automationLoop();
    
    showNotification('Automation Started', 'LinkedIn Auto-Apply is now active');
    
    return { success: true, message: 'Automation started successfully' };
    
  } catch (error) {
    console.error('Error starting automation:', error);
    state.isRunning = false;
    return { success: false, error: error.message };
  }
}

// Stop automation
async function stopAutomation() {
  state.isRunning = false;
  state.isPaused = false;
  state.currentJob = null;
  state.currentStep = '';
  state.queue = [];
  
  await updateIcon('inactive');
  
  if (state.applicationsThisSession > 0) {
    showNotification('Automation Stopped', `Session complete. Applied to ${state.applicationsThisSession} jobs.`);
  }
  
  return { success: true, message: 'Automation stopped' };
}

// Pause automation
async function pauseAutomation() {
  state.isPaused = true;
  await updateIcon('paused');
  return { success: true, message: 'Automation paused' };
}

// Resume automation
async function resumeAutomation() {
  if (!state.isRunning) {
    return { success: false, error: 'Automation is not running' };
  }
  
  state.isPaused = false;
  await updateIcon('active');
  automationLoop();
  
  return { success: true, message: 'Automation resumed' };
}

// Main automation loop
async function automationLoop() {
  if (!state.isRunning || state.isPaused) {
    return;
  }
  
  try {
    // Check limits
    if (state.applicationsToday >= state.config.dailyLimit) {
      await stopAutomation();
      showNotification('Daily Limit Reached', `You've reached your daily limit of ${state.config.dailyLimit} applications`);
      return;
    }
    
    if (state.applicationsThisSession >= state.config.sessionLimit) {
      await stopAutomation();
      showNotification('Session Complete', `Session limit of ${state.config.sessionLimit} applications reached`);
      return;
    }
    
    // Process queue
    if (state.queue.length > 0) {
      const job = state.queue.shift();
      await processJob(job);
    }
    
    // Continue loop with delay
    const delay = getRandomDelay();
    setTimeout(() => automationLoop(), delay);
    
  } catch (error) {
    console.error('Error in automation loop:', error);
    state.errors.push(error.message);
    
    if (state.errors.length > 5) {
      await stopAutomation();
      showNotification('Automation Error', 'Too many errors encountered. Stopping automation.');
    } else {
      // Retry after longer delay
      setTimeout(() => automationLoop(), 10000);
    }
  }
}

// Process individual job
async function processJob(job) {
  try {
    state.currentJob = job;
    state.currentStep = 'Analyzing job';
    
    // Navigate to job page if needed
    const currentUrl = await getCurrentTabUrl();
    if (!currentUrl.includes(job.id)) {
      await chrome.tabs.update(state.currentTab, { url: job.url });
      await waitForPageLoad();
    }
    
    // Check if job matches filters
    const matchScore = await evaluateJobMatch(job);
    if (matchScore < 0.5) {
      console.log(`Job ${job.id} doesn't match criteria (score: ${matchScore})`);
      await recordSkippedJob(job, 'Low match score');
      return;
    }
    
    // Check if Easy Apply is available
    if (!job.isEasyApply) {
      console.log(`Job ${job.id} is not Easy Apply`);
      await recordSkippedJob(job, 'Not Easy Apply');
      return;
    }
    
    state.currentStep = 'Starting application';
    
    // Click Easy Apply button
    await chrome.tabs.sendMessage(state.currentTab, {
      type: 'CLICK_EASY_APPLY',
      jobId: job.id
    });
    
    await sleep(3000);
    
    // Fill application form
    state.currentStep = 'Filling application form';
    const fillResult = await chrome.tabs.sendMessage(state.currentTab, {
      type: 'FILL_FORM',
      formData: {}
    });
    
    if (!fillResult.success) {
      throw new Error('Failed to fill form: ' + fillResult.error);
    }
    
    // Submit application if in auto mode
    if (state.config.mode === 'auto') {
      state.currentStep = 'Submitting application';
      
      const submitResult = await chrome.tabs.sendMessage(state.currentTab, {
        type: 'SUBMIT_FORM'
      });
      
      if (submitResult.success) {
        await recordApplication(job, 'submitted');
        state.applicationsToday++;
        state.applicationsThisSession++;
        
        if (state.config.notifications.onApplicationSubmitted) {
          showNotification('Application Submitted', `Applied to ${job.title} at ${job.company}`);
        }
      } else {
        throw new Error('Failed to submit: ' + submitResult.error);
      }
    } else if (state.config.mode === 'semi-auto') {
      // Wait for user to review and submit
      state.currentStep = 'Waiting for user review';
      showNotification('Review Required', `Please review the application for ${job.title}`);
      
      // Wait for user action or timeout
      await waitForUserAction(30000);
    }
    
    state.currentJob = null;
    state.currentStep = '';
    
  } catch (error) {
    console.error('Error processing job:', error);
    await recordApplication(job, 'failed', error.message);
    state.errors.push(`Job ${job.id}: ${error.message}`);
  }
}

// Handle jobs found from content script
async function handleJobsFound(jobs, tabId) {
  try {
    // Filter jobs based on criteria
    const filteredJobs = await filterJobs(jobs);
    
    // Add to queue
    state.queue.push(...filteredJobs);
    
    // Update UI
    await chrome.tabs.sendMessage(tabId, {
      type: 'UPDATE_UI',
      status: `Found ${filteredJobs.length} matching jobs`,
      stats: {
        jobsFound: jobs.length,
        matches: filteredJobs.length,
        applied: state.applicationsThisSession
      }
    });
    
    return { success: true, queued: filteredJobs.length };
    
  } catch (error) {
    console.error('Error handling jobs:', error);
    return { success: false, error: error.message };
  }
}

// Filter jobs based on user criteria
async function filterJobs(jobs) {
  const filtered = [];
  const filters = state.config.filters;
  
  for (const job of jobs) {
    // Check if already applied
    const applied = await checkIfApplied(job.id);
    if (applied) continue;
    
    let matches = true;
    
    // Remote filter
    if (filters.isRemote !== 'any') {
      if (filters.isRemote === 'yes' && !job.isRemote) matches = false;
      if (filters.isRemote === 'no' && job.isRemote) matches = false;
    }
    
    // Keywords filter
    if (filters.keywords && filters.keywords.length > 0) {
      const jobText = `${job.title} ${job.company} ${job.description}`.toLowerCase();
      
      if (filters.keywordLogic === 'AND') {
        matches = filters.keywords.every(keyword => 
          jobText.includes(keyword.toLowerCase())
        );
      } else {
        matches = filters.keywords.some(keyword => 
          jobText.includes(keyword.toLowerCase())
        );
      }
    }
    
    // Experience level filter
    if (filters.experienceLevel !== 'any' && job.experienceLevel) {
      if (job.experienceLevel !== filters.experienceLevel) matches = false;
    }
    
    // Job type filter
    if (filters.jobType && filters.jobType.length > 0) {
      if (!filters.jobType.includes(job.jobType)) matches = false;
    }
    
    // Posted within filter
    if (filters.postedWithin) {
      const daysAgo = (Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo > filters.postedWithin) matches = false;
    }
    
    // Exclude companies filter
    if (filters.excludeCompanies && filters.excludeCompanies.length > 0) {
      if (filters.excludeCompanies.some(company => 
        job.company.toLowerCase().includes(company.toLowerCase())
      )) {
        matches = false;
      }
    }
    
    // Salary filter
    if (filters.salaryMin && job.salary) {
      if (job.salary.max < filters.salaryMin) matches = false;
    }
    
    if (matches) {
      // Calculate match score
      job.matchScore = await evaluateJobMatch(job);
      filtered.push(job);
    }
  }
  
  // Sort by match score
  filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  
  return filtered;
}

// Evaluate job match score
async function evaluateJobMatch(job) {
  let score = 0;
  let maxScore = 0;
  const reasons = [];
  const filters = state.config.filters;
  
  // Keyword matching (40% weight)
  if (filters.keywords && filters.keywords.length > 0) {
    maxScore += 40;
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const matchedKeywords = filters.keywords.filter(keyword => 
      jobText.includes(keyword.toLowerCase())
    );
    
    score += (matchedKeywords.length / filters.keywords.length) * 40;
    if (matchedKeywords.length > 0) {
      reasons.push(`Matches keywords: ${matchedKeywords.join(', ')}`);
    }
  }
  
  // Remote preference (20% weight)
  if (filters.isRemote === 'yes') {
    maxScore += 20;
    if (job.isRemote) {
      score += 20;
      reasons.push('Remote position');
    }
  }
  
  // Easy Apply (20% weight)
  maxScore += 20;
  if (job.isEasyApply) {
    score += 20;
    reasons.push('Easy Apply available');
  }
  
  // Posted recently (10% weight)
  maxScore += 10;
  const daysAgo = (Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 3) {
    score += 10;
    reasons.push('Posted recently');
  } else if (daysAgo <= 7) {
    score += 5;
  }
  
  // Low competition (10% weight)
  maxScore += 10;
  if (job.applicants && job.applicants < 25) {
    score += 10;
    reasons.push('Low competition');
  } else if (job.applicants && job.applicants < 50) {
    score += 5;
  }
  
  job.matchReasons = reasons;
  
  return maxScore > 0 ? score / maxScore : 0;
}

// Check if already applied to a job
async function checkIfApplied(jobId) {
  const applications = await chrome.storage.local.get('applications');
  if (applications.applications) {
    return applications.applications.some(app => app.jobId === jobId);
  }
  return false;
}

// Record application
async function recordApplication(job, status, error = null) {
  const application = {
    id: generateId(),
    jobId: job.id,
    jobDetails: job,
    appliedAt: new Date().toISOString(),
    status: status,
    error: error,
    attempts: 1
  };
  
  const storage = await chrome.storage.local.get('applications');
  const applications = storage.applications || [];
  applications.push(application);
  
  await chrome.storage.local.set({ applications });
  
  // Update statistics
  await updateStatistics(status);
}

// Record skipped job
async function recordSkippedJob(job, reason) {
  const skipped = {
    jobId: job.id,
    job: job,
    reason: reason,
    skippedAt: new Date().toISOString()
  };
  
  const storage = await chrome.storage.local.get('skippedJobs');
  const skippedJobs = storage.skippedJobs || [];
  skippedJobs.push(skipped);
  
  await chrome.storage.local.set({ skippedJobs });
}

// Update statistics
async function updateStatistics(status) {
  const storage = await chrome.storage.local.get('statistics');
  const stats = storage.statistics || {
    totalApplications: 0,
    successfulApplications: 0,
    failedApplications: 0,
    skippedJobs: 0,
    applicationsByDay: []
  };
  
  stats.totalApplications++;
  
  if (status === 'submitted') {
    stats.successfulApplications++;
  } else if (status === 'failed') {
    stats.failedApplications++;
  }
  
  // Update daily stats
  const today = new Date().toISOString().split('T')[0];
  const dayStats = stats.applicationsByDay.find(d => d.date === today);
  if (dayStats) {
    dayStats.count++;
  } else {
    stats.applicationsByDay.push({ date: today, count: 1 });
  }
  
  stats.lastApplicationDate = new Date().toISOString();
  stats.successRate = stats.totalApplications > 0 
    ? (stats.successfulApplications / stats.totalApplications) * 100 
    : 0;
  
  await chrome.storage.local.set({ statistics: stats });
}

// Get statistics
async function getStatistics() {
  const storage = await chrome.storage.local.get(['statistics', 'applications']);
  const stats = storage.statistics || {};
  const applications = storage.applications || [];
  
  // Calculate additional metrics
  if (applications.length > 0) {
    // Top companies
    const companyCount = {};
    applications.forEach(app => {
      const company = app.jobDetails.company;
      companyCount[company] = (companyCount[company] || 0) + 1;
    });
    
    stats.topCompanies = Object.entries(companyCount)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Top locations
    const locationCount = {};
    applications.forEach(app => {
      const location = app.jobDetails.location;
      locationCount[location] = (locationCount[location] || 0) + 1;
    });
    
    stats.topLocations = Object.entries(locationCount)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  return stats;
}

// Update configuration
async function updateConfig(newConfig) {
  state.config = { ...state.config, ...newConfig };
  await chrome.storage.local.set({ config: state.config });
  return { success: true, config: state.config };
}

// Get current status
function getStatus() {
  return {
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    currentJob: state.currentJob,
    currentStep: state.currentStep,
    applicationsToday: state.applicationsToday,
    applicationsThisSession: state.applicationsThisSession,
    queueLength: state.queue.length,
    errors: state.errors.slice(-5), // Last 5 errors
    sessionStartTime: state.sessionStartTime
  };
}

// Load application history
async function loadApplicationHistory() {
  const storage = await chrome.storage.local.get(['applications', 'statistics']);
  
  if (storage.applications) {
    // Count today's applications
    const today = new Date().toISOString().split('T')[0];
    state.applicationsToday = storage.applications.filter(app => 
      app.appliedAt.startsWith(today)
    ).length;
  }
}

// Ensure content scripts are injected
async function ensureContentScriptsInjected(tabId) {
  try {
    // Check if scripts are already injected
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
    
    if (!response) {
      // Inject content scripts
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'src/content/anti-detection.js',
          'src/content/form-filler.js',
          'src/content/linkedin-analyzer.js',
          'src/content/filter-engine.js'
        ]
      });
      
      // Inject CSS
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['src/content/styles.css']
      });
    }
  } catch (error) {
    console.error('Error injecting content scripts:', error);
    throw error;
  }
}

// Helper functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay() {
  const min = state.config.delayBetweenActions.min;
  const max = state.config.delayBetweenActions.max;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getCurrentTabUrl() {
  const tab = await chrome.tabs.get(state.currentTab);
  return tab.url;
}

async function waitForPageLoad() {
  return new Promise((resolve) => {
    const listener = (tabId, changeInfo) => {
      if (tabId === state.currentTab && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function waitForUserAction(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

function isWithinWorkingHours() {
  if (!state.config.workingHours.enabled) return true;
  
  const now = new Date();
  const start = parseTime(state.config.workingHours.start);
  const end = parseTime(state.config.workingHours.end);
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  return currentTime >= start && currentTime <= end;
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

async function updateIcon(status) {
  const icons = {
    active: {
      '16': 'assets/icons/icon16-active.png',
      '32': 'assets/icons/icon32-active.png',
      '48': 'assets/icons/icon48-active.png',
      '128': 'assets/icons/icon128-active.png'
    },
    inactive: {
      '16': 'assets/icons/icon16.png',
      '32': 'assets/icons/icon32.png',
      '48': 'assets/icons/icon48.png',
      '128': 'assets/icons/icon128.png'
    },
    paused: {
      '16': 'assets/icons/icon16-paused.png',
      '32': 'assets/icons/icon32-paused.png',
      '48': 'assets/icons/icon48-paused.png',
      '128': 'assets/icons/icon128-paused.png'
    }
  };
  
  // For now, we'll skip updating the icon since we don't have the actual files yet
  // chrome.action.setIcon({ path: icons[status] });
}

function showNotification(title, message) {
  if (state.config.notifications.sound) {
    // Play notification sound if enabled
  }
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon128.png',
    title: title,
    message: message
  });
}

// Export data
async function exportData() {
  const storage = await chrome.storage.local.get(['applications', 'statistics', 'config']);
  
  const exportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    applications: storage.applications || [],
    statistics: storage.statistics || {},
    config: storage.config || {}
  };
  
  return exportData;
}

// Handle session rotation
async function handleSessionRotation() {
  console.log('Session rotation required');
  await stopAutomation();
  showNotification('Session Rotation', 'Please log in again to continue');
  return { success: true };
}

// Handle break started
async function handleBreakStarted(payload) {
  state.isPaused = true;
  const duration = Math.round(payload.duration / 60000);
  showNotification('Taking a Break', `Pausing for ${duration} minutes`);
  return { success: true };
}

// Handle break ended
async function handleBreakEnded() {
  state.isPaused = false;
  if (state.isRunning) {
    automationLoop();
  }
  return { success: true };
}

// Handle errors
async function handleError(error) {
  console.error('Content script error:', error);
  state.errors.push(error.message || error);
  
  if (state.config.notifications.onError) {
    showNotification('Error Encountered', error.message || 'An error occurred during automation');
  }
  
  return { success: true };
}

// Alarm handlers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    state.applicationsToday = 0;
    console.log('Daily application count reset');
  }
});