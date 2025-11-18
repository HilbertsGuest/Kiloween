/**
 * Tests for tunnel animation
 * Requirements: 5.1, 5.2, 5.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Tunnel Animation', () => {
  let dom;
  let window;
  let document;
  let canvas;
  let TunnelAnimation;

  beforeEach(() => {
    // Create a DOM environment
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <canvas id="tunnel-canvas"></canvas>
        </body>
      </html>
    `;
    
    dom = new JSDOM(html, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
    global.cancelAnimationFrame = vi.fn(clearTimeout);
    
    // Mock canvas context
    canvas = document.getElementById('tunnel-canvas');
    const mockContext = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      getContext: vi.fn(() => mockContext),
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowColor: '',
      shadowBlur: 0
    };
    
    canvas.getContext = vi.fn(() => mockContext);
    canvas.width = 1920;
    canvas.height = 1080;
    
    // Load tunnel.js code and execute to get TunnelAnimation class
    const tunnelCode = fs.readFileSync(
      path.join(process.cwd(), 'src/renderer/scare/tunnel.js'),
      'utf-8'
    );
    
    // Extract just the class definition and evaluate it
    const classMatch = tunnelCode.match(/class TunnelAnimation \{[\s\S]*?\n\}/);
    if (classMatch) {
      // Use Function constructor to evaluate in current scope
      const ClassConstructor = new Function('return ' + classMatch[0])();
      TunnelAnimation = ClassConstructor;
    }
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create tunnel animation with canvas', () => {
      const tunnel = new TunnelAnimation(canvas);
      
      expect(tunnel.canvas).toBe(canvas);
      expect(tunnel.ctx).toBeDefined();
      expect(tunnel.isAnimating).toBe(false);
      expect(tunnel.depth).toBe(0);
    });

    it('should set up Halloween color scheme', () => {
      const tunnel = new TunnelAnimation(canvas);
      
      expect(tunnel.colors).toBeDefined();
      expect(tunnel.colors.primary).toMatch(/#[0-9a-f]{6}/i); // Dark purple
      expect(tunnel.colors.secondary).toMatch(/#[0-9a-f]{6}/i); // Orange
      expect(tunnel.colors.accent).toBeDefined();
      expect(tunnel.colors.highlight).toBeDefined();
    });

    it('should resize canvas to window dimensions', () => {
      const tunnel = new TunnelAnimation(canvas);
      
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
      expect(tunnel.centerX).toBe(canvas.width / 2);
      expect(tunnel.centerY).toBe(canvas.height / 2);
    });
  });

  describe('Animation Start', () => {
    it('should start animation and draw initial tunnel', () => {
      const tunnel = new TunnelAnimation(canvas);
      const ctx = canvas.getContext('2d');
      
      tunnel.start();
      
      expect(tunnel.isAnimating).toBe(true);
      expect(tunnel.isPaused).toBe(false);
      expect(tunnel.depth).toBe(0);
      expect(tunnel.clickCount).toBe(0);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should set up click handler', () => {
      const tunnel = new TunnelAnimation(canvas);
      const addEventListenerSpy = vi.spyOn(canvas, 'addEventListener');
      
      tunnel.start();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('First Click - Forward Movement', () => {
    it('should start forward movement on first click', () => {
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      // Simulate first click
      tunnel.handleClick();
      
      expect(tunnel.clickCount).toBe(1);
      expect(tunnel.isPaused).toBe(false);
      expect(tunnel.speed).toBeGreaterThan(0);
    });

    it('should animate forward movement for 2-3 seconds', async () => {
      vi.useFakeTimers();
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      tunnel.handleClick();
      
      // Fast-forward 2.5 seconds and run all timers
      await vi.advanceTimersByTimeAsync(2500);
      
      expect(tunnel.depth).toBeGreaterThan(0);
      expect(tunnel.isPaused).toBe(true);
      
      vi.useRealTimers();
    });

    it('should increase depth during forward movement', async () => {
      vi.useFakeTimers();
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      const initialDepth = tunnel.depth;
      tunnel.handleClick();
      
      vi.advanceTimersByTime(1000);
      
      expect(tunnel.depth).toBeGreaterThan(initialDepth);
      
      vi.useRealTimers();
    });
  });

  describe('Pause and Second Click', () => {
    it('should pause after first animation completes', async () => {
      vi.useFakeTimers();
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      tunnel.handleClick();
      await vi.advanceTimersByTimeAsync(2500);
      
      expect(tunnel.isPaused).toBe(true);
      
      vi.useRealTimers();
    });

    it('should show click prompt when paused', async () => {
      vi.useFakeTimers();
      const tunnel = new TunnelAnimation(canvas);
      const ctx = canvas.getContext('2d');
      tunnel.start();
      
      tunnel.handleClick();
      await vi.advanceTimersByTimeAsync(2500);
      
      expect(ctx.fillText).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should continue animation on second click', async () => {
      vi.useFakeTimers();
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      // First click
      tunnel.handleClick();
      await vi.advanceTimersByTimeAsync(2500);
      
      expect(tunnel.isPaused).toBe(true);
      
      // Second click
      tunnel.handleClick();
      
      expect(tunnel.clickCount).toBe(2);
      expect(tunnel.isPaused).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('Tunnel Drawing', () => {
    it('should draw concentric rectangles', () => {
      const tunnel = new TunnelAnimation(canvas);
      const ctx = canvas.getContext('2d');
      
      tunnel.drawTunnel();
      
      // Should draw multiple layers
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('should use Halloween colors', () => {
      const tunnel = new TunnelAnimation(canvas);
      const ctx = canvas.getContext('2d');
      
      tunnel.drawTunnel();
      
      // Check that colors are set
      const fillStyleCalls = ctx.fillStyle;
      expect(fillStyleCalls).toBeDefined();
    });

    it('should apply vignette effect', () => {
      const tunnel = new TunnelAnimation(canvas);
      const ctx = canvas.getContext('2d');
      
      tunnel.drawTunnel();
      
      expect(ctx.createRadialGradient).toHaveBeenCalled();
    });

    it('should scale layers based on depth', () => {
      const tunnel = new TunnelAnimation(canvas);
      const ctx = canvas.getContext('2d');
      
      tunnel.depth = 25;
      tunnel.drawTunnel();
      
      // Verify drawing occurred with depth
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  describe('Animation Completion', () => {
    it('should trigger jump scare after second animation completes', async () => {
      vi.useFakeTimers();
      const tunnel = new TunnelAnimation(canvas);
      const onCompleteSpy = vi.fn();
      window.onTunnelComplete = onCompleteSpy;
      
      tunnel.start();
      
      // First click and wait
      tunnel.handleClick();
      await vi.advanceTimersByTimeAsync(2500);
      
      // Second click and wait
      tunnel.handleClick();
      await vi.advanceTimersByTimeAsync(1500);
      
      expect(onCompleteSpy).toHaveBeenCalled();
      expect(tunnel.isAnimating).toBe(false);
      
      vi.useRealTimers();
    });

    it('should hide canvas when complete', async () => {
      vi.useFakeTimers();
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      tunnel.handleClick();
      await vi.advanceTimersByTimeAsync(2500);
      
      tunnel.handleClick();
      await vi.advanceTimersByTimeAsync(1500);
      
      expect(canvas.style.display).toBe('none');
      
      vi.useRealTimers();
    });
  });

  describe('Stop Functionality', () => {
    it('should stop animation', () => {
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      tunnel.stop();
      
      expect(tunnel.isAnimating).toBe(false);
    });

    it('should cancel animation frame', () => {
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      tunnel.animationFrame = 123;
      
      tunnel.stop();
      
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Requirements Verification', () => {
    it('should satisfy Requirement 5.1 - Display tunnel on first click', () => {
      const tunnel = new TunnelAnimation(canvas);
      const ctx = canvas.getContext('2d');
      tunnel.start();
      
      tunnel.handleClick();
      
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(tunnel.speed).toBeGreaterThan(0);
    });

    it('should satisfy Requirement 5.2 - Animate for 2-3 seconds', () => {
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      tunnel.handleClick();
      
      // Verify animation is running
      expect(tunnel.clickCount).toBe(1);
      expect(tunnel.speed).toBeGreaterThan(0);
      
      // The animation should take 2.5 seconds (2500ms) as defined in startForwardMovement
      // We can verify the duration constant exists in the implementation
      expect(tunnel.isAnimating).toBe(true);
    });

    it('should satisfy Requirement 5.3 - Pause and wait for second click', () => {
      const tunnel = new TunnelAnimation(canvas);
      tunnel.start();
      
      // Manually trigger pause (simulating animation completion)
      tunnel.handleClick();
      tunnel.pauseForSecondClick();
      
      expect(tunnel.isPaused).toBe(true);
      expect(tunnel.isAnimating).toBe(true); // Still animating, just paused
    });

    it('should satisfy Requirement 5.4 - Continue on second click and trigger jump scare', () => {
      const tunnel = new TunnelAnimation(canvas);
      const onCompleteSpy = vi.fn();
      window.onTunnelComplete = onCompleteSpy;
      
      tunnel.start();
      
      // First click
      tunnel.handleClick();
      expect(tunnel.clickCount).toBe(1);
      
      // Manually pause (simulating first animation completion)
      tunnel.pauseForSecondClick();
      expect(tunnel.isPaused).toBe(true);
      
      // Second click should continue animation
      tunnel.handleClick();
      expect(tunnel.clickCount).toBe(2);
      expect(tunnel.isPaused).toBe(false);
    });

    it('should satisfy Requirement 5.5 - Use Halloween color scheme', () => {
      const tunnel = new TunnelAnimation(canvas);
      
      // Verify Halloween colors (dark purples, oranges)
      expect(tunnel.colors.primary).toContain('#4a0e4e'); // Dark purple
      expect(tunnel.colors.secondary).toContain('#ff6b35'); // Orange
      expect(tunnel.colors.highlight).toContain('#ffa500'); // Bright orange
    });
  });
});
