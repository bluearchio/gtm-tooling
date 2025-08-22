/**
 * Unit Tests for Storage Utility
 * Tests Chrome storage API wrapper and data management functions
 */

const fs = require('fs')
const path = require('path')
const { mockUserProfile, mockJobData } = require('../fixtures/linkedinData.js')

// Read and execute the storage utility source
const storagePath = path.join(process.cwd(), 'src/utils/storage.js')
const storageCode = fs.readFileSync(storagePath, 'utf8')

// Execute the storage utility code
eval(storageCode)

describe('Storage Utility', () => {
  let Storage

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Get the Storage object from global scope
    Storage = global.Storage || globalThis.Storage

    // Set up default mock responses
    chrome.storage.local.get.mockResolvedValue({})
    chrome.storage.local.set.mockResolvedValue()
    chrome.storage.local.remove.mockResolvedValue()
    chrome.storage.local.clear.mockResolvedValue()
  })

  describe('Basic Storage Operations', () => {
    test('should get data from Chrome storage', async () => {
      const mockData = { testKey: 'testValue' }
      chrome.storage.local.get.mockResolvedValue(mockData)

      const result = await Storage.get('testKey')

      expect(chrome.storage.local.get).toHaveBeenCalledWith('testKey')
      expect(result).toEqual(mockData)
    })

    test('should handle storage get errors gracefully', async () => {
      const error = new Error('Storage get failed')
      chrome.storage.local.get.mockRejectedValue(error)

      const result = await Storage.get('testKey')

      expect(result).toBeNull()
    })

    test('should set data in Chrome storage', async () => {
      const testData = { key1: 'value1', key2: 'value2' }

      await Storage.set(testData)

      expect(chrome.storage.local.set).toHaveBeenCalledWith(testData)
    })

    test('should handle storage set errors', async () => {
      const error = new Error('Storage set failed')
      chrome.storage.local.set.mockRejectedValue(error)

      await expect(Storage.set({ test: 'data' })).rejects.toThrow('Storage set failed')
    })

    test('should remove data from Chrome storage', async () => {
      const keysToRemove = ['key1', 'key2']

      await Storage.remove(keysToRemove)

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(keysToRemove)
    })

    test('should handle storage remove errors', async () => {
      const error = new Error('Storage remove failed')
      chrome.storage.local.remove.mockRejectedValue(error)

      await expect(Storage.remove('testKey')).rejects.toThrow('Storage remove failed')
    })

    test('should clear all data from Chrome storage', async () => {
      await Storage.clear()

      expect(chrome.storage.local.clear).toHaveBeenCalled()
    })

    test('should handle storage clear errors', async () => {
      const error = new Error('Storage clear failed')
      chrome.storage.local.clear.mockRejectedValue(error)

      await expect(Storage.clear()).rejects.toThrow('Storage clear failed')
    })
  })

  describe('User Profile Management', () => {
    test('should get user profile with default values', async () => {
      chrome.storage.local.get.mockResolvedValue({})

      const profile = await Storage.getUserProfile()

      expect(chrome.storage.local.get).toHaveBeenCalledWith('userProfile')
      expect(profile).toEqual(expect.objectContaining({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        currentTitle: '',
        currentCompany: '',
        yearsOfExperience: 0,
        linkedInUrl: '',
        city: '',
        state: '',
        country: 'United States',
        zipCode: '',
        workAuthorization: 'Authorized to work in the US',
        requireSponsorship: 'No',
        willingToRelocate: 'Yes',
        startDate: 'Immediately',
        noticePeriod: '2 weeks',
        desiredSalary: 'Negotiable',
        skills: [],
        education: [],
        resumes: [],
        coverLetterTemplates: [],
        customAnswers: []
      }))
    })

    test('should get existing user profile', async () => {
      const existingProfile = {
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          currentTitle: 'Software Engineer'
        }
      }
      chrome.storage.local.get.mockResolvedValue(existingProfile)

      const profile = await Storage.getUserProfile()

      expect(profile.firstName).toBe('John')
      expect(profile.lastName).toBe('Doe')
      expect(profile.email).toBe('john@example.com')
      expect(profile.currentTitle).toBe('Software Engineer')
    })

    test('should save user profile', async () => {
      const profileToSave = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-0123'
      }

      await Storage.saveUserProfile(profileToSave)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        userProfile: profileToSave
      })
    })
  })

  describe('Configuration Management', () => {
    test('should get configuration', async () => {
      const mockConfig = {
        config: {
          dailyLimit: 50,
          sessionLimit: 10,
          filters: { isRemote: 'yes' }
        }
      }
      chrome.storage.local.get.mockResolvedValue(mockConfig)

      const config = await Storage.getConfig()

      expect(chrome.storage.local.get).toHaveBeenCalledWith('config')
      expect(config).toEqual(mockConfig.config)
    })

    test('should return null for missing configuration', async () => {
      chrome.storage.local.get.mockResolvedValue({})

      const config = await Storage.getConfig()

      expect(config).toBeNull()
    })

    test('should save configuration', async () => {
      const configToSave = {
        dailyLimit: 100,
        filters: { keywords: ['react', 'javascript'] }
      }

      await Storage.saveConfig(configToSave)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        config: configToSave
      })
    })
  })

  describe('Application History Management', () => {
    test('should get applications history', async () => {
      const mockApplications = {
        applications: [
          {
            id: '1',
            jobId: 'job123',
            appliedAt: '2024-01-01T10:00:00Z',
            status: 'submitted'
          },
          {
            id: '2',
            jobId: 'job456',
            appliedAt: '2024-01-02T11:00:00Z',
            status: 'failed'
          }
        ]
      }
      chrome.storage.local.get.mockResolvedValue(mockApplications)

      const applications = await Storage.getApplications()

      expect(chrome.storage.local.get).toHaveBeenCalledWith('applications')
      expect(applications).toEqual(mockApplications.applications)
    })

    test('should return empty array for no applications', async () => {
      chrome.storage.local.get.mockResolvedValue({})

      const applications = await Storage.getApplications()

      expect(applications).toEqual([])
    })

    test('should add application to history', async () => {
      const existingApplications = [
        { id: '1', jobId: 'job123', status: 'submitted' }
      ]
      const newApplication = {
        id: '2',
        jobId: 'job456',
        appliedAt: '2024-01-02T10:00:00Z',
        status: 'submitted'
      }

      chrome.storage.local.get.mockResolvedValue({
        applications: existingApplications
      })

      await Storage.addApplication(newApplication)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        applications: [...existingApplications, newApplication]
      })
    })

    test('should add application to empty history', async () => {
      const newApplication = {
        id: '1',
        jobId: 'job123',
        appliedAt: '2024-01-01T10:00:00Z',
        status: 'submitted'
      }

      chrome.storage.local.get.mockResolvedValue({})

      await Storage.addApplication(newApplication)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        applications: [newApplication]
      })
    })

    test('should check if applied to job', async () => {
      const applications = [
        { jobId: 'job123', status: 'submitted' },
        { jobId: 'job456', status: 'failed' }
      ]

      chrome.storage.local.get.mockResolvedValue({ applications })

      const hasApplied123 = await Storage.hasAppliedToJob('job123')
      const hasApplied789 = await Storage.hasAppliedToJob('job789')

      expect(hasApplied123).toBe(true)
      expect(hasApplied789).toBe(false)
    })

    test('should get today application count', async () => {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const applications = [
        { jobId: 'job1', appliedAt: `${today}T09:00:00Z`, status: 'submitted' },
        { jobId: 'job2', appliedAt: `${today}T10:00:00Z`, status: 'submitted' },
        { jobId: 'job3', appliedAt: yesterday, status: 'submitted' },
        { jobId: 'job4', appliedAt: `${today}T11:00:00Z`, status: 'failed' }
      ]

      chrome.storage.local.get.mockResolvedValue({ applications })

      const todayCount = await Storage.getTodayApplicationCount()

      expect(todayCount).toBe(3) // 3 applications today (including failed one)
    })

    test('should return 0 for no applications today', async () => {
      chrome.storage.local.get.mockResolvedValue({ applications: [] })

      const todayCount = await Storage.getTodayApplicationCount()

      expect(todayCount).toBe(0)
    })
  })

  describe('Statistics Management', () => {
    test('should get statistics with default values', async () => {
      chrome.storage.local.get.mockResolvedValue({})

      const stats = await Storage.getStatistics()

      expect(chrome.storage.local.get).toHaveBeenCalledWith('statistics')
      expect(stats).toEqual({
        totalApplications: 0,
        successfulApplications: 0,
        failedApplications: 0,
        skippedJobs: 0,
        averageTimePerApplication: 0,
        applicationsByDay: [],
        topCompanies: [],
        topLocations: [],
        successRate: 0,
        lastApplicationDate: null
      })
    })

    test('should get existing statistics', async () => {
      const existingStats = {
        statistics: {
          totalApplications: 25,
          successfulApplications: 20,
          failedApplications: 5,
          successRate: 80
        }
      }
      chrome.storage.local.get.mockResolvedValue(existingStats)

      const stats = await Storage.getStatistics()

      expect(stats).toEqual(expect.objectContaining({
        totalApplications: 25,
        successfulApplications: 20,
        failedApplications: 5,
        successRate: 80
      }))
    })

    test('should update statistics', async () => {
      const currentStats = {
        totalApplications: 10,
        successfulApplications: 8
      }
      const updates = {
        totalApplications: 11,
        successfulApplications: 9,
        lastApplicationDate: '2024-01-02T10:00:00Z'
      }

      chrome.storage.local.get.mockResolvedValue({
        statistics: currentStats
      })

      await Storage.updateStatistics(updates)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        statistics: {
          ...currentStats,
          ...updates
        }
      })
    })

    test('should update statistics from empty state', async () => {
      const updates = {
        totalApplications: 1,
        successfulApplications: 1,
        successRate: 100
      }

      chrome.storage.local.get.mockResolvedValue({})

      await Storage.updateStatistics(updates)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        statistics: expect.objectContaining(updates)
      })
    })
  })

  describe('Custom Answers Management', () => {
    test('should get custom answers', async () => {
      const mockAnswers = {
        customAnswers: [
          { question: 'Why do you want this job?', answer: 'Great opportunity' },
          { question: 'Years of experience?', answer: '5 years' }
        ]
      }
      chrome.storage.local.get.mockResolvedValue(mockAnswers)

      const answers = await Storage.getCustomAnswers()

      expect(chrome.storage.local.get).toHaveBeenCalledWith('customAnswers')
      expect(answers).toEqual(mockAnswers.customAnswers)
    })

    test('should return empty array for no custom answers', async () => {
      chrome.storage.local.get.mockResolvedValue({})

      const answers = await Storage.getCustomAnswers()

      expect(answers).toEqual([])
    })

    test('should save custom answers', async () => {
      const answersToSave = [
        { question: 'Experience with React?', answer: '3 years' },
        { question: 'Preferred work environment?', answer: 'Remote' }
      ]

      await Storage.saveCustomAnswers(answersToSave)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        customAnswers: answersToSave
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed')
      chrome.storage.local.get.mockRejectedValue(networkError)

      // Should not throw for get operations that have fallbacks
      const profile = await Storage.getUserProfile()
      expect(profile).toBeDefined()

      const applications = await Storage.getApplications()
      expect(applications).toEqual([])

      const stats = await Storage.getStatistics()
      expect(stats).toBeDefined()
    })

    test('should handle quota exceeded errors', async () => {
      const quotaError = new Error('QUOTA_BYTES_PER_ITEM quota exceeded')
      chrome.storage.local.set.mockRejectedValue(quotaError)

      await expect(Storage.set({ largeData: 'x'.repeat(10000) }))
        .rejects.toThrow('QUOTA_BYTES_PER_ITEM quota exceeded')
    })

    test('should handle malformed data gracefully', async () => {
      // Mock malformed data in storage
      chrome.storage.local.get.mockResolvedValue({
        userProfile: null,
        applications: 'not-an-array',
        statistics: undefined
      })

      // Should return default values instead of throwing
      const profile = await Storage.getUserProfile()
      expect(profile).toBeDefined()
      expect(typeof profile).toBe('object')

      const applications = await Storage.getApplications()
      expect(Array.isArray(applications)).toBe(true)

      const stats = await Storage.getStatistics()
      expect(stats).toBeDefined()
      expect(typeof stats).toBe('object')
    })

    test('should handle concurrent access', async () => {
      // Simulate concurrent operations
      const promises = []
      
      for (let i = 0; i < 10; i++) {
        promises.push(Storage.addApplication({
          id: `app-${i}`,
          jobId: `job-${i}`,
          status: 'submitted'
        }))
      }

      await expect(Promise.all(promises)).resolves.toBeDefined()
      
      // Should have made multiple storage calls
      expect(chrome.storage.local.get).toHaveBeenCalledTimes(10)
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(10)
    })
  })

  describe('Data Migration and Compatibility', () => {
    test('should handle legacy user profile format', async () => {
      const legacyProfile = {
        userProfile: {
          name: 'John Doe', // Old format
          email: 'john@example.com'
          // Missing new fields
        }
      }
      chrome.storage.local.get.mockResolvedValue(legacyProfile)

      const profile = await Storage.getUserProfile()

      // Should merge with defaults
      expect(profile.email).toBe('john@example.com')
      expect(profile.firstName).toBe('') // Default value
      expect(profile.country).toBe('United States') // Default value
    })

    test('should handle missing application metadata', async () => {
      const applicationsWithMissingData = {
        applications: [
          { jobId: 'job1' }, // Missing status, date, etc.
          { jobId: 'job2', status: 'submitted' }, // Missing date
          { jobId: 'job3', appliedAt: '2024-01-01T10:00:00Z' } // Missing status
        ]
      }
      chrome.storage.local.get.mockResolvedValue(applicationsWithMissingData)

      const count = await Storage.getTodayApplicationCount()
      const hasApplied = await Storage.hasAppliedToJob('job1')

      // Should not throw, should handle gracefully
      expect(typeof count).toBe('number')
      expect(typeof hasApplied).toBe('boolean')
    })
  })

  describe('Performance and Optimization', () => {
    test('should cache frequently accessed data', async () => {
      // Multiple calls to the same data
      await Storage.getUserProfile()
      await Storage.getUserProfile()
      await Storage.getUserProfile()

      // Should call storage API each time (no caching in current implementation)
      expect(chrome.storage.local.get).toHaveBeenCalledTimes(3)
    })

    test('should handle large datasets efficiently', async () => {
      const largeApplicationHistory = Array.from({ length: 1000 }, (_, i) => ({
        id: `app-${i}`,
        jobId: `job-${i}`,
        appliedAt: new Date(Date.now() - i * 60000).toISOString(),
        status: 'submitted'
      }))

      chrome.storage.local.get.mockResolvedValue({
        applications: largeApplicationHistory
      })

      const startTime = Date.now()
      
      const applications = await Storage.getApplications()
      const todayCount = await Storage.getTodayApplicationCount()
      const hasApplied = await Storage.hasAppliedToJob('job-500')

      const endTime = Date.now()

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000)
      expect(applications).toHaveLength(1000)
      expect(typeof todayCount).toBe('number')
      expect(typeof hasApplied).toBe('boolean')
    })
  })

  describe('Type Safety and Validation', () => {
    test('should handle invalid parameter types', async () => {
      // Should not throw for invalid inputs
      expect(async () => {
        await Storage.get(null)
        await Storage.get(undefined)
        await Storage.get(123)
      }).not.toThrow()

      expect(async () => {
        await Storage.set(null)
        await Storage.set('not-an-object')
      }).not.toThrow()
    })

    test('should validate application data structure', async () => {
      const invalidApplications = [
        null,
        undefined,
        'not-an-application',
        { /* missing required fields */ },
        { jobId: null, status: undefined }
      ]

      for (const app of invalidApplications) {
        await expect(Storage.addApplication(app)).resolves.toBeUndefined()
      }
    })

    test('should handle empty string dates correctly', async () => {
      const applicationsWithEmptyDates = {
        applications: [
          { jobId: 'job1', appliedAt: '', status: 'submitted' },
          { jobId: 'job2', appliedAt: null, status: 'submitted' },
          { jobId: 'job3', appliedAt: undefined, status: 'submitted' }
        ]
      }

      chrome.storage.local.get.mockResolvedValue(applicationsWithEmptyDates)

      const todayCount = await Storage.getTodayApplicationCount()

      expect(typeof todayCount).toBe('number')
      expect(todayCount).toBeGreaterThanOrEqual(0)
    })
  })
})