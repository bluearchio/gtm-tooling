// Type definitions for LinkedIn Auto-Apply Extension

export interface FilterCriteria {
  isRemote?: 'yes' | 'no' | 'hybrid' | 'any';
  keywords?: string[];
  keywordLogic?: 'AND' | 'OR';
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  companySize?: CompanySize | 'any';
  location?: string[];
  locationRadius?: number; // in miles
  experienceLevel?: ExperienceLevel | 'any';
  industry?: string[];
  jobType?: JobType[];
  excludeCompanies?: string[];
  postedWithin?: number; // days
}

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
export type ExperienceLevel = 'internship' | 'entry' | 'associate' | 'mid' | 'senior' | 'executive' | 'director';
export type JobType = 'full-time' | 'part-time' | 'contract' | 'temporary' | 'internship' | 'volunteer';
export type ApplicationStatus = 'pending' | 'submitted' | 'failed' | 'skipped' | 'viewed';

export interface JobDetails {
  id: string;
  url: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string;
  isRemote: boolean;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'yearly';
  };
  description: string;
  requirements?: string[];
  benefits?: string[];
  experienceLevel?: ExperienceLevel;
  jobType?: JobType;
  postedDate: Date;
  applicants?: number;
  isEasyApply: boolean;
  matchScore?: number;
  matchReasons?: string[];
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobDetails: JobDetails;
  appliedAt: Date;
  status: ApplicationStatus;
  applicationData: Record<string, any>;
  resume?: string;
  coverLetter?: string;
  answers?: ApplicationAnswer[];
  error?: string;
  attempts: number;
}

export interface ApplicationAnswer {
  questionId: string;
  question: string;
  answer: string | boolean | string[];
  type: 'text' | 'boolean' | 'select' | 'multiselect' | 'file';
}

export interface AutomationConfig {
  enabled: boolean;
  mode: 'auto' | 'semi-auto' | 'review';
  dailyLimit: number;
  sessionLimit: number;
  rateLimit: number; // applications per hour
  delayBetweenActions: {
    min: number; // milliseconds
    max: number;
  };
  workingHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;
    timezone: string;
  };
  filters: FilterCriteria;
  antiDetection: AntiDetectionConfig;
  notifications: NotificationConfig;
}

export interface AntiDetectionConfig {
  enabled: boolean;
  humanizeActions: boolean;
  randomizeDelays: boolean;
  simulateMouseMovement: boolean;
  simulateScrolling: boolean;
  breakPatterns: {
    enabled: boolean;
    minApplications: number;
    maxApplications: number;
    breakDuration: number; // minutes
  };
  sessionRotation: {
    enabled: boolean;
    maxSessionDuration: number; // minutes
  };
}

export interface NotificationConfig {
  onApplicationSubmitted: boolean;
  onDailyLimitReached: boolean;
  onError: boolean;
  onSessionComplete: boolean;
  sound: boolean;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
  education?: Education[];
  skills?: string[];
  resumes?: Resume[];
  coverLetterTemplates?: CoverLetterTemplate[];
  customAnswers?: CustomAnswer[];
}

export interface Education {
  school: string;
  degree: string;
  field: string;
  startDate?: Date;
  endDate?: Date;
  gpa?: number;
}

export interface Resume {
  id: string;
  name: string;
  fileName: string;
  fileData: string; // base64 encoded
  isDefault: boolean;
  tags?: string[];
  uploadedAt: Date;
}

export interface CoverLetterTemplate {
  id: string;
  name: string;
  template: string;
  variables?: string[]; // e.g., {company}, {position}, {skills}
  isDefault: boolean;
  tags?: string[];
}

export interface CustomAnswer {
  questionPattern: string; // regex pattern
  answer: string;
  type: 'exact' | 'contains' | 'regex';
}

export interface Statistics {
  totalApplications: number;
  successfulApplications: number;
  failedApplications: number;
  skippedJobs: number;
  averageTimePerApplication: number; // seconds
  mostActiveDay: string;
  mostActiveHour: number;
  topCompanies: { company: string; count: number }[];
  topLocations: { location: string; count: number }[];
  applicationsByDay: { date: string; count: number }[];
  successRate: number;
  lastApplicationDate?: Date;
}

export interface ChromeMessage {
  type: MessageType;
  payload?: any;
  tabId?: number;
  responseId?: string;
}

export type MessageType = 
  | 'START_AUTOMATION'
  | 'STOP_AUTOMATION'
  | 'GET_STATUS'
  | 'UPDATE_CONFIG'
  | 'ANALYZE_JOB'
  | 'FILL_FORM'
  | 'SUBMIT_APPLICATION'
  | 'GET_STATISTICS'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'ERROR'
  | 'SUCCESS'
  | 'LOG';

export interface AutomationState {
  isRunning: boolean;
  isPaused: boolean;
  currentJob?: JobDetails;
  currentStep?: string;
  applicationsToday: number;
  applicationsThisSession: number;
  startedAt?: Date;
  errors: string[];
  queue: JobDetails[];
}

export interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  required: boolean;
  value?: any;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface Logger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error, data?: any): void;
  debug(message: string, data?: any): void;
}

export interface StorageAPI {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}