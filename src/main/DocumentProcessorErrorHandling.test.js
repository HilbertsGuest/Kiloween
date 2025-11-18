const fs = require('fs').promises;
const path = require('path');
const DocumentProcessor = require('./DocumentProcessor');
const ErrorLogger = require('./ErrorLogger');

describe('DocumentProcessor Error Handling', () => {
  let documentProcessor;
  let errorLogger;
  let testDir;
  let logPath;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(__dirname, '../../test-data/error-handling-test');
    await fs.mkdir(testDir, { recursive: true });

    // Create error logger with test log path
    logPath = path.join(testDir, 'test.log');
    errorLogger = new ErrorLogger(logPath);

    // Create DocumentProcessor with error logger
    documentProcessor = new DocumentProcessor({ errorLogger });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up test directory:', error);
    }
  });

  describe('Missing File Handling', () => {
    it('should handle missing file gracefully', async () => {
      const missingFile = path.join(testDir, 'nonexistent.pdf');

      const validation = await documentProcessor.validateDocument(missingFile);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('does not exist');
      expect(validation.userFriendlyError).toContain('File not found');
    });

    it('should log error for missing file', async () => {
      const missingFile = path.join(testDir, 'nonexistent.pdf');

      await documentProcessor.validateDocument(missingFile);

      // Check that error was logged
      const logs = await errorLogger.readRecentLogs(10);
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = JSON.parse(logs[logs.length - 1]);
      expect(lastLog.category).toBe('DocumentValidation');
      expect(lastLog.message).toContain('does not exist');
    });

    it('should throw user-friendly error when processing missing file', async () => {
      const missingFile = path.join(testDir, 'nonexistent.pdf');

      await expect(documentProcessor.processPDF(missingFile)).rejects.toThrow();
      
      try {
        await documentProcessor.processPDF(missingFile);
      } catch (error) {
        expect(error.userFriendly).toBeDefined();
        expect(error.userFriendly).toContain('File not found');
      }
    });
  });

  describe('Corrupted File Handling', () => {
    it('should handle corrupted PDF gracefully', async () => {
      const corruptedPDF = path.join(testDir, 'corrupted.pdf');
      await fs.writeFile(corruptedPDF, 'This is not a valid PDF file');

      await expect(documentProcessor.processPDF(corruptedPDF)).rejects.toThrow();
      
      try {
        await documentProcessor.processPDF(corruptedPDF);
      } catch (error) {
        expect(error.userFriendly).toBeDefined();
        expect(error.userFriendly).toContain('corrupted');
      }
    });

    it('should handle corrupted DOCX gracefully', async () => {
      const corruptedDOCX = path.join(testDir, 'corrupted.docx');
      await fs.writeFile(corruptedDOCX, 'This is not a valid DOCX file');

      await expect(documentProcessor.processDOCX(corruptedDOCX)).rejects.toThrow();
      
      try {
        await documentProcessor.processDOCX(corruptedDOCX);
      } catch (error) {
        expect(error.userFriendly).toBeDefined();
        expect(error.userFriendly).toContain('corrupted');
      }
    });

    it('should log error for corrupted files', async () => {
      const corruptedPDF = path.join(testDir, 'corrupted.pdf');
      await fs.writeFile(corruptedPDF, 'This is not a valid PDF file');

      try {
        await documentProcessor.processPDF(corruptedPDF);
      } catch (error) {
        // Expected to throw
      }

      // Check that error was logged
      const logs = await errorLogger.readRecentLogs(10);
      expect(logs.length).toBeGreaterThan(0);
      
      const logEntries = logs.map(log => JSON.parse(log));
      const pdfError = logEntries.find(log => log.category === 'PDFProcessing');
      expect(pdfError).toBeDefined();
    });
  });

  describe('Empty File Handling', () => {
    it('should detect empty files during validation', async () => {
      const emptyFile = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyFile, '');

      const validation = await documentProcessor.validateDocument(emptyFile);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('empty');
      expect(validation.userFriendlyError).toContain('empty');
    });

    it('should handle empty text file', async () => {
      const emptyFile = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyFile, '');

      await expect(documentProcessor.processText(emptyFile)).rejects.toThrow();
    });

    it('should handle whitespace-only file', async () => {
      const whitespaceFile = path.join(testDir, 'whitespace.txt');
      await fs.writeFile(whitespaceFile, '   \n\n   \t\t   ');

      await expect(documentProcessor.processText(whitespaceFile)).rejects.toThrow();
      
      try {
        await documentProcessor.processText(whitespaceFile);
      } catch (error) {
        expect(error.userFriendly).toContain('empty');
      }
    });
  });

  describe('File Size Validation', () => {
    it('should reject files exceeding size limit', async () => {
      const largeFile = path.join(testDir, 'large.txt');
      const largeContent = 'x'.repeat(51 * 1024 * 1024); // 51MB
      await fs.writeFile(largeFile, largeContent);

      const validation = await documentProcessor.validateDocument(largeFile);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('exceeds maximum');
      expect(validation.userFriendlyError).toContain('too large');
    });

    it('should log warning for oversized files', async () => {
      const largeFile = path.join(testDir, 'large.txt');
      const largeContent = 'x'.repeat(51 * 1024 * 1024); // 51MB
      await fs.writeFile(largeFile, largeContent);

      await documentProcessor.validateDocument(largeFile);

      const logs = await errorLogger.readRecentLogs(10);
      const logEntries = logs.map(log => JSON.parse(log));
      const sizeWarning = logEntries.find(log => 
        log.level === 'WARNING' && log.message.includes('exceeds maximum')
      );
      expect(sizeWarning).toBeDefined();
    });
  });

  describe('Unsupported Format Handling', () => {
    it('should reject unsupported file formats', async () => {
      const unsupportedFile = path.join(testDir, 'document.exe');
      await fs.writeFile(unsupportedFile, 'content');

      const validation = await documentProcessor.validateDocument(unsupportedFile);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Unsupported format');
      expect(validation.userFriendlyError).toContain('Unsupported file type');
    });

    it('should provide list of supported formats in error', async () => {
      const unsupportedFile = path.join(testDir, 'document.zip');
      await fs.writeFile(unsupportedFile, 'content');

      const validation = await documentProcessor.validateDocument(unsupportedFile);

      expect(validation.userFriendlyError).toContain('PDF, DOCX, MD, or TXT');
    });
  });

  describe('Batch Processing Error Handling', () => {
    it('should process valid files and report errors for invalid ones', async () => {
      // Create mix of valid and invalid files
      const validFile = path.join(testDir, 'valid.txt');
      await fs.writeFile(validFile, 'This is valid content');

      const missingFile = path.join(testDir, 'missing.txt');
      const emptyFile = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyFile, '');

      const files = [validFile, missingFile, emptyFile];

      const result = await documentProcessor.processAllDocuments(files);

      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(2);
      expect(result.documents.length).toBe(1);
      expect(result.errors.length).toBe(2);
    });

    it('should provide user-friendly error messages in batch results', async () => {
      const missingFile = path.join(testDir, 'missing.txt');
      const emptyFile = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyFile, '');

      const files = [missingFile, emptyFile];

      const result = await documentProcessor.processAllDocuments(files);

      expect(result.errors.length).toBe(2);
      result.errors.forEach(error => {
        expect(error.userFriendlyError).toBeDefined();
        expect(error.fileName).toBeDefined();
      });
    });

    it('should log batch processing summary', async () => {
      const validFile = path.join(testDir, 'valid.txt');
      await fs.writeFile(validFile, 'Valid content');

      const missingFile = path.join(testDir, 'missing.txt');

      await documentProcessor.processAllDocuments([validFile, missingFile]);

      const logs = await errorLogger.readRecentLogs(20);
      const logEntries = logs.map(log => JSON.parse(log));
      
      const startLog = logEntries.find(log => 
        log.message.includes('Starting batch processing')
      );
      expect(startLog).toBeDefined();

      const completeLog = logEntries.find(log => 
        log.message.includes('Batch processing complete')
      );
      expect(completeLog).toBeDefined();
    });
  });

  describe('Error Logger', () => {
    it('should write errors to log file', async () => {
      await errorLogger.logError('TestCategory', 'Test error message', { test: true });

      const logs = await errorLogger.readRecentLogs(1);
      expect(logs.length).toBe(1);

      const logEntry = JSON.parse(logs[0]);
      expect(logEntry.category).toBe('TestCategory');
      expect(logEntry.message).toBe('Test error message');
      expect(logEntry.context.test).toBe(true);
    });

    it('should write warnings to log file', async () => {
      await errorLogger.logWarning('TestCategory', 'Test warning', { warn: true });

      const logs = await errorLogger.readRecentLogs(1);
      expect(logs.length).toBe(1);

      const logEntry = JSON.parse(logs[0]);
      expect(logEntry.level).toBe('WARNING');
      expect(logEntry.category).toBe('TestCategory');
    });

    it('should rotate log file when it exceeds max size', async () => {
      // Write many log entries to exceed size limit
      const smallLogger = new ErrorLogger(logPath);
      smallLogger.maxLogSize = 1024; // 1KB for testing

      for (let i = 0; i < 100; i++) {
        await smallLogger.logError('Test', 'x'.repeat(100), {});
      }

      // Check that old log exists
      const oldLogPath = logPath + '.old';
      const oldLogExists = await fs.access(oldLogPath)
        .then(() => true)
        .catch(() => false);

      expect(oldLogExists).toBe(true);
    });
  });

  describe('Encoding Issues', () => {
    it('should handle UTF-8 encoded files', async () => {
      const utf8File = path.join(testDir, 'utf8.txt');
      await fs.writeFile(utf8File, 'Hello 世界 🌍', 'utf8');

      const result = await documentProcessor.processText(utf8File);

      expect(result.content).toContain('Hello');
      expect(result.content).toContain('世界');
    });

    it('should fallback to latin1 for non-UTF8 files', async () => {
      const latin1File = path.join(testDir, 'latin1.txt');
      await fs.writeFile(latin1File, Buffer.from([0xE9, 0xE8, 0xE0]), 'binary'); // Latin1 chars

      // Should not throw, should use fallback
      const result = await documentProcessor.processText(latin1File);
      expect(result.content).toBeDefined();
    });
  });
});
