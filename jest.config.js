/**
 * Jest Configuration for LinkedIn Auto-Apply Extension
 * Comprehensive testing setup with coverage reporting
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // File patterns to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/'
  ],
  
  // Module name mapping for ES6 imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.min.js',
    '!src/**/*.config.js',
    '!src/**/index.js'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief summary
    'lcov',           // For IDE integration
    'html',           // Detailed HTML report
    'json',           // Machine-readable format
    'cobertura'       // XML format for CI/CD
  ],
  
  // Coverage thresholds - enforce quality gates
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Per-file thresholds for critical modules
    './src/content/linkedin-analyzer.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/content/form-filler.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/content/anti-detection.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test execution settings
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Timeout settings
  testTimeout: 10000, // 10 seconds for individual tests
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'LinkedIn Auto-Apply Extension Test Report',
        logoImgPath: './assets/icons/icon48.png'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  
  // Global test setup
  globals: {
    'NODE_ENV': 'test'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/tests/utils/test-results-processor.js',
  
  // Watch mode configuration
  watchman: false,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/'
  ],
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Test suites organization
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      coverageDirectory: '<rootDir>/coverage/unit'
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      coverageDirectory: '<rootDir>/coverage/integration'
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      coverageDirectory: '<rootDir>/coverage/e2e',
      testTimeout: 30000 // Longer timeout for E2E tests
    }
  ]
}