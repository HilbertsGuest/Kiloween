const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const ConfigManager = require('./ConfigManager');
const SessionManager = require('./SessionManager');
const TimerManager = require('./TimerManager');
const ScareController = require('./ScareController');
const DocumentProcessor = require('./DocumentProcessor');
const QuestionGenerator = require('./QuestionGenerator');
const ResourceMonitor = require('./ResourceMonitor');
const AutoUpdater = require('./AutoUpdater');
const { IPC_CHANNELS } = require('../shared/constants');

// Keep a global reference to prevent garbage collection
let tray = null;
let configWindow = null;
let scareWindow = null;
let configManager = null;
let sessionManager = null;
let timerManager = null;
let scareController = null;
let documentProcessor = null;
let questionGenerator = null;
let resourceMonitor = null;
let autoUpdater = null;
let isQuitting = false;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus config window if someone tries to run a second instance
    if (configWindow) {
      if (configWindow.isMinimized()) configWindow.restore();
      configWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await initializeApp();
      console.log('Spooky Study App started in background mode');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      app.quit();
    }
  });
}

/**
 * Initialize the application
 * - Load configuration
 * - Create system tray
 * - Set up error handlers
 */
async function initializeApp() {
  // Initialize ConfigManager
  configManager = new ConfigManager();
  await configManager.load();
  console.log('Configuration loaded successfully');

  // Update last run timestamp
  await configManager.set('lastRun', new Date().toISOString());

  // Initialize SessionManager
  sessionManager = new SessionManager();
  await sessionManager.load();
  console.log('Session loaded successfully');

  // Initialize ResourceMonitor
  resourceMonitor = new ResourceMonitor({
    sampleInterval: 10000, // 10 seconds
    maxSamples: 12 // Keep 2 minutes of history
  });
  resourceMonitor.start();
  console.log('ResourceMonitor initialized and started');

  // Initialize AutoUpdater
  autoUpdater = new AutoUpdater();
  autoUpdater.start();
  console.log('AutoUpdater initialized and started');

  // Initialize DocumentProcessor with optimization settings
  documentProcessor = new DocumentProcessor({
    useWorkerThreads: true,
    maxConcurrentWorkers: 2
  });
  console.log('DocumentProcessor initialized successfully');

  // Initialize QuestionGenerator with optimization settings
  questionGenerator = new QuestionGenerator({
    maxCachedQuestions: 100,
    lazyLoad: true
  });
  console.log('QuestionGenerator initialized successfully');

  // Initialize ScareController with SessionManager
  scareController = new ScareController(questionGenerator, { sessionManager });
  console.log('ScareController initialized successfully');

  // Initialize TimerManager
  timerManager = new TimerManager(configManager);
  await timerManager.initialize();
  console.log('Timer initialized successfully');

  // Validate that we have questions before starting timer
  await validateQuestionsAvailable();

  // Set up timer expiration handler - connect to ScareController
  timerManager.on('expired', async () => {
    console.log('Timer expired! Triggering scare sequence...');
    
    try {
      // Validate questions are still available
      const hasQuestions = questionGenerator.hasUnusedQuestions();
      if (!hasQuestions) {
        console.warn('No unused questions available, attempting to regenerate...');
        const regenerated = await regenerateQuestions();
        if (!regenerated) {
          console.error('Cannot start scare sequence: no questions available');
          // Reset timer and try again later
          timerManager.reset();
          timerManager.start();
          return;
        }
      }
      
      // Ensure scare window exists and is ready
      if (!scareWindow) {
        createScareWindow();
      }
      
      // Wait for window to be ready
      if (scareWindow.webContents.isLoading()) {
        await new Promise(resolve => {
          scareWindow.webContents.once('did-finish-load', resolve);
        });
      }
      
      // Set the scare window reference in ScareController
      scareController.setScareWindow(scareWindow);
      
      // Show the window
      showScareWindow();
      
      // Start the scare sequence
      await scareController.startSequence();
    } catch (error) {
      console.error('Error starting scare sequence:', error);
      // Reset timer on error
      timerManager.reset();
      timerManager.start();
    }
  });

  // Set up ScareController event handlers
  scareController.on('sequence-end', () => {
    console.log('Scare sequence ended normally');
    hideScareWindow();
    
    // Reset and restart timer for next cycle
    timerManager.reset();
    timerManager.start();
  });

  scareController.on('sequence-cancelled', () => {
    console.log('Scare sequence was cancelled');
    hideScareWindow();
    
    // Reset and restart timer after cancellation
    timerManager.reset();
    timerManager.start();
  });

  scareController.on('error', (error) => {
    console.error('ScareController error:', error);
    hideScareWindow();
    
    // Reset and restart timer on error
    timerManager.reset();
    timerManager.start();
  });

  // Create system tray
  createTray();

  // Set up IPC handlers
  setupIPCHandlers();

  // Set up global error handlers
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // Don't crash the app, just log the error
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    // Don't crash the app, just log the error
  });
}

