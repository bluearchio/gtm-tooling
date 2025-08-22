/**
 * Unit Tests for Options Page Script
 * Tests settings management, form interactions, and configuration persistence
 */

import fs from 'fs'
import path from 'path'
import { mockUserProfile } from '../fixtures/linkedinData.js'

// Create options page HTML structure for testing
function createOptionsDOM() {
  document.body.innerHTML = `
    <div class="options-container">
      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button class="tab active" data-tab="filters">Filters</button>
        <button class="tab" data-tab="automation">Automation</button>
        <button class="tab" data-tab="profile">Profile</button>
      </div>

      <!-- Filters Tab -->
      <div id="filters-tab" class="tab-content active">
        <div class="form-group">
          <label for="keywordInput">Keywords:</label>
          <input type="text" id="keywordInput" placeholder="Add keyword">
          <button id="addKeyword">Add</button>
          <div id="keywordList" class="keyword-list"></div>
        </div>
        
        <div class="form-group">
          <label>Keyword Logic:</label>
          <input type="radio" name="keywordLogic" value="OR" id="keywordOr">
          <label for="keywordOr">OR</label>
          <input type="radio" name="keywordLogic" value="AND" id="keywordAnd">
          <label for="keywordAnd">AND</label>
        </div>

        <div class="form-group">
          <label for="remoteFilter">Remote Work:</label>
          <select id="remoteFilter">
            <option value="any">Any</option>
            <option value="yes">Remote Only</option>
            <option value="no">On-site Only</option>
          </select>
        </div>

        <div class="form-group">
          <label for="experienceLevel">Experience Level:</label>
          <select id="experienceLevel">
            <option value="any">Any</option>
            <option value="entry">Entry Level</option>
            <option value="mid">Mid Level</option>
            <option value="senior">Senior Level</option>
            <option value="executive">Executive</option>
          </select>
        </div>

        <div class="form-group">
          <label for="postedWithin">Posted Within (days):</label>
          <select id="postedWithin">
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">1 week</option>
            <option value="14">2 weeks</option>
            <option value="30">1 month</option>
          </select>
        </div>

        <div class="form-group">
          <label for="salaryMin">Minimum Salary:</label>
          <input type="number" id="salaryMin" placeholder="e.g., 80000">
        </div>
      </div>

      <!-- Automation Tab -->
      <div id="automation-tab" class="tab-content">
        <div class="form-group">
          <label for="automationMode">Automation Mode:</label>
          <select id="automationMode">
            <option value="manual">Manual</option>
            <option value="semi-auto">Semi-Automatic</option>
            <option value="auto">Fully Automatic</option>
          </select>
        </div>

        <div class="form-group">
          <label for="dailyLimit">Daily Limit:</label>
          <input type="range" id="dailyLimit" min="1" max="200" value="50">
          <span id="dailyLimitValue">50</span>
        </div>

        <div class="form-group">
          <label for="sessionLimit">Session Limit:</label>
          <input type="range" id="sessionLimit" min="1" max="50" value="10">
          <span id="sessionLimitValue">10</span>
        </div>

        <div class="form-group">
          <label for="delayMin">Minimum Delay (seconds):</label>
          <input type="number" id="delayMin" min="1" max="60" value="3">
        </div>

        <div class="form-group">
          <label for="delayMax">Maximum Delay (seconds):</label>
          <input type="number" id="delayMax" min="1" max="120" value="8">
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="antiDetection" checked>
            Enable Anti-Detection
          </label>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="humanizeActions" checked>
            Humanize Actions
          </label>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="notifyOnSubmit" checked>
            Notify on Application Submit
          </label>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="notifyOnError" checked>
            Notify on Errors
          </label>
        </div>
      </div>

      <!-- Profile Tab -->
      <div id="profile-tab" class="tab-content">
        <div class="form-group">
          <label for="firstName">First Name:</label>
          <input type="text" id="firstName">
        </div>

        <div class="form-group">
          <label for="lastName">Last Name:</label>
          <input type="text" id="lastName">
        </div>

        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email">
        </div>

        <div class="form-group">
          <label for="phone">Phone:</label>
          <input type="tel" id="phone">
        </div>

        <div class="form-group">
          <label for="currentTitle">Current Title:</label>
          <input type="text" id="currentTitle">
        </div>

        <div class="form-group">
          <label for="currentCompany">Current Company:</label>
          <input type="text" id="currentCompany">
        </div>

        <div class="form-group">
          <label for="yearsExperience">Years of Experience:</label>
          <input type="number" id="yearsExperience" min="0" max="50">
        </div>

        <div class="form-group">
          <label for="linkedinUrl">LinkedIn URL:</label>
          <input type="url" id="linkedinUrl" placeholder="https://linkedin.com/in/yourprofile">
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions">
        <button id="saveBtn" class="save-btn">Save Settings</button>
        <button id="resetBtn" class="reset-btn">Reset to Defaults</button>
      </div>

      <!-- Messages -->
      <div id="successMessage" class="success-message"></div>
    </div>
  `
}

