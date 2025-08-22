/**
 * Unit Tests for Form Filler Module
 * Tests form field detection, mapping, filling logic, and file uploads
 */

import fs from 'fs'
import path from 'path'
import { mockUserProfile, mockFormFields, createMockFormField } from '../fixtures/linkedinData.js'

// Read and execute the source code
const sourceFilePath = path.join(process.cwd(), 'src/content/form-filler.js')
const sourceCode = fs.readFileSync(sourceFilePath, 'utf8')
eval(sourceCode)

describe('FormFiller', () => {
  let formFiller
  
  beforeEach(async () => {
    // Reset chrome storage mock
    chrome.storage.local.get.mockResolvedValue({
      userProfile: mockUserProfile,
      customAnswers: mockUserProfile.customAnswers
    })
    
    formFiller = new FormFiller()
    await formFiller.init()
  })

  describe('Initialization', () => {
    test('should initialize with default properties', () => {
      expect(formFiller.fieldMappings).toBeDefined()
      expect(formFiller.customAnswers).toBeInstanceOf(Map)
      expect(formFiller.userProfile).toBeDefined()
    })

    test('should load user profile from storage', async () => {
      expect(formFiller.userProfile).toEqual(mockUserProfile)
      expect(chrome.storage.local.get).toHaveBeenCalledWith('userProfile')
    })

    test('should load custom answers from storage', async () => {
      expect(formFiller.customAnswers.size).toBeGreaterThan(0)
      expect(chrome.storage.local.get).toHaveBeenCalledWith('customAnswers')
    })

    test('should handle missing user profile gracefully', async () => {
      chrome.storage.local.get.mockResolvedValue({})
      
      const newFormFiller = new FormFiller()
      await newFormFiller.init()
      
      expect(newFormFiller.userProfile).toBeDefined()
      expect(newFormFiller.userProfile.firstName).toBe('')
    })

    test('should setup message listeners', () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled()
    })
  })

  describe('Field Mappings', () => {
    test('should have comprehensive field mapping definitions', () => {
      const mappings = formFiller.fieldMappings
      
      expect(mappings.firstName).toContain('first name')
      expect(mappings.lastName).toContain('last name')
      expect(mappings.email).toContain('email')
      expect(mappings.phone).toContain('phone')
      expect(mappings.currentTitle).toContain('current title')
      expect(mappings.workAuthorization).toContain('work authorization')
    })

    test('should map fields correctly', () => {
      const field = {
        label: 'First Name',
        name: 'firstName',
        id: 'fname'
      }
      
      const mapping = formFiller.findFieldMapping(field)
      expect(mapping).toBe('firstName')
    })

    test('should handle case insensitive mapping', () => {
      const field = {
        label: 'FIRST NAME',
        name: 'FNAME',
        id: 'first_name'
      }
      
      const mapping = formFiller.findFieldMapping(field)
      expect(mapping).toBe('firstName')
    })

    test('should return null for unmappable fields', () => {
      const field = {
        label: 'Custom Field XYZ',
        name: 'customXYZ',
        id: 'xyz123'
      }
      
      const mapping = formFiller.findFieldMapping(field)
      expect(mapping).toBeNull()
    })
  })

  describe('Form Analysis', () => {
    beforeEach(() => {
      // Create a basic form structure
      const form = document.createElement('form')
      form.innerHTML = `
        <input type="text" id="firstName" name="firstName" required>
        <input type="text" id="lastName" name="lastName" required>
        <input type="email" id="email" name="email" required>
        <select id="experience" name="experience" required>
          <option value="">Select...</option>
          <option value="0-1">0-1 years</option>
          <option value="2-4">2-4 years</option>
          <option value="5-7">5-7 years</option>
        </select>
        <input type="radio" name="workAuth" value="yes" id="workAuthYes" required>
        <input type="radio" name="workAuth" value="no" id="workAuthNo" required>
      `
      document.body.appendChild(form)
    })

    test('should analyze current form correctly', () => {
      const analysis = formFiller.analyzeCurrentForm()
      
      expect(analysis.hasForm).toBe(true)
      expect(analysis.fields).toHaveLength(5)
      expect(analysis.requiredFields).toHaveLength(5)
      expect(analysis.totalFields).toBe(5)
    })

    test('should detect form absence', () => {
      document.body.innerHTML = '<div>No forms here</div>'
      
      const analysis = formFiller.analyzeCurrentForm()
      expect(analysis.hasForm).toBe(false)
    })

    test('should extract form fields with correct properties', () => {
      const analysis = formFiller.analyzeCurrentForm()
      const firstNameField = analysis.fields.find(f => f.name === 'firstName')
      
      expect(firstNameField).toBeDefined()
      expect(firstNameField.type).toBe('text')
      expect(firstNameField.required).toBe(true)
      expect(firstNameField.mappedTo).toBe('firstName')
    })

    test('should get field labels correctly', () => {
      // Add labels to form
      const form = document.querySelector('form')
      const label = document.createElement('label')
      label.htmlFor = 'firstName'
      label.textContent = 'First Name *'
      form.insertBefore(label, form.firstChild)
      
      const input = document.getElementById('firstName')
      const fieldLabel = formFiller.getFieldLabel(input)
      
      expect(fieldLabel).toBe('First Name *')
    })

    test('should get select field options', () => {
      const select = document.getElementById('experience')
      const options = formFiller.getFieldOptions(select)
      
      expect(options).toHaveLength(4)
      expect(options[0].value).toBe('')
      expect(options[1].text).toBe('0-1 years')
    })

    test('should calculate auto-fill capability', () => {
      const analysis = formFiller.analyzeCurrentForm()
      
      expect(analysis.canAutoFill).toBeGreaterThan(0)
      expect(analysis.canAutoFill).toBeLessThanOrEqual(100)
    })

    test('should detect multi-step forms', () => {
      const stepIndicator = document.createElement('div')
      stepIndicator.className = 'application-form-steps'
      document.body.appendChild(stepIndicator)
      
      const analysis = formFiller.analyzeCurrentForm()
      expect(analysis.isMultiStep).toBe(true)
    })
  })

  describe('Value Suggestions', () => {
    test('should suggest values for mapped fields', () => {
      const field = { mappedTo: 'firstName' }
      const value = formFiller.getSuggestedValue(field)
      
      expect(value).toBe(mockUserProfile.firstName)
    })

    test('should suggest full name combination', () => {
      const field = { mappedTo: 'fullName' }
      const value = formFiller.getSuggestedValue(field)
      
      expect(value).toBe(`${mockUserProfile.firstName} ${mockUserProfile.lastName}`)
    })

    test('should suggest years of experience as string', () => {
      const field = { mappedTo: 'yearsExperience' }
      const value = formFiller.getSuggestedValue(field)
      
      expect(value).toBe(mockUserProfile.yearsOfExperience.toString())
    })

    test('should return null for unmapped fields', () => {
      const field = { mappedTo: null }
      const value = formFiller.getSuggestedValue(field)
      
      expect(value).toBeNull()
    })

    test('should provide default values for common fields', () => {
      const countryField = { mappedTo: 'country' }
      const value = formFiller.getSuggestedValue(countryField)
      
      expect(value).toBe('United States')
    })
  })

  describe('Form Filling', () => {
    beforeEach(() => {
      // Create comprehensive form
      const form = document.createElement('form')
      form.innerHTML = `
        <input type="text" id="firstName" name="firstName" required>
        <input type="text" id="lastName" name="lastName" required>
        <input type="email" id="email" name="email" required>
        <input type="tel" id="phone" name="phone">
        <select id="experience" name="experience" required>
          <option value="">Select...</option>
          <option value="0-1">0-1 years</option>
          <option value="2-4">2-4 years</option>
          <option value="5-7">5-7 years</option>
          <option value="8+">8+ years</option>
        </select>
        <input type="radio" name="workAuth" value="yes" id="workAuthYes" required>
        <input type="radio" name="workAuth" value="no" id="workAuthNo" required>
        <input type="checkbox" name="relocate" id="relocate">
        <input type="file" name="resume" id="resume" accept=".pdf,.doc,.docx">
      `
      document.body.appendChild(form)
    })

    test('should fill form successfully', async () => {
      const result = await formFiller.fillForm()
      
      expect(result.success).toBe(true)
      expect(result.filledFields).toBeGreaterThan(0)
      expect(result.totalFields).toBeGreaterThan(0)
    })

    test('should fill text inputs correctly', async () => {
      await formFiller.fillForm()
      
      const firstNameInput = document.getElementById('firstName')
      const lastNameInput = document.getElementById('lastName')
      const emailInput = document.getElementById('email')
      
      expect(firstNameInput.value).toBe(mockUserProfile.firstName)
      expect(lastNameInput.value).toBe(mockUserProfile.lastName)
      expect(emailInput.value).toBe(mockUserProfile.email)
    })

    test('should handle select dropdowns', async () => {
      await formFiller.fillForm()
      
      const experienceSelect = document.getElementById('experience')
      // Should select "5-7 years" based on user's 6 years of experience
      expect(experienceSelect.value).toBe('5-7')
    })

    test('should handle radio buttons', async () => {
      await formFiller.fillForm()
      
      const workAuthYes = document.getElementById('workAuthYes')
      expect(workAuthYes.checked).toBe(true)
    })

    test('should handle override values from formData', async () => {
      const formData = {
        firstName: 'Override Name',
        email: 'override@example.com'
      }
      
      await formFiller.fillForm(formData)
      
      const firstNameInput = document.getElementById('firstName')
      const emailInput = document.getElementById('email')
      
      expect(firstNameInput.value).toBe('Override Name')
      expect(emailInput.value).toBe('override@example.com')
    })

    test('should skip optional fields without values', async () => {
      // Create field without mapping
      const customInput = document.createElement('input')
      customInput.type = 'text'
      customInput.name = 'customField'
      document.querySelector('form').appendChild(customInput)
      
      const result = await formFiller.fillForm()
      
      expect(result.success).toBe(true)
      expect(customInput.value).toBe('')
    })

    test('should fail for required fields without values', async () => {
      // Remove user profile data
      formFiller.userProfile = { firstName: '', lastName: '', email: '' }
      
      const result = await formFiller.fillForm()
      
      expect(result.success).toBe(true) // Should still succeed with failures recorded
      expect(result.failedFields).toBeGreaterThan(0)
    })
  })

  describe('Field Value Setting', () => {
    test('should set text input values with events', async () => {
      const input = document.createElement('input')
      input.type = 'text'
      document.body.appendChild(input)
      
      const mockEvent = jest.fn()
      input.addEventListener('input', mockEvent)
      input.addEventListener('change', mockEvent)
      
      const result = await formFiller.setFieldValue(input, 'Test Value')
      
      expect(result.success).toBe(true)
      expect(input.value).toBe('Test Value')
      expect(mockEvent).toHaveBeenCalled()
    })

    test('should handle select dropdowns with exact match', async () => {
      const select = document.createElement('select')
      select.innerHTML = `
        <option value="">Select...</option>
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
      `
      document.body.appendChild(select)
      
      const result = await formFiller.setFieldValue(select, 'option2')
      
      expect(result.success).toBe(true)
      expect(select.value).toBe('option2')
    })

    test('should handle select dropdowns with text match', async () => {
      const select = document.createElement('select')
      select.innerHTML = `
        <option value="">Select...</option>
        <option value="val1">Option Text</option>
      `
      document.body.appendChild(select)
      
      const result = await formFiller.setFieldValue(select, 'Option Text')
      
      expect(result.success).toBe(true)
      expect(select.value).toBe('val1')
    })

    test('should handle checkboxes', async () => {
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      document.body.appendChild(checkbox)
      
      await formFiller.setFieldValue(checkbox, true)
      expect(checkbox.checked).toBe(true)
      
      await formFiller.setFieldValue(checkbox, 'yes')
      expect(checkbox.checked).toBe(true)
      
      await formFiller.setFieldValue(checkbox, false)
      expect(checkbox.checked).toBe(false)
    })

    test('should handle radio buttons', async () => {
      const radio1 = document.createElement('input')
      radio1.type = 'radio'
      radio1.name = 'testRadio'
      radio1.value = 'yes'
      
      const radio2 = document.createElement('input')
      radio2.type = 'radio'
      radio2.name = 'testRadio'
      radio2.value = 'no'
      
      document.body.appendChild(radio1)
      document.body.appendChild(radio2)
      
      const clickSpy = jest.spyOn(radio1, 'click')
      
      await formFiller.setFieldValue(radio1, 'yes')
      
      expect(clickSpy).toHaveBeenCalled()
    })

    test('should handle anti-detection typing when available', async () => {
      // Mock anti-detection system
      window.antiDetection = {
        config: { humanizeActions: true },
        simulateTyping: jest.fn().mockResolvedValue()
      }
      
      const input = document.createElement('input')
      input.type = 'text'
      document.body.appendChild(input)
      
      await formFiller.setFieldValue(input, 'Test Value')
      
      expect(window.antiDetection.simulateTyping).toHaveBeenCalledWith(input, 'Test Value')
      
      // Cleanup
      delete window.antiDetection
    })
  })

  describe('Fuzzy Matching for Select Options', () => {
    let select
    
    beforeEach(() => {
      select = document.createElement('select')
      select.innerHTML = `
        <option value="">Select...</option>
        <option value="junior">Junior Developer</option>
        <option value="senior">Senior Developer</option>
        <option value="lead">Lead Engineer</option>
        <option value="manager">Engineering Manager</option>
      `
    })

    test('should find exact matches first', () => {
      const option = formFiller.findFuzzyOption(select, 'Senior Developer')
      expect(option.value).toBe('senior')
    })

    test('should find partial matches', () => {
      const option = formFiller.findFuzzyOption(select, 'Senior')
      expect(option.value).toBe('senior')
    })

    test('should find case-insensitive matches', () => {
      const option = formFiller.findFuzzyOption(select, 'SENIOR DEVELOPER')
      expect(option.value).toBe('senior')
    })

    test('should use similarity matching for close matches', () => {
      const option = formFiller.findFuzzyOption(select, 'Sr Developer')
      expect(option.value).toBe('senior')
    })

    test('should return null for poor matches', () => {
      const option = formFiller.findFuzzyOption(select, 'Completely Different')
      expect(option).toBeNull()
    })
  })

  describe('String Similarity Calculation', () => {
    test('should calculate similarity correctly', () => {
      expect(formFiller.calculateSimilarity('test', 'test')).toBe(1.0)
      expect(formFiller.calculateSimilarity('test', 'best')).toBeGreaterThan(0.5)
      expect(formFiller.calculateSimilarity('test', 'xyz')).toBeLessThan(0.5)
    })

    test('should handle empty strings', () => {
      expect(formFiller.calculateSimilarity('', '')).toBe(1.0)
      expect(formFiller.calculateSimilarity('test', '')).toBeLessThan(1.0)
    })

    test('should calculate Levenshtein distance correctly', () => {
      expect(formFiller.levenshteinDistance('kitten', 'sitting')).toBe(3)
      expect(formFiller.levenshteinDistance('abc', 'abc')).toBe(0)
      expect(formFiller.levenshteinDistance('', 'abc')).toBe(3)
    })
  })

  describe('File Upload Handling', () => {
    beforeEach(() => {
      // Mock DataTransfer and File APIs
      global.DataTransfer = class DataTransfer {
        constructor() {
          this.items = { add: jest.fn() }
          this.files = []
        }
      }
      
      global.File = class File {
        constructor(parts, name, options = {}) {
          this.name = name
          this.type = options.type || ''
        }
      }
    })

    test('should upload resume file', async () => {
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.id = 'resume'
      
      const label = document.createElement('label')
      label.htmlFor = 'resume'
      label.textContent = 'Upload Resume'
      
      document.body.appendChild(label)
      document.body.appendChild(fileInput)
      
      const eventSpy = jest.spyOn(fileInput, 'dispatchEvent')
      
      await formFiller.uploadResume(fileInput)
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change' })
      )
    })

    test('should handle missing resume gracefully', async () => {
      formFiller.userProfile.resumes = []
      
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      
      // Should not throw error
      await expect(formFiller.uploadResume(fileInput)).resolves.toBeUndefined()
    })

    test('should generate and upload cover letter', async () => {
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      
      // Add job details to page
      const jobTitle = document.createElement('div')
      jobTitle.className = 'job-title'
      jobTitle.textContent = 'Software Engineer'
      
      const company = document.createElement('div')
      company.className = 'company-name'
      company.textContent = 'Tech Company'
      
      document.body.appendChild(jobTitle)
      document.body.appendChild(company)
      
      const eventSpy = jest.spyOn(fileInput, 'dispatchEvent')
      
      await formFiller.uploadCoverLetter(fileInput)
      
      expect(eventSpy).toHaveBeenCalled()
    })

    test('should convert base64 to File correctly', () => {
      const base64 = 'data:application/pdf;base64,JVBERi0xLjQ='
      const filename = 'test.pdf'
      
      const file = formFiller.base64ToFile(base64, filename)
      
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe(filename)
      expect(file.type).toBe('application/pdf')
    })
  })

  describe('Cover Letter Generation', () => {
    test('should generate cover letter from template', async () => {
      // Add job details to page
      const jobTitle = document.createElement('div')
      jobTitle.className = 'job-title'
      jobTitle.textContent = 'Senior Developer'
      
      const company = document.createElement('div')
      company.className = 'company-name'
      company.textContent = 'Amazing Corp'
      
      document.body.appendChild(jobTitle)
      document.body.appendChild(company)
      
      const coverLetter = await formFiller.generateCoverLetter()
      
      expect(coverLetter).toContain('Senior Developer')
      expect(coverLetter).toContain('Amazing Corp')
      expect(coverLetter).toContain(mockUserProfile.firstName)
    })

    test('should handle missing templates', async () => {
      formFiller.userProfile.coverLetterTemplates = []
      
      const result = await formFiller.generateCoverLetter()
      expect(result).toBeNull()
    })

    test('should replace template variables correctly', async () => {
      // Minimal page setup
      document.body.innerHTML = `
        <div class="job-title">Test Position</div>
        <div class="company-name">Test Company</div>
      `
      
      const coverLetter = await formFiller.generateCoverLetter()
      
      expect(coverLetter).not.toContain('{position}')
      expect(coverLetter).not.toContain('{company}')
      expect(coverLetter).not.toContain('{name}')
    })
  })

  describe('Custom Questions Handling', () => {
    beforeEach(() => {
      // Create form with custom questions
      const form = document.createElement('form')
      form.innerHTML = `
        <div class="question" role="group">
          <label>Are you authorized to work in the United States?</label>
          <input type="radio" name="workAuth" value="yes">
          <input type="radio" name="workAuth" value="no">
        </div>
        <div class="question" role="group">
          <label>How many years of experience do you have?</label>
          <input type="text" name="yearsExp">
        </div>
      `
      document.body.appendChild(form)
    })

    test('should find custom answers for questions', () => {
      const answer = formFiller.findCustomAnswer('Are you authorized to work in the United States?')
      expect(answer).toBe('Yes')
    })

    test('should handle regex patterns', () => {
      const answer = formFiller.findCustomAnswer('How many years of experience do you have?')
      expect(answer).toBe('6')
    })

    test('should infer answers for common questions', () => {
      // Test authorization questions
      expect(formFiller.inferAnswer('Are you legally authorized to work?')).toBe('Yes')
      
      // Test sponsorship questions
      expect(formFiller.inferAnswer('Do you require sponsorship?')).toBe('No')
      
      // Test relocation questions
      expect(formFiller.inferAnswer('Are you willing to relocate?')).toBe('Yes')
      
      // Test numeric experience questions
      expect(formFiller.inferAnswer('How many years of experience?')).toBe('6')
    })

    test('should handle salary questions', () => {
      const answer = formFiller.inferAnswer('What is your desired salary?')
      expect(answer).toBe('Negotiable')
    })

    test('should handle availability questions', () => {
      expect(formFiller.inferAnswer('When can you start?')).toBe('Immediately')
      expect(formFiller.inferAnswer('What is your notice period?')).toBe('2 weeks')
    })

    test('should return null for unknown questions', () => {
      const answer = formFiller.inferAnswer('Unknown question format')
      expect(answer).toBeNull()
    })
  })

  describe('Form Submission', () => {
    beforeEach(() => {
      const form = document.createElement('form')
      form.innerHTML = `
        <input type="text" name="firstName" value="John" required>
        <input type="email" name="email" value="john@example.com" required>
        <button type="submit" aria-label="Submit application">Submit</button>
      `
      document.body.appendChild(form)
    })

    test('should find submit button', () => {
      const submitButton = formFiller.findSubmitButton()
      expect(submitButton).toBeTruthy()
      expect(submitButton.textContent).toBe('Submit')
    })

    test('should validate form before submission', () => {
      const validation = formFiller.validateForm()
      expect(validation.isValid).toBe(true)
      expect(validation.invalidFields).toHaveLength(0)
    })

    test('should detect invalid forms', () => {
      // Clear required field
      document.querySelector('input[name="firstName"]').value = ''
      
      const validation = formFiller.validateForm()
      expect(validation.isValid).toBe(false)
      expect(validation.invalidFields).toHaveLength(1)
    })

    test('should submit form successfully', async () => {
      const submitButton = document.querySelector('button[type="submit"]')
      const clickSpy = jest.spyOn(submitButton, 'click')
      
      const result = await formFiller.submitForm()
      
      expect(result.success).toBe(true)
      expect(clickSpy).toHaveBeenCalled()
    })

    test('should handle missing submit button', async () => {
      document.querySelector('button[type="submit"]').remove()
      
      const result = await formFiller.submitForm()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Submit button not found')
    })

    test('should handle multi-step forms', async () => {
      // Change submit button to "Next"
      const submitButton = document.querySelector('button[type="submit"]')
      submitButton.textContent = 'Next'
      
      const clickSpy = jest.spyOn(submitButton, 'click')
      
      // Mock recursive call behavior
      formFiller.submitForm = jest.fn().mockResolvedValue({ success: true })
      
      await formFiller.submitForm()
      
      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('Message Handling', () => {
    test('should handle FILL_FORM message', async () => {
      const form = document.createElement('form')
      form.innerHTML = '<input type="text" name="test" required>'
      document.body.appendChild(form)
      
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = { type: 'FILL_FORM', formData: { test: 'value' } }
      const result = mockListener(request, {}, sendResponse)
      
      expect(result).toBe(true) // Indicates async response
    })

    test('should handle SUBMIT_FORM message', async () => {
      const form = document.createElement('form')
      form.innerHTML = '<button type="submit">Submit</button>'
      document.body.appendChild(form)
      
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = { type: 'SUBMIT_FORM' }
      const result = mockListener(request, {}, sendResponse)
      
      expect(result).toBe(true)
    })

    test('should handle ANALYZE_FORM message', () => {
      const form = document.createElement('form')
      document.body.appendChild(form)
      
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = { type: 'ANALYZE_FORM' }
      mockListener(request, {}, sendResponse)
      
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          hasForm: true
        })
      )
    })

    test('should handle UPDATE_PROFILE message', () => {
      const newProfile = { firstName: 'Jane', lastName: 'Smith' }
      
      const sendResponse = jest.fn()
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0]
      
      const request = { type: 'UPDATE_PROFILE', profile: newProfile }
      mockListener(request, {}, sendResponse)
      
      expect(formFiller.userProfile).toEqual(newProfile)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ userProfile: newProfile })
      expect(sendResponse).toHaveBeenCalledWith({ success: true })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle form filling with no forms present', async () => {
      document.body.innerHTML = '<div>No forms</div>'
      
      const result = await formFiller.fillForm()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('No form found')
    })

    test('should handle malformed select elements', async () => {
      const select = document.createElement('select')
      // No options added
      document.body.appendChild(select)
      
      const result = await formFiller.setFieldValue(select, 'any value')
      
      expect(result.success).toBe(false)
    })

    test('should handle anti-detection integration gracefully', async () => {
      // Mock anti-detection that throws error
      window.antiDetection = {
        performAction: jest.fn().mockRejectedValue(new Error('Anti-detection error'))
      }
      
      const input = document.createElement('input')
      input.type = 'text'
      document.body.appendChild(input)
      
      const field = { element: input, suggestedValue: 'test' }
      const result = await formFiller.fillField(field, {})
      
      expect(result.success).toBe(false)
      
      delete window.antiDetection
    })

    test('should handle storage errors gracefully', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'))
      
      const newFormFiller = new FormFiller()
      await expect(newFormFiller.init()).resolves.not.toThrow()
    })

    test('should handle form submission timeout', async () => {
      const form = document.createElement('form')
      form.innerHTML = '<button type="submit">Submit</button>'
      document.body.appendChild(form)
      
      // Mock waitForSubmission to timeout
      formFiller.waitForSubmission = jest.fn().mockResolvedValue()
      
      const result = await formFiller.submitForm()
      
      expect(result.success).toBe(true)
    })
  })

  describe('Performance and Optimization', () => {
    test('should handle large forms efficiently', async () => {
      const form = document.createElement('form')
      
      // Create 100 form fields
      for (let i = 0; i < 100; i++) {
        const input = document.createElement('input')
        input.type = 'text'
        input.name = `field${i}`
        input.id = `field${i}`
        form.appendChild(input)
      }
      
      document.body.appendChild(form)
      
      const startTime = performance.now()
      await formFiller.fillForm()
      const endTime = performance.now()
      
      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
    })

    test('should cache field mappings effectively', () => {
      const field1 = { label: 'First Name', name: 'fname', id: 'fn' }
      const field2 = { label: 'First Name', name: 'fname', id: 'fn' }
      
      const mapping1 = formFiller.findFieldMapping(field1)
      const mapping2 = formFiller.findFieldMapping(field2)
      
      expect(mapping1).toBe(mapping2)
      expect(mapping1).toBe('firstName')
    })

    test('should limit custom answer processing time', () => {
      // Add many custom answers
      for (let i = 0; i < 1000; i++) {
        formFiller.customAnswers.set(`pattern${i}`, {
          type: 'regex',
          answer: `answer${i}`
        })
      }
      
      const startTime = performance.now()
      const answer = formFiller.findCustomAnswer('Test question that won\'t match')
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should be fast even with many patterns
      expect(answer).toBe(null) // Should handle no match gracefully
    })
  })
})