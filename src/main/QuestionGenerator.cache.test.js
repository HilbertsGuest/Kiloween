const QuestionGenerator = require('./QuestionGenerator');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('QuestionGenerator - Cache and Session Management', () => {
  let generator;
  let tempCachePath;
  let tempDir;

  beforeEach(() => {
    // Create a temporary directory for cache files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'question-cache-test-'));
    tempCachePath = path.join(tempDir, 'test-questions.json');
    
    generator = new QuestionGenerator({
      cachePath: tempCachePath
    });
  });

  afterEach(() => {
    // Clean up temp files
    try {
      if (fs.existsSync(tempCachePath)) {
        fs.unlinkSync(tempCachePath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadCache', () => {
    it('should return empty cache when file does not exist', async () => {
      const cache = await generator.loadCache();

      expect(cache).toEqual({
        questions: [],
        usedInSession: [],
        generated: null,
        documentHashes: []
      });
      expect(generator.cachedQuestions).toEqual([]);
      expect(generator.usedQuestionIds.size).toBe(0);
    });

    it('should load valid cache from disk', async () => {
      const mockCache = {
        generated: '2025-11-15T10:00:00Z',
        documentHashes: ['/path/to/doc1.pdf', '/path/to/doc2.md'],
        questions: [
          {
            id: 'q1',
            text: 'What is the capital of France?',
            type: 'multiple-choice',
            options: ['Paris', 'London', 'Berlin', 'Madrid'],
            correctAnswer: 0,
            explanation: 'Paris is the capital of France.',
            sourceDocument: '/path/to/doc1.pdf'
          },
          {
            id: 'q2',
            text: 'What is 2 + 2?',
            type: 'multiple-choice',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1,
            explanation: '2 + 2 = 4',
            sourceDocument: '/path/to/doc2.md'
          }
        ],
        usedInSession: ['q1']
      };

      fs.writeFileSync(tempCachePath, JSON.stringify(mockCache), 'utf8');

      const cache = await generator.loadCache();

      expect(cache.questions).toHaveLength(2);
      expect(cache.usedInSession).toEqual(['q1']);
      expect(generator.cachedQuestions).toHaveLength(2);
      expect(generator.usedQuestionIds.has('q1')).toBe(true);
      expect(generator.usedQuestionIds.has('q2')).toBe(false);
      expect(generator.cacheMetadata.generated).toBe('2025-11-15T10:00:00Z');
    });

    it('should handle corrupted cache file gracefully', async () => {
      fs.writeFileSync(tempCachePath, 'invalid json {{{', 'utf8');

      const cache = await generator.loadCache();

      expect(cache).toEqual({
        questions: [],
        usedInSession: [],
        generated: null,
        documentHashes: []
      });
    });

    it('should handle cache with missing fields', async () => {
      const partialCache = {
        questions: [{ id: 'q1', text: 'Test?' }]
        // Missing other fields
      };

      fs.writeFileSync(tempCachePath, JSON.stringify(partialCache), 'utf8');

      const cache = await generator.loadCache();

      expect(cache.questions).toHaveLength(1);
      expect(cache.usedInSession).toEqual([]);
      expect(generator.cachedQuestions).toHaveLength(1);
    });
  });

  describe('saveCache', () => {
    it('should save questions to cache file', async () => {
      const questions = [
        {
          id: 'q1',
          text: 'What is the capital of France?',
          type: 'multiple-choice',
          options: ['Paris', 'London', 'Berlin', 'Madrid'],
          correctAnswer: 0,
          explanation: 'Paris is the capital of France.',
          sourceDocument: '/path/to/doc1.pdf'
        }
      ];

      const documentPaths = ['/path/to/doc1.pdf'];

      await generator.saveCache(questions, documentPaths);

      expect(fs.existsSync(tempCachePath)).toBe(true);

      const savedData = JSON.parse(fs.readFileSync(tempCachePath, 'utf8'));
      expect(savedData.questions).toHaveLength(1);
      expect(savedData.questions[0].id).toBe('q1');
      expect(savedData.documentHashes).toEqual(['/path/to/doc1.pdf']);
      expect(savedData.generated).toBeTruthy();
      expect(savedData.usedInSession).toEqual([]);
    });

    it('should save used questions in session', async () => {
      const questions = [
        { id: 'q1', text: 'Question 1?' },
        { id: 'q2', text: 'Question 2?' }
      ];

      generator.cachedQuestions = questions;
      generator.markQuestionUsed('q1');

      await generator.saveCache(questions, []);

      const savedData = JSON.parse(fs.readFileSync(tempCachePath, 'utf8'));
      expect(savedData.usedInSession).toEqual(['q1']);
    });

    it('should create directory if it does not exist', async () => {
      const deepPath = path.join(tempDir, 'nested', 'deep', 'cache.json');
      const deepGenerator = new QuestionGenerator({ cachePath: deepPath });

      const questions = [{ id: 'q1', text: 'Test?' }];
      await deepGenerator.saveCache(questions, []);

      expect(fs.existsSync(deepPath)).toBe(true);
    });

    it('should update in-memory cache after saving', async () => {
      const questions = [
        { id: 'q1', text: 'Question 1?' },
        { id: 'q2', text: 'Question 2?' }
      ];

      await generator.saveCache(questions, ['/doc1.pdf']);

      expect(generator.cachedQuestions).toHaveLength(2);
      expect(generator.cacheMetadata.documentHashes).toEqual(['/doc1.pdf']);
      expect(generator.cacheMetadata.generated).toBeTruthy();
    });
  });

  describe('getNextQuestion', () => {
    beforeEach(() => {
      generator.cachedQuestions = [
        { id: 'q1', text: 'Question 1?' },
        { id: 'q2', text: 'Question 2?' },
        { id: 'q3', text: 'Question 3?' }
      ];
    });

    it('should return a random unused question', () => {
      const question = generator.getNextQuestion();

      expect(question).toBeTruthy();
      expect(['q1', 'q2', 'q3']).toContain(question.id);
    });

    it('should not return used questions', () => {
      generator.markQuestionUsed('q1');
      generator.markQuestionUsed('q2');

      const question = generator.getNextQuestion();

      expect(question).toBeTruthy();
      expect(question.id).toBe('q3');
    });

    it('should return null when all questions are used', () => {
      generator.markQuestionUsed('q1');
      generator.markQuestionUsed('q2');
      generator.markQuestionUsed('q3');

      const question = generator.getNextQuestion();

      expect(question).toBeNull();
    });

    it('should return null when cache is empty', () => {
      generator.cachedQuestions = [];

      const question = generator.getNextQuestion();

      expect(question).toBeNull();
    });

    it('should guarantee uniqueness across multiple calls', () => {
      const usedIds = new Set();

      // Get all questions
      for (let i = 0; i < 3; i++) {
        const question = generator.getNextQuestion();
        expect(question).toBeTruthy();
        expect(usedIds.has(question.id)).toBe(false);
        
        usedIds.add(question.id);
        generator.markQuestionUsed(question.id);
      }

      // Fourth call should return null
      expect(generator.getNextQuestion()).toBeNull();
    });
  });

  describe('markQuestionUsed', () => {
    beforeEach(() => {
      generator.cachedQuestions = [
        { id: 'q1', text: 'Question 1?' },
        { id: 'q2', text: 'Question 2?' }
      ];
    });

    it('should mark a question as used', () => {
      const result = generator.markQuestionUsed('q1');

      expect(result).toBe(true);
      expect(generator.usedQuestionIds.has('q1')).toBe(true);
    });

    it('should return false for non-existent question', () => {
      const result = generator.markQuestionUsed('q999');

      expect(result).toBe(false);
      expect(generator.usedQuestionIds.has('q999')).toBe(false);
    });

    it('should return false for null or undefined ID', () => {
      expect(generator.markQuestionUsed(null)).toBe(false);
      expect(generator.markQuestionUsed(undefined)).toBe(false);
      expect(generator.markQuestionUsed('')).toBe(false);
    });

    it('should allow marking the same question multiple times', () => {
      generator.markQuestionUsed('q1');
      const result = generator.markQuestionUsed('q1');

      expect(result).toBe(true);
      expect(generator.usedQuestionIds.size).toBe(1);
    });
  });

  describe('resetSession', () => {
    it('should clear all used questions', () => {
      generator.cachedQuestions = [
        { id: 'q1', text: 'Question 1?' },
        { id: 'q2', text: 'Question 2?' }
      ];

      generator.markQuestionUsed('q1');
      generator.markQuestionUsed('q2');

      expect(generator.usedQuestionIds.size).toBe(2);

      generator.resetSession();

      expect(generator.usedQuestionIds.size).toBe(0);
      expect(generator.getNextQuestion()).toBeTruthy();
    });

    it('should not affect cached questions', () => {
      generator.cachedQuestions = [
        { id: 'q1', text: 'Question 1?' },
        { id: 'q2', text: 'Question 2?' }
      ];

      generator.resetSession();

      expect(generator.cachedQuestions).toHaveLength(2);
    });
  });

  describe('getSessionStats', () => {
    it('should return correct statistics', () => {
      generator.cachedQuestions = [
        { id: 'q1', text: 'Question 1?' },
        { id: 'q2', text: 'Question 2?' },
        { id: 'q3', text: 'Question 3?' }
      ];
      generator.cacheMetadata = {
        generated: '2025-11-15T10:00:00Z',
        documentHashes: ['/doc1.pdf', '/doc2.md']
      };

      generator.markQuestionUsed('q1');

      const stats = generator.getSessionStats();

      expect(stats.totalQuestions).toBe(3);
      expect(stats.usedQuestions).toBe(1);
      expect(stats.remainingQuestions).toBe(2);
      expect(stats.cacheGenerated).toBe('2025-11-15T10:00:00Z');
      expect(stats.documentCount).toBe(2);
    });

    it('should handle empty cache', () => {
      const stats = generator.getSessionStats();

      expect(stats.totalQuestions).toBe(0);
      expect(stats.usedQuestions).toBe(0);
      expect(stats.remainingQuestions).toBe(0);
    });
  });

  describe('needsCacheRegeneration', () => {
    beforeEach(() => {
      generator.cacheMetadata = {
        generated: '2025-11-15T10:00:00Z',
        documentHashes: ['/doc1.pdf', '/doc2.md']
      };
    });

    it('should return true when cache has never been generated', () => {
      generator.cacheMetadata.generated = null;

      const result = generator.needsCacheRegeneration(['/doc1.pdf']);

      expect(result).toBe(true);
    });

    it('should return false when documents match', () => {
      const result = generator.needsCacheRegeneration(['/doc1.pdf', '/doc2.md']);

      expect(result).toBe(false);
    });

    it('should return true when document count differs', () => {
      const result = generator.needsCacheRegeneration(['/doc1.pdf']);

      expect(result).toBe(true);
    });

    it('should return true when documents are different', () => {
      const result = generator.needsCacheRegeneration(['/doc1.pdf', '/doc3.txt']);

      expect(result).toBe(true);
    });

    it('should return true when new document is added', () => {
      const result = generator.needsCacheRegeneration([
        '/doc1.pdf',
        '/doc2.md',
        '/doc3.txt'
      ]);

      expect(result).toBe(true);
    });

    it('should handle order-independent comparison', () => {
      const result = generator.needsCacheRegeneration(['/doc2.md', '/doc1.pdf']);

      expect(result).toBe(false);
    });
  });

  describe('Integration: Full cache workflow', () => {
    it('should support complete cache lifecycle', async () => {
      // Generate questions with more substantial content
      const documents = [
        {
          filePath: '/test/doc1.pdf',
          content: `Machine learning is a subset of artificial intelligence that focuses on algorithms. 
          Neural networks are computational models inspired by biological neurons. 
          Deep learning uses multiple layers of neural networks for complex pattern recognition.
          Supervised learning requires labeled training data for model development.
          Unsupervised learning discovers patterns without explicit labels.
          Reinforcement learning trains agents through reward-based feedback mechanisms.
          Natural language processing enables computers to understand human language.
          Computer vision allows machines to interpret visual information from images.
          Convolutional neural networks excel at image recognition tasks.
          Recurrent neural networks process sequential data effectively.`,
          metadata: { title: 'ML Basics', wordCount: 200 }
        }
      ];

      const questions = generator.generateQuestions(documents, 5);
      expect(questions.length).toBeGreaterThan(0);

      // Save to cache
      await generator.saveCache(questions, ['/test/doc1.pdf']);

      // Create new generator instance and load cache
      const generator2 = new QuestionGenerator({ cachePath: tempCachePath });
      await generator2.loadCache();

      expect(generator2.cachedQuestions.length).toBe(questions.length);

      // Get and use questions
      const q1 = generator2.getNextQuestion();
      expect(q1).toBeTruthy();
      generator2.markQuestionUsed(q1.id);

      const q2 = generator2.getNextQuestion();
      expect(q2).toBeTruthy();
      expect(q2.id).not.toBe(q1.id);
      generator2.markQuestionUsed(q2.id);

      // Save session state
      await generator2.saveCache();

      // Load again and verify used questions persist
      const generator3 = new QuestionGenerator({ cachePath: tempCachePath });
      await generator3.loadCache();

      expect(generator3.usedQuestionIds.has(q1.id)).toBe(true);
      expect(generator3.usedQuestionIds.has(q2.id)).toBe(true);
      
      const q3 = generator3.getNextQuestion();
      expect(q3).toBeTruthy();
      expect(q3.id).not.toBe(q1.id);
      expect(q3.id).not.toBe(q2.id);
    });

    it('should detect when cache needs regeneration', async () => {
      const documents1 = [
        {
          filePath: '/test/doc1.pdf',
          content: `Machine learning algorithms enable computers to learn from data patterns.
          Artificial intelligence encompasses various computational techniques for problem solving.
          Data science combines statistics, programming, and domain expertise effectively.
          Neural networks consist of interconnected nodes that process information.
          Training data quality significantly impacts model performance and accuracy.`,
          metadata: { title: 'ML', wordCount: 100 }
        }
      ];

      const questions1 = generator.generateQuestions(documents1, 5);
      await generator.saveCache(questions1, ['/test/doc1.pdf']);

      // Check with same documents
      expect(generator.needsCacheRegeneration(['/test/doc1.pdf'])).toBe(false);

      // Check with different documents
      expect(generator.needsCacheRegeneration(['/test/doc2.pdf'])).toBe(true);
    });
  });
});
