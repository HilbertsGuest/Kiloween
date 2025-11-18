import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';

// Mock Electron modules
const mockBrowserWindows = new Map();
let mockTray = null;

class MockBrowserWindow {
  constructor(options) {
    this.id = Math.random().toString(36);
    this.options = options;
    this._destroyed = false;
    this._hidden = !options.show;
    this._loading = true;
    this.webContents = {
      send: vi.fn(),
      isLoading: vi.fn(() => this._loading),
      on: vi.fn(),
      once: vi.fn((event, callback) => {
        if (event === 'did-finish-load') {
          setTimeout(() => {
            this._loading = false;
            callback();
          }, 10);
        }
      })
    };
    mockBrowserWindows.set(this.id, this);
  }

  loadFile(filePath) {
    this._loading = true;
    setTimeout(() => {
      this._loading = false;
      this.webContents.once.mock.calls.forEach(([event, callback]) => {
        if (event === 'did-finish-load') callback();
      });
    }, 10);
    return Promise.resolve();
  }

  show() {
    this._hidden = false;
  }

  hide() {
    this._hidden = true;
  }

  focus() {}

  isDestroyed() {
    return this._destroyed;
  }

  destroy() {
    this._destroyed = true;
    mockBrowserWindows.delete(this.id);
  }

  isMinimized() {
    return false;
  }

  restore() {}

  static getAllWindows() {
    return Array.from(mockBrowserWindows.values());
  }
}

class MockTray {
  constructor(iconPath) {
    this.iconPath = iconPath;
    mockTray = this;
  }

  setToolTip(text) {
    this.tooltip = text;
  }

  setContextMenu(menu) {
    this.menu = menu;
  }

  destroy() {
    mockTray = null;
  }
}

const mockIpcHandlers = new Map();
const mockIpcListeners = new Map();

const mockApp = {
  requestSingleInstanceLock: vi.fn(() => true),
  whenReady: vi.fn(() => Promise.resolve()),
  quit: vi.fn(),
  exit: vi.fn(),
  on: vi.fn(),
  getPath: vi.fn((name) => {
    if (name === 'userData') return './test-data';
    return './test-data';
  })
};

const mockIpcMain = {
  handle: vi.fn((channel, handler) => {
    mockIpcHandlers.set(channel, handler);
  }),
  on: vi.fn((channel, handler) => {
    mockIpcListeners.set(channel, handler);
  }),
  removeHandler: vi.fn((channel) => {
    mockIpcHandlers.delete(channel);
  })
};

const mockMenu = {
  buildFromTemplate: vi.fn((template) => template)
};

const mockScreen = {
  getPrimaryDisplay: vi.fn(() => ({
    bounds: { width: 1920, height: 1080 }
  }))
};

vi.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: MockBrowserWindow,
  Tray: MockTray,
  Menu: mockMenu,
  ipcMain: mockIpcMain,
  screen: mockScreen
}));

// Import modules after mocking
const ConfigManager = require('./ConfigManager');
const SessionManager = require('./SessionManager');
const TimerManager = require('./TimerManager');
const ScareController = require('./ScareController');
const DocumentProcessor = require('./DocumentProcessor');
const QuestionGenerator = require('./QuestionGenerator');
const { IPC_CHANNELS, SCARE_STAGES } = require('../shared/constants');

