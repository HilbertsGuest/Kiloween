// Tests for jump scare functionality
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('JumpScare', () => {
  let dom;
  let document;
  let window;
  let JumpScare;
  let creatures;

  beforeEach(async () => {
    // Create a fresh DOM for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="jumpscare-layer" style="display: none;">
            <pre id="creature-ascii"></pre>
            <div id="question-container" style="display: none;">
              <h2 id="question-text"></h2>
              <div id="answer-options"></div>
              <div id="feedback" style="display: none;"></div>
            </div>
          </div>
          <canvas id="tunnel-canvas"></canvas>
        </body>
      </html>
    `);

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

    // Load creatures module
    const creaturesModule = await import('./creatures.js');
    creatures = creaturesModule;
    window.creatures = creatures;

    // Load JumpScare class
    const jumpScareModule = await import('./jumpscare.js');
    JumpScare = jumpScareModule.default;
  });

  describe('Initialization', () => {
    it('should initialize with DOM elements', () => {
      const jumpScare = new JumpScare();
      const result = jumpScare.init();

      expect(result).toBe(true);
      expect(jumpScare.jumpscareLayer).toBeTruthy();
      expect(jumpScare.creatureAscii).toBeTruthy();
      expect(jumpScare.questionContainer).toBeTruthy();
    });

    it('should return false if elements are missing', () => {
      // Remove required element
      const element = document.getElementById('creature-ascii');
      element.remove();

      const jumpScare = new JumpScare();
      const result = jumpScare.init();

      expect(result).toBe(false);
    });

    it('should start with isActive as false', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      expect(jumpScare.isJumpScareActive()).toBe(false);
    });
  });

  describe('Trigger Jump Scare', () => {
    it('should trigger jump scare with random creature', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      jumpScare.trigger();

      // Wait for animations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(jumpScare.isJumpScareActive()).toBe(true);
      expect(jumpScare.jumpscareLayer.style.display).toBe('flex');
      expect(jumpScare.currentCreature).toBeTruthy();
      expect(jumpScare.creatureAscii.textContent).toBe(jumpScare.currentCreature.art);
    });

    it('should trigger jump scare with specific creature', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const ghost = creatures.getCreatureByName('ghost');
      jumpScare.trigger({ creature: ghost });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(jumpScare.getCurrentCreature().name).toBe('ghost');
      expect(jumpScare.creatureAscii.textContent).toBe(ghost.art);
    });

    it('should hide tunnel canvas when triggered', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const tunnelCanvas = document.getElementById('tunnel-canvas');
      tunnelCanvas.style.display = 'block';

      jumpScare.trigger();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(tunnelCanvas.style.display).toBe('none');
    });

    it('should apply creature color and shadow', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const demon = creatures.getCreatureByName('demon');
      jumpScare.trigger({ creature: demon });

      await new Promise(resolve => setTimeout(resolve, 50));

      // JSDOM converts hex colors to rgb format
      expect(jumpScare.creatureAscii.style.color).toBeTruthy();
      expect(jumpScare.creatureAscii.style.textShadow).toBeTruthy();
      expect(jumpScare.creatureAscii.style.textShadow).toContain(demon.color);
    });

    it('should show question after delay if provided', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const question = {
        id: 'q1',
        text: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1
      };

      jumpScare.trigger({ question });

      // Wait for question delay (1500ms)
      await new Promise(resolve => setTimeout(resolve, 1600));

      expect(jumpScare.questionContainer.style.display).toBe('block');
      expect(jumpScare.questionText.textContent).toBe(question.text);
    });
  });

  describe('Show Question', () => {
    it('should display question text', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const question = {
        text: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswer: 1
      };

      jumpScare.showQuestion(question);

      expect(jumpScare.questionText.textContent).toBe(question.text);
    });

    it('should create answer option buttons', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const question = {
        text: 'Test question?',
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 0
      };

      jumpScare.showQuestion(question);

      const buttons = jumpScare.answerOptions.querySelectorAll('.answer-option');
      expect(buttons.length).toBe(3);
      expect(buttons[0].textContent).toBe('Option A');
      expect(buttons[1].textContent).toBe('Option B');
      expect(buttons[2].textContent).toBe('Option C');
    });

    it('should handle missing question gracefully', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      jumpScare.showQuestion(null);

      expect(consoleSpy).toHaveBeenCalledWith('No question provided');
      consoleSpy.mockRestore();
    });

    it('should clear previous answer options', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      // Add first question
      jumpScare.showQuestion({
        text: 'Question 1?',
        options: ['A', 'B'],
        correctAnswer: 0
      });

      let buttons = jumpScare.answerOptions.querySelectorAll('.answer-option');
      expect(buttons.length).toBe(2);

      // Add second question
      jumpScare.showQuestion({
        text: 'Question 2?',
        options: ['X', 'Y', 'Z'],
        correctAnswer: 1
      });

      buttons = jumpScare.answerOptions.querySelectorAll('.answer-option');
      expect(buttons.length).toBe(3);
    });
  });

  describe('Answer Handling', () => {
    it('should disable buttons after answer selection', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const question = {
        id: 'q1',
        text: 'Test?',
        options: ['A', 'B', 'C'],
        correctAnswer: 1
      };

      jumpScare.showQuestion(question);
      jumpScare.handleAnswerClick(1, question);

      const buttons = jumpScare.answerOptions.querySelectorAll('.answer-option');
      buttons.forEach(btn => {
        expect(btn.disabled).toBe(true);
      });
    });

    it('should show correct feedback for correct answer', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      jumpScare.showFeedback(true, 'Great job!');

      expect(jumpScare.feedback.style.display).toBe('block');
      expect(jumpScare.feedback.className).toBe('correct');
      expect(jumpScare.feedback.textContent).toContain('Correct');
    });

    it('should show incorrect feedback with explanation', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const explanation = 'The correct answer is B because...';
      jumpScare.showFeedback(false, explanation);

      expect(jumpScare.feedback.style.display).toBe('block');
      expect(jumpScare.feedback.className).toBe('incorrect');
      expect(jumpScare.feedback.textContent).toContain('Incorrect');
      expect(jumpScare.feedback.textContent).toContain(explanation);
    });

    it('should show default incorrect feedback without explanation', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      jumpScare.showFeedback(false);

      expect(jumpScare.feedback.textContent).toContain('Try again next time');
    });

    it('should auto-close after feedback', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const closeSpy = vi.spyOn(jumpScare, 'close');

      jumpScare.showFeedback(true);

      // Wait for auto-close delay (3000ms)
      await new Promise(resolve => setTimeout(resolve, 3100));

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Close Jump Scare', () => {
    it('should hide jumpscare layer', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      jumpScare.trigger();
      await new Promise(resolve => setTimeout(resolve, 50));

      jumpScare.close();

      // Wait for fade out
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(jumpScare.jumpscareLayer.style.display).toBe('none');
      expect(jumpScare.isJumpScareActive()).toBe(false);
    });

    it('should hide question container and feedback', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      jumpScare.trigger();
      jumpScare.showQuestion({
        text: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 0
      });

      jumpScare.close();

      await new Promise(resolve => setTimeout(resolve, 600));

      expect(jumpScare.questionContainer.style.display).toBe('none');
      expect(jumpScare.feedback.style.display).toBe('none');
    });

    it('should call onJumpScareComplete callback if defined', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const callback = vi.fn();
      window.onJumpScareComplete = callback;

      jumpScare.close();

      await new Promise(resolve => setTimeout(resolve, 600));

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should track current creature', () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      const skull = creatures.getCreatureByName('skull');
      jumpScare.trigger({ creature: skull });

      expect(jumpScare.getCurrentCreature()).toBe(skull);
    });

    it('should track active state', async () => {
      const jumpScare = new JumpScare();
      jumpScare.init();

      expect(jumpScare.isJumpScareActive()).toBe(false);

      jumpScare.trigger();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(jumpScare.isJumpScareActive()).toBe(true);

      jumpScare.close();
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(jumpScare.isJumpScareActive()).toBe(false);
    });
  });
});
