/**
 * Main Content Script
 * Coordinates all content modules and communicates with the background service worker
 */

// Global state for content script
const contentState = {
  isActive: false,
  currentPage: null,
  jobsOnPage: [],
  currentJob: null,
  observer: null,
  antiDetection: null,
  analyzer: null,
  formFiller: null,
  filterEngine: null
};

// Initialize content script
(function initContentScript() {
  console.log('LinkedIn Auto-Apply: Content script initializing...');
  console.log('Current URL:', window.location.href);
  
  // Check if we're on a LinkedIn jobs page
  if (!window.location.href.includes('linkedin.com')) {
    console.log('LinkedIn Auto-Apply: Not on LinkedIn, content script inactive');
    return;
  }
  
  console.log('LinkedIn Auto-Apply: On LinkedIn, initializing modules...');
  
  // Initialize modules
  initializeModules();
  
  // Set up message listener
  chrome.runtime.onMessage.addListener(handleMessage);
  console.log('LinkedIn Auto-Apply: Message listener set up');
  
  // Set up page observer
  observePageChanges();
  console.log('LinkedIn Auto-Apply: Page observer set up');
  
  // Initial page analysis after a short delay to let page load
  setTimeout(() => {
    console.log('LinkedIn Auto-Apply: Starting initial page analysis...');
    analyzePage();
  }, 2000);
})();

// Initialize all modules
function initializeModules() {
  try {
    // Initialize anti-detection if available
    if (typeof AntiDetectionSystem !== 'undefined') {
      contentState.antiDetection = new AntiDetectionSystem();
      contentState.antiDetection.initialize();
    }
    
    // Initialize analyzer if available
    if (typeof LinkedInAnalyzer !== 'undefined') {
      contentState.analyzer = new LinkedInAnalyzer();
    }
    
    // Initialize form filler if available
    if (typeof FormFiller !== 'undefined') {
      contentState.formFiller = new FormFiller();
    }
    
    // Initialize filter engine if available
    if (typeof FilterEngine !== 'undefined') {
      contentState.filterEngine = new FilterEngine();
    }
    
    console.log('Content modules initialized');
  } catch (error) {
    console.error('Error initializing modules:', error);
  }
}

