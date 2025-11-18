/**
 * Tests for IPC handlers
 */

const { IPC_CHANNELS } = require('../shared/constants');

describe('IPC Handlers', () => {
  let mockConfigManager;
  let mockIpcMain;
  let handlers;

  beforeEach(() => {
    // Mock ConfigManager
    mockConfigManager = {
      config: {
        interval: 30,
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween'
      },
      get: vi.fn((key) => mockConfigManager.config[key]),
      set: vi.fn(async (key, value) => {
        mockConfigManager.config[key] = value;
      })
    };

    // Mock ipcMain
    handlers = {};
    mockIpcMain = {
      handle: vi.fn((channel, handler) => {
        handlers[channel] = handler;
      })
    };

    // Mock BrowserWindow
    global.BrowserWindow = {
      getAllWindows: vi.fn(() => [])
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CONFIG_GET handler', () => {
    it('should return entire config when no key provided', async () => {
      const handler = async (event, key) => {
        if (key) {
          return mockConfigManager.get(key);
        } else {
          return mockConfigManager.config;
        }
      };

      const result = await handler({}, undefined);
      expect(result).toEqual(mockConfigManager.config);
    });

    it('should return specific config value when key provided', async () => {
      const handler = async (event, key) => {
        if (key) {
          return mockConfigManager.get(key);
        } else {
          return mockConfigManager.config;
        }
      };

      mockConfigManager.get.mockReturnValue(30);
      const result = await handler({}, 'interval');
      expect(result).toBe(30);
      expect(mockConfigManager.get).toHaveBeenCalledWith('interval');
    });

    it('should throw error when ConfigManager not initialized', async () => {
      const handler = async (event, key) => {
        if (!mockConfigManager) {
          throw new Error('ConfigManager not initialized');
        }
        return mockConfigManager.config;
      };

      mockConfigManager = null;
      await expect(handler({}, undefined)).rejects.toThrow('ConfigManager not initialized');
    });
  });

  describe('CONFIG_SET handler', () => {
    it('should set single config value', async () => {
      const handler = async (event, key, value) => {
        await mockConfigManager.set(key, value);
        return mockConfigManager.get(key);
      };

      await handler({}, 'interval', 45);
      expect(mockConfigManager.set).toHaveBeenCalledWith('interval', 45);
    });

    it('should set entire config object', async () => {
      const handler = async (event, key, value) => {
        if (typeof key === 'object' && value === undefined) {
          const newConfig = key;
          for (const [k, v] of Object.entries(newConfig)) {
            await mockConfigManager.set(k, v);
          }
          return mockConfigManager.config;
        } else {
          await mockConfigManager.set(key, value);
          return mockConfigManager.get(key);
        }
      };

      const newConfig = {
        interval: 60,
        audioEnabled: false
      };

      await handler({}, newConfig);
      expect(mockConfigManager.set).toHaveBeenCalledWith('interval', 60);
      expect(mockConfigManager.set).toHaveBeenCalledWith('audioEnabled', false);
    });

    it('should validate config before setting', async () => {
      const validateConfig = (config) => {
        if (config.interval !== undefined) {
          if (typeof config.interval !== 'number' || config.interval < 5 || config.interval > 120) {
            throw new Error('Interval must be between 5 and 120 minutes');
          }
        }
      };

      const handler = async (event, key, value) => {
        if (typeof key === 'object' && value === undefined) {
          validateConfig(key);
          const newConfig = key;
          for (const [k, v] of Object.entries(newConfig)) {
            await mockConfigManager.set(k, v);
          }
          return mockConfigManager.config;
        }
      };

      const invalidConfig = { interval: 200 };
      await expect(handler({}, invalidConfig)).rejects.toThrow('Interval must be between 5 and 120 minutes');
    });
  });

  describe('DOCUMENT_ADD handler', () => {
    let mockFs;

    beforeEach(() => {
      mockFs = {
        access: vi.fn().mockResolvedValue(undefined)
      };
    });

    it('should add document to list', async () => {
      const handler = async (event, filePath) => {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Invalid file path');
        }

        await mockFs.access(filePath);

        const documents = mockConfigManager.get('documents') || [];
        if (documents.includes(filePath)) {
          throw new Error('Document already added');
        }

        documents.push(filePath);
        await mockConfigManager.set('documents', documents);

        return { success: true, filePath };
      };

      mockConfigManager.get.mockReturnValue([]);

      const result = await handler({}, '/path/to/document.pdf');
      expect(result).toEqual({ success: true, filePath: '/path/to/document.pdf' });
      expect(mockConfigManager.set).toHaveBeenCalledWith('documents', ['/path/to/document.pdf']);
    });

    it('should throw error for invalid file path', async () => {
      const handler = async (event, filePath) => {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Invalid file path');
        }
      };

      await expect(handler({}, null)).rejects.toThrow('Invalid file path');
      await expect(handler({}, '')).rejects.toThrow('Invalid file path');
    });

    it('should throw error if document already exists', async () => {
      const handler = async (event, filePath) => {
        const documents = mockConfigManager.get('documents') || [];
        if (documents.includes(filePath)) {
          throw new Error('Document already added');
        }
      };

      mockConfigManager.get.mockReturnValue(['/path/to/document.pdf']);

      await expect(handler({}, '/path/to/document.pdf')).rejects.toThrow('Document already added');
    });

    it('should throw error if file does not exist', async () => {
      const handler = async (event, filePath) => {
        try {
          await mockFs.access(filePath);
        } catch (error) {
          throw new Error(`File not found: ${filePath}`);
        }
      };

      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await expect(handler({}, '/nonexistent/file.pdf')).rejects.toThrow('File not found');
    });
  });

  describe('DOCUMENT_REMOVE handler', () => {
    it('should remove document from list', async () => {
      const handler = async (event, filePath) => {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Invalid file path');
        }

        const documents = mockConfigManager.get('documents') || [];
        const index = documents.indexOf(filePath);
        if (index === -1) {
          throw new Error('Document not found in list');
        }

        documents.splice(index, 1);
        await mockConfigManager.set('documents', documents);

        return { success: true, filePath };
      };

      mockConfigManager.get.mockReturnValue(['/path/to/document.pdf', '/path/to/other.pdf']);

      const result = await handler({}, '/path/to/document.pdf');
      expect(result).toEqual({ success: true, filePath: '/path/to/document.pdf' });
      expect(mockConfigManager.set).toHaveBeenCalledWith('documents', ['/path/to/other.pdf']);
    });

    it('should throw error for invalid file path', async () => {
      const handler = async (event, filePath) => {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Invalid file path');
        }
      };

      await expect(handler({}, null)).rejects.toThrow('Invalid file path');
    });

    it('should throw error if document not in list', async () => {
      const handler = async (event, filePath) => {
        const documents = mockConfigManager.get('documents') || [];
        const index = documents.indexOf(filePath);
        if (index === -1) {
          throw new Error('Document not found in list');
        }
      };

      mockConfigManager.get.mockReturnValue(['/path/to/other.pdf']);

      await expect(handler({}, '/path/to/document.pdf')).rejects.toThrow('Document not found in list');
    });
  });

  describe('DOCUMENT_VALIDATE handler', () => {
    let mockFs;
    let mockPath;

    beforeEach(() => {
      mockFs = {
        stat: vi.fn()
      };
      mockPath = {
        extname: vi.fn()
      };
    });

    it('should validate valid document', async () => {
      const handler = async (event, filePath) => {
        if (!filePath || typeof filePath !== 'string') {
          return { valid: false, error: 'Invalid file path' };
        }

        try {
          const stats = await mockFs.stat(filePath);
          const maxSize = 50 * 1024 * 1024;
          if (stats.size > maxSize) {
            return { valid: false, error: 'File too large (max 50MB)' };
          }

          const ext = mockPath.extname(filePath).toLowerCase();
          const SUPPORTED_FORMATS = ['.pdf', '.docx', '.md', '.txt'];
          if (!SUPPORTED_FORMATS.includes(ext)) {
            return { valid: false, error: 'Unsupported file format' };
          }

          return { valid: true, size: stats.size };
        } catch (error) {
          return { valid: false, error: 'File not found' };
        }
      };

      mockFs.stat.mockResolvedValue({ size: 1024 * 1024 }); // 1MB
      mockPath.extname.mockReturnValue('.pdf');

      const result = await handler({}, '/path/to/document.pdf');
      expect(result).toEqual({ valid: true, size: 1024 * 1024 });
    });

    it('should reject file that is too large', async () => {
      const handler = async (event, filePath) => {
        const stats = await mockFs.stat(filePath);
        const maxSize = 50 * 1024 * 1024;
        if (stats.size > maxSize) {
          return { valid: false, error: 'File too large (max 50MB)' };
        }
        return { valid: true, size: stats.size };
      };

      mockFs.stat.mockResolvedValue({ size: 100 * 1024 * 1024 }); // 100MB

      const result = await handler({}, '/path/to/large.pdf');
      expect(result).toEqual({ valid: false, error: 'File too large (max 50MB)' });
    });

    it('should reject unsupported file format', async () => {
      const handler = async (event, filePath) => {
        const stats = await mockFs.stat(filePath);
        const ext = mockPath.extname(filePath).toLowerCase();
        const SUPPORTED_FORMATS = ['.pdf', '.docx', '.md', '.txt'];
        if (!SUPPORTED_FORMATS.includes(ext)) {
          return { valid: false, error: 'Unsupported file format' };
        }
        return { valid: true, size: stats.size };
      };

      mockFs.stat.mockResolvedValue({ size: 1024 });
      mockPath.extname.mockReturnValue('.exe');

      const result = await handler({}, '/path/to/file.exe');
      expect(result).toEqual({ valid: false, error: 'Unsupported file format' });
    });

    it('should handle file not found', async () => {
      const handler = async (event, filePath) => {
        try {
          await mockFs.stat(filePath);
        } catch (error) {
          return { valid: false, error: 'File not found' };
        }
      };

      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      const result = await handler({}, '/nonexistent/file.pdf');
      expect(result).toEqual({ valid: false, error: 'File not found' });
    });
  });

  describe('Config validation', () => {
    const validateConfig = (config) => {
      const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
      const THEMES = ['halloween', 'dark'];

      if (config.interval !== undefined) {
        if (typeof config.interval !== 'number' || config.interval < 5 || config.interval > 120) {
          throw new Error('Interval must be between 5 and 120 minutes');
        }
      }

      if (config.audioEnabled !== undefined) {
        if (typeof config.audioEnabled !== 'boolean') {
          throw new Error('audioEnabled must be a boolean');
        }
      }

      if (config.difficulty !== undefined) {
        if (!DIFFICULTY_LEVELS.includes(config.difficulty)) {
          throw new Error(`difficulty must be one of: ${DIFFICULTY_LEVELS.join(', ')}`);
        }
      }

      if (config.theme !== undefined) {
        if (!THEMES.includes(config.theme)) {
          throw new Error(`theme must be one of: ${THEMES.join(', ')}`);
        }
      }

      if (config.documents !== undefined) {
        if (!Array.isArray(config.documents)) {
          throw new Error('documents must be an array');
        }
      }
    };

    it('should validate interval range', () => {
      expect(() => validateConfig({ interval: 4 })).toThrow('Interval must be between 5 and 120 minutes');
      expect(() => validateConfig({ interval: 121 })).toThrow('Interval must be between 5 and 120 minutes');
      expect(() => validateConfig({ interval: 30 })).not.toThrow();
    });

    it('should validate audioEnabled type', () => {
      expect(() => validateConfig({ audioEnabled: 'true' })).toThrow('audioEnabled must be a boolean');
      expect(() => validateConfig({ audioEnabled: true })).not.toThrow();
    });

    it('should validate difficulty level', () => {
      expect(() => validateConfig({ difficulty: 'invalid' })).toThrow('difficulty must be one of');
      expect(() => validateConfig({ difficulty: 'easy' })).not.toThrow();
      expect(() => validateConfig({ difficulty: 'medium' })).not.toThrow();
      expect(() => validateConfig({ difficulty: 'hard' })).not.toThrow();
    });

    it('should validate theme', () => {
      expect(() => validateConfig({ theme: 'invalid' })).toThrow('theme must be one of');
      expect(() => validateConfig({ theme: 'halloween' })).not.toThrow();
      expect(() => validateConfig({ theme: 'dark' })).not.toThrow();
    });

    it('should validate documents array', () => {
      expect(() => validateConfig({ documents: 'not an array' })).toThrow('documents must be an array');
      expect(() => validateConfig({ documents: [] })).not.toThrow();
      expect(() => validateConfig({ documents: ['/path/to/doc.pdf'] })).not.toThrow();
    });
  });
});
