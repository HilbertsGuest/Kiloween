// Jump scare implementation
// Handles creature display, animations, and question overlay

/**
 * JumpScare class manages the jump scare sequence
 */
class JumpScare {
  constructor() {
    this.jumpscareLayer = null;
    this.creatureAscii = null;
    this.questionContainer = null;
    this.questionText = null;
    this.answerOptions = null;
    this.feedback = null;
    this.currentCreature = null;
    this.isActive = false;
  }

  /**
   * Initialize the jump scare with DOM elements
   */
  init() {
    this.jumpscareLayer = document.getElementById('jumpscare-layer');
    this.creatureAscii = document.getElementById('creature-ascii');
    this.questionContainer = document.getElementById('question-container');
    this.questionText = document.getElementById('question-text');
    this.answerOptions = document.getElementById('answer-options');
    this.feedback = document.getElementById('feedback');

    if (!this.jumpscareLayer || !this.creatureAscii) {
      console.error('Jump scare elements not found');
      return false;
    }

    console.log('Jump scare initialized');
    return true;
  }

  /**
   * Trigger the jump scare with a creature
   * @param {Object} options - Options for the jump scare
   * @param {Object} options.creature - Creature object (optional, random if not provided)
   * @param {Object} options.question - Question object (optional)
   * @param {boolean} options.noQuestions - True if no questions available
   * @param {string} options.errorMessage - Error message for no questions case
   */
  trigger(options = {}) {
    console.log('Triggering jump scare');
    this.isActive = true;

    // Get creature (random if not specified)
    this.currentCreature = options.creature || window.creatures.getRandomCreature();

    // Hide tunnel canvas
    const tunnelCanvas = document.getElementById('tunnel-canvas');
    if (tunnelCanvas) {
      tunnelCanvas.style.display = 'none';
    }

    // Set creature ASCII art and color
    this.creatureAscii.textContent = this.currentCreature.art;
    this.creatureAscii.style.color = this.currentCreature.color;
    this.creatureAscii.style.textShadow = `0 0 10px ${this.currentCreature.color}`;

    // Initially hide the creature for sudden appearance
    this.creatureAscii.style.opacity = '0';
    this.creatureAscii.style.transform = 'scale(0.5)';

    // Show the jumpscare layer
    this.jumpscareLayer.style.display = 'flex';

    // Sudden appearance animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.creatureAscii.style.transition = 'opacity 0.1s ease-out, transform 0.1s ease-out';
        this.creatureAscii.style.opacity = '1';
        this.creatureAscii.style.transform = 'scale(1)';
      });
    });

    // Handle different scenarios after creature appears
    if (options.noQuestions) {
      // No questions available - show error message
      setTimeout(() => {
        this.showNoQuestionsError(options.errorMessage || 'No questions available');
      }, 1500);
    } else if (options.question) {
      // Question provided directly - show it
      setTimeout(() => {
        this.showQuestion(options.question);
      }, 1500);
    }
    // If neither, wait for question to be sent via IPC

    console.log(`Jump scare triggered with creature: ${this.currentCreature.name}`);
  }

  /**
   * Show question overlay
   * @param {Object} question - Question object with text, options, etc.
   */
  showQuestion(question) {
    if (!question) {
      console.error('No question provided');
      return;
    }

    console.log('Showing question:', question.text);

    // Set question text
    this.questionText.textContent = question.text;

    // Clear previous answer options
    this.answerOptions.innerHTML = '';

    // Create answer option buttons
    if (question.options && Array.isArray(question.options)) {
      question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'answer-option';
        button.textContent = option;
        button.dataset.index = index;
        
        button.addEventListener('click', () => {
          this.handleAnswerClick(index, question);
        });

        this.answerOptions.appendChild(button);
      });
    }

    // Show question container with fade-in
    this.questionContainer.style.opacity = '0';
    this.questionContainer.style.display = 'block';
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.questionContainer.style.transition = 'opacity 0.5s ease-in';
        this.questionContainer.style.opacity = '1';
      });
    });
  }

  /**
   * Handle answer button click
   * @param {number} answerIndex - Index of selected answer
   * @param {Object} question - Question object
   */
  handleAnswerClick(answerIndex, question) {
    console.log(`Answer selected: ${answerIndex}`);

    // Disable all answer buttons
    const buttons = this.answerOptions.querySelectorAll('.answer-option');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.style.cursor = 'not-allowed';
      btn.style.opacity = '0.6';
    });

    // Send answer to main process for validation
    if (window.electronAPI && window.electronAPI.submitAnswer) {
      window.electronAPI.submitAnswer(question.id, answerIndex);
      console.log('Answer submitted to main process');
    } else {
      // Fallback for testing - validate locally
      const isCorrect = answerIndex === question.correctAnswer;
      this.showFeedback(isCorrect, question.explanation);
    }
  }

  /**
   * Show feedback for answer (local fallback for testing)
   * @param {boolean} isCorrect - Whether answer was correct
   * @param {string} explanation - Explanation text (optional)
   */
  showFeedback(isCorrect, explanation) {
    // Ensure jump scare is marked as active
    this.isActive = true;

    // Clear any existing feedback content
    this.feedback.innerHTML = '';
    this.feedback.style.display = 'block';
    this.feedback.className = isCorrect ? 'correct' : 'incorrect';

    // Create feedback message structure
    const messageDiv = document.createElement('div');
    messageDiv.className = 'feedback-message';
    
    // Add icon and main message
    const icon = isCorrect ? '✓' : '✗';
    const mainMessage = document.createElement('div');
    mainMessage.className = 'feedback-main';
    mainMessage.textContent = isCorrect 
      ? `${icon} Correct! Well done!`
      : `${icon} Incorrect. Try again next time!`;
    messageDiv.appendChild(mainMessage);
    
    // Add explanation if available and answer was incorrect
    if (!isCorrect && explanation) {
      const explanationDiv = document.createElement('div');
      explanationDiv.className = 'feedback-explanation';
      explanationDiv.textContent = explanation;
      messageDiv.appendChild(explanationDiv);
    }

    this.feedback.appendChild(messageDiv);

    // Delay before closing (4.5 seconds for incorrect to read explanation, 3 for correct)
    const closeDelay = isCorrect ? 3000 : 4500;
    
    setTimeout(() => {
      this.closeWithFadeOut();
    }, closeDelay);
  }

  /**
   * Close the jump scare with a smooth fade-out and return to background
   */
  closeWithFadeOut() {
    console.log('Closing jump scare with fade-out');

    // Fade out the entire jumpscare layer
    this.jumpscareLayer.style.transition = 'opacity 1s ease-out';
    this.jumpscareLayer.style.opacity = '0';

    setTimeout(() => {
      // Reset all elements
      this.jumpscareLayer.style.display = 'none';
      this.jumpscareLayer.style.opacity = '1';
      this.questionContainer.style.display = 'none';
      this.questionContainer.style.opacity = '1';
      this.feedback.style.display = 'none';
      this.feedback.innerHTML = '';
      this.creatureAscii.textContent = '';
      this.isActive = false;

      // Notify main process that sequence is complete
      this.notifySequenceComplete();

      // Call legacy callback if exists
      if (window.onJumpScareComplete) {
        window.onJumpScareComplete();
      }

      console.log('Jump scare closed - returned to background mode');
    }, 1000); // Wait for fade-out animation to complete
  }

  /**
   * Close the jump scare immediately (legacy method for compatibility)
   */
  close() {
    console.log('Closing jump scare (immediate)');
    this.closeWithFadeOut();
  }

  /**
   * Notify main process that the scare sequence is complete
   * This allows the app to return to background mode and reset the timer
   */
  notifySequenceComplete() {
    if (window.electronAPI && window.electronAPI.scareStageComplete) {
      // Send a special "complete" stage to indicate the entire sequence is done
      window.electronAPI.scareStageComplete('complete');
      console.log('Notified main process: sequence complete');
    }
  }

  /**
   * Get current creature
   * @returns {Object|null} Current creature object
   */
  getCurrentCreature() {
    return this.currentCreature;
  }

  /**
   * Check if jump scare is active
   * @returns {boolean} True if active
   */
  isJumpScareActive() {
    return this.isActive;
  }

  /**
   * Show feedback received from main process
   * @param {Object} feedback - Feedback object from main process
   * @param {boolean} feedback.correct - Whether answer was correct
   * @param {string} feedback.message - Feedback message
   * @param {string} feedback.explanation - Explanation (optional)
   * @param {string} feedback.correctAnswer - The correct answer
   */
  showFeedbackFromMain(feedback) {
    if (!feedback) {
      console.error('No feedback provided');
      return;
    }

    console.log('Showing feedback from main process:', feedback);

    // Ensure jump scare is marked as active
    this.isActive = true;

    // Clear any existing feedback content
    this.feedback.innerHTML = '';
    this.feedback.style.display = 'block';
    this.feedback.className = feedback.correct ? 'correct' : 'incorrect';

    // Create feedback message structure
    const messageDiv = document.createElement('div');
    messageDiv.className = 'feedback-message';
    
    // Add icon and main message
    const icon = feedback.correct ? '✓' : '✗';
    const mainMessage = document.createElement('div');
    mainMessage.className = 'feedback-main';
    mainMessage.textContent = `${icon} ${feedback.message}`;
    messageDiv.appendChild(mainMessage);
    
    // Add correct answer for incorrect responses only
    if (!feedback.correct && feedback.correctAnswer) {
      const correctAnswerDiv = document.createElement('div');
      correctAnswerDiv.className = 'feedback-correct-answer';
      correctAnswerDiv.textContent = `Correct answer: ${feedback.correctAnswer}`;
      messageDiv.appendChild(correctAnswerDiv);
    }
    
    // Add explanation if available and answer was incorrect
    if (!feedback.correct && feedback.explanation) {
      const explanationDiv = document.createElement('div');
      explanationDiv.className = 'feedback-explanation';
      explanationDiv.textContent = feedback.explanation;
      messageDiv.appendChild(explanationDiv);
    }

    this.feedback.appendChild(messageDiv);

    // Delay before closing (4.5 seconds for incorrect to read explanation, 3 for correct)
    const closeDelay = feedback.correct ? 3000 : 4500;
    
    setTimeout(() => {
      this.closeWithFadeOut();
    }, closeDelay);
  }

  /**
   * Hide the jump scare immediately without fade-out
   * Used for cancellation scenarios
   */
  hide() {
    console.log('Hiding jump scare immediately');
    
    // Reset all elements immediately
    this.jumpscareLayer.style.display = 'none';
    this.jumpscareLayer.style.opacity = '1';
    this.questionContainer.style.display = 'none';
    this.questionContainer.style.opacity = '1';
    this.feedback.style.display = 'none';
    this.feedback.innerHTML = '';
    this.creatureAscii.textContent = '';
    this.isActive = false;
    
    console.log('Jump scare hidden');
  }

  /**
   * Show error message when no questions are available
   * @param {string} errorMessage - Error message to display
   */
  showNoQuestionsError(errorMessage) {
    console.log('Showing no questions error:', errorMessage);

    // Set error message as question text
    this.questionText.textContent = '⚠️ No Questions Available';
    this.questionText.style.color = '#ff6b6b';

    // Clear answer options
    this.answerOptions.innerHTML = '';

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.color = '#ff6b6b';
    errorDiv.style.fontSize = '1.2rem';
    errorDiv.style.marginTop = '1rem';
    errorDiv.style.textAlign = 'center';
    errorDiv.textContent = errorMessage || 'Please add study documents in the configuration.';
    
    this.answerOptions.appendChild(errorDiv);

    // Show question container with fade-in
    this.questionContainer.style.opacity = '0';
    this.questionContainer.style.display = 'block';
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.questionContainer.style.transition = 'opacity 0.5s ease-in';
        this.questionContainer.style.opacity = '1';
      });
    });

    // Auto-close after delay with fade-out
    setTimeout(() => {
      this.closeWithFadeOut();
    }, 4000); // Longer delay for error message
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JumpScare;
}

// Also expose globally for browser context
if (typeof window !== 'undefined') {
  window.JumpScare = JumpScare;
}
