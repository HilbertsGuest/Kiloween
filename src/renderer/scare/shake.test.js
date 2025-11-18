/**
 * Tests for screen shake effect
 * Requirements: 3.1, 3.2, 3.3
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Screen Shake Effect', () => {
  let dom;
  let document;
  let window;
  let shakeLayer;

  beforeEach(() => {
    // Load the HTML
    const html = fs.readFileSync(
      path.join(__dirname, 'index.html'),
      'utf-8'
    );

    // Load the CSS
    const css = fs.readFileSync(
      path.join(__dirname, 'styles.css'),
      'utf-8'
    );

    // Create DOM with styles
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Load scripts in correct order (same as index.html)
    const scripts = ['audio.js', 'creatures.js', 'jumpscare.js', 'renderer.js', 'tunnel.js'];
    scripts.forEach(scriptFile => {
      const scriptContent = fs.readFileSync(
        path.join(__dirname, scriptFile),
        'utf-8'
      );
      const scriptElement = document.createElement('script');
      scriptElement.textContent = scriptContent;
      document.body.appendChild(scriptElement);
    });

    // Trigger DOMContentLoaded
    const event = new dom.window.Event('DOMContentLoaded');
    document.dispatchEvent(event);

    shakeLayer = document.getElementById('shake-layer');

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (dom) {
      dom.window.close();
    }
  });

  describe('Shake Layer Structure', () => {
    it('should have shake layer element', () => {
      expect(shakeLayer).toBeTruthy();
      expect(shakeLayer.id).toBe('shake-layer');
    });

    it('should be hidden by default', () => {
      const display = window.getComputedStyle(shakeLayer).display;
      expect(display).toBe('none');
    });

    it('should have correct positioning', () => {
      const styles = window.getComputedStyle(shakeLayer);
      expect(styles.position).toBe('absolute');
    });
  });

  describe('Shake Animation Classes', () => {
    it('should have shake-subtle class defined in styles', () => {
      const styleSheets = Array.from(document.styleSheets);
      const hasShakeSubtle = styleSheets.some(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          return rules.some(rule => 
            rule.selectorText && rule.selectorText.includes('shake-subtle')
          );
        } catch (e) {
          return false;
        }
      });
      expect(hasShakeSubtle).toBe(true);
    });

    it('should have multiple shake intensity levels', () => {
      const expectedClasses = [
        'shake-subtle',
        'shake-light',
        'shake-medium',
        'shake-strong',
        'shake-intense'
      ];

      const styleSheets = Array.from(document.styleSheets);
      expectedClasses.forEach(className => {
        const hasClass = styleSheets.some(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            return rules.some(rule => 
              rule.selectorText && rule.selectorText.includes(className)
            );
          } catch (e) {
            return false;
          }
        });
        expect(hasClass).toBe(true);
      });
    });
  });

  describe('startShake Function', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should be exposed on window object', () => {
      expect(typeof window.startShake).toBe('function');
    });

    it('should show shake layer when started', () => {
      window.startShake();
      expect(shakeLayer.style.display).toBe('block');
    });

    it('should apply initial shake class', () => {
      window.startShake();
      expect(shakeLayer.classList.contains('shake-subtle')).toBe(true);
    });

    it('should progress through shake levels', () => {
      window.startShake();
      
      // Initial level
      expect(shakeLayer.classList.contains('shake-subtle')).toBe(true);
      
      // Progress to light
      vi.advanceTimersByTime(600);
      expect(shakeLayer.classList.contains('shake-light')).toBe(true);
      expect(shakeLayer.classList.contains('shake-subtle')).toBe(false);
      
      // Progress to medium
      vi.advanceTimersByTime(800);
      expect(shakeLayer.classList.contains('shake-medium')).toBe(true);
      expect(shakeLayer.classList.contains('shake-light')).toBe(false);
    });

    it('should complete shake sequence within 5 seconds', () => {
      window.startShake();
      
      // Total duration: 600 + 800 + 1000 + 1200 + 1400 = 5000ms
      vi.advanceTimersByTime(5000);
      
      // Should have transitioned to darkening
      expect(console.log).toHaveBeenCalledWith('Shake sequence complete');
      expect(console.log).toHaveBeenCalledWith('Transitioning to darkening stage');
    });

    it('should hide shake layer after completion', () => {
      window.startShake();
      
      // Complete the shake sequence
      vi.advanceTimersByTime(5000);
      
      expect(shakeLayer.style.display).toBe('none');
    });

    it('should remove all shake classes after completion', () => {
      window.startShake();
      
      // Complete the shake sequence
      vi.advanceTimersByTime(5000);
      
      const shakeClasses = ['shake-subtle', 'shake-light', 'shake-medium', 'shake-strong', 'shake-intense'];
      shakeClasses.forEach(className => {
        expect(shakeLayer.classList.contains(className)).toBe(false);
      });
    });
  });

  describe('Shake Progression Timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should have progressive duration (3-5 seconds total)', () => {
      window.startShake();
      
      // Initial state
      expect(shakeLayer.classList.contains('shake-subtle')).toBe(true);
      
      // After 600ms -> shake-light
      vi.advanceTimersByTime(600);
      expect(shakeLayer.classList.contains('shake-light')).toBe(true);
      
      // After 800ms more (1400ms total) -> shake-medium
      vi.advanceTimersByTime(800);
      expect(shakeLayer.classList.contains('shake-medium')).toBe(true);
      
      // After 1000ms more (2400ms total) -> shake-strong
      vi.advanceTimersByTime(1000);
      expect(shakeLayer.classList.contains('shake-strong')).toBe(true);
      
      // After 1200ms more (3600ms total) -> shake-intense
      vi.advanceTimersByTime(1200);
      expect(shakeLayer.classList.contains('shake-intense')).toBe(true);
    });

    it('should increase shake intensity over time', () => {
      window.startShake();
      
      // Verify progression from subtle to intense
      expect(shakeLayer.classList.contains('shake-subtle')).toBe(true);
      expect(shakeLayer.classList.contains('shake-light')).toBe(false);
      
      vi.advanceTimersByTime(600);
      expect(shakeLayer.classList.contains('shake-light')).toBe(true);
      expect(shakeLayer.classList.contains('shake-subtle')).toBe(false);
      
      vi.advanceTimersByTime(800);
      expect(shakeLayer.classList.contains('shake-medium')).toBe(true);
      expect(shakeLayer.classList.contains('shake-light')).toBe(false);
      
      vi.advanceTimersByTime(1000);
      expect(shakeLayer.classList.contains('shake-strong')).toBe(true);
      expect(shakeLayer.classList.contains('shake-medium')).toBe(false);
      
      vi.advanceTimersByTime(1200);
      expect(shakeLayer.classList.contains('shake-intense')).toBe(true);
      expect(shakeLayer.classList.contains('shake-strong')).toBe(false);
    });
  });

  describe('Transition to Next Stage', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should transition to darkening after shake completes', () => {
      window.startShake();
      
      vi.advanceTimersByTime(5000);
      
      const darkOverlay = document.getElementById('dark-overlay');
      expect(darkOverlay.style.display).toBe('flex');
    });

    it('should log stage transition', () => {
      window.startShake();
      
      vi.advanceTimersByTime(5000);
      
      expect(console.log).toHaveBeenCalledWith('Transitioning to darkening stage');
    });
  });
});
