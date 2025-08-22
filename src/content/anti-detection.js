/**
 * Anti-Detection System - Content Script
 * Implements human-like behavior patterns to avoid detection
 */

class AntiDetectionSystem {
  constructor() {
    this.config = {
      enabled: true,
      humanizeActions: true,
      randomizeDelays: true,
      simulateMouseMovement: true,
      simulateScrolling: true,
      breakPatterns: {
        enabled: true,
        minApplications: 3,
        maxApplications: 7,
        breakDuration: 15 // minutes
      },
      sessionRotation: {
        enabled: true,
        maxSessionDuration: 45 // minutes
      }
    };
    
    this.sessionStartTime = Date.now();
    this.actionsCount = 0;
    this.lastActionTime = Date.now();
    this.mousePosition = { x: 0, y: 0 };
    this.isBreakTime = false;
    
    this.init();
  }

  init() {
    this.loadConfig();
    this.setupEventInterceptors();
    this.startSessionMonitor();
    this.injectHumanBehavior();
  }

  /**
   * Load configuration from storage
   */
  async loadConfig() {
    try {
      const stored = await chrome.storage.local.get('antiDetectionConfig');
      if (stored.antiDetectionConfig) {
        this.config = { ...this.config, ...stored.antiDetectionConfig };
      }
    } catch (error) {
      console.error('Error loading anti-detection config:', error);
    }
  }

  /**
   * Setup event interceptors to modify automation signatures
   */
  setupEventInterceptors() {
    // Override navigator properties that reveal automation
    this.hideAutomationSignatures();
    
    // Intercept and modify automated events
    this.interceptEvents();
    
    // Add random user agent variations
    this.randomizeFingerprint();
  }

