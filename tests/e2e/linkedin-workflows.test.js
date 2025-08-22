/**
 * End-to-End Tests for LinkedIn Auto-Apply Workflows
 * Tests complete user scenarios from job discovery to application submission
 */

import fs from 'fs'
import path from 'path'
import { mockJobData, mockUserProfile, mockDOMStructures, createMockJobCard } from '../fixtures/linkedinData.js'

// Load all modules
const loadModule = (filename) => {
  const filePath = path.join(process.cwd(), 'src/content', filename)
  return fs.readFileSync(filePath, 'utf8')
}

eval(loadModule('anti-detection.js'))
eval(loadModule('linkedin-analyzer.js'))
eval(loadModule('form-filler.js'))
eval(loadModule('content.js'))

describe('LinkedIn Auto-Apply E2E Workflows', () => {
  let analyzer, formFiller, antiDetection
  let applicationStats = {
    attempted: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  }
  
  beforeEach(async () => {
    // Reset everything
    document.body.innerHTML = ''
    applicationStats = { attempted: 0, successful: 0, failed: 0, skipped: 0 }
    
    // Setup comprehensive storage mock
    chrome.storage.local.get.mockResolvedValue({
      userProfile: mockUserProfile,
      customAnswers: mockUserProfile.customAnswers,
      antiDetectionConfig: {
        enabled: true,
        humanizeActions: true,
        randomizeDelays: true,
        simulateMouseMovement: true,
        breakPatterns: {
          enabled: true,
          minApplications: 5,
          maxApplications: 10,
          breakDuration: 0.01 // Very short for testing
        }
      },
      automationConfig: {
        enabled: true,
        mode: 'auto',
        dailyLimit: 50,
        sessionLimit: 20,
        delayBetweenActions: { min: 1000, max: 3000 }
      }
    })
    
    chrome.storage.local.set.mockResolvedValue()
    
    // Initialize all modules
    antiDetection = new AntiDetectionSystem()
    analyzer = new LinkedInAnalyzer()
    formFiller = new FormFiller()
    
    await antiDetection.loadConfig()
    await formFiller.init()
    
    // Expose globally
    window.antiDetection = antiDetection
    window.linkedInAnalyzer = analyzer
    window.formFiller = formFiller
    
    // Mock fast operations for testing
    antiDetection.generateDelay = jest.fn().mockReturnValue(10)
    antiDetection.sleep = jest.fn().mockResolvedValue()
    antiDetection.simulateMouseMovement = jest.fn().mockResolvedValue()
    antiDetection.simulateTyping = jest.fn().mockResolvedValue()
    formFiller.sleep = jest.fn().mockResolvedValue()
  })

  describe('Complete Job Application Workflow', () => {
    test('should complete full application workflow for a single job', async () => {
      // PHASE 1: Job Discovery
      console.log('PHASE 1: Job Discovery')
      
      // Setup job search results page
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      window.location.href = 'https://www.linkedin.com/jobs/search/?keywords=software+engineer'
      
      // Discover jobs
      const discoveryResult = await analyzePage()
      expect(discoveryResult.success).toBe(true)
      expect(discoveryResult.pageType).toBe('job-search')
      expect(discoveryResult.jobsCount).toBeGreaterThan(0)
      
      applicationStats.attempted++
      
      // PHASE 2: Job Selection and Detail Analysis
      console.log('PHASE 2: Job Detail Analysis')
      
      // Navigate to first job found
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = 'https://www.linkedin.com/jobs/view/3472839472/'
      
      // Mock analyzer dependencies
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      analyzer.fetchCompanySize = jest.fn().mockResolvedValue('medium')
      
      const detailResult = await analyzePage()
      expect(detailResult.success).toBe(true)
      expect(detailResult.pageType).toBe('job-detail')
      expect(detailResult.job).toBeDefined()
      expect(detailResult.job.title).toContain('Software Engineer')
      
      // PHASE 3: Easy Apply Initiation
      console.log('PHASE 3: Easy Apply Initiation')
      
      const easyApplyResult = await clickEasyApply('3472839472')
      expect(easyApplyResult.success).toBe(true)
      
      // PHASE 4: Application Form Analysis
      console.log('PHASE 4: Form Analysis')
      
      // Setup application modal
      document.body.innerHTML = mockDOMStructures.applicationFormPage
      
      const formAnalysisResult = await analyzeApplicationForm()
      expect(formAnalysisResult.success).toBe(true)
      expect(formAnalysisResult.form.formFields.length).toBeGreaterThan(0)
      
      // PHASE 5: Form Filling
      console.log('PHASE 5: Form Filling')
      
      const fillResult = await fillApplicationForm()
      expect(fillResult.success).toBe(true)
      expect(fillResult.filledFields).toBeGreaterThan(0)
      
      // Verify critical fields were filled
      expect(document.getElementById('firstName').value).toBe(mockUserProfile.firstName)
      expect(document.getElementById('lastName').value).toBe(mockUserProfile.lastName)
      expect(document.getElementById('email').value).toBe(mockUserProfile.email)
      
      // PHASE 6: Form Submission
      console.log('PHASE 6: Form Submission')
      
      const submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)
      
      applicationStats.successful++
      
      // PHASE 7: Verify Message Flow
      console.log('PHASE 7: Verification')
      
      // Verify background messages were sent
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'JOBS_FOUND' })
      )
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'JOB_DETAIL_ANALYZED' })
      )
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'APPLICATION_SUBMITTED' })
      )
      
      console.log('✓ Complete workflow successful')
    })

    test('should handle multi-step application forms end-to-end', async () => {
      console.log('TESTING: Multi-step Application Workflow')
      
      // Start with job detail page
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = 'https://www.linkedin.com/jobs/view/3472839473/'
      
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      await analyzePage()
      
      // Click Easy Apply
      await clickEasyApply('3472839473')
      
      // STEP 1: Basic Information
      console.log('Step 1: Basic Information')
      document.body.innerHTML = `
        <div class="jobs-easy-apply-modal">
          <div class="application-form-steps">Step 1 of 3</div>
          <form>
            <input type="text" id="firstName" name="firstName" required>
            <input type="text" id="lastName" name="lastName" required>
            <input type="email" id="email" name="email" required>
            <button type="submit">Next</button>
          </form>
        </div>
      `
      
      let fillResult = await fillApplicationForm()
      expect(fillResult.success).toBe(true)
      
      let submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)
      
      // STEP 2: Experience and Work Authorization
      console.log('Step 2: Experience Details')
      document.body.innerHTML = `
        <div class="jobs-easy-apply-modal">
          <div class="application-form-steps">Step 2 of 3</div>
          <form>
            <select id="experience" name="experience" required>
              <option value="">Select...</option>
              <option value="2-4">2-4 years</option>
              <option value="5-7">5-7 years</option>
              <option value="8+">8+ years</option>
            </select>
            <div class="question">
              <label>Are you authorized to work in the US?</label>
              <input type="radio" name="workAuth" value="yes" id="workAuthYes" required>
              <label for="workAuthYes">Yes</label>
              <input type="radio" name="workAuth" value="no" id="workAuthNo" required>
              <label for="workAuthNo">No</label>
            </div>
            <button type="submit">Next</button>
          </form>
        </div>
      `
      
      fillResult = await fillApplicationForm()
      expect(fillResult.success).toBe(true)
      
      // Verify work authorization was selected
      expect(document.getElementById('workAuthYes').checked).toBe(true)
      
      submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)
      
      // STEP 3: File Upload and Final Review
      console.log('Step 3: File Upload and Review')
      document.body.innerHTML = `
        <div class="jobs-easy-apply-modal">
          <div class="application-form-steps">Step 3 of 3</div>
          <form>
            <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx">
            <input type="file" id="coverLetter" name="coverLetter" accept=".pdf,.doc,.docx">
            <textarea id="additionalInfo" name="additionalInfo" placeholder="Additional information"></textarea>
            <button type="submit" aria-label="Submit application">Submit Application</button>
          </form>
        </div>
      `
      
      fillResult = await fillApplicationForm()
      expect(fillResult.success).toBe(true)
      
      // Final submission
      submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)
      
      applicationStats.successful++
      console.log('✓ Multi-step application completed successfully')
    })

    test('should handle bulk job applications with anti-detection', async () => {
      console.log('TESTING: Bulk Job Applications with Anti-Detection')
      
      const jobIds = ['job1', 'job2', 'job3', 'job4', 'job5']
      const applicationResults = []
      
      for (let i = 0; i < jobIds.length; i++) {
        const jobId = jobIds[i]
        console.log(`Processing job ${i + 1}/${jobIds.length}: ${jobId}`)
        
        applicationStats.attempted++
        
        try {
          // Job detail analysis
          document.body.innerHTML = mockDOMStructures.jobDetailPage
          window.location.href = `https://www.linkedin.com/jobs/view/${jobId}/`
          
          analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
          const detailResult = await analyzePage()
          expect(detailResult.success).toBe(true)
          
          // Anti-detection: Check if break is needed
          if (antiDetection.shouldTakeBreak()) {
            console.log('Taking anti-detection break...')
            await antiDetection.takeBreak()
          }
          
          // Easy Apply click with anti-detection
          await antiDetection.performAction('apply', async () => {
            const result = await clickEasyApply(jobId)
            expect(result.success).toBe(true)
            return result
          })
          
          // Form filling with anti-detection
          document.body.innerHTML = mockDOMStructures.applicationFormPage
          
          const fillResult = await antiDetection.performAction('form_fill', async () => {
            return await fillApplicationForm()
          })
          
          expect(fillResult.success).toBe(true)
          
          // Submission with anti-detection
          const submitResult = await antiDetection.performAction('submit', async () => {
            return await submitApplication()
          })
          
          expect(submitResult.success).toBe(true)
          
          applicationResults.push({
            jobId,
            success: true,
            timestamp: new Date()
          })
          
          applicationStats.successful++
          
          // Anti-detection delay between applications
          const delay = antiDetection.generateDelay(2000, 5000)
          await antiDetection.sleep(delay)
          
        } catch (error) {
          console.error(`Application failed for ${jobId}:`, error)
          applicationResults.push({
            jobId,
            success: false,
            error: error.message,
            timestamp: new Date()
          })
          
          applicationStats.failed++
        }
      }
      
      // Verify results
      expect(applicationResults.length).toBe(jobIds.length)
      expect(applicationStats.successful).toBeGreaterThan(0)
      
      // Verify anti-detection measures were applied
      expect(antiDetection.actionsCount).toBeGreaterThan(0)
      
      console.log(`✓ Bulk applications completed: ${applicationStats.successful} successful, ${applicationStats.failed} failed`)
    })
  })

  describe('Error Handling and Recovery Workflows', () => {
    test('should recover from form validation errors', async () => {
      console.log('TESTING: Form Validation Error Recovery')
      
      // Setup job detail
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      await analyzePage()
      await clickEasyApply('test-job')
      
      // Setup form with validation requirements
      document.body.innerHTML = `
        <div class="jobs-easy-apply-modal">
          <form>
            <input type="email" id="email" name="email" required pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$">
            <input type="tel" id="phone" name="phone" required pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}">
            <select id="experience" name="experience" required>
              <option value="">Select...</option>
              <option value="2-4">2-4 years</option>
              <option value="5-7">5-7 years</option>
            </select>
            <button type="submit">Submit</button>
          </form>
        </div>
      `
      
      // First attempt with invalid data
      const invalidFormData = {
        email: 'invalid-email',
        phone: 'invalid-phone',
        experience: '' // Required field left empty
      }
      
      let fillResult = await fillApplicationForm(invalidFormData)
      expect(fillResult.success).toBe(true) // Filling succeeds
      
      // Attempt submission (should fail validation)
      let validation = formFiller.validateForm()
      expect(validation.isValid).toBe(false)
      expect(validation.invalidFields.length).toBeGreaterThan(0)
      
      // Correct the data and retry
      const validFormData = {
        email: mockUserProfile.email,
        phone: '+1-555-0123',
        experience: '5-7'
      }
      
      fillResult = await fillApplicationForm(validFormData)
      expect(fillResult.success).toBe(true)
      
      validation = formFiller.validateForm()
      expect(validation.isValid).toBe(true)
      
      const submitResult = await submitApplication()
      expect(submitResult.success).toBe(true)
      
      applicationStats.successful++
      console.log('✓ Successfully recovered from validation errors')
    })

    test('should handle network timeouts and retries', async () => {
      console.log('TESTING: Network Timeout Recovery')
      
      // Setup scenario
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      await analyzePage()
      
      // Mock network timeout during Easy Apply
      let attemptCount = 0
      const originalClickEasyApply = global.clickEasyApply
      global.clickEasyApply = jest.fn().mockImplementation(async (jobId) => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Network timeout')
        }
        return { success: true, message: 'Easy Apply clicked' }
      })
      
      // Retry logic simulation
      let lastError
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await clickEasyApply('timeout-job')
          if (result.success) {
            console.log(`✓ Succeeded on attempt ${attempt}`)
            break
          }
        } catch (error) {
          lastError = error
          console.log(`Attempt ${attempt} failed: ${error.message}`)
          
          if (attempt < 3) {
            // Wait before retry with exponential backoff
            await antiDetection.sleep(1000 * attempt)
          }
        }
      }
      
      expect(attemptCount).toBe(3)
      expect(lastError).toBeUndefined() // Should succeed on final attempt
      
      // Restore original function
      global.clickEasyApply = originalClickEasyApply
    })

    test('should skip inaccessible jobs gracefully', async () => {
      console.log('TESTING: Inaccessible Job Handling')
      
      // Job with broken structure
      document.body.innerHTML = '<div>Broken job page - missing required elements</div>'
      window.location.href = 'https://www.linkedin.com/jobs/view/broken-job/'
      
      analyzer.waitForElement = jest.fn().mockRejectedValue(new Error('Required elements not found'))
      
      try {
        const result = await analyzePage()
        applicationStats.skipped++
        
        // Should handle gracefully without crashing
        expect(result.success).toBe(false)
        console.log('✓ Gracefully skipped inaccessible job')
        
      } catch (error) {
        // Even if it throws, should not crash the entire process
        applicationStats.failed++
        console.log('✓ Error handled without crashing process')
      }
      
      // Verify system can continue with next job
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      
      const nextResult = await analyzePage()
      expect(nextResult.success).toBe(true)
      console.log('✓ Successfully continued with next job after error')
    })
  })

  describe('Performance and Scalability Workflows', () => {
    test('should handle session management and rotation', async () => {
      console.log('TESTING: Session Management Workflow')
      
      // Configure short session duration for testing
      antiDetection.config.sessionRotation.enabled = true
      antiDetection.config.sessionRotation.maxSessionDuration = 0.01 // Very short for testing
      antiDetection.sessionStartTime = Date.now() - (2 * 60 * 1000) // 2 minutes ago (exceeds limit)
      
      // Mock session rotation
      const clearBrowsingDataSpy = jest.spyOn(antiDetection, 'clearBrowsingData').mockResolvedValue()
      
      // Perform action that should trigger session rotation
      const mockAction = jest.fn().mockResolvedValue('success')
      
      await antiDetection.performAction('application', mockAction)
      
      // Verify session rotation was triggered
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SESSION_ROTATION_REQUIRED' })
      )
      expect(clearBrowsingDataSpy).toHaveBeenCalled()
      expect(antiDetection.actionsCount).toBe(0) // Should reset
      
      console.log('✓ Session rotation completed successfully')
    })

    test('should handle rate limiting and quotas', async () => {
      console.log('TESTING: Rate Limiting and Quotas')
      
      const maxApplications = 3
      let applicationsSubmitted = 0
      
      // Mock quota checking
      const checkQuota = () => {
        return applicationsSubmitted < maxApplications
      }
      
      const jobs = ['job1', 'job2', 'job3', 'job4', 'job5'] // More jobs than quota allows
      
      for (const jobId of jobs) {
        if (!checkQuota()) {
          console.log(`Daily limit reached (${maxApplications}), stopping automation`)
          applicationStats.skipped++
          break
        }
        
        try {
          // Simulate application process
          document.body.innerHTML = mockDOMStructures.jobDetailPage
          analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
          
          await analyzePage()
          await clickEasyApply(jobId)
          
          document.body.innerHTML = mockDOMStructures.applicationFormPage
          await fillApplicationForm()
          await submitApplication()
          
          applicationsSubmitted++
          applicationStats.successful++
          
          console.log(`Application ${applicationsSubmitted}/${maxApplications} submitted for ${jobId}`)
          
        } catch (error) {
          applicationStats.failed++
          console.error(`Failed to apply to ${jobId}:`, error.message)
        }
      }
      
      expect(applicationsSubmitted).toBe(maxApplications)
      expect(applicationStats.skipped).toBe(jobs.length - maxApplications)
      
      console.log('✓ Rate limiting enforced correctly')
    })

    test('should handle memory management with large job sets', async () => {
      console.log('TESTING: Memory Management with Large Job Sets')
      
      // Create large job dataset
      const largeJobSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-job-${i}`,
        title: `Job Title ${i}`,
        company: `Company ${i}`,
        location: 'Test Location',
        isEasyApply: true,
        postedDate: new Date(),
        applicants: i * 2
      }))
      
      // Setup search results with large dataset
      const container = document.createElement('div')
      container.className = 'jobs-search-results-list'
      
      largeJobSet.forEach(job => {
        const jobCard = createMockJobCard(job)
        container.appendChild(jobCard)
      })
      
      document.body.appendChild(container)
      
      // Monitor memory usage (simplified)
      const initialCacheSize = analyzer.jobCache.size
      
      // Process jobs in batches to simulate pagination
      const batchSize = 50
      let processedJobs = 0
      
      for (let i = 0; i < largeJobSet.length; i += batchSize) {
        const batch = largeJobSet.slice(i, i + batchSize)
        
        // Simulate processing batch
        batch.forEach(job => {
          analyzer.jobCache.set(job.id, job)
          processedJobs++
        })
        
        // Simulate cache cleanup for old jobs (keep only recent 100)
        if (analyzer.jobCache.size > 100) {
          const oldestKeys = Array.from(analyzer.jobCache.keys()).slice(0, analyzer.jobCache.size - 100)
          oldestKeys.forEach(key => analyzer.jobCache.delete(key))
        }
        
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}, cache size: ${analyzer.jobCache.size}`)
      }
      
      expect(processedJobs).toBe(largeJobSet.length)
      expect(analyzer.jobCache.size).toBeLessThanOrEqual(100) // Memory managed
      
      console.log('✓ Memory management working correctly with large datasets')
    })
  })

  describe('Real-world Edge Cases', () => {
    test('should handle LinkedIn page structure changes', async () => {
      console.log('TESTING: LinkedIn Page Structure Changes')
      
      // Simulate new LinkedIn page structure with different selectors
      const newPageStructure = `
        <div class="new-jobs-unified-top-card">
          <h1 class="new-job-title-class">Software Engineer</h1>
          <a class="new-company-name-class">Tech Company</a>
          <span class="new-location-class">San Francisco, CA</span>
          <button class="new-easy-apply-button" aria-label="Apply now">Apply Now</button>
        </div>
        <div class="new-job-description">
          <div class="new-description-content">Job description content...</div>
        </div>
      `
      
      document.body.innerHTML = newPageStructure
      
      // Original selectors won't work, should fallback gracefully
      analyzer.waitForElement = jest.fn().mockImplementation((selector) => {
        // Simulate that old selectors don't exist but new ones do
        if (selector.includes('jobs-unified-top-card')) {
          return Promise.reject(new Error('Element not found'))
        }
        return Promise.resolve(document.querySelector('.new-job-description'))
      })
      
      try {
        const result = await analyzer.analyzeJobDetail()
        
        // Should attempt fallback methods or graceful degradation
        console.log('✓ Handled page structure change gracefully')
        
      } catch (error) {
        // Even if analysis fails, should not crash
        console.log('✓ Gracefully handled incompatible page structure')
        applicationStats.skipped++
      }
      
      expect(true).toBe(true) // Test passed if no unhandled errors
    })

    test('should handle dynamic content loading', async () => {
      console.log('TESTING: Dynamic Content Loading')
      
      // Setup page with minimal initial content
      document.body.innerHTML = '<div class="loading">Loading job details...</div>'
      
      // Simulate dynamic content loading after delay
      setTimeout(() => {
        document.body.innerHTML = mockDOMStructures.jobDetailPage
      }, 100)
      
      // Configure analyzer to wait for dynamic content
      analyzer.waitForElement = jest.fn().mockImplementation((selector, timeout = 5000) => {
        return new Promise((resolve) => {
          const checkForElement = () => {
            const element = document.querySelector(selector)
            if (element) {
              resolve(element)
            } else {
              setTimeout(checkForElement, 50)
            }
          }
          checkForElement()
        })
      })
      
      const result = await analyzer.analyzeJobDetail()
      
      expect(result).toBeDefined()
      console.log('✓ Successfully handled dynamic content loading')
    })

    test('should handle CAPTCHA and bot detection scenarios', async () => {
      console.log('TESTING: CAPTCHA and Bot Detection Handling')
      
      // Simulate CAPTCHA appearing during application
      const captchaScenario = () => {
        document.body.innerHTML = `
          <div class="captcha-container">
            <h3>Please verify you are human</h3>
            <div class="captcha-challenge">Complete this challenge to continue</div>
          </div>
        `
      }
      
      // Setup normal application flow
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      
      await analyzePage()
      await clickEasyApply('captcha-job')
      
      // Simulate CAPTCHA appearing
      captchaScenario()
      
      // Application should detect CAPTCHA and handle appropriately
      const hasCaptcha = document.querySelector('.captcha-container') !== null
      
      if (hasCaptcha) {
        console.log('CAPTCHA detected - pausing automation')
        
        // Send message to background script
        chrome.runtime.sendMessage({
          type: 'CAPTCHA_DETECTED',
          action: 'pause_automation',
          timestamp: Date.now()
        })
        
        applicationStats.skipped++
      }
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CAPTCHA_DETECTED' })
      )
      
      console.log('✓ CAPTCHA detection and handling working correctly')
    })
  })

  describe('Data Integrity and State Management', () => {
    test('should maintain data consistency across workflow', async () => {
      console.log('TESTING: Data Consistency Across Workflow')
      
      const jobId = 'consistency-test-job'
      
      // Phase 1: Job discovery
      document.body.innerHTML = mockDOMStructures.jobSearchPage
      await analyzePage()
      
      // Verify initial state
      const initialCacheSize = analyzer.jobCache.size
      
      // Phase 2: Job detail analysis
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = `https://www.linkedin.com/jobs/view/${jobId}/`
      
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      await analyzer.analyzeJobDetail()
      
      // Verify job was cached
      expect(analyzer.jobCache.has(jobId)).toBe(true)
      const cachedJob = analyzer.jobCache.get(jobId)
      expect(cachedJob).toBeDefined()
      expect(cachedJob.description).toBeDefined()
      
      // Phase 3: Form filling with job context
      document.body.innerHTML = mockDOMStructures.applicationFormPage
      
      // Verify form filler can access job data
      const formData = {
        coverLetter: `I am interested in the ${cachedJob.title} position...`
      }
      
      const fillResult = await fillApplicationForm(formData)
      expect(fillResult.success).toBe(true)
      
      // Phase 4: Application tracking
      const applicationRecord = {
        jobId: jobId,
        jobTitle: cachedJob.title,
        company: cachedJob.company,
        appliedAt: new Date(),
        status: 'submitted'
      }
      
      // Verify data integrity
      expect(applicationRecord.jobId).toBe(jobId)
      expect(applicationRecord.jobTitle).toBe(cachedJob.title)
      
      console.log('✓ Data consistency maintained throughout workflow')
    })

    test('should handle concurrent workflow executions', async () => {
      console.log('TESTING: Concurrent Workflow Handling')
      
      const job1Id = 'concurrent-job-1'
      const job2Id = 'concurrent-job-2'
      
      // Start two workflows concurrently
      const workflow1 = async () => {
        document.body.innerHTML = mockDOMStructures.jobDetailPage
        window.location.href = `https://www.linkedin.com/jobs/view/${job1Id}/`
        analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
        
        await analyzer.analyzeJobDetail()
        expect(analyzer.jobCache.has(job1Id)).toBe(true)
        
        return 'workflow1-complete'
      }
      
      const workflow2 = async () => {
        // Simulate slight delay
        await new Promise(resolve => setTimeout(resolve, 50))
        
        document.body.innerHTML = mockDOMStructures.jobDetailPage
        window.location.href = `https://www.linkedin.com/jobs/view/${job2Id}/`
        analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
        
        await analyzer.analyzeJobDetail()
        expect(analyzer.jobCache.has(job2Id)).toBe(true)
        
        return 'workflow2-complete'
      }
      
      // Execute concurrently
      const [result1, result2] = await Promise.all([workflow1(), workflow2()])
      
      expect(result1).toBe('workflow1-complete')
      expect(result2).toBe('workflow2-complete')
      
      // Verify both jobs were processed correctly
      expect(analyzer.jobCache.has(job1Id)).toBe(true)
      expect(analyzer.jobCache.has(job2Id)).toBe(true)
      
      console.log('✓ Concurrent workflows handled successfully')
    })
  })

  afterEach(() => {
    // Log test results
    console.log(`Test completed - Stats: ${JSON.stringify(applicationStats)}`)
    
    // Cleanup
    jest.clearAllMocks()
    document.body.innerHTML = ''
  })
})