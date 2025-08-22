/**
 * Options Page Script
 * Handles the settings/configuration page
 */

// Current configuration
let config = {};
let profile = {};

// DOM elements
const elements = {
  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Filter settings
  keywordInput: document.getElementById('keywordInput'),
  addKeywordBtn: document.getElementById('addKeyword'),
  keywordList: document.getElementById('keywordList'),
  remoteFilter: document.getElementById('remoteFilter'),
  experienceLevel: document.getElementById('experienceLevel'),
  postedWithin: document.getElementById('postedWithin'),
  salaryMin: document.getElementById('salaryMin'),
  
  // Automation settings
  automationMode: document.getElementById('automationMode'),
  dailyLimit: document.getElementById('dailyLimit'),
  dailyLimitValue: document.getElementById('dailyLimitValue'),
  sessionLimit: document.getElementById('sessionLimit'),
  sessionLimitValue: document.getElementById('sessionLimitValue'),
  delayMin: document.getElementById('delayMin'),
  delayMax: document.getElementById('delayMax'),
  antiDetection: document.getElementById('antiDetection'),
  humanizeActions: document.getElementById('humanizeActions'),
  notifyOnSubmit: document.getElementById('notifyOnSubmit'),
  notifyOnError: document.getElementById('notifyOnError'),
  
  // Profile settings
  firstName: document.getElementById('firstName'),
  lastName: document.getElementById('lastName'),
  email: document.getElementById('email'),
  phone: document.getElementById('phone'),
  currentTitle: document.getElementById('currentTitle'),
  currentCompany: document.getElementById('currentCompany'),
  yearsExperience: document.getElementById('yearsExperience'),
  linkedinUrl: document.getElementById('linkedinUrl'),
  
  // Actions
  saveBtn: document.getElementById('saveBtn'),
  resetBtn: document.getElementById('resetBtn'),
  successMessage: document.getElementById('successMessage')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Options page initialized');
  
  // Load current configuration
  await loadConfiguration();
  
  // Set up event listeners
  setupEventListeners();
  
  // Display current settings
  displaySettings();
});

// Set up event listeners
function setupEventListeners() {
  // Tab switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Keywords
  elements.addKeywordBtn.addEventListener('click', addKeyword);
  elements.keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addKeyword();
  });
  
  // Range sliders
  elements.dailyLimit.addEventListener('input', (e) => {
    elements.dailyLimitValue.textContent = e.target.value;
  });
  
  elements.sessionLimit.addEventListener('input', (e) => {
    elements.sessionLimitValue.textContent = e.target.value;
  });
  
  // Save and reset buttons
  elements.saveBtn.addEventListener('click', saveSettings);
  elements.resetBtn.addEventListener('click', resetSettings);
  
  // Keyword logic radio buttons
  document.querySelectorAll('input[name="keywordLogic"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      config.filters.keywordLogic = e.target.value;
    });
  });
}

// Switch tabs
function switchTab(tabName) {
  // Update active tab
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update active content
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// Load configuration from storage
async function loadConfiguration() {
  try {
    const storage = await chrome.storage.local.get(['config', 'profile']);
    
    // Load config with defaults
    config = storage.config || getDefaultConfig();
    profile = storage.profile || getDefaultProfile();
    
    console.log('Loaded config:', config);
    console.log('Loaded profile:', profile);
    
  } catch (error) {
    console.error('Error loading configuration:', error);
    config = getDefaultConfig();
    profile = getDefaultProfile();
  }
}

// Get default configuration
function getDefaultConfig() {
  return {
    enabled: true,
    mode: 'semi-auto',
    dailyLimit: 50,
    sessionLimit: 10,
    rateLimit: 15,
    delayBetweenActions: {
      min: 3000,
      max: 8000
    },
    filters: {
      isRemote: 'any',
      keywords: [],
      keywordLogic: 'OR',
      experienceLevel: 'any',
      jobType: ['full-time'],
      postedWithin: 7,
      salaryMin: null
    },
    antiDetection: {
      enabled: true,
      humanizeActions: true,
      randomizeDelays: true,
      simulateMouseMovement: true,
      simulateScrolling: true
    },
    notifications: {
      onApplicationSubmitted: true,
      onDailyLimitReached: true,
      onError: true,
      onSessionComplete: true,
      sound: false
    }
  };
}

// Get default profile
function getDefaultProfile() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentTitle: '',
    currentCompany: '',
    yearsOfExperience: null,
    linkedInUrl: ''
  };
}

