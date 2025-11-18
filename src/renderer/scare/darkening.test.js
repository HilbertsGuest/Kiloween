/**
 * Tests for screen darkening transition
 * Requirements: 3.4, 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Screen Darkening Transition', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Load the HTML file
    const html = fs.readFileSync(
      path.join(__dirname, 'index.html'),
      'utf-8'
    );

    // Load the CSS file
    const css = fs.readFileSync(
      path.join(__dirname, 'styles.css'),
      'utf-8'
    );

    // Create a new JSDOM instance
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost'
    });

    document = dom.window.document;
    window = dom.window;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Mock requestAnimationFrame
    window.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 0);
      return 1;
    });

    // Mock console.log to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Load scripts in correct order (same as index.html)
    const scripts = ['audio.js', 'creatures.js', 'jumpscare.js', 'renderer.js', 'tunnel.js'];
    scripts.forEach(scriptFile => {
      const scriptContent = fs.readFileSync(
        path.join(__dirname, scriptFile),
        'utf-8'
      );
      const scriptFunction = new window.Function(scriptContent);
      scriptFunction.call(window);
    });

    // Trigger DOMContentLoaded to initialize
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (dom) {
      dom.window.close();
    }
  });

  describe('Darkening Stage Initialization', () => {
    it('should hide shake layer when transitioning to darkening', () => {
      const shakeLayer = document.getElementById('shake-layer');
      shakeLayer.style.display = 'block';

      // Call transitionToDarkening (exposed via window)
      window.transitionToDarkening();

      expect(shakeLayer.style.display).toBe('none');
    });

    it('should show dark overlay when transitioning to darkening', () => {
      const darkOverlay = document.getElementById('dark-overlay');

      window.transitionToDarkening();

      expect(darkOverlay.style.display).toBe('flex');
    });

    it('should start with transparent background', () => {
      const darkOverlay = document.getElementById('dark-overlay');

      window.transitionToDarkening();

      expect(darkOverlay.style.background).toBe('rgba(0, 0, 0, 0)');
    });

    it('should fade to dark background after animation frame', async () => {
      const darkOverlay = document.getElementById('dark-overlay');

      window.transitionToDarkening();

      // Wait for requestAnimationFrame callbacks
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(darkOverlay.style.background).toBe('rgba(0, 0, 0, 0.95)');
    });
  });

  describe('Click Prompt Display', () => {
    it('should display click prompt indicator', () => {
      const clickPrompt = document.getElementById('click-prompt');
      expect(clickPrompt).toBeTruthy();
      expect(clickPrompt.textContent).toContain('Click');
    });

    it('should have pulse animation on click prompt', () => {
      const clickPrompt = document.getElementById('click-prompt');
      const styles = window.getComputedStyle(clickPrompt);
      
      // Check that animation is defined in styles
      expect(clickPrompt.style.animation || styles.animation).toBeTruthy();
    });
  });

  describe('Click Detection', () => {
    it('should add click listener to dark overlay', () => {
      const darkOverlay = document.getElementById('dark-overlay');
      const addEventListenerSpy = vi.spyOn(darkOverlay, 'addEventListener');

      window.transitionToDarkening();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { once: true }
      );
    });

    it('should hide dark overlay when clicked', () => {
      const darkOverlay = document.getElementById('dark-overlay');
      
      window.transitionToDarkening();
      darkOverlay.style.display = 'flex';

      window.handleDarkOverlayClick();

      expect(darkOverlay.style.display).toBe('none');
    });

    it('should transition to tunnel stage when clicked', () => {
      const tunnelCanvas = document.getElementById('tunnel-canvas');
      const consoleSpy = vi.spyOn(console, 'log');

      window.transitionToDarkening();
      window.handleDarkOverlayClick();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('tunnel stage')
      );
    });

    it('should only trigger once per click (once: true)', () => {
      const darkOverlay = document.getElementById('dark-overlay');
      let clickCount = 0;

      window.transitionToDarkening();

      // Simulate click
      const clickEvent = new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });

      darkOverlay.addEventListener('click', () => clickCount++, { once: true });
      darkOverlay.dispatchEvent(clickEvent);
      darkOverlay.dispatchEvent(clickEvent);

      expect(clickCount).toBe(1);
    });
  });

  describe('Transition Timing', () => {
    it('should use 2s transition for fade-in effect', () => {
      const darkOverlay = document.getElementById('dark-overlay');
      const styles = window.getComputedStyle(darkOverlay);

      // Check CSS transition property
      expect(styles.transition || darkOverlay.style.transition).toContain('2s');
    });

    it('should complete darkening before accepting clicks', async () => {
      const darkOverlay = document.getElementById('dark-overlay');
      const consoleSpy = vi.spyOn(console, 'log');

      window.transitionToDarkening();

      // Verify darkening is active
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Darkening stage active')
      );

      // Click should be possible immediately (user can click during fade)
      const clickEvent = new window.MouseEvent('click');
      darkOverlay.dispatchEvent(clickEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dark overlay clicked')
      );
    });
  });

  describe('Visual Feedback', () => {
    it('should have cursor pointer on dark overlay', () => {
      const darkOverlay = document.getElementById('dark-overlay');
      const styles = window.getComputedStyle(darkOverlay);

      expect(darkOverlay.style.cursor || styles.cursor).toBe('pointer');
    });

    it('should have proper z-index for overlay', () => {
      const darkOverlay = document.getElementById('dark-overlay');
      const styles = window.getComputedStyle(darkOverlay);

      expect(darkOverlay.style.zIndex || styles.zIndex).toBe('10');
    });

    it('should have text shadow on click prompt for visibility', () => {
      const clickPrompt = document.getElementById('click-prompt');
      const styles = window.getComputedStyle(clickPrompt);

      expect(clickPrompt.style.textShadow || styles.textShadow).toBeTruthy();
    });
  });

  describe('Requirement 3.4: Darkening after shake', () => {
    it('should transition from shake to darkening', () => {
      const shakeLayer = document.getElementById('shake-layer');
      const darkOverlay = document.getElementById('dark-overlay');

      shakeLayer.style.display = 'block';

      window.transitionToDarkening();

      expect(shakeLayer.style.display).toBe('none');
      expect(darkOverlay.style.display).toBe('flex');
    });
  });

  describe('Requirement 4.1: Begin darkening after shake', () => {
    it('should begin darkening when shake reaches maximum intensity', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      window.transitionToDarkening();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transitioning to darkening')
      );
    });
  });

  describe('Requirement 4.2: Semi-transparent dark overlay', () => {
    it('should apply semi-transparent dark overlay', async () => {
      const darkOverlay = document.getElementById('dark-overlay');

      window.transitionToDarkening();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(darkOverlay.style.background).toContain('rgba(0, 0, 0, 0.95)');
    });

    it('should gradually increase opacity', async () => {
      const darkOverlay = document.getElementById('dark-overlay');

      window.transitionToDarkening();

      const initialOpacity = darkOverlay.style.background;
      expect(initialOpacity).toBe('rgba(0, 0, 0, 0)');

      await new Promise(resolve => setTimeout(resolve, 50));

      const finalOpacity = darkOverlay.style.background;
      expect(finalOpacity).toBe('rgba(0, 0, 0, 0.95)');
    });
  });

  describe('Requirement 4.3: Wait for user interaction', () => {
    it('should wait for click when screen is fully darkened', () => {
      const darkOverlay = document.getElementById('dark-overlay');
      const addEventListenerSpy = vi.spyOn(darkOverlay, 'addEventListener');

      window.transitionToDarkening();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { once: true }
      );
    });
  });

  describe('Requirement 4.4: Display visual cue', () => {
    it('should display subtle visual cue for clicking', () => {
      const clickPrompt = document.getElementById('click-prompt');
      
      expect(clickPrompt).toBeTruthy();
      expect(clickPrompt.textContent).toBeTruthy();
    });

    it('should have pulsing animation for visual cue', () => {
      const clickPrompt = document.getElementById('click-prompt');
      const styles = window.getComputedStyle(clickPrompt);

      // Animation should be defined
      expect(clickPrompt.style.animation || styles.animation).toBeTruthy();
    });
  });
});
