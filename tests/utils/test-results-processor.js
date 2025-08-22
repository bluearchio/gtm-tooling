/**
 * Custom Test Results Processor
 * Generates comprehensive test reports and metrics
 */

const fs = require('fs')
const path = require('path')

module.exports = (results) => {
  const testReport = {
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      pendingTests: results.numPendingTests,
      testSuites: results.numTotalTestSuites,
      passedSuites: results.numPassedTestSuites,
      failedSuites: results.numFailedTestSuites,
      startTime: results.startTime,
      endTime: new Date().getTime(),
      duration: results.endTime ? results.endTime - results.startTime : 0,
      success: results.success
    },
    coverage: null,
    testSuites: [],
    performance: {
      slowestTests: [],
      memoryUsage: process.memoryUsage(),
      timing: {
        setup: 0,
        execution: 0,
        teardown: 0
      }
    },
    quality: {
      codeComplexity: 'medium',
      testMaintainability: 'high',
      reliabilityScore: 0
    }
  }

  // Process each test suite
  results.testResults.forEach(suiteResult => {
    const suite = {
      name: suiteResult.testFilePath,
      displayName: path.basename(suiteResult.testFilePath),
      duration: suiteResult.perfStats.end - suiteResult.perfStats.start,
      tests: suiteResult.testResults.length,
      passed: suiteResult.testResults.filter(t => t.status === 'passed').length,
      failed: suiteResult.testResults.filter(t => t.status === 'failed').length,
      skipped: suiteResult.testResults.filter(t => t.status === 'skipped' || t.status === 'pending').length,
      coverage: suiteResult.coverage,
      testResults: []
    }

    // Process individual tests
    suiteResult.testResults.forEach(testResult => {
      const test = {
        name: testResult.title,
        fullName: testResult.fullName,
        status: testResult.status,
        duration: testResult.duration || 0,
        failureMessage: testResult.failureMessage,
        ancestorTitles: testResult.ancestorTitles,
        location: testResult.location
      }

      suite.testResults.push(test)

      // Track slow tests
      if (test.duration > 1000) { // Tests taking more than 1 second
        testReport.performance.slowestTests.push({
          name: test.fullName,
          duration: test.duration,
          suite: suite.displayName
        })
      }
    })

    testSuites.push(suite)
  })

  // Sort slowest tests
  testReport.performance.slowestTests.sort((a, b) => b.duration - a.duration)
  testReport.performance.slowestTests = testReport.performance.slowestTests.slice(0, 10)

  // Calculate reliability score
  const totalTests = testReport.summary.totalTests
  const passedTests = testReport.summary.passedTests
  testReport.quality.reliabilityScore = totalTests > 0 ? (passedTests / totalTests) * 100 : 0

  // Extract coverage information if available
  if (results.coverageMap) {
    testReport.coverage = {
      global: {
        lines: { total: 0, covered: 0, percentage: 0 },
        functions: { total: 0, covered: 0, percentage: 0 },
        branches: { total: 0, covered: 0, percentage: 0 },
        statements: { total: 0, covered: 0, percentage: 0 }
      },
      files: []
    }

    // Process coverage data
    const coverageData = results.coverageMap.data
    for (const filePath in coverageData) {
      const fileCoverage = coverageData[filePath]
      
      const fileReport = {
        path: filePath,
        name: path.basename(filePath),
        lines: calculateCoveragePercentage(fileCoverage.l),
        functions: calculateCoveragePercentage(fileCoverage.f),
        branches: calculateCoveragePercentage(fileCoverage.b),
        statements: calculateCoveragePercentage(fileCoverage.s)
      }

      testReport.coverage.files.push(fileReport)

      // Add to global totals
      testReport.coverage.global.lines.total += fileReport.lines.total
      testReport.coverage.global.lines.covered += fileReport.lines.covered
      testReport.coverage.global.functions.total += fileReport.functions.total
      testReport.coverage.global.functions.covered += fileReport.functions.covered
      testReport.coverage.global.branches.total += fileReport.branches.total
      testReport.coverage.global.branches.covered += fileReport.branches.covered
      testReport.coverage.global.statements.total += fileReport.statements.total
      testReport.coverage.global.statements.covered += fileReport.statements.covered
    }

    // Calculate global percentages
    testReport.coverage.global.lines.percentage = calculatePercentage(
      testReport.coverage.global.lines.covered,
      testReport.coverage.global.lines.total
    )
    testReport.coverage.global.functions.percentage = calculatePercentage(
      testReport.coverage.global.functions.covered,
      testReport.coverage.global.functions.total
    )
    testReport.coverage.global.branches.percentage = calculatePercentage(
      testReport.coverage.global.branches.covered,
      testReport.coverage.global.branches.total
    )
    testReport.coverage.global.statements.percentage = calculatePercentage(
      testReport.coverage.global.statements.covered,
      testReport.coverage.global.statements.total
    )
  }

  // Generate detailed report
  const reportPath = path.join(process.cwd(), 'coverage', 'test-results.json')
  const htmlReportPath = path.join(process.cwd(), 'coverage', 'test-summary.html')

  // Ensure coverage directory exists
  const coverageDir = path.dirname(reportPath)
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true })
  }

  // Write JSON report
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2))

  // Generate HTML summary report
  const htmlContent = generateHTMLReport(testReport)
  fs.writeFileSync(htmlReportPath, htmlContent)

  // Console output
  console.log('\n' + '='.repeat(80))
  console.log('📊 LINKEDIN AUTO-APPLY EXTENSION - TEST REPORT SUMMARY')
  console.log('='.repeat(80))
  console.log(`📋 Total Tests: ${testReport.summary.totalTests}`)
  console.log(`✅ Passed: ${testReport.summary.passedTests}`)
  console.log(`❌ Failed: ${testReport.summary.failedTests}`)
  console.log(`⏭️  Skipped: ${testReport.summary.pendingTests}`)
  console.log(`⏱️  Duration: ${Math.round(testReport.summary.duration / 1000)}s`)
  console.log(`🎯 Success Rate: ${testReport.quality.reliabilityScore.toFixed(1)}%`)

  if (testReport.coverage) {
    console.log('\n📈 COVERAGE SUMMARY:')
    console.log(`Lines: ${testReport.coverage.global.lines.percentage.toFixed(1)}%`)
    console.log(`Functions: ${testReport.coverage.global.functions.percentage.toFixed(1)}%`)
    console.log(`Branches: ${testReport.coverage.global.branches.percentage.toFixed(1)}%`)
    console.log(`Statements: ${testReport.coverage.global.statements.percentage.toFixed(1)}%`)
  }

  if (testReport.performance.slowestTests.length > 0) {
    console.log('\n🐌 SLOWEST TESTS:')
    testReport.performance.slowestTests.slice(0, 5).forEach(test => {
      console.log(`  ${test.name}: ${test.duration}ms`)
    })
  }

  console.log(`\n📄 Detailed reports saved to:`)
  console.log(`  JSON: ${reportPath}`)
  console.log(`  HTML: ${htmlReportPath}`)
  console.log('='.repeat(80) + '\n')

  return results
}

