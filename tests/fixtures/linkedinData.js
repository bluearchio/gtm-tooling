/**
 * Test Fixtures for LinkedIn Data
 * Contains mock data structures and page layouts for testing
 */

const mockJobData = {
  // Sample job listings for search results page
  searchResults: [
    {
      id: '3472839472',
      url: 'https://www.linkedin.com/jobs/view/3472839472/',
      title: 'Senior Software Engineer',
      company: 'Tech Innovators Inc.',
      location: 'San Francisco, CA',
      isRemote: false,
      salary: {
        min: 120000,
        max: 180000,
        currency: 'USD',
        period: 'yearly'
      },
      description: '',
      postedDate: new Date('2024-01-15T10:00:00Z'),
      applicants: 142,
      isEasyApply: true,
      experienceLevel: 'senior',
      jobType: 'full-time'
    },
    {
      id: '3472839473',
      url: 'https://www.linkedin.com/jobs/view/3472839473/',
      title: 'Frontend Developer',
      company: 'StartupCorp',
      location: 'Remote',
      isRemote: true,
      salary: {
        min: 80000,
        max: 120000,
        currency: 'USD',
        period: 'yearly'
      },
      description: '',
      postedDate: new Date('2024-01-14T14:30:00Z'),
      applicants: 89,
      isEasyApply: true,
      experienceLevel: 'mid',
      jobType: 'full-time'
    },
    {
      id: '3472839474',
      url: 'https://www.linkedin.com/jobs/view/3472839474/',
      title: 'Data Scientist Intern',
      company: 'BigData Analytics',
      location: 'New York, NY',
      isRemote: false,
      salary: {
        min: 25,
        max: 35,
        currency: 'USD',
        period: 'hourly'
      },
      description: '',
      postedDate: new Date('2024-01-13T09:15:00Z'),
      applicants: 267,
      isEasyApply: false,
      experienceLevel: 'internship',
      jobType: 'internship'
    }
  ],

  // Detailed job information
  jobDetail: {
    id: '3472839472',
    url: 'https://www.linkedin.com/jobs/view/3472839472/',
    title: 'Senior Software Engineer',
    company: 'Tech Innovators Inc.',
    companyUrl: 'https://www.linkedin.com/company/tech-innovators/',
    location: 'San Francisco, CA',
    isRemote: false,
    salary: {
      min: 120000,
      max: 180000,
      currency: 'USD',
      period: 'yearly'
    },
    description: `We are seeking a Senior Software Engineer to join our dynamic team. 
    
About the Role:
You will be responsible for designing, developing, and maintaining high-quality software solutions that power our platform serving millions of users.

Key Responsibilities:
• Lead technical design and implementation of complex features
• Mentor junior developers and participate in code reviews
• Collaborate with product managers and designers
• Ensure code quality and system reliability

Requirements:
• 5+ years of experience in software development
• Proficiency in JavaScript, React, Node.js
• Experience with cloud platforms (AWS, GCP)
• Strong problem-solving and communication skills
• Bachelor's degree in Computer Science or related field

Benefits:
• Competitive salary and equity package
• Comprehensive health, dental, and vision insurance
• Flexible work arrangements
• Professional development opportunities
• 401(k) with company matching`,
    requirements: [
      '5+ years of experience in software development',
      'Proficiency in JavaScript, React, Node.js',
      'Experience with cloud platforms (AWS, GCP)',
      'Strong problem-solving and communication skills',
      "Bachelor's degree in Computer Science or related field"
    ],
    benefits: [
      'Competitive salary and equity package',
      'Comprehensive health, dental, and vision insurance',
      'Flexible work arrangements',
      'Professional development opportunities',
      '401(k) with company matching'
    ],
    experienceLevel: 'senior',
    jobType: 'full-time',
    postedDate: new Date('2024-01-15T10:00:00Z'),
    applicants: 142,
    isEasyApply: true,
    matchScore: 85,
    matchReasons: [
      'Skills match: JavaScript, React',
      'Experience level appropriate',
      'Salary range matches expectations'
    ]
  }
}

const mockUserProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  linkedInUrl: 'https://linkedin.com/in/johndoe',
  currentTitle: 'Software Engineer',
  currentCompany: 'Current Tech Co.',
  yearsOfExperience: 6,
  city: 'San Francisco',
  state: 'CA',
  country: 'United States',
  zipCode: '94102',
  workAuthorization: 'Authorized to work in the US',
  requireSponsorship: 'No',
  willingToRelocate: 'Yes',
  startDate: 'Immediately',
  noticePeriod: '2 weeks',
  desiredSalary: 'Negotiable',
  education: [
    {
      school: 'University of California, Berkeley',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: new Date('2015-08-01'),
      endDate: new Date('2019-05-01'),
      gpa: 3.7
    }
  ],
  skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
  resumes: [
    {
      id: 'resume-1',
      name: 'Software Engineer Resume',
      fileName: 'john_doe_resume.pdf',
      fileData: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCg==',
      isDefault: true,
      tags: ['software', 'engineering'],
      uploadedAt: new Date('2024-01-01T00:00:00Z')
    }
  ],
  coverLetterTemplates: [
    {
      id: 'cover-1',
      name: 'General Cover Letter',
      template: `Dear Hiring Manager,

I am writing to express my interest in the {position} role at {company}. With my background in {skills}, I am excited about the opportunity to contribute to your team.

Best regards,
{name}`,
      variables: ['position', 'company', 'skills', 'name'],
      isDefault: true,
      tags: ['general']
    }
  ],
  customAnswers: [
    {
      questionPattern: 'authorized.*work',
      answer: 'Yes',
      type: 'regex'
    },
    {
      questionPattern: 'sponsorship',
      answer: 'No',
      type: 'contains'
    },
    {
      questionPattern: 'years.*experience',
      answer: '6',
      type: 'regex'
    }
  ]
}

const mockFormFields = {
  // Standard application form fields
  basicForm: [
    {
      id: 'firstName',
      name: 'firstName',
      type: 'text',
      label: 'First Name',
      required: true,
      value: '',
      mappedTo: 'firstName'
    },
    {
      id: 'lastName',
      name: 'lastName',
      type: 'text',
      label: 'Last Name',
      required: true,
      value: '',
      mappedTo: 'lastName'
    },
    {
      id: 'email',
      name: 'email',
      type: 'email',
      label: 'Email Address',
      required: true,
      value: '',
      mappedTo: 'email'
    },
    {
      id: 'phone',
      name: 'phone',
      type: 'tel',
      label: 'Phone Number',
      required: false,
      value: '',
      mappedTo: 'phone'
    }
  ],

  // Work authorization fields
  workAuthForm: [
    {
      id: 'workAuth',
      name: 'workAuthorization',
      type: 'radio',
      label: 'Are you authorized to work in the US?',
      required: true,
      options: [
        { value: 'yes', text: 'Yes' },
        { value: 'no', text: 'No' }
      ],
      mappedTo: 'workAuthorization'
    },
    {
      id: 'sponsorship',
      name: 'sponsorship',
      type: 'radio',
      label: 'Do you require sponsorship?',
      required: true,
      options: [
        { value: 'yes', text: 'Yes' },
        { value: 'no', text: 'No' }
      ],
      mappedTo: 'requireSponsorship'
    }
  ],

  // Experience fields
  experienceForm: [
    {
      id: 'experience',
      name: 'yearsExperience',
      type: 'select',
      label: 'Years of Experience',
      required: true,
      options: [
        { value: '', text: 'Select...' },
        { value: '0-1', text: '0-1 years' },
        { value: '2-4', text: '2-4 years' },
        { value: '5-7', text: '5-7 years' },
        { value: '8+', text: '8+ years' }
      ],
      mappedTo: 'yearsExperience'
    },
    {
      id: 'currentTitle',
      name: 'currentTitle',
      type: 'text',
      label: 'Current Job Title',
      required: false,
      value: '',
      mappedTo: 'currentTitle'
    }
  ],

  // File upload fields
  fileUploadForm: [
    {
      id: 'resume',
      name: 'resume',
      type: 'file',
      label: 'Upload Resume',
      required: true,
      accept: '.pdf,.doc,.docx',
      mappedTo: 'resume'
    },
    {
      id: 'coverLetter',
      name: 'coverLetter',
      type: 'file',
      label: 'Upload Cover Letter',
      required: false,
      accept: '.pdf,.doc,.docx',
      mappedTo: 'coverLetter'
    }
  ]
}

