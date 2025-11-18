const fs = require('fs').promises;
const path = require('path');
const { Worker } = require('worker_threads');
const { SUPPORTED_FORMATS } = require('../shared/constants');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const MarkdownIt = require('markdown-it');
const ErrorLogger = require('./ErrorLogger');

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the document is valid
 * @property {string} [error] - Error message if invalid
 * @property {string} [userFriendlyError] - User-friendly error message
 * @property {Object} [metadata] - Document metadata if valid
 * @property {string} metadata.format - File format (extension)
 * @property {number} metadata.size - File size in bytes
 * @property {string} metadata.path - Absolute file path
 */

/**
 * @typedef {Object} DocumentContent
 * @property {string} filePath - Path to the document
 * @property {string} content - Extracted text content
 * @property {Object} metadata - Document metadata
 * @property {string} metadata.title - Document title
 * @property {number} [metadata.pageCount] - Number of pages (for PDFs)
 * @property {number} metadata.wordCount - Approximate word count
 * @property {string} metadata.format - File format
 */

/**
 * Handles document validation and processing
 */
class DocumentProcessor {
  /**
   * @param {Object} [options] - Configuration options
   * @param {number} [options.maxFileSize] - Maximum file size in bytes (default: 50MB)
   * @param {ErrorLogger} [options.errorLogger] - Error logger instance
   * @param {boolean} [options.useWorkerThreads] - Use worker threads for processing (default: true)
   * @param {number} [options.maxConcurrentWorkers] - Maximum concurrent workers (default: 2)
   */
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB default
    this.supportedFormats = SUPPORTED_FORMATS;
    this.errorLogger = options.errorLogger || new ErrorLogger();
    this.useWorkerThreads = options.useWorkerThreads !== false; // Default to true
    this.maxConcurrentWorkers = options.maxConcurrentWorkers || 2;
    this.activeWorkers = 0;
  }

  /**
   * Validate a document file
   * @param {string} filePath - Path to the document file
   * @returns {Promise<ValidationResult>}
   */
  async validateDocument(filePath) {
    try {
      // Check if file path is provided
      if (!filePath || typeof filePath !== 'string') {
        const error = 'File path must be a non-empty string';
        await this.errorLogger.logError('DocumentValidation', error, { filePath });
        return {
          valid: false,
          error,
          userFriendlyError: 'Invalid file path provided'
        };
      }

      // Normalize and resolve the path
      const absolutePath = path.resolve(filePath);

      // Check if file exists
      try {
        await fs.access(absolutePath, fs.constants.F_OK);
      } catch (error) {
        const errorMsg = `File does not exist: ${filePath}`;
        await this.errorLogger.logError('DocumentValidation', errorMsg, { 
          filePath,
          absolutePath,
          errorCode: error.code
        });
        return {
          valid: false,
          error: errorMsg,
          userFriendlyError: `File not found: ${path.basename(filePath)}`
        };
      }

      // Check if it's a file (not a directory)
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        const error = 'Path is not a file';
        await this.errorLogger.logError('DocumentValidation', error, { 
          filePath,
          absolutePath
        });
        return {
          valid: false,
          error,
          userFriendlyError: 'Selected path is a folder, not a file'
        };
      }

      // Check file format
      const format = path.extname(absolutePath).toLowerCase();
      if (!this.supportedFormats.includes(format)) {
        const error = `Unsupported format: ${format}. Supported formats: ${this.supportedFormats.join(', ')}`;
        await this.errorLogger.logWarning('DocumentValidation', error, { 
          filePath,
          format,
          supportedFormats: this.supportedFormats
        });
        return {
          valid: false,
          error,
          userFriendlyError: `Unsupported file type: ${format}. Please use PDF, DOCX, MD, or TXT files.`
        };
      }

      // Check file size
      if (stats.size > this.maxFileSize) {
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        const maxSizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(2);
        const error = `File size (${sizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`;
        await this.errorLogger.logWarning('DocumentValidation', error, { 
          filePath,
          size: stats.size,
          maxSize: this.maxFileSize
        });
        return {
          valid: false,
          error,
          userFriendlyError: `File is too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB.`
        };
      }

      // Check if file is empty
      if (stats.size === 0) {
        const error = 'File is empty';
        await this.errorLogger.logWarning('DocumentValidation', error, { filePath });
        return {
          valid: false,
          error,
          userFriendlyError: 'File is empty and cannot be processed'
        };
      }

      // Check if file is readable
      try {
        await fs.access(absolutePath, fs.constants.R_OK);
      } catch (error) {
        const errorMsg = 'File is not readable (permission denied)';
        await this.errorLogger.logError('DocumentValidation', errorMsg, { 
          filePath,
          errorCode: error.code
        });
        return {
          valid: false,
          error: errorMsg,
          userFriendlyError: 'Cannot read file. Please check file permissions.'
        };
      }

      // All validations passed
      return {
        valid: true,
        metadata: {
          format: format,
          size: stats.size,
          path: absolutePath
        }
      };
    } catch (error) {
      await this.errorLogger.logError('DocumentValidation', error, { filePath });
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
        userFriendlyError: 'An unexpected error occurred while validating the file'
      };
    }
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>}
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect the format of a file based on its extension
   * @param {string} filePath - Path to the file
   * @returns {string|null} - File format (extension) or null if unsupported
   */
  detectFormat(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }

    const format = path.extname(filePath).toLowerCase();
    return this.supportedFormats.includes(format) ? format : null;
  }

  /**
   * Get list of supported formats
   * @returns {string[]}
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Validate multiple documents
   * @param {string[]} filePaths - Array of file paths to validate
   * @returns {Promise<Map<string, ValidationResult>>} - Map of file paths to validation results
   */
  async validateDocuments(filePaths) {
    const results = new Map();

    if (!Array.isArray(filePaths)) {
      return results;
    }

    // Validate all documents in parallel
    const validationPromises = filePaths.map(async (filePath) => {
      const result = await this.validateDocument(filePath);
      return { filePath, result };
    });

    const validations = await Promise.all(validationPromises);

    // Build results map
    validations.forEach(({ filePath, result }) => {
      results.set(filePath, result);
    });

    return results;
  }

  /**
   * Check if a file size is within limits
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>}
   */
  async isFileSizeValid(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size <= this.maxFileSize;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process a PDF document and extract text content
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<DocumentContent>}
   * @throws {Error} If the PDF cannot be processed
   */
  async processPDF(filePath) {
    try {
      // Validate the document first
      const validation = await this.validateDocument(filePath);
      if (!validation.valid) {
        const error = new Error(validation.userFriendlyError || validation.error);
        error.userFriendly = validation.userFriendlyError;
        throw error;
      }

      // Check format
      if (validation.metadata.format !== '.pdf') {
        const error = new Error(`Expected PDF file, got ${validation.metadata.format}`);
        await this.errorLogger.logError('PDFProcessing', error, { filePath });
        throw error;
      }

      // Read the PDF file
      let dataBuffer;
      try {
        dataBuffer = await fs.readFile(filePath);
      } catch (readError) {
        const error = new Error('Failed to read PDF file');
        error.userFriendly = 'Cannot read PDF file. It may be in use by another program.';
        await this.errorLogger.logError('PDFProcessing', readError, { 
          filePath,
          errorCode: readError.code
        });
        throw error;
      }

      // Parse the PDF
      let pdfData;
      try {
        pdfData = await pdfParse(dataBuffer);
      } catch (parseError) {
        // Handle encrypted or corrupted PDFs
        let error;
        if (parseError.message.includes('encrypted') || parseError.message.includes('password')) {
          error = new Error('PDF is encrypted or password-protected');
          error.userFriendly = 'This PDF is password-protected and cannot be processed.';
        } else if (parseError.message.includes('Invalid PDF') || parseError.message.includes('Invalid header')) {
          error = new Error('PDF file is corrupted or invalid');
          error.userFriendly = 'This PDF file appears to be corrupted or invalid.';
        } else {
          error = new Error(`Failed to parse PDF: ${parseError.message}`);
          error.userFriendly = 'Unable to read PDF content. The file may be corrupted.';
        }
        
        await this.errorLogger.logError('PDFProcessing', parseError, { 
          filePath,
          parseErrorMessage: parseError.message
        });
        throw error;
      }

      // Extract text content
      const content = pdfData.text || '';

      // Check if PDF has extractable text
      if (content.trim().length === 0) {
        const warning = 'PDF contains no extractable text (may be image-based)';
        await this.errorLogger.logWarning('PDFProcessing', warning, { filePath });
        const error = new Error(warning);
        error.userFriendly = 'This PDF contains no text. It may be image-based or scanned.';
        throw error;
      }

      // Calculate word count
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

      // Extract metadata
      const title = pdfData.info?.Title || 
                   pdfData.metadata?._metadata?.['dc:title'] || 
                   path.basename(filePath, '.pdf');
      
      const pageCount = pdfData.numpages || 0;

      return {
        filePath: validation.metadata.path,
        content: content,
        metadata: {
          title: title,
          pageCount: pageCount,
          wordCount: wordCount,
          format: '.pdf'
        }
      };
    } catch (error) {
      // Log and re-throw with context
      if (!error.userFriendly) {
        await this.errorLogger.logError('PDFProcessing', error, { filePath });
        error.userFriendly = 'An unexpected error occurred while processing the PDF';
      }
      throw error;
    }
  }

  /**
   * Process a DOCX document and extract text content
   * @param {string} filePath - Path to the DOCX file
   * @returns {Promise<DocumentContent>}
   * @throws {Error} If the DOCX cannot be processed
   */
  async processDOCX(filePath) {
    try {
      // Validate the document first
      const validation = await this.validateDocument(filePath);
      if (!validation.valid) {
        const error = new Error(validation.userFriendlyError || validation.error);
        error.userFriendly = validation.userFriendlyError;
        throw error;
      }

      // Check format
      if (validation.metadata.format !== '.docx') {
        const error = new Error(`Expected DOCX file, got ${validation.metadata.format}`);
        await this.errorLogger.logError('DOCXProcessing', error, { filePath });
        throw error;
      }

      // Extract text from DOCX
      let result;
      try {
        result = await mammoth.extractRawText({ path: filePath });
      } catch (parseError) {
        // Handle corrupted DOCX files
        let error;
        if (parseError.message.includes('not a valid zip file') || 
            parseError.message.includes('End of central directory')) {
          error = new Error('DOCX file is corrupted or invalid');
          error.userFriendly = 'This DOCX file appears to be corrupted.';
        } else if (parseError.message.includes('ENOENT')) {
          error = new Error('DOCX file not found');
          error.userFriendly = 'File was deleted or moved during processing.';
        } else {
          error = new Error(`Failed to parse DOCX: ${parseError.message}`);
          error.userFriendly = 'Unable to read DOCX content. The file may be corrupted.';
        }
        
        await this.errorLogger.logError('DOCXProcessing', parseError, { 
          filePath,
          parseErrorMessage: parseError.message
        });
        throw error;
      }

      // Extract text content
      const content = result.value || '';

      // Check for warnings (indicates potential issues)
      if (result.messages && result.messages.length > 0) {
        const errors = result.messages.filter(msg => msg.type === 'error');
        if (errors.length > 0) {
          await this.errorLogger.logWarning('DOCXProcessing', 'DOCX parsing warnings', { 
            filePath,
            warnings: errors
          });
        }
      }

      // Check if DOCX has extractable text
      if (content.trim().length === 0) {
        const warning = 'DOCX contains no extractable text';
        await this.errorLogger.logWarning('DOCXProcessing', warning, { filePath });
        const error = new Error(warning);
        error.userFriendly = 'This DOCX file contains no text content.';
        throw error;
      }

      // Calculate word count
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

      // Extract title from filename (DOCX doesn't have reliable metadata extraction)
      const title = path.basename(filePath, '.docx');

      return {
        filePath: validation.metadata.path,
        content: content,
        metadata: {
          title: title,
          wordCount: wordCount,
          format: '.docx'
        }
      };
    } catch (error) {
      // Log and re-throw with context
      if (!error.userFriendly) {
        await this.errorLogger.logError('DOCXProcessing', error, { filePath });
        error.userFriendly = 'An unexpected error occurred while processing the DOCX file';
      }
      throw error;
    }
  }

  /**
   * Process a Markdown document and extract text content
   * @param {string} filePath - Path to the Markdown file
   * @returns {Promise<DocumentContent>}
   * @throws {Error} If the Markdown file cannot be processed
   */
  async processMarkdown(filePath) {
    try {
      // Validate the document first
      const validation = await this.validateDocument(filePath);
      if (!validation.valid) {
        const error = new Error(validation.userFriendlyError || validation.error);
        error.userFriendly = validation.userFriendlyError;
        throw error;
      }

      // Check format
      if (validation.metadata.format !== '.md') {
        const error = new Error(`Expected Markdown file, got ${validation.metadata.format}`);
        await this.errorLogger.logError('MarkdownProcessing', error, { filePath });
        throw error;
      }

      // Read the file with encoding handling
      let content;
      try {
        // Try UTF-8 first (most common)
        content = await fs.readFile(filePath, 'utf8');
      } catch (readError) {
        // If UTF-8 fails, try with latin1 as fallback
        try {
          content = await fs.readFile(filePath, 'latin1');
          await this.errorLogger.logWarning('MarkdownProcessing', 'Used latin1 encoding fallback', { filePath });
        } catch (fallbackError) {
          const error = new Error('Failed to read file with supported encodings');
          error.userFriendly = 'Cannot read file. It may have an unsupported text encoding.';
          await this.errorLogger.logError('MarkdownProcessing', fallbackError, { filePath });
          throw error;
        }
      }

      // Check if file has content
      if (content.trim().length === 0) {
        const warning = 'Markdown file is empty';
        await this.errorLogger.logWarning('MarkdownProcessing', warning, { filePath });
        const error = new Error(warning);
        error.userFriendly = 'This Markdown file is empty.';
        throw error;
      }

      // Initialize markdown-it parser
      const md = new MarkdownIt();

      // Parse markdown to extract headings
      const tokens = md.parse(content, {});
      const headings = tokens
        .filter(token => token.type === 'heading_open')
        .map((token, index) => {
          // Get the content of the heading (next token)
          const contentToken = tokens[tokens.indexOf(token) + 1];
          return {
            level: parseInt(token.tag.substring(1)), // h1 -> 1, h2 -> 2, etc.
            text: contentToken?.content || ''
          };
        });

      // Render to plain text (strips markdown formatting)
      const plainText = md.render(content)
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim();

      // Calculate word count
      const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;

      // Extract title (first h1 heading or filename)
      const firstH1 = headings.find(h => h.level === 1);
      const title = firstH1?.text || path.basename(filePath, '.md');

      return {
        filePath: validation.metadata.path,
        content: plainText,
        metadata: {
          title: title,
          wordCount: wordCount,
          format: '.md',
          headings: headings
        }
      };
    } catch (error) {
      // Log and re-throw with context
      if (!error.userFriendly) {
        await this.errorLogger.logError('MarkdownProcessing', error, { filePath });
        error.userFriendly = 'An unexpected error occurred while processing the Markdown file';
      }
      throw error;
    }
  }

  /**
   * Process a plain text document
   * @param {string} filePath - Path to the text file
   * @returns {Promise<DocumentContent>}
   * @throws {Error} If the text file cannot be processed
   */
  async processText(filePath) {
    try {
      // Validate the document first
      const validation = await this.validateDocument(filePath);
      if (!validation.valid) {
        const error = new Error(validation.userFriendlyError || validation.error);
        error.userFriendly = validation.userFriendlyError;
        throw error;
      }

      // Check format
      if (validation.metadata.format !== '.txt') {
        const error = new Error(`Expected text file, got ${validation.metadata.format}`);
        await this.errorLogger.logError('TextProcessing', error, { filePath });
        throw error;
      }

      // Read the file with encoding handling
      let content;
      try {
        // Try UTF-8 first (most common)
        content = await fs.readFile(filePath, 'utf8');
      } catch (readError) {
        // If UTF-8 fails, try with latin1 as fallback
        try {
          content = await fs.readFile(filePath, 'latin1');
          await this.errorLogger.logWarning('TextProcessing', 'Used latin1 encoding fallback', { filePath });
        } catch (fallbackError) {
          const error = new Error('Failed to read file with supported encodings');
          error.userFriendly = 'Cannot read file. It may have an unsupported text encoding.';
          await this.errorLogger.logError('TextProcessing', fallbackError, { filePath });
          throw error;
        }
      }

      // Check if file has content
      if (content.trim().length === 0) {
        const warning = 'Text file is empty';
        await this.errorLogger.logWarning('TextProcessing', warning, { filePath });
        const error = new Error(warning);
        error.userFriendly = 'This text file is empty.';
        throw error;
      }

      // Calculate word count
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

      // Extract title from filename
      const title = path.basename(filePath, '.txt');

      return {
        filePath: validation.metadata.path,
        content: content,
        metadata: {
          title: title,
          wordCount: wordCount,
          format: '.txt'
        }
      };
    } catch (error) {
      // Log and re-throw with context
      if (!error.userFriendly) {
        await this.errorLogger.logError('TextProcessing', error, { filePath });
        error.userFriendly = 'An unexpected error occurred while processing the text file';
      }
      throw error;
    }
  }

  /**
   * Process a document using worker thread
   * @param {string} filePath - Path to the document
   * @param {string} format - Document format
   * @returns {Promise<DocumentContent>}
   * @private
   */
  async _processDocumentInWorker(filePath, format) {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'DocumentWorker.js');
      
      const worker = new Worker(workerPath, {
        workerData: { filePath, format }
      });

      this.activeWorkers++;

      worker.on('message', (message) => {
        this.activeWorkers--;
        
        if (message.success) {
          resolve(message.data);
        } else {
          const error = new Error(message.error.message);
          error.stack = message.error.stack;
          reject(error);
        }
      });

      worker.on('error', (error) => {
        this.activeWorkers--;
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.activeWorkers--;
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Process a document based on its format
   * @param {string} filePath - Path to the document
   * @param {boolean} [useWorker] - Force use of worker thread (default: auto)
   * @returns {Promise<DocumentContent>}
   * @throws {Error} If the document cannot be processed
   */
  async processDocument(filePath, useWorker = null) {
    const format = this.detectFormat(filePath);
    
    if (!format) {
      throw new Error(`Unsupported or invalid file format for: ${filePath}`);
    }

    // Determine whether to use worker thread
    const shouldUseWorker = useWorker !== null ? useWorker : this.useWorkerThreads;

    // Use worker thread if enabled and not at max capacity
    if (shouldUseWorker && this.activeWorkers < this.maxConcurrentWorkers) {
      try {
        return await this._processDocumentInWorker(filePath, format);
      } catch (error) {
        // Fall back to main thread if worker fails
        console.warn('Worker thread failed, falling back to main thread:', error.message);
      }
    }

    // Process in main thread
    switch (format) {
      case '.pdf':
        return await this.processPDF(filePath);
      case '.docx':
        return await this.processDOCX(filePath);
      case '.md':
        return await this.processMarkdown(filePath);
      case '.txt':
        return await this.processText(filePath);
      default:
        throw new Error(`Processing for ${format} format is not yet implemented`);
    }
  }

  /**
   * Process all configured documents with progress tracking
   * @param {string[]} filePaths - Array of document paths
   * @param {Function} [onProgress] - Optional callback for progress updates (processed, total, currentFile)
   * @returns {Promise<ProcessingResult>}
   * 
   * @typedef {Object} ProcessingResult
   * @property {DocumentContent[]} documents - Successfully processed documents
   * @property {ProcessingError[]} errors - Errors encountered during processing
   * @property {ProcessingSummary} summary - Summary statistics
   * 
   * @typedef {Object} ProcessingError
   * @property {string} filePath - Path to the failed document
   * @property {string} error - Error message
   * @property {string} userFriendlyError - User-friendly error message
   * @property {string} fileName - File name for display
   * 
   * @typedef {Object} ProcessingSummary
   * @property {number} total - Total number of documents attempted
   * @property {number} successful - Number of successfully processed documents
   * @property {number} failed - Number of failed documents
   * @property {number} totalWords - Total word count across all successful documents
   */
  async processAllDocuments(filePaths, onProgress = null) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return {
        documents: [],
        errors: [],
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
          totalWords: 0
        }
      };
    }

    const results = [];
    const errors = [];
    let processedCount = 0;

    await this.errorLogger.logWarning('DocumentProcessing', `Starting batch processing of ${filePaths.length} documents`, {
      fileCount: filePaths.length
    });

    // Process documents in parallel with progress tracking
    const processingPromises = filePaths.map(async (filePath) => {
      try {
        const content = await this.processDocument(filePath);
        
        // Update progress
        processedCount++;
        if (onProgress && typeof onProgress === 'function') {
          onProgress(processedCount, filePaths.length, filePath);
        }
        
        return { success: true, content };
      } catch (error) {
        // Update progress even on error
        processedCount++;
        if (onProgress && typeof onProgress === 'function') {
          onProgress(processedCount, filePaths.length, filePath);
        }
        
        // Log the error
        await this.errorLogger.logError('DocumentProcessing', error, { 
          filePath,
          batchProcessing: true
        });
        
        return { 
          success: false, 
          filePath, 
          error: error.message,
          userFriendlyError: error.userFriendly || error.message,
          fileName: path.basename(filePath)
        };
      }
    });

    const outcomes = await Promise.all(processingPromises);

    // Separate successful results from errors
    outcomes.forEach((outcome) => {
      if (outcome.success) {
        results.push(outcome.content);
      } else {
        errors.push({
          filePath: outcome.filePath,
          error: outcome.error,
          userFriendlyError: outcome.userFriendlyError,
          fileName: outcome.fileName
        });
      }
    });

    // Calculate summary statistics
    const totalWords = results.reduce((sum, doc) => sum + (doc.metadata.wordCount || 0), 0);

    const summary = {
      total: filePaths.length,
      successful: results.length,
      failed: errors.length,
      totalWords: totalWords
    };

    // Log summary
    await this.errorLogger.logWarning('DocumentProcessing', 'Batch processing complete', {
      summary,
      errorCount: errors.length
    });

    // Log errors if any
    if (errors.length > 0) {
      console.error('Document processing errors:', errors);
    }

    return {
      documents: results,
      errors: errors,
      summary: summary
    };
  }
}

module.exports = DocumentProcessor;
