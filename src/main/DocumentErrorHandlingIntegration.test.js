const fs = require('fs').promises;
const path = require('path');

// Mock electron before importing modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => './test-data')
  }
}));

const DocumentProcessor = require('./DocumentProcessor');
const ConfigManager = require('./ConfigManager');
const ErrorLogger = require('./ErrorLogger');

describe('Document Error Handling Integration', () => {
  let documentProcessor;
  let configManager;
  let errorLogger;
  let testDir;
  let configPath;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(__dirname, '../../test-data/integration-error-test');
    await fs.mkdir(testDir, { recursive: true });

    // Create config manager with test config path
    configPath = path.join(testDir, 'config.json');
    configManager = new ConfigManager(configPath);
    await configManager.load();

    // Create error logger
    const logPath = path.join(testDir, 'test.log');
    errorLogger = new ErrorLogger(logPath);

    // Create document processor
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

  describe('Invalid Document Removal', () => {
    it('should identify and remove invalid documents from config', async () => {
      // Create one valid and one invalid document
      const validDoc = path.join(testDir, 'valid.txt');
      await fs.writeFile(validDoc, 'Valid content here');

      const invalidDoc = path.join(testDir, 'missing.txt');
      // Don't create this file

      // Add both to config
      await configManager.set('documents', [validDoc, invalidDoc]);

      // Validate all documents
      const validationResults = await documentProcessor.validateDocuments([validDoc, invalidDoc]);

      // Separate valid and invalid
      const validDocs = [];
      const invalidDocs = [];

      for (const [filePath, result] of validationResults.entries()) {
        if (result.valid) {
          validDocs.push(filePath);
        } else {
          invalidDocs.push(filePath);
        }
      }

      // Remove invalid documents from config
      await configManager.set('documents', validDocs);

      // Verify config only has valid documents
      const updatedDocs = configManager.get('documents');
      expect(updatedDocs).toEqual([validDoc]);
      expect(updatedDocs).not.toContain(invalidDoc);
    });

    it('should handle all documents being invalid', async () => {
      const missingDoc1 = path.join(testDir, 'missing1.txt');
      const missingDoc2 = path.join(testDir, 'missing2.txt');

      await configManager.set('documents', [missingDoc1, missingDoc2]);

      const validationResults = await documentProcessor.validateDocuments([missingDoc1, missingDoc2]);

      const validDocs = [];
      for (const [filePath, result] of validationResults.entries()) {
        if (result.valid) {
          validDocs.push(filePath);
        }
      }

      await configManager.set('documents', validDocs);

      const updatedDocs = configManager.get('documents');
      expect(updatedDocs).toEqual([]);
    });
  });

  describe('Error Reporting', () => {
    it('should provide detailed error information for each failed document', async () => {
      const missingDoc = path.join(testDir, 'missing.txt');
      const emptyDoc = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyDoc, '');

      const corruptedDoc = path.join(testDir, 'corrupted.pdf');
      await fs.writeFile(corruptedDoc, 'Not a PDF');

      const docs = [missingDoc, emptyDoc, corruptedDoc];

      const result = await documentProcessor.processAllDocuments(docs);

      expect(result.errors.length).toBe(3);

      // Check that each error has required fields
      result.errors.forEach(error => {
        expect(error.filePath).toBeDefined();
        expect(error.error).toBeDefined();
        expect(error.userFriendlyError).toBeDefined();
        expect(error.fileName).toBeDefined();
      });

      // Check specific error messages
      const missingError = result.errors.find(e => e.filePath === missingDoc);
      expect(missingError.userFriendlyError).toContain('not found');

      const emptyError = result.errors.find(e => e.filePath === emptyDoc);
      expect(emptyError.userFriendlyError).toContain('empty');
    });

    it('should log all errors during batch processing', async () => {
      const missingDoc = path.join(testDir, 'missing.txt');
      const emptyDoc = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyDoc, '');

      await documentProcessor.processAllDocuments([missingDoc, emptyDoc]);

      // Check error log
      const logs = await errorLogger.readRecentLogs(50);
      const logEntries = logs.map(log => JSON.parse(log));

      // Should have errors for both documents
      const documentErrors = logEntries.filter(log => 
        log.category === 'DocumentProcessing' || 
        log.category === 'DocumentValidation' ||
        log.category === 'TextProcessing'
      );

      expect(documentErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Recovery from Errors', () => {
    it('should continue processing after encountering errors', async () => {
      const validDoc1 = path.join(testDir, 'valid1.txt');
      await fs.writeFile(validDoc1, 'Valid content 1');

      const invalidDoc = path.join(testDir, 'missing.txt');

      const validDoc2 = path.join(testDir, 'valid2.txt');
      await fs.writeFile(validDoc2, 'Valid content 2');

      const result = await documentProcessor.processAllDocuments([
        validDoc1,
        invalidDoc,
        validDoc2
      ]);

      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.documents.length).toBe(2);
    });

    it('should provide summary statistics even with errors', async () => {
      const validDoc = path.join(testDir, 'valid.txt');
      await fs.writeFile(validDoc, 'Valid content with multiple words here');

      const invalidDoc = path.join(testDir, 'missing.txt');

      const result = await documentProcessor.processAllDocuments([validDoc, invalidDoc]);

      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.totalWords).toBeGreaterThan(0);
    });
  });

  describe('User-Friendly Error Messages', () => {
    it('should provide clear error for missing files', async () => {
      const missingFile = path.join(testDir, 'nonexistent.pdf');

      const validation = await documentProcessor.validateDocument(missingFile);

      expect(validation.userFriendlyError).toBeDefined();
      expect(validation.userFriendlyError).not.toContain('ENOENT');
      expect(validation.userFriendlyError).toContain('not found');
    });

    it('should provide clear error for corrupted files', async () => {
      const corruptedPDF = path.join(testDir, 'corrupted.pdf');
      await fs.writeFile(corruptedPDF, 'Not a real PDF');

      try {
        await documentProcessor.processPDF(corruptedPDF);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.userFriendly).toBeDefined();
        expect(error.userFriendly).toContain('corrupted');
        expect(error.userFriendly).not.toContain('pdf-parse');
      }
    });

    it('should provide clear error for empty files', async () => {
      const emptyFile = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyFile, '');

      const validation = await documentProcessor.validateDocument(emptyFile);

      expect(validation.userFriendlyError).toBeDefined();
      expect(validation.userFriendlyError).toContain('empty');
    });

    it('should provide clear error for oversized files', async () => {
      const largeFile = path.join(testDir, 'large.txt');
      const largeContent = 'x'.repeat(51 * 1024 * 1024); // 51MB
      await fs.writeFile(largeFile, largeContent);

      const validation = await documentProcessor.validateDocument(largeFile);

      expect(validation.userFriendlyError).toBeDefined();
      expect(validation.userFriendlyError).toContain('too large');
      expect(validation.userFriendlyError).toContain('MB');
    });

    it('should provide clear error for unsupported formats', async () => {
      const unsupportedFile = path.join(testDir, 'document.exe');
      await fs.writeFile(unsupportedFile, 'content');

      const validation = await documentProcessor.validateDocument(unsupportedFile);

      expect(validation.userFriendlyError).toBeDefined();
      expect(validation.userFriendlyError).toContain('Unsupported');
      expect(validation.userFriendlyError).toContain('PDF, DOCX, MD, or TXT');
    });
  });

  describe('Config Persistence After Error Handling', () => {
    it('should persist config after removing invalid documents', async () => {
      const validDoc = path.join(testDir, 'valid.txt');
      await fs.writeFile(validDoc, 'Valid content');

      const invalidDoc = path.join(testDir, 'missing.txt');

      await configManager.set('documents', [validDoc, invalidDoc]);

      // Validate and remove invalid
      const validationResults = await documentProcessor.validateDocuments([validDoc, invalidDoc]);
      const validDocs = [];
      for (const [filePath, result] of validationResults.entries()) {
        if (result.valid) {
          validDocs.push(filePath);
        }
      }
      await configManager.set('documents', validDocs);

      // Reload config from disk
      const newConfigManager = new ConfigManager(configPath);
      await newConfigManager.load();

      const reloadedDocs = newConfigManager.get('documents');
      expect(reloadedDocs).toEqual([validDoc]);
    });
  });
});
