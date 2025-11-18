const { BrowserWindow } = require('electron');
const EventEmitter = require('events');
const { IPC_CHANNELS, SCARE_STAGES } = require('../shared/constants');

/**
 * ScareController orchestrates the scare sequence stages
 * Manages progression: shake → darken → tunnel → jumpscare → question
 */
class ScareController extends EventEmitter {
  /**
   * @param {QuestionGenerator} questionGenerator - Question generator instance
   * @param {Object} options - Configuration options
   * @param {SessionManager} options.sessionManager - Optional session manager for statistics
   */
  constructor(questionGenerator, options = {}) {
    super();
    
    if (!questionGenerator) {
      throw new Error('QuestionGenerator is required');
    }
    
    this.questionGenerator = questionGenerator;
    this.sessionManager = options.sessionManager || null;
    this.scareWindow = null;
    this.currentStage = null;
    this.isSequenceActive = false;
    this.currentQuestion = null;
    
    // Configuration
    this.options = {
      autoStart: options.autoStart !== false, // Default true
      ...options
    };
  }

  /**
   * Set the scare window reference
   * @param {BrowserWindow} window - The scare window instance
   */
  setScareWindow(window) {
    if (!window || typeof window !== 'object') {
      throw new Error('Invalid BrowserWindow instance');
    }
    
    // Check for required methods/properties
    if (!window.webContents || typeof window.isDestroyed !== 'function') {
      throw new Error('Invalid BrowserWindow instance');
    }
    
    this.scareWindow = window;
    this._setupWindowListeners();
  }

  /**
   * Set up IPC listeners for the scare window
   * @private
   */
  _setupWindowListeners() {
    if (!this.scareWindow) {
      return;
    }

    // Listen for stage completion events from renderer
    try {
      const { ipcMain } = require('electron');
      
      if (!ipcMain) {
        return; // Skip if ipcMain is not available (testing environment)
      }
      
      // Remove any existing listeners to prevent duplicates
      if (typeof ipcMain.removeHandler === 'function') {
        ipcMain.removeHandler(IPC_CHANNELS.SCARE_STAGE_COMPLETE);
        ipcMain.removeHandler(IPC_CHANNELS.ANSWER_SUBMIT);
      }
      
      // Handle stage completion
      ipcMain.on(IPC_CHANNELS.SCARE_STAGE_COMPLETE, (event, stage) => {
        this._handleStageComplete(stage);
      });
      
      // Handle answer submission (questionId, answer)
      ipcMain.on(IPC_CHANNELS.ANSWER_SUBMIT, (event, questionId, answer) => {
        this._handleAnswerSubmit(event, questionId, answer);
      });
      
      // Handle sequence cancellation (ESC key)
      ipcMain.on(IPC_CHANNELS.SCARE_CANCEL, () => {
        this.cancelSequence();
      });
    } catch (error) {
      // Electron not available (testing environment), skip IPC setup
      console.log('IPC setup skipped (testing environment)');
    }
  }

  /**
   * Start the scare sequence
   * @returns {Promise<void>}
   */
  async startSequence() {
    if (this.isSequenceActive) {
      console.warn('Scare sequence already active');
      return;
    }

    if (!this.scareWindow || this.scareWindow.isDestroyed()) {
      throw new Error('Scare window not available');
    }

    console.log('Starting scare sequence');
    this.isSequenceActive = true;
    this.currentStage = null;
    this.currentQuestion = null;

    // Emit sequence start event
    this.emit('sequence-start');

    // Start with shake stage
    await this._transitionToStage(SCARE_STAGES.SHAKE);
  }

  /**
   * Transition to a specific stage
   * @param {string} stage - The stage to transition to
   * @private
   */
  async _transitionToStage(stage) {
    if (!this.scareWindow || this.scareWindow.isDestroyed()) {
      console.error('Cannot transition: scare window not available');
      return;
    }

    console.log(`Transitioning to stage: ${stage}`);
    this.currentStage = stage;

    // Emit stage change event
    this.emit('stage-change', stage);

    // Send stage command to renderer
    switch (stage) {
      case SCARE_STAGES.SHAKE:
        this.scareWindow.webContents.send('start-shake');
        break;
        
      case SCARE_STAGES.DARKEN:
        this.scareWindow.webContents.send('start-darken');
        break;
        
      case SCARE_STAGES.TUNNEL:
        this.scareWindow.webContents.send('start-tunnel');
        break;
        
      case SCARE_STAGES.JUMPSCARE:
        this.scareWindow.webContents.send('start-jumpscare');
        break;
        
      case SCARE_STAGES.QUESTION:
        await this._showQuestion();
        break;
        
      default:
        console.error(`Unknown stage: ${stage}`);
    }
  }

