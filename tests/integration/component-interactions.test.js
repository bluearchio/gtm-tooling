/**
 * Integration Tests for Component Interactions
 * Tests how different modules work together in realistic scenarios
 */

import fs from 'fs'
import path from 'path'
import { mockJobData, mockUserProfile, mockDOMStructures, createMockJobCard } from '../fixtures/linkedinData.js'

// Load all source files
const loadModule = (filename) => {
  const filePath = path.join(process.cwd(), 'src/content', filename)
  return fs.readFileSync(filePath, 'utf8')
}

// Load modules from different directories
const loadContentModule = (filename) => {
  const filePath = path.join(process.cwd(), 'src/content', filename)
  return fs.readFileSync(filePath, 'utf8')
}

const loadUtilModule = (filename) => {
  const filePath = path.join(process.cwd(), 'src/utils', filename)
  return fs.readFileSync(filePath, 'utf8')
}

const loadBackgroundModule = (filename) => {
  const filePath = path.join(process.cwd(), 'src/background', filename)
  return fs.readFileSync(filePath, 'utf8')
}

// Execute all modules in order
eval(loadContentModule('anti-detection.js'))
eval(loadContentModule('linkedin-analyzer.js'))
eval(loadContentModule('form-filler.js'))
eval(loadContentModule('filter-engine.js'))
eval(loadUtilModule('storage.js'))
eval(loadContentModule('content.js'))

// Partially load service worker for testing (avoid global state conflicts)
const serviceWorkerCode = loadBackgroundModule('service-worker.js')
// Extract only the functions we need for testing
const filterJobsMatch = serviceWorkerCode.match(/async function filterJobs\([\s\S]*?^}/m)
const evaluateJobMatchMatch = serviceWorkerCode.match(/async function evaluateJobMatch\([\s\S]*?^}/m)
if (filterJobsMatch) eval(filterJobsMatch[0])
if (evaluateJobMatchMatch) eval(evaluateJobMatchMatch[0])

