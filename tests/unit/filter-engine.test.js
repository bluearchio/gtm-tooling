/**
 * Unit Tests for Filter Engine
 * Tests job filtering logic, criteria matching, and scoring algorithms
 */

const fs = require('fs')
const path = require('path')
const { mockJobData } = require('../fixtures/linkedinData.js')

// Read and execute the filter engine source
const filterEnginePath = path.join(process.cwd(), 'src/content/filter-engine.js')
const filterEngineCode = fs.readFileSync(filterEnginePath, 'utf8')

// Execute the source code
eval(filterEngineCode)

describe('FilterEngine', () => {
  let filterEngine

  beforeEach(async () => {
    // Mock chrome storage
    chrome.storage.local.get.mockResolvedValue({
      config: {
        filters: {
          isRemote: 'any',
          keywords: ['javascript', 'react'],
          keywordLogic: 'OR',
          experienceLevel: 'any',
          jobType: ['full-time'],
          postedWithin: 7,
          salaryMin: null,
          excludeCompanies: []
        }
      }
    })

    filterEngine = new FilterEngine()
    await filterEngine.loadConfig()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(filterEngine.config).toBeDefined()
      expect(filterEngine.config.filters).toBeDefined()
    })

    test('should load configuration from storage', async () => {
      const mockConfig = {
        filters: {
          isRemote: 'yes',
          keywords: ['python', 'django'],
          keywordLogic: 'AND'
        }
      }

      chrome.storage.local.get.mockResolvedValue({ config: mockConfig })
      
      const newEngine = new FilterEngine()
      await newEngine.loadConfig()
      
      expect(newEngine.config.filters.isRemote).toBe('yes')
      expect(newEngine.config.filters.keywords).toEqual(['python', 'django'])
      expect(newEngine.config.filters.keywordLogic).toBe('AND')
    })

    test('should use default config when storage fails', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'))
      
      const newEngine = new FilterEngine()
      await newEngine.loadConfig()
      
      expect(newEngine.config).toEqual(newEngine.getDefaultConfig())
    })

    test('should get default configuration', () => {
      const defaultConfig = filterEngine.getDefaultConfig()
      
      expect(defaultConfig.filters).toEqual({
        isRemote: 'any',
        keywords: [],
        keywordLogic: 'OR',
        experienceLevel: 'any',
        jobType: ['full-time'],
        postedWithin: 7,
        salaryMin: null,
        excludeCompanies: []
      })
    })
  })

  describe('Job Matching', () => {
    let testJob

    beforeEach(() => {
      testJob = {
        ...mockJobData.softwareEngineerJob,
        title: 'Senior React Developer',
        company: 'Tech Corp',
        description: 'We are looking for a React developer with JavaScript experience',
        location: 'San Francisco, CA (Remote)',
        isRemote: true,
        isEasyApply: true,
        experienceLevel: 'senior',
        jobType: 'full-time',
        postedDate: new Date().toISOString(),
        salary: { min: 80000, max: 120000 },
        applicants: 15
      }
    })

    test('should match jobs based on remote preference', () => {
      filterEngine.config.filters.isRemote = 'yes'
      
      const remoteJob = { ...testJob, isRemote: true }
      const onsiteJob = { ...testJob, isRemote: false }
      
      const remoteResult = filterEngine.matchJob(remoteJob)
      const onsiteResult = filterEngine.matchJob(onsiteJob)
      
      expect(remoteResult.score).toBeGreaterThan(onsiteResult.score)
      expect(remoteResult.reasons).toContain('Remote position')
    })

    test('should match jobs based on keywords with OR logic', () => {
      filterEngine.config.filters.keywords = ['react', 'vue']
      filterEngine.config.filters.keywordLogic = 'OR'
      
      const reactJob = { ...testJob, description: 'React development position' }
      const vueJob = { ...testJob, description: 'Vue.js frontend developer' }
      const angularJob = { ...testJob, description: 'Angular developer needed' }
      
      const reactResult = filterEngine.matchJob(reactJob)
      const vueResult = filterEngine.matchJob(vueJob)
      const angularResult = filterEngine.matchJob(angularJob)
      
      expect(reactResult.matches).toBe(true)
      expect(vueResult.matches).toBe(true)
      expect(angularResult.matches).toBe(false)
      
      expect(reactResult.reasons).toContain('Matches keywords: react')
      expect(vueResult.reasons).toContain('Matches keywords: vue')
    })

    test('should match jobs based on keywords with AND logic', () => {
      filterEngine.config.filters.keywords = ['react', 'javascript']
      filterEngine.config.filters.keywordLogic = 'AND'
      
      const bothKeywordsJob = { ...testJob, description: 'React and JavaScript developer' }
      const oneKeywordJob = { ...testJob, description: 'React developer position' }
      
      const bothResult = filterEngine.matchJob(bothKeywordsJob)
      const oneResult = filterEngine.matchJob(oneKeywordJob)
      
      expect(bothResult.matches).toBe(true)
      expect(oneResult.matches).toBe(false)
      
      expect(bothResult.reasons).toContain('Matches keywords: react, javascript')
    })

    test('should match jobs based on experience level', () => {
      filterEngine.config.filters.experienceLevel = 'senior'
      
      const seniorJob = { ...testJob, experienceLevel: 'senior' }
      const juniorJob = { ...testJob, experienceLevel: 'junior' }
      
      const seniorResult = filterEngine.matchJob(seniorJob)
      const juniorResult = filterEngine.matchJob(juniorJob)
      
      expect(seniorResult.score).toBeGreaterThan(juniorResult.score)
      expect(seniorResult.reasons).toContain('Matches experience level: senior')
    })

    test('should match jobs based on job type', () => {
      filterEngine.config.filters.jobType = ['full-time']
      
      const fullTimeJob = { ...testJob, jobType: 'full-time' }
      const partTimeJob = { ...testJob, jobType: 'part-time' }
      
      const fullTimeResult = filterEngine.matchJob(fullTimeJob)
      const partTimeResult = filterEngine.matchJob(partTimeJob)
      
      expect(fullTimeResult.score).toBeGreaterThan(partTimeResult.score)
      expect(fullTimeResult.reasons).toContain('Job type: full-time')
    })

    test('should match jobs based on posted date', () => {
      filterEngine.config.filters.postedWithin = 7
      
      const recentJob = { ...testJob, postedDate: new Date().toISOString() }
      const oldJob = { ...testJob, postedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
      
      const recentResult = filterEngine.matchJob(recentJob)
      const oldResult = filterEngine.matchJob(oldJob)
      
      expect(recentResult.score).toBeGreaterThan(oldResult.score)
      expect(recentResult.reasons.some(r => r.includes('days ago'))).toBe(true)
    })

    test('should match jobs based on salary requirements', () => {
      filterEngine.config.filters.salaryMin = 70000
      
      const highSalaryJob = { ...testJob, salary: { min: 80000, max: 120000 } }
      const lowSalaryJob = { ...testJob, salary: { min: 50000, max: 65000 } }
      
      const highResult = filterEngine.matchJob(highSalaryJob)
      const lowResult = filterEngine.matchJob(lowSalaryJob)
      
      expect(highResult.score).toBeGreaterThan(lowResult.score)
      expect(highResult.reasons).toContain('Meets salary requirements')
    })

    test('should exclude companies in exclusion list', () => {
      filterEngine.config.filters.excludeCompanies = ['BadCorp', 'WorstCompany']
      
      const excludedJob = { ...testJob, company: 'BadCorp Industries' }
      const allowedJob = { ...testJob, company: 'GoodCorp' }
      
      const excludedResult = filterEngine.matchJob(excludedJob)
      const allowedResult = filterEngine.matchJob(allowedJob)
      
      expect(excludedResult.matches).toBe(false)
      expect(excludedResult.failedFilters).toContain('Company is in exclusion list')
      expect(allowedResult.matches).toBe(true)
    })

    test('should calculate comprehensive match score', () => {
      filterEngine.config.filters = {
        isRemote: 'yes',
        keywords: ['react', 'javascript'],
        keywordLogic: 'OR',
        experienceLevel: 'senior',
        jobType: ['full-time'],
        postedWithin: 7,
        salaryMin: 70000,
        excludeCompanies: []
      }
      
      const perfectJob = {
        ...testJob,
        title: 'Senior React Developer',
        description: 'React and JavaScript expert needed',
        isRemote: true,
        experienceLevel: 'senior',
        jobType: 'full-time',
        postedDate: new Date().toISOString(),
        salary: { min: 90000, max: 130000 },
        isEasyApply: true
      }
      
      const result = filterEngine.matchJob(perfectJob)
      
      expect(result.matches).toBe(true)
      expect(result.score).toBeGreaterThan(0.8)
      expect(result.reasons.length).toBeGreaterThan(3)
    })

    test('should handle jobs with missing properties', () => {
      const incompleteJob = {
        id: '123',
        title: 'Developer',
        company: 'TechCorp'
        // Missing other properties
      }
      
      const result = filterEngine.matchJob(incompleteJob)
      
      expect(result).toBeDefined()
      expect(result.matches).toBeDefined()
      expect(result.score).toBeDefined()
    })
  })

  describe('Keyword Matching', () => {
    test('should match keywords case-insensitively', () => {
      const job = {
        title: 'REACT Developer',
        description: 'JavaScript and PYTHON experience required'
      }
      
      const keywords = ['react', 'javascript', 'python']
      const result = filterEngine.matchKeywords(job, keywords, 'OR')
      
      expect(result.matched).toBe(true)
      expect(result.matchedKeywords).toEqual(['react', 'javascript', 'python'])
      expect(result.matchRatio).toBe(1)
    })

    test('should match partial keywords', () => {
      const job = {
        title: 'React Developer',
        description: 'ReactJS and JavaScript experience'
      }
      
      const keywords = ['react']
      const result = filterEngine.matchKeywords(job, keywords, 'OR')
      
      expect(result.matched).toBe(true)
      expect(result.matchedKeywords).toContain('react')
    })

    test('should handle OR logic correctly', () => {
      const job = {
        title: 'React Developer',
        description: 'Frontend development position'
      }
      
      const keywords = ['react', 'angular', 'vue']
      const result = filterEngine.matchKeywords(job, keywords, 'OR')
      
      expect(result.matched).toBe(true)
      expect(result.matchedKeywords).toEqual(['react'])
      expect(result.matchRatio).toBe(1/3)
    })

    test('should handle AND logic correctly', () => {
      const job = {
        title: 'React Developer',
        description: 'JavaScript and TypeScript experience required'
      }
      
      const allPresentKeywords = ['react', 'javascript']
      const mixedKeywords = ['react', 'angular']
      
      const allPresentResult = filterEngine.matchKeywords(job, allPresentKeywords, 'AND')
      const mixedResult = filterEngine.matchKeywords(job, mixedKeywords, 'AND')
      
      expect(allPresentResult.matched).toBe(true)
      expect(mixedResult.matched).toBe(false)
    })

    test('should return empty results for no keywords', () => {
      const job = { title: 'Developer', description: 'Great opportunity' }
      const result = filterEngine.matchKeywords(job, [], 'OR')
      
      expect(result.matched).toBe(false)
      expect(result.matchedKeywords).toEqual([])
      expect(result.matchRatio).toBe(0)
    })
  })

  describe('Job Search Text Generation', () => {
    test('should combine all searchable text fields', () => {
      const job = {
        title: 'Software Engineer',
        company: 'TechCorp',
        description: 'Great opportunity',
        location: 'San Francisco',
        requirements: ['JavaScript', 'React'],
        benefits: ['Health insurance', 'Remote work']
      }
      
      const searchText = filterEngine.getJobSearchText(job)
      
      expect(searchText).toContain('Software Engineer')
      expect(searchText).toContain('TechCorp')
      expect(searchText).toContain('Great opportunity')
      expect(searchText).toContain('San Francisco')
      expect(searchText).toContain('JavaScript React')
      expect(searchText).toContain('Health insurance Remote work')
    })

    test('should handle missing fields gracefully', () => {
      const job = {
        title: 'Developer',
        company: 'Corp'
        // Other fields missing
      }
      
      const searchText = filterEngine.getJobSearchText(job)
      
      expect(searchText).toContain('Developer')
      expect(searchText).toContain('Corp')
      expect(searchText).not.toContain('undefined')
      expect(searchText).not.toContain('null')
    })
  })

  describe('Date Calculations', () => {
    test('should calculate days ago correctly', () => {
      const today = new Date()
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      expect(filterEngine.getDaysAgo(today)).toBe(0)
      expect(filterEngine.getDaysAgo(threeDaysAgo)).toBe(3)
      expect(filterEngine.getDaysAgo(oneWeekAgo)).toBe(7)
    })

    test('should handle invalid dates', () => {
      const invalidDate = 'invalid-date'
      
      // Should not throw, should return a reasonable value
      expect(() => filterEngine.getDaysAgo(invalidDate)).not.toThrow()
    })

    test('should handle future dates', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const daysAgo = filterEngine.getDaysAgo(futureDate)
      
      expect(daysAgo).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Job List Filtering', () => {
    let testJobs

    beforeEach(() => {
      testJobs = [
        {
          id: '1',
          title: 'React Developer',
          company: 'TechCorp',
          description: 'React and JavaScript development',
          isRemote: true,
          experienceLevel: 'senior',
          jobType: 'full-time',
          postedDate: new Date().toISOString(),
          isEasyApply: true
        },
        {
          id: '2',
          title: 'Angular Developer',
          company: 'WebCorp',
          description: 'Angular and TypeScript development',
          isRemote: false,
          experienceLevel: 'mid',
          jobType: 'full-time',
          postedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          isEasyApply: true
        },
        {
          id: '3',
          title: 'Full Stack Developer',
          company: 'StartupCorp',
          description: 'React, Node.js, and JavaScript expertise',
          isRemote: true,
          experienceLevel: 'senior',
          jobType: 'contract',
          postedDate: new Date().toISOString(),
          isEasyApply: false
        }
      ]
    })

    test('should filter and sort jobs by match score', () => {
      filterEngine.config.filters = {
        isRemote: 'yes',
        keywords: ['react', 'javascript'],
        keywordLogic: 'OR',
        experienceLevel: 'any',
        jobType: ['full-time', 'contract'],
        postedWithin: 7,
        salaryMin: null,
        excludeCompanies: []
      }
      
      const filtered = filterEngine.filterJobs(testJobs)
      
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered[0]).toHaveProperty('matchScore')
      expect(filtered[0]).toHaveProperty('matchReasons')
      
      // Should be sorted by match score (highest first)
      for (let i = 1; i < filtered.length; i++) {
        expect(filtered[i-1].matchScore).toBeGreaterThanOrEqual(filtered[i].matchScore)
      }
    })

    test('should exclude non-matching jobs', () => {
      filterEngine.config.filters = {
        isRemote: 'yes',
        keywords: ['python'], // None of our test jobs match Python
        keywordLogic: 'AND',
        experienceLevel: 'any',
        jobType: ['full-time'],
        postedWithin: 30,
        salaryMin: null,
        excludeCompanies: []
      }
      
      const filtered = filterEngine.filterJobs(testJobs)
      
      expect(filtered.length).toBe(0)
    })

    test('should include all matching jobs with appropriate scores', () => {
      filterEngine.config.filters = {
        isRemote: 'any',
        keywords: [],
        keywordLogic: 'OR',
        experienceLevel: 'any',
        jobType: ['full-time', 'contract'],
        postedWithin: 30,
        salaryMin: null,
        excludeCompanies: []
      }
      
      const filtered = filterEngine.filterJobs(testJobs)
      
      expect(filtered.length).toBe(testJobs.length)
      filtered.forEach(job => {
        expect(job.matchScore).toBeGreaterThan(0)
        expect(Array.isArray(job.matchReasons)).toBe(true)
      })
    })
  })

  describe('Quick Check Filter', () => {
    let testJob

    beforeEach(() => {
      testJob = {
        id: '123',
        company: 'TechCorp',
        isEasyApply: true,
        postedDate: new Date().toISOString()
      }
    })

    test('should pass jobs that meet quick criteria', () => {
      filterEngine.config.filters = {
        easyApplyOnly: false,
        excludeCompanies: [],
        postedWithin: 7
      }
      
      const result = filterEngine.quickCheck(testJob)
      expect(result).toBe(true)
    })

    test('should reject jobs without Easy Apply when required', () => {
      filterEngine.config.filters = {
        easyApplyOnly: true,
        excludeCompanies: [],
        postedWithin: 7
      }
      
      const nonEasyApplyJob = { ...testJob, isEasyApply: false }
      const easyApplyJob = { ...testJob, isEasyApply: true }
      
      expect(filterEngine.quickCheck(nonEasyApplyJob)).toBe(false)
      expect(filterEngine.quickCheck(easyApplyJob)).toBe(true)
    })

    test('should reject excluded companies', () => {
      filterEngine.config.filters = {
        excludeCompanies: ['BadCorp', 'WorstCorp'],
        postedWithin: 30
      }
      
      const excludedJob = { ...testJob, company: 'BadCorp Inc' }
      const allowedJob = { ...testJob, company: 'GoodCorp' }
      
      expect(filterEngine.quickCheck(excludedJob)).toBe(false)
      expect(filterEngine.quickCheck(allowedJob)).toBe(true)
    })

    test('should reject jobs posted too long ago', () => {
      filterEngine.config.filters = {
        excludeCompanies: [],
        postedWithin: 7
      }
      
      const recentJob = { ...testJob, postedDate: new Date().toISOString() }
      const oldJob = { ...testJob, postedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
      
      expect(filterEngine.quickCheck(recentJob)).toBe(true)
      expect(filterEngine.quickCheck(oldJob)).toBe(false)
    })
  })

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        filters: {
          isRemote: 'yes',
          keywords: ['python', 'django']
        }
      }
      
      filterEngine.updateConfig(newConfig)
      
      expect(filterEngine.config.filters.isRemote).toBe('yes')
      expect(filterEngine.config.filters.keywords).toEqual(['python', 'django'])
    })

    test('should merge configuration updates', () => {
      const originalKeywords = filterEngine.config.filters.keywords
      
      const update = {
        filters: {
          isRemote: 'yes'
        }
      }
      
      filterEngine.updateConfig(update)
      
      expect(filterEngine.config.filters.isRemote).toBe('yes')
      expect(filterEngine.config.filters.keywords).toEqual(originalKeywords) // Should be preserved
    })
  })

  describe('Filter Summary', () => {
    test('should generate human-readable filter summary', () => {
      filterEngine.config.filters = {
        keywords: ['react', 'javascript'],
        isRemote: 'yes',
        experienceLevel: 'senior',
        postedWithin: 7,
        salaryMin: 80000
      }
      
      const summary = filterEngine.getFilterSummary()
      
      expect(summary).toContain('react, javascript')
      expect(summary).toContain('Remote: yes')
      expect(summary).toContain('Experience: senior')
      expect(summary).toContain('Posted within 7 days')
      expect(summary).toContain('Min salary: $80,000')
    })

    test('should handle empty filters gracefully', () => {
      filterEngine.config.filters = {
        isRemote: 'any',
        keywords: [],
        experienceLevel: 'any',
        postedWithin: null,
        salaryMin: null
      }
      
      const summary = filterEngine.getFilterSummary()
      
      expect(summary).toBe('')
    })

    test('should format salary with thousands separator', () => {
      filterEngine.config.filters = {
        salaryMin: 150000
      }
      
      const summary = filterEngine.getFilterSummary()
      
      expect(summary).toContain('$150,000')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined jobs', () => {
      expect(() => filterEngine.matchJob(null)).not.toThrow()
      expect(() => filterEngine.matchJob(undefined)).not.toThrow()
      expect(() => filterEngine.matchJob({})).not.toThrow()
    })

    test('should handle malformed job data', () => {
      const malformedJob = {
        id: null,
        title: undefined,
        company: '',
        description: null,
        postedDate: 'invalid-date'
      }
      
      expect(() => filterEngine.matchJob(malformedJob)).not.toThrow()
      
      const result = filterEngine.matchJob(malformedJob)
      expect(result).toBeDefined()
      expect(result.matches).toBeDefined()
      expect(result.score).toBeDefined()
    })

    test('should handle empty job arrays', () => {
      const result = filterEngine.filterJobs([])
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    test('should handle configuration without required fields', () => {
      filterEngine.config = { filters: {} }
      
      const job = mockJobData.softwareEngineerJob
      
      expect(() => filterEngine.matchJob(job)).not.toThrow()
      expect(() => filterEngine.quickCheck(job)).not.toThrow()
      expect(() => filterEngine.getFilterSummary()).not.toThrow()
    })

    test('should handle circular references in job data', () => {
      const job = { id: '123', title: 'Test Job' }
      job.self = job // Create circular reference
      
      expect(() => filterEngine.matchJob(job)).not.toThrow()
    })
  })
})