const { parentPort, workerData } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');

/**
 * Worker thread for processing documents
 * This runs in a separate thread to avoid blocking the main process
 */

// Import document processing libraries
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const MarkdownIt = require('markdown-it');

/**
 * Process a PDF document
 */
async function processPDF(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const pdfData = await pdfParse(dataBuffer);
  
  const content = pdfData.text || '';
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  
  const title = pdfData.info?.Title || 
               pdfData.metadata?._metadata?.['dc:title'] || 
               path.basename(filePath, '.pdf');
  
  return {
    filePath: path.resolve(filePath),
    content: content,
    metadata: {
      title: title,
      pageCount: pdfData.numpages || 0,
      wordCount: wordCount,
      format: '.pdf'
    }
  };
}

/**
 * Process a DOCX document
 */
async function processDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const content = result.value || '';
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const title = path.basename(filePath, '.docx');
  
  return {
    filePath: path.resolve(filePath),
    content: content,
    metadata: {
      title: title,
      wordCount: wordCount,
      format: '.docx'
    }
  };
}

/**
 * Process a Markdown document
 */
async function processMarkdown(filePath) {
  let content = await fs.readFile(filePath, 'utf8');
  
  const md = new MarkdownIt();
  const tokens = md.parse(content, {});
  
  const headings = tokens
    .filter(token => token.type === 'heading_open')
    .map((token, index) => {
      const contentToken = tokens[tokens.indexOf(token) + 1];
      return {
        level: parseInt(token.tag.substring(1)),
        text: contentToken?.content || ''
      };
    });
  
  const plainText = md.render(content)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
  
  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
  const firstH1 = headings.find(h => h.level === 1);
  const title = firstH1?.text || path.basename(filePath, '.md');
  
  return {
    filePath: path.resolve(filePath),
    content: plainText,
    metadata: {
      title: title,
      wordCount: wordCount,
      format: '.md',
      headings: headings
    }
  };
}

/**
 * Process a plain text document
 */
async function processText(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const title = path.basename(filePath, '.txt');
  
  return {
    filePath: path.resolve(filePath),
    content: content,
    metadata: {
      title: title,
      wordCount: wordCount,
      format: '.txt'
    }
  };
}

/**
 * Process a document based on its format
 */
async function processDocument(filePath, format) {
  switch (format) {
    case '.pdf':
      return await processPDF(filePath);
    case '.docx':
      return await processDOCX(filePath);
    case '.md':
      return await processMarkdown(filePath);
    case '.txt':
      return await processText(filePath);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// Main worker logic
(async () => {
  try {
    const { filePath, format } = workerData;
    
    // Process the document
    const result = await processDocument(filePath, format);
    
    // Send result back to main thread
    parentPort.postMessage({
      success: true,
      data: result
    });
  } catch (error) {
    // Send error back to main thread
    parentPort.postMessage({
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
})();
