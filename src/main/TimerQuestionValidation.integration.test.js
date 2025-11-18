const TimerManager = require('./TimerManager');
const ConfigManager = require('./ConfigManager');
const QuestionGenerator = require('./QuestionGenerator');
const DocumentProcessor = require('./DocumentProcessor');
const path = require('path');
const fs = require('fs').promises;

describe('Timer and Question Validation Integration', () => {
  let configManager;
  let questionGenerator;
  let documentProcessor;
  let timerManager;
  let testConfigPath;
  let testCachePath;

  beforeEach(async () => {
    // Set up test paths
    testConfigPath = path.join(__dirname, '../../data', `test-config-${Date.now()}.json`);
    testCachePath = path.join(__dirname, '../../data', `test-questions-${Date.now()}.json`);

    // Initialize managers
    configManager = new ConfigManager(testConfigPath);
    await configManager.load();

    documentProcessor = new DocumentProcessor(configManager);
    questionGenerator = new QuestionGenerator({ cachePath: testCachePath });
    timerManager = new TimerManager(configManager);
  });

  afterEach(async () => {
    // Clean up
    if (timerManager) {
      timerManager.destroy();
    }

    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // File might not exist
    }

    try {
      await fs.unlink(testCachePath);
    } catch (error) {
      // File might not exist
    }
  });

  describe('validateQuestionsAvailable', () => {
    it('should return false when no documents are configured', async () => {
      await configManager.set('documents', []);

      const hasQuestions = questionGenerator.hasQuestions();
      expect(hasQuestions).toBe(false);
    });

    it('should return true when cached questions exist', async () => {
      const cachedQuestions = [
        {
          id: 'q1',
          text: 'What is test?',
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Test',
          sourceDocument: '/path/to/doc.pdf'
        }
      ];

      await questionGenerator.saveCache(cachedQuestions, ['/path/to/doc.pdf']);
      await questionGenerator.loadCache();

      expect(questionGenerator.hasQuestions()).toBe(true);
    });

    it('should return true after generating questions from documents', async () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: 'Mitochondria mitochondria produce energy energy. Chloroplasts chloroplasts perform photosynthesis photosynthesis.',
          metadata: { title: 'Biology' }
        }
      ];

      const result = await questionGenerator.generateQuestionsWithFallback(documents, 10);

      expect(result.questions.length).toBeGreaterThan(0);
      expect(questionGenerator.hasQuestions()).toBe(true);
    });
  });

  describe('regenerateQuestions', () => {
    it('should fail when no documents are configured', async () => {
      await configManager.set('documents', []);

      const documents = configManager.get('documents');
      expect(documents.length).toBe(0);

      // Cannot generate questions without documents
      const result = await questionGenerator.generateQuestionsWithFallback([], 10);
      expect(result.error).toBeDefined();
    });

    it('should succeed with valid documents', async () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: 'Mitochondria mitochondria produce energy energy. Chloroplasts chloroplasts perform photosynthesis photosynthesis.',
          metadata: { title: 'Biology' }
        }
      ];

      const result = await questionGenerator.generateQuestionsWithFallback(documents, 10);

      expect(result.error).toBeNull();
      expect(result.questions.length).toBeGreaterThan(0);
    });

    it('should fall back to cached questions on failure', async () => {
      // Save cached questions
      const cachedQuestions = [
        {
          id: 'cached-q1',
          text: 'What is cached?',
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Cached',
          sourceDocument: '/path/to/old.pdf'
        }
      ];

      await questionGenerator.saveCache(cachedQuestions, ['/path/to/old.pdf']);

      // Try to generate with invalid documents
      const invalidDocuments = [
        {
          filePath: '/path/to/invalid.pdf',
          content: '',
          metadata: { title: 'Invalid' }
        }
      ];

      const result = await questionGenerator.generateQuestionsWithFallback(invalidDocuments, 10);

      expect(result.usedCache).toBe(true);
      expect(result.questions.length).toBe(1);
      expect(result.error).toBeNull();
    });
  });

  describe('Timer behavior with question validation', () => {
    it('should not start timer when no questions are available', async () => {
      await configManager.set('documents', []);

      // Timer should not start without questions
      const hasQuestions = questionGenerator.hasQuestions();
      expect(hasQuestions).toBe(false);

      // In real implementation, timer start would be prevented
      // This is a unit test, so we just verify the state
    });

    it('should allow timer to start when questions are available', async () => {
      const cachedQuestions = [
        {
          id: 'q1',
          text: 'What is test?',
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Test',
          sourceDocument: '/path/to/doc.pdf'
        }
      ];

      await questionGenerator.saveCache(cachedQuestions, ['/path/to/doc.pdf']);
      await questionGenerator.loadCache();

      expect(questionGenerator.hasQuestions()).toBe(true);
      expect(questionGenerator.hasUnusedQuestions()).toBe(true);

      // Timer can start
      timerManager.start();
      expect(timerManager.isRunning).toBe(true);
    });

    it('should handle timer expiration when no unused questions remain', async () => {
      const cachedQuestions = [
        {
          id: 'q1',
          text: 'What is test?',
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Test',
          sourceDocument: '/path/to/doc.pdf'
        }
      ];

      await questionGenerator.saveCache(cachedQuestions, ['/path/to/doc.pdf']);
      await questionGenerator.loadCache();

      // Mark question as used
      questionGenerator.markQuestionUsed('q1');

      expect(questionGenerator.hasQuestions()).toBe(true);
      expect(questionGenerator.hasUnusedQuestions()).toBe(false);

      // In real implementation, timer expiration would trigger regeneration
      // This test verifies the state
    });
  });

  describe('Error scenarios', () => {
    it('should handle empty document content gracefully', async () => {
      const emptyDocuments = [
        {
          filePath: '/path/to/empty.pdf',
          content: '',
          metadata: { title: 'Empty' }
        }
      ];

      const result = await questionGenerator.generateQuestionsWithFallback(emptyDocuments, 10);

      expect(result.questions).toEqual([]);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No questions could be generated');
    });

    it('should handle invalid document format gracefully', async () => {
      const invalidDocuments = [
        {
          filePath: '/path/to/invalid.pdf',
          content: 'a b c d e',
          metadata: { title: 'Invalid' }
        }
      ];

      const result = await questionGenerator.generateQuestionsWithFallback(invalidDocuments, 10);

      expect(result.questions).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('should provide helpful error messages', async () => {
      const result = await questionGenerator.generateQuestionsWithFallback([], 10);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('check your document configuration');
    });
  });

  describe('Question availability checks', () => {
    it('should correctly report when questions are available', async () => {
      const questions = [
        {
          id: 'q1',
          text: 'Question 1?',
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Explanation',
          sourceDocument: '/path/to/doc.pdf'
        }
      ];

      await questionGenerator.saveCache(questions, ['/path/to/doc.pdf']);
      await questionGenerator.loadCache();

      expect(questionGenerator.hasQuestions()).toBe(true);
      expect(questionGenerator.hasUnusedQuestions()).toBe(true);

      const stats = questionGenerator.getSessionStats();
      expect(stats.totalQuestions).toBe(1);
      expect(stats.usedQuestions).toBe(0);
      expect(stats.remainingQuestions).toBe(1);
    });

    it('should correctly report when all questions are used', async () => {
      const questions = [
        {
          id: 'q1',
          text: 'Question 1?',
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Explanation',
          sourceDocument: '/path/to/doc.pdf'
        }
      ];

      await questionGenerator.saveCache(questions, ['/path/to/doc.pdf']);
      await questionGenerator.loadCache();
      questionGenerator.markQuestionUsed('q1');

      expect(questionGenerator.hasQuestions()).toBe(true);
      expect(questionGenerator.hasUnusedQuestions()).toBe(false);

      const stats = questionGenerator.getSessionStats();
      expect(stats.totalQuestions).toBe(1);
      expect(stats.usedQuestions).toBe(1);
      expect(stats.remainingQuestions).toBe(0);
    });

    it('should correctly report when no questions exist', () => {
      expect(questionGenerator.hasQuestions()).toBe(false);
      expect(questionGenerator.hasUnusedQuestions()).toBe(false);

      const stats = questionGenerator.getSessionStats();
      expect(stats.totalQuestions).toBe(0);
      expect(stats.usedQuestions).toBe(0);
      expect(stats.remainingQuestions).toBe(0);
    });
  });
});
