const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

/**
 * @typedef {Object} TimerState
 * @property {number} remainingTime - Remaining time in milliseconds
 * @property {boolean} isRunning - Whether timer is currently running
 * @property {string} startedAt - ISO timestamp when timer started
 * @property {number} interval - Current interval in minutes
 */

/**
 * Manages countdown timer for scare sequence triggering
 * Emits 'expired' event when timer reaches zero
 */
class TimerManager extends EventEmitter {
  /**
   * @param {ConfigManager} configManager - Configuration manager instance
   */
  constructor(configManager) {
    super();
    
    if (!configManager) {
      throw new Error('ConfigManager is required');
    }
    
    this.configManager = configManager;
    this.intervalId = null;
    this.remainingTime = 0; // in milliseconds
    this.isRunning = false;
    this.startedAt = null;
    this.currentInterval = 0; // in minutes
    
    // Set up config change listener
    this._setupConfigListener();
  }

  /**
   * Set up listener for configuration changes
   * @private
   */
  _setupConfigListener() {
    // Listen for interval changes from ConfigManager
    // Note: This requires ConfigManager to emit events or we poll
    // For now, we'll implement a method that can be called when config changes
  }

  /**
   * Initialize timer with current config interval
   * Loads timer state from session if available
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Load interval from config
      this.currentInterval = this.configManager.get('interval');
      
      // Try to load saved timer state
      const savedState = await this._loadTimerState();
      
      if (savedState && savedState.isRunning) {
        // Calculate elapsed time since last save
        const elapsed = Date.now() - new Date(savedState.startedAt).getTime();
        const remaining = savedState.remainingTime - elapsed;
        
        if (remaining > 0) {
          // Resume timer with remaining time
          this.remainingTime = remaining;
          this.startedAt = savedState.startedAt;
          this._startCountdown();
        } else {
          // Timer should have expired, reset to full interval
          this.reset();
        }
      } else {
        // Start fresh with configured interval
        this.reset();
      }
    } catch (error) {
      console.error('Error initializing timer:', error);
      // Fall back to default interval
      this.reset();
    }
  }

  /**
   * Start the timer with configured interval
   */
  start() {
    if (this.isRunning) {
      console.warn('Timer is already running');
      return;
    }
    
    // Load current interval from config
    this.currentInterval = this.configManager.get('interval');
    this.remainingTime = this.currentInterval * 60 * 1000; // Convert to milliseconds
    this.startedAt = new Date().toISOString();
    
    this._startCountdown();
    this._saveTimerState();
  }

  /**
   * Start the countdown interval
   * @private
   */
  _startCountdown() {
    this.isRunning = true;
    
    // Update every second
    this.intervalId = setInterval(() => {
      this.remainingTime -= 1000;
      
      if (this.remainingTime <= 0) {
        this._onTimerExpired();
      }
      
      // Save state periodically (every 10 seconds)
      if (this.remainingTime % 10000 === 0) {
        this._saveTimerState();
      }
    }, 1000);
  }

  /**
   * Stop the timer
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    this._saveTimerState();
  }

  /**
   * Reset timer to configured interval
   */
  reset() {
    this.stop();
    
    // Load current interval from config
    this.currentInterval = this.configManager.get('interval');
    this.remainingTime = this.currentInterval * 60 * 1000;
    this.startedAt = null;
    
    this._saveTimerState();
  }

  /**
   * Handle timer expiration
   * @private
   */
  _onTimerExpired() {
    this.stop();
    this.remainingTime = 0;
    
    // Emit expired event
    this.emit('expired');
    
    // Reset timer for next cycle
    this.reset();
  }

  /**
   * Get remaining time in milliseconds
   * @returns {number}
   */
  getRemainingTime() {
    return Math.max(0, this.remainingTime);
  }

  /**
   * Get remaining time in minutes
   * @returns {number}
   */
  getRemainingMinutes() {
    return Math.ceil(this.getRemainingTime() / 60000);
  }

  /**
   * Get timer status
   * @returns {TimerState}
   */
  getStatus() {
    return {
      remainingTime: this.getRemainingTime(),
      isRunning: this.isRunning,
      startedAt: this.startedAt,
      interval: this.currentInterval
    };
  }

  /**
   * Handle configuration change
   * Called when config is updated externally
   * @param {string} key - Config key that changed
   * @param {*} newValue - New value
   */
  onConfigChange(key, newValue) {
    if (key === 'interval') {
      const oldInterval = this.currentInterval;
      const wasRunning = this.isRunning;
      
      console.log(`Timer interval changed from ${oldInterval} to ${newValue} minutes`);
      
      // Stop current timer
      this.stop();
      
      // Update interval
      this.currentInterval = newValue;
      this.remainingTime = newValue * 60 * 1000;
      
      // If timer was running, restart it
      if (wasRunning) {
        this.start();
      }
    }
  }

  /**
   * Save timer state to session file
   * @private
   * @returns {Promise<void>}
   */
  async _saveTimerState() {
    try {
      const sessionPath = this._getSessionPath();
      
      // Load existing session data
      let sessionData = {};
      try {
        const data = await fs.readFile(sessionPath, 'utf8');
        sessionData = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet, that's okay
      }
      
      // Update timer state
      sessionData.timerState = {
        remainingTime: this.remainingTime,
        isRunning: this.isRunning,
        startedAt: this.startedAt,
        interval: this.currentInterval,
        savedAt: new Date().toISOString()
      };
      
      // Ensure directory exists
      const dir = path.dirname(sessionPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write session data
      await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving timer state:', error);
      // Don't throw - timer should continue working even if save fails
    }
  }

  /**
   * Load timer state from session file
   * @private
   * @returns {Promise<TimerState|null>}
   */
  async _loadTimerState() {
    try {
      const sessionPath = this._getSessionPath();
      const data = await fs.readFile(sessionPath, 'utf8');
      const sessionData = JSON.parse(data);
      
      return sessionData.timerState || null;
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Get session file path
   * @private
   * @returns {string}
   */
  _getSessionPath() {
    const userDataPath = app ? app.getPath('userData') : './data';
    return path.join(userDataPath, 'session.json');
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    this.removeAllListeners();
  }
}

module.exports = TimerManager;
