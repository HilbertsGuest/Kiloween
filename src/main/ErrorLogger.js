const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

/**
 * Handles error logging to file for debugging
 */
class ErrorLogger {
  /**
   * @param {string} [logPath] - Optional custom log file path
   */
  constructor(logPath = null) {
    this.logPath = logPath || this._getDefaultLogPath();
    this.maxLogSize = 5 * 1024 * 1024; // 5MB max log file size
  }

  /**
   * Get the default log file path in user data directory
   * @private
   * @returns {string}
   */
  _getDefaultLogPath() {
    const userDataPath = app ? app.getPath('userData') : './data';
    return path.join(userDataPath, 'app.log');
  }

  /**
   * Log an error to file
   * @param {string} category - Error category (e.g., 'DocumentProcessing', 'Config')
   * @param {Error|string} error - Error object or message
   * @param {Object} [context] - Additional context information
   * @returns {Promise<void>}
   */
  async logError(category, error, context = {}) {
    try {
      const timestamp = new Date().toISOString();
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : '';
      
      const logEntry = {
        timestamp,
        category,
        message: errorMessage,
        stack: errorStack,
        context
      };

      const logLine = JSON.stringify(logEntry) + '\n';

      // Ensure directory exists
      const dir = path.dirname(this.logPath);
      await fs.mkdir(dir, { recursive: true });

      // Check log file size and rotate if needed
      await this._rotateLogIfNeeded();

      // Append to log file
      await fs.appendFile(this.logPath, logLine, 'utf8');
    } catch (err) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', err);
      console.error('Original error:', error);
    }
  }

  /**
   * Log a warning to file
   * @param {string} category - Warning category
   * @param {string} message - Warning message
   * @param {Object} [context] - Additional context information
   * @returns {Promise<void>}
   */
  async logWarning(category, message, context = {}) {
    try {
      const timestamp = new Date().toISOString();
      
      const logEntry = {
        timestamp,
        level: 'WARNING',
        category,
        message,
        context
      };

      const logLine = JSON.stringify(logEntry) + '\n';

      // Ensure directory exists
      const dir = path.dirname(this.logPath);
      await fs.mkdir(dir, { recursive: true });

      // Check log file size and rotate if needed
      await this._rotateLogIfNeeded();

      // Append to log file
      await fs.appendFile(this.logPath, logLine, 'utf8');
    } catch (err) {
      console.error('Failed to write warning to log file:', err);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   * @private
   * @returns {Promise<void>}
   */
  async _rotateLogIfNeeded() {
    try {
      const stats = await fs.stat(this.logPath);
      
      if (stats.size > this.maxLogSize) {
        // Rename current log to .old
        const oldLogPath = this.logPath + '.old';
        
        // Delete old backup if it exists
        try {
          await fs.unlink(oldLogPath);
        } catch (err) {
          // Ignore if file doesn't exist
        }
        
        // Rename current log to backup
        await fs.rename(this.logPath, oldLogPath);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // Ignore if file doesn't exist, throw other errors
        console.error('Error rotating log file:', err);
      }
    }
  }

  /**
   * Clear the log file
   * @returns {Promise<void>}
   */
  async clearLog() {
    try {
      await fs.unlink(this.logPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw new Error(`Failed to clear log: ${err.message}`);
      }
    }
  }

  /**
   * Read recent log entries
   * @param {number} [lines=100] - Number of recent lines to read
   * @returns {Promise<string[]>}
   */
  async readRecentLogs(lines = 100) {
    try {
      const content = await fs.readFile(this.logPath, 'utf8');
      const allLines = content.trim().split('\n');
      return allLines.slice(-lines);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to read log: ${err.message}`);
    }
  }
}

module.exports = ErrorLogger;
