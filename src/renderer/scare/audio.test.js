/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Audio constructor
global.Audio = class Audio {
  constructor() {
    this.src = '';
    this.currentTime = 0;
    this.preload = '';
    this._listeners = {};
  }
  
  addEventListener(event, callback) {
    this._listeners[event] = callback;
  }
  
  play() {
    return Promise.resolve();
  }
  
  pause() {}
};

// Mock AudioContext
global.AudioContext = class AudioContext {
  constructor() {
    this.currentTime = 0;
  }
  
  createOscillator() {
    return {
      frequency: { value: 0 },
      type: 'sine',
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
  }
  
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn()
    };
  }
  
  get destination() {
    return {};
  }
};

// Load AudioManager
const audioJsCode = await import('fs').then(fs => 
  fs.promises.readFile('./src/renderer/scare/audio.js', 'utf8')
);
eval(audioJsCode);

describe('AudioManager', () => {
  let audioManager;

  beforeEach(() => {
    audioManager = new AudioManager();
  });

  describe('init', () => {
    it('should initialize audio element', async () => {
      await audioManager.init();
      
      expect(audioManager.audio).toBeDefined();
      expect(audioManager.audio.preload).toBe('auto');
    });

    it('should set audio source path', async () => {
      await audioManager.init();
      
      expect(audioManager.audio.src).toContain('jumpscare.mp3');
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock Audio to throw error
      const originalAudio = global.Audio;
      global.Audio = class {
        constructor() {
          throw new Error('Audio not supported');
        }
      };

      await audioManager.init();
      
      // Should not throw, audio should be null
      expect(audioManager.audio).toBeNull();

      // Restore
      global.Audio = originalAudio;
    });
  });

  describe('setEnabled', () => {
    it('should enable audio', () => {
      audioManager.setEnabled(true);
      expect(audioManager.enabled).toBe(true);
    });

    it('should disable audio', () => {
      audioManager.setEnabled(false);
      expect(audioManager.enabled).toBe(false);
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      await audioManager.init();
    });

    it('should not play when audio is disabled', async () => {
      audioManager.setEnabled(false);
      const playSpy = vi.spyOn(audioManager.audio, 'play');
      
      await audioManager.play();
      
      expect(playSpy).not.toHaveBeenCalled();
    });

    it('should play audio when enabled', async () => {
      audioManager.setEnabled(true);
      const playSpy = vi.spyOn(audioManager.audio, 'play');
      
      await audioManager.play();
      
      expect(playSpy).toHaveBeenCalled();
    });

    it('should reset audio to beginning before playing', async () => {
      audioManager.setEnabled(true);
      audioManager.audio.currentTime = 5;
      
      await audioManager.play();
      
      expect(audioManager.audio.currentTime).toBe(0);
    });

    it('should handle playback errors gracefully', async () => {
      audioManager.setEnabled(true);
      
      // Mock play to reject
      audioManager.audio.play = () => Promise.reject(new Error('Autoplay blocked'));
      
      // Mock fallback beep
      const fallbackSpy = vi.spyOn(audioManager, 'playFallbackBeep');
      
      await audioManager.play();
      
      // Should call fallback
      expect(fallbackSpy).toHaveBeenCalled();
    });

    it('should not play if audio not initialized', async () => {
      audioManager.audio = null;
      audioManager.setEnabled(true);
      
      // Should not throw
      await expect(audioManager.play()).resolves.toBeUndefined();
    });
  });

  describe('playFallbackBeep', () => {
    it('should not play when audio is disabled', () => {
      audioManager.setEnabled(false);
      
      // Should not throw
      expect(() => audioManager.playFallbackBeep()).not.toThrow();
    });

    it('should create oscillator with low frequency for spooky effect', () => {
      audioManager.setEnabled(true);
      
      const mockOscillator = {
        frequency: { value: 0 },
        type: 'sine',
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      };
      
      const mockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn()
      };
      
      const mockContext = {
        currentTime: 0,
        destination: {},
        createOscillator: vi.fn(() => mockOscillator),
        createGain: vi.fn(() => mockGain)
      };
      
      global.AudioContext = class {
        constructor() {
          return mockContext;
        }
      };
      
      audioManager.playFallbackBeep();
      
      expect(mockOscillator.frequency.value).toBe(150);
      expect(mockOscillator.type).toBe('sawtooth');
    });

    it('should handle Web Audio API errors gracefully', () => {
      audioManager.setEnabled(true);
      
      // Mock AudioContext to throw
      global.AudioContext = class {
        constructor() {
          throw new Error('Web Audio not supported');
        }
      };
      
      // Should not throw
      expect(() => audioManager.playFallbackBeep()).not.toThrow();
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await audioManager.init();
    });

    it('should pause audio', () => {
      const pauseSpy = vi.spyOn(audioManager.audio, 'pause');
      
      audioManager.stop();
      
      expect(pauseSpy).toHaveBeenCalled();
    });

    it('should reset audio to beginning', () => {
      audioManager.audio.currentTime = 5;
      
      audioManager.stop();
      
      expect(audioManager.audio.currentTime).toBe(0);
    });

    it('should handle null audio gracefully', () => {
      audioManager.audio = null;
      
      // Should not throw
      expect(() => audioManager.stop()).not.toThrow();
    });
  });
});
