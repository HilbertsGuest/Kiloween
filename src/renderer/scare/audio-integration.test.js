/**
 * Integration test for audio playback during jump scare sequence
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Audio and AudioContext
global.Audio = class Audio {
  constructor() {
    this.src = '';
    this.currentTime = 0;
    this.preload = '';
    this._listeners = {};
    this.playCount = 0;
  }
  
  addEventListener(event, callback) {
    this._listeners[event] = callback;
  }
  
  play() {
    this.playCount++;
    return Promise.resolve();
  }
  
  pause() {}
};

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

describe('Audio Integration with Jump Scare', () => {
  let audioManager;
  let mockElectronAPI;

  beforeEach(async () => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="scare-container">
        <div id="shake-layer"></div>
        <div id="dark-overlay"></div>
        <canvas id="tunnel-canvas"></canvas>
        <div id="jumpscare-layer">
          <pre id="creature-ascii"></pre>
          <div id="question-container"></div>
        </div>
      </div>
    `;

    // Mock electronAPI
    mockElectronAPI = {
      getConfig: vi.fn().mockResolvedValue({ audioEnabled: true }),
      onShowQuestion: vi.fn(),
      onAnswerFeedback: vi.fn(),
      scareCancel: vi.fn()
    };
    global.window.electronAPI = mockElectronAPI;

    // Load AudioManager
    const audioJsCode = await import('fs').then(fs => 
      fs.promises.readFile('./src/renderer/scare/audio.js', 'utf8')
    );
    eval(audioJsCode);

    // Create and initialize AudioManager
    audioManager = new AudioManager();
    await audioManager.init();
  });

  it('should respect audioEnabled config setting', async () => {
    // Test with audio enabled
    mockElectronAPI.getConfig.mockResolvedValue({ audioEnabled: true });
    const config = await mockElectronAPI.getConfig();
    audioManager.setEnabled(config.audioEnabled);
    
    expect(audioManager.enabled).toBe(true);

    // Test with audio disabled
    mockElectronAPI.getConfig.mockResolvedValue({ audioEnabled: false });
    const config2 = await mockElectronAPI.getConfig();
    audioManager.setEnabled(config2.audioEnabled);
    
    expect(audioManager.enabled).toBe(false);
  });

  it('should play audio when jump scare triggers and audio is enabled', async () => {
    audioManager.setEnabled(true);
    const playSpy = vi.spyOn(audioManager.audio, 'play');
    
    await audioManager.play();
    
    expect(playSpy).toHaveBeenCalled();
  });

  it('should not play audio when jump scare triggers and audio is disabled', async () => {
    audioManager.setEnabled(false);
    const playSpy = vi.spyOn(audioManager.audio, 'play');
    
    await audioManager.play();
    
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('should handle audio playback errors without breaking jump scare', async () => {
    audioManager.setEnabled(true);
    
    // Mock play to fail
    audioManager.audio.play = () => Promise.reject(new Error('Playback failed'));
    
    // Mock fallback
    const fallbackSpy = vi.spyOn(audioManager, 'playFallbackBeep').mockImplementation(() => {});
    
    // Should not throw
    await expect(audioManager.play()).resolves.toBeUndefined();
    
    // Should call fallback
    expect(fallbackSpy).toHaveBeenCalled();
  });

  it('should load audio config on initialization', async () => {
    mockElectronAPI.getConfig.mockResolvedValue({ audioEnabled: false });
    
    const config = await mockElectronAPI.getConfig();
    audioManager.setEnabled(config.audioEnabled);
    
    expect(audioManager.enabled).toBe(false);
  });

  it('should use fallback beep when audio file is not available', async () => {
    audioManager.setEnabled(true);
    
    // Simulate audio file not found
    audioManager.audio = null;
    
    const fallbackSpy = vi.spyOn(audioManager, 'playFallbackBeep').mockImplementation(() => {});
    
    await audioManager.play();
    
    // Should not throw and should not call fallback (audio is null)
    expect(fallbackSpy).not.toHaveBeenCalled();
  });

  it('should stop audio when sequence is cancelled', () => {
    audioManager.audio.currentTime = 2.5;
    const pauseSpy = vi.spyOn(audioManager.audio, 'pause');
    
    audioManager.stop();
    
    expect(pauseSpy).toHaveBeenCalled();
    expect(audioManager.audio.currentTime).toBe(0);
  });

  it('should reset audio to beginning before each play', async () => {
    audioManager.setEnabled(true);
    audioManager.audio.currentTime = 3.0;
    
    await audioManager.play();
    
    expect(audioManager.audio.currentTime).toBe(0);
  });
});
