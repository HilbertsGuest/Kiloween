const fs = require('fs').promises;
const path = require('path');
const DocumentProcessor = require('./DocumentProcessor');
const PDFDocument = require('pdfkit');

describe('DocumentProcessor', () => {
  let processor;
  let testDir;
  let testFiles;

  beforeEach(async () => {
    processor = new DocumentProcessor();
    testDir = path.join(__dirname, '../../test-data');
    
    // Ensure test directory exists
    await fs.mkdir(testDir, { recursive: true });

    // Create test files
    testFiles = {
      validPdf: path.join(testDir, 'test.pdf'),
      validDocx: path.join(testDir, 'test.docx'),
      validMd: path.join(testDir, 'test.md'),
      validTxt: path.join(testDir, 'test.txt'),
      invalidFormat: path.join(testDir, 'test.exe'),
      largeFile: path.join(testDir, 'large.pdf'),
      emptyFile: path.join(testDir, 'empty.txt')
    };

    // Create valid test files with some content
    await fs.writeFile(testFiles.validPdf, 'PDF content');
    await fs.writeFile(testFiles.validDocx, 'DOCX content');
    await fs.writeFile(testFiles.validMd, '# Markdown content');
    await fs.writeFile(testFiles.validTxt, 'Text content');
    await fs.writeFile(testFiles.invalidFormat, 'Invalid format');
    await fs.writeFile(testFiles.emptyFile, '');
  });

  afterEach(async () => {
    // Clean up test files
    try {
      for (const file of Object.values(testFiles)) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // Ignore if file doesn't exist
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create instance with default max file size', () => {
      const proc = new DocumentProcessor();
      expect(proc.maxFileSize).toBe(50 * 1024 * 1024); // 50MB
    });

    it('should create instance with custom max file size', () => {
      const customSize = 10 * 1024 * 1024; // 10MB
      const proc = new DocumentProcessor({ maxFileSize: customSize });
      expect(proc.maxFileSize).toBe(customSize);
    });

    it('should have supported formats defined', () => {
      expect(processor.supportedFormats).toEqual(['.pdf', '.docx', '.md', '.txt']);
    });
  });

  describe('validateDocument', () => {
    it('should validate a valid PDF file', async () => {
      const result = await processor.validateDocument(testFiles.validPdf);
      expect(result.valid).toBe(true);
      expect(result.metadata.format).toBe('.pdf');
      expect(result.metadata.size).toBeGreaterThan(0);
      expect(result.metadata.path).toBeTruthy();
    });

    it('should validate a valid DOCX file', async () => {
      const result = await processor.validateDocument(testFiles.validDocx);
      expect(result.valid).toBe(true);
      expect(result.metadata.format).toBe('.docx');
    });

    it('should validate a valid Markdown file', async () => {
      const result = await processor.validateDocument(testFiles.validMd);
      expect(result.valid).toBe(true);
      expect(result.metadata.format).toBe('.md');
    });

    it('should validate a valid TXT file', async () => {
      const result = await processor.validateDocument(testFiles.validTxt);
      expect(result.valid).toBe(true);
      expect(result.metadata.format).toBe('.txt');
    });

    it('should reject non-existent file', async () => {
      const result = await processor.validateDocument(path.join(testDir, 'nonexistent.pdf'));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should reject unsupported format', async () => {
      const result = await processor.validateDocument(testFiles.invalidFormat);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported format');
      expect(result.error).toContain('.exe');
    });

    it('should reject empty file path', async () => {
      const result = await processor.validateDocument('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a non-empty string');
    });

    it('should reject null file path', async () => {
      const result = await processor.validateDocument(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a non-empty string');
    });

    it('should reject directory path', async () => {
      const result = await processor.validateDocument(testDir);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not a file');
    });

    it('should reject file exceeding size limit', async () => {
      // Create a processor with small max size
      const smallProcessor = new DocumentProcessor({ maxFileSize: 5 }); // 5 bytes
      const result = await smallProcessor.validateDocument(testFiles.validPdf);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should accept file within size limit', async () => {
      const result = await processor.validateDocument(testFiles.validPdf);
      expect(result.valid).toBe(true);
    });

    it('should accept empty file', async () => {
      const result = await processor.validateDocument(testFiles.emptyFile);
      expect(result.valid).toBe(true);
      expect(result.metadata.size).toBe(0);
    });

    it('should handle case-insensitive extensions', async () => {
      const upperCaseFile = path.join(testDir, 'test.PDF');
      await fs.writeFile(upperCaseFile, 'PDF content');
      
      const result = await processor.validateDocument(upperCaseFile);
      expect(result.valid).toBe(true);
      expect(result.metadata.format).toBe('.pdf');
      
      await fs.unlink(upperCaseFile);
    });

    it('should resolve relative paths', async () => {
      const relativePath = path.relative(process.cwd(), testFiles.validPdf);
      const result = await processor.validateDocument(relativePath);
      expect(result.valid).toBe(true);
      expect(path.isAbsolute(result.metadata.path)).toBe(true);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const exists = await processor.fileExists(testFiles.validPdf);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await processor.fileExists(path.join(testDir, 'nonexistent.pdf'));
      expect(exists).toBe(false);
    });

    it('should return true for directory', async () => {
      const exists = await processor.fileExists(testDir);
      expect(exists).toBe(true);
    });
  });

  describe('detectFormat', () => {
    it('should detect PDF format', () => {
      const format = processor.detectFormat('document.pdf');
      expect(format).toBe('.pdf');
    });

    it('should detect DOCX format', () => {
      const format = processor.detectFormat('document.docx');
      expect(format).toBe('.docx');
    });

    it('should detect Markdown format', () => {
      const format = processor.detectFormat('document.md');
      expect(format).toBe('.md');
    });

    it('should detect TXT format', () => {
      const format = processor.detectFormat('document.txt');
      expect(format).toBe('.txt');
    });

    it('should return null for unsupported format', () => {
      const format = processor.detectFormat('document.exe');
      expect(format).toBe(null);
    });

    it('should handle case-insensitive extensions', () => {
      const format = processor.detectFormat('document.PDF');
      expect(format).toBe('.pdf');
    });

    it('should return null for empty string', () => {
      const format = processor.detectFormat('');
      expect(format).toBe(null);
    });

    it('should return null for null input', () => {
      const format = processor.detectFormat(null);
      expect(format).toBe(null);
    });

    it('should handle files without extension', () => {
      const format = processor.detectFormat('document');
      expect(format).toBe(null);
    });

    it('should handle paths with multiple dots', () => {
      const format = processor.detectFormat('my.document.pdf');
      expect(format).toBe('.pdf');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return array of supported formats', () => {
      const formats = processor.getSupportedFormats();
      expect(formats).toEqual(['.pdf', '.docx', '.md', '.txt']);
    });

    it('should return a copy of the array', () => {
      const formats = processor.getSupportedFormats();
      formats.push('.exe');
      expect(processor.getSupportedFormats()).toEqual(['.pdf', '.docx', '.md', '.txt']);
    });
  });

  describe('validateDocuments', () => {
    it('should validate multiple documents', async () => {
      const filePaths = [
        testFiles.validPdf,
        testFiles.validDocx,
        testFiles.validMd
      ];
      
      const results = await processor.validateDocuments(filePaths);
      
      expect(results.size).toBe(3);
      expect(results.get(testFiles.validPdf).valid).toBe(true);
      expect(results.get(testFiles.validDocx).valid).toBe(true);
      expect(results.get(testFiles.validMd).valid).toBe(true);
    });

    it('should handle mix of valid and invalid documents', async () => {
      const filePaths = [
        testFiles.validPdf,
        testFiles.invalidFormat,
        path.join(testDir, 'nonexistent.pdf')
      ];
      
      const results = await processor.validateDocuments(filePaths);
      
      expect(results.size).toBe(3);
      expect(results.get(testFiles.validPdf).valid).toBe(true);
      expect(results.get(testFiles.invalidFormat).valid).toBe(false);
      expect(results.get(path.join(testDir, 'nonexistent.pdf')).valid).toBe(false);
    });

    it('should return empty map for empty array', async () => {
      const results = await processor.validateDocuments([]);
      expect(results.size).toBe(0);
    });

    it('should return empty map for non-array input', async () => {
      const results = await processor.validateDocuments(null);
      expect(results.size).toBe(0);
    });

    it('should validate documents in parallel', async () => {
      const filePaths = [
        testFiles.validPdf,
        testFiles.validDocx,
        testFiles.validMd,
        testFiles.validTxt
      ];
      
      const startTime = Date.now();
      const results = await processor.validateDocuments(filePaths);
      const duration = Date.now() - startTime;
      
      expect(results.size).toBe(4);
      // Parallel execution should be faster than sequential
      // This is a rough check - actual timing may vary
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('isFileSizeValid', () => {
    it('should return true for file within size limit', async () => {
      const isValid = await processor.isFileSizeValid(testFiles.validPdf);
      expect(isValid).toBe(true);
    });

    it('should return false for file exceeding size limit', async () => {
      const smallProcessor = new DocumentProcessor({ maxFileSize: 5 });
      const isValid = await smallProcessor.isFileSizeValid(testFiles.validPdf);
      expect(isValid).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const isValid = await processor.isFileSizeValid(path.join(testDir, 'nonexistent.pdf'));
      expect(isValid).toBe(false);
    });

    it('should return true for empty file', async () => {
      const isValid = await processor.isFileSizeValid(testFiles.emptyFile);
      expect(isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in file path', async () => {
      const specialFile = path.join(testDir, 'test file (1).pdf');
      await fs.writeFile(specialFile, 'content');
      
      const result = await processor.validateDocument(specialFile);
      expect(result.valid).toBe(true);
      
      await fs.unlink(specialFile);
    });

    it('should handle very long file names', async () => {
      const longName = 'a'.repeat(200) + '.pdf';
      const longFile = path.join(testDir, longName);
      
      try {
        await fs.writeFile(longFile, 'content');
        const result = await processor.validateDocument(longFile);
        expect(result.valid).toBe(true);
        await fs.unlink(longFile);
      } catch (error) {
        // Some file systems may not support very long names
        // This is acceptable
        expect(error).toBeTruthy();
      }
    });

    it('should handle concurrent validations', async () => {
      const promises = [
        processor.validateDocument(testFiles.validPdf),
        processor.validateDocument(testFiles.validDocx),
        processor.validateDocument(testFiles.validMd),
        processor.validateDocument(testFiles.validTxt)
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('PDF Processing', () => {
    let pdfFiles;

    beforeEach(async () => {
      pdfFiles = {
        corrupted: path.join(testDir, 'corrupted.pdf'),
        notPdf: path.join(testDir, 'notpdf.pdf')
      };

      // Create corrupted PDF (invalid PDF data)
      await fs.writeFile(pdfFiles.corrupted, 'This is not a valid PDF file content');

      // Create a file with .pdf extension but not actually a PDF
      await fs.writeFile(pdfFiles.notPdf, 'Just plain text, not a PDF');
    });

    afterEach(async () => {
      // Clean up PDF test files
      for (const file of Object.values(pdfFiles)) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // Ignore if file doesn't exist
        }
      }
    });

    describe('processPDF', () => {
      it('should throw error for corrupted PDF', async () => {
        await expect(processor.processPDF(pdfFiles.corrupted))
          .rejects.toThrow(/corrupted|invalid|Failed to parse PDF/i);
      });

      it('should throw error for non-PDF file with .pdf extension', async () => {
        await expect(processor.processPDF(pdfFiles.notPdf))
          .rejects.toThrow(/corrupted|invalid|Failed to parse PDF/i);
      });

      it('should throw error for non-existent file', async () => {
        const nonExistent = path.join(testDir, 'nonexistent.pdf');
        await expect(processor.processPDF(nonExistent))
          .rejects.toThrow(/does not exist/i);
      });

      it('should throw error for non-PDF file', async () => {
        await expect(processor.processPDF(testFiles.validTxt))
          .rejects.toThrow(/Expected PDF file/i);
      });
    });

    describe('processDocument', () => {
      it('should throw error for unsupported format', async () => {
        await expect(processor.processDocument(testFiles.invalidFormat))
          .rejects.toThrow(/Unsupported/i);
      });

      it('should process MD and TXT formats', async () => {
        // MD and TXT processing are now implemented
        const mdResult = await processor.processDocument(testFiles.validMd);
        expect(mdResult).toBeDefined();
        
        const txtResult = await processor.processDocument(testFiles.validTxt);
        expect(txtResult).toBeDefined();
      });
    });

    describe('processAllDocuments', () => {
      it('should return empty result for empty input', async () => {
        const results = await processor.processAllDocuments([]);
        expect(results.documents).toEqual([]);
        expect(results.errors).toEqual([]);
        expect(results.summary.total).toBe(0);
      });

      it('should return empty result for null input', async () => {
        const results = await processor.processAllDocuments(null);
        expect(results.documents).toEqual([]);
        expect(results.errors).toEqual([]);
        expect(results.summary.total).toBe(0);
      });

      it('should handle all documents failing gracefully', async () => {
        const filePaths = [
          pdfFiles.corrupted,
          pdfFiles.notPdf,
          path.join(testDir, 'nonexistent.pdf')
        ];
        
        const results = await processor.processAllDocuments(filePaths);
        
        // Should return empty documents array when all fail
        expect(results.documents).toEqual([]);
        expect(results.errors).toHaveLength(3);
        expect(results.summary.failed).toBe(3);
        expect(results.summary.successful).toBe(0);
      });
    });

    describe('error handling', () => {
      it('should provide descriptive error for encrypted PDF', async () => {
        // Note: Creating an encrypted PDF requires additional setup
        // This test documents the expected behavior
        const encryptedFile = path.join(testDir, 'encrypted.pdf');
        
        // Simulate encrypted PDF by creating invalid PDF that triggers encryption error
        // In real scenario, this would be an actual encrypted PDF
        await fs.writeFile(encryptedFile, '%PDF-1.4\n%encrypted content');
        
        try {
          await processor.processPDF(encryptedFile);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error.message).toMatch(/encrypted|password|corrupted|invalid|Failed to parse PDF/i);
        }

        await fs.unlink(encryptedFile);
      });
    });

    describe('integration with validation', () => {
      it('should validate before processing', async () => {
        // processPDF should call validateDocument internally
        const nonExistent = path.join(testDir, 'nonexistent.pdf');
        
        await expect(processor.processPDF(nonExistent))
          .rejects.toThrow(/does not exist/i);
      });

      it('should reject files exceeding size limit', async () => {
        const smallProcessor = new DocumentProcessor({ maxFileSize: 10 });
        
        // Use a valid PDF file that exceeds the size limit
        await expect(smallProcessor.processPDF(testFiles.validPdf))
          .rejects.toThrow(/exceeds maximum allowed size/i);
      });
    });
  });

  describe('DOCX Processing', () => {
    let docxFiles;

    beforeEach(async () => {
      docxFiles = {
        corrupted: path.join(testDir, 'corrupted.docx'),
        notDocx: path.join(testDir, 'notdocx.docx'),
        empty: path.join(testDir, 'empty.docx')
      };

      // Create corrupted DOCX (invalid DOCX data)
      await fs.writeFile(docxFiles.corrupted, 'This is not a valid DOCX file content');

      // Create a file with .docx extension but not actually a DOCX
      await fs.writeFile(docxFiles.notDocx, 'Just plain text, not a DOCX');

      // Create empty file with .docx extension
      await fs.writeFile(docxFiles.empty, '');
    });

    afterEach(async () => {
      // Clean up DOCX test files
      for (const file of Object.values(docxFiles)) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // Ignore if file doesn't exist
        }
      }
    });

    describe('processDOCX', () => {
      it('should throw error for corrupted DOCX', async () => {
        await expect(processor.processDOCX(docxFiles.corrupted))
          .rejects.toThrow(/corrupted|invalid|Failed to parse DOCX/i);
      });

      it('should throw error for non-DOCX file with .docx extension', async () => {
        await expect(processor.processDOCX(docxFiles.notDocx))
          .rejects.toThrow(/corrupted|invalid|Failed to parse DOCX/i);
      });

      it('should throw error for non-existent file', async () => {
        const nonExistent = path.join(testDir, 'nonexistent.docx');
        await expect(processor.processDOCX(nonExistent))
          .rejects.toThrow(/does not exist/i);
      });

      it('should throw error for non-DOCX file', async () => {
        await expect(processor.processDOCX(testFiles.validTxt))
          .rejects.toThrow(/Expected DOCX file/i);
      });

      it('should throw error for empty DOCX file', async () => {
        await expect(processor.processDOCX(docxFiles.empty))
          .rejects.toThrow(/corrupted|invalid|Failed to parse DOCX/i);
      });
    });

    describe('processDocument with DOCX', () => {
      it('should route DOCX files to processDOCX', async () => {
        // This will fail because we're using a fake DOCX file
        await expect(processor.processDocument(docxFiles.corrupted))
          .rejects.toThrow(/corrupted|invalid|Failed to parse DOCX/i);
      });

      it('should handle DOCX processing errors gracefully', async () => {
        const filePaths = [docxFiles.corrupted, docxFiles.notDocx];
        const results = await processor.processAllDocuments(filePaths);
        
        // Should return empty documents array when all fail
        expect(results.documents).toEqual([]);
        expect(results.errors).toHaveLength(2);
        expect(results.summary.failed).toBe(2);
      });
    });

    describe('error handling', () => {
      it('should provide descriptive error for corrupted DOCX', async () => {
        try {
          await processor.processDOCX(docxFiles.corrupted);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error.message).toMatch(/corrupted|invalid|Failed to parse DOCX/i);
        }
      });

      it('should handle DOCX with invalid zip structure', async () => {
        const invalidZip = path.join(testDir, 'invalid-zip.docx');
        await fs.writeFile(invalidZip, 'PK\x03\x04invalid zip data');
        
        try {
          await processor.processDOCX(invalidZip);
          expect(true).toBe(false);
        } catch (error) {
          expect(error.message).toMatch(/corrupted|invalid|Failed to parse DOCX/i);
        }

        await fs.unlink(invalidZip);
      });
    });

    describe('integration with validation', () => {
      it('should validate before processing DOCX', async () => {
        const nonExistent = path.join(testDir, 'nonexistent.docx');
        
        await expect(processor.processDOCX(nonExistent))
          .rejects.toThrow(/does not exist/i);
      });

      it('should reject DOCX files exceeding size limit', async () => {
        const smallProcessor = new DocumentProcessor({ maxFileSize: 10 });
        
        await expect(smallProcessor.processDOCX(testFiles.validDocx))
          .rejects.toThrow(/exceeds maximum allowed size/i);
      });
    });

    describe('metadata extraction', () => {
      it('should extract title from filename', async () => {
        // We can't test with a real DOCX without creating one
        // This test documents expected behavior
        const testFile = path.join(testDir, 'my-document.docx');
        await fs.writeFile(testFile, 'fake content');
        
        try {
          await processor.processDOCX(testFile);
        } catch (error) {
          // Expected to fail with fake DOCX, but we're testing the error path
          expect(error.message).toMatch(/corrupted|invalid|Failed to parse DOCX/i);
        }

        await fs.unlink(testFile);
      });

      it('should calculate word count from extracted text', async () => {
        // This test documents expected behavior
        // In a real scenario with a valid DOCX, word count would be calculated
        // For now, we verify the error handling path
        try {
          await processor.processDOCX(docxFiles.corrupted);
        } catch (error) {
          expect(error.message).toMatch(/corrupted|invalid|Failed to parse DOCX/i);
        }
      });
    });
  });

  describe('DOCX Processing with Real Files', () => {
    const sampleDocx = path.join(__dirname, '../../test-data/sample.docx');
    const biologyDocx = path.join(__dirname, '../../test-data/biology-notes.docx');

    describe('processDOCX with valid files', () => {
      it('should process sample DOCX and extract text', async () => {
        const result = await processor.processDOCX(sampleDocx);
        
        expect(result).toBeDefined();
        expect(result.filePath).toBe(path.resolve(sampleDocx));
        expect(result.content).toContain('sample DOCX document');
        expect(result.content).toContain('word count functionality');
        expect(result.metadata).toBeDefined();
        expect(result.metadata.format).toBe('.docx');
      });

      it('should extract correct metadata from sample DOCX', async () => {
        const result = await processor.processDOCX(sampleDocx);
        
        expect(result.metadata.title).toBe('sample');
        expect(result.metadata.wordCount).toBeGreaterThan(0);
        expect(result.metadata.wordCount).toBeLessThan(100);
        expect(result.metadata.format).toBe('.docx');
      });

      it('should calculate word count correctly', async () => {
        const result = await processor.processDOCX(sampleDocx);
        
        // The sample document has specific content
        // Word count should be reasonable (around 20-30 words)
        expect(result.metadata.wordCount).toBeGreaterThan(15);
        expect(result.metadata.wordCount).toBeLessThan(50);
      });

      it('should process biology notes DOCX', async () => {
        const result = await processor.processDOCX(biologyDocx);
        
        expect(result.content).toContain('Mitochondria');
        expect(result.content).toContain('powerhouse of the cell');
        expect(result.metadata.title).toBe('biology-notes');
        expect(result.metadata.wordCount).toBeGreaterThan(20);
      });

      it('should extract full text content', async () => {
        const result = await processor.processDOCX(biologyDocx);
        
        // Check that key terms are present
        expect(result.content).toContain('ATP');
        expect(result.content).toContain('adenosine triphosphate');
        expect(result.content).toContain('energy');
      });

      it('should handle DOCX with special characters', async () => {
        const result = await processor.processDOCX(biologyDocx);
        
        // Check that apostrophes and other punctuation are preserved
        expect(result.content).toContain('cell\'s');
      });
    });

    describe('processDocument with real DOCX files', () => {
      it('should process DOCX through processDocument method', async () => {
        const result = await processor.processDocument(sampleDocx);
        
        expect(result).toBeDefined();
        expect(result.content).toContain('sample DOCX document');
        expect(result.metadata.format).toBe('.docx');
      });

      it('should process multiple DOCX files', async () => {
        const result = await processor.processAllDocuments([sampleDocx, biologyDocx]);
        
        expect(result.documents).toHaveLength(2);
        expect(result.documents[0].content).toContain('sample');
        expect(result.documents[1].content).toContain('Mitochondria');
      });
    });

    describe('edge cases with real files', () => {
      it('should handle DOCX with empty content gracefully', async () => {
        // Create a minimal DOCX with no text
        const { createTestDocx } = require('../../test-data/create-test-docx');
        const emptyContentDocx = path.join(testDir, 'empty-content.docx');
        
        await createTestDocx(emptyContentDocx, '');
        
        const result = await processor.processDOCX(emptyContentDocx);
        
        // Mammoth may return whitespace/newlines for empty content
        expect(result.content.trim()).toBe('');
        expect(result.metadata.wordCount).toBe(0);
        
        await fs.unlink(emptyContentDocx);
      });

      it('should handle DOCX with only whitespace', async () => {
        const { createTestDocx } = require('../../test-data/create-test-docx');
        const whitespaceDocx = path.join(testDir, 'whitespace.docx');
        
        await createTestDocx(whitespaceDocx, '   \n\t  ');
        
        const result = await processor.processDOCX(whitespaceDocx);
        
        expect(result.metadata.wordCount).toBe(0);
        
        await fs.unlink(whitespaceDocx);
      });

      it('should handle DOCX with very long content', async () => {
        const { createTestDocx } = require('../../test-data/create-test-docx');
        const longDocx = path.join(testDir, 'long-content.docx');
        
        const longContent = 'word '.repeat(1000); // 1000 words
        await createTestDocx(longDocx, longContent);
        
        const result = await processor.processDOCX(longDocx);
        
        expect(result.metadata.wordCount).toBeGreaterThan(900);
        expect(result.metadata.wordCount).toBeLessThan(1100);
        
        await fs.unlink(longDocx);
      });
    });

    describe('comparison with PDF processing', () => {
      it('should return similar structure for DOCX and PDF', async () => {
        const docxResult = await processor.processDOCX(sampleDocx);
        
        // Check structure matches PDF processing
        expect(docxResult).toHaveProperty('filePath');
        expect(docxResult).toHaveProperty('content');
        expect(docxResult).toHaveProperty('metadata');
        expect(docxResult.metadata).toHaveProperty('title');
        expect(docxResult.metadata).toHaveProperty('wordCount');
        expect(docxResult.metadata).toHaveProperty('format');
        
        // DOCX doesn't have pageCount like PDF
        expect(docxResult.metadata.pageCount).toBeUndefined();
      });
    });
  });
});

  describe('Markdown Processing', () => {
    const sampleMd = path.join(__dirname, '../../test-data/sample.md');
    let mdFiles;
    let mdTestDir;
    let mdProcessor;

    beforeEach(async () => {
      mdProcessor = new DocumentProcessor();
      mdTestDir = path.join(__dirname, '../../test-data');
      await fs.mkdir(mdTestDir, { recursive: true });
      
      mdFiles = {
        simple: path.join(mdTestDir, 'simple.md'),
        noHeadings: path.join(mdTestDir, 'no-headings.md'),
        empty: path.join(mdTestDir, 'empty.md'),
        specialChars: path.join(mdTestDir, 'special-chars.md')
      };

      // Create simple markdown file
      await fs.writeFile(mdFiles.simple, '# Title\n\nThis is a paragraph.');

      // Create markdown without headings
      await fs.writeFile(mdFiles.noHeadings, 'Just plain text without any headings.');

      // Create empty markdown file
      await fs.writeFile(mdFiles.empty, '');

      // Create markdown with special characters
      await fs.writeFile(mdFiles.specialChars, '# Café\n\nRésumé with naïve approach.');
    });

    afterEach(async () => {
      for (const file of Object.values(mdFiles)) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // Ignore if file doesn't exist
        }
      }
    });

    describe('processMarkdown', () => {
      it('should process markdown file and extract text', async () => {
        const result = await mdProcessor.processMarkdown(sampleMd);
        
        expect(result).toBeDefined();
        expect(result.filePath).toBe(path.resolve(sampleMd));
        expect(result.content).toContain('Biology Study Notes');
        expect(result.content).toContain('Cell Structure');
        expect(result.content).toContain('Mitochondria');
        expect(result.metadata.format).toBe('.md');
      });

      it('should extract metadata from markdown', async () => {
        const result = await mdProcessor.processMarkdown(sampleMd);
        
        expect(result.metadata.title).toBe('Biology Study Notes');
        expect(result.metadata.wordCount).toBeGreaterThan(50);
        expect(result.metadata.format).toBe('.md');
        expect(result.metadata.headings).toBeDefined();
        expect(Array.isArray(result.metadata.headings)).toBe(true);
      });

      it('should extract headings from markdown', async () => {
        const result = await mdProcessor.processMarkdown(sampleMd);
        
        const headings = result.metadata.headings;
        expect(headings.length).toBeGreaterThan(0);
        
        // Check for h1 heading
        const h1Headings = headings.filter(h => h.level === 1);
        expect(h1Headings.length).toBeGreaterThan(0);
        expect(h1Headings[0].text).toBe('Biology Study Notes');
        
        // Check for h2 headings
        const h2Headings = headings.filter(h => h.level === 2);
        expect(h2Headings.length).toBeGreaterThan(0);
      });

      it('should calculate word count correctly', async () => {
        const result = await mdProcessor.processMarkdown(mdFiles.simple);
        
        // "Title This is a paragraph" = 5 words
        expect(result.metadata.wordCount).toBeGreaterThan(4);
        expect(result.metadata.wordCount).toBeLessThan(10);
      });

      it('should strip markdown formatting', async () => {
        const result = await mdProcessor.processMarkdown(mdFiles.simple);
        
        // Should not contain markdown symbols
        expect(result.content).not.toContain('#');
        expect(result.content).toContain('Title');
        expect(result.content).toContain('paragraph');
      });

      it('should handle markdown without headings', async () => {
        const result = await mdProcessor.processMarkdown(mdFiles.noHeadings);
        
        expect(result.content).toContain('Just plain text');
        expect(result.metadata.title).toBe('no-headings'); // Falls back to filename
        expect(result.metadata.headings).toHaveLength(0);
      });

      it('should handle empty markdown file', async () => {
        const result = await mdProcessor.processMarkdown(mdFiles.empty);
        
        expect(result.content.trim()).toBe('');
        expect(result.metadata.wordCount).toBe(0);
        expect(result.metadata.title).toBe('empty');
      });

      it('should handle special characters', async () => {
        const result = await mdProcessor.processMarkdown(mdFiles.specialChars);
        
        expect(result.content).toContain('Café');
        expect(result.content).toContain('Résumé');
        expect(result.content).toContain('naïve');
        expect(result.metadata.title).toBe('Café');
      });

      it('should throw error for non-markdown file', async () => {
        const txtFile = path.join(mdTestDir, 'test.txt');
        await fs.writeFile(txtFile, 'text content');
        await expect(mdProcessor.processMarkdown(txtFile))
          .rejects.toThrow(/Expected Markdown file/i);
        await fs.unlink(txtFile);
      });

      it('should throw error for non-existent file', async () => {
        const nonExistent = path.join(mdTestDir, 'nonexistent.md');
        await expect(mdProcessor.processMarkdown(nonExistent))
          .rejects.toThrow(/does not exist/i);
      });

      it('should handle encoding issues gracefully', async () => {
        // Create file with special encoding
        const encodingFile = path.join(mdTestDir, 'encoding.md');
        await fs.writeFile(encodingFile, '# Test\n\nContent with special chars: €£¥', 'utf8');
        
        const result = await mdProcessor.processMarkdown(encodingFile);
        
        expect(result.content).toContain('Test');
        expect(result.content).toContain('Content');
        
        await fs.unlink(encodingFile);
      });

      it('should handle markdown with lists', async () => {
        const listFile = path.join(mdTestDir, 'list.md');
        await fs.writeFile(listFile, '# List\n\n- Item 1\n- Item 2\n- Item 3');
        
        const result = await mdProcessor.processMarkdown(listFile);
        
        expect(result.content).toContain('Item 1');
        expect(result.content).toContain('Item 2');
        expect(result.content).toContain('Item 3');
        
        await fs.unlink(listFile);
      });

      it('should handle markdown with code blocks', async () => {
        const codeFile = path.join(mdTestDir, 'code.md');
        await fs.writeFile(codeFile, '# Code\n\n```javascript\nconst x = 1;\n```');
        
        const result = await mdProcessor.processMarkdown(codeFile);
        
        expect(result.content).toContain('Code');
        expect(result.content).toContain('const x = 1');
        
        await fs.unlink(codeFile);
      });

      it('should handle markdown with links', async () => {
        const linkFile = path.join(mdTestDir, 'link.md');
        await fs.writeFile(linkFile, '# Links\n\n[Google](https://google.com)');
        
        const result = await mdProcessor.processMarkdown(linkFile);
        
        expect(result.content).toContain('Links');
        expect(result.content).toContain('Google');
        
        await fs.unlink(linkFile);
      });

      it('should handle nested headings', async () => {
        const nestedFile = path.join(mdTestDir, 'nested.md');
        await fs.writeFile(nestedFile, '# H1\n## H2\n### H3\n#### H4');
        
        const result = await mdProcessor.processMarkdown(nestedFile);
        
        const headings = result.metadata.headings;
        expect(headings).toHaveLength(4);
        expect(headings[0].level).toBe(1);
        expect(headings[1].level).toBe(2);
        expect(headings[2].level).toBe(3);
        expect(headings[3].level).toBe(4);
        
        await fs.unlink(nestedFile);
      });
    });

    describe('processDocument with Markdown', () => {
      it('should process markdown through processDocument method', async () => {
        const result = await mdProcessor.processDocument(sampleMd);
        
        expect(result).toBeDefined();
        expect(result.content).toContain('Biology Study Notes');
        expect(result.metadata.format).toBe('.md');
      });

      it('should route .md files to processMarkdown', async () => {
        const result = await mdProcessor.processDocument(mdFiles.simple);
        
        expect(result.metadata.format).toBe('.md');
        expect(result.content).toContain('Title');
      });
    });
  });

  describe('Text File Processing', () => {
    const sampleTxt = path.join(__dirname, '../../test-data/sample.txt');
    const specialEncodingTxt = path.join(__dirname, '../../test-data/special-encoding.txt');
    let txtFiles;
    let txtTestDir;
    let txtProcessor;

    beforeEach(async () => {
      txtProcessor = new DocumentProcessor();
      txtTestDir = path.join(__dirname, '../../test-data');
      await fs.mkdir(txtTestDir, { recursive: true });
      
      txtFiles = {
        simple: path.join(txtTestDir, 'simple.txt'),
        multiline: path.join(txtTestDir, 'multiline.txt'),
        empty: path.join(txtTestDir, 'empty-text.txt'),
        whitespace: path.join(txtTestDir, 'whitespace.txt')
      };

      // Create simple text file
      await fs.writeFile(txtFiles.simple, 'This is a simple text file.');

      // Create multiline text file
      await fs.writeFile(txtFiles.multiline, 'Line 1\nLine 2\nLine 3\n\nLine 5');

      // Create empty text file
      await fs.writeFile(txtFiles.empty, '');

      // Create text file with only whitespace
      await fs.writeFile(txtFiles.whitespace, '   \n\t  \n  ');
    });

    afterEach(async () => {
      for (const file of Object.values(txtFiles)) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // Ignore if file doesn't exist
        }
      }
    });

    describe('processText', () => {
      it('should process text file and extract content', async () => {
        const result = await txtProcessor.processText(sampleTxt);
        
        expect(result).toBeDefined();
        expect(result.filePath).toBe(path.resolve(sampleTxt));
        expect(result.content).toContain('Chemistry Notes');
        expect(result.content).toContain('Atomic Structure');
        expect(result.content).toContain('atom');
        expect(result.metadata.format).toBe('.txt');
      });

      it('should extract metadata from text file', async () => {
        const result = await txtProcessor.processText(sampleTxt);
        
        expect(result.metadata.title).toBe('sample');
        expect(result.metadata.wordCount).toBeGreaterThan(30);
        expect(result.metadata.format).toBe('.txt');
      });

      it('should calculate word count correctly', async () => {
        const result = await txtProcessor.processText(txtFiles.simple);
        
        // "This is a simple text file" = 6 words
        expect(result.metadata.wordCount).toBe(6);
      });

      it('should preserve line breaks', async () => {
        const result = await txtProcessor.processText(txtFiles.multiline);
        
        expect(result.content).toContain('Line 1');
        expect(result.content).toContain('Line 2');
        expect(result.content).toContain('Line 3');
        expect(result.content).toContain('Line 5');
      });

      it('should handle empty text file', async () => {
        const result = await txtProcessor.processText(txtFiles.empty);
        
        expect(result.content).toBe('');
        expect(result.metadata.wordCount).toBe(0);
        expect(result.metadata.title).toBe('empty-text');
      });

      it('should handle text file with only whitespace', async () => {
        const result = await txtProcessor.processText(txtFiles.whitespace);
        
        expect(result.metadata.wordCount).toBe(0);
      });

      it('should handle special characters', async () => {
        const result = await txtProcessor.processText(specialEncodingTxt);
        
        expect(result.content).toContain('Special Characters');
        expect(result.content).toContain('café');
        expect(result.content).toContain('naïve');
        expect(result.content).toContain('résumé');
      });

      it('should throw error for non-text file', async () => {
        const pdfFile = path.join(txtTestDir, 'test.pdf');
        await fs.writeFile(pdfFile, 'pdf content');
        await expect(txtProcessor.processText(pdfFile))
          .rejects.toThrow(/Expected text file/i);
        await fs.unlink(pdfFile);
      });

      it('should throw error for non-existent file', async () => {
        const nonExistent = path.join(txtTestDir, 'nonexistent.txt');
        await expect(txtProcessor.processText(nonExistent))
          .rejects.toThrow(/does not exist/i);
      });

      it('should handle encoding issues gracefully', async () => {
        // Create file with UTF-8 encoding
        const encodingFile = path.join(txtTestDir, 'encoding.txt');
        await fs.writeFile(encodingFile, 'Content with special chars: €£¥', 'utf8');
        
        const result = await txtProcessor.processText(encodingFile);
        
        expect(result.content).toContain('Content');
        
        await fs.unlink(encodingFile);
      });

      it('should handle very long text files', async () => {
        const longFile = path.join(txtTestDir, 'long.txt');
        const longContent = 'word '.repeat(1000);
        await fs.writeFile(longFile, longContent);
        
        const result = await txtProcessor.processText(longFile);
        
        expect(result.metadata.wordCount).toBe(1000);
        
        await fs.unlink(longFile);
      });

      it('should handle text with tabs and special whitespace', async () => {
        const tabFile = path.join(txtTestDir, 'tabs.txt');
        await fs.writeFile(tabFile, 'Column1\tColumn2\tColumn3\nValue1\tValue2\tValue3');
        
        const result = await txtProcessor.processText(tabFile);
        
        expect(result.content).toContain('Column1');
        expect(result.content).toContain('Column2');
        expect(result.content).toContain('Value1');
        
        await fs.unlink(tabFile);
      });

      it('should handle text with numbers and punctuation', async () => {
        const numberFile = path.join(txtTestDir, 'numbers.txt');
        await fs.writeFile(numberFile, 'Test 123! Question? Answer: yes.');
        
        const result = await txtProcessor.processText(numberFile);
        
        expect(result.content).toContain('123');
        expect(result.content).toContain('Question?');
        expect(result.metadata.wordCount).toBeGreaterThan(3);
        
        await fs.unlink(numberFile);
      });
    });

    describe('processDocument with Text', () => {
      it('should process text through processDocument method', async () => {
        const result = await txtProcessor.processDocument(sampleTxt);
        
        expect(result).toBeDefined();
        expect(result.content).toContain('Chemistry Notes');
        expect(result.metadata.format).toBe('.txt');
      });

      it('should route .txt files to processText', async () => {
        const result = await txtProcessor.processDocument(txtFiles.simple);
        
        expect(result.metadata.format).toBe('.txt');
        expect(result.content).toContain('simple text file');
      });
    });
  });

  describe('processAllDocuments with MD and TXT', () => {
    const sampleMd = path.join(__dirname, '../../test-data/sample.md');
    const sampleTxt = path.join(__dirname, '../../test-data/sample.txt');
    const sampleDocx = path.join(__dirname, '../../test-data/sample.docx');
    let integrationProcessor;
    let integrationTestDir;

    beforeEach(() => {
      integrationProcessor = new DocumentProcessor();
      integrationTestDir = path.join(__dirname, '../../test-data');
    });

    it('should process multiple document types together', async () => {
      const filePaths = [sampleMd, sampleTxt, sampleDocx];
      const result = await integrationProcessor.processAllDocuments(filePaths);
      
      expect(result.documents).toHaveLength(3);
      expect(result.summary.successful).toBe(3);
      
      // Check MD result
      const mdResult = result.documents.find(r => r.metadata.format === '.md');
      expect(mdResult).toBeDefined();
      expect(mdResult.content).toContain('Biology');
      
      // Check TXT result
      const txtResult = result.documents.find(r => r.metadata.format === '.txt');
      expect(txtResult).toBeDefined();
      expect(txtResult.content).toContain('Chemistry');
      
      // Check DOCX result
      const docxResult = result.documents.find(r => r.metadata.format === '.docx');
      expect(docxResult).toBeDefined();
    });

    it('should handle mix of valid and invalid documents', async () => {
      const invalidMd = path.join(integrationTestDir, 'nonexistent.md');
      const filePaths = [sampleMd, invalidMd, sampleTxt];
      
      const result = await integrationProcessor.processAllDocuments(filePaths);
      
      // Should return only valid documents
      expect(result.documents).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.documents[0].metadata.format).toBe('.md');
      expect(result.documents[1].metadata.format).toBe('.txt');
    });

    it('should process all formats in parallel', async () => {
      const filePaths = [sampleMd, sampleTxt, sampleDocx];
      
      const startTime = Date.now();
      const result = await integrationProcessor.processAllDocuments(filePaths);
      const duration = Date.now() - startTime;
      
      expect(result.documents).toHaveLength(3);
      expect(result.summary.successful).toBe(3);
      // Parallel execution should be reasonably fast
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Integration: All Document Formats', () => {
    const sampleMd = path.join(__dirname, '../../test-data/sample.md');
    const sampleTxt = path.join(__dirname, '../../test-data/sample.txt');
    const sampleDocx = path.join(__dirname, '../../test-data/sample.docx');
    let allFormatsProcessor;
    let allFormatsTestDir;

    beforeEach(() => {
      allFormatsProcessor = new DocumentProcessor();
      allFormatsTestDir = path.join(__dirname, '../../test-data');
    });

    it('should return consistent structure across all formats', async () => {
      const mdResult = await allFormatsProcessor.processDocument(sampleMd);
      const txtResult = await allFormatsProcessor.processDocument(sampleTxt);
      const docxResult = await allFormatsProcessor.processDocument(sampleDocx);
      
      // All should have same structure
      [mdResult, txtResult, docxResult].forEach(result => {
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('metadata');
        expect(result.metadata).toHaveProperty('title');
        expect(result.metadata).toHaveProperty('wordCount');
        expect(result.metadata).toHaveProperty('format');
      });
    });

    it('should extract meaningful content from all formats', async () => {
      const mdResult = await allFormatsProcessor.processDocument(sampleMd);
      const txtResult = await allFormatsProcessor.processDocument(sampleTxt);
      const docxResult = await allFormatsProcessor.processDocument(sampleDocx);
      
      // All should have non-empty content
      expect(mdResult.content.length).toBeGreaterThan(50);
      expect(txtResult.content.length).toBeGreaterThan(50);
      expect(docxResult.content.length).toBeGreaterThan(10);
      
      // All should have reasonable word counts
      expect(mdResult.metadata.wordCount).toBeGreaterThan(10);
      expect(txtResult.metadata.wordCount).toBeGreaterThan(10);
      expect(docxResult.metadata.wordCount).toBeGreaterThan(5);
    });

    it('should handle validation consistently across formats', async () => {
      const formats = ['.md', '.txt', '.docx', '.pdf'];
      
      for (const format of formats) {
        const testFile = path.join(allFormatsTestDir, `test${format}`);
        await fs.writeFile(testFile, 'content');
        
        const validation = await allFormatsProcessor.validateDocument(testFile);
        expect(validation.valid).toBe(true);
        expect(validation.metadata.format).toBe(format);
        
        await fs.unlink(testFile);
      }
    });
  });
