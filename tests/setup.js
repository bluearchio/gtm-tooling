/**
 * Jest Setup File
 * Configures testing environment with Chrome extension mocks and global utilities
 */

import 'jest-webextension-mock'
import sinon from 'sinon'

// Mock Chrome Extension APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getURL: jest.fn(path => `chrome-extension://test-id/${path}`),
    lastError: null,
    id: 'test-extension-id'
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    sendMessage: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    }
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn()
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    clearAll: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setIcon: jest.fn()
  }
}

// Mock DOM APIs
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback
  }
  
  observe() {
    // Mock implementation
  }
  
  disconnect() {
    // Mock implementation
  }
}

// Mock DataTransfer for file uploads
global.DataTransfer = class DataTransfer {
  constructor() {
    this.items = {
      add: jest.fn()
    }
    this.files = []
  }
}

// Mock File API
global.File = class File {
  constructor(parts, name, options = {}) {
    this.name = name
    this.type = options.type || ''
    this.size = parts.reduce((size, part) => size + part.length, 0)
    this.lastModified = Date.now()
  }
}

// Mock mouse and keyboard events
global.MouseEvent = class MouseEvent extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict)
    this.clientX = eventInitDict.clientX || 0
    this.clientY = eventInitDict.clientY || 0
    this.bubbles = eventInitDict.bubbles || false
    this.cancelable = eventInitDict.cancelable || false
  }
}

global.KeyboardEvent = class KeyboardEvent extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict)
    this.key = eventInitDict.key || ''
    this.bubbles = eventInitDict.bubbles || false
  }
}

// Mock console to suppress logs during tests unless in verbose mode
if (!process.env.VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}

// Global test utilities
global.createMockElement = (tagName, attributes = {}, children = []) => {
  const element = document.createElement(tagName)
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'textContent') {
      element.textContent = value
    } else if (key === 'innerHTML') {
      element.innerHTML = value
    } else {
      element.setAttribute(key, value)
    }
  })
  
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child))
    } else {
      element.appendChild(child)
    }
  })
  
  return element
}

global.createMockLinkedInPage = (pageType) => {
  document.body.innerHTML = ''
  
  switch (pageType) {
    case 'job-search':
      return createJobSearchPage()
    case 'job-detail':
      return createJobDetailPage()
    case 'application-form':
      return createApplicationFormPage()
    default:
      return document.body
  }
}

function createJobSearchPage() {
  const container = createMockElement('div', { class: 'jobs-search-results-list' })
  
  // Create multiple job cards
  for (let i = 1; i <= 5; i++) {
    const jobCard = createMockElement('div', {
      class: 'jobs-search-results__list-item',
      'data-job-id': `job-${i}`
    })
    
    const title = createMockElement('h3', {
      class: 'job-card-list__title',
      textContent: `Software Engineer ${i}`
    })
    
    const company = createMockElement('a', {
      class: 'job-card-container__company-name',
      textContent: `Company ${i}`
    })
    
    const location = createMockElement('span', {
      class: 'job-card-container__metadata-item',
      textContent: i % 2 === 0 ? 'Remote' : `City ${i}, State`
    })
    
    const easyApply = createMockElement('span', {
      class: 'job-card-container__apply-method--easy-apply',
      textContent: 'Easy Apply'
    })
    
    jobCard.appendChild(title)
    jobCard.appendChild(company)
    jobCard.appendChild(location)
    if (i % 3 === 0) jobCard.appendChild(easyApply) // Some jobs have easy apply
    
    container.appendChild(jobCard)
  }
  
  document.body.appendChild(container)
  return container
}

function createJobDetailPage() {
  const container = createMockElement('div', { class: 'jobs-unified-top-card' })
  
  const title = createMockElement('h1', {
    class: 'jobs-unified-top-card__job-title',
    textContent: 'Senior Software Engineer'
  })
  
  const company = createMockElement('a', {
    class: 'jobs-unified-top-card__company-name',
    textContent: 'Tech Company Inc.'
  })
  
  const location = createMockElement('span', {
    class: 'jobs-unified-top-card__bullet',
    textContent: 'San Francisco, CA (Remote)'
  })
  
  const description = createMockElement('div', {
    class: 'jobs-description__content',
    innerHTML: `
      <p>We are looking for a Senior Software Engineer...</p>
      <h3>Requirements:</h3>
      <ul>
        <li>5+ years of experience in software development</li>
        <li>Experience with React, Node.js</li>
        <li>Strong problem-solving skills</li>
      </ul>
      <h3>Benefits:</h3>
      <ul>
        <li>Competitive salary</li>
        <li>Health insurance</li>
        <li>Remote work options</li>
      </ul>
    `
  })
  
  const easyApplyButton = createMockElement('button', {
    'aria-label': 'Easy Apply to Senior Software Engineer',
    class: 'jobs-apply-button--top-card',
    textContent: 'Easy Apply'
  })
  
  container.appendChild(title)
  container.appendChild(company)
  container.appendChild(location)
  container.appendChild(description)
  container.appendChild(easyApplyButton)
  
  document.body.appendChild(container)
  return container
}

