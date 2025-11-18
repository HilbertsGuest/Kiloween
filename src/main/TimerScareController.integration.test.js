import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EventEmitter from 'events';
import TimerManager from './TimerManager.js';
import ScareController from './ScareController.js';

describe('TimerManager and ScareController Integration', () => {
  let configManager;
  let questionGenerator;
  let timerManager;
  let scareController;
  let mockScareWindow;

  beforeEach(() => {
    // Mock ConfigManager
    configManager = {
      get: vi.fn((key) => {
        if (key === 'interval') return 30; // 30 minutes
        return null;
      }),
      set: vi.fn(),
      config: { interval: 30 }
    };

    // Mock QuestionGenerator
    questionGenerator = {
      getNextQuestion: vi.fn(() => ({
        id: 'q1',
        text: 'Test question?',
        type: 'multiple-choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Test explanation'
      })),
      markQuestionUsed: vi.fn()
    };

    // Mock BrowserWindow
    mockScareWindow = {
      webContents: {
        send: vi.fn(),
        isLoading: vi.fn(() => false)
      },
      isDestroyed: vi.fn(() => false),
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn()
    };

    // Create instances
    timerManager = new TimerManager(configManager);
    scareController = new ScareController(questionGenerator);
    scareController.setScareWindow(mockScareWindow);
  });

  afterEach(() => {
    if (timerManager) {
      timerManager.destroy();
    }
    if (scareController) {
      scareController.destroy();
    }
  });

  describe('Timer Expiration triggers Scare Sequence', () => {
    it('should trigger scare sequence when timer expires', async () => {
      // Set up event listeners
      const timerExpiredPromise = new Promise(resolve => {
        timerManager.once('expired', resolve);
      });

      const sequenceStartPromise = new Promise(resolve => {
        scareController.once('sequence-start', resolve);
      });

      // Connect timer to scare controller
      timerManager.on('expired', async () => {
        await scareController.startSequence();
      });

      // Manually trigger timer expiration for testing
      timerManager.remainingTime = 0;
      timerManager._onTimerExpired();

      // Wait for events
      await timerExpiredPromise;
      await sequenceStartPromise;

      // Verify scare sequence started
      expect(scareController.isActive()).toBe(true);
      expect(mockScareWindow.webContents.send).toHaveBeenCalledWith('start-shake');
    });

    it('should reset timer after sequence ends normally', async () => {
      const resetSpy = vi.spyOn(timerManager, 'reset');
      const startSpy = vi.spyOn(timerManager, 'start');

      // Set up connection
      scareController.on('sequence-end', () => {
        timerManager.reset();
        timerManager.start();
      });

      // Start and end sequence
      await scareController.startSequence();
      scareController.endSequence();

      // Verify timer was reset and restarted
      expect(resetSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should reset timer after sequence is cancelled', async () => {
      const resetSpy = vi.spyOn(timerManager, 'reset');
      const startSpy = vi.spyOn(timerManager, 'start');

      // Set up connection
      scareController.on('sequence-cancelled', () => {
        timerManager.reset();
        timerManager.start();
      });

      // Start and cancel sequence
      await scareController.startSequence();
      scareController.cancelSequence();

      // Verify timer was reset and restarted
      expect(resetSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('ESC Key Cancellation', () => {
    it('should cancel sequence and reset timer on ESC key', async () => {
      const resetSpy = vi.spyOn(timerManager, 'reset');
      const startSpy = vi.spyOn(timerManager, 'start');

      // Set up connection
      scareController.on('sequence-cancelled', () => {
        timerManager.reset();
        timerManager.start();
      });

      // Start sequence
      await scareController.startSequence();
      expect(scareController.isActive()).toBe(true);

      // Simulate ESC key press (which calls cancelSequence)
      scareController.cancelSequence();

      // Verify sequence was cancelled
      expect(scareController.isActive()).toBe(false);
      expect(mockScareWindow.hide).toHaveBeenCalled();

      // Verify timer was reset and restarted
      expect(resetSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should handle ESC during different stages', async () => {
      const stages = ['shake', 'darken', 'tunnel', 'jumpscare'];

      for (const stage of stages) {
        // Reset for each test
        scareController = new ScareController(questionGenerator);
        scareController.setScareWindow(mockScareWindow);

        const resetSpy = vi.spyOn(timerManager, 'reset');

        scareController.on('sequence-cancelled', () => {
          timerManager.reset();
        });

        // Start sequence and set stage
        await scareController.startSequence();
        scareController.currentStage = stage;

        // Cancel
        scareController.cancelSequence();

        // Verify cancellation worked
        expect(scareController.isActive()).toBe(false);
        expect(resetSpy).toHaveBeenCalled();

        // Clean up
        scareController.destroy();
      }
    });
  });

  describe('Error Handling', () => {
    it('should reset timer on scare sequence error', async () => {
      const resetSpy = vi.spyOn(timerManager, 'reset');
      const startSpy = vi.spyOn(timerManager, 'start');

      // Set up error handler
      scareController.on('error', () => {
        timerManager.reset();
        timerManager.start();
      });

      // Simulate error by removing question generator
      scareController.questionGenerator = null;

      // Try to start sequence (should error)
      try {
        await scareController.startSequence();
      } catch (error) {
        // Expected error
      }

      // Manually emit error for testing
      scareController.emit('error', new Error('Test error'));

      // Verify timer was reset and restarted
      expect(resetSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should handle window destroyed during sequence', async () => {
      const resetSpy = vi.spyOn(timerManager, 'reset');

      scareController.on('sequence-cancelled', () => {
        timerManager.reset();
      });

      // Start sequence
      await scareController.startSequence();

      // Simulate window destroyed
      mockScareWindow.isDestroyed = vi.fn(() => true);

      // Try to cancel (should handle gracefully)
      scareController.cancelSequence();

      // Verify timer was reset
      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('Full Timer-to-Scare Flow', () => {
    it('should complete full cycle: timer expire -> scare -> answer -> reset', async () => {
      const events = [];

      // Track all events
      timerManager.on('expired', () => events.push('timer-expired'));
      scareController.on('sequence-start', () => events.push('sequence-start'));
      scareController.on('stage-change', (stage) => events.push(`stage-${stage}`));
      scareController.on('question-shown', () => events.push('question-shown'));
      scareController.on('answer-submitted', () => events.push('answer-submitted'));
      scareController.on('sequence-end', () => events.push('sequence-end'));

      // Set up connections
      timerManager.on('expired', async () => {
        await scareController.startSequence();
      });

      scareController.on('sequence-end', () => {
        timerManager.reset();
        timerManager.start();
        events.push('timer-reset');
      });

      // Trigger timer expiration
      timerManager.remainingTime = 0;
      timerManager._onTimerExpired();

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate stage completions
      scareController._handleStageComplete('shake');
      scareController._handleStageComplete('darken');
      scareController._handleStageComplete('tunnel');
      scareController._handleStageComplete('jumpscare');

      // Wait for question to be shown
      await new Promise(resolve => setTimeout(resolve, 50));

      // Submit answer
      scareController._handleAnswerSubmit(0);

      // Wait for sequence to end
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Verify event sequence
      expect(events).toContain('timer-expired');
      expect(events).toContain('sequence-start');
      expect(events).toContain('stage-shake');
      expect(events).toContain('question-shown');
      expect(events).toContain('answer-submitted');
      expect(events).toContain('sequence-end');
      expect(events).toContain('timer-reset');
    });

    it('should handle rapid timer expirations gracefully', async () => {
      let sequenceStartCount = 0;

      scareController.on('sequence-start', () => {
        sequenceStartCount++;
      });

      timerManager.on('expired', async () => {
        if (!scareController.isActive()) {
          await scareController.startSequence();
        }
      });

      // Trigger multiple expirations
      timerManager.remainingTime = 0;
      timerManager._onTimerExpired();
      timerManager._onTimerExpired();
      timerManager._onTimerExpired();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only start sequence once
      expect(sequenceStartCount).toBe(1);
    });
  });

  describe('Timer State Management', () => {
    it('should maintain timer state during scare sequence', async () => {
      // Start timer
      timerManager.start();
      expect(timerManager.isRunning).toBe(true);

      // Timer expires and triggers scare
      timerManager.on('expired', async () => {
        await scareController.startSequence();
      });

      timerManager.remainingTime = 0;
      timerManager._onTimerExpired();

      // Timer should be stopped after expiration
      expect(timerManager.isRunning).toBe(false);

      // Sequence ends and resets timer
      scareController.on('sequence-end', () => {
        timerManager.reset();
        timerManager.start();
      });

      scareController.endSequence();

      // Timer should be running again
      expect(timerManager.isRunning).toBe(true);
    });

    it('should preserve timer interval through sequence cycle', async () => {
      const originalInterval = configManager.get('interval');

      // Complete a full cycle
      timerManager.on('expired', async () => {
        await scareController.startSequence();
      });

      scareController.on('sequence-end', () => {
        timerManager.reset();
      });

      timerManager.remainingTime = 0;
      timerManager._onTimerExpired();

      await new Promise(resolve => setTimeout(resolve, 50));

      scareController.endSequence();

      // Interval should remain the same
      expect(timerManager.currentInterval).toBe(originalInterval);
    });
  });
});
