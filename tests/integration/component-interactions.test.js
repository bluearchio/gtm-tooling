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

// Execute all modules in order
eval(loadModule('anti-detection.js'))
eval(loadModule('linkedin-analyzer.js'))
eval(loadModule('form-filler.js'))
eval(loadModule('content.js'))

describe('Component Integration Tests', () => {
  let analyzer, formFiller, antiDetection
  
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
    
    await antiDetection.loadConfig()
    await formFiller.init()
    
    // Expose modules globally for content script
    window.antiDetection = antiDetection
    window.linkedInAnalyzer = analyzer
    window.formFiller = formFiller
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
})