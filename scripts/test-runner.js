#!/usr/bin/env node

/**
 * Enhanced Test Runner for LinkedIn Auto-Apply Extension
 * Provides comprehensive testing workflows and quality gates
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Test configuration
const config = {
  coverageThreshold: {
    lines: 85,
    functions: 85,
    branches: 85,
    statements: 85
  },
  performanceThreshold: {
    maxTestDuration: 30000, // 30 seconds
    maxSuiteSize: 100 // tests per suite
  },
  qualityGates: {
    minSuccessRate: 95,
    maxFailedTests: 5,
    maxSkippedTests: 10
  }
}

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      overall: null
    }
    this.startTime = Date.now()
  }

  async run(testType = 'all') {
    console.log('🚀 Starting LinkedIn Auto-Apply Extension Test Suite')
    console.log('=' * 60)
    
    try {
      if (testType === 'all' || testType === 'unit') {
        await this.runUnitTests()
      }
      
      if (testType === 'all' || testType === 'integration') {
        await this.runIntegrationTests()
      }
      
      if (testType === 'all' || testType === 'e2e') {
        await this.runE2ETests()
      }
      
      await this.generateFinalReport()
      await this.runQualityGates()
      
      console.log('✅ All tests completed successfully!')
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message)
      process.exit(1)
    }
  }

  async runUnitTests() {
    console.log('\n📦 Running Unit Tests...')
    
    try {
      const output = execSync(
        'npx jest --selectProjects="Unit Tests" --coverage --verbose',
        { encoding: 'utf8', stdio: 'pipe' }
      )
      
      console.log('✅ Unit tests passed')
      this.results.unit = this.parseTestOutput(output)
      
    } catch (error) {
      console.error('❌ Unit tests failed')
      throw error
    }
  }

  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...')
    
    try {
      const output = execSync(
        'npx jest --selectProjects="Integration Tests" --coverage --verbose',
        { encoding: 'utf8', stdio: 'pipe' }
      )
      
      console.log('✅ Integration tests passed')
      this.results.integration = this.parseTestOutput(output)
      
    } catch (error) {
      console.error('❌ Integration tests failed')
      throw error
    }
  }

  async runE2ETests() {
    console.log('\n🎭 Running End-to-End Tests...')
    
    try {
      const output = execSync(
        'npx jest --selectProjects="E2E Tests" --coverage --verbose --testTimeout=30000',
        { encoding: 'utf8', stdio: 'pipe' }
      )
      
      console.log('✅ E2E tests passed')
      this.results.e2e = this.parseTestOutput(output)
      
    } catch (error) {
      console.error('❌ E2E tests failed')
      throw error
    }
  }

  parseTestOutput(output) {
    // Parse Jest output to extract metrics
    const lines = output.split('\n')
    const results = {
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
      duration: 0
    }

    // Extract test counts
    const testSummary = lines.find(line => line.includes('Tests:'))
    if (testSummary) {
      const matches = testSummary.match(/(\d+) passed|(\d+) failed|(\d+) skipped|(\d+) total/g)
      // Parse matches and update results
    }

    // Extract coverage
    const coverageLines = lines.filter(line => line.includes('%'))
    // Parse coverage data

    return results
  }

  async generateFinalReport() {
    console.log('\n📊 Generating Final Test Report...')
    
    const totalDuration = Date.now() - this.startTime
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      results: this.results,
      summary: this.calculateSummary(),
      qualityScore: this.calculateQualityScore()
    }

    // Write comprehensive report
    const reportPath = path.join(process.cwd(), 'coverage', 'final-test-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))

    // Generate executive summary
    await this.generateExecutiveSummary(reportData)
    
    console.log(`📄 Final report saved to: ${reportPath}`)
  }

  calculateSummary() {
    const summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      overallCoverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
      successRate: 0
    }

    // Aggregate results from all test types
    Object.values(this.results).forEach(result => {
      if (result) {
        summary.totalTests += result.tests?.total || 0
        summary.passedTests += result.tests?.passed || 0
        summary.failedTests += result.tests?.failed || 0
        summary.skippedTests += result.tests?.skipped || 0
      }
    })

    summary.successRate = summary.totalTests > 0 
      ? (summary.passedTests / summary.totalTests) * 100 
      : 0

    return summary
  }

  calculateQualityScore() {
    const summary = this.calculateSummary()
    let score = 100

    // Deduct points for failures
    score -= summary.failedTests * 5

    // Deduct points for low coverage
    if (summary.overallCoverage.lines < config.coverageThreshold.lines) {
      score -= (config.coverageThreshold.lines - summary.overallCoverage.lines) * 0.5
    }

    // Deduct points for skipped tests
    score -= summary.skippedTests * 1

    return Math.max(0, Math.round(score))
  }

  async generateExecutiveSummary(reportData) {
    const summary = reportData.summary
    const qualityScore = reportData.qualityScore

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>LinkedIn Auto-Apply Extension - Executive Test Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #0077b5; color: white; padding: 20px; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; text-align: center; }
        .score { font-size: 2em; font-weight: bold; color: ${qualityScore >= 90 ? '#28a745' : qualityScore >= 70 ? '#ffc107' : '#dc3545'}; }
        .recommendation { background: #f8f9fa; padding: 15px; border-left: 4px solid #0077b5; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Executive Test Summary</h1>
        <p>LinkedIn Auto-Apply Chrome Extension Quality Report</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <h2>📈 Overall Quality Score</h2>
    <div class="score">${qualityScore}/100</div>
    <p>${this.getQualityAssessment(qualityScore)}</p>

    <h2>📊 Test Metrics</h2>
    <div class="metric">
        <h3>${summary.totalTests}</h3>
        <p>Total Tests</p>
    </div>
    <div class="metric">
        <h3>${summary.passedTests}</h3>
        <p>Passed</p>
    </div>
    <div class="metric">
        <h3>${summary.failedTests}</h3>
        <p>Failed</p>
    </div>
    <div class="metric">
        <h3>${summary.successRate.toFixed(1)}%</h3>
        <p>Success Rate</p>
    </div>

    ${this.generateRecommendations(reportData)}

    <h2>🎯 Next Steps</h2>
    <ul>
        ${summary.failedTests > 0 ? '<li>🔴 Address failing tests before deployment</li>' : ''}
        ${summary.overallCoverage.lines < 85 ? '<li>📈 Improve test coverage to meet 85% threshold</li>' : ''}
        ${qualityScore < 90 ? '<li>🚀 Enhance overall test quality for production readiness</li>' : ''}
        <li>📝 Review and update test documentation</li>
        <li>🔄 Schedule regular test reviews and maintenance</li>
    </ul>
</body>
</html>
    `

    const summaryPath = path.join(process.cwd(), 'coverage', 'executive-summary.html')
    fs.writeFileSync(summaryPath, html)
    console.log(`📋 Executive summary saved to: ${summaryPath}`)
  }

  getQualityAssessment(score) {
    if (score >= 95) return '🟢 Excellent - Production Ready'
    if (score >= 85) return '🟡 Good - Minor improvements needed'
    if (score >= 70) return '🟠 Fair - Significant improvements required'
    return '🔴 Poor - Major issues must be addressed'
  }

  generateRecommendations(reportData) {
    const recommendations = []
    const summary = reportData.summary

    if (summary.failedTests > 0) {
      recommendations.push('Investigate and fix all failing tests before deployment')
    }

    if (summary.overallCoverage.lines < config.coverageThreshold.lines) {
      recommendations.push('Increase test coverage, particularly for critical business logic')
    }

    if (summary.skippedTests > 5) {
      recommendations.push('Review and implement or remove skipped tests')
    }

    if (recommendations.length === 0) {
      recommendations.push('All quality metrics met - consider performance optimization')
    }

    return `
      <div class="recommendation">
        <h3>💡 Recommendations</h3>
        <ul>
          ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `
  }

  async runQualityGates() {
    console.log('\n🚦 Running Quality Gates...')
    
    const summary = this.calculateSummary()
    const issues = []

    // Check success rate
    if (summary.successRate < config.qualityGates.minSuccessRate) {
      issues.push(`Success rate ${summary.successRate.toFixed(1)}% below threshold ${config.qualityGates.minSuccessRate}%`)
    }

    // Check failed tests
    if (summary.failedTests > config.qualityGates.maxFailedTests) {
      issues.push(`${summary.failedTests} failed tests exceed maximum ${config.qualityGates.maxFailedTests}`)
    }

    // Check skipped tests
    if (summary.skippedTests > config.qualityGates.maxSkippedTests) {
      issues.push(`${summary.skippedTests} skipped tests exceed maximum ${config.qualityGates.maxSkippedTests}`)
    }

    if (issues.length > 0) {
      console.error('❌ Quality Gates Failed:')
      issues.forEach(issue => console.error(`   - ${issue}`))
      throw new Error('Quality gates not met')
    }

    console.log('✅ All quality gates passed')
  }
}

// CLI interface
const args = process.argv.slice(2)
const testType = args[0] || 'all'

const runner = new TestRunner()
runner.run(testType).catch(error => {
  console.error('Test execution failed:', error.message)
  process.exit(1)
})