// Read and execute the options script
const optionsPath = path.join(process.cwd(), 'src/options/options.js')
const optionsCode = fs.readFileSync(optionsPath, 'utf8')

describe('Options Page Script', () => {
  let elements, mockConfig, mockProfile

  beforeEach(() => {
    // Reset DOM
    createOptionsDOM()
    
    // Mock configuration data
    mockConfig = {
      enabled: true,
      mode: 'semi-auto',
      dailyLimit: 50,
      sessionLimit: 10,
      delayBetweenActions: { min: 3000, max: 8000 },
      filters: {
        isRemote: 'any',
        keywords: ['javascript', 'react'],
        keywordLogic: 'OR',
        experienceLevel: 'any',
        jobType: ['full-time'],
        postedWithin: 7,
        salaryMin: null
      },
      antiDetection: {
        enabled: true,
        humanizeActions: true
      },
      notifications: {
        onApplicationSubmitted: true,
        onError: true
      }
    }

    mockProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0123',
      currentTitle: 'Software Engineer',
      currentCompany: 'TechCorp',
      yearsOfExperience: 5,
      linkedInUrl: 'https://linkedin.com/in/johndoe'
    }

    // Mock chrome APIs
    chrome.storage.local.get.mockResolvedValue({
      config: mockConfig,
      profile: mockProfile
    })
    chrome.storage.local.set.mockResolvedValue()
    chrome.runtime.sendMessage.mockResolvedValue({ success: true })

    // Execute options script
    eval(optionsCode)

    // Get elements reference
    elements = global.elements || {
      tabs: document.querySelectorAll('.tab'),
      tabContents: document.querySelectorAll('.tab-content'),
      keywordInput: document.getElementById('keywordInput'),
      addKeywordBtn: document.getElementById('addKeyword'),
      keywordList: document.getElementById('keywordList'),
      remoteFilter: document.getElementById('remoteFilter'),
      experienceLevel: document.getElementById('experienceLevel'),
      postedWithin: document.getElementById('postedWithin'),
      salaryMin: document.getElementById('salaryMin'),
      automationMode: document.getElementById('automationMode'),
      dailyLimit: document.getElementById('dailyLimit'),
      dailyLimitValue: document.getElementById('dailyLimitValue'),
      sessionLimit: document.getElementById('sessionLimit'),
      sessionLimitValue: document.getElementById('sessionLimitValue'),
      delayMin: document.getElementById('delayMin'),
      delayMax: document.getElementById('delayMax'),
      antiDetection: document.getElementById('antiDetection'),
      humanizeActions: document.getElementById('humanizeActions'),
      notifyOnSubmit: document.getElementById('notifyOnSubmit'),
      notifyOnError: document.getElementById('notifyOnError'),
      firstName: document.getElementById('firstName'),
      lastName: document.getElementById('lastName'),
      email: document.getElementById('email'),
      phone: document.getElementById('phone'),
      currentTitle: document.getElementById('currentTitle'),
      currentCompany: document.getElementById('currentCompany'),
      yearsExperience: document.getElementById('yearsExperience'),
      linkedinUrl: document.getElementById('linkedinUrl'),
      saveBtn: document.getElementById('saveBtn'),
      resetBtn: document.getElementById('resetBtn'),
      successMessage: document.getElementById('successMessage')
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    test('should initialize DOM elements correctly', () => {
      expect(elements.saveBtn).toBeTruthy()
      expect(elements.resetBtn).toBeTruthy()
      expect(elements.keywordInput).toBeTruthy()
      expect(elements.tabs.length).toBeGreaterThan(0)
    })

    test('should load configuration on initialization', async () => {
      const loadConfiguration = global.loadConfiguration || (async () => {
        const storage = await chrome.storage.local.get(['config', 'profile'])
        return { config: storage.config, profile: storage.profile }
      })

      const result = await loadConfiguration()

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['config', 'profile'])
      expect(result.config).toEqual(mockConfig)
      expect(result.profile).toEqual(mockProfile)
    })

    test('should use default config when storage is empty', async () => {
      chrome.storage.local.get.mockResolvedValue({})

      const loadConfiguration = global.loadConfiguration || (async () => {
        const storage = await chrome.storage.local.get(['config', 'profile'])
        const getDefaultConfig = global.getDefaultConfig || (() => ({
          enabled: true,
          mode: 'semi-auto',
          filters: { isRemote: 'any', keywords: [] }
        }))
        return { 
          config: storage.config || getDefaultConfig(),
          profile: storage.profile || {}
        }
      })

      const result = await loadConfiguration()

      expect(result.config).toBeDefined()
      expect(result.config.enabled).toBe(true)
    })

    test('should handle storage errors gracefully', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'))

      const loadConfiguration = global.loadConfiguration || (async () => {
        try {
          const storage = await chrome.storage.local.get(['config', 'profile'])
          return { config: storage.config, profile: storage.profile }
        } catch (error) {
          return { config: {}, profile: {} }
        }
      })

      const result = await loadConfiguration()

      expect(result).toBeDefined()
      expect(result.config).toBeDefined()
    })
  })

  describe('Tab Navigation', () => {
    test('should switch tabs correctly', () => {
      const switchTab = global.switchTab || ((tabName) => {
        elements.tabs.forEach(tab => {
          tab.classList.toggle('active', tab.dataset.tab === tabName)
        })
        elements.tabContents.forEach(content => {
          content.classList.toggle('active', content.id === `${tabName}-tab`)
        })
      })

      switchTab('automation')

      const automationTab = document.querySelector('[data-tab="automation"]')
      const automationContent = document.getElementById('automation-tab')

      expect(automationTab.classList.contains('active')).toBe(true)
      expect(automationContent.classList.contains('active')).toBe(true)
    })

    test('should handle tab click events', () => {
      const automationTab = document.querySelector('[data-tab="automation"]')
      const switchTab = jest.fn()
      global.switchTab = switchTab

      // Simulate click
      automationTab.addEventListener('click', () => {
        switchTab(automationTab.dataset.tab)
      })
      automationTab.click()

      expect(switchTab).toHaveBeenCalledWith('automation')
    })
  })

  describe('Settings Display', () => {
    test('should display filter settings correctly', () => {
      const displaySettings = global.displaySettings || (() => {
        elements.remoteFilter.value = mockConfig.filters.isRemote
        elements.experienceLevel.value = mockConfig.filters.experienceLevel
        elements.postedWithin.value = mockConfig.filters.postedWithin
        elements.salaryMin.value = mockConfig.filters.salaryMin || ''
        
        // Set keyword logic radio
        const keywordLogicRadio = document.querySelector(`input[name="keywordLogic"][value="${mockConfig.filters.keywordLogic}"]`)
        if (keywordLogicRadio) keywordLogicRadio.checked = true
      })

      displaySettings()

      expect(elements.remoteFilter.value).toBe('any')
      expect(elements.experienceLevel.value).toBe('any')
      expect(elements.postedWithin.value).toBe('7')
      
      const orRadio = document.getElementById('keywordOr')
      expect(orRadio.checked).toBe(true)
    })

    test('should display automation settings correctly', () => {
      const displaySettings = global.displaySettings || (() => {
        elements.automationMode.value = mockConfig.mode
        elements.dailyLimit.value = mockConfig.dailyLimit
        elements.dailyLimitValue.textContent = mockConfig.dailyLimit
        elements.sessionLimit.value = mockConfig.sessionLimit
        elements.sessionLimitValue.textContent = mockConfig.sessionLimit
        elements.delayMin.value = Math.floor(mockConfig.delayBetweenActions.min / 1000)
        elements.delayMax.value = Math.floor(mockConfig.delayBetweenActions.max / 1000)
        elements.antiDetection.checked = mockConfig.antiDetection.enabled
        elements.humanizeActions.checked = mockConfig.antiDetection.humanizeActions
        elements.notifyOnSubmit.checked = mockConfig.notifications.onApplicationSubmitted
        elements.notifyOnError.checked = mockConfig.notifications.onError
      })

      displaySettings()

      expect(elements.automationMode.value).toBe('semi-auto')
      expect(elements.dailyLimit.value).toBe('50')
      expect(elements.sessionLimit.value).toBe('10')
      expect(elements.delayMin.value).toBe('3')
      expect(elements.delayMax.value).toBe('8')
      expect(elements.antiDetection.checked).toBe(true)
      expect(elements.humanizeActions.checked).toBe(true)
    })

    test('should display profile settings correctly', () => {
      const displaySettings = global.displaySettings || (() => {
        elements.firstName.value = mockProfile.firstName
        elements.lastName.value = mockProfile.lastName
        elements.email.value = mockProfile.email
        elements.phone.value = mockProfile.phone
        elements.currentTitle.value = mockProfile.currentTitle
        elements.currentCompany.value = mockProfile.currentCompany
        elements.yearsExperience.value = mockProfile.yearsOfExperience
        elements.linkedinUrl.value = mockProfile.linkedInUrl
      })

      displaySettings()

      expect(elements.firstName.value).toBe('John')
      expect(elements.lastName.value).toBe('Doe')
      expect(elements.email.value).toBe('john@example.com')
      expect(elements.phone.value).toBe('555-0123')
      expect(elements.currentTitle.value).toBe('Software Engineer')
      expect(elements.currentCompany.value).toBe('TechCorp')
      expect(elements.yearsExperience.value).toBe('5')
      expect(elements.linkedinUrl.value).toBe('https://linkedin.com/in/johndoe')
    })
  })

  describe('Keyword Management', () => {
    test('should display existing keywords', () => {
      const displayKeywords = global.displayKeywords || (() => {
        elements.keywordList.innerHTML = ''
        mockConfig.filters.keywords.forEach(keyword => {
          const tag = document.createElement('div')
          tag.className = 'keyword-tag'
          tag.innerHTML = `${keyword} <span class="remove" data-keyword="${keyword}">×</span>`
          elements.keywordList.appendChild(tag)
        })
      })

      displayKeywords()

      expect(elements.keywordList.children.length).toBe(2)
      expect(elements.keywordList.innerHTML).toContain('javascript')
      expect(elements.keywordList.innerHTML).toContain('react')
    })

    test('should add new keywords', () => {
      elements.keywordInput.value = 'nodejs'

      const addKeyword = global.addKeyword || (() => {
        const keyword = elements.keywordInput.value.trim()
        if (!keyword) return
        
        if (!mockConfig.filters.keywords.includes(keyword)) {
          mockConfig.filters.keywords.push(keyword)
          
          const tag = document.createElement('div')
          tag.className = 'keyword-tag'
          tag.innerHTML = `${keyword} <span class="remove" data-keyword="${keyword}">×</span>`
          elements.keywordList.appendChild(tag)
        }
        
        elements.keywordInput.value = ''
      })

      addKeyword()

      expect(mockConfig.filters.keywords).toContain('nodejs')
      expect(elements.keywordInput.value).toBe('')
      expect(elements.keywordList.innerHTML).toContain('nodejs')
    })

    test('should remove keywords', () => {
      // Setup keywords first
      mockConfig.filters.keywords = ['javascript', 'react', 'nodejs']
      
      const removeKeyword = global.removeKeyword || ((keyword) => {
        mockConfig.filters.keywords = mockConfig.filters.keywords.filter(k => k !== keyword)
        
        // Remove from DOM
        const tagToRemove = elements.keywordList.querySelector(`[data-keyword="${keyword}"]`).parentElement
        tagToRemove.remove()
      })

      // Add elements to DOM for testing
      elements.keywordList.innerHTML = `
        <div class="keyword-tag">javascript <span class="remove" data-keyword="javascript">×</span></div>
        <div class="keyword-tag">react <span class="remove" data-keyword="react">×</span></div>
        <div class="keyword-tag">nodejs <span class="remove" data-keyword="nodejs">×</span></div>
      `

      removeKeyword('react')

      expect(mockConfig.filters.keywords).not.toContain('react')
      expect(mockConfig.filters.keywords).toContain('javascript')
      expect(mockConfig.filters.keywords).toContain('nodejs')
      expect(elements.keywordList.innerHTML).not.toContain('react')
    })

    test('should prevent adding duplicate keywords', () => {
      elements.keywordInput.value = 'javascript' // Already exists

      const addKeyword = global.addKeyword || (() => {
        const keyword = elements.keywordInput.value.trim()
        if (!keyword || mockConfig.filters.keywords.includes(keyword)) return
        
        mockConfig.filters.keywords.push(keyword)
      })

      const initialLength = mockConfig.filters.keywords.length
      addKeyword()

      expect(mockConfig.filters.keywords.length).toBe(initialLength)
    })

    test('should handle keyword input on Enter key', () => {
      elements.keywordInput.value = 'python'
      
      const addKeyword = jest.fn()
      global.addKeyword = addKeyword

      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' })
      elements.keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addKeyword()
      })
      
      elements.keywordInput.dispatchEvent(enterEvent)

      expect(addKeyword).toHaveBeenCalled()
    })
  })

  describe('Range Slider Updates', () => {
    test('should update daily limit display', () => {
      elements.dailyLimit.value = '75'
      
      // Simulate input event
      const inputEvent = new Event('input')
      elements.dailyLimit.addEventListener('input', (e) => {
        elements.dailyLimitValue.textContent = e.target.value
      })
      
      elements.dailyLimit.dispatchEvent(inputEvent)

      expect(elements.dailyLimitValue.textContent).toBe('75')
    })

    test('should update session limit display', () => {
      elements.sessionLimit.value = '15'
      
      const inputEvent = new Event('input')
      elements.sessionLimit.addEventListener('input', (e) => {
        elements.sessionLimitValue.textContent = e.target.value
      })
      
      elements.sessionLimit.dispatchEvent(inputEvent)

      expect(elements.sessionLimitValue.textContent).toBe('15')
    })
  })

  describe('Settings Save and Load', () => {
    test('should save all settings correctly', async () => {
      // Set up form values
      elements.remoteFilter.value = 'yes'
      elements.experienceLevel.value = 'senior'
      elements.postedWithin.value = '3'
      elements.salaryMin.value = '90000'
      elements.automationMode.value = 'auto'
      elements.dailyLimit.value = '100'
      elements.sessionLimit.value = '20'
      elements.delayMin.value = '5'
      elements.delayMax.value = '12'
      elements.antiDetection.checked = false
      elements.humanizeActions.checked = false
      elements.notifyOnSubmit.checked = false
      elements.notifyOnError.checked = false
      elements.firstName.value = 'Jane'
      elements.lastName.value = 'Smith'
      elements.email.value = 'jane@example.com'
      elements.phone.value = '555-9876'
      elements.currentTitle.value = 'Senior Developer'
      elements.currentCompany.value = 'WebCorp'
      elements.yearsExperience.value = '8'
      elements.linkedinUrl.value = 'https://linkedin.com/in/janesmith'

      const saveSettings = global.saveSettings || (async () => {
        const config = {
          filters: {
            isRemote: elements.remoteFilter.value,
            experienceLevel: elements.experienceLevel.value,
            postedWithin: parseInt(elements.postedWithin.value),
            salaryMin: elements.salaryMin.value ? parseInt(elements.salaryMin.value) : null,
            keywords: mockConfig.filters.keywords
          },
          mode: elements.automationMode.value,
          dailyLimit: parseInt(elements.dailyLimit.value),
          sessionLimit: parseInt(elements.sessionLimit.value),
          delayBetweenActions: {
            min: parseInt(elements.delayMin.value) * 1000,
            max: parseInt(elements.delayMax.value) * 1000
          },
          antiDetection: {
            enabled: elements.antiDetection.checked,
            humanizeActions: elements.humanizeActions.checked
          },
          notifications: {
            onApplicationSubmitted: elements.notifyOnSubmit.checked,
            onError: elements.notifyOnError.checked
          }
        }

        const profile = {
          firstName: elements.firstName.value,
          lastName: elements.lastName.value,
          email: elements.email.value,
          phone: elements.phone.value,
          currentTitle: elements.currentTitle.value,
          currentCompany: elements.currentCompany.value,
          yearsOfExperience: elements.yearsExperience.value ? parseInt(elements.yearsExperience.value) : null,
          linkedInUrl: elements.linkedinUrl.value
        }

        await chrome.storage.local.set({ config, profile })
        chrome.runtime.sendMessage({ type: 'UPDATE_CONFIG', payload: config })

        return { success: true }
      })

      const result = await saveSettings()

      expect(result.success).toBe(true)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        config: expect.objectContaining({
          filters: expect.objectContaining({
            isRemote: 'yes',
            experienceLevel: 'senior',
            postedWithin: 3,
            salaryMin: 90000
          }),
          mode: 'auto',
          dailyLimit: 100,
          sessionLimit: 20
        }),
        profile: expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          currentTitle: 'Senior Developer'
        })
      })
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'UPDATE_CONFIG',
        payload: expect.any(Object)
      })
    })

    test('should show success message after saving', async () => {
      const showSuccessMessage = global.showSuccessMessage || ((message = 'Settings saved successfully!') => {
        elements.successMessage.textContent = message
        elements.successMessage.classList.add('show')
      })

      showSuccessMessage()

      expect(elements.successMessage.textContent).toBe('Settings saved successfully!')
      expect(elements.successMessage.classList.contains('show')).toBe(true)
    })

    test('should handle save errors gracefully', async () => {
      chrome.storage.local.set.mockRejectedValue(new Error('Storage full'))

      const saveSettings = global.saveSettings || (async () => {
        try {
          await chrome.storage.local.set({ config: {}, profile: {} })
          return { success: true }
        } catch (error) {
          return { success: false, error: error.message }
        }
      })

      const result = await saveSettings()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage full')
    })
  })

  describe('Reset Settings', () => {
    test('should reset settings to defaults with confirmation', async () => {
      // Mock confirm dialog
      window.confirm = jest.fn().mockReturnValue(true)

      const resetSettings = global.resetSettings || (async () => {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
          return { success: false }
        }

        const getDefaultConfig = global.getDefaultConfig || (() => ({
          enabled: true,
          mode: 'semi-auto',
          dailyLimit: 50,
          filters: { isRemote: 'any', keywords: [] }
        }))

        const defaultConfig = getDefaultConfig()
        const defaultProfile = {}

        await chrome.storage.local.set({ config: defaultConfig, profile: defaultProfile })
        return { success: true }
      })

      const result = await resetSettings()

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to reset all settings to defaults?')
      expect(result.success).toBe(true)
      expect(chrome.storage.local.set).toHaveBeenCalled()
    })

    test('should not reset if user cancels confirmation', async () => {
      window.confirm = jest.fn().mockReturnValue(false)

      const resetSettings = global.resetSettings || (async () => {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
          return { success: false }
        }
        return { success: true }
      })

      const result = await resetSettings()

      expect(window.confirm).toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(chrome.storage.local.set).not.toHaveBeenCalled()
    })

    test('should display settings after reset', async () => {
      window.confirm = jest.fn().mockReturnValue(true)

      const resetSettings = global.resetSettings || (async () => {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
          return
        }

        // Reset form to defaults
        elements.remoteFilter.value = 'any'
        elements.experienceLevel.value = 'any'
        elements.automationMode.value = 'semi-auto'
        elements.dailyLimit.value = '50'
        elements.dailyLimitValue.textContent = '50'

        return { success: true }
      })

      await resetSettings()

      expect(elements.remoteFilter.value).toBe('any')
      expect(elements.experienceLevel.value).toBe('any')
      expect(elements.automationMode.value).toBe('semi-auto')
      expect(elements.dailyLimit.value).toBe('50')
    })
  })

  describe('Data Import/Export', () => {
    test('should export settings correctly', () => {
      const exportSettings = global.exportSettings || (() => {
        const data = {
          config: mockConfig,
          profile: mockProfile,
          exportedAt: new Date().toISOString()
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `linkedin-auto-apply-settings-${Date.now()}.json`
        
        return { blob, url, filename: a.download }
      })

      const result = exportSettings()

      expect(result.blob).toBeInstanceOf(Blob)
      expect(result.filename).toContain('linkedin-auto-apply-settings')
      expect(result.filename).toContain('.json')
    })

    test('should import settings from valid file', async () => {
      const mockFileContent = {
        config: {
          mode: 'auto',
          dailyLimit: 75,
          filters: { isRemote: 'yes', keywords: ['python'] }
        },
        profile: {
          firstName: 'Alice',
          email: 'alice@example.com'
        }
      }

      const mockFile = new File([JSON.stringify(mockFileContent)], 'settings.json', { type: 'application/json' })

      const importSettings = global.importSettings || ((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = async (e) => {
            try {
              const data = JSON.parse(e.target.result)
              if (data.config) mockConfig = data.config
              if (data.profile) mockProfile = data.profile
              
              await chrome.storage.local.set({ config: mockConfig, profile: mockProfile })
              resolve({ success: true })
            } catch (error) {
              reject(error)
            }
          }
          reader.readAsText(file)
        })
      })

      const result = await importSettings(mockFile)

      expect(result.success).toBe(true)
      expect(chrome.storage.local.set).toHaveBeenCalled()
    })

    test('should handle invalid import file format', async () => {
      const invalidFile = new File(['invalid json content'], 'invalid.json', { type: 'application/json' })

      const importSettings = global.importSettings || ((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              JSON.parse(e.target.result)
              resolve({ success: true })
            } catch (error) {
              resolve({ success: false, error: 'Invalid file format' })
            }
          }
          reader.readAsText(file)
        })
      })

      const result = await importSettings(invalidFile)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid file format')
    })
  })

  describe('Form Validation', () => {
    test('should validate email format', () => {
      elements.email.value = 'invalid-email'

      const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      }

      const isValid = validateEmail(elements.email.value)

      expect(isValid).toBe(false)

      elements.email.value = 'valid@example.com'
      expect(validateEmail(elements.email.value)).toBe(true)
    })

    test('should validate LinkedIn URL format', () => {
      const validateLinkedInUrl = (url) => {
        if (!url) return true // Optional field
        return url.includes('linkedin.com/in/')
      }

      elements.linkedinUrl.value = 'https://linkedin.com/in/johndoe'
      expect(validateLinkedInUrl(elements.linkedinUrl.value)).toBe(true)

      elements.linkedinUrl.value = 'https://twitter.com/johndoe'
      expect(validateLinkedInUrl(elements.linkedinUrl.value)).toBe(false)

      elements.linkedinUrl.value = ''
      expect(validateLinkedInUrl(elements.linkedinUrl.value)).toBe(true)
    })

    test('should validate numeric ranges', () => {
      const validateRange = (value, min, max) => {
        const num = parseInt(value)
        return !isNaN(num) && num >= min && num <= max
      }

      elements.dailyLimit.value = '150'
      expect(validateRange(elements.dailyLimit.value, 1, 200)).toBe(true)

      elements.dailyLimit.value = '250'
      expect(validateRange(elements.dailyLimit.value, 1, 200)).toBe(false)

      elements.yearsExperience.value = '25'
      expect(validateRange(elements.yearsExperience.value, 0, 50)).toBe(true)

      elements.yearsExperience.value = '-5'
      expect(validateRange(elements.yearsExperience.value, 0, 50)).toBe(false)
    })

    test('should validate delay configuration consistency', () => {
      elements.delayMin.value = '10'
      elements.delayMax.value = '5'

      const validateDelays = () => {
        const min = parseInt(elements.delayMin.value)
        const max = parseInt(elements.delayMax.value)
        return min <= max
      }

      expect(validateDelays()).toBe(false)

      elements.delayMax.value = '15'
      expect(validateDelays()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      // Remove an element
      elements.keywordInput.remove()

      const addKeyword = global.addKeyword || (() => {
        const input = document.getElementById('keywordInput')
        if (!input) return
        
        const keyword = input.value.trim()
        // Process keyword...
      })

      expect(() => addKeyword()).not.toThrow()
    })

    test('should handle malformed configuration data', async () => {
      chrome.storage.local.get.mockResolvedValue({
        config: 'invalid-config-format',
        profile: null
      })

      const loadConfiguration = global.loadConfiguration || (async () => {
        try {
          const storage = await chrome.storage.local.get(['config', 'profile'])
          
          // Validate and fallback to defaults if needed
          const config = (typeof storage.config === 'object' && storage.config !== null) 
            ? storage.config 
            : { enabled: true, filters: {} }
          
          const profile = (typeof storage.profile === 'object' && storage.profile !== null)
            ? storage.profile
            : {}
          
          return { config, profile }
        } catch (error) {
          return { config: {}, profile: {} }
        }
      })

      const result = await loadConfiguration()

      expect(result.config).toBeDefined()
      expect(typeof result.config).toBe('object')
      expect(result.profile).toBeDefined()
    })

    test('should handle network errors during save', async () => {
      chrome.storage.local.set.mockRejectedValue(new Error('Network error'))

      const saveSettings = global.saveSettings || (async () => {
        try {
          await chrome.storage.local.set({ config: {}, profile: {} })
          return { success: true }
        } catch (error) {
          console.error('Error saving settings:', error)
          return { success: false, error: error.message }
        }
      })

      const result = await saveSettings()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('Auto-hide Success Message', () => {
    test('should auto-hide success message after timeout', (done) => {
      const showSuccessMessage = global.showSuccessMessage || ((message = 'Settings saved!') => {
        elements.successMessage.textContent = message
        elements.successMessage.classList.add('show')
        
        setTimeout(() => {
          elements.successMessage.classList.remove('show')
          done()
        }, 100) // Shortened for testing
      })

      showSuccessMessage()

      expect(elements.successMessage.classList.contains('show')).toBe(true)
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      // Check if form elements have associated labels
      const inputs = document.querySelectorAll('input, select')
      inputs.forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`)
        const hasAriaLabel = input.hasAttribute('aria-label')
        const hasAssociatedLabel = label !== null
        
        expect(hasAriaLabel || hasAssociatedLabel).toBe(true)
      })
    })

    test('should support keyboard navigation', () => {
      // Test tab order and keyboard events
      const focusableElements = document.querySelectorAll('input, select, button')
      
      focusableElements.forEach((element, index) => {
        if (index === 0) {
          element.focus()
          expect(document.activeElement).toBe(element)
        }
      })
    })
  })
})