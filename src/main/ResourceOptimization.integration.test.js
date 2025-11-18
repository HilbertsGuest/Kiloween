const path = require('path');
const fs = require('fs').promises;
const DocumentProcessor = require('./DocumentProcessor');
const QuestionGenerator = require('./QuestionGenerator');
const ResourceMonitor = require('./ResourceMonitor');

describe('Resource Optimization Integration', () => {
  let documentProcessor;
  let questionGenerator;
  let resourceMonitor;
  let testCachePath;

  beforeEach(async () => {
    // Set up test cache path
    testCachePath = path.join(__dirname, '../../data', 'test-questions-resource.json');
    
    // Clean up any existing cache
    try {
      await fs.unlink(testCachePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    // Initialize with optimization settings
    documentProcessor = new DocumentProcessor({
      useWorkerThreads: true,
      maxConcurrentWorkers: 2
    });

    questionGenerator = new QuestionGenerator({
      cachePath: testCachePath,
      maxCachedQuestions: 50, // Lower limit for testing
      lazyLoad: true
    });

    resourceMonitor = new ResourceMonitor({
      sampleInterval: 1000, // 1 second
      maxSamples: 10
    });
  });

  afterEach(async () => {
    // Stop monitoring
    if (resourceMonitor) {
      resourceMonitor.stop();
    }

    // Clean up test cache
    try {
      await fs.unlink(testCachePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('Memory Usage', () => {
    it('should stay within memory limits during document processing', async () => {
      // Start monitoring
      resourceMonitor.start();

      // Wait for initial samples
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Process test documents
      const testDocs = [
        path.join(__dirname, '../../test-data/sample.txt'),
        path.join(__dirname, '../../test-data/sample.md')
      ];

      const result = await documentProcessor.processAllDocuments(testDocs);

      // Wait for more samples
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check memory compliance
      const compliance = resourceMonitor.checkCompliance({
        maxMemoryMB: 100,
        maxCPUPercent: 10 // More lenient for tests
      });

      expect(compliance.memory.compliant).toBe(true);
      expect(compliance.memory.current).toBeLessThan(100);
    });

    it('should respect question cache memory limits', async () => {
      // Create test documents
      const testDoc = {
        filePath: 'test.txt',
        content: 'This is a test document with many keywords. ' +
                 'Testing memory limits and optimization features. ' +
                 'The system should handle large amounts of data efficiently. ' +
                 'Performance monitoring is important for resource management. ' +
                 'Cache limits prevent excessive memory usage. '.repeat(20),
        metadata: {
          title: 'Test Document',
          wordCount: 100,
          format: '.txt'
        }
      };

      // Generate many questions
      const questions = questionGenerator.generateQuestions([testDoc], 100);

      // Save to cache
      await questionGenerator.saveCache(questions, ['test.txt']);

      // Verify cache was limited
      expect(questionGenerator.cachedQuestions.length).toBeLessThanOrEqual(50);

      // Load cache and verify limit is still applied
      await questionGenerator.loadCache(true);
      expect(questionGenerator.cachedQuestions.length).toBeLessThanOrEqual(50);
    });
  });

  describe('CPU Usage', () => {
    it('should maintain low CPU usage during idle', async () => {
      // Start monitoring
      resourceMonitor.start();

      // Wait for samples during idle
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check CPU compliance
      const compliance = resourceMonitor.checkCompliance({
        maxMemoryMB: 100,
        maxCPUPercent: 5
      });

      const avgCPU = resourceMonitor.getAverageCPU();
      console.log(`Average CPU usage during idle: ${avgCPU?.toFixed(2)}%`);

      // CPU should be low during idle
      expect(avgCPU).toBeLessThan(10); // Lenient for test environment
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('Worker Thread Optimization', () => {
    it('should use worker threads for document processing', async () => {
      const testDoc = path.join(__dirname, '../../test-data/sample.txt');

      // Process with worker thread
      const result = await documentProcessor.processDocument(testDoc, true);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should fall back to main thread if worker fails', async () => {
      const testDoc = path.join(__dirname, '../../test-data/sample.txt');

      // Force worker thread usage
      documentProcessor.useWorkerThreads = true;
      documentProcessor.maxConcurrentWorkers = 0; // Force fallback

      const result = await documentProcessor.processDocument(testDoc);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should limit concurrent workers', async () => {
      const testDocs = [
        path.join(__dirname, '../../test-data/sample.txt'),
        path.join(__dirname, '../../test-data/sample.md'),
        path.join(__dirname, '../../test-data/sample.txt'),
        path.join(__dirname, '../../test-data/sample.md')
      ];

      // Process multiple documents
      const promises = testDocs.map(doc => 
        documentProcessor.processDocument(doc, true)
      );

      // Check that active workers don't exceed limit
      expect(documentProcessor.activeWorkers).toBeLessThanOrEqual(2);

      await Promise.all(promises);

      // All workers should be done
      expect(documentProcessor.activeWorkers).toBe(0);
    });
  });

  describe('Lazy Loading', () => {
    it('should not load cache until needed', async () => {
      // Create a new generator with lazy loading
      const lazyGenerator = new QuestionGenerator({
        cachePath: testCachePath,
        lazyLoad: true
      });

      // Cache should not be loaded yet
      expect(lazyGenerator.cacheLoaded).toBe(false);

      // Generate and save questions with more substantial content
      const testDoc = {
        filePath: 'test.txt',
        content: 'Testing is an important process for software development. ' +
                 'Performance optimization helps improve system efficiency. ' +
                 'Resource management ensures applications run smoothly. ' +
                 'Memory limits prevent excessive resource consumption. ' +
                 'Lazy loading reduces initial memory footprint. ' +
                 'Worker threads enable parallel processing capabilities. ' +
                 'Monitoring provides insights into system behavior. ' +
                 'Optimization techniques improve overall performance. ' +
                 'Caching strategies reduce redundant computations. ' +
                 'Testing validates functionality and correctness. '.repeat(5),
        metadata: {
          title: 'Test',
          wordCount: 100,
          format: '.txt'
        }
      };

      const questions = lazyGenerator.generateQuestions([testDoc], 10);
      await lazyGenerator.saveCache(questions, ['test.txt']);

      // Clear memory cache
      lazyGenerator.clearMemoryCache();
      expect(lazyGenerator.cacheLoaded).toBe(false);
      expect(lazyGenerator.cachedQuestions.length).toBe(0);

      // Get next question should trigger lazy load
      const question = await lazyGenerator.getNextQuestion();
      expect(lazyGenerator.cacheLoaded).toBe(true);
      expect(question).toBeDefined();
    });

    it('should skip loading if already loaded', async () => {
      // Load cache once
      await questionGenerator.loadCache();
      expect(questionGenerator.cacheLoaded).toBe(true);

      const firstLoadTime = Date.now();

      // Load again (should skip)
      await questionGenerator.loadCache();
      const secondLoadTime = Date.now();

      // Second load should be instant (< 10ms)
      expect(secondLoadTime - firstLoadTime).toBeLessThan(10);
    });
  });

  describe('Resource Summary', () => {
    it('should provide comprehensive resource summary', async () => {
      resourceMonitor.start();

      // Do some work
      const testDoc = path.join(__dirname, '../../test-data/sample.txt');
      await documentProcessor.processDocument(testDoc);

      // Wait for samples
      await new Promise(resolve => setTimeout(resolve, 3000));

      const summary = resourceMonitor.getSummary();

      expect(summary).toBeDefined();
      expect(summary.memory.current).toBeDefined();
      expect(summary.memory.average).toBeDefined();
      expect(summary.cpu.current).toBeDefined();
      expect(summary.cpu.average).toBeDefined();
      expect(summary.samples.count).toBeGreaterThan(0);

      console.log('Resource Summary:', JSON.stringify(summary, null, 2));
    });
  });

  describe('Garbage Collection', () => {
    it('should clear memory cache when requested', async () => {
      // Generate questions with more substantial content
      const testDoc = {
        filePath: 'test.txt',
        content: 'Memory management is crucial for application performance. ' +
                 'Cache clearing helps free up system resources effectively. ' +
                 'Testing validates that memory limits work correctly. ' +
                 'Resource optimization improves overall system efficiency. ' +
                 'Garbage collection reclaims unused memory automatically. ' +
                 'Performance monitoring tracks resource usage patterns. ' +
                 'Lazy loading reduces initial memory requirements. ' +
                 'Worker threads enable concurrent processing tasks. ' +
                 'Optimization strategies enhance application responsiveness. ' +
                 'Testing ensures functionality meets requirements. '.repeat(5),
        metadata: {
          title: 'Test',
          wordCount: 100,
          format: '.txt'
        }
      };

      const questions = questionGenerator.generateQuestions([testDoc], 20);
      await questionGenerator.saveCache(questions, ['test.txt']);

      expect(questionGenerator.cachedQuestions.length).toBeGreaterThan(0);

      // Clear cache
      questionGenerator.clearMemoryCache();

      expect(questionGenerator.cachedQuestions.length).toBe(0);
      expect(questionGenerator.cacheLoaded).toBe(false);
    });
  });
});
