/**
 * Tests for answer feedback display and sequence completion
 * Task 31: Implement answer feedback display and sequence completion
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Answer Feedback Display and Sequence Completion', () => {
  let dom;
  let document;
  let window;
  let JumpScare;
  let jumpScare;

  beforeEach(() => {
    // Load HTML
    const html = fs.readFileSync(
      path.join(__dirname, 'index.html'),
      'utf-8'
    );

    // Create DOM
    dom = new JSDOM(html, {
      url: 'http://localhost'
    });

    document = dom.window.document;
    window = dom.window;

    // Set up global document for the module
    global.document = document;
    global.window = window;

    // Mock requestAnimationFrame for JSDOM
    window.requestAnimationFrame = (callback) => {
      return setTimeout(callback, 0);
    };
    global.requestAnimationFrame = window.requestAnimationFrame;

    // Mock electronAPI
    window.electronAPI = {
      scareStageComplete: vi.fn(),
      submitAnswer: vi.fn(),
      onShowQuestion: vi.fn(),
      onAnswerFeedback: vi.fn()
    };

    // Load JumpScare class directly
    JumpScare = require('./jumpscare.js');
    jumpScare = new JumpScare();
    jumpScare.init();
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
    vi.clearAllTimers();
  });

  describe('Correct Answer Feedback', () => {
    it('should display green feedback with positive message for correct answers', () => {
      const feedback = {
        correct: true,
        message: 'Excellent! You got it right!',
        explanation: null,
        correctAnswer: 'Energy production'
      };

      jumpScare.showFeedbackFromMain(feedback);

      const feedbackEl = document.getElementById('feedback');
      expect(feedbackEl.style.display).toBe('block');
      expect(feedbackEl.classList.contains('correct')).toBe(true);
      expect(feedbackEl.textContent).toContain('✓');
      expect(feedbackEl.textContent).toContain('Excellent! You got it right!');
    });

    it('should not show correct answer or explanation for correct responses', () => {
      const feedback = {
        correct: true,
        message: 'Perfect! You know your stuff!',
        explanation: 'Some explanation',
        correctAnswer: 'Test Answer'
      };

      jumpScare.showFeedbackFromMain(feedback);

      const feedbackEl = document.getElementById('feedback');
      expect(feedbackEl.textContent).not.toContain('Correct answer:');
      expect(feedbackEl.textContent).not.toContain('Some explanation');
    });

    it('should close after 3 seconds for correct answers', () => {
      vi.useFakeTimers();

      const feedback = {
        correct: true,
        message: 'Correct!',
        correctAnswer: 'Test'
      };

      jumpScare.showFeedbackFromMain(feedback);

      // Should not close immediately
      expect(jumpScare.isJumpScareActive()).toBe(true);

      // Fast-forward 2.5 seconds
      vi.advanceTimersByTime(2500);
      expect(jumpScare.isJumpScareActive()).toBe(true);

      // Fast-forward to 3 seconds
      vi.advanceTimersByTime(500);
      
      // Should start fade-out
      const jumpscareLayer = document.getElementById('jumpscare-layer');
      expect(jumpscareLayer.style.opacity).toBe('0');

      vi.useRealTimers();
    });
  });

  describe('Incorrect Answer Feedback', () => {
    it('should display red feedback with error message for incorrect answers', () => {
      const feedback = {
        correct: false,
        message: 'Not quite right. Let\'s review the material.',
        explanation: 'Mitochondria are the powerhouse of the cell.',
        correctAnswer: 'Energy production'
      };

      jumpScare.showFeedbackFromMain(feedback);

      const feedbackEl = document.getElementById('feedback');
      expect(feedbackEl.style.display).toBe('block');
      expect(feedbackEl.classList.contains('incorrect')).toBe(true);
      expect(feedbackEl.textContent).toContain('✗');
      expect(feedbackEl.textContent).toContain('Not quite right');
    });

    it('should show correct answer for incorrect responses', () => {
      const feedback = {
        correct: false,
        message: 'Incorrect.',
        explanation: null,
        correctAnswer: 'Energy production'
      };

      jumpScare.showFeedbackFromMain(feedback);

      const feedbackEl = document.getElementById('feedback');
      expect(feedbackEl.textContent).toContain('Correct answer:');
      expect(feedbackEl.textContent).toContain('Energy production');
    });

    it('should show explanation for incorrect responses', () => {
      const feedback = {
        correct: false,
        message: 'Incorrect.',
        explanation: 'Mitochondria are responsible for cellular respiration.',
        correctAnswer: 'Energy production'
      };

      jumpScare.showFeedbackFromMain(feedback);

      const feedbackEl = document.getElementById('feedback');
      expect(feedbackEl.textContent).toContain('Mitochondria are responsible');
    });

    it('should close after 4.5 seconds for incorrect answers', () => {
      vi.useFakeTimers();

      const feedback = {
        correct: false,
        message: 'Incorrect.',
        explanation: 'Some explanation',
        correctAnswer: 'Test Answer'
      };

      jumpScare.showFeedbackFromMain(feedback);

      // Should not close immediately
      expect(jumpScare.isJumpScareActive()).toBe(true);

      // Fast-forward 4 seconds
      vi.advanceTimersByTime(4000);
      expect(jumpScare.isJumpScareActive()).toBe(true);

      // Fast-forward to 4.5 seconds
      vi.advanceTimersByTime(500);
      
      // Should start fade-out
      const jumpscareLayer = document.getElementById('jumpscare-layer');
      expect(jumpscareLayer.style.opacity).toBe('0');

      vi.useRealTimers();
    });
  });

  describe('Fade-Out Animation', () => {
    it('should apply fade-out transition when closing', () => {
      vi.useFakeTimers();

      jumpScare.trigger({ creature: { name: 'Test', art: 'ASCII', color: '#fff' } });
      jumpScare.closeWithFadeOut();

      const jumpscareLayer = document.getElementById('jumpscare-layer');
      expect(jumpscareLayer.style.transition).toContain('opacity');
      expect(jumpscareLayer.style.opacity).toBe('0');

      vi.useRealTimers();
    });

    it('should hide elements after fade-out completes', () => {
      vi.useFakeTimers();

      jumpScare.trigger({ creature: { name: 'Test', art: 'ASCII', color: '#fff' } });
      jumpScare.closeWithFadeOut();

      // Fast-forward past fade-out duration (1 second)
      vi.advanceTimersByTime(1000);

      const jumpscareLayer = document.getElementById('jumpscare-layer');
      expect(jumpscareLayer.style.display).toBe('none');
      expect(jumpScare.isJumpScareActive()).toBe(false);

      vi.useRealTimers();
    });

    it('should reset all elements after fade-out', () => {
      vi.useFakeTimers();

      // Set up a question first
      const question = {
        id: 'q1',
        text: 'Test question?',
        options: ['A', 'B', 'C'],
        correctAnswer: 0
      };

      jumpScare.trigger({ creature: { name: 'Test', art: 'ASCII', color: '#fff' } });
      jumpScare.showQuestion(question);

      // Show feedback
      const feedback = {
        correct: true,
        message: 'Correct!',
        correctAnswer: 'A'
      };
      jumpScare.showFeedbackFromMain(feedback);

      // Fast-forward to close
      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(1000); // Fade-out duration

      // Check elements are reset
      const questionContainer = document.getElementById('question-container');
      const feedbackEl = document.getElementById('feedback');
      const creatureAscii = document.getElementById('creature-ascii');

      expect(questionContainer.style.display).toBe('none');
      expect(feedbackEl.style.display).toBe('none');
      expect(feedbackEl.innerHTML).toBe('');
      expect(creatureAscii.textContent).toBe('');

      vi.useRealTimers();
    });
  });

  describe('Sequence Completion Notification', () => {
    it('should notify main process when sequence completes', () => {
      vi.useFakeTimers();

      const feedback = {
        correct: true,
        message: 'Correct!',
        correctAnswer: 'Test'
      };

      jumpScare.showFeedbackFromMain(feedback);

      // Fast-forward to close
      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(1000); // Fade-out duration

      // Should have called scareStageComplete with 'complete'
      expect(window.electronAPI.scareStageComplete).toHaveBeenCalledWith('complete');

      vi.useRealTimers();
    });

    it('should call notifySequenceComplete method', () => {
      vi.useFakeTimers();

      const notifySpy = vi.spyOn(jumpScare, 'notifySequenceComplete');

      jumpScare.closeWithFadeOut();

      // Fast-forward past fade-out
      vi.advanceTimersByTime(1000);

      expect(notifySpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should handle missing electronAPI gracefully', () => {
      vi.useFakeTimers();

      // Remove electronAPI
      delete window.electronAPI;

      // Should not throw error
      expect(() => {
        jumpScare.notifySequenceComplete();
      }).not.toThrow();

      vi.useRealTimers();
    });
  });

  describe('Feedback Message Structure', () => {
    it('should create proper HTML structure for feedback', () => {
      const feedback = {
        correct: false,
        message: 'Incorrect.',
        explanation: 'This is the explanation.',
        correctAnswer: 'The correct answer'
      };

      jumpScare.showFeedbackFromMain(feedback);

      const feedbackEl = document.getElementById('feedback');
      const messageDiv = feedbackEl.querySelector('.feedback-message');
      const mainDiv = feedbackEl.querySelector('.feedback-main');
      const correctAnswerDiv = feedbackEl.querySelector('.feedback-correct-answer');
      const explanationDiv = feedbackEl.querySelector('.feedback-explanation');

      expect(messageDiv).toBeTruthy();
      expect(mainDiv).toBeTruthy();
      expect(correctAnswerDiv).toBeTruthy();
      expect(explanationDiv).toBeTruthy();

      expect(mainDiv.textContent).toContain('✗');
      expect(mainDiv.textContent).toContain('Incorrect.');
      expect(correctAnswerDiv.textContent).toContain('The correct answer');
      expect(explanationDiv.textContent).toContain('This is the explanation.');
    });

    it('should clear previous feedback before showing new feedback', () => {
      // Show first feedback
      jumpScare.showFeedbackFromMain({
        correct: true,
        message: 'First message',
        correctAnswer: 'A'
      });

      const feedbackEl = document.getElementById('feedback');
      const firstContent = feedbackEl.innerHTML;

      // Show second feedback
      jumpScare.showFeedbackFromMain({
        correct: false,
        message: 'Second message',
        correctAnswer: 'B'
      });

      const secondContent = feedbackEl.innerHTML;

      expect(firstContent).not.toBe(secondContent);
      expect(feedbackEl.textContent).not.toContain('First message');
      expect(feedbackEl.textContent).toContain('Second message');
    });
  });

  describe('Local Feedback Fallback', () => {
    it('should show feedback using local method when electronAPI not available', () => {
      delete window.electronAPI;

      jumpScare.showFeedback(true, null);

      const feedbackEl = document.getElementById('feedback');
      expect(feedbackEl.style.display).toBe('block');
      expect(feedbackEl.classList.contains('correct')).toBe(true);
      expect(feedbackEl.textContent).toContain('✓');
      expect(feedbackEl.textContent).toContain('Correct! Well done!');
    });

    it('should show explanation in local feedback for incorrect answers', () => {
      jumpScare.showFeedback(false, 'This is why you were wrong.');

      const feedbackEl = document.getElementById('feedback');
      expect(feedbackEl.textContent).toContain('This is why you were wrong.');
    });
  });

  describe('Return to Background Mode', () => {
    it('should mark jump scare as inactive after closing', () => {
      vi.useFakeTimers();

      jumpScare.trigger({ creature: { name: 'Test', art: 'ASCII', color: '#fff' } });
      expect(jumpScare.isJumpScareActive()).toBe(true);

      jumpScare.closeWithFadeOut();
      vi.advanceTimersByTime(1000);

      expect(jumpScare.isJumpScareActive()).toBe(false);

      vi.useRealTimers();
    });

    it('should call legacy callback if defined', () => {
      vi.useFakeTimers();

      const callback = vi.fn();
      window.onJumpScareComplete = callback;

      jumpScare.closeWithFadeOut();
      vi.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
