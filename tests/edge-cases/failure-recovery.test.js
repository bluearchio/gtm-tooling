/**
 * Edge Cases and Failure Recovery Tests
 * Tests for handling errors, edge cases, and recovery scenarios
 */

import fs from 'fs'
import path from 'path'

describe('Edge Cases and Failure Recovery', () => {
  let mockChrome
  
  beforeEach(() => {
    // Set up Chrome API mocks
    mockChrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: { addListener: jest.fn() },
        lastError: null
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        update: jest.fn(),
        get: jest.fn()
      },
      notifications: {
        create: jest.fn()
      }
    }
    
    global.chrome = mockChrome
    document.body.innerHTML = ''
  })

  describe('Network Failures', () => {
    test('should handle LinkedIn being unavailable', async () => {
      // Simulate network error
      mockChrome.tabs.query.mockRejectedValue(new Error('ERR_NETWORK_CHANGED'))
      
      const handleNetworkError = async () => {
        try {
          const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/*' })
          return { success: true, tabs }
        } catch (error) {
          console.error('Network error:', error.message)
          return {
            success: false,
            error: 'Network connection lost. Please check your internet connection.',
            recoverable: true
          }
        }
      }
      
      const result = await handleNetworkError()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Network connection')
      expect(result.recoverable).toBe(true)
    })

    test('should handle LinkedIn rate limiting (429)', async () => {
      const response = {
        status: 429,
        headers: { 'Retry-After': '300' }
      }
      
      const handleRateLimit = (response) => {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers['Retry-After']) || 300
          return {
            success: false,
            error: 'LinkedIn rate limit reached',
            retryAfter,
            action: 'pause',
            message: `Please wait ${Math.ceil(retryAfter / 60)} minutes before continuing`
          }
        }
        return { success: true }
      }
      
      const result = handleRateLimit(response)
      
      expect(result.success).toBe(false)
      expect(result.retryAfter).toBe(300)
      expect(result.action).toBe('pause')
    })

    test('should handle session expiration', async () => {
      // Simulate session expired response
      document.body.innerHTML = `
        <div class="session-expired">
          <h1>Your session has expired</h1>
          <a href="/login">Sign in</a>
        </div>
      `
      
      const checkSession = () => {
        const sessionExpired = document.querySelector('.session-expired')
        const loginRequired = document.querySelector('a[href*="/login"]')
        
        if (sessionExpired || loginRequired) {
          return {
            success: false,
            error: 'Session expired',
            action: 'login_required',
            message: 'Please log in to LinkedIn to continue'
          }
        }
        return { success: true, sessionValid: true }
      }
      
      const result = checkSession()
      
      expect(result.success).toBe(false)
      expect(result.action).toBe('login_required')
    })
  })

  describe('DOM Structure Changes', () => {
    test('should handle missing job elements gracefully', () => {
      // Job card with missing elements
      const jobCard = document.createElement('li')
      jobCard.setAttribute('data-job-id', 'test-job')
      // No title, company, or location elements
      
      const extractJob = (card) => {
        try {
          const job = {
            id: card.getAttribute('data-job-id') || 'unknown',
            title: card.querySelector('.job-title')?.textContent?.trim() || 'Unknown Position',
            company: card.querySelector('.company')?.textContent?.trim() || 'Unknown Company',
            location: card.querySelector('.location')?.textContent?.trim() || 'Unknown Location',
            isValid: false
          }
          
          // Validate required fields
          job.isValid = !!(job.id !== 'unknown' && job.title !== 'Unknown Position')
          
          return job
        } catch (error) {
          console.error('Error extracting job:', error)
          return null
        }
      }
      
      const job = extractJob(jobCard)
      
      expect(job).toBeTruthy()
      expect(job.title).toBe('Unknown Position')
      expect(job.company).toBe('Unknown Company')
      expect(job.isValid).toBe(false)
    })

    test('should handle unexpected page layouts', () => {
      // Non-standard page structure
      document.body.innerHTML = `
        <div class="new-layout-2024">
          <section data-jobs-container>
            <article data-job="123">Job 1</article>
            <article data-job="456">Job 2</article>
          </section>
        </div>
      `
      
      const findJobs = () => {
        // Try multiple selector strategies
        const selectors = [
          '[data-job-id]',
          '[data-occludable-job-id]',
          '[data-job]',
          'article[data-job]',
          '.job-card',
          '[class*="job-card"]'
        ]
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            console.log(`Found jobs using fallback selector: ${selector}`)
            return Array.from(elements)
          }
        }
        
        console.warn('No jobs found with any known selector')
        return []
      }
      
      const jobs = findJobs()
      
      expect(jobs.length).toBe(2)
      expect(jobs[0].getAttribute('data-job')).toBe('123')
    })

    test('should handle dynamic content loading failures', async () => {
      let attempts = 0
      const maxAttempts = 3
      
      const waitForContent = async (selector, timeout = 5000) => {
        const startTime = Date.now()
        
        while (Date.now() - startTime < timeout && attempts < maxAttempts) {
          attempts++
          
          const element = document.querySelector(selector)
          if (element) {
            return { success: true, element, attempts }
          }
          
          // Simulate checking
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        return {
          success: false,
          error: `Element ${selector} not found after ${attempts} attempts`,
          attempts,
          timeout
        }
      }
      
      const result = await waitForContent('.non-existent', 500)
      
      expect(result.success).toBe(false)
      expect(result.attempts).toBeLessThanOrEqual(maxAttempts)
      expect(result.error).toContain('not found')
    })
  })

  describe('Form Submission Errors', () => {
    test('should handle validation errors', () => {
      document.body.innerHTML = `
        <form class="application-form">
          <input name="email" type="email" required>
          <span class="error">Please enter a valid email</span>
          <input name="phone" type="tel" required>
          <span class="error">Phone number is required</span>
          <button type="submit" disabled>Submit</button>
        </form>
      `
      
      const getFormErrors = () => {
        const errors = []
        const errorElements = document.querySelectorAll('.error')
        
        errorElements.forEach(error => {
          if (error.textContent && error.offsetParent !== null) {
            errors.push(error.textContent.trim())
          }
        })
        
        const submitButton = document.querySelector('button[type="submit"]')
        const formValid = submitButton && !submitButton.disabled
        
        return {
          hasErrors: errors.length > 0,
          errors,
          canSubmit: formValid
        }
      }
      
      const result = getFormErrors()
      
      expect(result.hasErrors).toBe(true)
      expect(result.errors).toContain('Please enter a valid email')
      expect(result.errors).toContain('Phone number is required')
      expect(result.canSubmit).toBe(false)
    })

    test('should handle CAPTCHA challenges', () => {
      document.body.innerHTML = `
        <div class="captcha-container">
          <div class="g-recaptcha" data-sitekey="test-key"></div>
          <p>Please complete the CAPTCHA to continue</p>
        </div>
      `
      
      const detectCaptcha = () => {
        const captchaElements = [
          '.g-recaptcha',
          '.h-captcha',
          '#captcha',
          '[class*="captcha"]',
          'iframe[src*="recaptcha"]'
        ]
        
        for (const selector of captchaElements) {
          if (document.querySelector(selector)) {
            return {
              hasCaptcha: true,
              type: selector.includes('recaptcha') ? 'recaptcha' : 'other',
              action: 'manual_intervention',
              message: 'CAPTCHA detected. Please complete it manually.'
            }
          }
        }
        
        return { hasCaptcha: false }
      }
      
      const result = detectCaptcha()
      
      expect(result.hasCaptcha).toBe(true)
      expect(result.type).toBe('recaptcha')
      expect(result.action).toBe('manual_intervention')
    })

    test('should handle duplicate application detection', () => {
      document.body.innerHTML = `
        <div class="application-status">
          <p>You have already applied to this position</p>
          <span class="applied-date">Applied on Dec 1, 2024</span>
        </div>
      `
      
      const checkApplicationStatus = () => {
        const alreadyAppliedIndicators = [
          'You have already applied',
          'Application submitted',
          'Applied on',
          'You applied'
        ]
        
        const pageText = document.body.textContent.toLowerCase()
        
        for (const indicator of alreadyAppliedIndicators) {
          if (pageText.includes(indicator.toLowerCase())) {
            const dateMatch = pageText.match(/applied on ([^,]+)/i)
            return {
              alreadyApplied: true,
              appliedDate: dateMatch ? dateMatch[1] : 'Unknown',
              action: 'skip',
              reason: 'Already applied to this position'
            }
          }
        }
        
        return { alreadyApplied: false }
      }
      
      const result = checkApplicationStatus()
      
      expect(result.alreadyApplied).toBe(true)
      expect(result.action).toBe('skip')
      expect(result.reason).toContain('Already applied')
    })
  })

  describe('Storage Errors', () => {
    test('should handle storage quota exceeded', async () => {
      mockChrome.storage.local.set.mockRejectedValue(
        new Error('QUOTA_BYTES_EXCEEDED')
      )
      
      const saveData = async (data) => {
        try {
          await chrome.storage.local.set(data)
          return { success: true }
        } catch (error) {
          if (error.message.includes('QUOTA')) {
            // Try to clean old data
            const cleaned = await cleanOldData()
            if (cleaned) {
              // Retry save
              try {
                await chrome.storage.local.set(data)
                return { success: true, cleaned: true }
              } catch (retryError) {
                return {
                  success: false,
                  error: 'Storage full even after cleanup',
                  action: 'manual_cleanup'
                }
              }
            }
          }
          return { success: false, error: error.message }
        }
      }
      
      const cleanOldData = async () => {
        // Mock cleanup
        return true
      }
      
      const result = await saveData({ test: 'data' })
      
      expect(result.success).toBe(true)
      expect(result.cleaned).toBe(true)
    })

    test('should handle corrupted storage data', async () => {
      // Mock corrupted data
      mockChrome.storage.local.get.mockResolvedValue({
        config: '{"invalid json'
      })
      
      const loadConfig = async () => {
        try {
          const stored = await chrome.storage.local.get('config')
          
          if (typeof stored.config === 'string') {
            try {
              return JSON.parse(stored.config)
            } catch (parseError) {
              console.error('Corrupted config data:', parseError)
              // Return default config
              return getDefaultConfig()
            }
          }
          
          return stored.config || getDefaultConfig()
        } catch (error) {
          console.error('Storage error:', error)
          return getDefaultConfig()
        }
      }
      
      const getDefaultConfig = () => ({
        enabled: true,
        filters: {},
        limits: { daily: 50 }
      })
      
      const config = await loadConfig()
      
      expect(config).toEqual(getDefaultConfig())
      expect(config.enabled).toBe(true)
    })
  })

  describe('Chrome API Errors', () => {
    test('should handle permission denied errors', async () => {
      mockChrome.tabs.query.mockRejectedValue(
        new Error('Permission denied for tabs')
      )
      
      const checkPermissions = async () => {
        try {
          await chrome.tabs.query({})
          return { hasPermission: true }
        } catch (error) {
          if (error.message.includes('Permission')) {
            return {
              hasPermission: false,
              error: 'Missing required permissions',
              action: 'request_permissions',
              permissions: ['tabs', 'storage', 'notifications']
            }
          }
          throw error
        }
      }
      
      const result = await checkPermissions()
      
      expect(result.hasPermission).toBe(false)
      expect(result.action).toBe('request_permissions')
      expect(result.permissions).toContain('tabs')
    })

    test('should handle chrome.runtime.lastError', () => {
      mockChrome.runtime.lastError = {
        message: 'The message port closed before a response was received.'
      }
      
      const handleChromeError = () => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError.message
          
          // Common errors and their handling
          if (error.includes('message port closed')) {
            return {
              success: false,
              error: 'Extension context invalidated',
              action: 'reload_extension',
              recoverable: true
            }
          }
          
          if (error.includes('Cannot access')) {
            return {
              success: false,
              error: 'Access denied',
              action: 'check_permissions',
              recoverable: false
            }
          }
          
          return {
            success: false,
            error: error,
            action: 'unknown',
            recoverable: false
          }
        }
        
        return { success: true }
      }
      
      const result = handleChromeError()
      
      expect(result.success).toBe(false)
      expect(result.action).toBe('reload_extension')
      expect(result.recoverable).toBe(true)
    })

    test('should handle extension context invalidated', async () => {
      let isContextValid = true
      
      const executeWithContextCheck = async (operation) => {
        try {
          // Check if context is valid
          if (!chrome.runtime?.id) {
            isContextValid = false
          }
          
          if (!isContextValid) {
            return {
              success: false,
              error: 'Extension context invalidated',
              action: 'reload_required',
              message: 'Please reload the extension'
            }
          }
          
          return await operation()
        } catch (error) {
          if (error.message.includes('Extension context invalidated')) {
            isContextValid = false
            return {
              success: false,
              error: 'Context lost during operation',
              action: 'reload_required'
            }
          }
          throw error
        }
      }
      
      // Simulate context invalidation
      isContextValid = false
      
      const result = await executeWithContextCheck(async () => {
        return { data: 'test' }
      })
      
      expect(result.success).toBe(false)
      expect(result.action).toBe('reload_required')
    })
  })

  describe('Recovery Strategies', () => {
    test('should implement exponential backoff for retries', async () => {
      let attemptCount = 0
      const delays = []
      
      const retryWithBackoff = async (operation, maxAttempts = 3) => {
        let lastError
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            attemptCount++
            const result = await operation()
            return { success: true, result, attempts: attemptCount }
          } catch (error) {
            lastError = error
            
            if (attempt < maxAttempts - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
              delays.push(delay)
              await new Promise(resolve => setTimeout(resolve, delay))
            }
          }
        }
        
        return {
          success: false,
          error: lastError.message,
          attempts: attemptCount,
          delays
        }
      }
      
      // Operation that fails twice then succeeds
      let failCount = 0
      const operation = async () => {
        if (failCount < 2) {
          failCount++
          throw new Error('Temporary failure')
        }
        return 'Success'
      }
      
      const result = await retryWithBackoff(operation)
      
      expect(result.success).toBe(true)
      expect(result.attempts).toBe(3)
      expect(delays[0]).toBe(1000) // First retry: 1 second
      expect(delays[1]).toBe(2000) // Second retry: 2 seconds
    })

    test('should gracefully degrade functionality', () => {
      const features = {
        autoApply: true,
        smartFiltering: true,
        advancedAnalytics: true,
        aiSuggestions: true
      }
      
      const errors = {
        aiService: 'AI service unavailable',
        analytics: 'Analytics module failed'
      }
      
      const degradeFeatures = (features, errors) => {
        const degraded = { ...features }
        const disabled = []
        
        if (errors.aiService) {
          degraded.aiSuggestions = false
          degraded.smartFiltering = false // Fallback to basic filtering
          disabled.push('AI suggestions', 'Smart filtering')
        }
        
        if (errors.analytics) {
          degraded.advancedAnalytics = false
          disabled.push('Advanced analytics')
        }
        
        return {
          features: degraded,
          disabled,
          mode: disabled.length > 0 ? 'degraded' : 'full',
          message: disabled.length > 0 
            ? `Running with reduced functionality: ${disabled.join(', ')} disabled`
            : 'All features operational'
        }
      }
      
      const result = degradeFeatures(features, errors)
      
      expect(result.features.autoApply).toBe(true) // Core feature still works
      expect(result.features.aiSuggestions).toBe(false)
      expect(result.features.smartFiltering).toBe(false)
      expect(result.mode).toBe('degraded')
      expect(result.disabled).toContain('AI suggestions')
    })

    test('should maintain operation queue during failures', () => {
      const queue = []
      const failed = []
      const maxQueueSize = 100
      
      const queueOperation = (operation) => {
        if (queue.length >= maxQueueSize) {
          // Remove oldest non-critical operations
          const removed = queue.shift()
          console.log('Queue full, removed:', removed.id)
        }
        
        queue.push({
          id: Date.now(),
          operation,
          retries: 0,
          maxRetries: 3,
          priority: operation.priority || 'normal'
        })
      }
      
      const processQueue = () => {
        const sortedQueue = queue.sort((a, b) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        })
        
        while (sortedQueue.length > 0) {
          const item = sortedQueue.shift()
          
          try {
            // Simulate processing
            if (Math.random() > 0.7) {
              throw new Error('Processing failed')
            }
            
            console.log('Processed:', item.id)
          } catch (error) {
            item.retries++
            
            if (item.retries < item.maxRetries) {
              // Re-queue for retry
              sortedQueue.push(item)
            } else {
              // Move to failed queue
              failed.push({
                ...item,
                error: error.message,
                failedAt: Date.now()
              })
            }
          }
        }
        
        return {
          processed: maxQueueSize - queue.length - failed.length,
          queued: queue.length,
          failed: failed.length
        }
      }
      
      // Add operations
      for (let i = 0; i < 10; i++) {
        queueOperation({
          type: 'apply',
          priority: i % 3 === 0 ? 'high' : 'normal'
        })
      }
      
      const result = processQueue()
      
      expect(result.processed + result.queued + result.failed).toBe(10)
    })
  })
})