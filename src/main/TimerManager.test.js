const fs = require('fs').promises;
const path = require('path');

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => './test-data')
  }
}));

const TimerManager = require('./TimerManager');
const ConfigManager = require('./ConfigManager');

describe('TimerManager', () => {
  let configManager;
  let timerManager;
  let testConfigPath;
  let testSessionPath;

  beforeEach(async () => {
    // Set up test paths
    testConfigPath = path.join('./test-data', 'test-config.json');
    testSessionPath = path.join('./test-data', 'session.json');

    // Clean up any existing session file
    try {
      await fs.unlink(testSessionPath);
    } catch (error) {
      // Ignore if doesn't exist
    }

    // Create ConfigManager with test config
    configManager = new ConfigManager(testConfigPath);
    await configManager.load();

    // Create TimerManager
    timerManager = new TimerManager(configManager);
  });

  afterEach(async () => {
    // Clean up
    if (timerManager) {
      timerManager.destroy();
      timerManager = null;
    }

    // Clean up test files
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    try {
      await fs.unlink(testSessionPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should require ConfigManager', () => {
      expect(() => new TimerManager()).toThrow('ConfigManager is required');
    });

    it('should initialize with ConfigManager', () => {
      expect(timerManager.configManager).toBe(configManager);
      expect(timerManager.isRunning).toBe(false);
      expect(timerManager.remainingTime).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should load interval from config', async () => {
      await configManager.set('interval', 45);
      await timerManager.initialize();

      expect(timerManager.currentInterval).toBe(45);
    });

    it('should reset timer if no saved state exists', async () => {
      await timerManager.initialize();

      const interval = configManager.get('interval');
      expect(timerManager.remainingTime).toBe(interval * 60 * 1000);
      expect(timerManager.isRunning).toBe(false);
    });

    it('should initialize with config interval', async () => {
      await configManager.set('interval', 60);
      
      await timerManager.initialize();

      expect(timerManager.currentInterval).toBe(60);
      expect(timerManager.remainingTime).toBe(60 * 60 * 1000);
    });
  });

  describe('start', () => {
    it('should start timer with configured interval', () => {
      vi.useFakeTimers();

      timerManager.start();

      expect(timerManager.isRunning).toBe(true);
      expect(timerManager.remainingTime).toBe(30 * 60 * 1000); // Default 30 minutes
      expect(timerManager.startedAt).toBeTruthy();

      vi.useRealTimers();
    });

    it('should not start if already running', () => {
      vi.useFakeTimers();

      timerManager.start();
      const firstStartTime = timerManager.startedAt;

      timerManager.start();
      expect(timerManager.startedAt).toBe(firstStartTime);

      vi.useRealTimers();
    });

    it('should load current interval from config', async () => {
      vi.useFakeTimers();

      await configManager.set('interval', 60);
      timerManager.start();

      expect(timerManager.currentInterval).toBe(60);
      expect(timerManager.remainingTime).toBe(60 * 60 * 1000);

      vi.useRealTimers();
    });
  });

  describe('stop', () => {
    it('should stop running timer', () => {
      vi.useFakeTimers();

      timerManager.start();
      expect(timerManager.isRunning).toBe(true);

      timerManager.stop();
      expect(timerManager.isRunning).toBe(false);

      vi.useRealTimers();
    });

    it('should do nothing if timer is not running', () => {
      expect(() => timerManager.stop()).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset timer to configured interval', async () => {
      vi.useFakeTimers();

      await configManager.set('interval', 45);
      timerManager.start();

      // Advance time
      vi.advanceTimersByTime(10000);

      timerManager.reset();

      expect(timerManager.isRunning).toBe(false);
      expect(timerManager.remainingTime).toBe(45 * 60 * 1000);
      expect(timerManager.startedAt).toBeNull();

      vi.useRealTimers();
    });

    it('should stop timer if running', () => {
      vi.useFakeTimers();

      timerManager.start();
      expect(timerManager.isRunning).toBe(true);

      timerManager.reset();
      expect(timerManager.isRunning).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('getRemainingTime', () => {
    it('should return remaining time in milliseconds', () => {
      timerManager.remainingTime = 120000;
      expect(timerManager.getRemainingTime()).toBe(120000);
    });

    it('should return 0 if remaining time is negative', () => {
      timerManager.remainingTime = -5000;
      expect(timerManager.getRemainingTime()).toBe(0);
    });
  });

  describe('getRemainingMinutes', () => {
    it('should return remaining time in minutes (rounded up)', () => {
      timerManager.remainingTime = 125000; // 2.08 minutes
      expect(timerManager.getRemainingMinutes()).toBe(3);
    });

    it('should return 0 if no time remaining', () => {
      timerManager.remainingTime = 0;
      expect(timerManager.getRemainingMinutes()).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return timer status object', () => {
      vi.useFakeTimers();

      timerManager.start();
      const status = timerManager.getStatus();

      expect(status).toHaveProperty('remainingTime');
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('startedAt');
      expect(status).toHaveProperty('interval');
      expect(status.isRunning).toBe(true);
      expect(status.interval).toBe(30);

      vi.useRealTimers();
    });
  });

  describe('onConfigChange', () => {
    it('should update interval when config changes', async () => {
      vi.useFakeTimers();

      timerManager.start();
      expect(timerManager.currentInterval).toBe(30);

      await configManager.set('interval', 60);
      timerManager.onConfigChange('interval', 60);

      expect(timerManager.currentInterval).toBe(60);
      expect(timerManager.remainingTime).toBe(60 * 60 * 1000);

      vi.useRealTimers();
    });

    it('should reset timer when interval changes', async () => {
      vi.useFakeTimers();

      timerManager.start();
      const initialRemaining = timerManager.remainingTime;

      await configManager.set('interval', 45);
      timerManager.onConfigChange('interval', 45);

      expect(timerManager.remainingTime).toBe(45 * 60 * 1000);
      expect(timerManager.remainingTime).not.toBe(initialRemaining);

      vi.useRealTimers();
    });

    it('should restart timer if it was running', async () => {
      vi.useFakeTimers();

      timerManager.start();
      expect(timerManager.isRunning).toBe(true);

      await configManager.set('interval', 45);
      timerManager.onConfigChange('interval', 45);

      expect(timerManager.isRunning).toBe(true);
      expect(timerManager.currentInterval).toBe(45);

      vi.useRealTimers();
    });

    it('should ignore non-interval config changes', () => {
      vi.useFakeTimers();

      timerManager.start();
      const initialRemaining = timerManager.remainingTime;

      timerManager.onConfigChange('audioEnabled', false);

      expect(timerManager.remainingTime).toBe(initialRemaining);

      vi.useRealTimers();
    });
  });

  describe('timer expiration', () => {
    it('should emit expired event when timer reaches zero', () => {
      vi.useFakeTimers();

      return new Promise((resolve) => {
        timerManager.on('expired', () => {
          expect(timerManager.isRunning).toBe(false);
          expect(timerManager.remainingTime).toBe(0);
          vi.useRealTimers();
          resolve();
        });

        timerManager.start();
        
        // Fast forward to expiration
        vi.advanceTimersByTime(30 * 60 * 1000);
      });
    });

    it('should reset timer after expiration', () => {
      vi.useFakeTimers();

      timerManager.start();
      
      // Fast forward to expiration
      vi.advanceTimersByTime(30 * 60 * 1000);

      expect(timerManager.remainingTime).toBe(30 * 60 * 1000);
      expect(timerManager.isRunning).toBe(false);

      vi.useRealTimers();
    });
  });

  describe.sequential('session persistence', () => {
    it('should save and load timer state', async () => {
      // Create a fresh timer manager for this test
      const testTimer = new TimerManager(configManager);
      
      testTimer.start();
      await testTimer._saveTimerState();

      // Small delay to ensure file is written
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load the state
      const loadedState = await testTimer._loadTimerState();

      expect(loadedState).toBeDefined();
      expect(loadedState.isRunning).toBe(true);
      expect(loadedState.interval).toBe(30);
      
      testTimer.destroy();
      
      // Clean up the session file
      try {
        await fs.unlink(testSessionPath);
      } catch (error) {
        // Ignore if doesn't exist
      }
    });

    it('should persist timer state across sessions', async () => {
      // Create a timer, set it up, and save
      const testTimer1 = new TimerManager(configManager);
      testTimer1.currentInterval = 45;
      testTimer1.remainingTime = 120000;
      testTimer1.isRunning = false;
      
      await testTimer1._saveTimerState();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a new timer manager and load the state
      const testTimer2 = new TimerManager(configManager);
      const loadedState = await testTimer2._loadTimerState();
      
      // Should load the saved state
      expect(loadedState).toBeDefined();
      expect(loadedState.interval).toBe(45);
      expect(loadedState.remainingTime).toBe(120000);
      
      testTimer1.destroy();
      testTimer2.destroy();
    });
  });

  describe('destroy', () => {
    it('should stop timer and remove listeners', () => {
      vi.useFakeTimers();

      timerManager.start();
      timerManager.on('expired', () => {});

      timerManager.destroy();

      expect(timerManager.isRunning).toBe(false);
      expect(timerManager.listenerCount('expired')).toBe(0);

      vi.useRealTimers();
    });
  });
});
