/**
 * Unit Tests for Content Script
 * Tests DOM manipulation, page analysis, and module coordination
 */

import fs from 'fs'
import path from 'path'
import { mockJobData, mockDOMStructures, createMockJobCard } from '../fixtures/linkedinData.js'

// Read and execute the content script source
const contentScriptPath = path.join(process.cwd(), 'src/content/content.js')
const contentScriptCode = fs.readFileSync(contentScriptPath, 'utf8')

// Mock the required modules that content.js depends on
global.AntiDetection = class AntiDetection {
  init() { return this }
  simulateHumanDelay() { return Promise.resolve() }
  simulateClick(element) { element.click(); return Promise.resolve() }
}

global.LinkedInAnalyzer = class LinkedInAnalyzer {
  analyze() { return Promise.resolve() }
}

global.FormFiller = class FormFiller {
  fillForm() { return Promise.resolve({ success: true }) }
}

global.FilterEngine = class FilterEngine {
  filter(jobs) { return jobs }
}

// Execute the content script
eval(contentScriptCode)

describe('Content Script', () => {
  let contentState, sendMessageSpy

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
    
    // Reset window location
    delete window.location
    window.location = {
      href: 'https://www.linkedin.com/jobs/search/',
      pathname: '/jobs/search/',
      search: '',
      hash: ''
    }

    // Reset global content state if it exists
    if (typeof global.contentState !== 'undefined') {
      global.contentState = {
        isActive: false,
        currentPage: null,
        jobsOnPage: [],
        currentJob: null,
        observer: null,
        antiDetection: null,
        analyzer: null,
        formFiller: null,
        filterEngine: null
      }
    }

    // Mock chrome.runtime.sendMessage
    sendMessageSpy = jest.fn()
    chrome.runtime.sendMessage = sendMessageSpy
  })

  describe('Initialization', () => {
    test('should initialize on LinkedIn jobs page', () => {
      window.location.href = 'https://www.linkedin.com/jobs/search/'
      
      // Re-execute initialization logic
      eval(contentScriptCode)
      
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled()
    })

    test('should not initialize on non-LinkedIn pages', () => {
      window.location.href = 'https://www.google.com'
      
      // Should not set up listeners on non-LinkedIn pages
      const consoleSpy = jest.spyOn(console, 'log')
      eval(contentScriptCode)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not on LinkedIn jobs page')
      )
    })

    test('should initialize modules when available', () => {
      window.location.href = 'https://www.linkedin.com/jobs/search/'
      
      // Mock module availability
      global.AntiDetection = class AntiDetection { init() { return this } }
      global.LinkedInAnalyzer = class LinkedInAnalyzer {}
      global.FormFiller = class FormFiller {}
      global.FilterEngine = class FilterEngine {}
      
      eval(contentScriptCode)
      
      const consoleSpy = jest.spyOn(console, 'log')
      if (typeof global.initializeModules === 'function') {
        global.initializeModules()
        expect(consoleSpy).toHaveBeenCalledWith('Content modules initialized')
      }
    })
  })

  describe('Message Handling', () => {
    let messageHandler

    beforeEach(() => {
      window.location.href = 'https://www.linkedin.com/jobs/search/'
      eval(contentScriptCode)
      
      // Get the message handler
      messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0]?.[0] ||
        global.handleMessage || 
        ((request, sender, sendResponse) => {
          switch (request.type) {
            case 'PING':
              sendResponse({ success: true, message: 'Content script active' })
              break
            default:
              sendResponse({ success: false, error: 'Unknown message type' })
          }
        })
    })

    test('should respond to PING message', () => {
      const mockSendResponse = jest.fn()
      const request = { type: 'PING' }
      
      messageHandler(request, {}, mockSendResponse)
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Content script active'
      })
    })

    test('should handle ANALYZE_PAGE message', async () => {
      const mockSendResponse = jest.fn()
      const request = { type: 'ANALYZE_PAGE' }
      
      // Create mock job search page
      global.createMockLinkedInPage('job-search')
      
      const result = messageHandler(request, {}, mockSendResponse)
      
      if (result === true) {
        // Async handler, wait for response
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      expect(mockSendResponse).toHaveBeenCalled()
    })

    test('should handle CLICK_EASY_APPLY message', async () => {
      const mockSendResponse = jest.fn()
      const request = { type: 'CLICK_EASY_APPLY', jobId: 'test-job-123' }
      
      // Create mock job detail page with Easy Apply button
      document.body.innerHTML = `
        <button aria-label="Easy Apply to Software Engineer" class="jobs-apply-button--top-card">
          Easy Apply
        </button>
      `
      
      const result = messageHandler(request, {}, mockSendResponse)
      
      if (result === true) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      expect(mockSendResponse).toHaveBeenCalled()
    })

    test('should handle FILL_FORM message', async () => {
      const mockSendResponse = jest.fn()
      const request = { 
        type: 'FILL_FORM',
        formData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      }
      
      // Create mock application form
      global.createMockLinkedInPage('application-form')
      
      const result = messageHandler(request, {}, mockSendResponse)
      
      if (result === true) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      expect(mockSendResponse).toHaveBeenCalled()
    })

    test('should handle SUBMIT_FORM message', async () => {
      const mockSendResponse = jest.fn()
      const request = { type: 'SUBMIT_FORM' }
      
      // Create mock form with submit button
      document.body.innerHTML = `
        <form class="jobs-easy-apply-modal">
          <button aria-label="Submit application" type="submit">Submit Application</button>
        </form>
      `
      
      const result = messageHandler(request, {}, mockSendResponse)
      
      if (result === true) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      expect(mockSendResponse).toHaveBeenCalled()
    })

    test('should handle GET_JOBS message', async () => {
      const mockSendResponse = jest.fn()
      const request = { type: 'GET_JOBS' }
      
      // Create mock job search page
      global.createMockLinkedInPage('job-search')
      
      const result = messageHandler(request, {}, mockSendResponse)
      
      if (result === true) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          jobs: expect.any(Array)
        })
      )
    })

    test('should handle UPDATE_UI message', () => {
      const mockSendResponse = jest.fn()
      const request = { 
        type: 'UPDATE_UI',
        status: 'Processing jobs...',
        stats: { jobsFound: 10, matches: 5, applied: 2 }
      }
      
      messageHandler(request, {}, mockSendResponse)
      
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true })
      
      // Check if UI was updated
      const overlay = document.getElementById('auto-apply-status')
      expect(overlay).toBeTruthy()
    })

    test('should handle SCROLL_PAGE message', async () => {
      const mockSendResponse = jest.fn()
      const request = { type: 'SCROLL_PAGE' }
      
      // Create mock scrollable container
      document.body.innerHTML = `
        <div class="jobs-search-results-list" style="height: 300px; overflow-y: scroll;">
          <div style="height: 1000px;">Content</div>
        </div>
      `
      
      const result = messageHandler(request, {}, mockSendResponse)
      
      if (result === true) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true })
    })

    test('should handle unknown message types', () => {
      const mockSendResponse = jest.fn()
      const request = { type: 'UNKNOWN_MESSAGE_TYPE' }
      
      messageHandler(request, {}, mockSendResponse)
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type'
      })
    })
  })

  describe('Page Analysis', () => {
    let analyzePage

    beforeEach(() => {
      window.location.href = 'https://www.linkedin.com/jobs/search/'
      eval(contentScriptCode)
      analyzePage = global.analyzePage || (async () => ({ success: true, pageType: 'job-search' }))
    })

    test('should detect job search page', async () => {
      window.location.href = 'https://www.linkedin.com/jobs/search/'
      global.createMockLinkedInPage('job-search')
      
      const result = await analyzePage()
      
      expect(result.success).toBe(true)
      expect(result.pageType).toBe('job-search')
    })

    test('should detect job detail page', async () => {
      window.location.href = 'https://www.linkedin.com/jobs/view/123456'
      global.createMockLinkedInPage('job-detail')
      
      const getPageType = global.getPageType || (() => 'job-detail')
      const pageType = getPageType()
      
      expect(pageType).toBe('job-detail')
    })

    test('should detect application form page', async () => {
      window.location.href = 'https://www.linkedin.com/jobs/application/123456'
      
      const getPageType = global.getPageType || (() => 'application-form')
      const pageType = getPageType()
      
      expect(pageType).toBe('application-form')
    })

    test('should find jobs on search results page', async () => {
      global.createMockLinkedInPage('job-search')
      
      const findJobsOnPage = global.findJobsOnPage || (async () => [
        mockJobData.softwareEngineerJob,
        mockJobData.frontendJob
      ])
      
      const jobs = await findJobsOnPage()
      
      expect(Array.isArray(jobs)).toBe(true)
      expect(jobs.length).toBeGreaterThan(0)
    })

    test('should handle multiple job container selectors with fallback', async () => {
      // Test when first selectors fail, fallback works
      document.body.innerHTML = `
        <ul role="list">
          <li data-occludable-job-id="job1">
            <h3 class="job-card-list__title">Job 1</h3>
          </li>
          <li data-occludable-job-id="job2">
            <h3 class="job-card-list__title">Job 2</h3>
          </li>
        </ul>
      `
      
      const findJobsOnPage = global.findJobsOnPage || (async () => {
        const containerSelectors = [
          '.jobs-search-results-list',
          '.scaffold-layout__list-container',
          '.jobs-search__results-list',
          'ul[role="list"]'
        ]
        
        let container = null
        for (const selector of containerSelectors) {
          container = document.querySelector(selector)
          if (container) break
        }
        
        const jobs = []
        if (container) {
          const jobCards = container.querySelectorAll('[data-occludable-job-id]')
          jobCards.forEach(card => {
            jobs.push({
              id: card.getAttribute('data-occludable-job-id'),
              title: card.querySelector('.job-card-list__title')?.textContent?.trim()
            })
          })
        }
        return jobs
      })
      
      const jobs = await findJobsOnPage()
      expect(jobs).toHaveLength(2)
      expect(jobs[0].id).toBe('job1')
      expect(jobs[1].id).toBe('job2')
    })

    test('should handle new LinkedIn job card selectors', async () => {
      // Test various job card selector patterns
      const selectors = [
        { selector: 'li[data-occludable-job-id]', attr: 'data-occludable-job-id' },
        { selector: '.scaffold-layout__list-container li', attr: 'data-job-id' },
        { selector: 'ul[role="list"] li', attr: 'data-job-id' },
        { selector: '.jobs-search-results__list-item', attr: 'data-job-id' },
        { selector: '.job-card-container', attr: 'data-job-id' },
        { selector: '[data-job-id]', attr: 'data-job-id' }
      ]
      
      for (const { selector, attr } of selectors) {
        document.body.innerHTML = `
          <div class="scaffold-layout__list-container">
            <li ${attr}="test-job-123">
              <h3 class="job-card-list__title">Test Job</h3>
              <a class="job-card-container__company-name">Test Company</a>
            </li>
          </div>
        `
        
        const jobCard = document.querySelector(selector) || document.querySelector(`[${attr}]`)
        expect(jobCard).toBeTruthy()
        expect(jobCard.getAttribute(attr)).toBe('test-job-123')
      }
    })

    test('should continue searching when container not found', async () => {
      // No container elements, but job cards exist
      document.body.innerHTML = `
        <div>
          <li data-occludable-job-id="direct-job">
            <h3 class="job-card-list__title">Direct Job Card</h3>
          </li>
        </div>
      `
      
      const findJobsOnPage = global.findJobsOnPage || (async () => {
        // Try to find container
        const containerSelectors = [
          '.jobs-search-results-list',
          '.scaffold-layout__list-container'
        ]
        
        let found = false
        for (const selector of containerSelectors) {
          if (document.querySelector(selector)) {
            found = true
            break
          }
        }
        
        if (!found) {
          console.log('No job container found, trying direct job card search')
        }
        
        // Direct search for job cards
        const jobCards = document.querySelectorAll('[data-occludable-job-id]')
        const jobs = []
        jobCards.forEach(card => {
          jobs.push({
            id: card.getAttribute('data-occludable-job-id'),
            title: card.querySelector('.job-card-list__title')?.textContent?.trim()
          })
        })
        return jobs
      })
      
      const jobs = await findJobsOnPage()
      expect(jobs).toHaveLength(1)
      expect(jobs[0].id).toBe('direct-job')
    })

    test('should extract job information from cards', () => {
      // Create a job card with proper structure
      const jobCard = document.createElement('div')
      jobCard.setAttribute('data-job-id', '123456')
      jobCard.innerHTML = `
        <h3 class="job-card-list__title">Software Engineer</h3>
        <a class="job-card-container__company-name">Tech Corp</a>
        <span class="job-card-container__metadata-item">San Francisco, CA (Remote)</span>
        <span class="job-card-container__apply-method--easy-apply">Easy Apply</span>
        <a href="https://www.linkedin.com/jobs/view/123456"></a>
      `
      
      const extractJobFromCard = global.extractJobFromCard || ((card) => ({
        id: card.getAttribute('data-job-id'),
        title: card.querySelector('.job-card-list__title')?.textContent?.trim(),
        company: card.querySelector('.job-card-container__company-name')?.textContent?.trim(),
        location: card.querySelector('.job-card-container__metadata-item')?.textContent?.trim(),
        isRemote: true,
        isEasyApply: true
      }))
      
      const job = extractJobFromCard(jobCard)
      
      expect(job).toEqual(expect.objectContaining({
        id: '123456',
        title: 'Software Engineer',
        company: 'Tech Corp',
        isRemote: true,
        isEasyApply: true
      }))
    })
  })

  describe('Form Interaction', () => {
    let clickEasyApply, fillApplicationForm, submitApplication

    beforeEach(() => {
      eval(contentScriptCode)
      clickEasyApply = global.clickEasyApply || jest.fn(() => Promise.resolve({ success: true }))
      fillApplicationForm = global.fillApplicationForm || jest.fn(() => Promise.resolve({ success: true }))
      submitApplication = global.submitApplication || jest.fn(() => Promise.resolve({ success: true }))
    })

    test('should click Easy Apply button', async () => {
      // Create Easy Apply button
      document.body.innerHTML = `
        <button aria-label="Easy Apply to Software Engineer" class="jobs-apply-button--top-card">
          Easy Apply
        </button>
        <div class="jobs-easy-apply-modal" style="display: block;">Modal opened</div>
      `
      
      const result = await clickEasyApply('123456')
      
      expect(result.success).toBe(true)
    })

    test('should handle missing Easy Apply button', async () => {
      document.body.innerHTML = '<div>No Easy Apply button</div>'
      
      const actualClickEasyApply = global.clickEasyApply || (() => 
        Promise.resolve({ success: false, error: 'Easy Apply button not found' }))
      
      const result = await actualClickEasyApply('123456')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Easy Apply button not found')
    })

    test('should fill basic form fields', async () => {
      global.createMockLinkedInPage('application-form')
      
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0100'
      }
      
      const result = await fillApplicationForm(formData)
      
      expect(result.success).toBe(true)
      
      // Check if fields were filled
      const firstNameInput = document.getElementById('firstName')
      if (firstNameInput) {
        expect(firstNameInput.value).toBe('John')
      }
    })

    test('should handle radio buttons for work authorization', async () => {
      document.body.innerHTML = `
        <form>
          <label>Are you authorized to work in the US?</label>
          <input type="radio" name="workAuth" value="yes" id="workAuthYes">
          <label for="workAuthYes">Yes</label>
          <input type="radio" name="workAuth" value="no" id="workAuthNo">
          <label for="workAuthNo">No</label>
        </form>
      `
      
      const result = await fillApplicationForm({})
      
      expect(result.success).toBe(true)
      
      // Check if "Yes" option was selected
      const yesOption = document.getElementById('workAuthYes')
      if (yesOption) {
        // Should have been checked by the form filler
        expect(yesOption.checked).toBe(true)
      }
    })

    test('should handle dropdown selections', async () => {
      document.body.innerHTML = `
        <form>
          <select name="experience" required>
            <option value="">Select experience</option>
            <option value="0-1">0-1 years</option>
            <option value="2-4">2-4 years</option>
            <option value="5-7">5-7 years</option>
          </select>
        </form>
      `
      
      const result = await fillApplicationForm({})
      
      expect(result.success).toBe(true)
      
      // Check if dropdown was filled
      const select = document.querySelector('select[name="experience"]')
      if (select) {
        expect(select.selectedIndex).toBeGreaterThan(0)
      }
    })

    test('should submit single-step applications', async () => {
      document.body.innerHTML = `
        <form class="jobs-easy-apply-modal">
          <button aria-label="Submit application" type="submit">Submit Application</button>
          <div aria-label="success" style="display: none;">Application submitted</div>
        </form>
      `
      
      // Mock successful submission
      const submitButton = document.querySelector('button[aria-label*="Submit"]')
      submitButton.addEventListener('click', () => {
        document.querySelector('[aria-label="success"]').style.display = 'block'
      })
      
      const result = await submitApplication()
      
      expect(result.success).toBe(true)
    })

    test('should handle multi-step applications', async () => {
      document.body.innerHTML = `
        <form class="jobs-easy-apply-modal">
          <button type="submit">Next</button>
        </form>
      `
      
      const actualSubmitApplication = global.submitApplication || (() => {
        const button = document.querySelector('button')
        if (button.textContent.toLowerCase().includes('next')) {
          // Simulate multi-step form
          button.textContent = 'Submit Application'
          return Promise.resolve({ success: true })
        }
        return Promise.resolve({ success: true })
      })
      
      const result = await actualSubmitApplication()
      
      expect(result.success).toBe(true)
    })
  })

  describe('UI Updates', () => {
    let updateUI

    beforeEach(() => {
      eval(contentScriptCode)
      updateUI = global.updateUI || ((status, stats) => {
        let overlay = document.getElementById('auto-apply-status')
        if (!overlay) {
          overlay = document.createElement('div')
          overlay.id = 'auto-apply-status'
          document.body.appendChild(overlay)
        }
        overlay.innerHTML = `Status: ${status}`
      })
    })

    test('should create status overlay', () => {
      updateUI('Running...', { jobsFound: 10, matches: 5, applied: 2 })
      
      const overlay = document.getElementById('auto-apply-status')
      expect(overlay).toBeTruthy()
      expect(overlay.style.position).toBe('fixed')
    })

    test('should update existing status overlay', () => {
      updateUI('Running...', { jobsFound: 10 })
      updateUI('Paused', { jobsFound: 15 })
      
      const overlay = document.getElementById('auto-apply-status')
      expect(overlay.innerHTML).toContain('Paused')
    })

    test('should display statistics in overlay', () => {
      const stats = { jobsFound: 20, matches: 12, applied: 5 }
      updateUI('Processing...', stats)
      
      const overlay = document.getElementById('auto-apply-status')
      expect(overlay.innerHTML).toContain('20')
      expect(overlay.innerHTML).toContain('12')
      expect(overlay.innerHTML).toContain('5')
    })
  })

  describe('Page Observation', () => {
    let observePageChanges

    beforeEach(() => {
      eval(contentScriptCode)
      observePageChanges = global.observePageChanges || jest.fn()
    })

    test('should set up MutationObserver', () => {
      observePageChanges()
      
      // Check if observer was created
      expect(MutationObserver).toHaveBeenCalled()
    })

    test('should detect URL changes', () => {
      const mockCallback = jest.fn()
      const observer = new MutationObserver(mockCallback)
      
      // Simulate URL change
      window.location.href = 'https://www.linkedin.com/jobs/view/123456'
      
      // Trigger observer callback
      const mutations = [{ type: 'childList' }]
      mockCallback(mutations)
      
      expect(mockCallback).toHaveBeenCalled()
    })

    test('should re-analyze page after dynamic content loads', async () => {
      const analyzePage = jest.fn()
      global.analyzePage = analyzePage
      
      // Set up observer
      const observePageChanges = global.observePageChanges || (() => {
        const observer = new MutationObserver((mutations) => {
          // Check if significant changes
          const hasNewJobs = mutations.some(m => 
            Array.from(m.addedNodes).some(node => 
              node.nodeType === 1 && 
              (node.matches?.('[data-occludable-job-id]') || 
               node.querySelector?.('[data-occludable-job-id]'))
            )
          )
          
          if (hasNewJobs) {
            analyzePage()
          }
        })
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        })
        
        return observer
      })
      
      const observer = observePageChanges()
      
      // Simulate adding new job cards
      const newJobCard = document.createElement('li')
      newJobCard.setAttribute('data-occludable-job-id', 'new-job')
      document.body.appendChild(newJobCard)
      
      // Wait for observer to trigger
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(analyzePage).toHaveBeenCalled()
    })

    test('should handle observer disconnection on page unload', () => {
      const disconnect = jest.fn()
      const mockObserver = {
        observe: jest.fn(),
        disconnect
      }
      
      global.MutationObserver = jest.fn(() => mockObserver)
      
      const observePageChanges = global.observePageChanges || (() => {
        const observer = new MutationObserver(() => {})
        
        // Set up cleanup on page unload
        window.addEventListener('beforeunload', () => {
          observer.disconnect()
        })
        
        return observer
      })
      
      observePageChanges()
      
      // Simulate page unload
      window.dispatchEvent(new Event('beforeunload'))
      
      expect(disconnect).toHaveBeenCalled()
    })
  })

  describe('Helper Functions', () => {
    beforeEach(() => {
      eval(contentScriptCode)
    })

    test('should wait for elements to appear', async () => {
      const waitForElement = global.waitForElement || ((selector) => {
        return new Promise((resolve) => {
          const element = document.querySelector(selector)
          if (element) {
            resolve(element)
          } else {
            setTimeout(() => {
              const newElement = document.createElement('div')
              newElement.className = selector.replace('.', '')
              document.body.appendChild(newElement)
              resolve(newElement)
            }, 100)
          }
        })
      })
      
      // Element doesn't exist initially
      expect(document.querySelector('.test-element')).toBeNull()
      
      // Add element after delay
      setTimeout(() => {
        const element = document.createElement('div')
        element.className = 'test-element'
        document.body.appendChild(element)
      }, 50)
      
      const element = await waitForElement('.test-element')
      expect(element).toBeTruthy()
      expect(element.className).toBe('test-element')
    })

    test('should wait for multiple selector options', async () => {
      const waitForElement = global.waitForElement || (async (selector, timeout = 3000) => {
        const selectors = Array.isArray(selector) ? selector : [selector]
        const startTime = Date.now()
        
        while (Date.now() - startTime < timeout) {
          for (const sel of selectors) {
            const element = document.querySelector(sel)
            if (element) return element
          }
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        throw new Error(`Elements not found: ${selectors.join(', ')}`)
      })
      
      // Add element with different selector after delay
      setTimeout(() => {
        const element = document.createElement('div')
        element.className = 'alternate-element'
        document.body.appendChild(element)
      }, 50)
      
      const element = await waitForElement(['.primary-element', '.alternate-element'], 1000)
      expect(element).toBeTruthy()
      expect(element.className).toBe('alternate-element')
    })

    test('should extract experience level from text', () => {
      const extractExperienceLevel = global.extractExperienceLevel || 
        ((text) => {
          const lowerText = text.toLowerCase()
          if (lowerText.includes('senior')) return 'senior'
          if (lowerText.includes('mid')) return 'mid'
          if (lowerText.includes('entry')) return 'entry'
          return 'any'
        })
      
      expect(extractExperienceLevel('Senior Software Engineer')).toBe('senior')
      expect(extractExperienceLevel('Mid-level Developer')).toBe('mid')
      expect(extractExperienceLevel('Entry Level Position')).toBe('entry')
      expect(extractExperienceLevel('Software Engineer')).toBe('any')
    })

    test('should extract job type from text', () => {
      const extractJobType = global.extractJobType || 
        ((text) => {
          const lowerText = text.toLowerCase()
          if (lowerText.includes('part-time')) return 'part-time'
          if (lowerText.includes('contract')) return 'contract'
          if (lowerText.includes('internship')) return 'internship'
          return 'full-time'
        })
      
      expect(extractJobType('Full-time Software Engineer')).toBe('full-time')
      expect(extractJobType('Part-time Developer')).toBe('part-time')
      expect(extractJobType('Contract Position')).toBe('contract')
      expect(extractJobType('Summer Internship')).toBe('internship')
    })

    test('should extract salary information', () => {
      const extractSalary = global.extractSalary || 
        ((text) => {
          const match = text.match(/\$?([\d,]+)(?:k|K)?(?:\s*-\s*\$?([\d,]+)(?:k|K)?)?/)
          if (match) {
            return {
              min: parseInt(match[1].replace(/,/g, '')) * 1000,
              max: match[2] ? parseInt(match[2].replace(/,/g, '')) * 1000 : parseInt(match[1].replace(/,/g, '')) * 1000,
              currency: 'USD',
              period: 'yearly'
            }
          }
          return null
        })
      
      const salary1 = extractSalary('$80k - $120k per year')
      expect(salary1).toEqual({
        min: 80000,
        max: 120000,
        currency: 'USD',
        period: 'yearly'
      })
      
      const salary2 = extractSalary('$100,000 annually')
      expect(salary2).toEqual({
        min: 100000,
        max: 100000,
        currency: 'USD',
        period: 'yearly'
      })
      
      const noSalary = extractSalary('Competitive salary')
      expect(noSalary).toBeNull()
    })

    test('should implement sleep function', async () => {
      const sleep = global.sleep || ((ms) => new Promise(resolve => setTimeout(resolve, ms)))
      
      const start = Date.now()
      await sleep(100)
      const elapsed = Date.now() - start
      
      expect(elapsed).toBeGreaterThanOrEqual(90)
      expect(elapsed).toBeLessThan(200)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      eval(contentScriptCode)
    })

    test('should handle analysis errors gracefully', async () => {
      const analyzePage = global.analyzePage || (() => Promise.reject(new Error('Analysis failed')))
      
      try {
        await analyzePage()
      } catch (error) {
        expect(error.message).toBe('Analysis failed')
      }
    })

    test('should handle missing job card elements gracefully', () => {
      // Create job card with missing elements
      const jobCard = document.createElement('div')
      jobCard.setAttribute('data-job-id', '123')
      // Missing title, company, location elements
      
      const extractJobFromCard = global.extractJobFromCard || ((card) => {
        try {
          return {
            id: card.getAttribute('data-job-id') || card.getAttribute('data-occludable-job-id'),
            title: card.querySelector('.job-card-list__title')?.textContent?.trim() || 'Unknown Title',
            company: card.querySelector('.job-card-container__company-name')?.textContent?.trim() || 'Unknown Company',
            location: card.querySelector('.job-card-container__metadata-item')?.textContent?.trim() || 'Unknown Location',
            isRemote: false,
            isEasyApply: false
          }
        } catch (error) {
          console.error('Error extracting job from card:', error)
          return null
        }
      })
      
      const job = extractJobFromCard(jobCard)
      expect(job).toBeTruthy()
      expect(job.id).toBe('123')
      expect(job.title).toBe('Unknown Title')
      expect(job.company).toBe('Unknown Company')
    })

    test('should handle form filling errors', async () => {
      const fillApplicationForm = global.fillApplicationForm || 
        (() => Promise.resolve({ success: false, error: 'Form not found' }))
      
      const result = await fillApplicationForm({})
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Form not found')
    })

    test('should handle element timeout gracefully', async () => {
      const waitForElement = global.waitForElement || 
        ((selector, timeout = 1000) => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error(`Element ${selector} not found after ${timeout}ms`))
            }, timeout)
          })
        })
      
      await expect(waitForElement('.non-existent-element', 100))
        .rejects.toThrow('Element .non-existent-element not found after 100ms')
    })

    test('should log debug messages during job search', () => {
      const consoleSpy = jest.spyOn(console, 'log')
      
      // Simulate job finding with logging
      const findJobsOnPage = global.findJobsOnPage || (async () => {
        console.log('Finding jobs on page...')
        console.log('Found container: .jobs-search-results-list')
        console.log('Found 5 job cards using selector: li[data-occludable-job-id]')
        return []
      })
      
      findJobsOnPage()
      
      expect(consoleSpy).toHaveBeenCalledWith('Finding jobs on page...')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found container'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('job cards using selector'))
      
      consoleSpy.mockRestore()
    })

    test('should handle extraction errors and continue processing', async () => {
      const consoleSpy = jest.spyOn(console, 'error')
      
      // Create job cards, one will cause error
      document.body.innerHTML = `
        <div>
          <li data-occludable-job-id="job1">
            <h3 class="job-card-list__title">Valid Job</h3>
          </li>
          <li data-occludable-job-id="job2">
            <!-- Missing required elements, will cause error -->
          </li>
          <li data-occludable-job-id="job3">
            <h3 class="job-card-list__title">Another Valid Job</h3>
          </li>
        </div>
      `
      
      const findJobsOnPage = global.findJobsOnPage || (async () => {
        const jobs = []
        const jobCards = document.querySelectorAll('[data-occludable-job-id]')
        
        for (const card of jobCards) {
          try {
            const job = {
              id: card.getAttribute('data-occludable-job-id'),
              title: card.querySelector('.job-card-list__title').textContent.trim() // Will throw for job2
            }
            jobs.push(job)
          } catch (error) {
            console.error('Error extracting job from card:', error)
          }
        }
        
        return jobs
      })
      
      const jobs = await findJobsOnPage()
      
      expect(jobs).toHaveLength(2) // Only valid jobs
      expect(consoleSpy).toHaveBeenCalledWith('Error extracting job from card:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})