// Handle messages from background script
function handleMessage(request, sender, sendResponse) {
  console.log('Content script received message:', request.type);
  
  switch (request.type) {
    case 'PING':
      sendResponse({ success: true, message: 'Content script active' });
      break;
      
    case 'ANALYZE_PAGE':
      analyzePage().then(sendResponse);
      return true;
      
    case 'CLICK_EASY_APPLY':
      clickEasyApply(request.jobId).then(sendResponse);
      return true;
      
    case 'FILL_FORM':
      fillApplicationForm(request.formData).then(sendResponse);
      return true;
      
    case 'SUBMIT_FORM':
      submitApplication().then(sendResponse);
      return true;
      
    case 'GET_JOBS':
      getJobsOnPage().then(sendResponse);
      return true;
      
    case 'UPDATE_UI':
      updateUI(request.status, request.stats);
      sendResponse({ success: true });
      break;
      
    case 'SCROLL_PAGE':
      scrollToLoadMore().then(sendResponse);
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
}

// Analyze the current page
async function analyzePage() {
  try {
    console.log('Analyzing LinkedIn page...');
    
    // Determine page type
    const pageType = getPageType();
    contentState.currentPage = pageType;
    
    if (pageType === 'job-search') {
      // Find all jobs on the search results page
      const jobs = await findJobsOnPage();
      contentState.jobsOnPage = jobs;
      
      // Send jobs to background for filtering
      chrome.runtime.sendMessage({
        type: 'JOBS_FOUND',
        payload: { jobs }
      });
      
      return { success: true, pageType, jobsCount: jobs.length };
      
    } else if (pageType === 'job-detail') {
      // Analyze job detail page
      const jobDetail = await analyzeJobDetail();
      contentState.currentJob = jobDetail;
      
      chrome.runtime.sendMessage({
        type: 'JOB_DETAIL_ANALYZED',
        payload: { job: jobDetail }
      });
      
      return { success: true, pageType, job: jobDetail };
      
    } else if (pageType === 'application-form') {
      // Analyze application form
      const formData = await analyzeApplicationForm();
      
      chrome.runtime.sendMessage({
        type: 'FORM_ANALYZED',
        payload: formData
      });
      
      return { success: true, pageType, form: formData };
    }
    
    return { success: true, pageType };
    
  } catch (error) {
    console.error('Error analyzing page:', error);
    return { success: false, error: error.message };
  }
}

// Get the type of LinkedIn page we're on
function getPageType() {
  const url = window.location.href;
  
  if (url.includes('/jobs/search/')) {
    return 'job-search';
  } else if (url.includes('/jobs/view/')) {
    return 'job-detail';
  } else if (url.includes('/jobs/application/')) {
    return 'application-form';
  } else if (document.querySelector('[aria-label="Easy Apply"]')) {
    return 'job-detail';
  } else if (document.querySelector('.jobs-search-results-list')) {
    return 'job-search';
  }
  
  return 'unknown';
}

// Find all jobs on the search results page
async function findJobsOnPage() {
  const jobs = [];
  
  try {
    console.log('Finding jobs on page...');
    
    // Wait for job cards to load - updated selector
    const containerSelectors = [
      '.jobs-search-results-list',
      '.scaffold-layout__list-container',
      '.jobs-search__results-list',
      'ul[role="list"]'
    ];
    
    let found = false;
    for (const selector of containerSelectors) {
      try {
        await waitForElement(selector, 3000);
        found = true;
        console.log(`Found container: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!found) {
      console.log('No job container found, trying direct job card search');
    }
    
    // Find all job cards - updated selectors for current LinkedIn
    const selectors = [
      'li[data-occludable-job-id]',
      '.scaffold-layout__list-container li',
      'ul[role="list"] li',
      '.jobs-search-results__list-item',
      '.job-card-container',
      '[data-job-id]'
    ];
    
    let jobCards = [];
    for (const selector of selectors) {
      const cards = document.querySelectorAll(selector);
      if (cards.length > 0) {
        jobCards = cards;
        console.log(`Found ${cards.length} job cards using selector: ${selector}`);
        break;
      }
    }
    
    for (const card of jobCards) {
      try {
        const job = extractJobFromCard(card);
        if (job) {
          jobs.push(job);
        }
      } catch (error) {
        console.error('Error extracting job from card:', error);
      }
    }
    
    console.log(`Found ${jobs.length} jobs on page`);
    
  } catch (error) {
    console.error('Error finding jobs:', error);
  }
  
  return jobs;
}

// Extract job information from a job card
function extractJobFromCard(card) {
  try {
    // Try to get job ID
    const jobId = card.getAttribute('data-job-id') || 
                  card.querySelector('[data-job-id]')?.getAttribute('data-job-id') ||
                  card.querySelector('a[href*="/jobs/view/"]')?.href?.match(/view\/(\d+)/)?.[1];
    
    if (!jobId) return null;
    
    // Extract job details
    const titleElement = card.querySelector('.job-card-list__title, .jobs-unified-top-card__job-title, [class*="job-title"]');
    const companyElement = card.querySelector('.job-card-container__company-name, [class*="company-name"]');
    const locationElement = card.querySelector('.job-card-container__metadata-item, [class*="job-location"]');
    const easyApplyBadge = card.querySelector('.job-card-container__easy-apply-badge, [aria-label*="Easy Apply"]');
    
    // Extract text content
    const title = titleElement?.textContent?.trim() || '';
    const company = companyElement?.textContent?.trim() || '';
    const location = locationElement?.textContent?.trim() || '';
    
    // Check for remote indicators
    const isRemote = location.toLowerCase().includes('remote') || 
                     card.textContent.toLowerCase().includes('remote');
    
    // Get job URL
    const jobLink = card.querySelector('a[href*="/jobs/view/"]');
    const url = jobLink ? jobLink.href : `https://www.linkedin.com/jobs/view/${jobId}`;
    
    // Get posted date
    const timeElement = card.querySelector('time, [class*="posted-date"]');
    const postedDate = timeElement?.getAttribute('datetime') || new Date().toISOString();
    
    // Get applicant count
    const applicantText = card.querySelector('[class*="applicant-count"]')?.textContent || '';
    const applicants = parseInt(applicantText.match(/\d+/)?.[0] || '0');
    
    return {
      id: jobId,
      url: url,
      title: title,
      company: company,
      location: location,
      isRemote: isRemote,
      description: '', // Will be filled when visiting job detail
      postedDate: postedDate,
      applicants: applicants,
      isEasyApply: !!easyApplyBadge,
      experienceLevel: extractExperienceLevel(card.textContent),
      jobType: extractJobType(card.textContent)
    };
    
  } catch (error) {
    console.error('Error extracting job data:', error);
    return null;
  }
}

// Analyze job detail page
async function analyzeJobDetail() {
  try {
    await waitForElement('.jobs-unified-top-card, .job-view-layout');
    
    const jobId = window.location.href.match(/view\/(\d+)/)?.[1] || '';
    const title = document.querySelector('.jobs-unified-top-card__job-title, h1')?.textContent?.trim() || '';
    const company = document.querySelector('.jobs-unified-top-card__company-name, [class*="company-name"]')?.textContent?.trim() || '';
    const location = document.querySelector('.jobs-unified-top-card__bullet, [class*="location"]')?.textContent?.trim() || '';
    const description = document.querySelector('.jobs-description, [class*="description"]')?.textContent?.trim() || '';
    
    const isRemote = location.toLowerCase().includes('remote') || 
                     description.toLowerCase().includes('remote');
    
    const easyApplyButton = document.querySelector('[aria-label*="Easy Apply"], .jobs-apply-button--top-card');
    const isEasyApply = !!easyApplyButton;
    
    // Extract salary if available
    const salaryText = document.querySelector('[class*="salary"], [class*="compensation"]')?.textContent || '';
    const salary = extractSalary(salaryText);
    
    // Get applicant count
    const applicantText = document.querySelector('[class*="applicant"], [class*="num-applicants"]')?.textContent || '';
    const applicants = parseInt(applicantText.match(/\d+/)?.[0] || '0');
    
    return {
      id: jobId,
      url: window.location.href,
      title: title,
      company: company,
      location: location,
      isRemote: isRemote,
      salary: salary,
      description: description,
      postedDate: new Date().toISOString(),
      applicants: applicants,
      isEasyApply: isEasyApply,
      experienceLevel: extractExperienceLevel(description),
      jobType: extractJobType(description)
    };
    
  } catch (error) {
    console.error('Error analyzing job detail:', error);
    throw error;
  }
}

// Click Easy Apply button
async function clickEasyApply(jobId) {
  try {
    console.log('Clicking Easy Apply button...');
    
    // Simulate human-like behavior
    if (contentState.antiDetection) {
      await contentState.antiDetection.simulateHumanDelay();
    }
    
    // Find Easy Apply button
    const easyApplyButton = document.querySelector(
      '[aria-label*="Easy Apply"], ' +
      '.jobs-apply-button--top-card, ' +
      'button[class*="easy-apply"]'
    );
    
    if (!easyApplyButton) {
      throw new Error('Easy Apply button not found');
    }
    
    // Scroll to button
    easyApplyButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    
    // Click the button
    if (contentState.antiDetection) {
      await contentState.antiDetection.simulateClick(easyApplyButton);
    } else {
      easyApplyButton.click();
    }
    
    // Wait for modal to open
    await waitForElement('.jobs-easy-apply-modal, [aria-label*="Easy Apply"]', 5000);
    
    return { success: true, message: 'Easy Apply clicked' };
    
  } catch (error) {
    console.error('Error clicking Easy Apply:', error);
    return { success: false, error: error.message };
  }
}

// Fill application form
async function fillApplicationForm(formData = {}) {
  try {
    console.log('Filling application form...');
    
    // Wait for form to load
    await waitForElement('.jobs-easy-apply-modal, form');
    
    // Use FormFiller if available
    if (contentState.formFiller) {
      const result = await contentState.formFiller.fillForm(formData);
      return result;
    }
    
    // Fallback to basic form filling
    const form = document.querySelector('.jobs-easy-apply-modal form, form');
    if (!form) {
      throw new Error('Application form not found');
    }
    
    // Fill text inputs
    const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
    for (const input of textInputs) {
      const name = input.name || input.id || '';
      const label = input.getAttribute('aria-label') || '';
      
      // Skip if already filled
      if (input.value) continue;
      
      // Fill based on field type
      if (name.includes('email') || label.includes('email')) {
        input.value = formData.email || 'user@example.com';
      } else if (name.includes('phone') || label.includes('phone')) {
        input.value = formData.phone || '555-0100';
      } else if (name.includes('first') || label.includes('first')) {
        input.value = formData.firstName || 'John';
      } else if (name.includes('last') || label.includes('last')) {
        input.value = formData.lastName || 'Doe';
      }
      
      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      await sleep(300);
    }
    
    // Handle radio buttons and checkboxes
    const radios = form.querySelectorAll('input[type="radio"]');
    for (const radio of radios) {
      const label = radio.parentElement?.textContent?.toLowerCase() || '';
      
      // Select "Yes" options by default for work authorization, etc.
      if (label.includes('authorized') || label.includes('legally')) {
        if (label.includes('yes')) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
    
    // Handle dropdowns
    const selects = form.querySelectorAll('select');
    for (const select of selects) {
      if (!select.value && select.options.length > 1) {
        select.selectedIndex = 1; // Select first non-empty option
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    return { success: true, message: 'Form filled successfully' };
    
  } catch (error) {
    console.error('Error filling form:', error);
    return { success: false, error: error.message };
  }
}

// Submit application
async function submitApplication() {
  try {
    console.log('Submitting application...');
    
    // Find submit button
    const submitButton = document.querySelector(
      'button[aria-label*="Submit"], ' +
      'button[aria-label*="Review"], ' +
      'button[class*="artdeco-button--primary"]'
    );
    
    if (!submitButton) {
      throw new Error('Submit button not found');
    }
    
    // Check if it's a multi-step form
    const buttonText = submitButton.textContent.toLowerCase();
    if (buttonText.includes('next') || buttonText.includes('continue')) {
      // Click next and recursively handle next step
      submitButton.click();
      await sleep(2000);
      
      // Check if we're on the final step
      const newSubmitButton = document.querySelector('button[aria-label*="Submit"]');
      if (newSubmitButton) {
        return await submitApplication();
      } else {
        // Continue filling the next step
        await fillApplicationForm();
        return await submitApplication();
      }
    }
    
    // Final submission
    if (buttonText.includes('submit')) {
      // Simulate human-like behavior before submitting
      if (contentState.antiDetection) {
        await contentState.antiDetection.simulateHumanDelay();
      }
      
      submitButton.click();
      
      // Wait for confirmation
      await sleep(3000);
      
      // Check for success message
      const successMessage = document.querySelector(
        '[aria-label*="success"], ' +
        '[class*="success"], ' +
        '[role="alert"]'
      );
      
      if (successMessage) {
        chrome.runtime.sendMessage({
          type: 'APPLICATION_SUBMITTED',
          payload: { jobId: contentState.currentJob?.id }
        });
        
        return { success: true, message: 'Application submitted successfully' };
      }
    }
    
    return { success: false, error: 'Could not confirm submission' };
    
  } catch (error) {
    console.error('Error submitting application:', error);
    return { success: false, error: error.message };
  }
}

// Scroll to load more jobs
async function scrollToLoadMore() {
  try {
    const scrollContainer = document.querySelector('.jobs-search-results-list, .scaffold-layout__list-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      await sleep(2000);
      return { success: true };
    }
    
    // Fallback to window scroll
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2000);
    return { success: true };
    
  } catch (error) {
    console.error('Error scrolling:', error);
    return { success: false, error: error.message };
  }
}

// Update UI with status
function updateUI(status, stats) {
  // Create or update status overlay
  let overlay = document.getElementById('auto-apply-status');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'auto-apply-status';
    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 1px solid #0077b5;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 300px;
    `;
    document.body.appendChild(overlay);
  }
  
  overlay.innerHTML = `
    <div style="font-weight: bold; color: #0077b5; margin-bottom: 10px;">
      Auto-Apply Status
    </div>
    <div style="font-size: 14px; color: #333;">
      ${status}
    </div>
    ${stats ? `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 13px;">
        <div>Jobs Found: ${stats.jobsFound || 0}</div>
        <div>Matches: ${stats.matches || 0}</div>
        <div>Applied: ${stats.applied || 0}</div>
      </div>
    ` : ''}
  `;
}

// Observe page changes
function observePageChanges() {
  // Set up mutation observer to detect page changes
  contentState.observer = new MutationObserver((mutations) => {
    // Check if URL changed (LinkedIn is SPA)
    if (window.location.href !== contentState.lastUrl) {
      contentState.lastUrl = window.location.href;
      console.log('Page changed, re-analyzing...');
      analyzePage();
    }
  });
  
  contentState.observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Helper functions
function waitForElement(selector, timeout = 5000) {
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
      reject(new Error(`Element ${selector} not found after ${timeout}ms`));
    }, timeout);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractExperienceLevel(text) {
  const levels = ['internship', 'entry', 'associate', 'mid', 'senior', 'executive', 'director'];
  const lowerText = text.toLowerCase();
  
  for (const level of levels) {
    if (lowerText.includes(level)) {
      return level;
    }
  }
  
  return 'any';
}

function extractJobType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('full-time') || lowerText.includes('full time')) {
    return 'full-time';
  } else if (lowerText.includes('part-time') || lowerText.includes('part time')) {
    return 'part-time';
  } else if (lowerText.includes('contract')) {
    return 'contract';
  } else if (lowerText.includes('temporary')) {
    return 'temporary';
  } else if (lowerText.includes('internship')) {
    return 'internship';
  }
  
  return 'full-time';
}

function extractSalary(text) {
  const salaryMatch = text.match(/\$?([\d,]+)(?:k|K)?(?:\s*-\s*\$?([\d,]+)(?:k|K)?)?/);
  
  if (salaryMatch) {
    const min = parseInt(salaryMatch[1].replace(/,/g, ''));
    const max = salaryMatch[2] ? parseInt(salaryMatch[2].replace(/,/g, '')) : min;
    
    return {
      min: min * (text.includes('k') || text.includes('K') ? 1000 : 1),
      max: max * (text.includes('k') || text.includes('K') ? 1000 : 1),
      currency: 'USD',
      period: text.includes('hour') ? 'hourly' : 'yearly'
    };
  }
  
  return null;
}

// Get jobs on current page
async function getJobsOnPage() {
  const jobs = await findJobsOnPage();
  return { success: true, jobs };
}

console.log('LinkedIn Auto-Apply content script initialized');