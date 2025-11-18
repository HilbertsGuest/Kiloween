/**
 * @typedef {Object} Question
 * @property {string} id - Unique question identifier
 * @property {string} text - The question text
 * @property {string} type - Question type ('multiple-choice')
 * @property {string[]} options - Array of answer options
 * @property {number} correctAnswer - Index of correct answer
 * @property {string} explanation - Explanation of the correct answer
 * @property {string} sourceDocument - Path to source document
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isCorrect - Whether the answer is correct
 * @property {string} feedback - Feedback message for the user
 * @property {string} correctAnswer - The correct answer text
 * @property {string} userAnswer - The user's answer text
 * @property {string} explanation - Explanation from the question
 */

/**
 * Validates answers and generates feedback for educational questions
 */
class AnswerValidator {
  constructor() {
    // Positive reinforcement messages for correct answers
    this.positiveMessages = [
      "Excellent work! 🎃",
      "That's correct! Well done! 👻",
      "Perfect! You really know your stuff! ⭐",
      "Brilliant! Keep it up! 🌟",
      "Correct! You're on fire! 🔥",
      "Outstanding! That's the right answer! 💯",
      "Fantastic! You nailed it! 🎯",
      "Superb! Your studying is paying off! 📚",
      "Impressive! You got it right! ✨",
      "Wonderful! That's exactly right! 🏆"
    ];

    // Encouraging messages for incorrect answers
    this.encouragingMessages = [
      "Not quite, but don't give up! 💪",
      "That's not correct, but you're learning! 📖",
      "Close, but not quite right. Keep trying! 🎯",
      "Incorrect, but every mistake is a learning opportunity! 🌱",
      "Not this time, but you'll get the next one! 🚀",
      "That's not the answer, but keep studying! 📚",
      "Oops! Let's review this concept. 🔍",
      "Not quite right, but you're making progress! ⬆️",
      "Incorrect, but learning from mistakes makes you stronger! 💡",
      "That's not it, but don't be discouraged! 🌟"
    ];
  }

  /**
   * Validate a multiple-choice answer
   * @param {Question} question - The question being answered
   * @param {number} userAnswerIndex - Index of the user's selected answer
   * @returns {ValidationResult} - Validation result with feedback
   */
  validateMultipleChoice(question, userAnswerIndex) {
    // Validate inputs
    if (!question) {
      throw new Error('Question is required for validation');
    }

    if (question.type !== 'multiple-choice') {
      throw new Error(`Unsupported question type: ${question.type}`);
    }

    if (!Array.isArray(question.options) || question.options.length === 0) {
      throw new Error('Question must have options array');
    }

    if (typeof question.correctAnswer !== 'number') {
      throw new Error('Question must have a numeric correctAnswer index');
    }

    if (typeof userAnswerIndex !== 'number') {
      throw new Error('User answer must be a numeric index');
    }

    // Validate answer index is within bounds
    if (userAnswerIndex < 0 || userAnswerIndex >= question.options.length) {
      throw new Error(`Invalid answer index: ${userAnswerIndex}. Must be between 0 and ${question.options.length - 1}`);
    }

    // Check if answer is correct
    const isCorrect = userAnswerIndex === question.correctAnswer;

    // Get answer texts
    const correctAnswerText = question.options[question.correctAnswer];
    const userAnswerText = question.options[userAnswerIndex];

    // Generate feedback
    const feedback = this.generateFeedback(
      isCorrect,
      correctAnswerText,
      userAnswerText,
      question.explanation
    );

    return {
      isCorrect,
      feedback,
      correctAnswer: correctAnswerText,
      userAnswer: userAnswerText,
      explanation: question.explanation || ''
    };
  }

  /**
   * Generate feedback message based on answer correctness
   * @param {boolean} isCorrect - Whether the answer is correct
   * @param {string} correctAnswer - The correct answer text
   * @param {string} userAnswer - The user's answer text
   * @param {string} explanation - Explanation from the question
   * @returns {string} - Formatted feedback message
   */
  generateFeedback(isCorrect, correctAnswer, userAnswer, explanation) {
    if (isCorrect) {
      return this.generatePositiveFeedback(correctAnswer);
    } else {
      return this.generateCorrectiveFeedback(correctAnswer, userAnswer, explanation);
    }
  }

  /**
   * Generate positive reinforcement feedback for correct answers
   * @param {string} correctAnswer - The correct answer text
   * @returns {string} - Positive feedback message
   */
  generatePositiveFeedback(correctAnswer) {
    // Select a random positive message
    const randomIndex = Math.floor(Math.random() * this.positiveMessages.length);
    const positiveMessage = this.positiveMessages[randomIndex];

    return `${positiveMessage}\n\n"${correctAnswer}" is the correct answer!`;
  }

  /**
   * Generate corrective feedback for incorrect answers
   * @param {string} correctAnswer - The correct answer text
   * @param {string} userAnswer - The user's answer text
   * @param {string} explanation - Explanation from the question
   * @returns {string} - Corrective feedback message with explanation
   */
  generateCorrectiveFeedback(correctAnswer, userAnswer, explanation) {
    // Select a random encouraging message
    const randomIndex = Math.floor(Math.random() * this.encouragingMessages.length);
    const encouragingMessage = this.encouragingMessages[randomIndex];

    // Build feedback message
    let feedback = `${encouragingMessage}\n\n`;
    feedback += `You selected: "${userAnswer}"\n`;
    feedback += `The correct answer is: "${correctAnswer}"\n\n`;

    // Add explanation if available
    if (explanation && explanation.trim().length > 0) {
      feedback += `${explanation}`;
    }

    return feedback;
  }

  /**
   * Validate answer and return simplified result (for IPC communication)
   * @param {Question} question - The question being answered
   * @param {number} userAnswerIndex - Index of the user's selected answer
   * @returns {Object} - Simplified validation result
   */
  validate(question, userAnswerIndex) {
    const result = this.validateMultipleChoice(question, userAnswerIndex);
    
    return {
      isCorrect: result.isCorrect,
      feedback: result.feedback,
      correctAnswer: result.correctAnswer
    };
  }

  /**
   * Get a random positive message (for testing or preview)
   * @returns {string} - Random positive message
   */
  getRandomPositiveMessage() {
    const randomIndex = Math.floor(Math.random() * this.positiveMessages.length);
    return this.positiveMessages[randomIndex];
  }

  /**
   * Get a random encouraging message (for testing or preview)
   * @returns {string} - Random encouraging message
   */
  getRandomEncouragingMessage() {
    const randomIndex = Math.floor(Math.random() * this.encouragingMessages.length);
    return this.encouragingMessages[randomIndex];
  }
}

module.exports = AnswerValidator;
