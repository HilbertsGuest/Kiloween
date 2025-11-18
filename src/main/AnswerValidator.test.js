const AnswerValidator = require('./AnswerValidator');

describe('AnswerValidator', () => {
  let validator;
  let sampleQuestion;

  beforeEach(() => {
    validator = new AnswerValidator();
    
    // Create a sample multiple-choice question
    sampleQuestion = {
      id: 'test-q-1',
      text: 'What is the capital of France?',
      type: 'multiple-choice',
      options: ['London', 'Paris', 'Berlin', 'Madrid'],
      correctAnswer: 1, // Paris
      explanation: 'Paris is the capital and largest city of France.',
      sourceDocument: '/path/to/geography.pdf'
    };
  });

  describe('Constructor', () => {
    it('should initialize with positive messages', () => {
      expect(validator.positiveMessages).toBeDefined();
      expect(Array.isArray(validator.positiveMessages)).toBe(true);
      expect(validator.positiveMessages.length).toBeGreaterThan(0);
    });

    it('should initialize with encouraging messages', () => {
      expect(validator.encouragingMessages).toBeDefined();
      expect(Array.isArray(validator.encouragingMessages)).toBe(true);
      expect(validator.encouragingMessages.length).toBeGreaterThan(0);
    });
  });

  describe('validateMultipleChoice', () => {
    it('should validate correct answer', () => {
      const result = validator.validateMultipleChoice(sampleQuestion, 1);

      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe('Paris');
      expect(result.userAnswer).toBe('Paris');
      expect(result.feedback).toContain('Paris');
      expect(result.explanation).toBe(sampleQuestion.explanation);
    });

    it('should validate incorrect answer', () => {
      const result = validator.validateMultipleChoice(sampleQuestion, 0);

      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswer).toBe('Paris');
      expect(result.userAnswer).toBe('London');
      expect(result.feedback).toContain('London');
      expect(result.feedback).toContain('Paris');
      expect(result.explanation).toBe(sampleQuestion.explanation);
    });

    it('should handle different incorrect answers', () => {
      const result1 = validator.validateMultipleChoice(sampleQuestion, 2);
      expect(result1.isCorrect).toBe(false);
      expect(result1.userAnswer).toBe('Berlin');

      const result2 = validator.validateMultipleChoice(sampleQuestion, 3);
      expect(result2.isCorrect).toBe(false);
      expect(result2.userAnswer).toBe('Madrid');
    });

    it('should throw error if question is missing', () => {
      expect(() => {
        validator.validateMultipleChoice(null, 0);
      }).toThrow('Question is required for validation');
    });

    it('should throw error for unsupported question type', () => {
      const textQuestion = { ...sampleQuestion, type: 'text' };
      
      expect(() => {
        validator.validateMultipleChoice(textQuestion, 0);
      }).toThrow('Unsupported question type: text');
    });

    it('should throw error if options array is missing', () => {
      const invalidQuestion = { ...sampleQuestion, options: undefined };
      
      expect(() => {
        validator.validateMultipleChoice(invalidQuestion, 0);
      }).toThrow('Question must have options array');
    });

    it('should throw error if options array is empty', () => {
      const invalidQuestion = { ...sampleQuestion, options: [] };
      
      expect(() => {
        validator.validateMultipleChoice(invalidQuestion, 0);
      }).toThrow('Question must have options array');
    });

    it('should throw error if correctAnswer is not a number', () => {
      const invalidQuestion = { ...sampleQuestion, correctAnswer: 'Paris' };
      
      expect(() => {
        validator.validateMultipleChoice(invalidQuestion, 0);
      }).toThrow('Question must have a numeric correctAnswer index');
    });

    it('should throw error if userAnswerIndex is not a number', () => {
      expect(() => {
        validator.validateMultipleChoice(sampleQuestion, 'Paris');
      }).toThrow('User answer must be a numeric index');
    });

    it('should throw error if userAnswerIndex is out of bounds (negative)', () => {
      expect(() => {
        validator.validateMultipleChoice(sampleQuestion, -1);
      }).toThrow('Invalid answer index: -1');
    });

    it('should throw error if userAnswerIndex is out of bounds (too large)', () => {
      expect(() => {
        validator.validateMultipleChoice(sampleQuestion, 4);
      }).toThrow('Invalid answer index: 4');
    });

    it('should handle question with no explanation', () => {
      const questionNoExplanation = { ...sampleQuestion, explanation: '' };
      const result = validator.validateMultipleChoice(questionNoExplanation, 0);

      expect(result.isCorrect).toBe(false);
      expect(result.explanation).toBe('');
      expect(result.feedback).toBeDefined();
    });

    it('should handle question with undefined explanation', () => {
      const questionNoExplanation = { ...sampleQuestion, explanation: undefined };
      const result = validator.validateMultipleChoice(questionNoExplanation, 0);

      expect(result.isCorrect).toBe(false);
      expect(result.explanation).toBe('');
      expect(result.feedback).toBeDefined();
    });
  });

  describe('generateFeedback', () => {
    it('should generate positive feedback for correct answers', () => {
      const feedback = validator.generateFeedback(true, 'Paris', 'Paris', 'Explanation');

      expect(feedback).toContain('Paris');
      expect(feedback).toContain('correct');
    });

    it('should generate corrective feedback for incorrect answers', () => {
      const feedback = validator.generateFeedback(
        false,
        'Paris',
        'London',
        'Paris is the capital of France.'
      );

      expect(feedback).toContain('London');
      expect(feedback).toContain('Paris');
      expect(feedback).toContain('Paris is the capital of France.');
    });
  });

  describe('generatePositiveFeedback', () => {
    it('should include positive message', () => {
      const feedback = validator.generatePositiveFeedback('Paris');

      // Should be a positive message - check that it's from our list
      const containsPositivePhrase = validator.positiveMessages.some(msg => 
        feedback.includes(msg)
      );

      expect(containsPositivePhrase).toBe(true);
    });

    it('should include correct answer', () => {
      const feedback = validator.generatePositiveFeedback('Paris');
      expect(feedback).toContain('Paris');
      expect(feedback).toContain('correct');
    });

    it('should include emoji for engagement', () => {
      const feedback = validator.generatePositiveFeedback('Paris');
      
      // Check for presence of any emoji
      const hasEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(feedback);
      expect(hasEmoji).toBe(true);
    });

    it('should generate different messages on multiple calls', () => {
      const feedbacks = new Set();
      
      // Generate 20 feedback messages
      for (let i = 0; i < 20; i++) {
        const feedback = validator.generatePositiveFeedback('Answer');
        feedbacks.add(feedback);
      }

      // Should have generated at least 2 different messages (randomness)
      expect(feedbacks.size).toBeGreaterThan(1);
    });
  });

  describe('generateCorrectiveFeedback', () => {
    it('should include encouraging message', () => {
      const feedback = validator.generateCorrectiveFeedback(
        'Paris',
        'London',
        'Explanation'
      );

      // Should be an encouraging message - check that it's from our list
      const containsEncouragingPhrase = validator.encouragingMessages.some(msg => 
        feedback.includes(msg)
      );

      expect(containsEncouragingPhrase).toBe(true);
    });

    it('should include user answer', () => {
      const feedback = validator.generateCorrectiveFeedback(
        'Paris',
        'London',
        'Explanation'
      );

      expect(feedback).toContain('London');
      expect(feedback).toContain('You selected');
    });

    it('should include correct answer', () => {
      const feedback = validator.generateCorrectiveFeedback(
        'Paris',
        'London',
        'Explanation'
      );

      expect(feedback).toContain('Paris');
      expect(feedback).toContain('correct answer');
    });

    it('should include explanation when provided', () => {
      const explanation = 'Paris is the capital and largest city of France.';
      const feedback = validator.generateCorrectiveFeedback(
        'Paris',
        'London',
        explanation
      );

      expect(feedback).toContain(explanation);
    });

    it('should handle empty explanation gracefully', () => {
      const feedback = validator.generateCorrectiveFeedback(
        'Paris',
        'London',
        ''
      );

      expect(feedback).toContain('Paris');
      expect(feedback).toContain('London');
      // Should not have extra explanation section (should be 6 lines or less)
      expect(feedback.split('\n').length).toBeLessThanOrEqual(6);
    });

    it('should handle whitespace-only explanation', () => {
      const feedback = validator.generateCorrectiveFeedback(
        'Paris',
        'London',
        '   '
      );

      expect(feedback).toContain('Paris');
      expect(feedback).toContain('London');
    });

    it('should generate different messages on multiple calls', () => {
      const feedbacks = new Set();
      
      // Generate 20 feedback messages
      for (let i = 0; i < 20; i++) {
        const feedback = validator.generateCorrectiveFeedback(
          'Correct',
          'Wrong',
          'Explanation'
        );
        feedbacks.add(feedback);
      }

      // Should have generated at least 2 different messages (randomness)
      expect(feedbacks.size).toBeGreaterThan(1);
    });
  });

  describe('validate', () => {
    it('should return simplified result for correct answer', () => {
      const result = validator.validate(sampleQuestion, 1);

      expect(result).toHaveProperty('isCorrect');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('correctAnswer');
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe('Paris');
    });

    it('should return simplified result for incorrect answer', () => {
      const result = validator.validate(sampleQuestion, 0);

      expect(result).toHaveProperty('isCorrect');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('correctAnswer');
      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswer).toBe('Paris');
    });

    it('should not include userAnswer in simplified result', () => {
      const result = validator.validate(sampleQuestion, 0);
      expect(result).not.toHaveProperty('userAnswer');
    });

    it('should not include explanation in simplified result', () => {
      const result = validator.validate(sampleQuestion, 0);
      expect(result).not.toHaveProperty('explanation');
    });
  });

  describe('getRandomPositiveMessage', () => {
    it('should return a positive message', () => {
      const message = validator.getRandomPositiveMessage();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return message from positiveMessages array', () => {
      const message = validator.getRandomPositiveMessage();
      expect(validator.positiveMessages).toContain(message);
    });

    it('should return different messages on multiple calls', () => {
      const messages = new Set();
      
      for (let i = 0; i < 20; i++) {
        messages.add(validator.getRandomPositiveMessage());
      }

      // Should have some variety (at least 2 different messages)
      expect(messages.size).toBeGreaterThan(1);
    });
  });

  describe('getRandomEncouragingMessage', () => {
    it('should return an encouraging message', () => {
      const message = validator.getRandomEncouragingMessage();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return message from encouragingMessages array', () => {
      const message = validator.getRandomEncouragingMessage();
      expect(validator.encouragingMessages).toContain(message);
    });

    it('should return different messages on multiple calls', () => {
      const messages = new Set();
      
      for (let i = 0; i < 20; i++) {
        messages.add(validator.getRandomEncouragingMessage());
      }

      // Should have some variety (at least 2 different messages)
      expect(messages.size).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle question with two options', () => {
      const binaryQuestion = {
        ...sampleQuestion,
        options: ['True', 'False'],
        correctAnswer: 0
      };

      const result = validator.validateMultipleChoice(binaryQuestion, 0);
      expect(result.isCorrect).toBe(true);
    });

    it('should handle question with many options', () => {
      const manyOptionsQuestion = {
        ...sampleQuestion,
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        correctAnswer: 5
      };

      const result = validator.validateMultipleChoice(manyOptionsQuestion, 5);
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe('F');
    });

    it('should handle options with special characters', () => {
      const specialQuestion = {
        ...sampleQuestion,
        options: ['Option "A"', 'Option \'B\'', 'Option & C', 'Option <D>'],
        correctAnswer: 2
      };

      const result = validator.validateMultipleChoice(specialQuestion, 2);
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe('Option & C');
    });

    it('should handle very long option text', () => {
      const longText = 'This is a very long answer option that contains multiple sentences and goes on for quite a while to test how the validator handles lengthy text content.';
      const longQuestion = {
        ...sampleQuestion,
        options: ['Short', longText, 'Medium length', 'Brief'],
        correctAnswer: 1
      };

      const result = validator.validateMultipleChoice(longQuestion, 1);
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe(longText);
    });

    it('should handle empty string in options', () => {
      const emptyOptionQuestion = {
        ...sampleQuestion,
        options: ['', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0
      };

      const result = validator.validateMultipleChoice(emptyOptionQuestion, 0);
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe('');
    });
  });

  describe('Feedback Quality', () => {
    it('should provide constructive feedback for incorrect answers', () => {
      const result = validator.validateMultipleChoice(sampleQuestion, 0);

      // Feedback should be helpful and not just say "wrong"
      expect(result.feedback.toLowerCase()).not.toBe('wrong');
      expect(result.feedback.toLowerCase()).not.toBe('incorrect');
      
      // Should provide context
      expect(result.feedback.length).toBeGreaterThan(20);
    });

    it('should include explanation in incorrect answer feedback', () => {
      const result = validator.validateMultipleChoice(sampleQuestion, 0);
      expect(result.feedback).toContain(sampleQuestion.explanation);
    });

    it('should be encouraging even when answer is wrong', () => {
      const result = validator.validateMultipleChoice(sampleQuestion, 0);
      
      // Should not use harsh language
      expect(result.feedback.toLowerCase()).not.toContain('fail');
      expect(result.feedback.toLowerCase()).not.toContain('stupid');
      expect(result.feedback.toLowerCase()).not.toContain('bad');
    });

    it('should celebrate correct answers enthusiastically', () => {
      const result = validator.validateMultipleChoice(sampleQuestion, 1);
      
      // Should have positive tone
      const feedback = result.feedback.toLowerCase();
      const hasPositiveTone = 
        feedback.includes('excellent') ||
        feedback.includes('correct') ||
        feedback.includes('perfect') ||
        feedback.includes('brilliant') ||
        feedback.includes('great') ||
        feedback.includes('outstanding') ||
        feedback.includes('fantastic') ||
        feedback.includes('superb') ||
        feedback.includes('wonderful');

      expect(hasPositiveTone).toBe(true);
    });
  });
});
