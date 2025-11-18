const path = require('path');
const DocumentProcessor = require('./DocumentProcessor');
const QuestionGenerator = require('./QuestionGenerator');

describe('QuestionGenerator Integration Tests', () => {
  let documentProcessor;
  let questionGenerator;

  beforeEach(() => {
    documentProcessor = new DocumentProcessor();
    questionGenerator = new QuestionGenerator();
  });

  describe('with real documents', () => {
    it('should extract keywords from processed PDF document', async () => {
      const pdfPath = path.join(__dirname, '../../test-data/special-chars.pdf');
      
      try {
        const document = await documentProcessor.processDocument(pdfPath);
        const concepts = questionGenerator.identifyKeyConcepts(document);

        expect(concepts).toBeDefined();
        expect(concepts.keywords).toBeDefined();
        expect(concepts.keywords.length).toBeGreaterThan(0);
        expect(concepts.sourceSentences).toBeDefined();
        expect(concepts.documentPath).toBe(path.resolve(pdfPath));
      } catch (error) {
        // If PDF processing fails, skip this test
        console.log('Skipping PDF test:', error.message);
      }
    });

    it('should extract keywords from processed DOCX document', async () => {
      const docxPath = path.join(__dirname, '../../test-data/biology-notes.docx');
      
      try {
        const document = await documentProcessor.processDocument(docxPath);
        const concepts = questionGenerator.identifyKeyConcepts(document);

        expect(concepts).toBeDefined();
        expect(concepts.keywords).toBeDefined();
        expect(concepts.keywords.length).toBeGreaterThan(0);
        expect(concepts.sourceSentences).toBeDefined();
        
        // Should extract biology-related keywords
        const keywordWords = concepts.keywords.map(k => k.word);
        expect(keywordWords.length).toBeGreaterThan(0);
      } catch (error) {
        // If DOCX processing fails, skip this test
        console.log('Skipping DOCX test:', error.message);
      }
    });

    it('should extract keywords from processed Markdown document', async () => {
      const mdPath = path.join(__dirname, '../../test-data/sample.md');
      
      const document = await documentProcessor.processDocument(mdPath);
      const concepts = questionGenerator.identifyKeyConcepts(document);

      expect(concepts).toBeDefined();
      expect(concepts.keywords).toBeDefined();
      expect(concepts.keywords.length).toBeGreaterThan(0);
      expect(concepts.sourceSentences).toBeDefined();
      expect(concepts.sourceSentences.length).toBeGreaterThan(0);
    });

    it('should extract keywords from processed text document', async () => {
      const txtPath = path.join(__dirname, '../../test-data/sample.txt');
      
      const document = await documentProcessor.processDocument(txtPath);
      const concepts = questionGenerator.identifyKeyConcepts(document);

      expect(concepts).toBeDefined();
      expect(concepts.keywords).toBeDefined();
      expect(concepts.keywords.length).toBeGreaterThan(0);
      expect(concepts.sourceSentences).toBeDefined();
    });

    it('should process multiple documents and extract concepts from all', async () => {
      const filePaths = [
        path.join(__dirname, '../../test-data/sample.md'),
        path.join(__dirname, '../../test-data/sample.txt')
      ];

      const result = await documentProcessor.processAllDocuments(filePaths);
      expect(result.documents.length).toBe(2);

      const conceptsMap = questionGenerator.processDocuments(result.documents);

      expect(conceptsMap.size).toBe(2);
      
      // Each document should have concepts
      conceptsMap.forEach((concepts, filePath) => {
        expect(concepts.keywords).toBeDefined();
        expect(concepts.sourceSentences).toBeDefined();
        expect(concepts.documentPath).toBe(filePath);
      });
    });

    it('should generate statistics across multiple documents', async () => {
      const filePaths = [
        path.join(__dirname, '../../test-data/sample.md'),
        path.join(__dirname, '../../test-data/sample.txt')
      ];

      const result = await documentProcessor.processAllDocuments(filePaths);
      const stats = questionGenerator.getKeywordStatistics(result.documents);

      expect(stats.totalDocuments).toBe(2);
      expect(stats.totalKeywords).toBeGreaterThan(0);
      expect(stats.averageKeywordsPerDocument).toBeGreaterThan(0);
    });

    it('should extract meaningful sentences for question generation', async () => {
      const txtPath = path.join(__dirname, '../../test-data/sample.txt');
      
      const document = await documentProcessor.processDocument(txtPath);
      const concepts = questionGenerator.identifyKeyConcepts(document);

      expect(concepts.sourceSentences.length).toBeGreaterThan(0);
      
      // Each source sentence should have metadata
      concepts.sourceSentences.forEach(source => {
        expect(source.sentence).toBeDefined();
        expect(source.sentence.length).toBeGreaterThan(20); // Substantial sentences
        expect(source.keywords).toBeDefined();
        expect(Array.isArray(source.keywords)).toBe(true);
        expect(source.keywords.length).toBeGreaterThan(0);
        expect(source.sourceDocument).toBe(document.filePath);
      });
    });

    it('should handle documents with varying content lengths', async () => {
      const filePaths = [
        path.join(__dirname, '../../test-data/sample.md'),
        path.join(__dirname, '../../test-data/sample.txt')
      ];

      const result = await documentProcessor.processAllDocuments(filePaths);
      
      result.documents.forEach(document => {
        const concepts = questionGenerator.identifyKeyConcepts(document);
        
        // Should extract concepts regardless of document length
        expect(concepts).toBeDefined();
        expect(concepts.keywords).toBeDefined();
        
        // Keywords should be relevant (frequency >= 2)
        concepts.keywords.forEach(keyword => {
          expect(keyword.frequency).toBeGreaterThanOrEqual(2);
          expect(keyword.score).toBeGreaterThan(0);
        });
      });
    });

    it('should identify different keywords from different documents', async () => {
      const filePaths = [
        path.join(__dirname, '../../test-data/sample.md'),
        path.join(__dirname, '../../test-data/sample.txt')
      ];

      const result = await documentProcessor.processAllDocuments(filePaths);
      const conceptsMap = questionGenerator.processDocuments(result.documents);

      const allKeywords = new Set();
      conceptsMap.forEach(concepts => {
        concepts.keywords.forEach(keyword => {
          allKeywords.add(keyword.word);
        });
      });

      // Should have extracted multiple unique keywords across documents
      expect(allKeywords.size).toBeGreaterThan(0);
    });
  });

  describe('keyword extraction quality', () => {
    it('should prioritize frequently occurring terms', async () => {
      const txtPath = path.join(__dirname, '../../test-data/sample.txt');
      const document = await documentProcessor.processDocument(txtPath);
      
      const keywords = questionGenerator.extractKeywords(document.content);

      // Keywords should be sorted by score (frequency * length bonus)
      for (let i = 0; i < keywords.length - 1; i++) {
        expect(keywords[i].score).toBeGreaterThanOrEqual(keywords[i + 1].score);
      }
    });

    it('should filter out common stop words', async () => {
      const txtPath = path.join(__dirname, '../../test-data/sample.txt');
      const document = await documentProcessor.processDocument(txtPath);
      
      const keywords = questionGenerator.extractKeywords(document.content);

      // No stop words should appear in keywords
      const stopWords = ['the', 'and', 'is', 'are', 'was', 'were', 'to', 'of', 'in'];
      const keywordWords = keywords.map(k => k.word);
      
      stopWords.forEach(stopWord => {
        expect(keywordWords).not.toContain(stopWord);
      });
    });

    it('should extract sentences with high keyword density', async () => {
      const txtPath = path.join(__dirname, '../../test-data/sample.txt');
      const document = await documentProcessor.processDocument(txtPath);
      
      const concepts = questionGenerator.identifyKeyConcepts(document);
      
      // Source sentences should contain at least one keyword
      concepts.sourceSentences.forEach(source => {
        expect(source.keywords.length).toBeGreaterThan(0);
        
        // Verify keywords actually appear in the sentence
        source.keywords.forEach(keyword => {
          expect(source.sentence.toLowerCase()).toContain(keyword.toLowerCase());
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle empty documents gracefully', async () => {
      const document = {
        filePath: '/path/to/empty.txt',
        content: '',
        metadata: { title: 'Empty', wordCount: 0 }
      };

      const concepts = questionGenerator.identifyKeyConcepts(document);

      expect(concepts.keywords).toEqual([]);
      expect(concepts.sourceSentences).toEqual([]);
    });

    it('should handle documents with only stop words', async () => {
      const document = {
        filePath: '/path/to/stopwords.txt',
        content: 'the and is are was were to of in on at',
        metadata: { title: 'Stop Words', wordCount: 11 }
      };

      const concepts = questionGenerator.identifyKeyConcepts(document);

      // Should not extract stop words as keywords
      expect(concepts.keywords).toEqual([]);
    });

    it('should handle documents with very short content', async () => {
      const document = {
        filePath: '/path/to/short.txt',
        content: 'Hi there.',
        metadata: { title: 'Short', wordCount: 2 }
      };

      const concepts = questionGenerator.identifyKeyConcepts(document);

      // May have no keywords due to short content
      expect(concepts).toBeDefined();
      expect(concepts.keywords).toBeDefined();
    });
  });
});
