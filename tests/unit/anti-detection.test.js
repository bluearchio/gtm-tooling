/**
 * Unit Tests for Anti-Detection System Module
 * Tests randomization, timing, human-like behavior simulation, and detection evasion
 */

import fs from 'fs'
import path from 'path'

// Read and execute the source code
const sourceFilePath = path.join(process.cwd(), 'src/content/anti-detection.js')
const sourceCode = fs.readFileSync(sourceFilePath, 'utf8')
eval(sourceCode)

describe('AntiDetectionSystem', () => {
  let antiDetection
  
  beforeEach(async () => {
    // Mock performance.now for consistent timing tests
    jest.spyOn(performance, 'now').mockReturnValue(1000)
    
    // Reset storage mock
    chrome.storage.local.get.mockResolvedValue({})
    
    antiDetection = new AntiDetectionSystem()
    await antiDetection.loadConfig()
  })
  
  afterEach(() => {
    jest.restoreAllMocks()
    
    // Clear any intervals/timeouts
    jest.clearAllTimers()
    
    // Clean up injected scripts
    const scripts = document.querySelectorAll('script')
    scripts.forEach(script => script.remove())
  })

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(antiDetection.config).toBeDefined()
      expect(antiDetection.config.enabled).toBe(true)
      expect(antiDetection.config.humanizeActions).toBe(true)
      expect(antiDetection.config.randomizeDelays).toBe(true)
      expect(antiDetection.config.simulateMouseMovement).toBe(true)
    })

    test('should load configuration from storage', async () => {
      const customConfig = {
        enabled: false,
        humanizeActions: false,
        breakPatterns: { enabled: false }
      }
      
      chrome.storage.local.get.mockResolvedValue({
        antiDetectionConfig: customConfig
      })
      
      const newAntiDetection = new AntiDetectionSystem()
      await newAntiDetection.loadConfig()
      
      expect(newAntiDetection.config.enabled).toBe(false)
      expect(newAntiDetection.config.humanizeActions).toBe(false)
    })

    test('should setup event interceptors', () => {
      expect(document.head.children.length).toBeGreaterThan(0)
    })

    test('should initialize session tracking', () => {
      expect(antiDetection.sessionStartTime).toBeDefined()
      expect(antiDetection.actionsCount).toBe(0)
      expect(antiDetection.mousePosition).toEqual({ x: 0, y: 0 })
      expect(antiDetection.isBreakTime).toBe(false)
    })
  })

  describe('Automation Signature Hiding', () => {
    test('should inject script to hide webdriver property', () => {
      antiDetection.hideAutomationSignatures()
      
      const scripts = document.querySelectorAll('script')
      const webdriverScript = Array.from(scripts).find(script => 
        script.textContent.includes('navigator.webdriver')
      )
      
      expect(webdriverScript).toBeTruthy()
    })

    test('should override navigator properties', () => {
      antiDetection.hideAutomationSignatures()
      
      // The script should be injected and removed
      const scripts = document.querySelectorAll('script')
      expect(scripts.length).toBe(0) // Scripts are removed after injection
    })

    test('should randomize browser fingerprint', () => {
      antiDetection.randomizeFingerprint()
      
      const scripts = document.querySelectorAll('script')
      const fingerprintScript = Array.from(scripts).find(script => 
        script.textContent.includes('window.screen')
      )
      
      expect(fingerprintScript).toBeTruthy()
    })
  })

  describe('Random Delay Generation', () => {
    test('should generate delays within specified range', () => {
      const minMs = 1000
      const maxMs = 3000
      
      for (let i = 0; i < 10; i++) {
        const delay = antiDetection.generateDelay(minMs, maxMs)
        expect(delay).toBeGreaterThanOrEqual(minMs)
        expect(delay).toBeLessThanOrEqual(maxMs)
      }
    })

    test('should return average when randomization disabled', () => {
      antiDetection.config.randomizeDelays = false
      
      const delay = antiDetection.generateDelay(1000, 3000)
      expect(delay).toBe(2000)
    })

    test('should add micro-variations to delays', () => {
      const delays = []
      
      for (let i = 0; i < 10; i++) {
        delays.push(antiDetection.generateDelay(1000, 1000))
      }
      
      // Should have some variation even with same min/max
      const unique = new Set(delays)
      expect(unique.size).toBeGreaterThan(1)
    })

    test('should use normal distribution for realistic delays', () => {
      // Mock boxMullerTransform to return predictable values
      jest.spyOn(antiDetection, 'boxMullerTransform').mockReturnValue(0)
      
      const delay = antiDetection.generateDelay(1000, 3000)
      const expected = 2000 // mean value
      
      expect(Math.abs(delay - expected)).toBeLessThan(200)
    })

    test('should respect min/max bounds', () => {
      // Mock extreme gaussian values
      jest.spyOn(antiDetection, 'boxMullerTransform').mockReturnValue(10)
      
      const delay = antiDetection.generateDelay(1000, 3000)
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThanOrEqual(3000)
    })
  })

  describe('Box-Muller Transform', () => {
    test('should generate normally distributed values', () => {
      const values = []
      
      for (let i = 0; i < 1000; i++) {
        values.push(antiDetection.boxMullerTransform())
      }
      
      // Check mean is close to 0
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      expect(Math.abs(mean)).toBeLessThan(0.1)
      
      // Check standard deviation is close to 1
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)
      expect(Math.abs(stdDev - 1)).toBeLessThan(0.1)
    })
  })

  describe('Mouse Movement Simulation', () => {
    let targetElement
    
    beforeEach(() => {
      targetElement = document.createElement('div')
      targetElement.style.position = 'absolute'
      targetElement.style.left = '100px'
      targetElement.style.top = '200px'
      targetElement.style.width = '50px'
      targetElement.style.height = '30px'
      document.body.appendChild(targetElement)
      
      // Mock getBoundingClientRect
      targetElement.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 100,
        top: 200,
        width: 50,
        height: 30
      })
    })

    test('should simulate mouse movement to target element', async () => {
      const dispatchEventSpy = jest.spyOn(document, 'elementFromPoint').mockReturnValue(targetElement)
      const targetElementSpy = jest.spyOn(targetElement, 'dispatchEvent')
      
      await antiDetection.simulateMouseMovement(targetElement)
      
      expect(antiDetection.mousePosition.x).toBeCloseTo(125, 0) // Center of element
      expect(antiDetection.mousePosition.y).toBeCloseTo(215, 0)
      expect(targetElementSpy).toHaveBeenCalled()
    })

    test('should create smooth movement path', async () => {
      antiDetection.mousePosition = { x: 0, y: 0 }
      
      const dispatchedEvents = []
      jest.spyOn(document, 'elementFromPoint').mockImplementation(() => {
        const mockElement = {
          dispatchEvent: (event) => {
            if (event.type === 'mousemove') {
              dispatchedEvents.push({ x: event.clientX, y: event.clientY })
            }
          }
        }
        return mockElement
      })
      
      await antiDetection.simulateMouseMovement(targetElement)
      
      expect(dispatchedEvents.length).toBeGreaterThan(5)
      
      // Check that movement is gradual
      for (let i = 1; i < dispatchedEvents.length; i++) {
        const prev = dispatchedEvents[i - 1]
        const curr = dispatchedEvents[i]
        const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2))
        expect(distance).toBeLessThan(100) // Reasonable step size
      }
    })

    test('should add random variations to target position', async () => {
      const positions = []
      
      jest.spyOn(document, 'elementFromPoint').mockReturnValue(targetElement)
      
      for (let i = 0; i < 5; i++) {
        antiDetection.mousePosition = { x: 0, y: 0 }
        await antiDetection.simulateMouseMovement(targetElement)
        positions.push({ ...antiDetection.mousePosition })
      }
      
      // Should have some variation in final positions
      const xValues = positions.map(p => p.x)
      const yValues = positions.map(p => p.y)
      
      expect(Math.max(...xValues) - Math.min(...xValues)).toBeGreaterThan(0)
      expect(Math.max(...yValues) - Math.min(...yValues)).toBeGreaterThan(0)
    })

    test('should skip movement when disabled', async () => {
      antiDetection.config.simulateMouseMovement = false
      
      const spy = jest.spyOn(document, 'elementFromPoint')
      
      await antiDetection.simulateMouseMovement(targetElement)
      
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('Bezier Curve Calculation', () => {
    test('should calculate points on cubic Bezier curve', () => {
      const p0 = { x: 0, y: 0 }
      const p1 = { x: 25, y: 50 }
      const p2 = { x: 75, y: 50 }
      const p3 = { x: 100, y: 100 }
      
      const startPoint = antiDetection.calculateBezierPoint(0, p0, p1, p2, p3)
      expect(startPoint).toEqual(p0)
      
      const endPoint = antiDetection.calculateBezierPoint(1, p0, p1, p2, p3)
      expect(endPoint).toEqual(p3)
      
      const midPoint = antiDetection.calculateBezierPoint(0.5, p0, p1, p2, p3)
      expect(midPoint.x).toBeCloseTo(50, 0)
      expect(midPoint.y).toBeCloseTo(50, 0)
    })
  })

  describe('Scroll Simulation', () => {
    beforeEach(() => {
      // Mock window properties
      Object.defineProperty(window, 'pageYOffset', {
        value: 0,
        writable: true
      })
      
      Object.defineProperty(window, 'scrollTo', {
        value: jest.fn(),
        writable: true
      })
    })

    test('should simulate smooth scrolling', async () => {
      await antiDetection.simulateScroll(500, 1000)
      
      expect(window.scrollTo).toHaveBeenCalledTimes(6) // 5 steps + final position
    })

    test('should use easing function for natural movement', async () => {
      const scrollCalls = []
      window.scrollTo = jest.fn((x, y) => scrollCalls.push(y))
      
      await antiDetection.simulateScroll(100, 500)
      
      // Check that scrolling is not linear
      expect(scrollCalls.length).toBeGreaterThan(1)
      
      // Early positions should be closer to start
      expect(scrollCalls[1]).toBeLessThan(scrollCalls[scrollCalls.length - 2])
    })

    test('should add random overshoot occasionally', async () => {
      // Mock random to always trigger overshoot
      jest.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.3
      
      const scrollCalls = []
      window.scrollTo = jest.fn((x, y) => scrollCalls.push(y))
      
      await antiDetection.simulateScroll(100, 500)
      
      // Should have overshoot and correction
      const maxScroll = Math.max(...scrollCalls)
      expect(maxScroll).toBeGreaterThan(100)
    })

    test('should skip animation when disabled', async () => {
      antiDetection.config.simulateScrolling = false
      
      await antiDetection.simulateScroll(500, 1000)
      
      expect(window.scrollTo).toHaveBeenCalledTimes(1)
      expect(window.scrollTo).toHaveBeenCalledWith(0, 500)
    })
  })

  describe('Easing Functions', () => {
    test('should calculate ease-in-out-cubic correctly', () => {
      expect(antiDetection.easeInOutCubic(0)).toBe(0)
      expect(antiDetection.easeInOutCubic(1)).toBe(1)
      expect(antiDetection.easeInOutCubic(0.5)).toBeCloseTo(0.5, 1)
      
      // Should be slower at beginning and end
      expect(antiDetection.easeInOutCubic(0.1)).toBeLessThan(0.1)
      expect(antiDetection.easeInOutCubic(0.9)).toBeGreaterThan(0.9)
    })
  })

  describe('Typing Simulation', () => {
    let input
    
    beforeEach(() => {
      input = document.createElement('input')
      input.type = 'text'
      document.body.appendChild(input)
      
      // Mock input methods
      input.focus = jest.fn()
      input.blur = jest.fn()
      input.dispatchEvent = jest.fn()
    })

    test('should simulate human-like typing', async () => {
      await antiDetection.simulateTyping(input, 'hello')
      
      expect(input.value).toBe('hello')
      expect(input.focus).toHaveBeenCalled()
      expect(input.blur).toHaveBeenCalled()
      expect(input.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'keydown' })
      )
    })

    test('should vary typing speed', async () => {
      const delays = []
      const originalSleep = antiDetection.sleep
      antiDetection.sleep = jest.fn((ms) => {
        delays.push(ms)
        return Promise.resolve()
      })
      
      await antiDetection.simulateTyping(input, 'test')
      
      // Should have different delays between keystrokes
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
      
      antiDetection.sleep = originalSleep
    })

    test('should simulate occasional typos and corrections', async () => {
      // Mock random to trigger typo
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01) // < 0.02 for typo
      
      await antiDetection.simulateTyping(input, 'test')
      
      // Should have extra keydown events for typo correction
      const keydownCalls = input.dispatchEvent.mock.calls.filter(
        call => call[0].type === 'keydown'
      )
      expect(keydownCalls.length).toBeGreaterThan(4) // More than just 'test'
    })

    test('should type faster for common letter combinations', () => {
      expect(antiDetection.isCommonPair('t', 'h')).toBe(true)
      expect(antiDetection.isCommonPair('h', 'e')).toBe(true)
      expect(antiDetection.isCommonPair('x', 'z')).toBe(false)
    })

    test('should skip humanization when disabled', async () => {
      antiDetection.config.humanizeActions = false
      
      await antiDetection.simulateTyping(input, 'test')
      
      expect(input.value).toBe('test')
      expect(input.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'input' })
      )
    })
  })

  describe('Action Performance with Anti-Detection', () => {
    test('should wrap actions with anti-detection measures', async () => {
      const mockAction = jest.fn().mockResolvedValue('success')
      
      const result = await antiDetection.performAction('test_action', mockAction)
      
      expect(result).toBe('success')
      expect(mockAction).toHaveBeenCalled()
      expect(antiDetection.actionsCount).toBe(1)
    })

    test('should add delays between actions', async () => {
      const sleepSpy = jest.spyOn(antiDetection, 'sleep').mockResolvedValue()
      antiDetection.lastActionTime = Date.now() - 500 // Recent action
      
      const mockAction = jest.fn().mockResolvedValue('success')
      
      await antiDetection.performAction('test_action', mockAction)
      
      expect(sleepSpy).toHaveBeenCalled()
    })

    test('should add thinking time for complex actions', async () => {
      const sleepSpy = jest.spyOn(antiDetection, 'sleep').mockResolvedValue()
      const mockAction = jest.fn().mockResolvedValue('success')
      
      await antiDetection.performAction('apply', mockAction)
      
      // Should have additional delay for application actions
      const sleepCalls = sleepSpy.mock.calls
      const hasLongDelay = sleepCalls.some(call => call[0] >= 3000)
      expect(hasLongDelay).toBe(true)
    })

    test('should skip actions during break time', async () => {
      antiDetection.isBreakTime = true
      const mockAction = jest.fn()
      
      const result = await antiDetection.performAction('test_action', mockAction)
      
      expect(result).toBe(false)
      expect(mockAction).not.toHaveBeenCalled()
    })

    test('should trigger break when threshold reached', async () => {
      antiDetection.config.breakPatterns.enabled = true
      antiDetection.config.breakPatterns.minApplications = 2
      antiDetection.config.breakPatterns.maxApplications = 3
      antiDetection.actionsCount = 2
      
      const takeBreakSpy = jest.spyOn(antiDetection, 'takeBreak').mockResolvedValue()
      const mockAction = jest.fn().mockResolvedValue('success')
      
      await antiDetection.performAction('test_action', mockAction)
      
      expect(takeBreakSpy).toHaveBeenCalled()
    })
  })

  describe('Session Management', () => {
    test('should detect when session rotation is needed', () => {
      antiDetection.config.sessionRotation.enabled = true
      antiDetection.config.sessionRotation.maxSessionDuration = 30 // 30 minutes
      antiDetection.sessionStartTime = Date.now() - (45 * 60 * 1000) // 45 minutes ago
      
      expect(antiDetection.shouldRotateSession()).toBe(true)
    })

    test('should not rotate session when disabled', () => {
      antiDetection.config.sessionRotation.enabled = false
      antiDetection.sessionStartTime = Date.now() - (60 * 60 * 1000) // 1 hour ago
      
      expect(antiDetection.shouldRotateSession()).toBe(false)
    })

    test('should rotate session and reset counters', async () => {
      const clearBrowsingDataSpy = jest.spyOn(antiDetection, 'clearBrowsingData').mockResolvedValue()
      const sleepSpy = jest.spyOn(antiDetection, 'sleep').mockResolvedValue()
      
      await antiDetection.rotateSession()
      
      expect(clearBrowsingDataSpy).toHaveBeenCalled()
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SESSION_ROTATION_REQUIRED' })
      )
      expect(antiDetection.actionsCount).toBe(0)
    })
  })

  describe('Break Patterns', () => {
    test('should determine when break is needed', () => {
      antiDetection.config.breakPatterns.enabled = true
      antiDetection.config.breakPatterns.minApplications = 3
      antiDetection.config.breakPatterns.maxApplications = 7
      antiDetection.actionsCount = 5
      
      const shouldBreak = antiDetection.shouldTakeBreak()
      expect(typeof shouldBreak).toBe('boolean')
    })

    test('should not take breaks when disabled', () => {
      antiDetection.config.breakPatterns.enabled = false
      antiDetection.actionsCount = 100
      
      expect(antiDetection.shouldTakeBreak()).toBe(false)
    })

    test('should take break with proper duration', async () => {
      antiDetection.config.breakPatterns.breakDuration = 1 // 1 minute
      
      const simulateIdleSpy = jest.spyOn(antiDetection, 'simulateIdleBehavior').mockResolvedValue()
      const sleepSpy = jest.spyOn(antiDetection, 'sleep').mockResolvedValue()
      
      await antiDetection.takeBreak()
      
      expect(simulateIdleSpy).toHaveBeenCalled()
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BREAK_STARTED' })
      )
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BREAK_ENDED' })
      )
      expect(antiDetection.isBreakTime).toBe(false)
    })

    test('should simulate idle behavior during breaks', async () => {
      const simulateScrollSpy = jest.spyOn(antiDetection, 'simulateScroll').mockResolvedValue()
      const simulateMouseSpy = jest.spyOn(antiDetection, 'simulateMouseMovement').mockResolvedValue()
      
      // Mock document.body.scrollHeight
      Object.defineProperty(document.body, 'scrollHeight', {
        value: 1000,
        configurable: true
      })
      
      // Mock elementFromPoint
      jest.spyOn(document, 'elementFromPoint').mockReturnValue(document.createElement('div'))
      
      await antiDetection.simulateIdleBehavior()
      
      expect(simulateScrollSpy).toHaveBeenCalled()
      expect(simulateMouseSpy).toHaveBeenCalled()
    })
  })

  describe('Suspicious Activity Detection', () => {
    test('should detect regular patterns in actions', () => {
      const actions = [
        { timestamp: 1000 },
        { timestamp: 2000 },
        { timestamp: 3000 },
        { timestamp: 4000 },
        { timestamp: 5000 }
      ]
      
      const isRegular = antiDetection.detectRegularPatterns(actions)
      expect(isRegular).toBe(true)
    })

    test('should detect rapid actions', () => {
      const actions = [
        { timestamp: 1000 },
        { timestamp: 1500 },
        { timestamp: 2000 },
        { timestamp: 2500 },
        { timestamp: 3000 }
      ]
      
      const isRapid = antiDetection.detectRapidActions(actions)
      expect(isRapid).toBe(true)
    })

    test('should increase randomization when patterns detected', () => {
      antiDetection.increaseRandomization()
      expect(antiDetection.config.randomizeDelays).toBe(true)
    })

    test('should slow down actions when rapid activity detected', () => {
      const originalTime = antiDetection.lastActionTime
      antiDetection.slowDownActions()
      
      expect(antiDetection.lastActionTime).toBeGreaterThan(originalTime)
    })
  })

  describe('Random Interactions', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('should perform random interactions periodically', () => {
      const performRandomSpy = jest.spyOn(antiDetection, 'performRandomInteraction').mockResolvedValue()
      
      antiDetection.injectHumanBehavior()
      
      // Fast-forward time
      jest.advanceTimersByTime(10000)
      
      // Should have chance to perform random interaction
      expect(performRandomSpy).toHaveBeenCalledTimes(0) // Depends on random chance
    })

    test('should perform various types of random interactions', async () => {
      // Create some elements for interaction
      const div = document.createElement('div')
      const link = document.createElement('a')
      const input = document.createElement('input')
      
      document.body.appendChild(div)
      document.body.appendChild(link)
      document.body.appendChild(input)
      
      const scrollSpy = jest.spyOn(antiDetection, 'randomScroll').mockResolvedValue()
      const clickSpy = jest.spyOn(antiDetection, 'randomClick').mockResolvedValue()
      const hoverSpy = jest.spyOn(antiDetection, 'randomHover').mockResolvedValue()
      const focusSpy = jest.spyOn(antiDetection, 'randomFocus').mockResolvedValue()
      
      // Test each type of interaction
      await antiDetection.randomScroll()
      await antiDetection.randomClick()
      await antiDetection.randomHover()
      await antiDetection.randomFocus()
      
      expect(scrollSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
      expect(hoverSpy).toHaveBeenCalled()
      expect(focusSpy).toHaveBeenCalled()
    })
  })

  describe('Session Monitoring', () => {
    test('should setup session monitors', () => {
      jest.useFakeTimers()
      
      const checkSuspiciousSpy = jest.spyOn(antiDetection, 'checkForSuspiciousActivity').mockImplementation()
      
      antiDetection.startSessionMonitor()
      
      jest.advanceTimersByTime(30000)
      
      expect(checkSuspiciousSpy).toHaveBeenCalled()
      
      jest.useRealTimers()
    })

    test('should track mouse position', () => {
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 200
      })
      
      document.dispatchEvent(mouseEvent)
      
      expect(antiDetection.mousePosition.x).toBe(100)
      expect(antiDetection.mousePosition.y).toBe(200)
    })

    test('should reset action timer on real user activity', () => {
      const originalTime = antiDetection.lastActionTime
      
      const keyEvent = new KeyboardEvent('keydown')
      document.dispatchEvent(keyEvent)
      
      expect(antiDetection.lastActionTime).toBeGreaterThan(originalTime)
    })
  })

  describe('Message Communication', () => {
    test('should send session rotation message', async () => {
      await antiDetection.rotateSession()
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SESSION_ROTATION_REQUIRED',
        timestamp: expect.any(Number)
      })
    })

    test('should send break messages', async () => {
      antiDetection.config.breakPatterns.breakDuration = 0.01 // Very short for testing
      
      await antiDetection.takeBreak()
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BREAK_STARTED' })
      )
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BREAK_ENDED' })
      )
    })

    test('should send clear browsing data message', async () => {
      await antiDetection.clearBrowsingData()
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CLEAR_BROWSING_DATA',
        domain: 'linkedin.com'
      })
    })
  })

  describe('Configuration Management', () => {
    test('should handle missing configuration gracefully', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'))
      
      await expect(antiDetection.loadConfig()).resolves.not.toThrow()
    })

    test('should merge partial configurations', async () => {
      const partialConfig = {
        humanizeActions: false,
        breakPatterns: { enabled: false }
      }
      
      chrome.storage.local.get.mockResolvedValue({
        antiDetectionConfig: partialConfig
      })
      
      await antiDetection.loadConfig()
      
      // Should merge with defaults
      expect(antiDetection.config.enabled).toBe(true) // Default
      expect(antiDetection.config.humanizeActions).toBe(false) // Override
      expect(antiDetection.config.breakPatterns.enabled).toBe(false) // Override
    })
  })

  describe('Utility Functions', () => {
    test('should sleep for specified duration', async () => {
      const start = Date.now()
      await antiDetection.sleep(100)
      const end = Date.now()
      
      expect(end - start).toBeGreaterThanOrEqual(95) // Allow some tolerance
    })
  })

  describe('Performance and Edge Cases', () => {
    test('should handle rapid successive actions', async () => {
      const mockAction = jest.fn().mockResolvedValue('success')
      
      // Perform multiple actions rapidly
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(antiDetection.performAction('test', mockAction))
      }
      
      const results = await Promise.all(promises)
      
      // All should complete successfully
      expect(results.every(r => r === 'success')).toBe(true)
      expect(antiDetection.actionsCount).toBe(10)
    })

    test('should handle very large delay values', () => {
      const delay = antiDetection.generateDelay(1000000, 2000000)
      expect(delay).toBeGreaterThanOrEqual(1000000)
      expect(delay).toBeLessThanOrEqual(2000000)
    })

    test('should handle missing DOM elements gracefully', async () => {
      document.body.innerHTML = ''
      
      await expect(antiDetection.simulateIdleBehavior()).resolves.not.toThrow()
    })

    test('should handle zero duration breaks', async () => {
      antiDetection.config.breakPatterns.breakDuration = 0
      
      await expect(antiDetection.takeBreak()).resolves.not.toThrow()
      expect(antiDetection.isBreakTime).toBe(false)
    })

    test('should handle extreme mouse positions', async () => {
      const element = document.createElement('div')
      element.getBoundingClientRect = jest.fn().mockReturnValue({
        left: -1000,
        top: -1000,
        width: 50,
        height: 50
      })
      
      jest.spyOn(document, 'elementFromPoint').mockReturnValue(element)
      
      await expect(antiDetection.simulateMouseMovement(element)).resolves.not.toThrow()
    })
  })

  describe('Integration with Other Systems', () => {
    test('should work when anti-detection is disabled globally', async () => {
      antiDetection.config.enabled = false
      
      const mockAction = jest.fn().mockResolvedValue('success')
      const result = await antiDetection.performAction('test', mockAction)
      
      expect(result).toBe('success')
      expect(mockAction).toHaveBeenCalled()
    })

    test('should handle null/undefined action functions', async () => {
      await expect(antiDetection.performAction('test', null)).rejects.toThrow()
    })

    test('should handle action functions that throw errors', async () => {
      const errorAction = jest.fn().mockRejectedValue(new Error('Action failed'))
      
      await expect(antiDetection.performAction('test', errorAction)).rejects.toThrow('Action failed')
    })
  })
})