function createApplicationFormPage() {
  const modal = createMockElement('div', { class: 'jobs-easy-apply-modal' })
  const form = createMockElement('form')
  
  // Personal information fields
  const firstNameInput = createMockElement('input', {
    type: 'text',
    name: 'firstName',
    id: 'firstName',
    required: 'true'
  })
  const firstNameLabel = createMockElement('label', {
    for: 'firstName',
    textContent: 'First Name *'
  })
  
  const lastNameInput = createMockElement('input', {
    type: 'text',
    name: 'lastName',
    id: 'lastName',
    required: 'true'
  })
  const lastNameLabel = createMockElement('label', {
    for: 'lastName',
    textContent: 'Last Name *'
  })
  
  const emailInput = createMockElement('input', {
    type: 'email',
    name: 'email',
    id: 'email',
    required: 'true'
  })
  const emailLabel = createMockElement('label', {
    for: 'email',
    textContent: 'Email Address *'
  })
  
  // Work authorization radio buttons
  const workAuthLabel = createMockElement('label', {
    textContent: 'Are you legally authorized to work in the United States? *'
  })
  
  const workAuthYes = createMockElement('input', {
    type: 'radio',
    name: 'workAuth',
    value: 'yes',
    required: 'true'
  })
  const workAuthYesLabel = createMockElement('label', { textContent: 'Yes' })
  
  const workAuthNo = createMockElement('input', {
    type: 'radio',
    name: 'workAuth',
    value: 'no',
    required: 'true'
  })
  const workAuthNoLabel = createMockElement('label', { textContent: 'No' })
  
  // Experience dropdown
  const experienceSelect = createMockElement('select', {
    name: 'experience',
    id: 'experience',
    required: 'true'
  })
  const experienceLabel = createMockElement('label', {
    for: 'experience',
    textContent: 'Years of Experience *'
  })
  
  const expOptions = ['', '0-1 years', '2-4 years', '5-7 years', '8+ years']
  expOptions.forEach(option => {
    const optionElement = createMockElement('option', {
      value: option,
      textContent: option
    })
    experienceSelect.appendChild(optionElement)
  })
  
  // File upload
  const resumeInput = createMockElement('input', {
    type: 'file',
    name: 'resume',
    id: 'resume',
    accept: '.pdf,.doc,.docx'
  })
  const resumeLabel = createMockElement('label', {
    for: 'resume',
    textContent: 'Upload Resume'
  })
  
  // Submit button
  const submitButton = createMockElement('button', {
    type: 'submit',
    'aria-label': 'Submit application',
    textContent: 'Submit Application'
  })
  
  // Assemble form
  form.appendChild(firstNameLabel)
  form.appendChild(firstNameInput)
  form.appendChild(lastNameLabel)
  form.appendChild(lastNameInput)
  form.appendChild(emailLabel)
  form.appendChild(emailInput)
  form.appendChild(workAuthLabel)
  form.appendChild(workAuthYes)
  form.appendChild(workAuthYesLabel)
  form.appendChild(workAuthNo)
  form.appendChild(workAuthNoLabel)
  form.appendChild(experienceLabel)
  form.appendChild(experienceSelect)
  form.appendChild(resumeLabel)
  form.appendChild(resumeInput)
  form.appendChild(submitButton)
  
  modal.appendChild(form)
  document.body.appendChild(modal)
  
  return modal
}

// Setup and teardown helpers
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks()
  sinon.restore()
  
  // Reset DOM
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  
  // Reset location
  delete window.location
  window.location = {
    href: 'https://www.linkedin.com/jobs/search/',
    pathname: '/jobs/search/',
    search: '',
    hash: ''
  }
  
  // Reset chrome.runtime.lastError
  chrome.runtime.lastError = null
})

afterEach(() => {
  // Additional cleanup if needed
  jest.clearAllTimers()
})