  /**
   * Hide common automation signatures
   */
  hideAutomationSignatures() {
    // Inject script to override navigator properties
    const script = document.createElement('script');
    script.textContent = `
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // Override plugins to look more natural
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [];
          for (let i = 0; i < 3; i++) {
            plugins.push({
              name: 'Chrome PDF Plugin',
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer',
              length: 1
            });
          }
          return plugins;
        }
      });
      
      // Override languages to look natural
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Override permissions
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'prompt' });
        }
        return originalQuery.call(navigator.permissions, parameters);
      };
      
      // Override chrome property
      if (!window.chrome) {
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {}
        };
      }
    `;
    
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  /**
   * Intercept and modify automated events
   */
  interceptEvents() {
    // Override addEventListener to track event listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      // Add slight delay to automated clicks
      if (type === 'click' && this.tagName) {
        const originalListener = listener;
        listener = function(event) {
          setTimeout(() => originalListener.call(this, event), Math.random() * 100);
        };
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Randomize browser fingerprint
   */
  randomizeFingerprint() {
    // Vary screen properties slightly
    const script = document.createElement('script');
    script.textContent = `
      const baseWidth = window.screen.width;
      const baseHeight = window.screen.height;
      
      Object.defineProperty(window.screen, 'width', {
        get: () => baseWidth + Math.floor(Math.random() * 10) - 5
      });
      
      Object.defineProperty(window.screen, 'height', {
        get: () => baseHeight + Math.floor(Math.random() * 10) - 5
      });
      
      // Vary timezone slightly
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        return originalGetTimezoneOffset.call(this) + (Math.random() < 0.5 ? 0 : 60);
      };
    `;
    
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  /**
   * Generate human-like delay
   */
  generateDelay(minMs = 1000, maxMs = 3000) {
    if (!this.config.randomizeDelays) {
      return (minMs + maxMs) / 2;
    }
    
    // Use normal distribution for more realistic delays
    const mean = (minMs + maxMs) / 2;
    const stdDev = (maxMs - minMs) / 6;
    const gaussian = this.boxMullerTransform();
    
    let delay = mean + gaussian * stdDev;
    delay = Math.max(minMs, Math.min(maxMs, delay));
    
    // Add micro-variations
    delay += Math.random() * 100 - 50;
    
    return Math.round(delay);
  }

  /**
   * Box-Muller transform for normal distribution
   */
  boxMullerTransform() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Simulate human-like mouse movement
   */
  async simulateMouseMovement(targetElement) {
    if (!this.config.simulateMouseMovement) {
      return;
    }
    
    const rect = targetElement.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2 + (Math.random() * 10 - 5);
    const targetY = rect.top + rect.height / 2 + (Math.random() * 10 - 5);
    
    // Calculate distance and steps
    const distance = Math.sqrt(
      Math.pow(targetX - this.mousePosition.x, 2) + 
      Math.pow(targetY - this.mousePosition.y, 2)
    );
    
    const steps = Math.max(5, Math.min(20, Math.floor(distance / 50)));
    const duration = this.generateDelay(200, 500);
    const stepDelay = duration / steps;
    
    // Generate Bezier curve for natural movement
    const controlPoint1 = {
      x: this.mousePosition.x + (targetX - this.mousePosition.x) * 0.25 + (Math.random() * 50 - 25),
      y: this.mousePosition.y + (targetY - this.mousePosition.y) * 0.25 + (Math.random() * 50 - 25)
    };
    
    const controlPoint2 = {
      x: this.mousePosition.x + (targetX - this.mousePosition.x) * 0.75 + (Math.random() * 50 - 25),
      y: this.mousePosition.y + (targetY - this.mousePosition.y) * 0.75 + (Math.random() * 50 - 25)
    };
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.calculateBezierPoint(
        t,
        this.mousePosition,
        controlPoint1,
        controlPoint2,
        { x: targetX, y: targetY }
      );
      
      // Dispatch mouse move event
      const event = new MouseEvent('mousemove', {
        clientX: point.x,
        clientY: point.y,
        bubbles: true,
        cancelable: true
      });
      
      document.elementFromPoint(point.x, point.y)?.dispatchEvent(event);
      
      await this.sleep(stepDelay);
    }
    
    this.mousePosition = { x: targetX, y: targetY };
    
    // Hover briefly before clicking
    await this.sleep(this.generateDelay(100, 300));
  }

  /**
   * Calculate point on cubic Bezier curve
   */
  calculateBezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  /**
   * Simulate human-like scrolling
   */
  async simulateScroll(targetY, duration = 1000) {
    if (!this.config.simulateScrolling) {
      window.scrollTo(0, targetY);
      return;
    }
    
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    const steps = Math.abs(Math.floor(distance / 100));
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Easing function for natural scroll
      const easeProgress = this.easeInOutCubic(progress);
      const currentY = startY + distance * easeProgress;
      
      window.scrollTo(0, currentY);
      
      // Add small random variations
      if (Math.random() < 0.1) {
        await this.sleep(stepDuration + Math.random() * 100);
      } else {
        await this.sleep(stepDuration);
      }
    }
    
    // Overshoot and correct (human behavior)
    if (Math.random() < 0.3) {
      const overshoot = (Math.random() * 50 - 25);
      window.scrollTo(0, targetY + overshoot);
      await this.sleep(200);
      window.scrollTo(0, targetY);
    }
  }

  /**
   * Easing function for smooth animations
   */
  easeInOutCubic(t) {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Simulate human typing
   */
  async simulateTyping(element, text) {
    if (!this.config.humanizeActions) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    
    element.focus();
    element.value = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Simulate key press
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      
      // Variable typing speed
      const baseDelay = this.generateDelay(50, 150);
      
      // Occasional longer pauses (thinking)
      if (Math.random() < 0.05) {
        await this.sleep(baseDelay + this.generateDelay(200, 500));
      } 
      // Faster for common letter combinations
      else if (i > 0 && this.isCommonPair(text[i-1], char)) {
        await this.sleep(baseDelay * 0.7);
      } 
      // Regular speed
      else {
        await this.sleep(baseDelay);
      }
      
      // Simulate typos and corrections occasionally
      if (Math.random() < 0.02 && i < text.length - 1) {
        const typo = String.fromCharCode(char.charCodeAt(0) + (Math.random() < 0.5 ? 1 : -1));
        element.value = element.value.slice(0, -1) + typo;
        await this.sleep(this.generateDelay(100, 200));
        
        // Backspace and correct
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
        element.value = element.value.slice(0, -1) + char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await this.sleep(this.generateDelay(100, 200));
      }
    }
    
    // Blur after typing
    await this.sleep(this.generateDelay(100, 300));
    element.blur();
  }

  /**
   * Check if two characters form a common pair
   */
  isCommonPair(char1, char2) {
    const commonPairs = ['th', 'he', 'in', 'er', 'an', 're', 'ed', 'on', 'es', 'st', 'en', 'at'];
    return commonPairs.includes(char1 + char2);
  }

  /**
   * Perform action with anti-detection measures
   */
  async performAction(actionType, actionFn) {
    // Check if it's break time
    if (this.isBreakTime) {
      console.log('Anti-detection: Currently in break period');
      return false;
    }
    
    // Check session duration
    if (this.shouldRotateSession()) {
      console.log('Anti-detection: Session rotation required');
      await this.rotateSession();
    }
    
    // Add delay based on last action
    const timeSinceLastAction = Date.now() - this.lastActionTime;
    if (timeSinceLastAction < 1000) {
      await this.sleep(this.generateDelay(1000, 2000));
    }
    
    // Simulate reading/thinking time before action
    if (actionType === 'apply' || actionType === 'form_fill') {
      await this.sleep(this.generateDelay(3000, 7000));
    }
    
    // Execute the action
    const result = await actionFn();
    
    // Update counters
    this.actionsCount++;
    this.lastActionTime = Date.now();
    
    // Check if break is needed
    if (this.shouldTakeBreak()) {
      await this.takeBreak();
    }
    
    return result;
  }

  /**
   * Check if session rotation is needed
   */
  shouldRotateSession() {
    if (!this.config.sessionRotation.enabled) {
      return false;
    }
    
    const sessionDuration = (Date.now() - this.sessionStartTime) / 60000; // in minutes
    return sessionDuration >= this.config.sessionRotation.maxSessionDuration;
  }

  /**
   * Rotate session
   */
  async rotateSession() {
    console.log('Anti-detection: Rotating session...');
    
    // Clear cookies and local storage for LinkedIn
    await this.clearBrowsingData();
    
    // Simulate logout behavior
    await this.sleep(this.generateDelay(2000, 4000));
    
    // Notify background script
    chrome.runtime.sendMessage({ 
      type: 'SESSION_ROTATION_REQUIRED',
      timestamp: Date.now()
    });
    
    // Reset session timer
    this.sessionStartTime = Date.now();
    this.actionsCount = 0;
  }

  /**
   * Check if break is needed
   */
  shouldTakeBreak() {
    if (!this.config.breakPatterns.enabled) {
      return false;
    }
    
    const threshold = this.generateDelay(
      this.config.breakPatterns.minApplications,
      this.config.breakPatterns.maxApplications
    );
    
    return this.actionsCount >= threshold;
  }

  /**
   * Take a break
   */
  async takeBreak() {
    console.log('Anti-detection: Taking a break...');
    this.isBreakTime = true;
    
    const breakDuration = this.config.breakPatterns.breakDuration * 60000; // Convert to ms
    const variation = this.generateDelay(-5000, 5000); // Add some variation
    
    // Simulate idle behavior
    await this.simulateIdleBehavior();
    
    // Notify user
    chrome.runtime.sendMessage({ 
      type: 'BREAK_STARTED',
      duration: breakDuration + variation,
      timestamp: Date.now()
    });
    
    // Wait for break duration
    await this.sleep(breakDuration + variation);
    
    this.isBreakTime = false;
    this.actionsCount = 0;
    
    chrome.runtime.sendMessage({ 
      type: 'BREAK_ENDED',
      timestamp: Date.now()
    });
  }

  /**
   * Simulate idle behavior during breaks
   */
  async simulateIdleBehavior() {
    // Random scrolling
    for (let i = 0; i < 3; i++) {
      const randomY = Math.random() * document.body.scrollHeight;
      await this.simulateScroll(randomY, this.generateDelay(1000, 2000));
      await this.sleep(this.generateDelay(2000, 5000));
    }
    
    // Move mouse randomly
    for (let i = 0; i < 5; i++) {
      const randomElement = document.elementFromPoint(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight
      );
      
      if (randomElement) {
        await this.simulateMouseMovement(randomElement);
      }
      
      await this.sleep(this.generateDelay(1000, 3000));
    }
    
    // Return to top
    await this.simulateScroll(0, this.generateDelay(1000, 1500));
  }

  /**
   * Start session monitoring
   */
  startSessionMonitor() {
    // Monitor for suspicious patterns
    setInterval(() => {
      this.checkForSuspiciousActivity();
    }, 30000); // Check every 30 seconds
    
    // Track real user interactions
    document.addEventListener('mousemove', (e) => {
      this.mousePosition = { x: e.clientX, y: e.clientY };
    });
    
    document.addEventListener('keydown', () => {
      this.lastActionTime = Date.now(); // Reset timer on real user activity
    });
  }

  /**
   * Check for suspicious activity patterns
   */
  checkForSuspiciousActivity() {
    const recentActions = this.getRecentActions();
    
    // Check for too regular patterns
    if (this.detectRegularPatterns(recentActions)) {
      console.warn('Anti-detection: Regular pattern detected, adding randomization');
      this.increaseRandomization();
    }
    
    // Check for too fast actions
    if (this.detectRapidActions(recentActions)) {
      console.warn('Anti-detection: Rapid actions detected, slowing down');
      this.slowDownActions();
    }
  }

  /**
   * Get recent actions from storage
   */
  getRecentActions() {
    // Implementation would retrieve from storage
    return [];
  }

  /**
   * Detect regular patterns in actions
   */
  detectRegularPatterns(actions) {
    if (actions.length < 10) return false;
    
    const intervals = [];
    for (let i = 1; i < actions.length; i++) {
      intervals.push(actions[i].timestamp - actions[i-1].timestamp);
    }
    
    // Calculate standard deviation
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Low standard deviation indicates regular pattern
    return stdDev < 1000; // Less than 1 second variation
  }

  /**
   * Detect rapid actions
   */
  detectRapidActions(actions) {
    if (actions.length < 5) return false;
    
    const recentActions = actions.slice(-5);
    const totalTime = recentActions[4].timestamp - recentActions[0].timestamp;
    const averageInterval = totalTime / 4;
    
    return averageInterval < 2000; // Less than 2 seconds between actions
  }

  /**
   * Increase randomization
   */
  increaseRandomization() {
    // Temporarily increase delay variations
    this.config.randomizeDelays = true;
    // Add more variation to delays
  }

  /**
   * Slow down actions
   */
  slowDownActions() {
    // Temporarily increase minimum delays
    this.lastActionTime = Date.now() + 5000; // Add 5 second penalty
  }

  /**
   * Inject human behavior patterns
   */
  injectHumanBehavior() {
    // Random page interactions
    setInterval(() => {
      if (!this.isBreakTime && Math.random() < 0.1) {
        this.performRandomInteraction();
      }
    }, 10000); // Every 10 seconds, 10% chance
  }

  /**
   * Perform random interaction
   */
  async performRandomInteraction() {
    const actions = [
      () => this.randomScroll(),
      () => this.randomClick(),
      () => this.randomHover(),
      () => this.randomFocus()
    ];
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    await action();
  }

  /**
   * Random scroll action
   */
  async randomScroll() {
    const scrollAmount = Math.random() * 200 - 100;
    await this.simulateScroll(window.pageYOffset + scrollAmount, 500);
  }

  /**
   * Random click on non-interactive element
   */
  async randomClick() {
    const elements = document.querySelectorAll('div, span, p');
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    
    if (randomElement && !randomElement.onclick) {
      await this.simulateMouseMovement(randomElement);
      randomElement.click();
    }
  }

  /**
   * Random hover action
   */
  async randomHover() {
    const links = document.querySelectorAll('a');
    const randomLink = links[Math.floor(Math.random() * links.length)];
    
    if (randomLink) {
      await this.simulateMouseMovement(randomLink);
      await this.sleep(this.generateDelay(500, 1500));
    }
  }

  /**
   * Random focus action
   */
  async randomFocus() {
    const inputs = document.querySelectorAll('input, textarea');
    const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
    
    if (randomInput) {
      randomInput.focus();
      await this.sleep(this.generateDelay(500, 1000));
      randomInput.blur();
    }
  }

  /**
   * Clear browsing data
   */
  async clearBrowsingData() {
    // This would need to be handled by the background script
    chrome.runtime.sendMessage({ 
      type: 'CLEAR_BROWSING_DATA',
      domain: 'linkedin.com'
    });
  }

  /**
   * Sleep helper function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the anti-detection system
const antiDetection = new AntiDetectionSystem();

// Export for use in other scripts
window.antiDetection = antiDetection;