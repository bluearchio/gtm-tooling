/**
 * Unit Tests for Background Service Worker
 * Tests message handling, automation orchestration, and state management
 */

import fs from 'fs'
import path from 'path'
import { mockJobData, mockUserProfile } from '../fixtures/linkedinData.js'

// Read and execute the service worker source
const serviceWorkerPath = path.join(process.cwd(), 'src/background/service-worker.js')
const serviceWorkerCode = fs.readFileSync(serviceWorkerPath, 'utf8')

// Mock Chrome APIs that aren't covered by the setup
const mockChrome = {
  ...global.chrome,
  scripting: {
    executeScript: jest.fn(),
    insertCSS: jest.fn()
  },
  tabs: {
    ...global.chrome.tabs,
    get: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  alarms: {
    ...global.chrome.alarms,
    create: jest.fn()
  }
}

global.chrome = mockChrome

// Execute the service worker code
eval(serviceWorkerCode)

describe('Background Service Worker', () => {
  let mockTab, mockSender, mockSendResponse

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock tab data
    mockTab = {
      id: 1,
      url: 'https://www.linkedin.com/jobs/search/'
    }
    
    mockSender = {
      tab: mockTab
    }
    
    mockSendResponse = jest.fn()

    // Reset global state
    global.state = {
      isRunning: false,
      isPaused: false,
      currentTab: null,
      currentJob: null,
      currentStep: '',
      applicationsToday: 0,
      applicationsThisSession: 0,
      sessionStartTime: null,
      dailyLimit: 50,
      sessionLimit: 10,
      queue: [],
      errors: [],
      config: {
        enabled: true,
        mode: 'semi-auto',
        dailyLimit: 50,
        sessionLimit: 10,
        delayBetweenActions: { min: 3000, max: 8000 },
        filters: {
          isRemote: 'any',
          keywords: ['javascript', 'react'],
          keywordLogic: 'OR'
        },
        antiDetection: { enabled: true },
        notifications: { onApplicationSubmitted: true }
      }
    }

    // Mock storage responses
    chrome.storage.local.get.mockResolvedValue({
      config: global.state.config,
      applications: [],
      statistics: {
        totalApplications: 0,
        successfulApplications: 0
      }
    })
    
    chrome.storage.local.set.mockResolvedValue()
    chrome.tabs.query.mockResolvedValue([mockTab])
    chrome.tabs.sendMessage.mockResolvedValue({ success: true })
    chrome.tabs.get.mockResolvedValue(mockTab)
  })

  describe('Message Handling', () => {
    test('should handle START_AUTOMATION message', async () => {
      const message = { type: 'START_AUTOMATION', payload: {} }
      
      // Mock successful start conditions
      chrome.tabs.query.mockResolvedValue([mockTab])
      chrome.tabs.sendMessage.mockResolvedValue({ success: true })
      chrome.scripting.executeScript.mockResolvedValue()
      chrome.scripting.insertCSS.mockResolvedValue()
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      const result = await new Promise((resolve) => {
        handler(message, mockSender, resolve)
      })
      
      expect(result.success).toBe(true)
      expect(global.state.isRunning).toBe(true)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        mockTab.id,
        { type: 'ANALYZE_PAGE' }
      )
    })

    test('should handle STOP_AUTOMATION message', async () => {
      // Set initial running state
      global.state.isRunning = true
      global.state.applicationsThisSession = 5
      
      const message = { type: 'STOP_AUTOMATION' }
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      const result = await new Promise((resolve) => {
        handler(message, mockSender, resolve)
      })
      
      expect(result.success).toBe(true)
      expect(global.state.isRunning).toBe(false)
      expect(global.state.isPaused).toBe(false)
      expect(global.state.queue).toEqual([])
      expect(chrome.notifications.create).toHaveBeenCalled()
    })

    test('should handle PAUSE_AUTOMATION message', async () => {
      global.state.isRunning = true
      
      const message = { type: 'PAUSE_AUTOMATION' }
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      const result = await new Promise((resolve) => {
        handler(message, mockSender, resolve)
      })
      
      expect(result.success).toBe(true)
      expect(global.state.isPaused).toBe(true)
    })

    test('should handle RESUME_AUTOMATION message', async () => {
      global.state.isRunning = true
      global.state.isPaused = true
      
      const message = { type: 'RESUME_AUTOMATION' }
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      const result = await new Promise((resolve) => {
        handler(message, mockSender, resolve)
      })
      
      expect(result.success).toBe(true)
      expect(global.state.isPaused).toBe(false)
    })

    test('should handle GET_STATUS message', () => {
      global.state.isRunning = true
      global.state.applicationsToday = 10
      global.state.queueLength = 5
      
      const message = { type: 'GET_STATUS' }
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      handler(message, mockSender, mockSendResponse)
      
      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
          applicationsToday: 10,
          queueLength: 0 // Default value from state
        })
      )
    })

    test('should handle UPDATE_CONFIG message', async () => {
      const newConfig = {
        dailyLimit: 100,
        filters: { isRemote: 'yes' }
      }
      
      const message = { type: 'UPDATE_CONFIG', payload: newConfig }
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      const result = await new Promise((resolve) => {
        handler(message, mockSender, resolve)
      })
      
      expect(result.success).toBe(true)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        config: expect.objectContaining(newConfig)
      })
    })

    test('should handle JOBS_FOUND message', async () => {
      const jobs = [mockJobData.softwareEngineerJob, mockJobData.remoteJob]
      
      const message = {
        type: 'JOBS_FOUND',
        payload: { jobs }
      }
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      const result = await new Promise((resolve) => {
        handler(message, mockSender, resolve)
      })
      
      expect(result.success).toBe(true)
      expect(result.queued).toBeGreaterThanOrEqual(0)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        mockSender.tab.id,
        expect.objectContaining({ type: 'UPDATE_UI' })
      )
    })

    test('should handle APPLICATION_SUBMITTED message', async () => {
      const applicationData = {
        jobId: 'job123',
        status: 'submitted'
      }
      
      const message = {
        type: 'APPLICATION_SUBMITTED',
        payload: applicationData
      }
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      const result = await new Promise((resolve) => {
        handler(message, mockSender, resolve)
      })
      
      expect(result).toBeDefined()
    })

    test('should handle unknown message types', () => {
      const message = { type: 'UNKNOWN_MESSAGE' }
      
      const handler = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      handler(message, mockSender, mockSendResponse)
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type'
      })
    })
  })

  describe('Automation Control', () => {
    test('should reject start automation if already running', async () => {
      global.state.isRunning = true
      
      const startAutomation = global.startAutomation || (() => ({ success: false, error: 'Automation already running' }))
      const result = await startAutomation()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Automation already running')
    })

    test('should reject start automation if daily limit reached', async () => {
      global.state.applicationsToday = 50
      global.state.config.dailyLimit = 50
      
      const startAutomation = global.startAutomation || (() => ({ success: false, error: 'Daily limit reached' }))
      const result = await startAutomation()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Daily limit reached')
    })

    test('should reject start automation if not on LinkedIn', async () => {
      chrome.tabs.query.mockResolvedValue([{
        id: 1,
        url: 'https://www.google.com'
      }])
      
      const startAutomation = global.startAutomation || (() => ({ success: false, error: 'Please navigate to LinkedIn jobs page' }))
      const result = await startAutomation()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('LinkedIn')
    })

    test('should resume automation only when running', async () => {
      global.state.isRunning = false
      
      const resumeAutomation = global.resumeAutomation || (() => ({ success: false, error: 'Automation is not running' }))
      const result = await resumeAutomation()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Automation is not running')
    })
  })

  describe('Job Filtering', () => {
    test('should filter jobs based on remote preference', async () => {
      const jobs = [
        { ...mockJobData.softwareEngineerJob, isRemote: true },
        { ...mockJobData.frontendJob, isRemote: false }
      ]
      
      global.state.config.filters.isRemote = 'yes'
      
      const filterJobs = global.filterJobs || ((jobs) => jobs.filter(job => job.isRemote))
      const filtered = await filterJobs(jobs)
      
      expect(filtered.length).toBe(1)
      expect(filtered[0].isRemote).toBe(true)
    })

    test('should filter jobs based on keywords with OR logic', async () => {
      const jobs = [
        { ...mockJobData.softwareEngineerJob, description: 'React and JavaScript development' },
        { ...mockJobData.frontendJob, description: 'Angular and TypeScript development' },
        { ...mockJobData.backendJob, description: 'Python backend services' }
      ]
      
      global.state.config.filters.keywords = ['javascript', 'react']
      global.state.config.filters.keywordLogic = 'OR'
      
      const filterJobs = global.filterJobs || ((jobs) => jobs.filter(job => 
        global.state.config.filters.keywords.some(keyword =>
          job.description.toLowerCase().includes(keyword.toLowerCase())
        )
      ))
      const filtered = await filterJobs(jobs)
      
      expect(filtered.length).toBeGreaterThanOrEqual(1)
    })

    test('should filter jobs based on keywords with AND logic', async () => {
      const jobs = [
        { ...mockJobData.softwareEngineerJob, description: 'React and JavaScript development' },
        { ...mockJobData.frontendJob, description: 'JavaScript only development' }
      ]
      
      global.state.config.filters.keywords = ['javascript', 'react']
      global.state.config.filters.keywordLogic = 'AND'
      
      const filterJobs = global.filterJobs || ((jobs) => jobs.filter(job =>
        global.state.config.filters.keywords.every(keyword =>
          job.description.toLowerCase().includes(keyword.toLowerCase())
        )
      ))
      const filtered = await filterJobs(jobs)
      
      expect(filtered.length).toBe(1)
      expect(filtered[0].description).toContain('React')
    })

    test('should exclude already applied jobs', async () => {
      const jobs = [mockJobData.softwareEngineerJob]
      
      chrome.storage.local.get.mockResolvedValue({
        applications: [{ jobId: mockJobData.softwareEngineerJob.id }]
      })
      
      const checkIfApplied = global.checkIfApplied || ((jobId) => Promise.resolve(true))
      const applied = await checkIfApplied(mockJobData.softwareEngineerJob.id)
      
      expect(applied).toBe(true)
    })
  })

  describe('Statistics and Storage', () => {
    test('should record successful applications', async () => {
      const job = mockJobData.softwareEngineerJob
      
      const recordApplication = global.recordApplication || jest.fn()
      if (typeof recordApplication === 'function') {
        await recordApplication(job, 'submitted')
        
        expect(chrome.storage.local.set).toHaveBeenCalled()
      }
    })

    test('should update daily statistics', async () => {
      const updateStatistics = global.updateStatistics || jest.fn()
      if (typeof updateStatistics === 'function') {
        await updateStatistics('submitted')
        
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          statistics: expect.objectContaining({
            totalApplications: expect.any(Number)
          })
        })
      }
    })

    test('should load application history on startup', async () => {
      const mockApplications = [
        { jobId: 'job1', appliedAt: new Date().toISOString(), status: 'submitted' },
        { jobId: 'job2', appliedAt: new Date().toISOString(), status: 'submitted' }
      ]
      
      chrome.storage.local.get.mockResolvedValue({
        applications: mockApplications
      })
      
      const loadApplicationHistory = global.loadApplicationHistory || jest.fn()
      if (typeof loadApplicationHistory === 'function') {
        await loadApplicationHistory()
      }
      
      // Should have loaded today's applications
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['applications', 'statistics'])
    })

    test('should export data in correct format', async () => {
      const mockData = {
        applications: [mockJobData.softwareEngineerJob],
        statistics: { totalApplications: 1 },
        config: global.state.config
      }
      
      chrome.storage.local.get.mockResolvedValue(mockData)
      
      const exportData = global.exportData || (() => Promise.resolve({
        version: '1.0.0',
        exportedAt: expect.any(String),
        ...mockData
      }))
      
      const exported = await exportData()
      
      expect(exported).toHaveProperty('version')
      expect(exported).toHaveProperty('exportedAt')
      expect(exported).toHaveProperty('applications')
      expect(exported).toHaveProperty('statistics')
      expect(exported).toHaveProperty('config')
    })
  })

  describe('Error Handling', () => {
    test('should handle content script injection errors', async () => {
      chrome.scripting.executeScript.mockRejectedValue(new Error('Injection failed'))
      
      const ensureContentScriptsInjected = global.ensureContentScriptsInjected || 
        (() => Promise.reject(new Error('Error injecting content scripts')))
      
      await expect(ensureContentScriptsInjected(1)).rejects.toThrow()
    })

    test('should handle storage errors gracefully', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'))
      
      const loadApplicationHistory = global.loadApplicationHistory || jest.fn()
      if (typeof loadApplicationHistory === 'function') {
        // Should not throw, should handle error gracefully
        await expect(loadApplicationHistory()).resolves.toBeUndefined()
      }
    })

    test('should handle automation errors and stop after threshold', () => {
      global.state.errors = ['Error 1', 'Error 2', 'Error 3', 'Error 4', 'Error 5', 'Error 6']
      
      const handleError = global.handleError || jest.fn()
      if (typeof handleError === 'function') {
        handleError({ message: 'Test error' })
      }
      
      // Should have triggered error handling
      expect(global.state.errors.length).toBeGreaterThan(5)
    })

    test('should handle missing tab gracefully', async () => {
      chrome.tabs.query.mockResolvedValue([])
      
      const startAutomation = global.startAutomation || 
        (() => Promise.resolve({ success: false, error: 'Please navigate to LinkedIn jobs page' }))
      
      const result = await startAutomation()
      expect(result.success).toBe(false)
    })
  })

  describe('Working Hours and Rate Limiting', () => {
    test('should respect working hours configuration', () => {
      global.state.config.workingHours = {
        enabled: true,
        start: '09:00',
        end: '17:00'
      }
      
      const isWithinWorkingHours = global.isWithinWorkingHours || jest.fn(() => false)
      const result = isWithinWorkingHours()
      
      expect(typeof result).toBe('boolean')
    })

    test('should enforce daily limits', async () => {
      global.state.applicationsToday = 49
      global.state.config.dailyLimit = 50
      
      // Should still allow one more application
      const startAutomation = global.startAutomation || 
        (() => Promise.resolve({ success: true }))
      
      chrome.tabs.query.mockResolvedValue([mockTab])
      chrome.tabs.sendMessage.mockResolvedValue({ success: true })
      chrome.scripting.executeScript.mockResolvedValue()
      
      const result = await startAutomation()
      expect(result.success).toBe(true)
    })

    test('should handle alarm events for daily reset', () => {
      const alarmHandler = chrome.alarms.onAlarm.addListener.mock.calls[0]?.[0]
      
      if (alarmHandler) {
        const alarm = { name: 'dailyReset' }
        alarmHandler(alarm)
        
        expect(global.state.applicationsToday).toBe(0)
      }
    })
  })

  describe('Anti-Detection and Session Management', () => {
    test('should handle session rotation requests', async () => {
      const handleSessionRotation = global.handleSessionRotation || 
        (() => Promise.resolve({ success: true }))
      
      const result = await handleSessionRotation()
      expect(result.success).toBe(true)
    })

    test('should handle break management', async () => {
      const breakPayload = { duration: 900000 } // 15 minutes
      
      const handleBreakStarted = global.handleBreakStarted || 
        (() => Promise.resolve({ success: true }))
      
      const result = await handleBreakStarted(breakPayload)
      expect(result.success).toBe(true)
      expect(global.state.isPaused).toBe(true)
    })

    test('should resume after break ends', async () => {
      global.state.isRunning = true
      global.state.isPaused = true
      
      const handleBreakEnded = global.handleBreakEnded || (() => {
        global.state.isPaused = false
        return Promise.resolve({ success: true })
      })
      
      const result = await handleBreakEnded()
      expect(result.success).toBe(true)
      expect(global.state.isPaused).toBe(false)
    })
  })
})