const mockDOMStructures = {
  // LinkedIn job search results page structure
  jobSearchPage: `
    <div class="jobs-search-results-list">
      <ul class="jobs-search-results__list">
        <li class="jobs-search-results__list-item" data-job-id="3472839472">
          <div class="job-card-container">
            <h3 class="job-card-list__title">Senior Software Engineer</h3>
            <a class="job-card-container__company-name" href="/company/tech-innovators">Tech Innovators Inc.</a>
            <span class="job-card-container__metadata-item">San Francisco, CA</span>
            <span class="job-card-container__apply-method--easy-apply">Easy Apply</span>
            <time datetime="2024-01-15T10:00:00Z">2 days ago</time>
            <span class="job-card-container__applicant-count">142 applicants</span>
          </div>
        </li>
        <li class="jobs-search-results__list-item" data-job-id="3472839473">
          <div class="job-card-container">
            <h3 class="job-card-list__title">Frontend Developer</h3>
            <a class="job-card-container__company-name" href="/company/startupcorp">StartupCorp</a>
            <span class="job-card-container__metadata-item">Remote</span>
            <span class="job-card-container__apply-method--easy-apply">Easy Apply</span>
            <time datetime="2024-01-14T14:30:00Z">3 days ago</time>
            <span class="job-card-container__applicant-count">89 applicants</span>
          </div>
        </li>
      </ul>
    </div>
  `,

  // LinkedIn job detail page structure
  jobDetailPage: `
    <div class="jobs-unified-top-card">
      <h1 class="jobs-unified-top-card__job-title">Senior Software Engineer</h1>
      <a class="jobs-unified-top-card__company-name" href="/company/tech-innovators">Tech Innovators Inc.</a>
      <span class="jobs-unified-top-card__bullet">San Francisco, CA</span>
      <div class="jobs-unified-top-card__job-insight">
        <h3>Seniority level</h3>
        <span>Senior level</span>
      </div>
      <div class="jobs-unified-top-card__job-insight">
        <h3>Employment type</h3>
        <span>Full-time</span>
      </div>
      <button class="jobs-apply-button--top-card" aria-label="Easy Apply to Senior Software Engineer">
        Easy Apply
      </button>
    </div>
    <div class="jobs-description">
      <div class="jobs-description__content">
        <p>We are seeking a Senior Software Engineer...</p>
        <h3>Requirements:</h3>
        <ul>
          <li>5+ years of experience in software development</li>
          <li>Proficiency in JavaScript, React, Node.js</li>
        </ul>
        <h3>Benefits:</h3>
        <ul>
          <li>Competitive salary and equity package</li>
          <li>Comprehensive health insurance</li>
        </ul>
      </div>
    </div>
  `,

  // LinkedIn application form structure
  applicationFormPage: `
    <div class="jobs-easy-apply-modal">
      <form class="jobs-easy-apply-form">
        <div class="form-group">
          <label for="firstName">First Name *</label>
          <input type="text" id="firstName" name="firstName" required>
        </div>
        <div class="form-group">
          <label for="lastName">Last Name *</label>
          <input type="text" id="lastName" name="lastName" required>
        </div>
        <div class="form-group">
          <label for="email">Email Address *</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label>Are you authorized to work in the US? *</label>
          <input type="radio" name="workAuth" value="yes" id="workAuthYes" required>
          <label for="workAuthYes">Yes</label>
          <input type="radio" name="workAuth" value="no" id="workAuthNo" required>
          <label for="workAuthNo">No</label>
        </div>
        <div class="form-group">
          <label for="experience">Years of Experience *</label>
          <select id="experience" name="experience" required>
            <option value="">Select...</option>
            <option value="0-1">0-1 years</option>
            <option value="2-4">2-4 years</option>
            <option value="5-7">5-7 years</option>
            <option value="8+">8+ years</option>
          </select>
        </div>
        <div class="form-group">
          <label for="resume">Upload Resume</label>
          <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx">
        </div>
        <button type="submit" aria-label="Submit application">Submit Application</button>
      </form>
    </div>
  `
}

const mockFilterCriteria = {
  basic: {
    isRemote: 'any',
    keywords: ['javascript', 'react'],
    keywordLogic: 'OR',
    salaryMin: 80000,
    salaryMax: 150000,
    experienceLevel: 'any',
    jobType: ['full-time'],
    postedWithin: 7
  },

  strict: {
    isRemote: 'yes',
    keywords: ['senior', 'javascript', 'react', 'node.js'],
    keywordLogic: 'AND',
    salaryMin: 120000,
    salaryMax: 200000,
    experienceLevel: 'senior',
    jobType: ['full-time'],
    excludeCompanies: ['ExcludedCorp'],
    postedWithin: 3,
    location: ['San Francisco', 'Remote'],
    companySize: 'medium'
  },

  permissive: {
    isRemote: 'any',
    keywords: [],
    keywordLogic: 'OR',
    experienceLevel: 'any',
    jobType: ['full-time', 'part-time', 'contract'],
    postedWithin: 30
  }
}

