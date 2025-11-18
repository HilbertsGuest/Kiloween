const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

/**
 * @typedef {Object} SessionStatistics
 * @property {string} sessionStart - ISO timestamp when session started
 * @property {number} questionsAnswered - Total questions answered in session
 * @property {number} correctAnswers - Number of correct answers
 * @property {number} currentStreak - Current streak of consecutive correct answers
 * @property {number} bestStreak - Best streak achieved in this session
 * @property {string} lastQuestionAt - ISO timestamp of last question answered
 */

/**
 * @typedef {Object} SessionState
 * @property {SessionStatistics} statistics - Session statistics
 * @property {Object} timerState - Timer state (managed by TimerManager)
 */

/**
 * Manages session statistics and persistence
 */
class SessionManager {
  /**
   * @param {string} [sessionPath] - Optional custom session file path
   */
  constructor(sessionPath = null) {
    this.sessionPath = sessionPath || this._getDefaultSessionPath();
    this.statistics = null;
  }

  /**
   * Get the default session file path in user data directory
   * @private
   * @returns {string}
   */
  _getDefaultSessionPath() {
    const userDataPath = app ? app.getPath('userData') : './data';
    return path.join(userDataPath, 'session.json');
  }

  /**
   * Get default session statistics
   * @private
   * @returns {SessionStatistics}
   */
  _getDefaultStatistics() {
    return {
      sessionStart: new Date().toISOString(),
      questionsAnswered: 0,
      correctAnswers: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastQuestionAt: null
    };
  }

  /**
   * Load session state from disk
   * Creates default session if file doesn't exist
   * @returns {Promise<SessionState>}
   */
  async load() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.sessionPath);
      await fs.mkdir(dir, { recursive: true });

      // Try to read existing session
      const data = await fs.readFile(this.sessionPath, 'utf8');
      const sessionState = JSON.parse(data);
      
      // Extract statistics, or create default if missing
      this.statistics = sessionState.statistics || this._getDefaultStatistics();
      
      // Return session state with statistics included
      return {
        ...sessionState,
        statistics: this.statistics
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create default statistics
        this.statistics = this._getDefaultStatistics();
        await this.save();
        return { statistics: this.statistics };
      }
      throw new Error(`Failed to load session: ${error.message}`);
    }
  }

  /**
   * Save session state to disk
   * Preserves existing timerState if present
   * @returns {Promise<void>}
   */
  async save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.sessionPath);
      await fs.mkdir(dir, { recursive: true });

      // Read existing session to preserve timerState
      let existingSession = {};
      try {
        const data = await fs.readFile(this.sessionPath, 'utf8');
        existingSession = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is invalid, that's okay
      }

      // Merge statistics with existing session data
      const sessionState = {
        ...existingSession,
        statistics: this.statistics
      };

      // Write session with pretty formatting
      await fs.writeFile(
        this.sessionPath,
        JSON.stringify(sessionState, null, 2),
        'utf8'
      );
    } catch (error) {
      throw new Error(`Failed to save session: ${error.message}`);
    }
  }

  /**
   * Record a question answer
   * @param {boolean} correct - Whether the answer was correct
   * @returns {Promise<void>}
   */
  async recordAnswer(correct) {
    if (!this.statistics) {
      await this.load();
    }

    this.statistics.questionsAnswered++;
    this.statistics.lastQuestionAt = new Date().toISOString();

    if (correct) {
      this.statistics.correctAnswers++;
      this.statistics.currentStreak++;
      
      // Update best streak if current streak is higher
      if (this.statistics.currentStreak > this.statistics.bestStreak) {
        this.statistics.bestStreak = this.statistics.currentStreak;
      }
    } else {
      // Reset streak on incorrect answer
      this.statistics.currentStreak = 0;
    }

    await this.save();
  }

  /**
   * Get current session statistics
   * @returns {SessionStatistics}
   */
  getStatistics() {
    if (!this.statistics) {
      throw new Error('Session not loaded. Call load() first.');
    }
    return { ...this.statistics };
  }

  /**
   * Get accuracy percentage
   * @returns {number} - Accuracy as percentage (0-100)
   */
  getAccuracy() {
    if (!this.statistics || this.statistics.questionsAnswered === 0) {
      return 0;
    }
    return Math.round((this.statistics.correctAnswers / this.statistics.questionsAnswered) * 100);
  }

  /**
   * Reset session statistics
   * Starts a new session with fresh statistics
   * @returns {Promise<void>}
   */
  async resetSession() {
    this.statistics = this._getDefaultStatistics();
    await this.save();
  }

  /**
   * Get session duration in milliseconds
   * @returns {number}
   */
  getSessionDuration() {
    if (!this.statistics || !this.statistics.sessionStart) {
      return 0;
    }
    const start = new Date(this.statistics.sessionStart);
    const now = new Date();
    return now - start;
  }

  /**
   * Get formatted session duration
   * @returns {string} - Duration in format "Xh Ym"
   */
  getFormattedDuration() {
    const duration = this.getSessionDuration();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

module.exports = SessionManager;
