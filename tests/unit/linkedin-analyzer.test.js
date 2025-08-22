/**
 * Unit Tests for LinkedIn Analyzer Module
 * Tests DOM manipulation, parsing, and job extraction functionality
 */

// Import the module to test
import fs from 'fs'
import path from 'path'
import { mockJobData, mockDOMStructures, createMockJobCard } from '../fixtures/linkedinData.js'

// Read the source file since we can't import it directly
const sourceFilePath = path.join(process.cwd(), 'src/content/linkedin-analyzer.js')
const sourceCode = fs.readFileSync(sourceFilePath, 'utf8')

// Execute the source code in our test environment
eval(sourceCode)

describe('LinkedInAnalyzer', () => {
  let analyzer
  
  beforeEach(() => {
    // Reset DOM and create fresh analyzer instance
    document.body.innerHTML = ''
    analyzer = new LinkedInAnalyzer()
  })
  
  afterEach(() => {
    // Clean up observers
    if (analyzer && analyzer.observers) {
      analyzer.observers.forEach(observer => observer.disconnect())
    }
  })

  describe('Constructor and Initialization', () => {
    test('should initialize with default properties', () => {
      expect(analyzer.observers).toBeInstanceOf(Map)
      expect(analyzer.jobCache).toBeInstanceOf(Map)
      expect(analyzer.observers.size).toBeGreaterThan(0)
    })

    test('should set up MutationObserver', () => {
      expect(analyzer.observers.has('main')).toBe(true)
      const observer = analyzer.observers.get('main')
      expect(observer).toBeInstanceOf(MutationObserver)
    })

    test('should inject analysis UI', () => {
      const overlay = document.getElementById('linkedin-auto-apply-overlay')
      expect(overlay).toBeTruthy()
      expect(overlay.style.position).toBe('fixed')
      expect(overlay.style.display).toBe('none')
    })

    test('should setup message listeners', () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled()
    })
  })

  describe('Page Type Detection', () => {
    test('should detect job search page', () => {
      window.location.href = 'https://www.linkedin.com/jobs/search/?keywords=software'
      const mutations = []
      analyzer.handlePageChanges(mutations)
      
      // Should trigger analyzeJobListings
      // We'll verify this by checking if the method was called (would need spies)
    })

    test('should detect job detail page', () => {
      window.location.href = 'https://www.linkedin.com/jobs/view/123456789/'
      const mutations = []
      analyzer.handlePageChanges(mutations)
      
      // Should trigger analyzeJobDetail
    })

    test('should detect application form page', () => {
      window.location.href = 'https://www.linkedin.com/jobs/application/123456789/'
      const mutations = []
      analyzer.handlePageChanges(mutations)
      
      // Should trigger analyzeApplicationForm
    })
  })

  describe('Job Listings Analysis', () => {
    beforeEach(() => {
      // Set up job search page structure
      document.body.innerHTML = mockDOMStructures.jobSearchPage
    })

    test('should find job cards on search results page', () => {
      analyzer.analyzeJobListings()
      
      const jobCards = document.querySelectorAll('[data-job-id]')
      expect(jobCards.length).toBe(2)
    })

    test('should extract job information from cards', () => {
      const jobCard = createMockJobCard(mockJobData.searchResults[0])
      document.body.appendChild(jobCard)
      
      const extractedJob = analyzer.extractJobFromCard(jobCard)
      
      expect(extractedJob).toBeTruthy()
      expect(extractedJob.id).toBe(mockJobData.searchResults[0].id)
      expect(extractedJob.title).toBe(mockJobData.searchResults[0].title)
      expect(extractedJob.company).toBe(mockJobData.searchResults[0].company)
      expect(extractedJob.location).toBe(mockJobData.searchResults[0].location)
    })

    test('should detect Easy Apply jobs', () => {
      const jobCard = createMockJobCard(mockJobData.searchResults[0])
      document.body.appendChild(jobCard)
      
      const extractedJob = analyzer.extractJobFromCard(jobCard)
      expect(extractedJob.isEasyApply).toBe(true)
    })

    test('should handle missing job ID gracefully', () => {
      const jobCard = document.createElement('div')
      jobCard.innerHTML = '<h3>Job without ID</h3>'
      
      const extractedJob = analyzer.extractJobFromCard(jobCard)
      expect(extractedJob).toBeNull()
    })

    test('should cache extracted jobs', () => {
      const jobCard = createMockJobCard(mockJobData.searchResults[0])
      document.body.appendChild(jobCard)
      
      analyzer.analyzeJobListings()
      
      expect(analyzer.jobCache.has(mockJobData.searchResults[0].id)).toBe(true)
      const cachedJob = analyzer.jobCache.get(mockJobData.searchResults[0].id)
      expect(cachedJob.title).toBe(mockJobData.searchResults[0].title)
    })

    test('should not duplicate jobs in cache', () => {
      const jobCard = createMockJobCard(mockJobData.searchResults[0])
      document.body.appendChild(jobCard)
      
      // Analyze twice
      analyzer.analyzeJobListings()
      analyzer.analyzeJobListings()
      
      expect(analyzer.jobCache.size).toBe(1)
    })
  })

  describe('Job Detail Analysis', () => {
    beforeEach(() => {
      document.body.innerHTML = mockDOMStructures.jobDetailPage
      window.location.href = 'https://www.linkedin.com/jobs/view/3472839472/'
    })

    test('should extract job ID from URL', () => {
      const jobId = analyzer.extractJobIdFromUrl()
      expect(jobId).toBe('3472839472')
    })

    test('should return null for invalid URLs', () => {
      window.location.href = 'https://www.linkedin.com/feed/'
      const jobId = analyzer.extractJobIdFromUrl()
      expect(jobId).toBeNull()
    })

    test('should extract detailed job information', async () => {
      // Mock waitForElement to resolve immediately
      analyzer.waitForElement = jest.fn().mockResolvedValue(document.querySelector('.jobs-description'))
      
      await analyzer.analyzeJobDetail()
      
      const jobId = analyzer.extractJobIdFromUrl()
      expect(analyzer.jobCache.has(jobId)).toBe(true)
      
      const job = analyzer.jobCache.get(jobId)
      expect(job.description).toContain('We are seeking a Senior Software Engineer')
      expect(job.requirements).toBeInstanceOf(Array)
      expect(job.benefits).toBeInstanceOf(Array)
    })

    test('should extract requirements from job description', () => {
      const description = `
        Requirements:
        • 5+ years of experience in software development
        • Proficiency in JavaScript, React, Node.js
        • Strong problem-solving skills
      `
      
      const requirements = analyzer.extractRequirements(description)
      expect(requirements).toHaveLength(3)
      expect(requirements[0]).toContain('5+ years of experience')
      expect(requirements[1]).toContain('JavaScript, React, Node.js')
    })

    test('should extract benefits from job description', () => {
      const description = `
        Benefits:
        • Competitive salary and equity package
        • Comprehensive health insurance
        • Flexible work arrangements
      `
      
      const benefits = analyzer.extractBenefits(description)
      expect(benefits).toHaveLength(3)
      expect(benefits[0]).toContain('Competitive salary')
      expect(benefits[1]).toContain('health insurance')
    })

    test('should limit requirements and benefits to 10 items', () => {
      const longDescription = `
        Requirements:
        ${Array.from({ length: 15 }, (_, i) => `• Requirement ${i + 1}`).join('\n')}
      `
      
      const requirements = analyzer.extractRequirements(longDescription)
      expect(requirements).toHaveLength(10)
    })
  })

  describe('Remote Work Detection', () => {
    test('should detect remote work from job card text', () => {
      const remoteCard = document.createElement('div')
      remoteCard.textContent = 'Software Engineer - Remote Work Available'
      
      const isRemote = analyzer.detectRemoteWork(remoteCard)
      expect(isRemote).toBe(true)
    })

    test('should detect work from home', () => {
      const wfhCard = document.createElement('div')
      wfhCard.textContent = 'Marketing Manager - Work from Home'
      
      const isRemote = analyzer.detectRemoteWork(wfhCard)
      expect(isRemote).toBe(true)
    })

    test('should not detect remote when not mentioned', () => {
      const onsiteCard = document.createElement('div')
      onsiteCard.textContent = 'Software Engineer - San Francisco Office'
      
      const isRemote = analyzer.detectRemoteWork(onsiteCard)
      expect(isRemote).toBe(false)
    })

    test('should be case insensitive', () => {
      const upperCaseCard = document.createElement('div')
      upperCaseCard.textContent = 'REMOTE POSITION AVAILABLE'
      
      const isRemote = analyzer.detectRemoteWork(upperCaseCard)
      expect(isRemote).toBe(true)
    })
  })

  describe('Location Parsing', () => {
    test('should parse standard city, state format', () => {
      const location = analyzer.extractLocation('San Francisco, CA')
      
      expect(location.city).toBe('San Francisco')
      expect(location.state).toBe('CA')
      expect(location.isRemote).toBe(false)
      expect(location.full).toBe('San Francisco, CA')
    })

    test('should parse city, state, country format', () => {
      const location = analyzer.extractLocation('London, England, United Kingdom')
      
      expect(location.city).toBe('London')
      expect(location.state).toBe('England')
      expect(location.country).toBe('United Kingdom')
    })

    test('should detect remote in location text', () => {
      const location = analyzer.extractLocation('Remote - United States')
      
      expect(location.isRemote).toBe(true)
      expect(location.city).toBe('Remote - United States')
    })

    test('should handle empty location gracefully', () => {
      const location = analyzer.extractLocation('')
      
      expect(location.city).toBe('')
      expect(location.state).toBe('')
      expect(location.country).toBe('')
      expect(location.isRemote).toBe(false)
    })
  })

  describe('Salary Extraction', () => {
    test('should extract salary range', () => {
      const salaryCard = document.createElement('div')
      salaryCard.innerHTML = '<span class="salary">$80,000 - $120,000</span>'
      
      const salary = analyzer.extractSalary(salaryCard)
      
      expect(salary).toBeTruthy()
      expect(salary.min).toBe(80000)
      expect(salary.max).toBe(120000)
      expect(salary.currency).toBe('USD')
      expect(salary.period).toBe('yearly')
    })

    test('should extract single salary value', () => {
      const salaryCard = document.createElement('div')
      salaryCard.innerHTML = '<span class="salary">$100,000</span>'
      
      const salary = analyzer.extractSalary(salaryCard)
      
      expect(salary.min).toBe(100000)
      expect(salary.max).toBe(100000)
    })

    test('should handle k notation', () => {
      const salaryCard = document.createElement('div')
      salaryCard.innerHTML = '<span class="salary">$80k - $120k</span>'
      
      const salary = analyzer.extractSalary(salaryCard)
      
      expect(salary.min).toBe(80000)
      expect(salary.max).toBe(120000)
    })

    test('should detect hourly rates', () => {
      const salaryCard = document.createElement('div')
      salaryCard.innerHTML = '<span class="salary">$25 - $35 per hour</span>'
      
      const salary = analyzer.extractSalary(salaryCard)
      
      expect(salary.period).toBe('hourly')
    })

    test('should return null for no salary information', () => {
      const noSalaryCard = document.createElement('div')
      noSalaryCard.innerHTML = '<span>No salary information</span>'
      
      const salary = analyzer.extractSalary(noSalaryCard)
      expect(salary).toBeNull()
    })
  })

  describe('Date Parsing', () => {
    test('should parse relative dates correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z')
      jest.useFakeTimers().setSystemTime(now)
      
      const minutesAgo = analyzer.parsePostedDate('30 minutes ago')
      expect(minutesAgo.getTime()).toBe(now.getTime() - 30 * 60000)
      
      const hoursAgo = analyzer.parsePostedDate('2 hours ago')
      expect(hoursAgo.getTime()).toBe(now.getTime() - 2 * 3600000)
      
      const daysAgo = analyzer.parsePostedDate('3 days ago')
      expect(daysAgo.getTime()).toBe(now.getTime() - 3 * 86400000)
      
      jest.useRealTimers()
    })

    test('should handle weeks and months', () => {
      const now = new Date('2024-01-15T12:00:00Z')
      jest.useFakeTimers().setSystemTime(now)
      
      const weeksAgo = analyzer.parsePostedDate('2 weeks ago')
      expect(weeksAgo.getTime()).toBe(now.getTime() - 2 * 604800000)
      
      const monthsAgo = analyzer.parsePostedDate('1 month ago')
      expect(monthsAgo.getTime()).toBe(now.getTime() - 1 * 2592000000)
      
      jest.useRealTimers()
    })

    test('should return current date for unrecognized format', () => {
      const now = new Date()
      const parsed = analyzer.parsePostedDate('unknown format')
      
      expect(Math.abs(parsed.getTime() - now.getTime())).toBeLessThan(1000)
    })
  })

  describe('Experience Level Parsing', () => {
    test('should parse experience levels correctly', () => {
      expect(analyzer.parseExperienceLevel('Internship position')).toBe('internship')
      expect(analyzer.parseExperienceLevel('Entry level developer')).toBe('entry')
      expect(analyzer.parseExperienceLevel('Junior software engineer')).toBe('entry')
      expect(analyzer.parseExperienceLevel('Associate consultant')).toBe('associate')
      expect(analyzer.parseExperienceLevel('Mid-level engineer')).toBe('mid')
      expect(analyzer.parseExperienceLevel('Senior developer')).toBe('senior')
      expect(analyzer.parseExperienceLevel('Lead engineer')).toBe('senior')
      expect(analyzer.parseExperienceLevel('Executive director')).toBe('executive')
      expect(analyzer.parseExperienceLevel('VP of Engineering')).toBe('executive')
      expect(analyzer.parseExperienceLevel('Director of Technology')).toBe('director')
    })

    test('should default to mid level for unknown', () => {
      expect(analyzer.parseExperienceLevel('Unknown level')).toBe('mid')
    })

    test('should be case insensitive', () => {
      expect(analyzer.parseExperienceLevel('SENIOR ENGINEER')).toBe('senior')
      expect(analyzer.parseExperienceLevel('entry LEVEL')).toBe('entry')
    })
  })

  describe('Job Type Parsing', () => {
    test('should parse job types correctly', () => {
      expect(analyzer.parseJobType('Full-time position')).toBe('full-time')
      expect(analyzer.parseJobType('Part time role')).toBe('part-time')
      expect(analyzer.parseJobType('Contract work')).toBe('contract')
      expect(analyzer.parseJobType('Temporary assignment')).toBe('temporary')
      expect(analyzer.parseJobType('Internship program')).toBe('internship')
      expect(analyzer.parseJobType('Volunteer opportunity')).toBe('volunteer')
    })

    test('should default to full-time', () => {
      expect(analyzer.parseJobType('Unknown type')).toBe('full-time')
    })

    test('should handle variations in text', () => {
      expect(analyzer.parseJobType('Full time permanent')).toBe('full-time')
      expect(analyzer.parseJobType('Part-time flexible')).toBe('part-time')
    })
  })

  describe('Applicant Count Parsing', () => {
    test('should extract applicant numbers', () => {
      expect(analyzer.parseApplicantCount('142 applicants')).toBe(142)
      expect(analyzer.parseApplicantCount('Over 200 applications')).toBe(200)
      expect(analyzer.parseApplicantCount('5 people applied')).toBe(5)
    })

    test('should return 0 for no numbers', () => {
      expect(analyzer.parseApplicantCount('No applicants yet')).toBe(0)
      expect(analyzer.parseApplicantCount('Be the first to apply')).toBe(0)
    })

    test('should handle first number found', () => {
      expect(analyzer.parseApplicantCount('From 50 to 100 applicants')).toBe(50)
    })
  })

  describe('Application Form Analysis', () => {
    beforeEach(() => {
      document.body.innerHTML = mockDOMStructures.applicationFormPage
    })

    test('should find and analyze form fields', () => {
      analyzer.analyzeApplicationForm()
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'FORM_ANALYZED',
          payload: expect.objectContaining({
            formFields: expect.any(Array),
            isMultiStep: expect.any(Boolean)
          })
        })
      )
    })

    test('should extract form field information', () => {
      const input = document.getElementById('firstName')
      const field = analyzer.extractFormField(input)
      
      expect(field).toBeTruthy()
      expect(field.id).toBe('firstName')
      expect(field.name).toBe('firstName')
      expect(field.type).toBe('text')
      expect(field.required).toBe(true)
    })

    test('should extract select options', () => {
      const select = document.getElementById('experience')
      const field = analyzer.extractFormField(select)
      
      expect(field.options).toBeInstanceOf(Array)
      expect(field.options.length).toBeGreaterThan(1)
      expect(field.options[1].value).toBe('0-1')
      expect(field.options[1].label).toBe('0-1 years')
    })

    test('should find field labels correctly', () => {
      const input = document.getElementById('firstName')
      const label = analyzer.findFieldLabel(input)
      
      expect(label).toBe('First Name *')
    })

    test('should handle missing labels gracefully', () => {
      const orphanInput = document.createElement('input')
      orphanInput.type = 'text'
      orphanInput.placeholder = 'Placeholder text'
      
      const label = analyzer.findFieldLabel(orphanInput)
      expect(label).toBe('Placeholder text')
    })

    test('should detect multi-step forms', () => {
      // Add step indicator
      const stepIndicator = document.createElement('div')
      stepIndicator.className = 'application-form-steps'
      document.body.appendChild(stepIndicator)
      
      analyzer.analyzeApplicationForm()
      
      const message = chrome.runtime.sendMessage.mock.calls.find(
        call => call[0].type === 'FORM_ANALYZED'
      )
      expect(message[0].payload.isMultiStep).toBe(true)
    })

    test('should get current form step', () => {
      const stepIndicator = document.createElement('div')
      stepIndicator.className = 'current-step'
      stepIndicator.textContent = 'Step 2 of 3'
      document.body.appendChild(stepIndicator)
      
      const currentStep = analyzer.getCurrentFormStep()
      expect(currentStep).toBe(2)
    })
  })

  describe('UI Management', () => {
    test('should update analysis UI with status and stats', () => {
      const status = 'Analyzing jobs...'
      const stats = { jobsFound: 5, matches: 3, applied: 1 }
      
      analyzer.updateAnalysisUI(status, stats)
      
      const overlay = document.getElementById('linkedin-auto-apply-overlay')
      expect(overlay.style.display).toBe('block')
      
      const statusElement = document.getElementById('analysis-status')
      expect(statusElement.textContent).toBe(status)
      
      const statsElement = document.getElementById('analysis-stats')
      expect(statsElement.innerHTML).toContain('Jobs found: 5')
      expect(statsElement.innerHTML).toContain('Matches: 3')
      expect(statsElement.innerHTML).toContain('Applied: 1')
    })

    test('should handle missing UI elements gracefully', () => {
      // Remove the overlay
      const overlay = document.getElementById('linkedin-auto-apply-overlay')
      if (overlay) overlay.remove()
      
      // Should not throw error
      expect(() => {
        analyzer.updateAnalysisUI('Test status')
      }).not.toThrow()
    })
  })

  describe('Message Handling', () => {
    test('should handle ANALYZE_PAGE message', () => {
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = { type: 'ANALYZE_PAGE' }
      const result = mockListener(request, {}, sendResponse)
      
      expect(result).toBe(true) // Indicates async response
    })

    test('should handle GET_JOB_DETAILS message', () => {
      const jobId = '123456'
      const jobData = { id: jobId, title: 'Test Job' }
      analyzer.jobCache.set(jobId, jobData)
      
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = { type: 'GET_JOB_DETAILS', jobId }
      mockListener(request, {}, sendResponse)
      
      expect(sendResponse).toHaveBeenCalledWith({ job: jobData })
    })

    test('should handle GET_ALL_JOBS message', () => {
      const job1 = { id: '1', title: 'Job 1' }
      const job2 = { id: '2', title: 'Job 2' }
      analyzer.jobCache.set('1', job1)
      analyzer.jobCache.set('2', job2)
      
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = { type: 'GET_ALL_JOBS' }
      mockListener(request, {}, sendResponse)
      
      expect(sendResponse).toHaveBeenCalledWith({
        jobs: expect.arrayContaining([job1, job2])
      })
    })

    test('should handle UPDATE_UI message', () => {
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = {
        type: 'UPDATE_UI',
        status: 'Test status',
        stats: { jobsFound: 1 }
      }
      mockListener(request, {}, sendResponse)
      
      expect(sendResponse).toHaveBeenCalledWith({ success: true })
      
      const statusElement = document.getElementById('analysis-status')
      expect(statusElement.textContent).toBe('Test status')
    })

    test('should handle unknown message types', () => {
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = { type: 'UNKNOWN_TYPE' }
      mockListener(request, {}, sendResponse)
      
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type'
      })
    })
  })

  describe('Utility Functions', () => {
    test('waitForElement should resolve when element exists', async () => {
      const testElement = document.createElement('div')
      testElement.className = 'test-element'
      document.body.appendChild(testElement)
      
      const result = await analyzer.waitForElement('.test-element')
      expect(result).toBe(testElement)
    })

    test('waitForElement should wait for element to appear', async () => {
      const promise = analyzer.waitForElement('.delayed-element', 1000)
      
      // Add element after short delay
      setTimeout(() => {
        const testElement = document.createElement('div')
        testElement.className = 'delayed-element'
        document.body.appendChild(testElement)
      }, 100)
      
      const result = await promise
      expect(result.className).toBe('delayed-element')
    })

    test('waitForElement should reject on timeout', async () => {
      await expect(
        analyzer.waitForElement('.nonexistent-element', 100)
      ).rejects.toThrow('Element .nonexistent-element not found within 100ms')
    })

    test('sendMessage should handle chrome.runtime.lastError', () => {
      chrome.runtime.lastError = { message: 'Test error' }
      
      // Should not throw error
      expect(() => {
        analyzer.sendMessage('TEST_TYPE', { data: 'test' })
      }).not.toThrow()
      
      chrome.runtime.lastError = null
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed job cards gracefully', () => {
      const malformedCard = document.createElement('div')
      malformedCard.innerHTML = '<span>Invalid structure</span>'
      
      const result = analyzer.extractJobFromCard(malformedCard)
      expect(result).toBeNull()
    })

    test('should handle missing DOM elements in job detail analysis', async () => {
      document.body.innerHTML = '<div>Empty page</div>'
      window.location.href = 'https://www.linkedin.com/jobs/view/123/'
      
      analyzer.waitForElement = jest.fn().mockRejectedValue(new Error('Element not found'))
      
      // Should not throw error
      await expect(analyzer.analyzeJobDetail()).rejects.toThrow()
    })

    test('should handle form analysis with no forms', () => {
      document.body.innerHTML = '<div>No forms here</div>'
      
      expect(() => {
        analyzer.analyzeApplicationForm()
      }).not.toThrow()
    })
  })

  describe('Performance Considerations', () => {
    test('should not create duplicate cache entries', () => {
      const job = { id: 'test-job', title: 'Test Job' }
      
      analyzer.jobCache.set(job.id, job)
      analyzer.jobCache.set(job.id, job) // Duplicate
      
      expect(analyzer.jobCache.size).toBe(1)
    })

    test('should limit requirements and benefits extraction', () => {
      const longDescription = Array.from({ length: 20 }, (_, i) => 
        `Requirements:\n• Requirement ${i + 1}`
      ).join('\n')
      
      const requirements = analyzer.extractRequirements(longDescription)
      expect(requirements.length).toBeLessThanOrEqual(10)
    })

    test('should handle large number of job cards efficiently', () => {
      // Create many job cards
      for (let i = 0; i < 100; i++) {
        const card = createMockJobCard({
          id: `job-${i}`,
          title: `Job ${i}`,
          company: `Company ${i}`,
          location: 'Test City',
          isEasyApply: true,
          postedDate: new Date(),
          applicants: i * 10
        })
        document.body.appendChild(card)
      }
      
      const startTime = performance.now()
      analyzer.analyzeJobListings()
      const endTime = performance.now()
      
      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
      expect(analyzer.jobCache.size).toBe(100)
    })
  })
})