// Display current settings in the UI
function displaySettings() {
  // Filter settings
  elements.remoteFilter.value = config.filters.isRemote || 'any';
  elements.experienceLevel.value = config.filters.experienceLevel || 'any';
  elements.postedWithin.value = config.filters.postedWithin || 7;
  elements.salaryMin.value = config.filters.salaryMin || '';
  
  // Display keywords
  displayKeywords();
  
  // Set keyword logic radio
  const keywordLogicRadio = document.querySelector(`input[name="keywordLogic"][value="${config.filters.keywordLogic || 'OR'}"]`);
  if (keywordLogicRadio) keywordLogicRadio.checked = true;
  
  // Automation settings
  elements.automationMode.value = config.mode || 'semi-auto';
  elements.dailyLimit.value = config.dailyLimit || 50;
  elements.dailyLimitValue.textContent = config.dailyLimit || 50;
  elements.sessionLimit.value = config.sessionLimit || 10;
  elements.sessionLimitValue.textContent = config.sessionLimit || 10;
  elements.delayMin.value = Math.floor((config.delayBetweenActions?.min || 3000) / 1000);
  elements.delayMax.value = Math.floor((config.delayBetweenActions?.max || 8000) / 1000);
  elements.antiDetection.checked = config.antiDetection?.enabled !== false;
  elements.humanizeActions.checked = config.antiDetection?.humanizeActions !== false;
  elements.notifyOnSubmit.checked = config.notifications?.onApplicationSubmitted !== false;
  elements.notifyOnError.checked = config.notifications?.onError !== false;
  
  // Profile settings
  elements.firstName.value = profile.firstName || '';
  elements.lastName.value = profile.lastName || '';
  elements.email.value = profile.email || '';
  elements.phone.value = profile.phone || '';
  elements.currentTitle.value = profile.currentTitle || '';
  elements.currentCompany.value = profile.currentCompany || '';
  elements.yearsExperience.value = profile.yearsOfExperience || '';
  elements.linkedinUrl.value = profile.linkedInUrl || '';
}

// Display keywords
function displayKeywords() {
  elements.keywordList.innerHTML = '';
  
  const keywords = config.filters.keywords || [];
  keywords.forEach(keyword => {
    const tag = createKeywordTag(keyword);
    elements.keywordList.appendChild(tag);
  });
}

// Create keyword tag element
function createKeywordTag(keyword) {
  const tag = document.createElement('div');
  tag.className = 'keyword-tag';
  tag.innerHTML = `
    ${keyword}
    <span class="remove" data-keyword="${keyword}">×</span>
  `;
  
  tag.querySelector('.remove').addEventListener('click', () => removeKeyword(keyword));
  
  return tag;
}

// Add keyword
function addKeyword() {
  const keyword = elements.keywordInput.value.trim();
  
  if (!keyword) return;
  
  if (!config.filters.keywords) {
    config.filters.keywords = [];
  }
  
  if (!config.filters.keywords.includes(keyword)) {
    config.filters.keywords.push(keyword);
    displayKeywords();
  }
  
  elements.keywordInput.value = '';
}

// Remove keyword
function removeKeyword(keyword) {
  config.filters.keywords = config.filters.keywords.filter(k => k !== keyword);
  displayKeywords();
}

// Save settings
async function saveSettings() {
  try {
    // Collect filter settings
    config.filters.isRemote = elements.remoteFilter.value;
    config.filters.experienceLevel = elements.experienceLevel.value;
    config.filters.postedWithin = parseInt(elements.postedWithin.value);
    config.filters.salaryMin = elements.salaryMin.value ? parseInt(elements.salaryMin.value) : null;
    
    // Collect automation settings
    config.mode = elements.automationMode.value;
    config.dailyLimit = parseInt(elements.dailyLimit.value);
    config.sessionLimit = parseInt(elements.sessionLimit.value);
    config.delayBetweenActions = {
      min: parseInt(elements.delayMin.value) * 1000,
      max: parseInt(elements.delayMax.value) * 1000
    };
    
    config.antiDetection = {
      enabled: elements.antiDetection.checked,
      humanizeActions: elements.humanizeActions.checked,
      randomizeDelays: true,
      simulateMouseMovement: elements.humanizeActions.checked,
      simulateScrolling: true
    };
    
    config.notifications = {
      onApplicationSubmitted: elements.notifyOnSubmit.checked,
      onDailyLimitReached: true,
      onError: elements.notifyOnError.checked,
      onSessionComplete: true,
      sound: false
    };
    
    // Collect profile settings
    profile = {
      firstName: elements.firstName.value,
      lastName: elements.lastName.value,
      email: elements.email.value,
      phone: elements.phone.value,
      currentTitle: elements.currentTitle.value,
      currentCompany: elements.currentCompany.value,
      yearsOfExperience: elements.yearsExperience.value ? parseInt(elements.yearsExperience.value) : null,
      linkedInUrl: elements.linkedinUrl.value
    };
    
    // Save to storage
    await chrome.storage.local.set({ config, profile });
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_CONFIG',
      payload: config
    });
    
    // Show success message
    showSuccessMessage();
    
    console.log('Settings saved:', { config, profile });
    
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Failed to save settings: ' + error.message);
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }
  
  try {
    config = getDefaultConfig();
    profile = getDefaultProfile();
    
    await chrome.storage.local.set({ config, profile });
    
    displaySettings();
    
    showSuccessMessage('Settings reset to defaults!');
    
  } catch (error) {
    console.error('Error resetting settings:', error);
    alert('Failed to reset settings: ' + error.message);
  }
}

// Show success message
function showSuccessMessage(message = 'Settings saved successfully!') {
  elements.successMessage.textContent = message;
  elements.successMessage.classList.add('show');
  
  setTimeout(() => {
    elements.successMessage.classList.remove('show');
  }, 3000);
}

// Export settings (for backup)
function exportSettings() {
  const data = {
    config,
    profile,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `linkedin-auto-apply-settings-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Import settings (from backup)
function importSettings(file) {
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (data.config) config = data.config;
      if (data.profile) profile = data.profile;
      
      await chrome.storage.local.set({ config, profile });
      
      displaySettings();
      showSuccessMessage('Settings imported successfully!');
      
    } catch (error) {
      console.error('Error importing settings:', error);
      alert('Failed to import settings: Invalid file format');
    }
  };
  
  reader.readAsText(file);
}