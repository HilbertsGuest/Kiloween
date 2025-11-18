const fs = require('fs').promises;
const path = require('path');

// Mock electron before importing modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => './test-data'),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn(() => true)
  },
  BrowserWindow: vi.fn(),
  Tray: vi.fn(),
  Menu: vi.fn(() => ({ popup: vi.fn() })),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn()
  }
}));

const SessionManager = require('./SessionManager');
const ScareController = require('./ScareController');
const QuestionGenerator = require('./QuestionGenerator');
const DocumentProcessor = require('./DocumentProcessor');
const ConfigManager = require('./ConfigManager');

describe('Session Statistics Integration', () => {
  let sessionManager;
  let scareController;
  let questionGenerator;
  let documentProcessor;
  let configManager;
  let testSessionPath;
  let testConfigPath;

  beforeEach(async () => {
    // Set up test paths
    testSessionPath = path.join('./test-data', 'integration-session.json');
    testConfigPath = path.join('./test-data', 'integration-config.json');

    // Clean up any existing files
    try {
      await fs.unlink(testSessionPath);
    } catch (error) {
      // File doesn't exist, that's okay
    }
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // File doesn't exist, that's okay
    }

    // Initialize managers
    configManager = new ConfigManager(testConfigPath);
    await configManager.load();

    sessionManager = new SessionManager(testSessionPath);
    await sessionManager.load();

    documentProcessor = new DocumentProcessor(configManager);
    questionGenerator = new QuestionGenerator(documentProcessor);

    // Add some test questions directly to the cache
    questionGenerator.questionCache = {
      questions: [
        {
          id: 'q1',
          text: 'What is 2+2?',
          type: 'multiple-choice',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
          explanation: 'Basic math',
          sourceDocument: 'test.txt'
        },
        {
          id: 'q2',
          text: 'What is the capital of France?',
          type: 'multiple-choice',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          correctAnswer: 2,
          explanation: 'Geography',
          sourceDocument: 'test.txt'
        },
        {
          id: 'q3',
          text: 'What is 3+3?',
          type: 'multiple-choice',
          options: ['5', '6', '7', '8'],
          correctAnswer: 1,
          explanation: 'Basic math',
          sourceDocument: 'test.txt'
        }
      ],
      usedInSession: []
    };

    scareController = new ScareController(questionGenerator, { sessionManager });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testSessionPath);
    } catch (error) {
      // File doesn't exist, that's okay
    }
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // File doesn't exist, that's okay
    }
  });

  it('should track correct answers through ScareController', async () => {
    // Create a test question
    const question = {
      id: 'q1',
      text: 'What is 2+2?',
      type: 'multiple-choice',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      explanation: 'Basic math',
      sourceDocument: 'test.txt'
    };
    
    scareController.currentQuestion = question;

    // Simulate correct answer submission
    await scareController._handleAnswerSubmit(null, question.id, question.correctAnswer);

    // Check statistics
    const stats = sessionManager.getStatistics();
    expect(stats.questionsAnswered).toBe(1);
    expect(stats.correctAnswers).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(1);
    expect(sessionManager.getAccuracy()).toBe(100);
  });

  it('should track incorrect answers through ScareController', async () => {
    // Create a test question
    const question = {
      id: 'q2',
      text: 'What is the capital of France?',
      type: 'multiple-choice',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2,
      explanation: 'Geography',
      sourceDocument: 'test.txt'
    };
    
    scareController.currentQuestion = question;

    // Simulate incorrect answer submission
    const wrongAnswer = 0; // Wrong answer
    await scareController._handleAnswerSubmit(null, question.id, wrongAnswer);

    // Check statistics
    const stats = sessionManager.getStatistics();
    expect(stats.questionsAnswered).toBe(1);
    expect(stats.correctAnswers).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(sessionManager.getAccuracy()).toBe(0);
  });

  it('should track streak correctly across multiple answers', async () => {
    // Create test questions
    const questions = [
      {
        id: 'q1',
        text: 'What is 2+2?',
        type: 'multiple-choice',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1
      },
      {
        id: 'q2',
        text: 'What is 3+3?',
        type: 'multiple-choice',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1
      },
      {
        id: 'q3',
        text: 'What is 4+4?',
        type: 'multiple-choice',
        options: ['6', '7', '8', '9'],
        correctAnswer: 2
      }
    ];

    // First correct answer
    scareController.currentQuestion = questions[0];
    await scareController._handleAnswerSubmit(null, questions[0].id, questions[0].correctAnswer);

    // Second correct answer
    scareController.currentQuestion = questions[1];
    await scareController._handleAnswerSubmit(null, questions[1].id, questions[1].correctAnswer);

    // Check streak after 2 correct
    let stats = sessionManager.getStatistics();
    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);

    // Third incorrect answer
    scareController.currentQuestion = questions[2];
    const wrongAnswer = 0; // Wrong answer
    await scareController._handleAnswerSubmit(null, questions[2].id, wrongAnswer);

    // Check streak reset
    stats = sessionManager.getStatistics();
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(2); // Best streak should remain 2
    expect(stats.questionsAnswered).toBe(3);
    expect(stats.correctAnswers).toBe(2);
    expect(sessionManager.getAccuracy()).toBe(67); // 2/3 = 66.67% rounded to 67
  });

  it('should persist statistics across sessions', async () => {
    // Create a test question
    const question = {
      id: 'q1',
      text: 'What is 2+2?',
      type: 'multiple-choice',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1
    };
    
    scareController.currentQuestion = question;
    await scareController._handleAnswerSubmit(null, question.id, question.correctAnswer);

    // Create a new session manager instance
    const newSessionManager = new SessionManager(testSessionPath);
    await newSessionManager.load();

    // Verify statistics persisted
    const stats = newSessionManager.getStatistics();
    expect(stats.questionsAnswered).toBe(1);
    expect(stats.correctAnswers).toBe(1);
    expect(stats.currentStreak).toBe(1);
  });

  it('should reset statistics correctly', async () => {
    // Create test questions
    const question1 = {
      id: 'q1',
      text: 'What is 2+2?',
      type: 'multiple-choice',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1
    };
    
    const question2 = {
      id: 'q2',
      text: 'What is 3+3?',
      type: 'multiple-choice',
      options: ['5', '6', '7', '8'],
      correctAnswer: 1
    };
    
    scareController.currentQuestion = question1;
    await scareController._handleAnswerSubmit(null, question1.id, question1.correctAnswer);

    scareController.currentQuestion = question2;
    await scareController._handleAnswerSubmit(null, question2.id, question2.correctAnswer);

    // Verify statistics exist
    let stats = sessionManager.getStatistics();
    expect(stats.questionsAnswered).toBe(2);

    // Reset session
    await sessionManager.resetSession();

    // Verify statistics reset
    stats = sessionManager.getStatistics();
    expect(stats.questionsAnswered).toBe(0);
    expect(stats.correctAnswers).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(stats.lastQuestionAt).toBeNull();
  });

  it('should calculate accuracy correctly', async () => {
    // Create test questions
    const questions = [
      {
        id: 'q1',
        text: 'What is 2+2?',
        type: 'multiple-choice',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1
      },
      {
        id: 'q2',
        text: 'What is 3+3?',
        type: 'multiple-choice',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1
      },
      {
        id: 'q3',
        text: 'What is 4+4?',
        type: 'multiple-choice',
        options: ['6', '7', '8', '9'],
        correctAnswer: 2
      }
    ];

    // Correct
    scareController.currentQuestion = questions[0];
    await scareController._handleAnswerSubmit(null, questions[0].id, questions[0].correctAnswer);

    // Correct
    scareController.currentQuestion = questions[1];
    await scareController._handleAnswerSubmit(null, questions[1].id, questions[1].correctAnswer);

    // Incorrect
    scareController.currentQuestion = questions[2];
    const wrongAnswer = 0; // Wrong answer
    await scareController._handleAnswerSubmit(null, questions[2].id, wrongAnswer);

    // 2 correct out of 3 = 66.67% rounded to 67%
    expect(sessionManager.getAccuracy()).toBe(67);
  });

  it('should update lastQuestionAt timestamp', async () => {
    const beforeTime = new Date();

    const question = {
      id: 'q1',
      text: 'What is 2+2?',
      type: 'multiple-choice',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1
    };
    
    scareController.currentQuestion = question;
    await scareController._handleAnswerSubmit(null, question.id, question.correctAnswer);

    const afterTime = new Date();
    const stats = sessionManager.getStatistics();

    const lastQuestionAt = new Date(stats.lastQuestionAt);
    expect(lastQuestionAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(lastQuestionAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });
});
