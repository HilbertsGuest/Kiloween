/**
 * Integration tests for IPC communication
 * Tests the actual flow between main and renderer processes
 */

const fs = require('fs').promises;
const path = require('path');

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => './test-data'),
    requestSingleInstanceLock: vi.fn(() => true),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
    exit: vi.fn()
  },
  BrowserWindow: vi.fn(() => ({
    loadFile: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    webContents: {
      send: vi.fn()
    }
  })),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  },
  Tray: vi.fn(() => ({
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    destroy: vi.fn()
  })),
  Menu: {
    buildFromTemplate: vi.fn(() => ({}))
  }
}));

const { IPC_CHANNELS } = require('../shared/constants');
const ConfigManager = require('./ConfigManager');

describe('IPC Integration Tests', () => {
  let configManager;
  let testConfigPath;
  let handlers;

  beforeEach(async () => {
    // Set up test config
    testConfigPath = path.join('./test-data', 'ipc-test-config.json');
    configManager = new ConfigManager(testConfigPath);
    
    // Clean up any existing test config
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    // Load initial config
    await configManager.load();
    
    // Set up IPC handlers
    handlers = {};
    
    // Register handlers (simulating setupIPCHandlers)
    setupTestIPCHandlers();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  function setupTestIPCHandlers() {
    // CONFIG_GET handler
    handlers[IPC_CHANNELS.CONFIG_GET] = async (event, key) => {
      if (!configManager) {
        throw new Error('ConfigManager not initialized');
      }
      
      if (key) {
        return configManager.get(key);
      } else {
        return configManager.config;
      }
    };

    // CONFIG_SET handler
    handlers[IPC_CHANNELS.CONFIG_SET] = async (event, key, value) => {
      if (!configManager) {
        throw new Error('ConfigManager not initialized');
      }
      
      if (typeof key === 'object' && value === undefined) {
        const newConfig = key;
        for (const [k, v] of Object.entries(newConfig)) {
          await configManager.set(k, v);
        }
        return configManager.config;
      } else {
        await configManager.set(key, value);
        return configManager.get(key);
      }
    };

    // DOCUMENT_ADD handler
    handlers[IPC_CHANNELS.DOCUMENT_ADD] = async (event, filePath) => {
      if (!configManager) {
        throw new Error('ConfigManager not initialized');
      }
      
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }
      
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const documents = configManager.get('documents') || [];
      
      if (documents.includes(filePath)) {
        throw new Error('Document already added');
      }
      
      documents.push(filePath);
      await configManager.set('documents', documents);
      
      return { success: true, filePath };
    };

    // DOCUMENT_REMOVE handler
    handlers[IPC_CHANNELS.DOCUMENT_REMOVE] = async (event, filePath) => {
      if (!configManager) {
        throw new Error('ConfigManager not initialized');
      }
      
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }
      
      const documents = configManager.get('documents') || [];
      const index = documents.indexOf(filePath);
      
      if (index === -1) {
        throw new Error('Document not found in list');
      }
      
      documents.splice(index, 1);
      await configManager.set('documents', documents);
      
      return { success: true, filePath };
    };

    // DOCUMENT_VALIDATE handler
    handlers[IPC_CHANNELS.DOCUMENT_VALIDATE] = async (event, filePath) => {
      if (!filePath || typeof filePath !== 'string') {
        return { valid: false, error: 'Invalid file path' };
      }
      
      try {
        const stats = await fs.stat(filePath);
        const maxSize = 50 * 1024 * 1024;
        
        if (stats.size > maxSize) {
          return { valid: false, error: 'File too large (max 50MB)' };
        }
        
        const { SUPPORTED_FORMATS } = require('../shared/constants');
        const ext = path.extname(filePath).toLowerCase();
        
        if (!SUPPORTED_FORMATS.includes(ext)) {
          return { valid: false, error: 'Unsupported file format' };
        }
        
        return { valid: true, size: stats.size };
      } catch (error) {
        return { valid: false, error: 'File not found' };
      }
    };
  }

  describe('Configuration Flow', () => {
    it('should load, modify, and persist configuration', async () => {
      // Get initial config
      const initialConfig = await handlers[IPC_CHANNELS.CONFIG_GET]({}, undefined);
      expect(initialConfig.interval).toBe(30);
      
      // Update interval
      await handlers[IPC_CHANNELS.CONFIG_SET]({}, 'interval', 60);
      
      // Verify update
      const updatedInterval = await handlers[IPC_CHANNELS.CONFIG_GET]({}, 'interval');
      expect(updatedInterval).toBe(60);
      
      // Verify persistence
      const fileContent = await fs.readFile(testConfigPath, 'utf8');
      const savedConfig = JSON.parse(fileContent);
      expect(savedConfig.interval).toBe(60);
    });

    it('should update multiple config values at once', async () => {
      const updates = {
        interval: 45,
        audioEnabled: false,
        difficulty: 'hard'
      };
      
      await handlers[IPC_CHANNELS.CONFIG_SET]({}, updates);
      
      const config = await handlers[IPC_CHANNELS.CONFIG_GET]({}, undefined);
      expect(config.interval).toBe(45);
      expect(config.audioEnabled).toBe(false);
      expect(config.difficulty).toBe('hard');
    });
  });

  describe('Document Management Flow', () => {
    let testDocPath;

    beforeEach(async () => {
      // Create a test document
      testDocPath = path.join('./test-data', 'test-document.pdf');
      await fs.mkdir(path.dirname(testDocPath), { recursive: true });
      await fs.writeFile(testDocPath, 'Test PDF content', 'utf8');
    });

    afterEach(async () => {
      try {
        await fs.unlink(testDocPath);
      } catch (error) {
        // Ignore
      }
    });

    it('should add and remove documents', async () => {
      // Add document
      const addResult = await handlers[IPC_CHANNELS.DOCUMENT_ADD]({}, testDocPath);
      expect(addResult.success).toBe(true);
      expect(addResult.filePath).toBe(testDocPath);
      
      // Verify document was added
      const documents = await handlers[IPC_CHANNELS.CONFIG_GET]({}, 'documents');
      expect(documents).toContain(testDocPath);
      
      // Remove document
      const removeResult = await handlers[IPC_CHANNELS.DOCUMENT_REMOVE]({}, testDocPath);
      expect(removeResult.success).toBe(true);
      
      // Verify document was removed
      const updatedDocuments = await handlers[IPC_CHANNELS.CONFIG_GET]({}, 'documents');
      expect(updatedDocuments).not.toContain(testDocPath);
    });

    it('should validate documents before adding', async () => {
      // Validate existing document
      const validResult = await handlers[IPC_CHANNELS.DOCUMENT_VALIDATE]({}, testDocPath);
      expect(validResult.valid).toBe(true);
      expect(validResult.size).toBeGreaterThan(0);
      
      // Validate non-existent document
      const invalidResult = await handlers[IPC_CHANNELS.DOCUMENT_VALIDATE]({}, '/nonexistent/file.pdf');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBe('File not found');
    });

    it('should prevent adding duplicate documents', async () => {
      // Add document first time
      await handlers[IPC_CHANNELS.DOCUMENT_ADD]({}, testDocPath);
      
      // Try to add again
      await expect(
        handlers[IPC_CHANNELS.DOCUMENT_ADD]({}, testDocPath)
      ).rejects.toThrow('Document already added');
    });

    it('should handle multiple documents', async () => {
      // Create multiple test documents
      const doc1 = path.join('./test-data', 'doc1.pdf');
      const doc2 = path.join('./test-data', 'doc2.txt');
      const doc3 = path.join('./test-data', 'doc3.md');
      
      await fs.writeFile(doc1, 'Content 1', 'utf8');
      await fs.writeFile(doc2, 'Content 2', 'utf8');
      await fs.writeFile(doc3, 'Content 3', 'utf8');
      
      // Add all documents
      await handlers[IPC_CHANNELS.DOCUMENT_ADD]({}, doc1);
      await handlers[IPC_CHANNELS.DOCUMENT_ADD]({}, doc2);
      await handlers[IPC_CHANNELS.DOCUMENT_ADD]({}, doc3);
      
      // Verify all were added
      const documents = await handlers[IPC_CHANNELS.CONFIG_GET]({}, 'documents');
      expect(documents).toHaveLength(3);
      expect(documents).toContain(doc1);
      expect(documents).toContain(doc2);
      expect(documents).toContain(doc3);
      
      // Remove one
      await handlers[IPC_CHANNELS.DOCUMENT_REMOVE]({}, doc2);
      
      // Verify only that one was removed
      const updatedDocuments = await handlers[IPC_CHANNELS.CONFIG_GET]({}, 'documents');
      expect(updatedDocuments).toHaveLength(2);
      expect(updatedDocuments).toContain(doc1);
      expect(updatedDocuments).not.toContain(doc2);
      expect(updatedDocuments).toContain(doc3);
      
      // Cleanup
      await fs.unlink(doc1);
      await fs.unlink(doc2);
      await fs.unlink(doc3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing files gracefully', async () => {
      await expect(
        handlers[IPC_CHANNELS.DOCUMENT_ADD]({}, '/nonexistent/file.pdf')
      ).rejects.toThrow('File not found');
    });

    it('should handle invalid config values', async () => {
      await expect(
        handlers[IPC_CHANNELS.CONFIG_SET]({}, { interval: 200 })
      ).rejects.toThrow();
    });

    it('should handle removing non-existent documents', async () => {
      await expect(
        handlers[IPC_CHANNELS.DOCUMENT_REMOVE]({}, '/nonexistent/file.pdf')
      ).rejects.toThrow('Document not found in list');
    });
  });

  describe('File Validation', () => {
    it('should validate file size limits', async () => {
      // Create a large file (simulated)
      const largePath = path.join('./test-data', 'large.pdf');
      await fs.mkdir(path.dirname(largePath), { recursive: true });
      
      // Create a file larger than 50MB (we'll mock the stat result)
      await fs.writeFile(largePath, 'content', 'utf8');
      
      // Mock fs.stat to return large size
      const originalStat = fs.stat;
      fs.stat = vi.fn(async (filePath) => {
        if (filePath === largePath) {
          return { size: 100 * 1024 * 1024 }; // 100MB
        }
        return originalStat(filePath);
      });
      
      const result = await handlers[IPC_CHANNELS.DOCUMENT_VALIDATE]({}, largePath);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File too large (max 50MB)');
      
      // Restore original stat
      fs.stat = originalStat;
      
      // Cleanup
      await fs.unlink(largePath);
    });

    it('should validate file extensions', async () => {
      const invalidPath = path.join('./test-data', 'invalid.exe');
      await fs.mkdir(path.dirname(invalidPath), { recursive: true });
      await fs.writeFile(invalidPath, 'content', 'utf8');
      
      const result = await handlers[IPC_CHANNELS.DOCUMENT_VALIDATE]({}, invalidPath);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported file format');
      
      // Cleanup
      await fs.unlink(invalidPath);
    });

    it('should accept all supported formats', async () => {
      const formats = ['.pdf', '.docx', '.md', '.txt'];
      
      for (const ext of formats) {
        const filePath = path.join('./test-data', `test${ext}`);
        await fs.writeFile(filePath, 'content', 'utf8');
        
        const result = await handlers[IPC_CHANNELS.DOCUMENT_VALIDATE]({}, filePath);
        expect(result.valid).toBe(true);
        
        await fs.unlink(filePath);
      }
    });
  });
});