  /**
   * Handle stage completion from renderer
   * @param {string} completedStage - The stage that was completed
   * @private
   */
  _handleStageComplete(completedStage) {
    console.log(`Stage completed: ${completedStage}`);

    // Emit stage complete event
    this.emit('stage-complete', completedStage);

    // Check if this is the final "complete" notification from renderer
    if (completedStage === 'complete') {
      console.log('Scare sequence complete - returning to background mode');
      this.endSequence();
      return;
    }

    // Determine next stage
    const nextStage = this._getNextStage(completedStage);
    
    if (nextStage) {
      this._transitionToStage(nextStage);
    } else {
      console.log('Scare sequence complete');
      this.endSequence();
    }
  }

  /**
   * Get the next stage in the sequence
   * @param {string} currentStage - Current stage
   * @returns {string|null} - Next stage or null if sequence is complete
   * @private
   */
  _getNextStage(currentStage) {
    const stageOrder = [
      SCARE_STAGES.SHAKE,
      SCARE_STAGES.DARKEN,
      SCARE_STAGES.TUNNEL,
      SCARE_STAGES.JUMPSCARE,
      SCARE_STAGES.QUESTION
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    
    if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
      return null; // No next stage
    }

    return stageOrder[currentIndex + 1];
  }

  /**
   * Show a question after the jump scare
   * @private
   */
  async _showQuestion() {
    try {
      // Get next question from generator
      const question = this.questionGenerator.getNextQuestion();

      if (!question) {
        console.warn('No questions available');
        const error = new Error('No questions available');
        this.emit('error', error);
        
        // Show error message to user
        if (this.scareWindow && !this.scareWindow.isDestroyed()) {
          this.scareWindow.webContents.send(IPC_CHANNELS.QUESTION_SHOW, {
            error: 'No questions available. Please add study documents in the configuration.'
          });
        }
        
        // End sequence after a delay
        setTimeout(() => this.endSequence(), 3000);
        return;
      }

      this.currentQuestion = question;
      console.log(`Showing question: ${question.id}`);

      // Send question to renderer
      if (this.scareWindow && !this.scareWindow.isDestroyed()) {
        this.scareWindow.webContents.send(IPC_CHANNELS.QUESTION_SHOW, question);
      }

      // Emit question shown event
      this.emit('question-shown', question);
    } catch (error) {
      console.error('Error showing question:', error);
      this.emit('error', error);
      
      // Show error message to user
      if (this.scareWindow && !this.scareWindow.isDestroyed()) {
        this.scareWindow.webContents.send(IPC_CHANNELS.QUESTION_SHOW, {
          error: 'An error occurred while loading the question.'
        });
      }
      
      setTimeout(() => this.endSequence(), 3000);
    }
  }

  /**
   * Handle answer submission from renderer
   * @param {string} questionId - ID of the question being answered
   * @param {number|string} answer - The submitted answer
   * @private
   */
  async _handleAnswerSubmit(event, questionId, answer) {
    if (!this.currentQuestion) {
      console.error('No current question to validate');
      return;
    }

    // Verify question ID matches
    if (this.currentQuestion.id !== questionId) {
      console.error(`Question ID mismatch: expected ${this.currentQuestion.id}, got ${questionId}`);
      return;
    }

    console.log(`Answer submitted for question ${questionId}: ${answer}`);

    // Validate answer
    const isCorrect = this._validateAnswer(answer);

    // Generate feedback
    const feedback = {
      correct: isCorrect,
      message: isCorrect 
        ? this._getPositiveFeedback()
        : this._getIncorrectFeedback(),
      explanation: this.currentQuestion.explanation,
      correctAnswer: this.currentQuestion.options 
        ? this.currentQuestion.options[this.currentQuestion.correctAnswer]
        : this.currentQuestion.correctAnswer
    };

    console.log(`Answer ${isCorrect ? 'correct' : 'incorrect'}`);

    // Mark question as used
    this.questionGenerator.markQuestionUsed(this.currentQuestion.id);

    // Record answer in session statistics
    if (this.sessionManager) {
      try {
        await this.sessionManager.recordAnswer(isCorrect);
      } catch (error) {
        console.error('Failed to record answer in session:', error);
      }
    }

    // Send feedback to renderer
    if (this.scareWindow && !this.scareWindow.isDestroyed()) {
      this.scareWindow.webContents.send(IPC_CHANNELS.ANSWER_FEEDBACK, feedback);
    }

    // Emit answer event
    this.emit('answer-submitted', {
      question: this.currentQuestion,
      answer,
      correct: isCorrect,
      feedback
    });

    // Note: Renderer will handle the delay and close automatically
    // We don't call endSequence here - it will be called by the renderer's close callback
  }

