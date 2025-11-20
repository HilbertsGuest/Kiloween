/**
 * AutoUpdater - Handles automatic application updates
 * 
 * Uses electron-updater to check for and install updates from GitHub releases.
 * Updates are checked on app startup and periodically during runtime.
 */

const { autoUpdater } = require('electron-updater');
const { app, dialog } = require('electron');

class AutoUpdater {
  constructor() {
    this.updateCheckInterval = null;
    this.checkIntervalMs = 4 * 60 * 60 * 1000; // Check every 4 hours
    
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, ask user first
    autoUpdater.autoInstallOnAppQuit = true;
    
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for update lifecycle
   */
  setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      this.promptUserForUpdate(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('No updates available. Current version:', info.version);
    });

    autoUpdater.on('error', (err) => {
      console.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
      console.log(message);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      this.promptUserToInstall(info);
    });
  }

  /**
   * Start checking for updates
   */
  start() {
    // Don't check for updates in development
    if (process.env.NODE_ENV === 'development' || app.isPackaged === false) {
      console.log('Auto-updater disabled in development mode');
      return;
    }

    // Check for updates on startup (after a short delay)
    setTimeout(() => {
      this.checkForUpdates();
    }, 10000); // Wait 10 seconds after startup

    // Set up periodic checks
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.checkIntervalMs);
  }

  /**
   * Stop checking for updates
   */
  stop() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  /**
   * Manually check for updates
   */
  async checkForUpdates() {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  /**
   * Prompt user to download available update
   */
  promptUserForUpdate(info) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: 'Would you like to download it now? The update will be installed when you close the app.',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  }

  /**
   * Prompt user to install downloaded update
   */
  promptUserToInstall(info) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'The update will be installed when you close the app. Would you like to restart now?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  }

  /**
   * Get current version
   */
  getCurrentVersion() {
    return app.getVersion();
  }
}

module.exports = AutoUpdater;
