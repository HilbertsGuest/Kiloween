// Test for Question Display Integration (Task 29)
const ScareController = require('./ScareController');
const QuestionGenerator = require('./QuestionGenerator');
const { IPC_CHANNELS } = require('../shared/constants');

describe('Question Display Integration', () => {
  let scareController;
  let questionGenerator;
  let mockWindow;
  let mockWebContents;
  let sentMessages;

  beforeEach(() => {
    // Track sent IPC messages
    sentMessages = [];

    // Mock webContents
    mockWebContents = {
      send: vi.fn((channel, data) => {
        sentMessages.push({ channel, data });
      })
    };

    // Mock BrowserWindow
    mockWindow = {
      webContents: mockWebContents,
      isDestroyed: vi.fn(() => false),
      hide: vi.fn(),
      show: vi.fn()
    };

    // Create question generator with test data
    questionGenerator = new QuestionGenerator({
      cachePath: './test-questions-display.json'
    });

    // Generate some test questions with more content for better keyword extraction
    const testDocuments = [
      {
        filePath: '/test/biology.txt',
        content: `
          Mitochondria are the powerhouse of the cell. They produce energy through cellular respiration. 
          The mitochondria contain their own DNA and ribosomes. Mitochondria are essential for cellular function.
          Cellular respiration occurs in the mitochondria and produces ATP energy molecules.
          The process of cellular respiration involves glycolysis, the Krebs cycle, and electron transport.
          Mitochondria have a double membrane structure with cristae that increase surface area.
          The matrix of mitochondria contains enzymes for the Krebs cycle reactions.
          Mitochondrial DNA is inherited maternally and codes for essential proteins.
          Ribosomes in mitochondria are similar to bacterial ribosomes in structure.
          Energy production in cells depends heavily on mitochondrial function and efficiency.
        `,
        metadata: { title: 'Biology Notes', wordCount: 150 }
      }
    ];

    const questions = questionGenerator.generateQuestions(testDocuments, 10);
    
    // Ensure we have questions
    if (questions.length === 0) {
      // Fallback: create manual test questions
      questions.push({
        id: 'test-q1',
        text: 'What are mitochondria known as?',
        type: 'multiple-choice',
        options: ['Powerhouse of the cell', 'Control center', 'Storage unit', 'Transport system'],
        correctAnswer: 0,
        explanation: 'Mitochondria are known as the powerhouse of the cell.',
        sourceDocument: '/test/biology.txt'
      });
      questions.push({
        id: 'test-q2',
        text: 'What process occurs in mitochondria?',
        type: 'multiple-choice',
        options: ['Photosynthesis', 'Cellular respiration', 'Protein synthesis', 'DNA replication'],
        correctAnswer: 1,
        explanation: 'Cellular respiration occurs in mitochondria.',
        sourceDocument: '/test/biology.txt'
      });
    }
    
    questionGenerator.cachedQuestions = questions;

    // Create scare controller
    scareController = new ScareController(questionGenerator);
    scareController.setScareWindow(mockWindow);
  });

  afterEach(() => {
    if (scareController) {
      scareController.destroy();
    }
    sentMessages = [];
  });

  describe('Question Request and Display', () => {
    it('should request and send question to renderer after jump scare', async () => {
      // Start sequence
      await scareController.startSequence();

      // Simulate progression through stages
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      // Check that question was sent
      const questionMessages = sentMessages.filter(
        msg => msg.channel === IPC_CHANNELS.QUESTION_SHOW
      );

      expect(questionMessages.length).toBe(1);
      expect(questionMessages[0].data).toBeDefined();
      expect(questionMessages[0].data.id).toBeDefined();
      expect(questionMessages[0].data.text).toBeDefined();
      expect(questionMessages[0].data.options).toBeDefined();
      expect(questionMessages[0].data.type).toBe('multiple-choice');
    });

    it('should send question with all required fields', async () => {
      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      const questionMessage = sentMessages.find(
        msg => msg.channel === IPC_CHANNELS.QUESTION_SHOW
      );

      expect(questionMessage).toBeDefined();
      const question = questionMessage.data;

      // Verify all required fields
      expect(question).toHaveProperty('id');
      expect(question).toHaveProperty('text');
      expect(question).toHaveProperty('type');
      expect(question).toHaveProperty('options');
      expect(question).toHaveProperty('correctAnswer');
      expect(question).toHaveProperty('explanation');
      expect(question).toHaveProperty('sourceDocument');

      // Verify field types
      expect(typeof question.id).toBe('string');
      expect(typeof question.text).toBe('string');
      expect(question.type).toBe('multiple-choice');
      expect(Array.isArray(question.options)).toBe(true);
      expect(typeof question.correctAnswer).toBe('number');
    });

    it('should track current question in controller', async () => {
      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      const currentQuestion = scareController.getCurrentQuestion();
      expect(currentQuestion).toBeDefined();
      expect(currentQuestion.id).toBeDefined();
    });
  });

  describe('No Questions Available', () => {
    it('should handle case when no questions are available', async () => {
      // Clear all questions
      questionGenerator.cachedQuestions = [];

      // Add error handler to prevent unhandled rejection
      const errorHandler = vi.fn();
      scareController.on('error', errorHandler);

      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that error message was sent
      const questionMessages = sentMessages.filter(
        msg => msg.channel === IPC_CHANNELS.QUESTION_SHOW
      );

      expect(questionMessages.length).toBe(1);
      expect(questionMessages[0].data.error).toBeDefined();
      expect(questionMessages[0].data.error).toContain('No questions available');
    });

    it('should emit error event when no questions available', async () => {
      questionGenerator.cachedQuestions = [];

      const errorSpy = vi.fn();
      scareController.on('error', errorSpy);

      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0].message).toContain('No questions available');
    });

    it('should end sequence after showing no questions error', async () => {
      questionGenerator.cachedQuestions = [];

      // Add error handler to prevent unhandled rejection
      const errorHandler = vi.fn();
      scareController.on('error', errorHandler);

      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      // Wait for timeout (3000ms in the code)
      await new Promise(resolve => setTimeout(resolve, 3100));

      expect(scareController.isActive()).toBe(false);
    });
  });

  describe('Answer Submission and Validation', () => {
    it('should validate correct answer and send feedback', async () => {
      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      const currentQuestion = scareController.getCurrentQuestion();
      const correctAnswer = currentQuestion.correctAnswer;

      // Clear previous messages
      sentMessages = [];

      // Submit correct answer
      scareController._handleAnswerSubmit(
        null,
        currentQuestion.id,
        correctAnswer
      );

      // Check feedback was sent
      const feedbackMessages = sentMessages.filter(
        msg => msg.channel === IPC_CHANNELS.ANSWER_FEEDBACK
      );

      expect(feedbackMessages.length).toBe(1);
      expect(feedbackMessages[0].data.correct).toBe(true);
      expect(feedbackMessages[0].data.message).toBeDefined();
      expect(feedbackMessages[0].data.correctAnswer).toBeDefined();
    });

    it('should validate incorrect answer and send feedback', async () => {
      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      const currentQuestion = scareController.getCurrentQuestion();
      const incorrectAnswer = (currentQuestion.correctAnswer + 1) % currentQuestion.options.length;

      // Clear previous messages
      sentMessages = [];

      // Submit incorrect answer
      scareController._handleAnswerSubmit(
        null,
        currentQuestion.id,
        incorrectAnswer
      );

      // Check feedback was sent
      const feedbackMessages = sentMessages.filter(
        msg => msg.channel === IPC_CHANNELS.ANSWER_FEEDBACK
      );

      expect(feedbackMessages.length).toBe(1);
      expect(feedbackMessages[0].data.correct).toBe(false);
      expect(feedbackMessages[0].data.message).toBeDefined();
      expect(feedbackMessages[0].data.correctAnswer).toBeDefined();
      expect(feedbackMessages[0].data.explanation).toBeDefined();
    });

    it('should mark question as used after answer submission', async () => {
      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      const currentQuestion = scareController.getCurrentQuestion();
      const questionId = currentQuestion.id;

      // Submit answer
      scareController._handleAnswerSubmit(
        null,
        questionId,
        currentQuestion.correctAnswer
      );

      // Check question is marked as used
      expect(questionGenerator.usedQuestionIds.has(questionId)).toBe(true);
    });

    it('should emit answer-submitted event with details', async () => {
      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      const currentQuestion = scareController.getCurrentQuestion();
      const answerSpy = vi.fn();
      scareController.on('answer-submitted', answerSpy);

      // Submit answer
      scareController._handleAnswerSubmit(
        null,
        currentQuestion.id,
        currentQuestion.correctAnswer
      );

      expect(answerSpy).toHaveBeenCalled();
      const eventData = answerSpy.mock.calls[0][0];
      expect(eventData.question).toBeDefined();
      expect(eventData.answer).toBeDefined();
      expect(eventData.correct).toBeDefined();
      expect(eventData.feedback).toBeDefined();
    });
  });

  describe('Question Uniqueness', () => {
    it('should not repeat questions in same session', async () => {
      const shownQuestions = new Set();

      // Show multiple questions
      for (let i = 0; i < 3; i++) {
        sentMessages = [];
        
        await scareController.startSequence();
        scareController._handleStageComplete('shake');
        scareController._handleStageComplete('darken');
        scareController._handleStageComplete('tunnel');
        scareController._handleStageComplete('jumpscare');

        const questionMessage = sentMessages.find(
          msg => msg.channel === IPC_CHANNELS.QUESTION_SHOW
        );

        if (questionMessage && questionMessage.data.id) {
          shownQuestions.add(questionMessage.data.id);
          
          // Mark as used and end sequence
          scareController._handleAnswerSubmit(
            null,
            questionMessage.data.id,
            0
          );
        }

        scareController.endSequence();
      }

      // All questions should be unique
      expect(shownQuestions.size).toBe(3);
    });
  });

  describe('Fallback Behavior', () => {
    it('should handle question generation errors gracefully', async () => {
      // Mock getNextQuestion to throw error
      questionGenerator.getNextQuestion = vi.fn(() => {
        throw new Error('Question generation failed');
      });

      const errorSpy = vi.fn();
      scareController.on('error', errorSpy);

      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      // Should emit error and end sequence
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle missing question ID in answer submission', async () => {
      await scareController.startSequence();

      // Progress to question stage
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      // Clear previous messages
      sentMessages = [];

      // Submit answer with wrong question ID
      scareController._handleAnswerSubmit(
        null,
        'wrong-id',
        0
      );

      // Should not send feedback for wrong question ID
      const feedbackMessages = sentMessages.filter(
        msg => msg.channel === IPC_CHANNELS.ANSWER_FEEDBACK
      );

      expect(feedbackMessages.length).toBe(0);
    });
  });
});
