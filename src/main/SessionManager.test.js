const fs = require('fs').promises;
const path = require('path');

// Mock electron before importing SessionManager
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => './test-data')
  }
}));

const SessionManager = require('./SessionManager');

describe('SessionManager', () => {
  let sessionManager;
  let testSessionPath;

  beforeEach(async () => {
    // Set up test path
    testSessionPath = path.join('./test-data', 'test-session.json');
    
    // Clean up any existing session file
    try {
      await fs.unlink(testSessionPath);
    } catch (error) {
      // File doesn't exist, that's okay
    }

    sessionManager = new SessionManager(testSessionPath);
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testSessionPath);
    } catch (error) {
      // File doesn't exist, that's okay
    }
  });

  describe('load', () => {
    it('should create default statistics when file does not exist', async () => {
      const sessionState = await sessionManager.load();

      expect(sessionState).toBeDefined();
      expect(sessionState.statistics).toBeDefined();
      expect(sessionState.statistics.questionsAnswered).toBe(0);
      expect(sessionState.statistics.correctAnswers).toBe(0);
      expect(sessionState.statistics.currentStreak).toBe(0);
      expect(sessionState.statistics.bestStreak).toBe(0);
      expect(sessionState.statistics.sessionStart).toBeDefined();
      expect(sessionState.statistics.lastQuestionAt).toBeNull();
    });

    it('should load existing session statistics', async () => {
      // Create a session file
      const existingSession = {
        statistics: {
          sessionStart: '2025-11-18T10:00:00.000Z',
          questionsAnswered: 5,
          correctAnswers: 3,
          currentStreak: 2,
          bestStreak: 3,
          lastQuestionAt: '2025-11-18T10:30:00.000Z'
        }
      };

      await fs.mkdir(path.dirname(testSessionPath), { recursive: true });
      await fs.writeFile(testSessionPath, JSON.stringify(existingSession), 'utf8');

      const sessionState = await sessionManager.load();

      expect(sessionState.statistics.questionsAnswered).toBe(5);
      expect(sessionState.statistics.correctAnswers).toBe(3);
      expect(sessionState.statistics.currentStreak).toBe(2);
      expect(sessionState.statistics.bestStreak).toBe(3);
    });

    it('should handle session file without statistics', async () => {
      // Create a session file with only timerState
      const existingSession = {
        timerState: {
          remainingTime: 1800000,
          isRunning: false
        }
      };

      await fs.mkdir(path.dirname(testSessionPath), { recursive: true });
      await fs.writeFile(testSessionPath, JSON.stringify(existingSession), 'utf8');

      const sessionState = await sessionManager.load();

      expect(sessionState.statistics).toBeDefined();
      expect(sessionState.statistics.questionsAnswered).toBe(0);
    });
  });

  describe('save', () => {
    it('should save statistics to file', async () => {
      await sessionManager.load();
      sessionManager.statistics.questionsAnswered = 10;
      sessionManager.statistics.correctAnswers = 7;

      await sessionManager.save();

      const data = await fs.readFile(testSessionPath, 'utf8');
      const sessionState = JSON.parse(data);

      expect(sessionState.statistics.questionsAnswered).toBe(10);
      expect(sessionState.statistics.correctAnswers).toBe(7);
    });

    it('should preserve existing timerState when saving', async () => {
      // Create a session file with timerState
      const existingSession = {
        timerState: {
          remainingTime: 1800000,
          isRunning: true,
          startedAt: '2025-11-18T10:00:00.000Z'
        },
        statistics: {
          sessionStart: '2025-11-18T10:00:00.000Z',
          questionsAnswered: 0,
          correctAnswers: 0,
          currentStreak: 0,
          bestStreak: 0,
          lastQuestionAt: null
        }
      };

      await fs.mkdir(path.dirname(testSessionPath), { recursive: true });
      await fs.writeFile(testSessionPath, JSON.stringify(existingSession), 'utf8');

      await sessionManager.load();
      sessionManager.statistics.questionsAnswered = 5;
      await sessionManager.save();

      const data = await fs.readFile(testSessionPath, 'utf8');
      const sessionState = JSON.parse(data);

      // Statistics should be updated
      expect(sessionState.statistics.questionsAnswered).toBe(5);
      
      // TimerState should be preserved
      expect(sessionState.timerState).toBeDefined();
      expect(sessionState.timerState.remainingTime).toBe(1800000);
      expect(sessionState.timerState.isRunning).toBe(true);
    });
  });

  describe('recordAnswer', () => {
    beforeEach(async () => {
      await sessionManager.load();
    });

    it('should increment questionsAnswered for any answer', async () => {
      await sessionManager.recordAnswer(true);
      expect(sessionManager.statistics.questionsAnswered).toBe(1);

      await sessionManager.recordAnswer(false);
      expect(sessionManager.statistics.questionsAnswered).toBe(2);
    });

    it('should increment correctAnswers for correct answer', async () => {
      await sessionManager.recordAnswer(true);
      expect(sessionManager.statistics.correctAnswers).toBe(1);

      await sessionManager.recordAnswer(true);
      expect(sessionManager.statistics.correctAnswers).toBe(2);
    });

    it('should not increment correctAnswers for incorrect answer', async () => {
      await sessionManager.recordAnswer(false);
      expect(sessionManager.statistics.correctAnswers).toBe(0);
    });

    it('should increment streak for consecutive correct answers', async () => {
      await sessionManager.recordAnswer(true);
      expect(sessionManager.statistics.currentStreak).toBe(1);

      await sessionManager.recordAnswer(true);
      expect(sessionManager.statistics.currentStreak).toBe(2);

      await sessionManager.recordAnswer(true);
      expect(sessionManager.statistics.currentStreak).toBe(3);
    });

    it('should reset streak on incorrect answer', async () => {
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);
      expect(sessionManager.statistics.currentStreak).toBe(2);

      await sessionManager.recordAnswer(false);
      expect(sessionManager.statistics.currentStreak).toBe(0);
    });

    it('should update bestStreak when currentStreak exceeds it', async () => {
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);
      
      expect(sessionManager.statistics.bestStreak).toBe(3);

      await sessionManager.recordAnswer(false);
      await sessionManager.recordAnswer(true);
      
      expect(sessionManager.statistics.currentStreak).toBe(1);
      expect(sessionManager.statistics.bestStreak).toBe(3); // Should remain 3
    });

    it('should update lastQuestionAt timestamp', async () => {
      const beforeTime = new Date();
      await sessionManager.recordAnswer(true);
      const afterTime = new Date();

      const lastQuestionAt = new Date(sessionManager.statistics.lastQuestionAt);
      expect(lastQuestionAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(lastQuestionAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should persist statistics after recording answer', async () => {
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);

      // Load a new instance and verify persistence
      const newSessionManager = new SessionManager(testSessionPath);
      await newSessionManager.load();

      expect(newSessionManager.statistics.questionsAnswered).toBe(2);
      expect(newSessionManager.statistics.correctAnswers).toBe(2);
      expect(newSessionManager.statistics.currentStreak).toBe(2);
    });
  });

  describe('getStatistics', () => {
    it('should return current statistics', async () => {
      await sessionManager.load();
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(false);

      const stats = sessionManager.getStatistics();

      expect(stats.questionsAnswered).toBe(2);
      expect(stats.correctAnswers).toBe(1);
      expect(stats.currentStreak).toBe(0);
    });

    it('should throw error if session not loaded', () => {
      expect(() => sessionManager.getStatistics()).toThrow('Session not loaded');
    });

    it('should return a copy of statistics', async () => {
      await sessionManager.load();
      const stats = sessionManager.getStatistics();
      
      stats.questionsAnswered = 999;
      
      expect(sessionManager.statistics.questionsAnswered).toBe(0);
    });
  });

  describe('getAccuracy', () => {
    beforeEach(async () => {
      await sessionManager.load();
    });

    it('should return 0 when no questions answered', () => {
      expect(sessionManager.getAccuracy()).toBe(0);
    });

    it('should calculate accuracy percentage correctly', async () => {
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(false);
      await sessionManager.recordAnswer(true);

      // 3 correct out of 4 = 75%
      expect(sessionManager.getAccuracy()).toBe(75);
    });

    it('should return 100 for all correct answers', async () => {
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);

      expect(sessionManager.getAccuracy()).toBe(100);
    });

    it('should return 0 for all incorrect answers', async () => {
      await sessionManager.recordAnswer(false);
      await sessionManager.recordAnswer(false);

      expect(sessionManager.getAccuracy()).toBe(0);
    });

    it('should round accuracy to nearest integer', async () => {
      // 2 correct out of 3 = 66.666...%
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(false);

      expect(sessionManager.getAccuracy()).toBe(67);
    });
  });

  describe('resetSession', () => {
    it('should reset all statistics to default values', async () => {
      await sessionManager.load();
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(true);
      await sessionManager.recordAnswer(false);

      await sessionManager.resetSession();

      expect(sessionManager.statistics.questionsAnswered).toBe(0);
      expect(sessionManager.statistics.correctAnswers).toBe(0);
      expect(sessionManager.statistics.currentStreak).toBe(0);
      expect(sessionManager.statistics.bestStreak).toBe(0);
      expect(sessionManager.statistics.lastQuestionAt).toBeNull();
    });

    it('should update sessionStart timestamp', async () => {
      await sessionManager.load();
      const oldSessionStart = sessionManager.statistics.sessionStart;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await sessionManager.resetSession();

      expect(sessionManager.statistics.sessionStart).not.toBe(oldSessionStart);
    });

    it('should persist reset statistics', async () => {
      await sessionManager.load();
      await sessionManager.recordAnswer(true);
      await sessionManager.resetSession();

      // Load a new instance and verify reset was persisted
      const newSessionManager = new SessionManager(testSessionPath);
      await newSessionManager.load();

      expect(newSessionManager.statistics.questionsAnswered).toBe(0);
    });
  });

  describe('getSessionDuration', () => {
    it('should return 0 when statistics not loaded', () => {
      expect(sessionManager.getSessionDuration()).toBe(0);
    });

    it('should calculate duration from session start', async () => {
      await sessionManager.load();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = sessionManager.getSessionDuration();
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(1000); // Should be less than 1 second
    });
  });

  describe('getFormattedDuration', () => {
    it('should format duration in minutes when less than 1 hour', async () => {
      await sessionManager.load();
      
      // Set session start to 30 minutes ago
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      sessionManager.statistics.sessionStart = thirtyMinutesAgo.toISOString();
      
      const formatted = sessionManager.getFormattedDuration();
      expect(formatted).toMatch(/^30m$/);
    });

    it('should format duration with hours and minutes', async () => {
      await sessionManager.load();
      
      // Set session start to 2 hours and 15 minutes ago
      const twoHoursFifteenMinutesAgo = new Date(Date.now() - (2 * 60 + 15) * 60 * 1000);
      sessionManager.statistics.sessionStart = twoHoursFifteenMinutesAgo.toISOString();
      
      const formatted = sessionManager.getFormattedDuration();
      expect(formatted).toMatch(/^2h 1[45]m$/); // Allow for slight timing variations
    });
  });
});
