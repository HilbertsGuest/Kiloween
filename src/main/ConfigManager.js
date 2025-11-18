const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

/**
 * @typedef {Object} Config
 * @property {string} version - Configuration version
 * @property {number} interval - Time interval in minutes (5-120)
 * @property {string[]} documents - Array of document file paths
 * @property {boolean} audioEnabled - Whether audio is enabled
 * @property {'easy'|'medium'|'hard'} difficulty - Question difficulty level
 * @property {'halloween'|'dark'} theme - UI theme
 * @property {string} lastRun - ISO timestamp of last run
 */

/**
 * Manages application configuration with persistence to JSON file
 */
class ConfigManager {
  /**
   * @param {string} [configPath] - Optional custom config file path
   */
  constructor(configPath = null) {
    this.configPath = configPath || this._getDefaultConfigPath();
    this.config = null;
  }

  /**
   * Get the default configuration file path in user data directory
   * @private
   * @returns {string}
   */
  _getDefaultConfigPath() {
    const userDataPath = app ? app.getPath('userData') : './data';
    return path.join(userDataPath, 'config.json');
  }

  /**
   * Get default configuration object
   * @private
   * @returns {Config}
   */
  _getDefaultConfig() {
    return {
      version: '1.0.0',
      interval: 30,
      documents: [],
      audioEnabled: true,
      difficulty: 'medium',
      theme: 'halloween',
      lastRun: new Date().toISOString()
    };
  }

  /**
   * Load configuration from disk
   * Creates default config if file doesn't exist
   * @returns {Promise<Config>}
   */
  async load() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });

      // Try to read existing config
      const data = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(data);
      
      // Validate and merge with defaults to handle missing properties
      this.config = { ...this._getDefaultConfig(), ...this.config };
      
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create default config
        this.config = this._getDefaultConfig();
        await this.save(this.config);
        return this.config;
      }
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  /**
   * Save configuration to disk
   * @param {Config} config - Configuration object to save
   * @returns {Promise<void>}
   */
  async save(config) {
    try {
      // Validate config before saving
      this._validateConfig(config);
      
      // Ensure directory exists
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });

      // Write config with pretty formatting
      await fs.writeFile(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf8'
      );
      
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  /**
   * Get a specific configuration value
   * @param {string} key - Configuration key
   * @returns {*} Configuration value
   */
  get(key) {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config[key];
  }

  /**
   * Set a specific configuration value and save
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    
    this.config[key] = value;
    await this.save(this.config);
  }

  /**
   * Get the entire configuration object
   * @returns {Config}
   */
  getAll() {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return { ...this.config };
  }

  /**
   * Validate configuration object
   * @private
   * @param {Config} config
   * @throws {Error} If configuration is invalid
   */
  _validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }

    // Validate interval
    if (typeof config.interval !== 'number' || 
        config.interval < 5 || 
        config.interval > 120) {
      throw new Error('Interval must be a number between 5 and 120');
    }

    // Validate documents array
    if (!Array.isArray(config.documents)) {
      throw new Error('Documents must be an array');
    }

    // Validate audioEnabled
    if (typeof config.audioEnabled !== 'boolean') {
      throw new Error('audioEnabled must be a boolean');
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(config.difficulty)) {
      throw new Error('difficulty must be one of: easy, medium, hard');
    }

    // Validate theme
    const validThemes = ['halloween', 'dark'];
    if (!validThemes.includes(config.theme)) {
      throw new Error('theme must be one of: halloween, dark');
    }
  }
}

module.exports = ConfigManager;
