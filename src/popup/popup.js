/**
 * Popup Script
 * Handles the extension popup UI and communication with background script
 */

// DOM elements
const elements = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  todayCount: document.getElementById('todayCount'),
  sessionCount: document.getElementById('sessionCount'),
  queueCount: document.getElementById('queueCount'),
  successRate: document.getElementById('successRate'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  resumeBtn: document.getElementById('resumeBtn'),
  errorMessage: document.getElementById('errorMessage'),
  loading: document.getElementById('loading'),
  settingsLink: document.getElementById('settingsLink'),
  statsLink: document.getElementById('statsLink')
};

// State
let currentStatus = null;
let currentConfig = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup initialized');
  
  // Load current status
  await updateStatus();
  
  // Load configuration
  await loadConfig();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up periodic status updates
  setInterval(updateStatus, 2000);
});

// Set up event listeners
function setupEventListeners() {
  // Control buttons
  elements.startBtn.addEventListener('click', startAutomation);
  elements.stopBtn.addEventListener('click', stopAutomation);
  elements.pauseBtn.addEventListener('click', pauseAutomation);
  elements.resumeBtn.addEventListener('click', resumeAutomation);
  
  // Links
  elements.settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  elements.statsLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const stats = await sendMessage({ type: 'GET_STATISTICS' });
    showStatistics(stats);
  });
  
  // Quick filters
  document.querySelectorAll('.filter-tag').forEach(tag => {
    tag.addEventListener('click', async (e) => {
      const filter = e.target.dataset.filter;
      await toggleQuickFilter(filter, e.target);
    });
  });
}

