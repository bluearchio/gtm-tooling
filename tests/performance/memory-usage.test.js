/**
 * Performance and Memory Usage Tests
 * Tests for memory leaks, performance bottlenecks, and resource usage
 */

import fs from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'

// Helper to measure memory usage
function getMemoryUsage() {
  if (global.gc) {
    global.gc()
  }
  return process.memoryUsage()
}

// Helper to format bytes
function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

describe('Performance and Memory Tests', () => {
  let initialMemory
  
  beforeAll(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    initialMemory = getMemoryUsage()
  })

  describe('Memory Leak Detection', () => {
    test('should not leak memory when processing large job lists', async () => {
      const startMemory = getMemoryUsage()
      
      // Simulate processing many jobs
      for (let i = 0; i < 1000; i++) {
        const jobs = Array.from({ length: 100 }, (_, j) => ({
          id: `job-${i}-${j}`,
          title: `Software Engineer ${i}-${j}`,
          company: `Company ${i}`,
          location: 'Remote',
          description: 'Lorem ipsum '.repeat(100),
          requirements: Array.from({ length: 10 }, () => 'Requirement'),
          isEasyApply: true,
          isRemote: true,
          postedDate: new Date()
        }))
        
        // Process jobs (simulate what the extension does)
        const filteredJobs = jobs.filter(job => job.isEasyApply)
        const sortedJobs = filteredJobs.sort((a, b) => b.postedDate - a.postedDate)
        
        // Clear references
        jobs.length = 0
        filteredJobs.length = 0
        sortedJobs.length = 0
      }
      
      // Force garbage collection
      if (global.gc) {
        global.gc()
      }
      
      const endMemory = getMemoryUsage()
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed
      
      console.log(`Memory increase: ${formatBytes(memoryIncrease)}`)
      
      // Memory increase should be less than 50MB for this operation
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    test('should not leak memory with DOM operations', async () => {
      const startMemory = getMemoryUsage()
      
      // Simulate many DOM operations
      for (let i = 0; i < 500; i++) {
        document.body.innerHTML = ''
        
        // Create job cards
        for (let j = 0; j < 50; j++) {
          const card = document.createElement('div')
          card.className = 'job-card'
          card.setAttribute('data-job-id', `job-${i}-${j}`)
          card.innerHTML = `
            <h3>Job Title ${j}</h3>
            <p>Company ${j}</p>
            <span>Location ${j}</span>
          `
          document.body.appendChild(card)
        }
        
        // Query and process cards
        const cards = document.querySelectorAll('.job-card')
        Array.from(cards).forEach(card => {
          const id = card.getAttribute('data-job-id')
          const title = card.querySelector('h3')?.textContent
        })
        
        // Clear DOM
        document.body.innerHTML = ''
      }
      
      if (global.gc) {
        global.gc()
      }
      
      const endMemory = getMemoryUsage()
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed
      
      console.log(`DOM memory increase: ${formatBytes(memoryIncrease)}`)
      
      // Should not leak more than 30MB
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024)
    })

    test('should properly clean up observers', async () => {
      const startMemory = getMemoryUsage()
      const observers = []
      
      // Create many observers
      for (let i = 0; i < 100; i++) {
        const observer = new MutationObserver(() => {})
        observer.observe(document.body, {
          childList: true,
          subtree: true
        })
        observers.push(observer)
      }
      
      // Disconnect all observers
      observers.forEach(observer => observer.disconnect())
      observers.length = 0
      
      if (global.gc) {
        global.gc()
      }
      
      const endMemory = getMemoryUsage()
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed
      
      console.log(`Observer memory increase: ${formatBytes(memoryIncrease)}`)
      
      // Should release most memory
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024)
    })

    test('should handle storage efficiently', async () => {
      const startMemory = getMemoryUsage()
      
      // Simulate storage operations
      const storage = new Map()
      
      for (let i = 0; i < 1000; i++) {
        // Add large application records
        const application = {
          id: `app-${i}`,
          jobDetails: {
            id: `job-${i}`,
            title: 'Software Engineer',
            company: 'Tech Corp',
            description: 'Long description '.repeat(100)
          },
          appliedAt: new Date(),
          status: 'submitted'
        }
        
        storage.set(application.id, application)
        
        // Periodically clean old entries (like the extension would)
        if (i % 100 === 0 && i > 0) {
          const keysToDelete = Array.from(storage.keys()).slice(0, 50)
          keysToDelete.forEach(key => storage.delete(key))
        }
      }
      
      storage.clear()
      
      if (global.gc) {
        global.gc()
      }
      
      const endMemory = getMemoryUsage()
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed
      
      console.log(`Storage memory increase: ${formatBytes(memoryIncrease)}`)
      
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024)
    })
  })

  describe('Performance Benchmarks', () => {
    test('should process job cards quickly', () => {
      // Create 100 job cards
      document.body.innerHTML = ''
      for (let i = 0; i < 100; i++) {
        const card = document.createElement('li')
        card.setAttribute('data-job-id', `job-${i}`)
        card.innerHTML = `
          <h3 class="job-card-list__title">Software Engineer ${i}</h3>
          <a class="job-card-container__company-name">Company ${i}</a>
          <span class="job-card-container__metadata-item">Location ${i}</span>
        `
        document.body.appendChild(card)
      }
      
      const startTime = performance.now()
      
      // Extract job information from all cards
      const jobs = []
      const cards = document.querySelectorAll('[data-job-id]')
      cards.forEach(card => {
        const job = {
          id: card.getAttribute('data-job-id'),
          title: card.querySelector('.job-card-list__title')?.textContent?.trim(),
          company: card.querySelector('.job-card-container__company-name')?.textContent?.trim(),
          location: card.querySelector('.job-card-container__metadata-item')?.textContent?.trim()
        }
        jobs.push(job)
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`Processed ${jobs.length} jobs in ${duration.toFixed(2)}ms`)
      
      // Should process 100 jobs in less than 50ms
      expect(duration).toBeLessThan(50)
    })

    test('should filter jobs efficiently', () => {
      // Create large job dataset
      const jobs = Array.from({ length: 1000 }, (_, i) => ({
        id: `job-${i}`,
        title: `Software Engineer ${i}`,
        company: `Company ${i % 10}`,
        location: i % 2 === 0 ? 'Remote' : 'San Francisco',
        isRemote: i % 2 === 0,
        isEasyApply: i % 3 === 0,
        salary: { min: 100000 + (i * 1000), max: 150000 + (i * 1000) },
        postedDate: new Date(Date.now() - (i * 86400000)), // Days ago
        description: `Description for job ${i}`,
        requirements: ['JavaScript', 'React', 'Node.js']
      }))
      
      const filters = {
        isRemote: true,
        isEasyApply: true,
        salaryMin: 120000,
        keywords: ['JavaScript', 'React'],
        postedWithin: 7
      }
      
      const startTime = performance.now()
      
      // Apply filters
      const filteredJobs = jobs.filter(job => {
        if (filters.isRemote && !job.isRemote) return false
        if (filters.isEasyApply && !job.isEasyApply) return false
        if (filters.salaryMin && job.salary.max < filters.salaryMin) return false
        
        const daysAgo = (Date.now() - job.postedDate) / 86400000
        if (filters.postedWithin && daysAgo > filters.postedWithin) return false
        
        if (filters.keywords && filters.keywords.length > 0) {
          const jobText = `${job.title} ${job.description} ${job.requirements.join(' ')}`.toLowerCase()
          const hasKeywords = filters.keywords.some(keyword => 
            jobText.includes(keyword.toLowerCase())
          )
          if (!hasKeywords) return false
        }
        
        return true
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`Filtered ${jobs.length} jobs to ${filteredJobs.length} in ${duration.toFixed(2)}ms`)
      
      // Should filter 1000 jobs in less than 10ms
      expect(duration).toBeLessThan(10)
    })

    test('should handle rapid DOM updates', () => {
      const updateCount = 100
      const startTime = performance.now()
      
      for (let i = 0; i < updateCount; i++) {
        // Update status overlay
        let overlay = document.getElementById('status-overlay')
        if (!overlay) {
          overlay = document.createElement('div')
          overlay.id = 'status-overlay'
          document.body.appendChild(overlay)
        }
        
        overlay.innerHTML = `
          <div>Status: Processing...</div>
          <div>Jobs Found: ${i * 10}</div>
          <div>Applied: ${i}</div>
          <div>Progress: ${i}%</div>
        `
        
        overlay.style.display = i % 2 === 0 ? 'block' : 'none'
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`Performed ${updateCount} DOM updates in ${duration.toFixed(2)}ms`)
      
      // Should handle 100 updates in less than 50ms
      expect(duration).toBeLessThan(50)
    })

    test('should handle message passing efficiently', async () => {
      const messageCount = 100
      const messages = []
      
      // Mock message handler
      const handleMessage = (request) => {
        switch (request.type) {
          case 'GET_STATUS':
            return { isRunning: true, count: 10 }
          case 'UPDATE_CONFIG':
            return { success: true }
          case 'JOBS_FOUND':
            return { processed: request.jobs.length }
          default:
            return { success: false }
        }
      }
      
      const startTime = performance.now()
      
      // Send many messages
      for (let i = 0; i < messageCount; i++) {
        const request = {
          type: i % 3 === 0 ? 'GET_STATUS' : i % 3 === 1 ? 'UPDATE_CONFIG' : 'JOBS_FOUND',
          jobs: i % 3 === 2 ? Array.from({ length: 10 }, (_, j) => ({ id: j })) : undefined
        }
        
        const response = handleMessage(request)
        messages.push(response)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`Processed ${messageCount} messages in ${duration.toFixed(2)}ms`)
      
      // Should process 100 messages in less than 5ms
      expect(duration).toBeLessThan(5)
    })
  })

  describe('Resource Usage', () => {
    test('should limit concurrent operations', async () => {
      const maxConcurrent = 5
      let currentOperations = 0
      let maxOperationsReached = 0
      
      const performOperation = async () => {
        currentOperations++
        maxOperationsReached = Math.max(maxOperationsReached, currentOperations)
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10))
        
        currentOperations--
      }
      
      // Queue many operations
      const operations = []
      for (let i = 0; i < 20; i++) {
        operations.push(performOperation())
        
        // Limit concurrent operations
        if (operations.length >= maxConcurrent) {
          await Promise.race(operations)
          operations.shift()
        }
      }
      
      await Promise.all(operations)
      
      console.log(`Max concurrent operations: ${maxOperationsReached}`)
      
      expect(maxOperationsReached).toBeLessThanOrEqual(maxConcurrent)
    })

    test('should throttle rapid function calls', () => {
      let callCount = 0
      const throttleTime = 100
      let lastCallTime = 0
      
      const throttledFunction = () => {
        const now = Date.now()
        if (now - lastCallTime >= throttleTime) {
          callCount++
          lastCallTime = now
        }
      }
      
      const startTime = Date.now()
      
      // Call function rapidly for 500ms
      while (Date.now() - startTime < 500) {
        throttledFunction()
      }
      
      console.log(`Throttled calls: ${callCount} in 500ms`)
      
      // Should be throttled to ~5 calls in 500ms
      expect(callCount).toBeLessThanOrEqual(6)
      expect(callCount).toBeGreaterThanOrEqual(4)
    })

    test('should debounce input handlers', async () => {
      let processCount = 0
      let debounceTimer = null
      
      const debouncedProcess = () => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          processCount++
        }, 50)
      }
      
      // Simulate rapid input
      for (let i = 0; i < 10; i++) {
        debouncedProcess()
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log(`Debounced process calls: ${processCount}`)
      
      // Should only process once after rapid inputs
      expect(processCount).toBe(1)
    })
  })

  describe('Long Running Session', () => {
    test('should maintain performance over time', async () => {
      const iterations = 100
      const timings = []
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        
        // Simulate typical operations
        const jobs = Array.from({ length: 10 }, (_, j) => ({
          id: `job-${i}-${j}`,
          title: `Job ${j}`,
          company: `Company ${j}`
        }))
        
        const filtered = jobs.filter(job => job.id.includes('5'))
        const sorted = filtered.sort((a, b) => a.title.localeCompare(b.title))
        
        const endTime = performance.now()
        timings.push(endTime - startTime)
      }
      
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length
      const firstHalfAvg = timings.slice(0, 50).reduce((a, b) => a + b, 0) / 50
      const secondHalfAvg = timings.slice(50).reduce((a, b) => a + b, 0) / 50
      
      console.log(`Average operation time: ${avgTime.toFixed(2)}ms`)
      console.log(`First half avg: ${firstHalfAvg.toFixed(2)}ms`)
      console.log(`Second half avg: ${secondHalfAvg.toFixed(2)}ms`)
      
      // Performance should not degrade significantly
      const degradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg
      expect(degradation).toBeLessThan(0.2) // Less than 20% degradation
    })
  })

  afterAll(() => {
    const finalMemory = getMemoryUsage()
    const totalIncrease = finalMemory.heapUsed - initialMemory.heapUsed
    
    console.log('\n=== Final Memory Report ===')
    console.log(`Initial heap: ${formatBytes(initialMemory.heapUsed)}`)
    console.log(`Final heap: ${formatBytes(finalMemory.heapUsed)}`)
    console.log(`Total increase: ${formatBytes(totalIncrease)}`)
    console.log(`External: ${formatBytes(finalMemory.external)}`)
    console.log('===========================\n')
  })
})