const mockApplicationData = {
  successful: {
    id: 'app-123',
    jobId: '3472839472',
    jobDetails: mockJobData.jobDetail,
    appliedAt: new Date('2024-01-15T15:30:00Z'),
    status: 'submitted',
    applicationData: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      workAuth: 'yes',
      experience: '5-7'
    },
    resume: 'john_doe_resume.pdf',
    coverLetter: 'Generated cover letter content...',
    answers: [
      {
        questionId: 'q1',
        question: 'Are you authorized to work in the US?',
        answer: 'Yes',
        type: 'boolean'
      }
    ],
    attempts: 1
  },

  failed: {
    id: 'app-124',
    jobId: '3472839473',
    jobDetails: mockJobData.searchResults[1],
    appliedAt: new Date('2024-01-15T16:00:00Z'),
    status: 'failed',
    applicationData: {},
    error: 'Form validation failed: Missing required field',
    attempts: 3
  }
}

const mockStatistics = {
  totalApplications: 45,
  successfulApplications: 38,
  failedApplications: 7,
  skippedJobs: 12,
  averageTimePerApplication: 180, // seconds
  mostActiveDay: 'Monday',
  mostActiveHour: 10,
  topCompanies: [
    { company: 'Tech Innovators Inc.', count: 3 },
    { company: 'StartupCorp', count: 2 }
  ],
  topLocations: [
    { location: 'San Francisco, CA', count: 15 },
    { location: 'Remote', count: 20 }
  ],
  applicationsByDay: [
    { date: '2024-01-15', count: 5 },
    { date: '2024-01-14', count: 8 },
    { date: '2024-01-13', count: 3 }
  ],
  successRate: 84.4,
  lastApplicationDate: new Date('2024-01-15T16:30:00Z')
}

// Helper functions for creating test scenarios
const createMockJobCard = (jobData) => {
  const card = document.createElement('div')
  card.className = 'jobs-search-results__list-item'
  card.setAttribute('data-job-id', jobData.id)
  
  card.innerHTML = `
    <h3 class="job-card-list__title">${jobData.title}</h3>
    <a class="job-card-container__company-name">${jobData.company}</a>
    <span class="job-card-container__metadata-item">${jobData.location}</span>
    ${jobData.isEasyApply ? '<span class="job-card-container__apply-method--easy-apply">Easy Apply</span>' : ''}
    <time datetime="${jobData.postedDate.toISOString()}">${getRelativeTime(jobData.postedDate)}</time>
    <span class="job-card-container__applicant-count">${jobData.applicants} applicants</span>
  `
  
  return card
}

const createMockFormField = (fieldData) => {
  const container = document.createElement('div')
  container.className = 'form-group'
  
  if (fieldData.type === 'radio') {
    const label = document.createElement('label')
    label.textContent = fieldData.label
    container.appendChild(label)
    
    fieldData.options.forEach(option => {
      const input = document.createElement('input')
      input.type = 'radio'
      input.name = fieldData.name
      input.value = option.value
      input.id = `${fieldData.id}_${option.value}`
      input.required = fieldData.required
      
      const optionLabel = document.createElement('label')
      optionLabel.htmlFor = input.id
      optionLabel.textContent = option.text
      
      container.appendChild(input)
      container.appendChild(optionLabel)
    })
  } else if (fieldData.type === 'select') {
    const label = document.createElement('label')
    label.htmlFor = fieldData.id
    label.textContent = fieldData.label
    
    const select = document.createElement('select')
    select.id = fieldData.id
    select.name = fieldData.name
    select.required = fieldData.required
    
    fieldData.options.forEach(option => {
      const optionElement = document.createElement('option')
      optionElement.value = option.value
      optionElement.textContent = option.text
      select.appendChild(optionElement)
    })
    
    container.appendChild(label)
    container.appendChild(select)
  } else {
    const label = document.createElement('label')
    label.htmlFor = fieldData.id
    label.textContent = fieldData.label
    
    const input = document.createElement('input')
    input.type = fieldData.type
    input.id = fieldData.id
    input.name = fieldData.name
    input.required = fieldData.required
    input.value = fieldData.value || ''
    
    if (fieldData.accept) {
      input.accept = fieldData.accept
    }
    
    container.appendChild(label)
    container.appendChild(input)
  }
  
  return container
}

function getRelativeTime(date) {
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

// CommonJS exports
module.exports = {
  mockJobData,
  mockUserProfile,
  mockFormFields,
  mockDOMStructures,
  mockFilterCriteria,
  mockApplicationData,
  mockStatistics,
  createMockJobCard,
  createMockFormField
}