// Start automation
async function startAutomation() {
  try {
    showLoading(true);
    hideError();
    
    // Check if we're on LinkedIn
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('linkedin.com')) {
      showError('Please navigate to LinkedIn jobs page first');
      showLoading(false);
      return;
    }
    
    // Send start message
    const response = await sendMessage({ type: 'START_AUTOMATION' });
    
    if (response.success) {
      console.log('Automation started successfully');
      await updateStatus();
    } else {
      showError(response.error || 'Failed to start automation');
    }
    
  } catch (error) {
    console.error('Error starting automation:', error);
    showError('Failed to start automation: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Stop automation
async function stopAutomation() {
  try {
    showLoading(true);
    
    const response = await sendMessage({ type: 'STOP_AUTOMATION' });
    
    if (response.success) {
      console.log('Automation stopped');
      await updateStatus();
    } else {
      showError(response.error || 'Failed to stop automation');
    }
    
  } catch (error) {
    console.error('Error stopping automation:', error);
    showError('Failed to stop automation: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Pause automation
async function pauseAutomation() {
  try {
    showLoading(true);
    
    const response = await sendMessage({ type: 'PAUSE_AUTOMATION' });
    
    if (response.success) {
      console.log('Automation paused');
      await updateStatus();
    } else {
      showError(response.error || 'Failed to pause automation');
    }
    
  } catch (error) {
    console.error('Error pausing automation:', error);
    showError('Failed to pause automation: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Resume automation
async function resumeAutomation() {
  try {
    showLoading(true);
    
    const response = await sendMessage({ type: 'RESUME_AUTOMATION' });
    
    if (response.success) {
      console.log('Automation resumed');
      await updateStatus();
    } else {
      showError(response.error || 'Failed to resume automation');
    }
    
  } catch (error) {
    console.error('Error resuming automation:', error);
    showError('Failed to resume automation: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Update status display
async function updateStatus() {
  try {
    const status = await sendMessage({ type: 'GET_STATUS' });
    currentStatus = status;
    
    // Update status indicator
    if (status.isRunning) {
      if (status.isPaused) {
        elements.statusDot.className = 'status-dot paused';
        elements.statusText.textContent = 'Paused';
        updateButtonVisibility('paused');
      } else {
        elements.statusDot.className = 'status-dot active';
        elements.statusText.textContent = status.currentStep || 'Running';
        updateButtonVisibility('running');
      }
    } else {
      elements.statusDot.className = 'status-dot';
      elements.statusText.textContent = 'Not Running';
      updateButtonVisibility('stopped');
    }
    
    // Update statistics
    elements.todayCount.textContent = status.applicationsToday || 0;
    elements.sessionCount.textContent = status.applicationsThisSession || 0;
    elements.queueCount.textContent = status.queueLength || 0;
    
    // Calculate success rate
    if (status.applicationsToday > 0) {
      const successRate = Math.round((status.applicationsThisSession / status.applicationsToday) * 100);
      elements.successRate.textContent = `${successRate}%`;
    } else {
      elements.successRate.textContent = '0%';
    }
    
    // Show current job if any
    if (status.currentJob) {
      elements.statusText.textContent = `Processing: ${status.currentJob.title}`;
    }
    
    // Show errors if any
    if (status.errors && status.errors.length > 0) {
      showError(status.errors[status.errors.length - 1]);
    }
    
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

// Update button visibility based on state
function updateButtonVisibility(state) {
  switch (state) {
    case 'stopped':
      elements.startBtn.style.display = 'block';
      elements.stopBtn.style.display = 'none';
      elements.pauseBtn.style.display = 'none';
      elements.resumeBtn.style.display = 'none';
      break;
      
    case 'running':
      elements.startBtn.style.display = 'none';
      elements.stopBtn.style.display = 'block';
      elements.pauseBtn.style.display = 'block';
      elements.resumeBtn.style.display = 'none';
      break;
      
    case 'paused':
      elements.startBtn.style.display = 'none';
      elements.stopBtn.style.display = 'block';
      elements.pauseBtn.style.display = 'none';
      elements.resumeBtn.style.display = 'block';
      break;
  }
}

// Load configuration
async function loadConfig() {
  try {
    const response = await sendMessage({ type: 'GET_CONFIG' });
    currentConfig = response.config;
    
    // Update quick filters based on config
    updateQuickFilters();
    
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Update quick filters display
function updateQuickFilters() {
  if (!currentConfig) return;
  
  // Update remote filter
  const remoteTag = document.querySelector('[data-filter="remote"]');
  if (remoteTag && currentConfig.filters.isRemote === 'yes') {
    remoteTag.classList.add('active');
  }
  
  // Update recent filter
  const recentTag = document.querySelector('[data-filter="recent"]');
  if (recentTag && currentConfig.filters.postedWithin <= 7) {
    recentTag.classList.add('active');
  }
}

// Toggle quick filter
async function toggleQuickFilter(filter, element) {
  try {
    const isActive = element.classList.contains('active');
    element.classList.toggle('active');
    
    // Update configuration based on filter
    const updates = {};
    
    switch (filter) {
      case 'remote':
        updates.filters = {
          ...currentConfig.filters,
          isRemote: isActive ? 'any' : 'yes'
        };
        break;
        
      case 'easyapply':
        // This is handled by the content script
        break;
        
      case 'recent':
        updates.filters = {
          ...currentConfig.filters,
          postedWithin: isActive ? 30 : 7
        };
        break;
    }
    
    if (Object.keys(updates).length > 0) {
      const response = await sendMessage({
        type: 'UPDATE_CONFIG',
        payload: updates
      });
      
      if (response.success) {
        currentConfig = response.config;
      }
    }
    
  } catch (error) {
    console.error('Error toggling filter:', error);
  }
}

// Show statistics popup
function showStatistics(stats) {
  // Create a simple modal with statistics
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 300px;
    max-height: 400px;
    overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h2 style="margin-bottom: 15px; color: #0077b5;">Application Statistics</h2>
    <div style="font-size: 14px; line-height: 1.6;">
      <p><strong>Total Applications:</strong> ${stats.totalApplications || 0}</p>
      <p><strong>Successful:</strong> ${stats.successfulApplications || 0}</p>
      <p><strong>Failed:</strong> ${stats.failedApplications || 0}</p>
      <p><strong>Success Rate:</strong> ${stats.successRate ? stats.successRate.toFixed(1) : 0}%</p>
      
      ${stats.topCompanies && stats.topCompanies.length > 0 ? `
        <h3 style="margin-top: 15px; margin-bottom: 10px; font-size: 16px;">Top Companies</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${stats.topCompanies.map(c => `<li>${c.company} (${c.count})</li>`).join('')}
        </ul>
      ` : ''}
      
      ${stats.topLocations && stats.topLocations.length > 0 ? `
        <h3 style="margin-top: 15px; margin-bottom: 10px; font-size: 16px;">Top Locations</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${stats.topLocations.map(l => `<li>${l.location} (${l.count})</li>`).join('')}
        </ul>
      ` : ''}
    </div>
    <button id="closeModal" style="
      margin-top: 20px;
      padding: 8px 16px;
      background: #0077b5;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      width: 100%;
    ">Close</button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Close modal handler
  document.getElementById('closeModal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Show error message
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.add('show');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideError();
  }, 5000);
}

// Hide error message
function hideError() {
  elements.errorMessage.classList.remove('show');
}

// Show/hide loading
function showLoading(show) {
  if (show) {
    elements.loading.classList.add('show');
  } else {
    elements.loading.classList.remove('show');
  }
}

// Send message to background script
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response || {});
      }
    });
  });
}

// Check if extension is properly installed
async function checkExtensionStatus() {
  try {
    // Try to communicate with background script
    const response = await sendMessage({ type: 'GET_STATUS' });
    if (!response) {
      showError('Extension not properly initialized. Please reload the extension.');
    }
  } catch (error) {
    console.error('Extension status check failed:', error);
    showError('Cannot communicate with extension. Please reload.');
  }
}

// Run status check on load
checkExtensionStatus();