/**
 * Set up IPC handlers for communication between main and renderer processes
 */
function setupIPCHandlers() {
  // Configuration handlers
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async (event, key) => {
    try {
      if (!configManager) {
        throw new Error('ConfigManager not initialized');
      }
      
      if (key) {
        // Get specific config value
        return configManager.get(key);
      } else {
        // Get entire config
        return configManager.config;
      }
    } catch (error) {
      console.error('Error getting config:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, async (event, key, value) => {
    try {
      if (!configManager) {
        throw new Error('ConfigManager not initialized');
      }
      
      if (typeof key === 'object' && value === undefined) {
        // Setting entire config object
        const newConfig = key;
        
        // Validate config structure
        validateConfig(newConfig);
        
        // Update each key
        for (const [k, v] of Object.entries(newConfig)) {
          await configManager.set(k, v);
          
          // Notify TimerManager of interval changes
          if (k === 'interval' && timerManager) {
            timerManager.onConfigChange(k, v);
          }
        }
        
        // Notify all windows of config update
        notifyConfigUpdate();
        
        return configManager.config;
      } else {
        // Setting single key-value pair
        await configManager.set(key, value);
        
        // Notify TimerManager of interval changes
        if (key === 'interval' && timerManager) {
          timerManager.onConfigChange(key, value);
        }
        
        // Notify all windows of config update
        notifyConfigUpdate();
        
        return configManager.get(key);
      }
    } catch (error) {
      console.error('Error setting config:', error);
      throw error;
    }
  });

  // Document handlers
  ipcMain.handle(IPC_CHANNELS.DOCUMENT_ADD, async (event, filePath) => {
    try {
      if (!configManager) {
        throw new Error('ConfigManager not initialized');
      }
      
      // Validate file path
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }
      
      // Validate document using DocumentProcessor
      if (documentProcessor) {
        const validation = await documentProcessor.validateDocument(filePath);
        if (!validation.valid) {
          const error = new Error(validation.userFriendlyError || validation.error);
          error.userFriendly = validation.userFriendlyError;
          throw error;
        }
      } else {
        // Fallback validation if DocumentProcessor not initialized
        const fs = require('fs').promises;
        try {
          await fs.access(filePath);
        } catch (error) {
          throw new Error(`File not found: ${filePath}`);
        }
      }
      
      // Get current documents
      const documents = configManager.get('documents') || [];
      
      // Check if document already exists
      if (documents.includes(filePath)) {
        throw new Error('Document already added');
      }
      
      // Add document to list
      documents.push(filePath);
      await configManager.set('documents', documents);
      
      // Notify all windows of config update
      notifyConfigUpdate();
      
      return { success: true, filePath };
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENT_REMOVE, async (event, filePath) => {
    try {
      if (!configManager) {
        throw new Error('ConfigManager not initialized');
      }
      
      // Validate file path
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }
      
      // Get current documents
      const documents = configManager.get('documents') || [];
      
      // Remove document from list
      const index = documents.indexOf(filePath);
      if (index === -1) {
        throw new Error('Document not found in list');
      }
      
      documents.splice(index, 1);
      await configManager.set('documents', documents);
      
      // Notify all windows of config update
      notifyConfigUpdate();
      
      return { success: true, filePath };
    } catch (error) {
      console.error('Error removing document:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENT_VALIDATE, async (event, filePath) => {
    try {
      // Validate file path
      if (!filePath || typeof filePath !== 'string') {
        return { 
          valid: false, 
          error: 'Invalid file path',
          userFriendlyError: 'Invalid file path provided'
        };
      }
      
      // Use DocumentProcessor for validation if available
      if (documentProcessor) {
        const validation = await documentProcessor.validateDocument(filePath);
        return {
          valid: validation.valid,
          error: validation.error,
          userFriendlyError: validation.userFriendlyError,
          size: validation.metadata?.size
        };
      }
      
      // Fallback validation
      const fs = require('fs').promises;
      try {
        const stats = await fs.stat(filePath);
        
        // Check file size (max 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (stats.size > maxSize) {
          return { 
            valid: false, 
            error: 'File too large (max 50MB)',
            userFriendlyError: 'File is too large. Maximum size is 50MB.'
          };
        }
        
        // Check file extension
        const { SUPPORTED_FORMATS } = require('../shared/constants');
        const ext = path.extname(filePath).toLowerCase();
        if (!SUPPORTED_FORMATS.includes(ext)) {
          return { 
            valid: false, 
            error: 'Unsupported file format',
            userFriendlyError: 'Unsupported file type. Please use PDF, DOCX, MD, or TXT files.'
          };
        }
        
        return { valid: true, size: stats.size };
      } catch (error) {
        return { 
          valid: false, 
          error: 'File not found',
          userFriendlyError: 'File not found or cannot be accessed'
        };
      }
    } catch (error) {
      console.error('Error validating document:', error);
      return { 
        valid: false, 
        error: error.message,
        userFriendlyError: 'An error occurred while validating the file'
      };
    }
  });

  // Validate all documents and remove invalid ones
  ipcMain.handle(IPC_CHANNELS.DOCUMENTS_VALIDATE_ALL, async () => {
    try {
      if (!configManager || !documentProcessor) {
        throw new Error('Required managers not initialized');
      }
      
      const documents = configManager.get('documents') || [];
      
      if (documents.length === 0) {
        return {
          valid: [],
          invalid: [],
          removed: []
        };
      }
      
      // Validate all documents
      const validationResults = await documentProcessor.validateDocuments(documents);
      
      const validDocs = [];
      const invalidDocs = [];
      const removedDocs = [];
      
      // Separate valid and invalid documents
      for (const [filePath, result] of validationResults.entries()) {
        if (result.valid) {
          validDocs.push(filePath);
        } else {
          invalidDocs.push({
            filePath,
            error: result.error,
            userFriendlyError: result.userFriendlyError,
            fileName: path.basename(filePath)
          });
          removedDocs.push(filePath);
        }
      }
      
      // Remove invalid documents from config
      if (removedDocs.length > 0) {
        await configManager.set('documents', validDocs);
        console.log(`Removed ${removedDocs.length} invalid documents from configuration`);
        
        // Notify all windows of config update
        notifyConfigUpdate();
      }
      
      return {
        valid: validDocs,
        invalid: invalidDocs,
        removed: removedDocs
      };
    } catch (error) {
      console.error('Error validating all documents:', error);
      throw error;
    }
  });

  // Timer handlers
  ipcMain.handle(IPC_CHANNELS.TIMER_START, async () => {
    try {
      if (!timerManager) {
        throw new Error('TimerManager not initialized');
      }
      timerManager.start();
      return { success: true };
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TIMER_STOP, async () => {
    try {
      if (!timerManager) {
        throw new Error('TimerManager not initialized');
      }
      timerManager.stop();
      return { success: true };
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TIMER_RESET, async () => {
    try {
      if (!timerManager) {
        throw new Error('TimerManager not initialized');
      }
      timerManager.reset();
      return { success: true };
    } catch (error) {
      console.error('Error resetting timer:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TIMER_STATUS, async () => {
    try {
      if (!timerManager) {
        throw new Error('TimerManager not initialized');
      }
      return timerManager.getStatus();
    } catch (error) {
      console.error('Error getting timer status:', error);
      throw error;
    }
  });

  // Question status handlers
  ipcMain.handle(IPC_CHANNELS.QUESTIONS_STATUS, async () => {
    try {
      if (!questionGenerator) {
        return {
          hasQuestions: false,
          hasUnusedQuestions: false,
          totalQuestions: 0,
          usedQuestions: 0,
          error: 'QuestionGenerator not initialized'
        };
      }
      
      const stats = questionGenerator.getSessionStats();
      
      return {
        hasQuestions: questionGenerator.hasQuestions(),
        hasUnusedQuestions: questionGenerator.hasUnusedQuestions(),
        totalQuestions: stats.totalQuestions,
        usedQuestions: stats.usedQuestions,
        remainingQuestions: stats.remainingQuestions,
        error: null
      };
    } catch (error) {
      console.error('Error getting question status:', error);
      return {
        hasQuestions: false,
        hasUnusedQuestions: false,
        totalQuestions: 0,
        usedQuestions: 0,
        error: error.message
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.QUESTIONS_REGENERATE, async () => {
    try {
      const success = await regenerateQuestions();
      
      if (!success) {
        return {
          success: false,
          error: 'Failed to generate questions. Please check your document configuration.'
        };
      }
      
      const stats = questionGenerator.getSessionStats();
      
      return {
        success: true,
        questionsGenerated: stats.totalQuestions,
        error: null
      };
    } catch (error) {
      console.error('Error regenerating questions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Scare window handlers - now handled by ScareController
  // The ScareController sets up its own IPC listeners when setScareWindow is called
  // We just need to ensure the handlers are registered
  
  // Note: SCARE_STAGE_COMPLETE and ANSWER_SUBMIT are handled by ScareController
  // SCARE_CANCEL is also handled by ScareController
  
  console.log('Scare window IPC handlers will be set up by ScareController');

  // Session statistics handlers
  ipcMain.handle(IPC_CHANNELS.SESSION_GET_STATS, async () => {
    try {
      if (!sessionManager) {
        return { error: 'Session manager not initialized' };
      }

      const stats = sessionManager.getStatistics();
      const accuracy = sessionManager.getAccuracy();
      const duration = sessionManager.getFormattedDuration();

      return {
        ...stats,
        accuracy,
        duration,
        error: null
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_RESET, async () => {
    try {
      if (!sessionManager) {
        return { success: false, error: 'Session manager not initialized' };
      }

      await sessionManager.resetSession();
      console.log('Session statistics reset');

      return { success: true, error: null };
    } catch (error) {
      console.error('Error resetting session:', error);
      return { success: false, error: error.message };
    }
  });

  // Resource monitoring handlers
  ipcMain.handle('resource-get-summary', async () => {
    try {
      if (!resourceMonitor) {
        return { error: 'Resource monitor not initialized' };
      }

      return resourceMonitor.getSummary();
    } catch (error) {
      console.error('Error getting resource summary:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('resource-check-compliance', async () => {
    try {
      if (!resourceMonitor) {
        return { error: 'Resource monitor not initialized' };
      }

      return resourceMonitor.checkCompliance({
        maxMemoryMB: 100,
        maxCPUPercent: 5
      });
    } catch (error) {
      console.error('Error checking resource compliance:', error);
      return { error: error.message };
    }
  });

  console.log('IPC handlers registered');
}

/**
 * Validate configuration object
 */
function validateConfig(config) {
  const { DIFFICULTY_LEVELS, THEMES } = require('../shared/constants');
  
  // Validate interval
  if (config.interval !== undefined) {
    if (typeof config.interval !== 'number' || config.interval < 5 || config.interval > 120) {
      throw new Error('Interval must be between 5 and 120 minutes');
    }
  }
  
  // Validate audioEnabled
  if (config.audioEnabled !== undefined) {
    if (typeof config.audioEnabled !== 'boolean') {
      throw new Error('audioEnabled must be a boolean');
    }
  }
  
  // Validate difficulty
  if (config.difficulty !== undefined) {
    if (!DIFFICULTY_LEVELS.includes(config.difficulty)) {
      throw new Error(`difficulty must be one of: ${DIFFICULTY_LEVELS.join(', ')}`);
    }
  }
  
  // Validate theme
  if (config.theme !== undefined) {
    if (!THEMES.includes(config.theme)) {
      throw new Error(`theme must be one of: ${THEMES.join(', ')}`);
    }
  }
  
  // Validate documents
  if (config.documents !== undefined) {
    if (!Array.isArray(config.documents)) {
      throw new Error('documents must be an array');
    }
  }
}

/**
 * Notify all renderer windows of config update
 */
function notifyConfigUpdate() {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach(window => {
    window.webContents.send(IPC_CHANNELS.CONFIG_UPDATED, configManager.config);
  });
}

function createTray() {
  // Create system tray icon (placeholder path for now)
  tray = new Tray(path.join(__dirname, '../renderer/assets/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Configuration',
      click: () => {
        if (!configWindow) {
          createConfigWindow();
        } else {
          configWindow.show();
        }
      }
    },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Spooky Study App');
  tray.setContextMenu(contextMenu);
}

function createConfigWindow() {
  configWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../renderer/config/preload.js')
    },
    show: false
  });

  configWindow.loadFile(path.join(__dirname, '../renderer/config/index.html'));

  configWindow.once('ready-to-show', () => {
    configWindow.show();
  });

  configWindow.on('closed', () => {
    configWindow = null;
  });
}

/**
 * Create the scare window with transparent overlay
 * Window is created as frameless, transparent, always-on-top, and full-screen
 */
function createScareWindow() {
  // Get primary display dimensions
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  scareWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    fullscreen: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../renderer/scare/preload.js')
    },
    show: false
  });

  scareWindow.loadFile(path.join(__dirname, '../renderer/scare/index.html'));

  // Set window to be always on top of all other windows
  scareWindow.setAlwaysOnTop(true, 'screen-saver');
  
  // Prevent window from being hidden by other windows
  scareWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  scareWindow.on('closed', () => {
    scareWindow = null;
  });

  console.log('Scare window created');
}

/**
 * Show the scare window
 * Creates the window if it doesn't exist, then shows it
 */
function showScareWindow() {
  if (!scareWindow) {
    createScareWindow();
  }
  
  // Wait for window to be ready before showing
  if (scareWindow.webContents.isLoading()) {
    scareWindow.webContents.once('did-finish-load', () => {
      scareWindow.show();
      scareWindow.focus();
      console.log('Scare window shown');
    });
  } else {
    scareWindow.show();
    scareWindow.focus();
    console.log('Scare window shown');
  }
}

/**
 * Hide the scare window
 * Hides the window but keeps it in memory for faster subsequent shows
 */
function hideScareWindow() {
  if (scareWindow && !scareWindow.isDestroyed()) {
    scareWindow.hide();
    console.log('Scare window hidden');
  }
}

/**
 * Destroy the scare window
 * Completely removes the window from memory
 */
function destroyScareWindow() {
  if (scareWindow && !scareWindow.isDestroyed()) {
    scareWindow.destroy();
    scareWindow = null;
    console.log('Scare window destroyed');
  }
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  // Keep app running in background on all platforms
  // Don't quit even if all windows are closed
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createConfigWindow();
  }
});

// Graceful shutdown
app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    
    console.log('Spooky Study App shutting down...');
    
    try {
      // Stop resource monitoring
      if (resourceMonitor) {
        resourceMonitor.stop();
        const finalSummary = resourceMonitor.getSummary();
        console.log('Final resource usage:', JSON.stringify(finalSummary, null, 2));
        resourceMonitor = null;
      }

      // Clean up ScareController
      if (scareController) {
        scareController.destroy();
        scareController = null;
      }
      
      // Stop and save timer state
      if (timerManager) {
        timerManager.stop();
        await timerManager._saveTimerState();
        timerManager.destroy();
        timerManager = null;
      }
      
      // Clear question cache from memory
      if (questionGenerator) {
        questionGenerator.clearMemoryCache();
      }

      // Save session state
      await saveSessionState();
      
      // Clean up resources
      if (tray) {
        tray.destroy();
        tray = null;
      }
      
      // Close all windows
      if (configWindow) {
        configWindow.destroy();
        configWindow = null;
      }
      
      destroyScareWindow();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('Forced garbage collection on shutdown');
      }

      console.log('Shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    } finally {
      // Force quit after cleanup
      app.exit(0);
    }
  }
});

/**
 * Validate that questions are available before starting timer
 * @returns {Promise<boolean>} - True if questions are available
 */
async function validateQuestionsAvailable() {
  try {
    const documents = configManager.get('documents') || [];
    
    if (documents.length === 0) {
      console.warn('No documents configured. Timer will not start until documents are added.');
      return false;
    }
    
    // Try to load cached questions first
    await questionGenerator.loadCache();
    
    if (questionGenerator.hasQuestions()) {
      console.log('Using cached questions from previous session');
      return true;
    }
    
    // No cached questions, try to generate new ones
    console.log('No cached questions found, generating new questions...');
    return await regenerateQuestions();
  } catch (error) {
    console.error('Error validating questions:', error);
    return false;
  }
}

/**
 * Regenerate questions from configured documents
 * @returns {Promise<boolean>} - True if questions were generated successfully
 */
async function regenerateQuestions() {
  try {
    const documents = configManager.get('documents') || [];
    
    if (documents.length === 0) {
      console.warn('Cannot generate questions: no documents configured');
      return false;
    }
    
    // Process documents
    console.log(`Processing ${documents.length} documents...`);
    const processedDocs = await documentProcessor.processAllDocuments();
    
    if (processedDocs.length === 0) {
      console.error('No documents could be processed successfully');
      return false;
    }
    
    // Generate questions with fallback
    const result = await questionGenerator.generateQuestionsWithFallback(processedDocs, 20);
    
    if (result.error) {
      console.error('Question generation failed:', result.error);
      return false;
    }
    
    if (result.usedCache) {
      console.log('Using cached questions from previous session');
    } else {
      console.log(`Generated ${result.questions.length} new questions`);
    }
    
    return result.questions.length > 0;
  } catch (error) {
    console.error('Error regenerating questions:', error);
    return false;
  }
}

/**
 * Save session state before shutdown
 */
async function saveSessionState() {
  try {
    const fs = require('fs').promises;
    const sessionPath = path.join(app.getPath('userData'), 'session.json');
    
    // Load existing session data if it exists
    let sessionState = {
      lastShutdown: new Date().toISOString(),
      questionsAnswered: 0,
      correctAnswers: 0,
      currentStreak: 0
    };
    
    try {
      const existingData = await fs.readFile(sessionPath, 'utf8');
      sessionState = { ...sessionState, ...JSON.parse(existingData) };
    } catch (error) {
      // File doesn't exist yet, use defaults
    }
    
    // Update shutdown timestamp
    sessionState.lastShutdown = new Date().toISOString();
    
    await fs.writeFile(sessionPath, JSON.stringify(sessionState, null, 2), 'utf8');
    console.log('Session state saved');
  } catch (error) {
    console.error('Failed to save session state:', error);
    // Don't throw - allow shutdown to continue
  }
}

/**
 * Get the ConfigManager instance
 * @returns {ConfigManager}
 */
function getConfigManager() {
  return configManager;
}

/**
 * Get the TimerManager instance
 * @returns {TimerManager}
 */
function getTimerManager() {
  return timerManager;
}

/**
 * Get the scare window instance
 * @returns {BrowserWindow|null}
 */
function getScareWindow() {
  return scareWindow;
}

/**
 * Get the ScareController instance
 * @returns {ScareController|null}
 */
function getScareController() {
  return scareController;
}

/**
 * Get the QuestionGenerator instance
 * @returns {QuestionGenerator|null}
 */
function getQuestionGenerator() {
  return questionGenerator;
}

/**
 * Get the DocumentProcessor instance
 * @returns {DocumentProcessor|null}
 */
function getDocumentProcessor() {
  return documentProcessor;
}

/**
 * Get the SessionManager instance
 * @returns {SessionManager|null}
 */
function getSessionManager() {
  return sessionManager;
}

/**
 * Get the ResourceMonitor instance
 * @returns {ResourceMonitor|null}
 */
function getResourceMonitor() {
  return resourceMonitor;
}

// Export for testing
module.exports = {
  getConfigManager,
  getTimerManager,
  getScareWindow,
  getScareController,
  getQuestionGenerator,
  getDocumentProcessor,
  getSessionManager,
  getResourceMonitor,
  initializeApp,
  saveSessionState,
  createScareWindow,
  showScareWindow,
  hideScareWindow,
  destroyScareWindow
};
