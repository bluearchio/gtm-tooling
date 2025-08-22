/**
 * Form Automation Engine - Content Script
 * Intelligently fills and submits application forms
 */

class FormFiller {
  constructor() {
    this.userProfile = null;
    this.currentForm = null;
    this.fieldMappings = this.initializeFieldMappings();
    this.customAnswers = new Map();
    this.init();
  }

  async init() {
    await this.loadUserProfile();
    await this.loadCustomAnswers();
    this.setupMessageListeners();
  }

  /**
   * Initialize field mappings for common form fields
   */
  initializeFieldMappings() {
    return {
      // Personal Information
      firstName: ['first name', 'fname', 'given name', 'first_name', 'firstname'],
      lastName: ['last name', 'lname', 'surname', 'family name', 'last_name', 'lastname'],
      fullName: ['full name', 'name', 'your name', 'full_name', 'fullname'],
      email: ['email', 'e-mail', 'email address', 'emailaddress', 'email_address'],
      phone: ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'phone_number', 'contact number'],
      
      // Professional Information
      currentTitle: ['current title', 'current position', 'job title', 'current_title', 'position', 'title'],
      currentCompany: ['current company', 'employer', 'organization', 'current_company', 'company'],
      yearsExperience: ['years of experience', 'experience', 'years', 'total experience', 'years_experience'],
      linkedIn: ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin_url', 'profile url'],
      portfolio: ['portfolio', 'website', 'personal website', 'portfolio_url', 'work samples'],
      github: ['github', 'github profile', 'github url', 'github_url'],
      
      // Education
      degree: ['degree', 'education', 'qualification', 'highest degree', 'education_level'],
      school: ['school', 'university', 'college', 'institution', 'alma mater'],
      gpa: ['gpa', 'grade', 'cgpa', 'grade point', 'academic performance'],
      graduationYear: ['graduation year', 'year of graduation', 'graduation_year', 'graduated'],
      
      // Location
      city: ['city', 'town', 'location city', 'current city'],
      state: ['state', 'province', 'region', 'state/province'],
      country: ['country', 'nation', 'country of residence'],
      zipCode: ['zip', 'postal code', 'zip code', 'postcode', 'postal_code'],
      address: ['address', 'street address', 'home address', 'residential address'],
      
      // Work Authorization
      workAuthorization: ['work authorization', 'authorization', 'visa status', 'work_authorization', 'eligible to work'],
      requireSponsorship: ['sponsorship', 'visa sponsorship', 'require sponsorship', 'need sponsorship'],
      citizenship: ['citizenship', 'citizen', 'nationality', 'citizen status'],
      
      // Availability
      startDate: ['start date', 'available from', 'availability', 'start_date', 'when can you start'],
      noticePeriod: ['notice period', 'notice', 'resignation period', 'notice_period'],
      willingToRelocate: ['relocate', 'willing to relocate', 'relocation', 'open to relocation'],
      
      // Compensation
      desiredSalary: ['desired salary', 'expected salary', 'salary expectation', 'compensation', 'salary_expectation'],
      currentSalary: ['current salary', 'current compensation', 'present salary', 'current_salary'],
      
      // Other
      coverLetter: ['cover letter', 'cover_letter', 'letter', 'motivation letter', 'application letter'],
      resume: ['resume', 'cv', 'curriculum vitae', 'upload resume', 'attach resume'],
      references: ['references', 'referees', 'reference contact'],
      skills: ['skills', 'technical skills', 'competencies', 'expertise'],
      languages: ['languages', 'language proficiency', 'spoken languages']
    };
  }

  /**
   * Load user profile from storage
   */
  async loadUserProfile() {
    try {
      const result = await chrome.storage.local.get('userProfile');
      this.userProfile = result.userProfile || {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        currentTitle: '',
        currentCompany: '',
        yearsOfExperience: 0,
        linkedInUrl: '',
        skills: [],
        education: [],
        resumes: [],
        coverLetterTemplates: []
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  /**
   * Load custom answers from storage
   */
  async loadCustomAnswers() {
    try {
      const result = await chrome.storage.local.get('customAnswers');
      const answers = result.customAnswers || [];
      answers.forEach(answer => {
        this.customAnswers.set(answer.questionPattern, answer);
      });
    } catch (error) {
      console.error('Error loading custom answers:', error);
    }
  }

  /**
   * Setup message listeners
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case 'FILL_FORM':
          this.fillForm(request.formData).then(sendResponse);
          return true;
          
        case 'SUBMIT_FORM':
          this.submitForm().then(sendResponse);
          return true;
          
        case 'ANALYZE_FORM':
          const analysis = this.analyzeCurrentForm();
          sendResponse(analysis);
          break;
          
        case 'UPDATE_PROFILE':
          this.userProfile = request.profile;
          chrome.storage.local.set({ userProfile: this.userProfile });
          sendResponse({ success: true });
          break;
      }
    });
  }

  /**
   * Analyze current form on the page
   */
  analyzeCurrentForm() {
    const formElements = document.querySelectorAll('form, [role="form"], .application-form');
    if (formElements.length === 0) {
      return { hasForm: false };
    }

    const form = formElements[0];
    const fields = this.extractFormFields(form);
    const requiredFields = fields.filter(f => f.required);
    const canAutoFill = this.calculateAutoFillCapability(fields);

    return {
      hasForm: true,
      fields: fields,
      requiredFields: requiredFields,
      totalFields: fields.length,
      canAutoFill: canAutoFill,
      formId: form.id || form.className,
      isMultiStep: this.detectMultiStepForm(form)
    };
  }

  /**
   * Extract all form fields
   */
  extractFormFields(form) {
    const fields = [];
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input.type === 'hidden' || input.type === 'submit') return;
      
      const field = {
        element: input,
        id: input.id,
        name: input.name,
        type: input.type || input.tagName.toLowerCase(),
        label: this.getFieldLabel(input),
        required: input.required || input.getAttribute('aria-required') === 'true',
        value: input.value,
        placeholder: input.placeholder,
        pattern: input.pattern,
        maxLength: input.maxLength,
        options: this.getFieldOptions(input)
      };
      
      field.mappedTo = this.findFieldMapping(field);
      field.suggestedValue = this.getSuggestedValue(field);
      
      fields.push(field);
    });
    
    return fields;
  }

  /**
   * Get field label
   */
  getFieldLabel(input) {
    // Try label element
    const label = input.labels?.[0] || 
                 document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent.trim();
    
    // Try aria-label
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    // Try aria-labelledby
    const labelledBy = input.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent.trim();
    }
    
    // Try placeholder
    if (input.placeholder) return input.placeholder;
    
    // Try adjacent text
    const prev = input.previousElementSibling;
    if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN')) {
      return prev.textContent.trim();
    }
    
    // Try parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return parentLabel.textContent.replace(input.outerHTML, '').trim();
    }
    
    return input.name || input.id || '';
  }

  /**
   * Get field options for select elements
   */
  getFieldOptions(input) {
    if (input.tagName !== 'SELECT') return null;
    
    return Array.from(input.options).map(option => ({
      value: option.value,
      text: option.textContent.trim(),
      selected: option.selected
    }));
  }

  /**
   * Find field mapping based on label and attributes
   */
  findFieldMapping(field) {
    const searchText = `${field.label} ${field.name} ${field.id} ${field.placeholder}`.toLowerCase();
    
    for (const [key, patterns] of Object.entries(this.fieldMappings)) {
      for (const pattern of patterns) {
        if (searchText.includes(pattern.toLowerCase())) {
          return key;
        }
      }
    }
    
    return null;
  }

  /**
   * Get suggested value for a field
   */
  getSuggestedValue(field) {
    if (!field.mappedTo || !this.userProfile) return null;
    
    switch (field.mappedTo) {
      case 'firstName':
        return this.userProfile.firstName;
      case 'lastName':
        return this.userProfile.lastName;
      case 'fullName':
        return `${this.userProfile.firstName} ${this.userProfile.lastName}`.trim();
      case 'email':
        return this.userProfile.email;
      case 'phone':
        return this.userProfile.phone;
      case 'currentTitle':
        return this.userProfile.currentTitle;
      case 'currentCompany':
        return this.userProfile.currentCompany;
      case 'yearsExperience':
        return this.userProfile.yearsOfExperience?.toString();
      case 'linkedIn':
        return this.userProfile.linkedInUrl;
      case 'city':
        return this.userProfile.city;
      case 'state':
        return this.userProfile.state;
      case 'country':
        return this.userProfile.country || 'United States';
      case 'zipCode':
        return this.userProfile.zipCode;
      case 'workAuthorization':
        return this.userProfile.workAuthorization || 'Authorized to work in the US';
      case 'requireSponsorship':
        return this.userProfile.requireSponsorship || 'No';
      case 'willingToRelocate':
        return this.userProfile.willingToRelocate || 'Yes';
      case 'startDate':
        return this.userProfile.startDate || 'Immediately';
      case 'noticePeriod':
        return this.userProfile.noticePeriod || '2 weeks';
      case 'skills':
        return this.userProfile.skills?.join(', ');
      default:
        return null;
    }
  }

  /**
   * Calculate auto-fill capability percentage
   */
  calculateAutoFillCapability(fields) {
    const fillableFields = fields.filter(f => f.suggestedValue !== null);
    const requiredFields = fields.filter(f => f.required);
    const fillableRequired = requiredFields.filter(f => f.suggestedValue !== null);
    
    if (requiredFields.length === 0) {
      return fields.length > 0 ? (fillableFields.length / fields.length) * 100 : 0;
    }
    
    return (fillableRequired.length / requiredFields.length) * 100;
  }

  /**
   * Detect multi-step form
   */
  detectMultiStepForm(form) {
    const indicators = [
      form.querySelector('[class*="step"]'),
      form.querySelector('[class*="progress"]'),
      form.querySelector('[class*="wizard"]'),
      form.querySelector('[role="progressbar"]'),
      document.querySelector('.application-form-steps')
    ];
    
    return indicators.some(indicator => indicator !== null);
  }

  /**
   * Fill form with user data
   */
  async fillForm(formData = {}) {
    try {
      const analysis = this.analyzeCurrentForm();
      if (!analysis.hasForm) {
        return { success: false, error: 'No form found on page' };
      }
      
      const filledFields = [];
      const failedFields = [];
      
      for (const field of analysis.fields) {
        const result = await this.fillField(field, formData);
        if (result.success) {
          filledFields.push(field);
        } else {
          failedFields.push({ field, error: result.error });
        }
      }
      
      // Handle file uploads
      await this.handleFileUploads();
      
      // Handle custom questions
      await this.handleCustomQuestions();
      
      return {
        success: true,
        filledFields: filledFields.length,
        failedFields: failedFields.length,
        failures: failedFields,
        totalFields: analysis.fields.length
      };
      
    } catch (error) {
      console.error('Error filling form:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fill individual field
   */
  async fillField(field, formData) {
    try {
      // Check for override value in formData
      const overrideValue = formData[field.name] || formData[field.id];
      const value = overrideValue || field.suggestedValue;
      
      if (!value && field.required) {
        // Try to find answer from custom answers
        const customAnswer = this.findCustomAnswer(field.label);
        if (customAnswer) {
          return await this.setFieldValue(field.element, customAnswer);
        }
        
        return { success: false, error: 'No value available for required field' };
      }
      
      if (!value) {
        return { success: true }; // Skip optional fields without values
      }
      
      // Use anti-detection system for human-like interaction
      if (window.antiDetection) {
        return await window.antiDetection.performAction('form_fill', async () => {
          return await this.setFieldValue(field.element, value);
        });
      } else {
        return await this.setFieldValue(field.element, value);
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set field value with proper events
   */
  async setFieldValue(element, value) {
    try {
      // Focus the element
      element.focus();
      await this.sleep(100);
      
      if (element.tagName === 'SELECT') {
        // Handle select dropdown
        const option = Array.from(element.options).find(opt => 
          opt.value === value || opt.textContent.trim() === value
        );
        
        if (option) {
          element.value = option.value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Try fuzzy matching
          const fuzzyOption = this.findFuzzyOption(element, value);
          if (fuzzyOption) {
            element.value = fuzzyOption.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            return { success: false, error: 'Option not found in dropdown' };
          }
        }
      } else if (element.type === 'checkbox') {
        // Handle checkbox
        const shouldCheck = value === true || value === 'true' || value === 'yes' || value === '1';
        if (element.checked !== shouldCheck) {
          element.click();
        }
      } else if (element.type === 'radio') {
        // Handle radio button
        const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
        radioGroup.forEach(radio => {
          if (radio.value === value || radio.getAttribute('aria-label') === value) {
            radio.click();
          }
        });
      } else if (window.antiDetection && window.antiDetection.config.humanizeActions) {
        // Use human-like typing for text inputs
        await window.antiDetection.simulateTyping(element, value.toString());
      } else {
        // Regular text input
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Blur the element
      await this.sleep(100);
      element.blur();
      
      // Trigger validation
      if (element.form) {
        element.form.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find fuzzy matching option in select
   */
  findFuzzyOption(selectElement, value) {
    const normalizedValue = value.toString().toLowerCase();
    const options = Array.from(selectElement.options);
    
    // Exact match first
    let match = options.find(opt => 
      opt.value.toLowerCase() === normalizedValue ||
      opt.textContent.trim().toLowerCase() === normalizedValue
    );
    
    if (match) return match;
    
    // Partial match
    match = options.find(opt => 
      opt.value.toLowerCase().includes(normalizedValue) ||
      opt.textContent.trim().toLowerCase().includes(normalizedValue) ||
      normalizedValue.includes(opt.value.toLowerCase()) ||
      normalizedValue.includes(opt.textContent.trim().toLowerCase())
    );
    
    if (match) return match;
    
    // Similarity matching
    const similarities = options.map(opt => ({
      option: opt,
      similarity: this.calculateSimilarity(normalizedValue, opt.textContent.trim().toLowerCase())
    }));
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    if (similarities[0]?.similarity > 0.6) {
      return similarities[0].option;
    }
    
    return null;
  }

  /**
   * Calculate string similarity (Levenshtein distance based)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Handle file uploads (resume, cover letter, etc.)
   */
  async handleFileUploads() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    for (const input of fileInputs) {
      const label = this.getFieldLabel(input).toLowerCase();
      
      if (label.includes('resume') || label.includes('cv')) {
        await this.uploadResume(input);
      } else if (label.includes('cover') || label.includes('letter')) {
        await this.uploadCoverLetter(input);
      }
    }
  }

  /**
   * Upload resume file
   */
  async uploadResume(input) {
    if (!this.userProfile.resumes || this.userProfile.resumes.length === 0) {
      console.warn('No resume available for upload');
      return;
    }
    
    const defaultResume = this.userProfile.resumes.find(r => r.isDefault) || this.userProfile.resumes[0];
    
    // Convert base64 to File object
    const file = this.base64ToFile(defaultResume.fileData, defaultResume.fileName);
    
    // Create FileList-like object
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    // Set files on input
    input.files = dataTransfer.files;
    
    // Trigger change event
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('Resume uploaded:', defaultResume.fileName);
  }

  /**
   * Upload cover letter
   */
  async uploadCoverLetter(input) {
    // Generate cover letter based on job details
    const coverLetter = await this.generateCoverLetter();
    
    if (!coverLetter) {
      console.warn('Could not generate cover letter');
      return;
    }
    
    // Convert text to file
    const file = new File([coverLetter], 'cover_letter.pdf', { type: 'application/pdf' });
    
    // Create FileList-like object
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    // Set files on input
    input.files = dataTransfer.files;
    
    // Trigger change event
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('Cover letter uploaded');
  }

  /**
   * Convert base64 to File object
   */
  base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Generate cover letter based on job details
   */
  async generateCoverLetter() {
    if (!this.userProfile.coverLetterTemplates || this.userProfile.coverLetterTemplates.length === 0) {
      return null;
    }
    
    const template = this.userProfile.coverLetterTemplates.find(t => t.isDefault) || 
                    this.userProfile.coverLetterTemplates[0];
    
    // Get job details from the page
    const jobTitle = document.querySelector('[class*="job-title"]')?.textContent?.trim() || 'the position';
    const company = document.querySelector('[class*="company-name"]')?.textContent?.trim() || 'your company';
    
    // Replace variables in template
    let coverLetter = template.template;
    coverLetter = coverLetter.replace(/{position}/g, jobTitle);
    coverLetter = coverLetter.replace(/{company}/g, company);
    coverLetter = coverLetter.replace(/{name}/g, `${this.userProfile.firstName} ${this.userProfile.lastName}`);
    coverLetter = coverLetter.replace(/{skills}/g, this.userProfile.skills?.join(', ') || 'my skills');
    
    return coverLetter;
  }

  /**
   * Handle custom screening questions
   */
  async handleCustomQuestions() {
    // Find questions that don't have standard mappings
    const questionElements = document.querySelectorAll('[class*="question"], [role="group"]');
    
    for (const element of questionElements) {
      const questionText = element.textContent?.trim();
      if (!questionText) continue;
      
      const answer = this.findCustomAnswer(questionText);
      if (answer) {
        const input = element.querySelector('input, select, textarea');
        if (input) {
          await this.setFieldValue(input, answer);
        }
      }
    }
  }

  /**
   * Find custom answer for a question
   */
  findCustomAnswer(questionText) {
    const normalizedQuestion = questionText.toLowerCase();
    
    for (const [pattern, answer] of this.customAnswers) {
      if (answer.type === 'exact' && normalizedQuestion === pattern.toLowerCase()) {
        return answer.answer;
      } else if (answer.type === 'contains' && normalizedQuestion.includes(pattern.toLowerCase())) {
        return answer.answer;
      } else if (answer.type === 'regex') {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(questionText)) {
            return answer.answer;
          }
        } catch (e) {
          console.error('Invalid regex pattern:', pattern);
        }
      }
    }
    
    // Try to infer answer from common questions
    return this.inferAnswer(questionText);
  }

  /**
   * Infer answer from common question patterns
   */
  inferAnswer(questionText) {
    const lower = questionText.toLowerCase();
    
    // Yes/No questions
    if (lower.includes('are you') || lower.includes('do you') || lower.includes('have you')) {
      if (lower.includes('authorized') || lower.includes('eligible') || lower.includes('legal')) {
        return 'Yes';
      }
      if (lower.includes('sponsorship') || lower.includes('visa')) {
        return this.userProfile.requireSponsorship || 'No';
      }
      if (lower.includes('relocate') || lower.includes('relocation')) {
        return this.userProfile.willingToRelocate || 'Yes';
      }
      if (lower.includes('experience') || lower.includes('years')) {
        const years = parseInt(questionText.match(/\d+/)?.[0] || '0');
        return this.userProfile.yearsOfExperience >= years ? 'Yes' : 'No';
      }
    }
    
    // Numeric questions
    if (lower.includes('how many years') || lower.includes('years of experience')) {
      return this.userProfile.yearsOfExperience?.toString() || '0';
    }
    
    if (lower.includes('salary') || lower.includes('compensation')) {
      return this.userProfile.desiredSalary || 'Negotiable';
    }
    
    if (lower.includes('when') || lower.includes('start date') || lower.includes('available')) {
      return this.userProfile.startDate || 'Immediately';
    }
    
    if (lower.includes('notice period')) {
      return this.userProfile.noticePeriod || '2 weeks';
    }
    
    return null;
  }

  /**
   * Submit the form
   */
  async submitForm() {
    try {
      // Find submit button
      const submitButton = this.findSubmitButton();
      
      if (!submitButton) {
        return { success: false, error: 'Submit button not found' };
      }
      
      // Check if form is valid
      const validation = this.validateForm();
      if (!validation.isValid) {
        return { 
          success: false, 
          error: 'Form validation failed', 
          invalidFields: validation.invalidFields 
        };
      }
      
      // Use anti-detection for clicking
      if (window.antiDetection) {
        await window.antiDetection.performAction('submit', async () => {
          await window.antiDetection.simulateMouseMovement(submitButton);
          submitButton.click();
        });
      } else {
        submitButton.click();
      }
      
      // Wait for submission to process
      await this.waitForSubmission();
      
      return { success: true, submittedAt: new Date().toISOString() };
      
    } catch (error) {
      console.error('Error submitting form:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find submit button
   */
  findSubmitButton() {
    const selectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Submit")',
      'button:contains("Apply")',
      'button:contains("Send")',
      '[class*="submit-button"]',
      '[class*="apply-button"]',
      '[aria-label*="submit"]',
      '[aria-label*="apply"]'
    ];
    
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        return button;
      }
    }
    
    // Try to find by text content
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const text = button.textContent.toLowerCase();
      if ((text.includes('submit') || text.includes('apply') || text.includes('send')) && !button.disabled) {
        return button;
      }
    }
    
    return null;
  }

  /**
   * Validate form before submission
   */
  validateForm() {
    const invalidFields = [];
    const requiredFields = document.querySelectorAll('[required], [aria-required="true"]');
    
    requiredFields.forEach(field => {
      if (!field.value || field.value.trim() === '') {
        invalidFields.push({
          name: field.name || field.id,
          label: this.getFieldLabel(field),
          reason: 'Required field is empty'
        });
      } else if (field.pattern && !new RegExp(field.pattern).test(field.value)) {
        invalidFields.push({
          name: field.name || field.id,
          label: this.getFieldLabel(field),
          reason: 'Value does not match required pattern'
        });
      }
    });
    
    // Check for HTML5 validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      if (!form.checkValidity()) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          if (!input.checkValidity()) {
            invalidFields.push({
              name: input.name || input.id,
              label: this.getFieldLabel(input),
              reason: input.validationMessage
            });
          }
        });
      }
    });
    
    return {
      isValid: invalidFields.length === 0,
      invalidFields: invalidFields
    };
  }

  /**
   * Wait for form submission to complete
   */
  async waitForSubmission() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // 15 seconds max
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        // Check for success indicators
        const successIndicators = [
          document.querySelector('[class*="success"]'),
          document.querySelector('[class*="confirmation"]'),
          document.querySelector('[class*="thank"]'),
          document.querySelector('[role="alert"]:contains("success")')
        ];
        
        if (successIndicators.some(indicator => indicator !== null)) {
          clearInterval(checkInterval);
          resolve();
        }
        
        // Check for navigation change
        if (window.location.href.includes('confirmation') || 
            window.location.href.includes('success') ||
            window.location.href.includes('thank')) {
          clearInterval(checkInterval);
          resolve();
        }
        
        // Timeout
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the form filler
const formFiller = new FormFiller();

// Export for use in other scripts
window.formFiller = formFiller;