function calculateCoveragePercentage(coverageData) {
  if (!coverageData) return { total: 0, covered: 0, percentage: 0 }
  
  const items = Object.values(coverageData)
  const total = items.length
  const covered = items.filter(item => item > 0).length
  const percentage = total > 0 ? (covered / total) * 100 : 0

  return { total, covered, percentage }
}

function calculatePercentage(covered, total) {
  return total > 0 ? (covered / total) * 100 : 0
}

function generateHTMLReport(testReport) {
  const passRate = testReport.quality.reliabilityScore.toFixed(1)
  const status = testReport.summary.success ? 'PASSED' : 'FAILED'
  const statusColor = testReport.summary.success ? '#28a745' : '#dc3545'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkedIn Auto-Apply Extension - Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0077b5, #005885); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
        .header .subtitle { opacity: 0.9; margin-top: 10px; font-size: 1.1em; }
        .status { display: inline-block; padding: 8px 16px; border-radius: 4px; font-weight: bold; margin-top: 15px; }
        .status.passed { background: #28a745; }
        .status.failed { background: #dc3545; }
        .content { padding: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { text-align: center; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
        .metric .value { font-size: 2.5em; font-weight: bold; color: #0077b5; }
        .metric .label { color: #6c757d; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .coverage-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .coverage-item { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; }
        .coverage-value { font-size: 1.8em; font-weight: bold; color: #28a745; }
        .section { margin: 30px 0; }
        .section h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .slow-tests { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; }
        .test-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .footer { text-align: center; padding: 20px; color: #6c757d; border-top: 1px solid #e9ecef; }
        .timestamp { font-size: 0.9em; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 LinkedIn Auto-Apply Extension</h1>
            <div class="subtitle">Comprehensive Test Report & Quality Analysis</div>
            <div class="status ${status.toLowerCase()}">${status}</div>
            <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
        </div>
        
        <div class="content">
            <div class="metrics">
                <div class="metric">
                    <div class="value">${testReport.summary.totalTests}</div>
                    <div class="label">Total Tests</div>
                </div>
                <div class="metric">
                    <div class="value">${testReport.summary.passedTests}</div>
                    <div class="label">Passed</div>
                </div>
                <div class="metric">
                    <div class="value">${testReport.summary.failedTests}</div>
                    <div class="label">Failed</div>
                </div>
                <div class="metric">
                    <div class="value">${passRate}%</div>
                    <div class="label">Success Rate</div>
                </div>
            </div>
            
            ${testReport.coverage ? `
            <div class="section">
                <h2>📈 Code Coverage</h2>
                <div class="coverage-grid">
                    <div class="coverage-item">
                        <div class="coverage-value">${testReport.coverage.global.lines.percentage.toFixed(1)}%</div>
                        <div>Lines</div>
                    </div>
                    <div class="coverage-item">
                        <div class="coverage-value">${testReport.coverage.global.functions.percentage.toFixed(1)}%</div>
                        <div>Functions</div>
                    </div>
                    <div class="coverage-item">
                        <div class="coverage-value">${testReport.coverage.global.branches.percentage.toFixed(1)}%</div>
                        <div>Branches</div>
                    </div>
                    <div class="coverage-item">
                        <div class="coverage-value">${testReport.coverage.global.statements.percentage.toFixed(1)}%</div>
                        <div>Statements</div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${testReport.performance.slowestTests.length > 0 ? `
            <div class="section">
                <h2>🐌 Performance Analysis</h2>
                <div class="slow-tests">
                    <h4>Slowest Tests:</h4>
                    ${testReport.performance.slowestTests.slice(0, 5).map(test => `
                        <div class="test-item">
                            <span>${test.name}</span>
                            <span><strong>${test.duration}ms</strong></span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="section">
                <h2>🎯 Quality Metrics</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div style="padding: 15px; background: #e8f5e8; border-radius: 6px;">
                        <strong>Reliability Score:</strong> ${testReport.quality.reliabilityScore.toFixed(1)}%
                    </div>
                    <div style="padding: 15px; background: #e3f2fd; border-radius: 6px;">
                        <strong>Test Suites:</strong> ${testReport.summary.testSuites}
                    </div>
                    <div style="padding: 15px; background: #fff3e0; border-radius: 6px;">
                        <strong>Execution Time:</strong> ${Math.round(testReport.summary.duration / 1000)}s
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>🤖 Generated with LinkedIn Auto-Apply Extension Test Suite</p>
            <p>For detailed coverage reports, see the <code>coverage/</code> directory</p>
        </div>
    </div>
</body>
</html>
  `
}