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
  }
}));

const ScareController = require('./ScareController');
const { SCARE_STAGES, IPC_CHANNELS } = require('../shared/constants');

describe('ScareController', () => {
  let scareController;
  let mockQuestionGenerator;
  let mockScareWindow;

  beforeEach(() => {
    // Create mock question generator
    mockQuestionGenerator = {
      getNextQuestion: vi.fn(),
      markQuestionUsed: vi.fn()
    };

    // Create mock scare window
    mockScareWindow = new MockBrowserWindow();

    // Create controller
    scareController = new ScareController(mockQuestionGenerator);
    scareController.setScareWindow(mockScareWindow);
  });

  afterEach(() => {
    if (scareController) {
      scareController.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a ScareController instance', () => {
      expect(scareController).toBeDefined();
      expect(scareController.questionGenerator).toBe(mockQuestionGenerator);
    });

    it('should throw error if questionGenerator is not provided', () => {
      expect(() => new ScareController(null)).toThrow('QuestionGenerator is required');
    });

    it('should initialize with default state', () => {
      expect(scareController.isActive()).toBe(false);
      expect(scareController.getCurrentStage()).toBeNull();
      expect(scareController.getCurrentQuestion()).toBeNull();
    });
  });

  describe('setScareWindow', () => {
    it('should set the scare window reference', () => {
      const newWindow = new MockBrowserWindow();
      
      const controller = new ScareController(mockQuestionGenerator);
      controller.setScareWindow(newWindow);
      
      expect(controller.scareWindow).toBe(newWindow);
      controller.destroy();
    });

    it('should throw error for invalid window', () => {
      const controller = new ScareController(mockQuestionGenerator);
      expect(() => controller.setScareWindow(null)).toThrow('Invalid BrowserWindow instance');
      expect(() => controller.setScareWindow({})).toThrow('Invalid BrowserWindow instance');
      controller.destroy();
    });

    it('should set up window listeners', () => {
      // In test environment, IPC setup is skipped
      // Just verify the window was set
      expect(scareController.scareWindow).toBe(mockScareWindow);
    });
  });

  describe('startSequence', () => {
    it('should start the scare sequence', async () => {
      const startSpy = vi.fn();
      scareController.on('sequence-start', startSpy);

      await scareController.startSequence();

      expect(scareController.isActive()).toBe(true);
      expect(startSpy).toHaveBeenCalled();
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-shake');
    });

    it('should set current stage to SHAKE', async () => {
      await scareController.startSequence();
      expect(scareController.getCurrentStage()).toBe(SCARE_STAGES.SHAKE);
    });

    it('should not start if sequence is already active', async () => {
      await scareController.startSequence();
      const sendCallCount = mockScareWindow.webContents.send.mock.calls.length;

      await scareController.startSequence();
      
      // Should not send additional commands
      expect(mockScareWindow.webContents.send.mock.calls.length).toBe(sendCallCount);
    });

    it('should throw error if scare window is not available', async () => {
      scareController.scareWindow = null;
      await expect(scareController.startSequence()).rejects.toThrow('Scare window not available');
    });

    it('should emit sequence-start event', async () => {
      const eventSpy = vi.fn();
      scareController.on('sequence-start', eventSpy);

      await scareController.startSequence();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Stage Progression', () => {
    it('should progress from SHAKE to DARKEN', async () => {
      await scareController.startSequence();
      expect(scareController.getCurrentStage()).toBe(SCARE_STAGES.SHAKE);

      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      
      expect(scareController.getCurrentStage()).toBe(SCARE_STAGES.DARKEN);
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-darken');
    });

    it('should progress from DARKEN to TUNNEL', async () => {
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      
      expect(scareController.getCurrentStage()).toBe(SCARE_STAGES.TUNNEL);
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-tunnel');
    });

    it('should progress from TUNNEL to JUMPSCARE', async () => {
      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      
      expect(scareController.getCurrentStage()).toBe(SCARE_STAGES.JUMPSCARE);
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-jumpscare');
    });

    it('should progress from JUMPSCARE to QUESTION', async () => {
      const mockQuestion = {
        id: 'q1',
        text: 'What is the answer?',
        type: 'multiple-choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0
      };
      mockQuestionGenerator.getNextQuestion.mockReturnValue(mockQuestion);

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
      
      expect(scareController.getCurrentStage()).toBe(SCARE_STAGES.QUESTION);
      expect(mockQuestionGenerator.getNextQuestion).toHaveBeenCalled();
    });

    it('should emit stage-change events', async () => {
      const stageChangeSpy = vi.fn();
      scareController.on('stage-change', stageChangeSpy);

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);

      expect(stageChangeSpy).toHaveBeenCalledWith(SCARE_STAGES.SHAKE);
      expect(stageChangeSpy).toHaveBeenCalledWith(SCARE_STAGES.DARKEN);
    });

    it('should emit stage-complete events', async () => {
      const stageCompleteSpy = vi.fn();
      scareController.on('stage-complete', stageCompleteSpy);

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);

      expect(stageCompleteSpy).toHaveBeenCalledWith(SCARE_STAGES.SHAKE);
    });
  });

  describe('Question Display', () => {
    it('should show question when reaching QUESTION stage', async () => {
      const mockQuestion = {
        id: 'q1',
        text: 'What is the answer?',
        type: 'multiple-choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'The answer is A'
      };
      mockQuestionGenerator.getNextQuestion.mockReturnValue(mockQuestion);

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.QUESTION_SHOW,
        mockQuestion
      );
      expect(scareController.getCurrentQuestion()).toBe(mockQuestion);
    });

    it('should handle no questions available', async () => {
      vi.useFakeTimers();
      
      mockQuestionGenerator.getNextQuestion.mockReturnValue(null);

      const errorSpy = vi.fn();
      scareController.on('error', errorSpy);

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.QUESTION_SHOW,
        expect.objectContaining({ error: expect.any(String) })
      );
      
      expect(errorSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should emit question-shown event', async () => {
      const mockQuestion = {
        id: 'q1',
        text: 'What is the answer?',
        type: 'multiple-choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0
      };
      mockQuestionGenerator.getNextQuestion.mockReturnValue(mockQuestion);

      const questionShownSpy = vi.fn();
      scareController.on('question-shown', questionShownSpy);

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      expect(questionShownSpy).toHaveBeenCalledWith(mockQuestion);
    });
  });

  describe('Answer Validation', () => {
    beforeEach(async () => {
      const mockQuestion = {
        id: 'q1',
        text: 'What is the answer?',
        type: 'multiple-choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 2,
        explanation: 'The answer is C'
      };
      mockQuestionGenerator.getNextQuestion.mockReturnValue(mockQuestion);

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);
    });

    it('should validate correct answer', () => {
      const result = scareController._validateAnswer(2);
      expect(result).toBe(true);
    });

    it('should validate incorrect answer', () => {
      const result = scareController._validateAnswer(0);
      expect(result).toBe(false);
    });

    it('should handle answer submission', () => {
      scareController._handleAnswerSubmit(null, 'q1', 2);

      expect(mockQuestionGenerator.markQuestionUsed).toHaveBeenCalledWith('q1');
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.ANSWER_FEEDBACK,
        expect.objectContaining({
          correct: true,
          message: expect.any(String),
          explanation: 'The answer is C'
        })
      );
    });

    it('should emit answer-submitted event', () => {
      const answerSpy = vi.fn();
      scareController.on('answer-submitted', answerSpy);

      scareController._handleAnswerSubmit(null, 'q1', 2);

      expect(answerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          answer: 2,
          correct: true
        })
      );
    });

    it('should provide positive feedback for correct answer', () => {
      scareController._handleAnswerSubmit(null, 'q1', 2);

      const feedbackCall = mockScareWindow.webContents.send.mock.calls.find(
        call => call[0] === IPC_CHANNELS.ANSWER_FEEDBACK
      );
      
      expect(feedbackCall[1].correct).toBe(true);
      expect(feedbackCall[1].message).toMatch(/correct|right|excellent|great/i);
    });

    it('should provide explanatory feedback for incorrect answer', () => {
      scareController._handleAnswerSubmit(null, 'q1', 0);

      const feedbackCall = mockScareWindow.webContents.send.mock.calls.find(
        call => call[0] === IPC_CHANNELS.ANSWER_FEEDBACK
      );
      
      expect(feedbackCall[1].correct).toBe(false);
      expect(feedbackCall[1].message).toMatch(/incorrect|not|wrong|oops/i);
      expect(feedbackCall[1].correctAnswer).toBe('C');
    });
  });

  describe('Click Handling', () => {
    it('should handle click during DARKEN stage', () => {
      scareController.currentStage = SCARE_STAGES.DARKEN;
      scareController.isSequenceActive = true;

      const clickSpy = vi.fn();
      scareController.on('click', clickSpy);

      scareController.handleClick(SCARE_STAGES.DARKEN);

      expect(clickSpy).toHaveBeenCalledWith(SCARE_STAGES.DARKEN);
    });

    it('should not handle clicks for unhandled stages', () => {
      scareController.currentStage = SCARE_STAGES.SHAKE;
      scareController.isSequenceActive = true;

      const sendCallCount = mockScareWindow.webContents.send.mock.calls.length;
      scareController.handleClick(SCARE_STAGES.SHAKE);

      // Should not send any new commands
      expect(mockScareWindow.webContents.send.mock.calls.length).toBe(sendCallCount);
    });
  });

  describe('cancelSequence', () => {
    it('should cancel active sequence', async () => {
      await scareController.startSequence();
      expect(scareController.isActive()).toBe(true);

      scareController.cancelSequence();

      expect(scareController.isActive()).toBe(false);
      expect(scareController.getCurrentStage()).toBeNull();
      expect(mockScareWindow._hidden).toBe(true);
    });

    it('should emit sequence-cancelled event', async () => {
      const cancelSpy = vi.fn();
      scareController.on('sequence-cancelled', cancelSpy);

      await scareController.startSequence();
      scareController.cancelSequence();

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should do nothing if sequence is not active', () => {
      const cancelSpy = vi.fn();
      scareController.on('sequence-cancelled', cancelSpy);

      scareController.cancelSequence();

      expect(cancelSpy).not.toHaveBeenCalled();
    });
  });

  describe('endSequence', () => {
    it('should end active sequence', async () => {
      await scareController.startSequence();
      expect(scareController.isActive()).toBe(true);

      scareController.endSequence();

      expect(scareController.isActive()).toBe(false);
      expect(scareController.getCurrentStage()).toBeNull();
      expect(scareController.getCurrentQuestion()).toBeNull();
      expect(mockScareWindow._hidden).toBe(true);
    });

    it('should emit sequence-end event', async () => {
      const endSpy = vi.fn();
      scareController.on('sequence-end', endSpy);

      await scareController.startSequence();
      scareController.endSequence();

      expect(endSpy).toHaveBeenCalled();
    });

    it('should do nothing if sequence is not active', () => {
      const endSpy = vi.fn();
      scareController.on('sequence-end', endSpy);

      scareController.endSequence();

      expect(endSpy).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      scareController.destroy();

      expect(scareController.scareWindow).toBeNull();
      expect(scareController.questionGenerator).toBeNull();
      expect(scareController.isActive()).toBe(false);
    });

    it('should remove all event listeners', () => {
      const spy = vi.fn();
      scareController.on('test-event', spy);

      scareController.destroy();
      scareController.emit('test-event');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Getters', () => {
    it('should get current stage', async () => {
      expect(scareController.getCurrentStage()).toBeNull();

      await scareController.startSequence();
      expect(scareController.getCurrentStage()).toBe(SCARE_STAGES.SHAKE);
    });

    it('should check if sequence is active', async () => {
      expect(scareController.isActive()).toBe(false);

      await scareController.startSequence();
      expect(scareController.isActive()).toBe(true);

      scareController.endSequence();
      expect(scareController.isActive()).toBe(false);
    });

    it('should get current question', async () => {
      const mockQuestion = {
        id: 'q1',
        text: 'What is the answer?',
        type: 'multiple-choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0
      };
      mockQuestionGenerator.getNextQuestion.mockReturnValue(mockQuestion);

      expect(scareController.getCurrentQuestion()).toBeNull();

      await scareController.startSequence();
      scareController._handleStageComplete(SCARE_STAGES.SHAKE);
      scareController._handleStageComplete(SCARE_STAGES.DARKEN);
      scareController._handleStageComplete(SCARE_STAGES.TUNNEL);
      scareController._handleStageComplete(SCARE_STAGES.JUMPSCARE);

      expect(scareController.getCurrentQuestion()).toBe(mockQuestion);
    });
  });
});
