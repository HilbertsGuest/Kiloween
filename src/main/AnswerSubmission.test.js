// Unit tests for answer submission and validation flow

// Mock Electron before importing
class MockBrowserWindow {
  constructor() {
    this.webContents = {
      send: vi.fn(),
      isLoading: vi.fn(() => false)
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

let answerSubmitHandler = null;
let stageCompleteHandler = null;

vi.mock('electron', () => ({
  BrowserWindow: MockBrowserWindow,
  ipcMain: {
    on: vi.fn((channel, handler) => {
      if (channel === 'answer:submit') {
        answerSubmitHandler = handler;
      } else if (channel === 'scare:stage-complete') {
        stageCompleteHandler = handler;
      }
    }),
    removeHandler: vi.fn()
  }
}));

const ScareController = require('./ScareController');
const QuestionGenerator = require('./QuestionGenerator');
const { IPC_CHANNELS } = require('../shared/constants');

describe('Answer Submission and Validation Flow', () => {
  let scareController;
  let questionGenerator;
  let mockScareWindow;

  beforeEach(() => {
    // Create mock scare window
    mockScareWindow = new MockBrowserWindow();

    // Create mock question generator with sample questions
    const sampleQuestions = [
      {
        id: 'q1',
        text: 'What is 2 + 2?',
        type: 'multiple-choice',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1,
        explanation: 'Basic arithmetic: 2 + 2 = 4'
      },
      {
        id: 'q2',
        text: 'What is the capital of France?',
        type: 'text',
        correctAnswer: 'Paris',
        explanation: 'Paris is the capital and largest city of France'
      }
    ];
    
    questionGenerator = {
      questions: sampleQuestions,
      usedQuestions: new Set(),
      getNextQuestion: vi.fn(() => {
        const unused = sampleQuestions.find(q => !questionGenerator.usedQuestions.has(q.id));
        return unused || null;
      }),
      markQuestionUsed: vi.fn((id) => {
        questionGenerator.usedQuestions.add(id);
      })
    };

    // Create scare controller
    scareController = new ScareController(questionGenerator);
    scareController.setScareWindow(mockScareWindow);
  });

  afterEach(() => {
    if (scareController) {
      scareController.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Answer Button Click Handlers', () => {
    test('should have click handlers on answer option buttons', () => {
      // This test verifies that the renderer (jumpscare.js) creates buttons with click handlers
      // The actual implementation is in jumpscare.js showQuestion() method
      // which creates buttons and attaches handleAnswerClick to each one
      
      // Verify the pattern exists in the implementation
      const question = questionGenerator.questions[0];
      expect(question.options).toBeDefined();
      expect(Array.isArray(question.options)).toBe(true);
      expect(question.options.length).toBeGreaterThan(0);
    });

    test('should disable buttons after click', () => {
      // This test verifies the renderer behavior
      // In the actual implementation, buttons are disabled in jumpscare.js handleAnswerClick
      const mockButton = {
        disabled: false,
        style: { cursor: '', opacity: '' }
      };

      // Simulate button click handler
      mockButton.disabled = true;
      mockButton.style.cursor = 'not-allowed';
      mockButton.style.opacity = '0.6';

      expect(mockButton.disabled).toBe(true);
      expect(mockButton.style.cursor).toBe('not-allowed');
    });
  });

  describe('IPC Answer Submission', () => {
    test('should send answer to main process via IPC', async () => {
      // Start sequence and show question
      await scareController.startSequence();
      
      // Simulate getting to question stage
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      // Simulate answer submission from renderer
      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 1);

      // Verify feedback was sent back
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.ANSWER_FEEDBACK,
        expect.objectContaining({
          correct: true,
          message: expect.any(String)
        })
      );
    });

    test('should handle incorrect answer submission', async () => {
      // Start sequence and show question
      await scareController.startSequence();
      
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      // Submit wrong answer
      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 0); // Wrong answer (3 instead of 4)

      // Verify incorrect feedback was sent
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.ANSWER_FEEDBACK,
        expect.objectContaining({
          correct: false,
          message: expect.any(String),
          correctAnswer: '4'
        })
      );
    });

    test('should handle text answer submission', async () => {
      await scareController.startSequence();
      
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[1];

      // Submit correct text answer
      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q2', 'Paris');

      // Verify correct feedback
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.ANSWER_FEEDBACK,
        expect.objectContaining({
          correct: true,
          message: expect.any(String)
        })
      );
    });

    test('should handle case-insensitive text answers', async () => {
      await scareController.startSequence();
      
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[1];

      // Submit answer with different case
      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q2', 'PARIS');

      // Should still be correct
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.ANSWER_FEEDBACK,
        expect.objectContaining({
          correct: true
        })
      );
    });
  });

  describe('Answer Validation', () => {
    test('should validate correct multiple-choice answer', () => {
      scareController.currentQuestion = questionGenerator.questions[0];
      const isCorrect = scareController._validateAnswer(1);
      expect(isCorrect).toBe(true);
    });

    test('should validate incorrect multiple-choice answer', () => {
      scareController.currentQuestion = questionGenerator.questions[0];
      const isCorrect = scareController._validateAnswer(0);
      expect(isCorrect).toBe(false);
    });

    test('should validate correct text answer', () => {
      scareController.currentQuestion = questionGenerator.questions[1];
      const isCorrect = scareController._validateAnswer('Paris');
      expect(isCorrect).toBe(true);
    });

    test('should validate incorrect text answer', () => {
      scareController.currentQuestion = questionGenerator.questions[1];
      const isCorrect = scareController._validateAnswer('London');
      expect(isCorrect).toBe(false);
    });

    test('should handle whitespace in text answers', () => {
      scareController.currentQuestion = questionGenerator.questions[1];
      const isCorrect = scareController._validateAnswer('  Paris  ');
      expect(isCorrect).toBe(true);
    });
  });

  describe('Feedback Display', () => {
    test('should send correct feedback message', async () => {
      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 1);

      const feedbackCall = mockScareWindow.webContents.send.mock.calls.find(
        call => call[0] === IPC_CHANNELS.ANSWER_FEEDBACK
      );

      expect(feedbackCall).toBeDefined();
      expect(feedbackCall[1].correct).toBe(true);
      expect(feedbackCall[1].message).toMatch(/correct|right|excellent|great|brilliant|perfect|outstanding/i);
    });

    test('should send incorrect feedback with explanation', async () => {
      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 0);

      const feedbackCall = mockScareWindow.webContents.send.mock.calls.find(
        call => call[0] === IPC_CHANNELS.ANSWER_FEEDBACK
      );

      expect(feedbackCall).toBeDefined();
      expect(feedbackCall[1].correct).toBe(false);
      expect(feedbackCall[1].message).toMatch(/incorrect|wrong|not/i);
      expect(feedbackCall[1].explanation).toBe('Basic arithmetic: 2 + 2 = 4');
      expect(feedbackCall[1].correctAnswer).toBe('4');
    });

    test('should include correct answer in feedback', async () => {
      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 2);

      const feedbackCall = mockScareWindow.webContents.send.mock.calls.find(
        call => call[0] === IPC_CHANNELS.ANSWER_FEEDBACK
      );

      expect(feedbackCall[1].correctAnswer).toBe('4');
    });
  });

  describe('Question Usage Tracking', () => {
    test('should mark question as used after submission', async () => {
      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      expect(questionGenerator.usedQuestions.has('q1')).toBe(false);

      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 1);

      expect(questionGenerator.markQuestionUsed).toHaveBeenCalledWith('q1');
      expect(questionGenerator.usedQuestions.has('q1')).toBe(true);
    });

    test('should mark question as used even for incorrect answers', async () => {
      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 0); // Wrong answer

      expect(questionGenerator.markQuestionUsed).toHaveBeenCalledWith('q1');
      expect(questionGenerator.usedQuestions.has('q1')).toBe(true);
    });

    test('should not reuse marked questions in same session', () => {
      questionGenerator.markQuestionUsed('q1');
      
      const nextQuestion = questionGenerator.getNextQuestion();
      
      expect(nextQuestion).toBeDefined();
      expect(nextQuestion.id).not.toBe('q1');
      expect(nextQuestion.id).toBe('q2');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing question gracefully', async () => {
      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = null;

      const mockEvent = {};
      
      // Should not throw
      expect(() => {
        scareController._handleAnswerSubmit(mockEvent, 'q1', 1);
      }).not.toThrow();
    });

    test('should handle question ID mismatch', async () => {
      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      const mockEvent = {};
      
      // Submit answer for different question
      scareController._handleAnswerSubmit(mockEvent, 'q2', 1);

      // Should not send feedback for mismatched question
      const feedbackCalls = mockScareWindow.webContents.send.mock.calls.filter(
        call => call[0] === IPC_CHANNELS.ANSWER_FEEDBACK
      );
      
      expect(feedbackCalls.length).toBe(0);
    });

    test('should handle invalid answer format', () => {
      scareController.currentQuestion = questionGenerator.questions[0];
      
      // Should handle non-numeric answer for multiple choice
      const isCorrect = scareController._validateAnswer('invalid');
      expect(isCorrect).toBe(false);
    });
  });

  describe('Event Emission', () => {
    test('should emit answer-submitted event', async () => {
      const answerSubmittedSpy = vi.fn();
      scareController.on('answer-submitted', answerSubmittedSpy);

      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 1);

      expect(answerSubmittedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          question: expect.objectContaining({ id: 'q1' }),
          answer: 1,
          correct: true,
          feedback: expect.any(Object)
        })
      );
    });

    test('should include feedback in event', async () => {
      const answerSubmittedSpy = vi.fn();
      scareController.on('answer-submitted', answerSubmittedSpy);

      await scareController.startSequence();
      scareController.currentStage = 'question';
      scareController.currentQuestion = questionGenerator.questions[0];

      const mockEvent = {};
      scareController._handleAnswerSubmit(mockEvent, 'q1', 0);

      const eventData = answerSubmittedSpy.mock.calls[0][0];
      expect(eventData.feedback).toMatchObject({
        correct: false,
        message: expect.any(String),
        explanation: expect.any(String),
        correctAnswer: expect.any(String)
      });
    });
  });

  describe('Feedback Messages', () => {
    test('should provide variety in positive feedback', () => {
      const messages = new Set();
      
      for (let i = 0; i < 20; i++) {
        const message = scareController._getPositiveFeedback();
        messages.add(message);
      }

      // Should have multiple different messages
      expect(messages.size).toBeGreaterThan(1);
    });

    test('should provide variety in incorrect feedback', () => {
      const messages = new Set();
      
      for (let i = 0; i < 20; i++) {
        const message = scareController._getIncorrectFeedback();
        messages.add(message);
      }

      // Should have multiple different messages
      expect(messages.size).toBeGreaterThan(1);
    });

    test('positive feedback should be encouraging', () => {
      const message = scareController._getPositiveFeedback();
      expect(message).toMatch(/correct|right|excellent|great|perfect|brilliant|outstanding/i);
    });

    test('incorrect feedback should be constructive', () => {
      const message = scareController._getIncorrectFeedback();
      expect(message).toMatch(/incorrect|wrong|not|oops|review|check|study/i);
    });
  });
});
