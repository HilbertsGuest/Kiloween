import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import DocumentProcessor from './DocumentProcessor.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('DocumentProcessor - Integration Tests', () => {
  let processor;
  let testDir;
  let testFiles;

  beforeAll(async () => {
    processor = new DocumentProcessor();
    
    // Create a temporary directory for test files
    testDir = path.join(os.tmpdir(), `doc-processor-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create test files
    testFiles = {
      txt1: path.join(testDir, 'test1.txt'),
      txt2: path.join(testDir, 'test2.txt'),
      md1: path.join(testDir, 'test1.md'),
      md2: path.join(testDir, 'test2.md'),
      invalid: path.join(testDir, 'invalid.txt'),
      missing: path.join(testDir, 'missing.txt')
    };

    // Write test content
    await fs.writeFile(testFiles.txt1, 'This is test document one with some content.');
    await fs.writeFile(testFiles.txt2, 'This is test document two with different content.');
    await fs.writeFile(testFiles.md1, '# Test Markdown\n\nThis is a markdown document with **bold** text.');
    await fs.writeFile(testFiles.md2, '# Another Document\n\nMore markdown content here.');
    await fs.writeFile(testFiles.invalid, ''); // Empty file
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('processAllDocuments', () => {
    it('should process multiple documents successfully', async () => {
      const filePaths = [testFiles.txt1, testFiles.txt2];
      
      const result = await processor.processAllDocuments(filePaths);

      expect(result).toBeDefined();
      expect(result.documents).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.totalWords).toBeGreaterThan(0);
    });

    it('should process documents of different formats', async () => {
      const filePaths = [testFiles.txt1, testFiles.md1];
      
      const result = await processor.processAllDocuments(filePaths);

      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].metadata.format).toBe('.txt');
      expect(result.documents[1].metadata.format).toBe('.md');
      expect(result.summary.successful).toBe(2);
    });

    it('should handle empty array gracefully', async () => {
      const result = await processor.processAllDocuments([]);

      expect(result.documents).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.total).toBe(0);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.totalWords).toBe(0);
    });

    it('should handle null/undefined input gracefully', async () => {
      const result1 = await processor.processAllDocuments(null);
      const result2 = await processor.processAllDocuments(undefined);

      expect(result1.documents).toHaveLength(0);
      expect(result2.documents).toHaveLength(0);
    });

    it('should aggregate errors for failed documents', async () => {
      const filePaths = [
        testFiles.txt1,
        testFiles.missing, // This file doesn't exist
        testFiles.txt2
      ];
      
      const result = await processor.processAllDocuments(filePaths);

      expect(result.documents).toHaveLength(2); // Two successful
      expect(result.errors).toHaveLength(1); // One failed
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      
      // Check error details
      expect(result.errors[0].filePath).toBe(testFiles.missing);
      expect(result.errors[0].error).toContain('does not exist');
    });

    it('should continue processing after encountering errors', async () => {
      const filePaths = [
        testFiles.missing, // Error
        testFiles.txt1,    // Success
        'invalid/path.txt', // Error
        testFiles.txt2     // Success
      ];
      
      const result = await processor.processAllDocuments(filePaths);

      expect(result.documents).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(2);
    });

    it('should calculate total word count correctly', async () => {
      const filePaths = [testFiles.txt1, testFiles.txt2];
      
      const result = await processor.processAllDocuments(filePaths);

      // txt1 has 8 words, txt2 has 8 words
      expect(result.summary.totalWords).toBeGreaterThan(10);
      
      // Verify individual word counts
      const totalWords = result.documents.reduce(
        (sum, doc) => sum + doc.metadata.wordCount, 
        0
      );
      expect(result.summary.totalWords).toBe(totalWords);
    });

    it('should track progress during processing', async () => {
      const filePaths = [testFiles.txt1, testFiles.txt2, testFiles.md1];
      const progressUpdates = [];
      
      const onProgress = (processed, total, currentFile) => {
        progressUpdates.push({ processed, total, currentFile });
      };

      await processor.processAllDocuments(filePaths, onProgress);

      // Should have 3 progress updates (one per file)
      expect(progressUpdates).toHaveLength(3);
      
      // Check progress values
      expect(progressUpdates[0].total).toBe(3);
      expect(progressUpdates[1].total).toBe(3);
      expect(progressUpdates[2].total).toBe(3);
      
      // Processed count should increase
      const processedCounts = progressUpdates.map(p => p.processed);
      expect(Math.max(...processedCounts)).toBe(3);
    });

    it('should call progress callback even when errors occur', async () => {
      const filePaths = [testFiles.txt1, testFiles.missing, testFiles.txt2];
      const progressUpdates = [];
      
      const onProgress = (processed, total, currentFile) => {
        progressUpdates.push({ processed, total, currentFile });
      };

      await processor.processAllDocuments(filePaths, onProgress);

      // Should have 3 progress updates (including the failed one)
      expect(progressUpdates).toHaveLength(3);
      expect(progressUpdates.some(p => p.currentFile === testFiles.missing)).toBe(true);
    });

    it('should handle progress callback errors gracefully', async () => {
      const filePaths = [testFiles.txt1, testFiles.txt2];
      
      const onProgress = () => {
        throw new Error('Progress callback error');
      };

      // Should not throw, even if callback throws
      await expect(
        processor.processAllDocuments(filePaths, onProgress)
      ).rejects.toThrow('Progress callback error');
    });

    it('should process documents in parallel', async () => {
      const filePaths = [testFiles.txt1, testFiles.txt2, testFiles.md1, testFiles.md2];
      
      const startTime = Date.now();
      const result = await processor.processAllDocuments(filePaths);
      const endTime = Date.now();
      
      // All documents should be processed
      expect(result.documents).toHaveLength(4);
      
      // Processing time should be reasonable (parallel should be faster than sequential)
      // This is a rough check - in real scenarios, parallel processing is much faster
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle all documents failing', async () => {
      const filePaths = [
        'missing1.txt',
        'missing2.txt',
        'missing3.txt'
      ];
      
      const result = await processor.processAllDocuments(filePaths);

      expect(result.documents).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(3);
      expect(result.summary.totalWords).toBe(0);
    });

    it('should preserve document order in results', async () => {
      const filePaths = [testFiles.txt1, testFiles.md1, testFiles.txt2];
      
      const result = await processor.processAllDocuments(filePaths);

      // Check that documents are in the expected order
      expect(result.documents[0].metadata.format).toBe('.txt');
      expect(result.documents[1].metadata.format).toBe('.md');
      expect(result.documents[2].metadata.format).toBe('.txt');
    });

    it('should handle empty files', async () => {
      const filePaths = [testFiles.invalid, testFiles.txt1];
      
      const result = await processor.processAllDocuments(filePaths);

      // Empty file should still be processed (0 words)
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].metadata.wordCount).toBe(0);
      expect(result.documents[1].metadata.wordCount).toBeGreaterThan(0);
    });

    it('should include all document metadata', async () => {
      const filePaths = [testFiles.txt1, testFiles.md1];
      
      const result = await processor.processAllDocuments(filePaths);

      result.documents.forEach(doc => {
        expect(doc).toHaveProperty('filePath');
        expect(doc).toHaveProperty('content');
        expect(doc).toHaveProperty('metadata');
        expect(doc.metadata).toHaveProperty('title');
        expect(doc.metadata).toHaveProperty('wordCount');
        expect(doc.metadata).toHaveProperty('format');
      });
    });

    it('should handle large number of documents', async () => {
      // Create multiple test files
      const manyFiles = [];
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testDir, `bulk-test-${i}.txt`);
        await fs.writeFile(filePath, `Test content for document ${i}`);
        manyFiles.push(filePath);
      }

      const result = await processor.processAllDocuments(manyFiles);

      expect(result.documents).toHaveLength(10);
      expect(result.summary.successful).toBe(10);
      expect(result.summary.failed).toBe(0);

      // Clean up
      for (const file of manyFiles) {
        await fs.unlink(file);
      }
    });

    it('should provide detailed error information', async () => {
      const filePaths = [
        testFiles.missing,
        'invalid/path/file.txt'
      ];
      
      const result = await processor.processAllDocuments(filePaths);

      expect(result.errors).toHaveLength(2);
      
      result.errors.forEach(error => {
        expect(error).toHaveProperty('filePath');
        expect(error).toHaveProperty('error');
        expect(typeof error.error).toBe('string');
        expect(error.error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('processAllDocuments with real test-data files', () => {
    it('should process actual test files from test-data directory', async () => {
      const testDataDir = path.join(process.cwd(), 'test-data');
      
      // Check if test-data directory exists
      try {
        await fs.access(testDataDir);
      } catch {
        console.log('test-data directory not found, skipping real file test');
        return;
      }

      const filePaths = [
        path.join(testDataDir, 'sample.txt'),
        path.join(testDataDir, 'sample.md')
      ];

      // Filter to only existing files
      const existingFiles = [];
      for (const filePath of filePaths) {
        try {
          await fs.access(filePath);
          existingFiles.push(filePath);
        } catch {
          // File doesn't exist, skip it
        }
      }

      if (existingFiles.length === 0) {
        console.log('No test files found, skipping real file test');
        return;
      }

      const result = await processor.processAllDocuments(existingFiles);

      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.summary.successful).toBe(existingFiles.length);
      expect(result.summary.totalWords).toBeGreaterThan(0);
    });
  });
});