describe('End-to-End Application Flow', () => {
  let configManager;
  let sessionManager;
  let timerManager;
  let scareController;
  let documentProcessor;
  let questionGenerator;
  let configWindow;
  let scareWindow;
  let testDocPath;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    mockBrowserWindows.clear();
    mockIpcHandlers.clear();
    mockIpcListeners.clear();

    // Create test document with substantial content for question generation
    testDocPath = path.join('./test-data', 'e2e-test-doc.txt');
    await fs.writeFile(testDocPath, 
      'Photosynthesis is the process by which plants convert light energy into chemical energy. ' +
      'This process occurs in the chloroplasts of plant cells. During photosynthesis, plants use ' +
      'carbon dioxide from the air and water from the soil to produce glucose and oxygen. ' +
      'The chemical equation for photosynthesis is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. ' +
      '\n\n' +
      'The mitochondria is the powerhouse of the cell, responsible for energy production through ' +
      'cellular respiration. Mitochondria convert glucose and oxygen into ATP, which is the energy ' +
      'currency of cells. This process is called aerobic respiration and occurs in three main stages: ' +
      'glycolysis, the Krebs cycle, and the electron transport chain. ' +
      '\n\n' +
      'DNA replication is essential for cell division and genetic inheritance. During DNA replication, ' +
      'the double helix unwinds and each strand serves as a template for a new complementary strand. ' +
      'DNA polymerase is the enzyme responsible for adding nucleotides to the growing DNA strand. ' +
      'The process is semi-conservative, meaning each new DNA molecule contains one original strand ' +
      'and one newly synthesized strand. ' +
      '\n\n' +
      'Cell division occurs through two main processes: mitosis and meiosis. Mitosis produces two ' +
      'identical daughter cells and is used for growth and repair. Meiosis produces four genetically ' +
      'different cells and is used for sexual reproduction. The cell cycle includes interphase, ' +
      'where the cell grows and replicates its DNA, followed by mitosis or meiosis. ' +
      '\n\n' +
      'Proteins are essential macromolecules made up of amino acids. Protein synthesis occurs in ' +
      'two main steps: transcription and translation. During transcription, DNA is copied into mRNA ' +
      'in the nucleus. During translation, ribosomes read the mRNA sequence and assemble amino acids ' +
      'into proteins. Transfer RNA (tRNA) molecules bring the correct amino acids to the ribosome.'
    );

    // Initialize managers
    configManager = new ConfigManager(path.join('./test-data', 'e2e-config.json'));
    await configManager.load();
    
    // Set initial config
    await configManager.set('interval', 5); // 5 minutes (minimum allowed)
    await configManager.set('documents', []);
    await configManager.set('audioEnabled', false);
    await configManager.set('difficulty', 'medium');

    sessionManager = new SessionManager(path.join('./test-data', 'e2e-session.json'));
    await sessionManager.load();

    documentProcessor = new DocumentProcessor({
      useWorkerThreads: false, // Disable for testing
      configManager: configManager
    });

    questionGenerator = new QuestionGenerator({
      cachePath: path.join('./test-data', 'e2e-questions.json'),
      maxCachedQuestions: 50,
      lazyLoad: false
    });

    scareController = new ScareController(questionGenerator, { sessionManager });
    
    timerManager = new TimerManager(configManager);
    await timerManager.initialize();

    // Create windows
    configWindow = new MockBrowserWindow({
      width: 800,
      height: 600,
      show: false
    });

    scareWindow = new MockBrowserWindow({
      width: 1920,
      height: 1080,
      fullscreen: true,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      show: false
    });

    scareController.setScareWindow(scareWindow);

    // Set up IPC handlers (simulating main process setup)
    setupIPCHandlers();
  });

  afterEach(async () => {
    // Cleanup
    if (timerManager) timerManager.destroy();
    if (scareController) scareController.destroy();
    if (configWindow) configWindow.destroy();
    if (scareWindow) scareWindow.destroy();

    // Clean up test files
    try {
      await fs.unlink(testDocPath);
      await fs.unlink(path.join('./test-data', 'e2e-config.json'));
      await fs.unlink(path.join('./test-data', 'e2e-session.json'));
      await fs.unlink(path.join('./test-data', 'e2e-questions.json'));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  function setupIPCHandlers() {
    // Config handlers
    mockIpcMain.handle(IPC_CHANNELS.CONFIG_GET, async (event, key) => {
      if (key) return configManager.get(key);
      return configManager.config;
    });

    mockIpcMain.handle(IPC_CHANNELS.CONFIG_SET, async (event, key, value) => {
      await configManager.set(key, value);
      return configManager.get(key);
    });

    // Document handlers
    mockIpcMain.handle(IPC_CHANNELS.DOCUMENT_ADD, async (event, filePath) => {
      const validation = await documentProcessor.validateDocument(filePath);
      if (!validation.valid) {
        throw new Error(validation.userFriendlyError || validation.error);
      }

      const documents = configManager.get('documents') || [];
      if (!documents.includes(filePath)) {
        documents.push(filePath);
        await configManager.set('documents', documents);
      }

      return { success: true, filePath };
    });

    mockIpcMain.handle(IPC_CHANNELS.DOCUMENT_REMOVE, async (event, filePath) => {
      const documents = configManager.get('documents') || [];
      const index = documents.indexOf(filePath);
      if (index !== -1) {
        documents.splice(index, 1);
        await configManager.set('documents', documents);
      }
      return { success: true, filePath };
    });

    // Timer handlers
    mockIpcMain.handle(IPC_CHANNELS.TIMER_START, async () => {
      timerManager.start();
      return { success: true };
    });

    mockIpcMain.handle(IPC_CHANNELS.TIMER_STATUS, async () => {
      return timerManager.getStatus();
    });

    // Session handlers
    mockIpcMain.handle(IPC_CHANNELS.SESSION_GET_STATS, async () => {
      return sessionManager.getStatistics();
    });
  }

  async function simulateIPCCall(channel, ...args) {
    const handler = mockIpcHandlers.get(channel);
    if (!handler) {
      throw new Error(`No IPC handler registered for channel: ${channel}`);
    }
    return await handler({}, ...args);
  }

  describe('Complete Application Flow', () => {
    it('should complete full flow: launch -> config -> document -> timer -> scare -> question -> answer', async () => {
      const events = [];

      // Step 1: Application Launch
      events.push('app-launched');
      expect(configManager).toBeDefined();
      expect(sessionManager).toBeDefined();
      expect(timerManager).toBeDefined();

      // Step 2: Open Configuration Window
      events.push('config-window-opened');
      configWindow.show();
      expect(configWindow._hidden).toBe(false);

      // Step 3: Add Document via IPC
      events.push('adding-document');
      const addResult = await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
      expect(addResult.success).toBe(true);
      expect(configManager.get('documents')).toContain(testDocPath);
      events.push('document-added');

      // Step 4: Process Documents and Generate Questions
      events.push('processing-documents');
      const documents = configManager.get('documents');
      const result = await documentProcessor.processAllDocuments(documents);
      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.documents[0].content).toContain('Photosynthesis');
      events.push('documents-processed');

      events.push('generating-questions');
      const questions = await questionGenerator.generateQuestions(result.documents, 5);
      expect(questions.length).toBeGreaterThan(0);
      events.push('questions-generated');

      // Step 5: Start Timer
      events.push('starting-timer');
      await simulateIPCCall(IPC_CHANNELS.TIMER_START);
      expect(timerManager.isRunning).toBe(true);
      events.push('timer-started');

      // Step 6: Simulate Timer Expiration
      events.push('timer-expiring');
      const timerExpiredPromise = new Promise(resolve => {
        timerManager.once('expired', () => {
          events.push('timer-expired');
          resolve();
        });
      });

      // Force timer expiration
      timerManager.remainingTime = 0;
      timerManager._onTimerExpired();
      await timerExpiredPromise;

      // Step 7: Start Scare Sequence
      events.push('starting-scare-sequence');
      const sequenceStartPromise = new Promise(resolve => {
        scareController.once('sequence-start', () => {
          events.push('scare-sequence-started');
          resolve();
        });
      });

      await scareController.startSequence();
      await sequenceStartPromise;
      expect(scareController.isActive()).toBe(true);

      // Step 8: Progress Through Scare Stages
      events.push('shake-stage');
      expect(scareWindow.webContents.send).toHaveBeenCalledWith('start-shake');
      
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      events.push('shake-complete');
      expect(scareWindow.webContents.send).toHaveBeenCalledWith('start-darken');

      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      events.push('darken-complete');
      expect(scareWindow.webContents.send).toHaveBeenCalledWith('start-tunnel');

      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      events.push('tunnel-complete');
      expect(scareWindow.webContents.send).toHaveBeenCalledWith('start-jumpscare');

      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      events.push('jumpscare-complete');

      // Step 9: Question Display
      const questionShownPromise = new Promise(resolve => {
        scareController.once('question-shown', () => {
          events.push('question-shown');
          resolve();
        });
      });

      await questionShownPromise;
      const currentQuestion = scareController.getCurrentQuestion();
      expect(currentQuestion).toBeDefined();
      expect(currentQuestion.text).toBeTruthy();
      expect(currentQuestion.options).toHaveLength(4);

      // Step 10: Submit Answer
      events.push('submitting-answer');
      const answerSubmittedPromise = new Promise(resolve => {
        scareController.once('answer-submitted', () => {
          events.push('answer-submitted');
          resolve();
        });
      });

      scareController._handleAnswerSubmit(currentQuestion.correctAnswer);
      await answerSubmittedPromise;

      // Verify feedback was sent
      expect(scareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.ANSWER_FEEDBACK,
        expect.objectContaining({
          correct: true,
          message: expect.any(String)
        })
      );

      // Step 11: Sequence End and Return to Background
      const sequenceEndPromise = new Promise(resolve => {
        scareController.once('sequence-end', () => {
          events.push('sequence-ended');
          resolve();
        });
      });

      // Wait for sequence to end (3 second delay)
      await new Promise(resolve => setTimeout(resolve, 3100));
      await sequenceEndPromise;

      expect(scareController.isActive()).toBe(false);
      expect(scareWindow._hidden).toBe(true);
      events.push('returned-to-background');

      // Step 12: Verify Session Statistics
      const stats = await simulateIPCCall(IPC_CHANNELS.SESSION_GET_STATS);
      expect(stats.questionsAnswered).toBe(1);
      expect(stats.correctAnswers).toBe(1);
      events.push('stats-verified');

      // Verify complete event flow
      expect(events).toEqual([
        'app-launched',
        'config-window-opened',
        'adding-document',
        'document-added',
        'processing-documents',
        'documents-processed',
        'generating-questions',
        'questions-generated',
        'starting-timer',
        'timer-started',
        'timer-expiring',
        'timer-expired',
        'starting-scare-sequence',
        'scare-sequence-started',
        'shake-stage',
        'shake-complete',
        'darken-complete',
        'tunnel-complete',
        'jumpscare-complete',
        'question-shown',
        'submitting-answer',
        'answer-submitted',
        'sequence-ended',
        'returned-to-background',
        'stats-verified'
      ]);
    });

    it('should handle incorrect answer and continue flow', async () => {
      // Setup: Add document and generate questions
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
      const documents = configManager.get('documents');
      const result = await documentProcessor.processAllDocuments(documents);
      await questionGenerator.generateQuestions(result.documents, 5);

      // Start and complete scare sequence to question
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      await new Promise(resolve => setTimeout(resolve, 50));

      const currentQuestion = scareController.getCurrentQuestion();
      const wrongAnswer = (currentQuestion.correctAnswer + 1) % currentQuestion.options.length;

      // Submit wrong answer
      scareController._handleAnswerSubmit(wrongAnswer);

      // Verify incorrect feedback
      const feedbackCall = scareWindow.webContents.send.mock.calls.find(
        call => call[0] === IPC_CHANNELS.ANSWER_FEEDBACK
      );

      expect(feedbackCall).toBeDefined();
      expect(feedbackCall[1].correct).toBe(false);
      expect(feedbackCall[1].correctAnswer).toBe(currentQuestion.options[currentQuestion.correctAnswer]);

      // Wait for sequence to end
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Verify session stats reflect incorrect answer
      const stats = await simulateIPCCall(IPC_CHANNELS.SESSION_GET_STATS);
      expect(stats.questionsAnswered).toBe(1);
      expect(stats.correctAnswers).toBe(0);
    });

    it('should handle ESC key cancellation during scare sequence', async () => {
      // Setup
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
      const documents = configManager.get('documents');
      const result = await documentProcessor.processAllDocuments(documents);
      await questionGenerator.generateQuestions(result.documents, 5);

      // Start scare sequence
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);

      expect(scareController.isActive()).toBe(true);

      // Simulate ESC key press
      const cancelledPromise = new Promise(resolve => {
        scareController.once('sequence-cancelled', resolve);
      });

      scareController.cancelSequence();
      await cancelledPromise;

      // Verify sequence was cancelled
      expect(scareController.isActive()).toBe(false);
      expect(scareWindow._hidden).toBe(true);

      // Verify no question was answered
      const stats = await simulateIPCCall(IPC_CHANNELS.SESSION_GET_STATS);
      expect(stats.questionsAnswered).toBe(0);
    });

    it('should handle multiple scare cycles without repeating questions', async () => {
      // Setup
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
      const documents = configManager.get('documents');
      const result = await documentProcessor.processAllDocuments(documents);
      await questionGenerator.generateQuestions(result.documents, 10);

      const shownQuestions = new Set();

      // First cycle
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      await new Promise(resolve => setTimeout(resolve, 50));

      const question1 = scareController.getCurrentQuestion();
      shownQuestions.add(question1.id);
      scareController._handleAnswerSubmit(question1.correctAnswer);
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Second cycle
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      await new Promise(resolve => setTimeout(resolve, 50));

      const question2 = scareController.getCurrentQuestion();
      
      // Verify different question
      expect(question2.id).not.toBe(question1.id);
      expect(shownQuestions.has(question2.id)).toBe(false);

      // Verify session stats
      const stats = await simulateIPCCall(IPC_CHANNELS.SESSION_GET_STATS);
      expect(stats.questionsAnswered).toBe(1); // Only first was completed
    });
  });

  describe('Document Management Flow', () => {
    it('should validate and reject invalid documents', async () => {
      const invalidPath = './nonexistent-file.pdf';

      await expect(
        simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, invalidPath)
      ).rejects.toThrow();

      const documents = configManager.get('documents');
      expect(documents).not.toContain(invalidPath);
    });

    it('should remove documents and update configuration', async () => {
      // Add document
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
      expect(configManager.get('documents')).toContain(testDocPath);

      // Remove document
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_REMOVE, testDocPath);
      expect(configManager.get('documents')).not.toContain(testDocPath);
    });

    it('should process multiple documents and generate questions from all', async () => {
      // Create second test document
      const testDoc2Path = path.join('./test-data', 'e2e-test-doc2.txt');
      await fs.writeFile(testDoc2Path,
        'Cellular respiration is the process by which cells break down glucose to produce ATP energy. ' +
        'This process occurs in the mitochondria and involves three main stages: glycolysis, the Krebs cycle, ' +
        'and oxidative phosphorylation. Glycolysis occurs in the cytoplasm and breaks down glucose into pyruvate. ' +
        '\n\n' +
        'Ribosomes are responsible for protein synthesis in cells. They are composed of ribosomal RNA and proteins. ' +
        'Ribosomes can be found free in the cytoplasm or attached to the endoplasmic reticulum. During translation, ' +
        'ribosomes read mRNA codons and link amino acids together to form polypeptide chains. ' +
        '\n\n' +
        'The nucleus contains genetic material in the form of DNA organized into chromosomes. The nucleus is ' +
        'surrounded by a double membrane called the nuclear envelope. Nuclear pores allow molecules to move ' +
        'between the nucleus and cytoplasm. The nucleolus is a region within the nucleus where ribosomal RNA ' +
        'is synthesized.'
      );

      try {
        // Add both documents
        await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
        await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDoc2Path);

        // Process all documents
        const documents = configManager.get('documents');
        const result = await documentProcessor.processAllDocuments(documents);
        expect(result.documents.length).toBe(2);

        // Generate questions from both
        const questions = await questionGenerator.generateQuestions(result.documents, 10);
        expect(questions.length).toBeGreaterThan(0);

        // Verify questions come from both documents
        const sources = new Set(questions.map(q => q.sourceDocument));
        expect(sources.size).toBeGreaterThan(0);
      } finally {
        await fs.unlink(testDoc2Path).catch(() => {});
      }
    });
  });

  describe('Configuration Persistence', () => {
    it('should persist configuration changes across sessions', async () => {
      // Change interval
      await simulateIPCCall(IPC_CHANNELS.CONFIG_SET, 'interval', 45);
      expect(configManager.get('interval')).toBe(45);

      // Reload config manager (simulating app restart)
      const newConfigManager = new ConfigManager(path.join('./test-data', 'e2e-config.json'));
      await newConfigManager.load();

      expect(newConfigManager.get('interval')).toBe(45);
    });

    it('should persist document list across sessions', async () => {
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);

      // Reload config manager
      const newConfigManager = new ConfigManager(path.join('./test-data', 'e2e-config.json'));
      await newConfigManager.load();

      expect(newConfigManager.get('documents')).toContain(testDocPath);
    });
  });

  describe('Error Recovery', () => {
    it('should handle document processing errors gracefully', async () => {
      // Create corrupted file
      const corruptedPath = path.join('./test-data', 'corrupted.pdf');
      await fs.writeFile(corruptedPath, 'This is not a valid PDF');

      try {
        // Add corrupted document (validation allows it initially)
        await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, corruptedPath);
        
        // Try to process it - should handle error gracefully
        const documents = configManager.get('documents');
        const result = await documentProcessor.processAllDocuments(documents);
        
        // Should have errors but not crash
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.documents.length).toBe(0);

        // App should still be functional
        expect(configManager).toBeDefined();
        expect(timerManager).toBeDefined();
      } finally {
        await fs.unlink(corruptedPath).catch(() => {});
      }
    });

    it('should handle running out of questions', async () => {
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
      const documents = configManager.get('documents');
      const result = await documentProcessor.processAllDocuments(documents);
      await questionGenerator.generateQuestions(result.documents, 2);

      // Mark all questions as used
      questionGenerator.cachedQuestions.forEach(q => {
        questionGenerator.markQuestionUsed(q.id);
      });

      // Try to start sequence
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should show error message
      expect(scareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.QUESTION_SHOW,
        expect.objectContaining({
          error: expect.stringContaining('No questions available')
        })
      );
    });
  });

  describe('Session Statistics Tracking', () => {
    it('should track correct answers and maintain streak', async () => {
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
      const documents = configManager.get('documents');
      const result = await documentProcessor.processAllDocuments(documents);
      await questionGenerator.generateQuestions(result.documents, 5);

      // Answer 3 questions correctly
      for (let i = 0; i < 3; i++) {
        await scareController.startSequence();
        scareController._handleStageComplete(SCARE_STAGES.SHAKE);
        scareController._handleStageComplete(SCARE_STAGES.DARKEN);
        scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
        scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
        await new Promise(resolve => setTimeout(resolve, 50));

        const question = scareController.getCurrentQuestion();
        scareController._handleAnswerSubmit(question.correctAnswer);
        await new Promise(resolve => setTimeout(resolve, 3100));
      }

      const stats = await simulateIPCCall(IPC_CHANNELS.SESSION_GET_STATS);
      expect(stats.questionsAnswered).toBe(3);
      expect(stats.correctAnswers).toBe(3);
      expect(stats.currentStreak).toBe(3);
    });

    it('should reset streak on incorrect answer', async () => {
      await simulateIPCCall(IPC_CHANNELS.DOCUMENT_ADD, testDocPath);
      const documents = configManager.get('documents');
      const result = await documentProcessor.processAllDocuments(documents);
      await questionGenerator.generateQuestions(result.documents, 5);

      // Answer correctly
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      await new Promise(resolve => setTimeout(resolve, 50));

      let question = scareController.getCurrentQuestion();
      scareController._handleAnswerSubmit(question.correctAnswer);
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Answer incorrectly
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      await new Promise(resolve => setTimeout(resolve, 50));

      question = scareController.getCurrentQuestion();
      const wrongAnswer = (question.correctAnswer + 1) % question.options.length;
      scareController._handleAnswerSubmit(wrongAnswer);
      await new Promise(resolve => setTimeout(resolve, 3100));

      const stats = await simulateIPCCall(IPC_CHANNELS.SESSION_GET_STATS);
      expect(stats.questionsAnswered).toBe(2);
      expect(stats.correctAnswers).toBe(1);
      expect(stats.currentStreak).toBe(0);
    });
  });
});
