/**
 * Verification script for resource optimization
 * Run with: node VERIFY_RESOURCE_OPTIMIZATION.js
 */

const ResourceMonitor = require('./src/main/ResourceMonitor');
const DocumentProcessor = require('./src/main/DocumentProcessor');
const QuestionGenerator = require('./src/main/QuestionGenerator');
const path = require('path');

async function verifyResourceOptimization() {
  console.log('=== Resource Optimization Verification ===\n');

  // Initialize resource monitor
  const monitor = new ResourceMonitor({
    sampleInterval: 2000, // 2 seconds for quick demo
    maxSamples: 10
  });

  console.log('1. Starting resource monitoring...');
  monitor.start();

  // Wait for initial samples
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n2. Initial Resource Usage:');
  const initialSummary = monitor.getSummary();
  console.log(`   Memory (RSS): ${initialSummary.memory.current.rss.toFixed(2)} MB`);
  console.log(`   Heap Used: ${initialSummary.memory.current.heapUsed.toFixed(2)} MB`);
  console.log(`   CPU: ${(initialSummary.cpu.current || 0).toFixed(2)}%`);

  // Initialize optimized components
  console.log('\n3. Initializing optimized components...');
  const documentProcessor = new DocumentProcessor({
    useWorkerThreads: true,
    maxConcurrentWorkers: 2
  });

  const questionGenerator = new QuestionGenerator({
    cachePath: path.join(__dirname, 'data', 'verify-questions.json'),
    maxCachedQuestions: 50,
    lazyLoad: true
  });

  console.log('   ✓ DocumentProcessor with worker threads');
  console.log('   ✓ QuestionGenerator with lazy loading');

  // Test document processing
  console.log('\n4. Processing test documents...');
  const testDocs = [
    path.join(__dirname, 'test-data', 'sample.txt'),
    path.join(__dirname, 'test-data', 'sample.md')
  ];

  const result = await documentProcessor.processAllDocuments(testDocs);
  console.log(`   ✓ Processed ${result.documents.length} documents`);
  console.log(`   ✓ Total words: ${result.summary.totalWords}`);

  // Wait for samples after processing
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n5. Resource Usage After Processing:');
  const afterProcessing = monitor.getSummary();
  console.log(`   Memory (RSS): ${afterProcessing.memory.average.rss.toFixed(2)} MB`);
  console.log(`   Heap Used: ${afterProcessing.memory.average.heapUsed.toFixed(2)} MB`);
  console.log(`   CPU (avg): ${(afterProcessing.cpu.average || 0).toFixed(2)}%`);

  // Check compliance
  console.log('\n6. Compliance Check:');
  const compliance = monitor.checkCompliance({
    maxMemoryMB: 100,
    maxCPUPercent: 5
  });

  console.log(`   Memory: ${compliance.memory.compliant ? '✓' : '✗'} ${compliance.memory.current.toFixed(2)} MB / ${compliance.memory.limit} MB`);
  console.log(`   CPU: ${compliance.cpu.compliant ? '✓' : '✗'} ${(compliance.cpu.current || 0).toFixed(2)}% / ${compliance.cpu.limit}%`);
  console.log(`   Overall: ${compliance.compliant ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}`);

  // Test lazy loading
  console.log('\n7. Testing Lazy Loading:');
  console.log(`   Cache loaded: ${questionGenerator.cacheLoaded}`);
  
  if (result.documents.length > 0) {
    const questions = questionGenerator.generateQuestions(result.documents, 20);
    await questionGenerator.saveCache(questions, testDocs);
    console.log(`   ✓ Generated ${questions.length} questions`);
    
    // Clear cache
    questionGenerator.clearMemoryCache();
    console.log(`   ✓ Cache cleared, loaded: ${questionGenerator.cacheLoaded}`);
    
    // Lazy load
    const question = await questionGenerator.getNextQuestion();
    console.log(`   ✓ Lazy loaded, loaded: ${questionGenerator.cacheLoaded}`);
  }

  // Final summary
  console.log('\n8. Final Resource Summary:');
  await new Promise(resolve => setTimeout(resolve, 2000));
  const finalSummary = monitor.getSummary();
  
  console.log(`   Samples collected: ${finalSummary.samples.count}`);
  console.log(`   Monitoring duration: ${finalSummary.samples.duration.toFixed(1)}s`);
  console.log(`   Average Memory: ${finalSummary.memory.average.rss.toFixed(2)} MB`);
  console.log(`   Average CPU: ${(finalSummary.cpu.average || 0).toFixed(2)}%`);

  // Stop monitoring
  monitor.stop();
  console.log('\n✓ Verification complete!\n');

  // Cleanup
  try {
    const fs = require('fs');
    fs.unlinkSync(path.join(__dirname, 'data', 'verify-questions.json'));
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run verification
verifyResourceOptimization().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
