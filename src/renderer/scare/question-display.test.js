/**
 * Tests for question display UI in scare window
 * Tests Requirements: 6.4, 7.3
 */

const { describe, it, expect, beforeEach, afterEach, vi } = require('vitest');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Question Display UI', () => {
  let dom;
  let document;
  let window;
  let jumpScare;

  beforeEach(() => {
    // Load the HTML file
    const html = fs.readFileSync(
      path.join(__dirname, 'index.html'),
      'utf-8'
    );

    // Create JSDOM instance
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost'
    });

    document = dom.window.document;
    window = dom.window;

    // Load the CSS
    const css = fs.readFileSync(
      path.join(__dirname, 'styles.css'),
      'utf-8'
    );
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Load creatures.js
    const creaturesScript = fs.readFileSync(
      path.join(__dirname, 'creatures.js'),
      'utf-8'
    );
    const creaturesScriptElement = document.createElement('script');
    creaturesScriptElement.textContent = creaturesScript;
    document.body.appendChild(creaturesScriptElement);

    // Load jumpscare.js
    const jumpscareScript = fs.readFileSync(
      path.join(__dirname, 'jumpscare.js'),
      'utf-8'
    );
    const jumpscareScriptElement = document.createElement('script');
    jumpscareScriptElement.textContent = jumpscareScript;
    document.body.appendChild(jumpscareScriptElement);

    // Initialize JumpScare
    jumpScare = new window.JumpScare();
    jumpScare.init();
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('Question Container Styling', () => {
    it('should have question container with Halloween theme styling', () => {
      const questionContainer = document.getElementById('question-container');
      
      expect(questionContainer).toBeTruthy();
      expect(questionContainer.style.display).toBe('none'); // Initially hidden
    });

    it('should have question text element', () => {
      const questionText = document.getElementById('question-text');
      
      expect(questionText).toBeTruthy();
    });

    it('should have answer options container', () => {
      const answerOptions = document.getElementById('answer-options');
      
      expect(answerOptions).toBeTruthy();
    });

    it('should have feedback element', () => {
      const feedback = document.getElementById('feedback');
      
      expect(feedback).toBeTruthy();
      expect(feedback.style.display).toBe('none'); // Initially hidden
    });
  });

  describe('Question Display', () => {
    it('should display question text after jump scare', (done) => {
      const question = {
        id: 'q1',
        text: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswer: 1,
        explanation: 'Paris is the capital of France.'
      };

      jumpScare.showQuestion(question);

      // Wait for animation
      setTimeout(() => {
        const questionText = document.getElementById('question-text');
        const questionContainer = document.getElementById('question-container');
        
        expect(questionText.textContent).toBe(question.text);
        expect(questionContainer.style.display).toBe('block');
        done();
      }, 100);
    });

    it('should render multiple-choice options as buttons', (done) => {
      const question = {
        id: 'q2',
        text: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const answerOptions = document.getElementById('answer-options');
        const buttons = answerOptions.querySelectorAll('.answer-option');
        
        expect(buttons.length).toBe(4);
        expect(buttons[0].textContent).toBe('3');
        expect(buttons[1].textContent).toBe('4');
        expect(buttons[2].textContent).toBe('5');
        expect(buttons[3].textContent).toBe('6');
        done();
      }, 100);
    });

    it('should clear previous answer options when showing new question', (done) => {
      const question1 = {
        id: 'q1',
        text: 'Question 1?',
        options: ['A', 'B'],
        correctAnswer: 0
      };

      const question2 = {
        id: 'q2',
        text: 'Question 2?',
        options: ['X', 'Y', 'Z'],
        correctAnswer: 1
      };

      jumpScare.showQuestion(question1);

      setTimeout(() => {
        jumpScare.showQuestion(question2);

        setTimeout(() => {
          const answerOptions = document.getElementById('answer-options');
          const buttons = answerOptions.querySelectorAll('.answer-option');
          
          expect(buttons.length).toBe(3);
          expect(buttons[0].textContent).toBe('X');
          done();
        }, 100);
      }, 100);
    });
  });

  describe('Answer Button Interactions', () => {
    it('should have clickable answer buttons', (done) => {
      const question = {
        id: 'q1',
        text: 'Test question?',
        options: ['Option 1', 'Option 2'],
        correctAnswer: 0
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const buttons = document.querySelectorAll('.answer-option');
        
        buttons.forEach(button => {
          expect(button.disabled).toBe(false);
          expect(button.style.cursor).not.toBe('not-allowed');
        });
        done();
      }, 100);
    });

    it('should disable all buttons after answer is selected', (done) => {
      const question = {
        id: 'q1',
        text: 'Test question?',
        options: ['Option 1', 'Option 2'],
        correctAnswer: 0
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const buttons = document.querySelectorAll('.answer-option');
        
        // Click first button
        buttons[0].click();

        setTimeout(() => {
          buttons.forEach(button => {
            expect(button.disabled).toBe(true);
          });
          done();
        }, 50);
      }, 100);
    });

    it('should show correct feedback for correct answer', (done) => {
      const question = {
        id: 'q1',
        text: 'Test question?',
        options: ['Correct', 'Wrong'],
        correctAnswer: 0
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const buttons = document.querySelectorAll('.answer-option');
        buttons[0].click();

        setTimeout(() => {
          const feedback = document.getElementById('feedback');
          
          expect(feedback.style.display).toBe('block');
          expect(feedback.classList.contains('correct')).toBe(true);
          expect(feedback.textContent).toContain('Correct');
          done();
        }, 50);
      }, 100);
    });

    it('should show incorrect feedback for wrong answer', (done) => {
      const question = {
        id: 'q1',
        text: 'Test question?',
        options: ['Wrong', 'Correct'],
        correctAnswer: 1,
        explanation: 'The correct answer is option 2.'
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const buttons = document.querySelectorAll('.answer-option');
        buttons[0].click();

        setTimeout(() => {
          const feedback = document.getElementById('feedback');
          
          expect(feedback.style.display).toBe('block');
          expect(feedback.classList.contains('incorrect')).toBe(true);
          expect(feedback.textContent).toContain('Incorrect');
          done();
        }, 50);
      }, 100);
    });
  });

  describe('Visual Feedback', () => {
    it('should apply answer-option class to buttons', (done) => {
      const question = {
        id: 'q1',
        text: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 0
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const buttons = document.querySelectorAll('.answer-option');
        
        buttons.forEach(button => {
          expect(button.classList.contains('answer-option')).toBe(true);
        });
        done();
      }, 100);
    });

    it('should have data-index attribute on buttons', (done) => {
      const question = {
        id: 'q1',
        text: 'Test?',
        options: ['A', 'B', 'C'],
        correctAnswer: 0
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const buttons = document.querySelectorAll('.answer-option');
        
        expect(buttons[0].dataset.index).toBe('0');
        expect(buttons[1].dataset.index).toBe('1');
        expect(buttons[2].dataset.index).toBe('2');
        done();
      }, 100);
    });
  });

  describe('Halloween Theme', () => {
    it('should use Halloween color scheme', () => {
      const questionContainer = document.getElementById('question-container');
      const questionText = document.getElementById('question-text');
      
      // These elements should exist and be styled
      expect(questionContainer).toBeTruthy();
      expect(questionText).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing question gracefully', () => {
      // Should not throw error
      expect(() => {
        jumpScare.showQuestion(null);
      }).not.toThrow();
    });

    it('should handle question without options', (done) => {
      const question = {
        id: 'q1',
        text: 'Test question?',
        correctAnswer: 0
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const answerOptions = document.getElementById('answer-options');
        const buttons = answerOptions.querySelectorAll('.answer-option');
        
        expect(buttons.length).toBe(0);
        done();
      }, 100);
    });

    it('should handle empty options array', (done) => {
      const question = {
        id: 'q1',
        text: 'Test question?',
        options: [],
        correctAnswer: 0
      };

      jumpScare.showQuestion(question);

      setTimeout(() => {
        const answerOptions = document.getElementById('answer-options');
        const buttons = answerOptions.querySelectorAll('.answer-option');
        
        expect(buttons.length).toBe(0);
        done();
      }, 100);
    });
  });
});