  /**
   * Validate the submitted answer
   * @param {number|string} answer - The submitted answer
   * @returns {boolean} - True if correct, false otherwise
   * @private
   */
  _validateAnswer(answer) {
    if (!this.currentQuestion) {
      return false;
    }

    if (this.currentQuestion.type === 'multiple-choice') {
      // For multiple choice, answer is the index
      return parseInt(answer) === this.currentQuestion.correctAnswer;
    } else {
      // For text answers, do case-insensitive comparison
      const submittedAnswer = String(answer).trim().toLowerCase();
      const correctAnswer = String(this.currentQuestion.correctAnswer).trim().toLowerCase();
      return submittedAnswer === correctAnswer;
    }
  }

  /**
   * Get a random positive feedback message
   * @returns {string}
   * @private
   */
  _getPositiveFeedback() {
    const messages = [
      'Excellent! You got it right!',
      'Correct! Well done!',
      'That\'s right! Great job!',
      'Perfect! You know your stuff!',
      'Correct answer! Keep it up!',
      'Brilliant! You\'re on fire!',
      'Yes! That\'s correct!',
      'Outstanding! You nailed it!'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Get a random incorrect feedback message
   * @returns {string}
   * @private
   */
  _getIncorrectFeedback() {
    const messages = [
      'Not quite right. Let\'s review the material.',
      'That\'s incorrect. Check the explanation below.',
      'Oops! That\'s not the right answer.',
      'Not this time. See the correct answer below.',
      'Incorrect. Take a look at the explanation.',
      'That\'s not it. Review the material and try again next time.',
      'Wrong answer. Don\'t worry, you\'ll get it next time!',
      'Not correct. Study the explanation to learn more.'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Handle click events during the sequence
   * Used for stage transitions that require user interaction
   * @param {string} stage - The stage where the click occurred
   */
  handleClick(stage) {
    console.log(`Click detected in stage: ${stage}`);

    // Emit click event
    this.emit('click', stage);

    // Handle stage-specific click behavior
    switch (stage) {
      case SCARE_STAGES.DARKEN:
        // First click on dark overlay transitions to tunnel
        this._transitionToStage(SCARE_STAGES.TUNNEL);
        break;
        
      case SCARE_STAGES.TUNNEL:
        // Clicks during tunnel are handled by the tunnel animation
        // The renderer will notify us when tunnel is complete
        break;
        
      default:
        console.log(`Click not handled for stage: ${stage}`);
    }
  }

  /**
   * Cancel the current scare sequence
   * Called when user presses ESC or sequence needs to be aborted
   */
  cancelSequence() {
    if (!this.isSequenceActive) {
      return;
    }

    console.log('Cancelling scare sequence');
    this.isSequenceActive = false;
    this.currentStage = null;
    this.currentQuestion = null;

    // Emit cancellation event
    this.emit('sequence-cancelled');

    // Hide the scare window
    if (this.scareWindow && !this.scareWindow.isDestroyed()) {
      this.scareWindow.hide();
    }
  }

  /**
   * End the scare sequence normally
   * Called after question is answered and feedback is shown
   */
  endSequence() {
    if (!this.isSequenceActive) {
      return;
    }

    console.log('Ending scare sequence');
    this.isSequenceActive = false;
    this.currentStage = null;
    this.currentQuestion = null;

    // Emit sequence end event
    this.emit('sequence-end');

    // Hide the scare window
    if (this.scareWindow && !this.scareWindow.isDestroyed()) {
      this.scareWindow.hide();
    }
  }

  /**
   * Get the current stage
   * @returns {string|null}
   */
  getCurrentStage() {
    return this.currentStage;
  }

  /**
   * Check if sequence is active
   * @returns {boolean}
   */
  isActive() {
    return this.isSequenceActive;
  }

  /**
   * Get the current question
   * @returns {Object|null}
   */
  getCurrentQuestion() {
    return this.currentQuestion;
  }

  /**
   * Clean up resources
   */
  destroy() {
    console.log('Destroying ScareController');
    
    // Remove all listeners
    this.removeAllListeners();
    
    // Clear references
    this.scareWindow = null;
    this.questionGenerator = null;
    this.currentQuestion = null;
    this.isSequenceActive = false;
  }
}

module.exports = ScareController;
