/**
 * Tests for ESC key handling in scare window
 * Verifies that ESC key cancels the sequence at any stage
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('ESC Key Handling', () => {
  let dom;
  let window;
  let document;
  let mockElectronAPI;

  beforeEach(() => {
    // Load the HTML file
    const html = fs.readFileSync(
      path.join(__dirname, 'index.html'),
      'utf8'
    );

    // Create JSDOM instance
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost'
    });

    window = dom.window;
    document = window.document;

    // Mock electronAPI
    mockElectronAPI = {
      scareCancel: vi.fn(),
      scareStageComplete: vi.fn(),
      onShowQuestion: vi.fn(),
      onAnswerFeedback: vi.fn(),
      submitAnswer: vi.fn()
    };

    window.electronAPI = mockElectronAPI;

    // Mock creatures
    window.creatures = {
      getRandomCreature: () => ({
        name: 'Test Creature',
        art: 'ASCII ART',
        color: '#ff0000'
      })
    };

    // Load renderer script
    const rendererScript = fs.readFileSync(
      path.join(__dirname, 'renderer.js'),
      'utf8'
    );

    // Load JumpScare class
    const jumpScareScript = fs.readFileSync(
      path.join(__dirname, 'jumpscare.js'),
      'utf8'
    );

    // Load tunnel animation
    const tunnelScript = fs.readFileSync(
      path.join(__dirname, 'tunnel.js'),
      'utf8'
    );

    // Execute scripts in window context
    const scriptEl1 = document.createElement('script');
    scriptEl1.textContent = jumpScareScript;
    document.body.appendChild(scriptEl1);

    const scriptEl2 = document.createElement('script');
    scriptEl2.textContent = tunnelScript;
    document.body.appendChild(scriptEl2);

    const scriptEl3 = document.createElement('script');
    scriptEl3.textContent = rendererScript;
    document.body.appendChild(scriptEl3);

    // Trigger DOMContentLoaded
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Wait for initialization
    return new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });

  describe('ESC Key Listener Setup', () => {
    it('should set up ESC key listener on initialization', () => {
      // Verify that the cancelSequence function is exposed
      expect(window.cancelSequence).toBeDefined();
      expect(typeof window.cancelSequence).toBe('function');
    });

    it('should call cancelSequence when ESC key is pressed', () => {
      // Spy on cancelSequence
      const cancelSpy = vi.spyOn(window, 'cancelSequence');

      // Simulate ESC key press
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        bubbles: true
      });

      document.dispatchEvent(event);

      // Verify cancelSequence was called
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should call cancelSequence when ESC keyCode 27 is pressed', () => {
      // Spy on cancelSequence
      const cancelSpy = vi.spyOn(window, 'cancelSequence');

      // Simulate ESC key press with keyCode only (legacy support)
      const event = new window.KeyboardEvent('keydown', {
        keyCode: 27,
        bubbles: true
      });

      document.dispatchEvent(event);

      // Verify cancelSequence was called
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should not call cancelSequence for other keys', () => {
      // Spy on cancelSequence
      const cancelSpy = vi.spyOn(window, 'cancelSequence');

      // Simulate other key press
      const event = new window.KeyboardEvent('keydown', {
        key: 'Enter',
        keyCode: 13,
        bubbles: true
      });

      document.dispatchEvent(event);

      // Verify cancelSequence was NOT called
      expect(cancelSpy).not.toHaveBeenCalled();
    });
  });

  describe('Cancellation During Shake Stage', () => {
    it('should cancel shake stage and notify main process', () => {
      // Start shake sequence
      window.startShake();

      // Verify shake is active
      const shakeLayer = document.getElementById('shake-layer');
      expect(shakeLayer.style.display).toBe('block');

      // Press ESC
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Verify shake layer is hidden
      expect(shakeLayer.style.display).toBe('none');

      // Verify main process was notified
      expect(mockElectronAPI.scareCancel).toHaveBeenCalled();
    });

    it('should stop shake animation classes', () => {
      // Start shake sequence
      window.startShake();

      const shakeLayer = document.getElementById('shake-layer');

      // Wait for shake to start
      return new Promise(resolve => setTimeout(resolve, 100))
        .then(() => {
          // Press ESC
          const event = new window.KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true
          });
          document.dispatchEvent(event);

          // Verify all shake classes are removed
          expect(shakeLayer.classList.contains('shake-subtle')).toBe(false);
          expect(shakeLayer.classList.contains('shake-light')).toBe(false);
          expect(shakeLayer.classList.contains('shake-medium')).toBe(false);
          expect(shakeLayer.classList.contains('shake-strong')).toBe(false);
          expect(shakeLayer.classList.contains('shake-intense')).toBe(false);
        });
    });
  });

  describe('Cancellation During Dark Stage', () => {
    it('should cancel dark stage and notify main process', () => {
      // Transition to darkening stage
      window.transitionToDarkening();

      // Verify dark overlay is visible
      const darkOverlay = document.getElementById('dark-overlay');
      expect(darkOverlay.style.display).toBe('flex');

      // Press ESC
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Verify dark overlay is hidden
      expect(darkOverlay.style.display).toBe('none');

      // Verify main process was notified
      expect(mockElectronAPI.scareCancel).toHaveBeenCalled();
    });

    it('should remove click listener from dark overlay', () => {
      // Transition to darkening stage
      window.transitionToDarkening();

      const darkOverlay = document.getElementById('dark-overlay');

      // Press ESC
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Click on dark overlay should not trigger transition
      const clickSpy = vi.spyOn(window, 'transitionToTunnel');
      darkOverlay.click();

      // Verify transition was not called
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Cancellation During Tunnel Stage', () => {
    it('should cancel tunnel animation and notify main process', () => {
      // Transition to tunnel stage
      window.transitionToTunnel();

      const tunnelCanvas = document.getElementById('tunnel-canvas');
      expect(tunnelCanvas.style.display).toBe('block');

      // Press ESC
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Verify tunnel canvas is hidden
      expect(tunnelCanvas.style.display).toBe('none');

      // Verify main process was notified
      expect(mockElectronAPI.scareCancel).toHaveBeenCalled();
    });

    it('should stop tunnel animation', () => {
      // Transition to tunnel stage
      window.transitionToTunnel();

      // Verify tunnel animation is running
      expect(window.tunnelAnimation).toBeDefined();
      expect(window.tunnelAnimation.isAnimating).toBe(true);

      // Press ESC
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Verify tunnel animation is stopped
      expect(window.tunnelAnimation.isAnimating).toBe(false);
    });
  });

  describe('Cancellation During Jump Scare Stage', () => {
    it('should cancel jump scare and notify main process', () => {
      // Trigger jump scare
      window.transitionToJumpScare();

      // Verify jump scare is active
      expect(window.jumpScare.isJumpScareActive()).toBe(true);

      // Press ESC
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Verify jump scare is hidden
      expect(window.jumpScare.isJumpScareActive()).toBe(false);

      // Verify main process was notified
      expect(mockElectronAPI.scareCancel).toHaveBeenCalled();
    });

    it('should hide jump scare layer', () => {
      // Trigger jump scare
      window.transitionToJumpScare();

      const jumpscareLayer = document.getElementById('jumpscare-layer');
      expect(jumpscareLayer.style.display).toBe('flex');

      // Press ESC
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Verify jump scare layer is hidden
      expect(jumpscareLayer.style.display).toBe('none');
    });
  });

  describe('Cancellation During Question Stage', () => {
    it('should cancel question display and notify main process', () => {
      // Show question
      const testQuestion = {
        id: 'q1',
        text: 'Test question?',
        type: 'multiple-choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0
      };

      window.showJumpScareWithQuestion(testQuestion);

      // Verify question is displayed
      expect(window.jumpScare.isJumpScareActive()).toBe(true);

      // Press ESC
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Verify jump scare is hidden
      expect(window.jumpScare.isJumpScareActive()).toBe(false);

      // Verify main process was notified
      expect(mockElectronAPI.scareCancel).toHaveBeenCalled();
    });
  });

  describe('Cancel Sequence Function', () => {
    it('should reset current stage to null', () => {
      // Start shake
      window.startShake();

      // Cancel
      window.cancelSequence();

      // Verify stage is reset (we can't directly check currentStage, but we can verify behavior)
      // If we cancel again, it should handle gracefully
      expect(() => window.cancelSequence()).not.toThrow();
    });

    it('should notify main process via IPC', () => {
      // Cancel sequence
      window.cancelSequence();

      // Verify IPC was called
      expect(mockElectronAPI.scareCancel).toHaveBeenCalled();
    });

    it('should handle cancellation when no stage is active', () => {
      // Cancel without any active stage
      expect(() => window.cancelSequence()).not.toThrow();

      // Should still notify main process
      expect(mockElectronAPI.scareCancel).toHaveBeenCalled();
    });

    it('should work without electronAPI (testing mode)', () => {
      // Remove electronAPI
      window.electronAPI = null;

      // Cancel should not throw
      expect(() => window.cancelSequence()).not.toThrow();
    });
  });

  describe('Integration with Main Process', () => {
    it('should trigger timer reset after cancellation', () => {
      // This test verifies the IPC communication
      // The actual timer reset happens in the main process

      // Start a sequence
      window.startShake();

      // Cancel
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      document.dispatchEvent(event);

      // Verify the cancel IPC was sent
      expect(mockElectronAPI.scareCancel).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple cancellations', () => {
      // Cancel multiple times
      window.cancelSequence();
      window.cancelSequence();
      window.cancelSequence();

      // Each should send IPC message
      expect(mockElectronAPI.scareCancel).toHaveBeenCalledTimes(3);
    });
  });
});