describe('Component Integration Tests', () => {
  let analyzer, formFiller, antiDetection, filterEngine, storage
  
  beforeEach(async () => {
    // Reset DOM
    document.body.innerHTML = ''
    
    // Reset location
    window.location.href = 'https://www.linkedin.com/jobs/search/'
    
    // Setup storage mocks
    chrome.storage.local.get.mockResolvedValue({
      userProfile: mockUserProfile,
      customAnswers: mockUserProfile.customAnswers,
      antiDetectionConfig: {
        enabled: true,
        humanizeActions: true,
        randomizeDelays: true
      }
    })
    
    // Initialize modules
    antiDetection = new AntiDetectionSystem()
    analyzer = new LinkedInAnalyzer()
    formFiller = new FormFiller()
    filterEngine = new FilterEngine()
    storage = global.Storage || globalThis.Storage
    
    await antiDetection.loadConfig()
    await formFiller.init()
    await filterEngine.loadConfig()
    
    // Expose modules globally for content script
    window.antiDetection = antiDetection
    window.linkedInAnalyzer = analyzer
    window.formFiller = formFiller
    window.filterEngine = filterEngine
    window.storage = storage
  })

  describe('Job Discovery and Analysis Workflow', () => {
    test('should discover jobs and analyze them comprehensively', async () => {
      // Setup job search page
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      
      // Trigger page analysis
      const analysis = await analyzePage()
      
      expect(analysis.success).toBe(true)
      expect(analysis.pageType).toBe('job-search')
      expect(analysis.jobsCount).toBeGreaterThan(0)
      
      // Verify jobs were cached in analyzer
      expect(analyzer.jobCache.size).toBeGreaterThan(0)
      
      // Verify message was sent to background
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'JOBS_FOUND',
          payload: expect.objectContaining({
            jobs: expect.any(Array)
          })
        })
      )
    })

    test('should analyze job detail page and extract comprehensive data', async () => {
      // Setup job detail page
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = 'https://www.linkedin.com/jobs/view/3472839472/'
      
      // Mock waitForElement to resolve immediately
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      
      const analysis = await analyzePage()
      
      expect(analysis.success).toBe(true)
      expect(analysis.pageType).toBe('job-detail')
      expect(analysis.job).toBeDefined()
      expect(analysis.job.description).toContain('Senior Software Engineer')
      expect(analysis.job.requirements).toBeInstanceOf(Array)
      expect(analysis.job.benefits).toBeInstanceOf(Array)
    })

    test('should handle page transitions correctly', async () => {
      // Start on search page
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      window.location.href = 'https://www.linkedin.com/jobs/search/'
      
      let analysis = await analyzePage()
      expect(analysis.pageType).toBe('job-search')
      
      // Navigate to job detail
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = 'https://www.linkedin.com/jobs/view/123456789/'
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      
      analysis = await analyzePage()
      expect(analysis.pageType).toBe('job-detail')
    })
  })

  describe('Application Form Analysis and Filling Integration', () => {
    test('should analyze form and fill it with user data', async () => {
      // Setup application form page
      document.body.innerHTML = mockDOMStructures.applicationFormPage
      
      // Analyze form structure
      const formAnalysis = formFiller.analyzeCurrentForm()
      expect(formAnalysis.hasForm).toBe(true)
      expect(formAnalysis.canAutoFill).toBeGreaterThan(0)
      
      // Fill the form
      const fillResult = await formFiller.fillForm()
      
      expect(fillResult.success).toBe(true)
      expect(fillResult.filledFields).toBeGreaterThan(0)
      
      // Verify form fields were filled correctly
      const firstNameInput = document.getElementById('firstName')
      const lastNameInput = document.getElementById('lastName')
      const emailInput = document.getElementById('email')
      
      expect(firstNameInput.value).toBe(mockUserProfile.firstName)
      expect(lastNameInput.value).toBe(mockUserProfile.lastName)
      expect(emailInput.value).toBe(mockUserProfile.email)
    })

    test('should handle complex form interactions with anti-detection', async () => {
      // Setup form with various field types
      const form = document.createElement('form')
      form.innerHTML = `
        <input type="text" id="firstName" name="firstName" required>
        <select id="experience" name="experience" required>
          <option value="">Select...</option>
          <option value="2-4">2-4 years</option>
          <option value="5-7">5-7 years</option>
          <option value="8+">8+ years</option>
        </select>
        <input type="radio" name="workAuth" value="yes" id="workAuthYes" required>
        <input type="radio" name="workAuth" value="no" id="workAuthNo" required>
      `
      document.body.appendChild(form)
      
      // Mock anti-detection methods
      antiDetection.performAction = jest.fn().mockImplementation(async (type, action) => action())
      antiDetection.simulateTyping = jest.fn().mockResolvedValue()
      
      // Fill form with anti-detection
      const result = await formFiller.fillForm()
      
      expect(result.success).toBe(true)
      
      // Verify anti-detection was used for text fields
      if (antiDetection.config.humanizeActions) {
        expect(antiDetection.simulateTyping).toHaveBeenCalled()
      }
    })

    test('should handle form submission with validation', async () => {
      // Setup complete form
      document.body.innerHTML = mockDOMStructures.applicationFormPage
      
      // Fill form first
      await formFiller.fillForm()
      
      // Validate form
      const validation = formFiller.validateForm()
      expect(validation.isValid).toBe(true)
      
      // Submit form
      const submitResult = await formFiller.submitForm()
      expect(submitResult.success).toBe(true)
    })
  })

  describe('Anti-Detection Integration with Form Filling', () => {
    test('should use anti-detection delays during form filling', async () => {
      const form = document.createElement('form')
      form.innerHTML = `
        <input type="text" id="field1" name="field1">
        <input type="text" id="field2" name="field2">
        <input type="text" id="field3" name="field3">
      `
      document.body.appendChild(form)
      
      // Track timing
      const startTime = Date.now()
      
      // Mock anti-detection to add realistic delays
      antiDetection.performAction = jest.fn().mockImplementation(async (type, action) => {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        return action()
      })
      
      await formFiller.fillForm({ field1: 'value1', field2: 'value2', field3: 'value3' })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should take longer due to anti-detection delays
      expect(duration).toBeGreaterThan(200)
    })

    test('should simulate human-like typing when enabled', async () => {
      const input = document.createElement('input')
      input.type = 'text'
      input.id = 'testInput'
      document.body.appendChild(input)
      
      // Enable human typing simulation
      antiDetection.config.humanizeActions = true
      
      const typingSpy = jest.spyOn(antiDetection, 'simulateTyping').mockResolvedValue()
      
      const field = {
        element: input,
        suggestedValue: 'Test Value',
        mappedTo: 'firstName'
      }
      
      await formFiller.fillField(field, {})
      
      expect(typingSpy).toHaveBeenCalledWith(input, 'Test Value')
    })

    test('should coordinate mouse movements with form interactions', async () => {
      const form = document.createElement('form')
      const input = document.createElement('input')
      input.type = 'text'
      input.id = 'testField'
      
      // Mock getBoundingClientRect
      input.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 100, top: 200, width: 150, height: 30
      })
      
      form.appendChild(input)
      document.body.appendChild(form)
      
      const mouseMovementSpy = jest.spyOn(antiDetection, 'simulateMouseMovement').mockResolvedValue()
      
      // Configure anti-detection to use mouse movement
      antiDetection.config.simulateMouseMovement = true
      antiDetection.performAction = jest.fn().mockImplementation(async (type, action) => {
        if (type === 'form_fill') {
          await antiDetection.simulateMouseMovement(input)
        }
        return action()
      })
      
      await formFiller.fillForm({ testField: 'test value' })
      
      // Verify mouse movement was simulated
      expect(mouseMovementSpy).toHaveBeenCalledWith(input)
    })
  })

  describe('Content Script Coordination', () => {
    test('should coordinate between analyzer and form filler through content script', async () => {
      // Setup job detail page with Easy Apply
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = 'https://www.linkedin.com/jobs/view/123456789/'
      
      // Mock analyzer methods
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      
      // Analyze job detail
      await analyzePage()
      
      // Simulate clicking Easy Apply
      const easyApplyResult = await clickEasyApply('123456789')
      expect(easyApplyResult.success).toBe(true)
      
      // Setup application form modal
      document.body.innerHTML = mockDOMStructures.applicationFormPage
      
      // Fill application form
      const fillResult = await fillApplicationForm()
      expect(fillResult.success).toBe(true)
      
      // Submit application
      const submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)
    })

    test('should handle message passing between modules', () => {
      // Test analyzer message handling
      const analyzerListener = chrome.runtime.onMessage.addListener.mock.calls
        .find(call => call[0].toString().includes('LinkedInAnalyzer'))?.[0]
      
      if (analyzerListener) {
        const sendResponse = jest.fn()
        analyzerListener({ type: 'ANALYZE_PAGE' }, {}, sendResponse)
        expect(sendResponse).toHaveBeenCalled()
      }
      
      // Test form filler message handling
      const formFillerListener = chrome.runtime.onMessage.addListener.mock.calls
        .find(call => call[0].toString().includes('FormFiller'))?.[0]
      
      if (formFillerListener) {
        const sendResponse = jest.fn()
        formFillerListener({ type: 'ANALYZE_FORM' }, {}, sendResponse)
        expect(sendResponse).toHaveBeenCalled()
      }
    })

    test('should update UI consistently across modules', () => {
      const status = 'Processing application...'
      const stats = { jobsFound: 5, matches: 3, applied: 1 }
      
      // Update UI through content script
      updateUI(status, stats)
      
      // Verify UI elements were created/updated
      const overlay = document.getElementById('auto-apply-status')
      expect(overlay).toBeTruthy()
      expect(overlay.innerHTML).toContain(status)
      expect(overlay.innerHTML).toContain('Jobs Found: 5')
      
      // Update through analyzer
      analyzer.updateAnalysisUI(status, stats)
      
      const analyzerOverlay = document.getElementById('linkedin-auto-apply-overlay')
      expect(analyzerOverlay).toBeTruthy()
      expect(analyzerOverlay.style.display).toBe('block')
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle analyzer errors gracefully during form filling', async () => {
      // Setup page with malformed structure
      document.body.innerHTML = '<div>Malformed page content</div>'
      
      // Attempt analysis
      const analysis = await analyzePage()
      expect(analysis.pageType).toBe('unknown')
      
      // Form filling should still work if form is added
      const form = document.createElement('form')
      form.innerHTML = '<input type="text" name="test" required>'
      document.body.appendChild(form)
      
      const fillResult = await formFiller.fillForm({ test: 'value' })
      expect(fillResult.success).toBe(true)
    })

    test('should recover from anti-detection errors', async () => {
      const form = document.createElement('form')
      form.innerHTML = '<input type="text" id="test" name="test" required>'
      document.body.appendChild(form)
      
      // Mock anti-detection to throw error
      antiDetection.performAction = jest.fn().mockRejectedValue(new Error('Anti-detection failed'))
      
      // Form filling should fallback to direct filling
      const result = await formFiller.fillForm({ test: 'test value' })
      
      // Should still succeed with fallback
      expect(document.getElementById('test').value).toBe('test value')
    })

    test('should handle missing user profile data', async () => {
      // Clear user profile
      formFiller.userProfile = {
        firstName: '',
        lastName: '',
        email: ''
      }
      
      const form = document.createElement('form')
      form.innerHTML = `
        <input type="text" name="firstName" required>
        <input type="text" name="lastName" required>
        <input type="email" name="email" required>
      `
      document.body.appendChild(form)
      
      const result = await formFiller.fillForm()
      
      // Should report failures for missing data
      expect(result.success).toBe(true)
      expect(result.failedFields).toBeGreaterThan(0)
    })
  })

  describe('Performance Integration', () => {
    test('should handle large job listings efficiently', async () => {
      // Create large job listings page
      const container = document.createElement('div')
      container.className = 'jobs-search-results-list'
      
      for (let i = 0; i < 100; i++) {
        const jobCard = createMockJobCard({
          id: `job-${i}`,
          title: `Job ${i}`,
          company: `Company ${i}`,
          location: 'Test Location',
          isEasyApply: i % 2 === 0,
          postedDate: new Date(),
          applicants: i * 5
        })
        container.appendChild(jobCard)
      }
      
      document.body.appendChild(container)
      
      const startTime = performance.now()
      const jobs = await findJobsOnPage()
      const endTime = performance.now()
      
      expect(jobs.length).toBe(100)
      expect(endTime - startTime).toBeLessThan(2000) // Should complete in < 2 seconds
    })

    test('should handle rapid form interactions without bottlenecks', async () => {
      // Create form with many fields
      const form = document.createElement('form')
      
      for (let i = 0; i < 50; i++) {
        const input = document.createElement('input')
        input.type = 'text'
        input.name = `field${i}`
        input.id = `field${i}`
        form.appendChild(input)
      }
      
      document.body.appendChild(form)
      
      // Mock fast anti-detection
      antiDetection.performAction = jest.fn().mockImplementation(async (type, action) => action())
      antiDetection.generateDelay = jest.fn().mockReturnValue(10) // Very fast delays
      
      const startTime = performance.now()
      await formFiller.fillForm()
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(3000) // Should be reasonably fast
    })
  })

  describe('Complex Workflow Scenarios', () => {
    test('should handle complete job application workflow', async () => {
      // Phase 1: Job discovery
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      window.location.href = 'https://www.linkedin.com/jobs/search/'
      
      const searchAnalysis = await analyzePage()
      expect(searchAnalysis.success).toBe(true)
      expect(searchAnalysis.jobsCount).toBeGreaterThan(0)
      
      // Phase 2: Job detail analysis
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = 'https://www.linkedin.com/jobs/view/123456789/'
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      
      const detailAnalysis = await analyzePage()
      expect(detailAnalysis.success).toBe(true)
      expect(detailAnalysis.job).toBeDefined()
      
      // Phase 3: Easy Apply click
      const clickResult = await clickEasyApply('123456789')
      expect(clickResult.success).toBe(true)
      
      // Phase 4: Form filling
      document.body.innerHTML = mockDOMStructures.applicationFormPage
      
      const formAnalysis = await analyzeApplicationForm()
      expect(formAnalysis.success).toBe(true)
      
      const fillResult = await fillApplicationForm()
      expect(fillResult.success).toBe(true)
      
      // Phase 5: Submission
      const submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)
      
      // Verify all components worked together
      expect(analyzer.jobCache.size).toBeGreaterThan(0)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'APPLICATION_SUBMITTED' })
      )
    })

    test('should handle multi-step application forms', async () => {
      // Setup first step of form
      document.body.innerHTML = `
        <div class="jobs-easy-apply-modal">
          <form>
            <input type="text" name="firstName" required>
            <input type="text" name="lastName" required>
            <button type="submit">Next</button>
          </form>
        </div>
      `
      
      // Fill first step
      const step1Result = await fillApplicationForm()
      expect(step1Result.success).toBe(true)
      
      // Submit first step (should click "Next")
      let submitResult = await submitApplication()
      
      // Setup second step
      document.body.innerHTML = `
        <div class="jobs-easy-apply-modal">
          <form>
            <input type="email" name="email" required>
            <select name="experience" required>
              <option value="">Select...</option>
              <option value="5-7">5-7 years</option>
            </select>
            <button type="submit">Submit Application</button>
          </form>
        </div>
      `
      
      // Fill and submit second step
      const step2Result = await fillApplicationForm()
      expect(step2Result.success).toBe(true)
      
      submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)
    })

    test('should handle break patterns during automation', async () => {
      // Configure short break pattern for testing
      antiDetection.config.breakPatterns.enabled = true
      antiDetection.config.breakPatterns.minApplications = 2
      antiDetection.config.breakPatterns.maxApplications = 3
      antiDetection.config.breakPatterns.breakDuration = 0.01 // Very short
      
      antiDetection.actionsCount = 2 // Near break threshold
      
      const takeBreakSpy = jest.spyOn(antiDetection, 'takeBreak').mockResolvedValue()
      
      // Perform action that should trigger break
      const mockAction = jest.fn().mockResolvedValue('success')
      await antiDetection.performAction('application', mockAction)
      
      expect(takeBreakSpy).toHaveBeenCalled()
    })
  })

  describe('Data Flow and State Management', () => {
    test('should maintain consistent state across modules', async () => {
      // Initialize with job data
      const jobData = mockJobData.jobDetail
      analyzer.jobCache.set(jobData.id, jobData)
      
      // Verify data is accessible from content script
      const jobs = await getJobsOnPage()
      expect(jobs.success).toBe(true)
      
      // Verify analyzer state is maintained
      expect(analyzer.jobCache.has(jobData.id)).toBe(true)
      
      // Update through form filler
      formFiller.userProfile.firstName = 'Updated Name'
      
      // Verify profile update persists
      expect(formFiller.userProfile.firstName).toBe('Updated Name')
    })

    test('should handle concurrent operations safely', async () => {
      // Setup multiple forms
      const form1 = document.createElement('form')
      form1.innerHTML = '<input type="text" name="field1">'
      form1.id = 'form1'
      
      const form2 = document.createElement('form')
      form2.innerHTML = '<input type="text" name="field2">'
      form2.id = 'form2'
      
      document.body.appendChild(form1)
      document.body.appendChild(form2)
      
      // Mock anti-detection to add delays
      antiDetection.performAction = jest.fn().mockImplementation(async (type, action) => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return action()
      })
      
      // Start concurrent operations
      const promise1 = formFiller.fillForm({ field1: 'value1' })
      const promise2 = formFiller.fillForm({ field2: 'value2' })
      
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })

  describe('Filter Engine Integration', () => {
    test('should integrate filter engine with job discovery', async () => {
      // Configure filter engine
      filterEngine.config.filters = {
        isRemote: 'yes',
        keywords: ['react', 'javascript'],
        keywordLogic: 'OR',
        experienceLevel: 'senior',
        postedWithin: 7
      }

      // Setup job search page with various jobs
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      
      const jobs = await findJobsOnPage()
      expect(jobs.length).toBeGreaterThan(0)

      // Filter jobs using the filter engine
      const filteredJobs = filterEngine.filterJobs(jobs)
      
      // Should only include jobs that match criteria
      filteredJobs.forEach(job => {
        const matchResult = filterEngine.matchJob(job)
        expect(matchResult.matches).toBe(true)
        expect(job.matchScore).toBeGreaterThan(0.5)
        expect(Array.isArray(job.matchReasons)).toBe(true)
      })

      // Verify jobs are sorted by match score
      for (let i = 1; i < filteredJobs.length; i++) {
        expect(filteredJobs[i-1].matchScore).toBeGreaterThanOrEqual(filteredJobs[i].matchScore)
      }
    })

    test('should coordinate filter engine with background service worker', async () => {
      // Mock jobs data
      const testJobs = [
        { ...mockJobData.softwareEngineerJob, description: 'React and JavaScript development', isRemote: true },
        { ...mockJobData.frontendJob, description: 'Angular development', isRemote: false },
        { ...mockJobData.backendJob, description: 'Python backend services', isRemote: true }
      ]

      // Configure global state for service worker functions
      global.state = {
        config: {
          filters: {
            isRemote: 'yes',
            keywords: ['react', 'javascript'],
            keywordLogic: 'OR'
          }
        }
      }

      // Test background service worker filtering
      if (typeof global.filterJobs === 'function') {
        const filtered = await global.filterJobs(testJobs)
        
        expect(filtered.length).toBeLessThanOrEqual(testJobs.length)
        filtered.forEach(job => {
          expect(job.isRemote).toBe(true) // Should match remote filter
        })
      }
    })

    test('should handle real-time filter updates', async () => {
      // Setup initial jobs
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      const jobs = await findJobsOnPage()

      // Initial filter - broad criteria
      filterEngine.updateConfig({
        filters: {
          isRemote: 'any',
          keywords: [],
          experienceLevel: 'any'
        }
      })

      const initialFiltered = filterEngine.filterJobs(jobs)
      const initialCount = initialFiltered.length

      // Update filter - narrow criteria
      filterEngine.updateConfig({
        filters: {
          isRemote: 'yes',
          keywords: ['senior', 'react'],
          keywordLogic: 'AND',
          experienceLevel: 'senior'
        }
      })

      const updatedFiltered = filterEngine.filterJobs(jobs)
      const updatedCount = updatedFiltered.length

      // Should have fewer matches with stricter criteria
      expect(updatedCount).toBeLessThanOrEqual(initialCount)
    })

    test('should integrate filter engine with content script job analysis', async () => {
      // Setup job detail page
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = 'https://www.linkedin.com/jobs/view/123456789/'
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))

      // Analyze job detail
      const analysis = await analyzePage()
      expect(analysis.success).toBe(true)

      // Apply filtering to the analyzed job
      const matchResult = filterEngine.matchJob(analysis.job)
      
      expect(matchResult).toHaveProperty('matches')
      expect(matchResult).toHaveProperty('score')
      expect(matchResult).toHaveProperty('reasons')
      expect(matchResult).toHaveProperty('failedFilters')

      // If job matches, should have positive score and reasons
      if (matchResult.matches) {
        expect(matchResult.score).toBeGreaterThan(0)
        expect(matchResult.reasons.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Storage Integration', () => {
    test('should coordinate storage with form filler for user profile', async () => {
      // Save user profile through storage
      const testProfile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        currentTitle: 'Senior Developer'
      }

      await storage.saveUserProfile(testProfile)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ userProfile: testProfile })

      // Load profile in form filler
      chrome.storage.local.get.mockResolvedValue({ userProfile: testProfile })
      
      const profile = await storage.getUserProfile()
      expect(profile.firstName).toBe('John')

      // Use profile in form filling
      formFiller.userProfile = profile

      const form = document.createElement('form')
      form.innerHTML = `
        <input type="text" name="firstName" id="firstName" required>
        <input type="text" name="lastName" id="lastName" required>
        <input type="email" name="email" id="email" required>
      `
      document.body.appendChild(form)

      const fillResult = await formFiller.fillForm()
      expect(fillResult.success).toBe(true)

      expect(document.getElementById('firstName').value).toBe('John')
      expect(document.getElementById('lastName').value).toBe('Doe')
      expect(document.getElementById('email').value).toBe('john@example.com')
    })

    test('should coordinate storage with application tracking', async () => {
      const testJob = mockJobData.softwareEngineerJob
      
      // Check if already applied
      chrome.storage.local.get.mockResolvedValue({ applications: [] })
      const hasApplied = await storage.hasAppliedToJob(testJob.id)
      expect(hasApplied).toBe(false)

      // Record new application
      const application = {
        id: 'app-123',
        jobId: testJob.id,
        jobDetails: testJob,
        appliedAt: new Date().toISOString(),
        status: 'submitted'
      }

      await storage.addApplication(application)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        applications: [application]
      })

      // Check application count
      chrome.storage.local.get.mockResolvedValue({ 
        applications: [application] 
      })
      const todayCount = await storage.getTodayApplicationCount()
      expect(todayCount).toBe(1)

      // Update statistics
      const statsUpdate = {
        totalApplications: 1,
        successfulApplications: 1,
        successRate: 100
      }
      await storage.updateStatistics(statsUpdate)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        statistics: expect.objectContaining(statsUpdate)
      })
    })

    test('should handle configuration persistence across modules', async () => {
      // Update config through filter engine
      const newFilterConfig = {
        filters: {
          isRemote: 'yes',
          keywords: ['react', 'node'],
          keywordLogic: 'AND'
        }
      }

      filterEngine.updateConfig(newFilterConfig)
      
      // Save config through storage
      await storage.saveConfig(newFilterConfig)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ config: newFilterConfig })

      // Load config in different module
      chrome.storage.local.get.mockResolvedValue({ config: newFilterConfig })
      const loadedConfig = await storage.getConfig()
      
      expect(loadedConfig.filters.isRemote).toBe('yes')
      expect(loadedConfig.filters.keywords).toEqual(['react', 'node'])

      // Apply loaded config to filter engine
      filterEngine.updateConfig(loadedConfig)
      expect(filterEngine.config.filters.isRemote).toBe('yes')
    })

    test('should handle custom answers integration with form filling', async () => {
      const customAnswers = [
        { question: 'Why do you want this job?', answer: 'Great growth opportunity' },
        { question: 'Years of React experience?', answer: '5 years' }
      ]

      // Save custom answers
      await storage.saveCustomAnswers(customAnswers)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ customAnswers })

      // Load in form filler
      chrome.storage.local.get.mockResolvedValue({ customAnswers })
      const answers = await storage.getCustomAnswers()
      expect(answers).toEqual(customAnswers)

      // Use in form filling
      formFiller.customAnswers = answers

      const form = document.createElement('form')
      form.innerHTML = `
        <textarea name="motivation" placeholder="Why do you want this job?"></textarea>
        <input type="text" name="experience" placeholder="Years of experience">
      `
      document.body.appendChild(form)

      const fillResult = await formFiller.fillForm()
      expect(fillResult.success).toBe(true)

      // Should use custom answers for matching fields
      const motivationField = document.querySelector('textarea[name="motivation"]')
      const experienceField = document.querySelector('input[name="experience"]')
      
      expect(motivationField.value).toBe('Great growth opportunity')
      expect(experienceField.value).toBe('5 years')
    })
  })

  describe('Content Script Orchestration', () => {
    test('should coordinate all modules through content script messages', async () => {
      // Setup job search page
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      window.location.href = 'https://www.linkedin.com/jobs/search/'

      // Simulate content script message handling
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0]?.[0] ||
        global.handleMessage

      if (messageHandler) {
        // Test ANALYZE_PAGE message
        const mockSendResponse = jest.fn()
        const result = messageHandler({ type: 'ANALYZE_PAGE' }, {}, mockSendResponse)
        
        if (result === true) {
          // Async handler
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        expect(mockSendResponse).toHaveBeenCalled()

        // Test GET_JOBS message
        const jobsResponse = jest.fn()
        messageHandler({ type: 'GET_JOBS' }, {}, jobsResponse)
        
        if (result === true) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        expect(jobsResponse).toHaveBeenCalled()
      }
    })

    test('should handle job filtering during page analysis', async () => {
      // Configure filter engine
      filterEngine.config.filters = {
        isRemote: 'yes',
        keywords: ['javascript'],
        keywordLogic: 'OR'
      }

      // Setup job search page
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      
      // Analyze page
      const jobs = await findJobsOnPage()
      
      // Filter jobs using integrated filter engine
      const filteredJobs = filterEngine.filterJobs(jobs)
      
      // Send filtered results to background
      chrome.runtime.sendMessage({
        type: 'JOBS_FOUND',
        payload: { 
          jobs: filteredJobs,
          totalFound: jobs.length,
          matched: filteredJobs.length
        }
      })

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'JOBS_FOUND',
          payload: expect.objectContaining({
            jobs: expect.any(Array),
            matched: expect.any(Number)
          })
        })
      )
    })

    test('should coordinate storage operations during application flow', async () => {
      const testJob = mockJobData.softwareEngineerJob

      // Check if already applied
      chrome.storage.local.get.mockResolvedValue({ applications: [] })
      
      // Navigate to job detail
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = `https://www.linkedin.com/jobs/view/${testJob.id}/`
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))

      // Analyze job
      const analysis = await analyzePage()
      expect(analysis.success).toBe(true)

      // Click Easy Apply
      const clickResult = await clickEasyApply(testJob.id)
      expect(clickResult.success).toBe(true)

      // Fill form
      document.body.innerHTML = mockDOMStructures.applicationFormPage
      const fillResult = await fillApplicationForm()
      expect(fillResult.success).toBe(true)

      // Submit and record application
      const submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)

      // Should trigger storage of application
      const application = {
        id: expect.any(String),
        jobId: testJob.id,
        appliedAt: expect.any(String),
        status: 'submitted'
      }

      if (global.recordApplication) {
        await global.recordApplication(testJob, 'submitted')
      }

      // Verify background message was sent
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'APPLICATION_SUBMITTED'
        })
      )
    })
  })

  describe('End-to-End Workflow Integration', () => {
    test('should handle complete job discovery to application workflow', async () => {
      // Phase 1: Configure system
      filterEngine.config.filters = {
        isRemote: 'any',
        keywords: ['javascript', 'react'],
        keywordLogic: 'OR',
        experienceLevel: 'any'
      }

      // Phase 2: Job discovery
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      const jobs = await findJobsOnPage()
      expect(jobs.length).toBeGreaterThan(0)

      // Phase 3: Job filtering
      const filteredJobs = filterEngine.filterJobs(jobs)
      expect(filteredJobs.length).toBeGreaterThanOrEqual(0)

      // Phase 4: Job detail analysis
      if (filteredJobs.length > 0) {
        const selectedJob = filteredJobs[0]
        
        document.body.innerHTML = mockDOMStructures.jobDetailPage
        window.location.href = `https://www.linkedin.com/jobs/view/${selectedJob.id}/`
        analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))

        const detailAnalysis = await analyzePage()
        expect(detailAnalysis.success).toBe(true)

        // Phase 5: Application process
        const clickResult = await clickEasyApply(selectedJob.id)
        expect(clickResult.success).toBe(true)

        document.body.innerHTML = mockDOMStructures.applicationFormPage
        
        const fillResult = await fillApplicationForm()
        expect(fillResult.success).toBe(true)

        const submitResult = await submitApplication()
        expect(submitResult.success).toBe(true)

        // Phase 6: Storage and tracking
        const hasApplied = await storage.hasAppliedToJob(selectedJob.id)
        // Should be recorded as applied (mocked)
      }
    })

    test('should handle error recovery across modules', async () => {
      // Simulate analyzer error
      analyzer.analyze = jest.fn().mockRejectedValue(new Error('Analysis failed'))

      // Should continue with form filling if form is present
      const form = document.createElement('form')
      form.innerHTML = '<input type="text" name="test" required>'
      document.body.appendChild(form)

      const fillResult = await formFiller.fillForm({ test: 'value' })
      expect(fillResult.success).toBe(true)

      // Simulate storage error
      chrome.storage.local.set.mockRejectedValue(new Error('Storage failed'))

      try {
        await storage.set({ test: 'data' })
      } catch (error) {
        expect(error.message).toBe('Storage failed')
      }

      // Other modules should continue functioning
      const matchResult = filterEngine.matchJob(mockJobData.softwareEngineerJob)
      expect(matchResult).toBeDefined()
    })

    test('should maintain performance across integrated workflow', async () => {
      // Create large dataset
      const manyJobs = Array.from({ length: 200 }, (_, i) => ({
        ...mockJobData.softwareEngineerJob,
        id: `job-${i}`,
        title: `Job ${i}`,
        description: i % 2 === 0 ? 'React JavaScript development' : 'Angular TypeScript development'
      }))

      const startTime = performance.now()

      // Filter large job set
      filterEngine.config.filters = {
        keywords: ['react', 'javascript'],
        keywordLogic: 'OR'
      }

      const filtered = filterEngine.filterJobs(manyJobs)
      
      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete filtering in reasonable time
      expect(duration).toBeLessThan(1000)
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.length).toBeLessThanOrEqual(manyJobs.length)

      // Results should be properly sorted by score
      for (let i = 1; i < filtered.length; i++) {
        expect(filtered[i-1].matchScore).toBeGreaterThanOrEqual(filtered[i].matchScore)
      }
    })
  })
})