// Mock Electron before importing
class MockBrowserWindow {
  constructor() {
    this.webContents = {
      send: vi.fn()
    };
    this._destroyed = false;
    this._hidden = false;
  }
  
  isDestroyed() {
    return this._destroyed;
  }
  
  hide() {
    this._hidden = true;
  }
  
  show() {
    this._hidden = false;
  }
}

vi.mock('electron', () => ({
  BrowserWindow: MockBrowserWindow,
  ipcMain: {
    on: vi.fn(),
    removeHandler: vi.fn()
  },
  app: {
    getPath: () => './test-data'
  }
}));

const ScareController = require('./ScareController');
const QuestionGenerator = require('./QuestionGenerator');
const { SCARE_STAGES, IPC_CHANNELS } = require('../shared/constants');

describe('ScareController Integration Tests', () => {
  let scareController;
  let questionGenerator;
  let mockScareWindow;

  beforeEach(() => {
    // Create real question generator with mock data
    questionGenerator = new QuestionGenerator({
      cachePath: './test-data/questions-integration.json'
    });

    // Mock some questions in the generator
    questionGenerator.cachedQuestions = [
      {
        id: 'q1',
        text: 'What is the primary function of mitochondria?',
        type: 'multiple-choice',
        options: ['Energy production', 'Protein synthesis', 'DNA replication', 'Cell division'],
        correctAnswer: 0,
        explanation: 'Mitochondria are the powerhouse of the cell.',
        sourceDocument: 'biology.pdf'
      },
      {
        id: 'q2',
        text: 'What is photosynthesis?',
        type: 'multiple-choice',
        options: ['Energy from light', 'Cell division', 'DNA replication', 'Protein folding'],
        correctAnswer: 0,
        explanation: 'Photosynthesis converts light energy into chemical energy.',
        sourceDocument: 'biology.pdf'
      }
    ];

    // Create mock scare window
    mockScareWindow = new MockBrowserWindow();

    // Create controller
    scareController = new ScareController(questionGenerator);
    scareController.setScareWindow(mockScareWindow);
  });

  afterEach(() => {
    if (scareController) {
      scareController.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Full Sequence Flow', () => {
    it('should complete full scare sequence from start to question', async () => {
      const events = [];
      
      // Track all events
      scareController.on('sequence-start', () => events.push('sequence-start'));
      scareController.on('stage-change', (stage) => events.push(`stage-change:${stage}`));
      scareController.on('stage-complete', (stage) => events.push(`stage-complete:${stage}`));
      scareController.on('question-shown', () => events.push('question-shown'));
      scareController.on('sequence-end', () => events.push('sequence-end'));

      // Start sequence
      await scareController.startSequence();
      expect(events).toContain('sequence-start');
      expect(events).toContain('stage-change:shake');

      // Progress through stages
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      expect(events).toContain('stage-complete:shake');
      expect(events).toContain('stage-change:darken');

      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      expect(events).toContain('stage-complete:darken');
      expect(events).toContain('stage-change:tunnel');

      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      expect(events).toContain('stage-complete:tunnel');
      expect(events).toContain('stage-change:jumpscare');

      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      expect(events).toContain('stage-complete:jumpscare');
      expect(events).toContain('stage-change:question');
      expect(events).toContain('question-shown');

      // Verify question was shown
      expect(scareController.getCurrentQuestion()).toBeDefined();
      expect(scareController.getCurrentQuestion().id).toMatch(/^q[12]$/);
    });

    it('should send correct IPC messages for each stage', async () => {
      await scareController.startSequence();
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-shake');

      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-darken');

      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-tunnel');

      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-jumpscare');

      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.QUESTION_SHOW,
        expect.objectContaining({
          id: expect.any(String),
          text: expect.any(String),
          type: 'multiple-choice',
          options: expect.any(Array)
        })
      );
    });

    it('should handle answer submission and provide feedback', async () => {
      // Start and progress to question
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      const question = scareController.getCurrentQuestion();
      expect(question).toBeDefined();

      // Submit correct answer
      scareController._handleAnswerSubmit(question.correctAnswer);

      // Verify feedback was sent
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.ANSWER_FEEDBACK,
        expect.objectContaining({
          correct: true,
          message: expect.any(String),
          explanation: expect.any(String)
        })
      );

      // Verify question was marked as used
      expect(questionGenerator.usedQuestionIds.has(question.id)).toBe(true);
    });

    it('should handle incorrect answer submission', async () => {
      // Start and progress to question
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      const question = scareController.getCurrentQuestion();
      const wrongAnswer = (question.correctAnswer + 1) % question.options.length;

      // Submit incorrect answer
      scareController._handleAnswerSubmit(wrongAnswer);

      // Verify feedback was sent
      const feedbackCall = mockScareWindow.webContents.send.mock.calls.find(
        call => call[0] === IPC_CHANNELS.ANSWER_FEEDBACK
      );

      expect(feedbackCall).toBeDefined();
      expect(feedbackCall[1].correct).toBe(false);
      expect(feedbackCall[1].correctAnswer).toBe(question.options[question.correctAnswer]);
    });

    it('should end sequence after answer is submitted', async () => {
      vi.useFakeTimers();

      const endSpy = vi.fn();
      scareController.on('sequence-end', endSpy);

      // Start and progress to question
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      const question = scareController.getCurrentQuestion();
      scareController._handleAnswerSubmit(question.correctAnswer);

      // Fast-forward time to trigger end sequence
      vi.advanceTimersByTime(3000);

      expect(endSpy).toHaveBeenCalled();
      expect(scareController.isActive()).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Question Management', () => {
    it('should not repeat questions in the same session', async () => {
      const shownQuestions = new Set();

      // Show first question
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      const question1 = scareController.getCurrentQuestion();
      shownQuestions.add(question1.id);
      scareController._handleAnswerSubmit(question1.correctAnswer);

      // Wait for sequence to end
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Show second question
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      const question2 = scareController.getCurrentQuestion();
      
      // Should be a different question
      expect(question2.id).not.toBe(question1.id);
      expect(shownQuestions.has(question2.id)).toBe(false);
    });

    it('should handle running out of questions', async () => {
      // Mark all questions as used
      questionGenerator.cachedQuestions.forEach(q => {
        questionGenerator.markQuestionUsed(q.id);
      });

      const errorSpy = vi.fn();
      scareController.on('error', errorSpy);

      // Start and progress to question
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      // Should show error message
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.QUESTION_SHOW,
        expect.objectContaining({
          error: expect.stringContaining('No questions available')
        })
      );

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Sequence Cancellation', () => {
    it('should cancel sequence at any stage', async () => {
      const cancelSpy = vi.fn();
      scareController.on('sequence-cancelled', cancelSpy);

      // Start sequence
      await scareController.startSequence();
      expect(scareController.isActive()).toBe(true);

      // Progress to tunnel stage
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);

      // Cancel during tunnel
      scareController.cancelSequence();

      expect(cancelSpy).toHaveBeenCalled();
      expect(scareController.isActive()).toBe(false);
      expect(mockScareWindow._hidden).toBe(true);
    });

    it('should reset state after cancellation', async () => {
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      
      scareController.cancelSequence();

      expect(scareController.getCurrentStage()).toBeNull();
      expect(scareController.getCurrentQuestion()).toBeNull();
      expect(scareController.isActive()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle window destruction during sequence', async () => {
      await scareController.startSequence();
      
      // Destroy window
      mockScareWindow._destroyed = true;

      // Should not throw when trying to progress
      expect(() => {
        scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      }).not.toThrow();
    });

    it('should emit error event when question generation fails', async () => {
      // Make question generator throw error
      questionGenerator.getNextQuestion = vi.fn(() => {
        throw new Error('Question generation failed');
      });

      const errorSpy = vi.fn();
      scareController.on('error', errorSpy);

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Multiple Sequences', () => {
    it('should handle multiple sequences in succession', async () => {
      // First sequence
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      
      const question1 = scareController.getCurrentQuestion();
      scareController._handleAnswerSubmit(question1.correctAnswer);
      
      // Wait for sequence to end
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Second sequence
      await scareController.startSequence();
      expect(scareController.isActive()).toBe(true);
      expect(scareController.getCurrentStage()).toBe(SCARE_STAGES.SHAKE);
      
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      
      const question2 = scareController.getCurrentQuestion();
      expect(question2).toBeDefined();
      expect(question2.id).not.toBe(question1.id);
    });
  });

  describe('Event Emission Order', () => {
    it('should emit events in correct order', async () => {
      const eventOrder = [];

      scareController.on('sequence-start', () => eventOrder.push('start'));
      scareController.on('stage-change', (stage) => eventOrder.push(`change:${stage}`));
      scareController.on('stage-complete', (stage) => eventOrder.push(`complete:${stage}`));
      scareController.on('question-shown', () => eventOrder.push('question'));
      scareController.on('answer-submitted', () => eventOrder.push('answer'));

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      
      const question = scareController.getCurrentQuestion();
      scareController._handleAnswerSubmit(question.correctAnswer);

      expect(eventOrder).toEqual([
        'start',
        'change:shake',
        'complete:shake',
        'change:darken',
        'complete:darken',
        'change:tunnel',
        'complete:tunnel',
        'change:jumpscare',
        'complete:jumpscare',
        'change:question',
        'question',
        'answer'
      ]);
    });
  });
});
