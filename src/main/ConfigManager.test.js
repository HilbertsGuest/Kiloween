const fs = require('fs').promises;
const path = require('path');

// Mock electron before importing ConfigManager
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => './test-data')
  }
}));

const ConfigManager = require('./ConfigManager');

describe('ConfigManager', () => {
  let configManager;
  let testConfigPath;

  beforeEach(async () => {
    // Use a test-specific config path
    testConfigPath = path.join('./test-data', 'test-config.json');
    configManager = new ConfigManager(testConfigPath);
    
    // Clean up any existing test config
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testConfigPath);
      await fs.rmdir('./test-data');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create instance with custom config path', () => {
      expect(configManager.configPath).toBe(testConfigPath);
    });

    it('should create instance with default config path when none provided', () => {
      const manager = new ConfigManager();
      expect(manager.configPath).toContain('config.json');
    });
  });

  describe('load', () => {
    it('should create default config on first run', async () => {
      const config = await configManager.load();
      
      expect(config).toBeDefined();
      expect(config.version).toBe('1.0.0');
      expect(config.interval).toBe(30);
      expect(config.documents).toEqual([]);
      expect(config.audioEnabled).toBe(true);
      expect(config.difficulty).toBe('medium');
      expect(config.theme).toBe('halloween');
      expect(config.lastRun).toBeDefined();
    });

    it('should load existing config from disk', async () => {
      // Create a config file
      const testConfig = {
        version: '1.0.0',
        interval: 60,
        documents: ['/path/to/doc.pdf'],
        audioEnabled: false,
        difficulty: 'hard',
        theme: 'dark',
        lastRun: '2025-11-14T10:00:00Z'
      };
      
      await fs.mkdir(path.dirname(testConfigPath), { recursive: true });
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig), 'utf8');
      
      const config = await configManager.load();
      
      expect(config.interval).toBe(60);
      expect(config.documents).toEqual(['/path/to/doc.pdf']);
      expect(config.audioEnabled).toBe(false);
      expect(config.difficulty).toBe('hard');
      expect(config.theme).toBe('dark');
    });

    it('should merge loaded config with defaults for missing properties', async () => {
      // Create a partial config file
      const partialConfig = {
        interval: 45
      };
      
      await fs.mkdir(path.dirname(testConfigPath), { recursive: true });
      await fs.writeFile(testConfigPath, JSON.stringify(partialConfig), 'utf8');
      
      const config = await configManager.load();
      
      expect(config.interval).toBe(45);
      expect(config.documents).toEqual([]);
      expect(config.audioEnabled).toBe(true);
      expect(config.difficulty).toBe('medium');
    });

    it('should throw error for invalid JSON', async () => {
      await fs.mkdir(path.dirname(testConfigPath), { recursive: true });
      await fs.writeFile(testConfigPath, 'invalid json{', 'utf8');
      
      await expect(configManager.load()).rejects.toThrow('Failed to load config');
    });
  });

  describe('save', () => {
    it('should save config to disk', async () => {
      const config = {
        version: '1.0.0',
        interval: 45,
        documents: ['/test/doc.pdf'],
        audioEnabled: true,
        difficulty: 'easy',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await configManager.save(config);
      
      // Verify file was created
      const fileContent = await fs.readFile(testConfigPath, 'utf8');
      const savedConfig = JSON.parse(fileContent);
      
      expect(savedConfig.interval).toBe(45);
      expect(savedConfig.documents).toEqual(['/test/doc.pdf']);
      expect(savedConfig.difficulty).toBe('easy');
    });

    it('should create directory if it does not exist', async () => {
      const deepPath = path.join('./test-data', 'nested', 'deep', 'config.json');
      const manager = new ConfigManager(deepPath);
      
      const config = {
        version: '1.0.0',
        interval: 30,
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await manager.save(config);
      
      // Verify file exists
      const fileContent = await fs.readFile(deepPath, 'utf8');
      expect(fileContent).toBeDefined();
      
      // Cleanup
      await fs.unlink(deepPath);
      await fs.rmdir(path.dirname(deepPath), { recursive: true });
    });

    it('should validate config before saving', async () => {
      const invalidConfig = {
        version: '1.0.0',
        interval: 200, // Invalid: > 120
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(invalidConfig)).rejects.toThrow(
        'Interval must be a number between 5 and 120'
      );
    });

    it('should format JSON with indentation', async () => {
      const config = {
        version: '1.0.0',
        interval: 30,
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await configManager.save(config);
      
      const fileContent = await fs.readFile(testConfigPath, 'utf8');
      expect(fileContent).toContain('\n');
      expect(fileContent).toContain('  ');
    });
  });

  describe('get', () => {
    it('should get specific config value', async () => {
      await configManager.load();
      
      const interval = configManager.get('interval');
      expect(interval).toBe(30);
    });

    it('should throw error if config not loaded', () => {
      expect(() => configManager.get('interval')).toThrow(
        'Configuration not loaded'
      );
    });
  });

  describe('set', () => {
    it('should set specific config value and save', async () => {
      await configManager.load();
      
      await configManager.set('interval', 60);
      
      expect(configManager.get('interval')).toBe(60);
      
      // Verify it was saved to disk
      const fileContent = await fs.readFile(testConfigPath, 'utf8');
      const savedConfig = JSON.parse(fileContent);
      expect(savedConfig.interval).toBe(60);
    });

    it('should throw error if config not loaded', async () => {
      await expect(configManager.set('interval', 60)).rejects.toThrow(
        'Configuration not loaded'
      );
    });
  });

  describe('getAll', () => {
    it('should return entire config object', async () => {
      await configManager.load();
      
      const config = configManager.getAll();
      
      expect(config).toBeDefined();
      expect(config.interval).toBe(30);
      expect(config.documents).toEqual([]);
      expect(config.audioEnabled).toBe(true);
    });

    it('should return a copy of config', async () => {
      await configManager.load();
      
      const config = configManager.getAll();
      config.interval = 999;
      
      expect(configManager.get('interval')).toBe(30);
    });

    it('should throw error if config not loaded', () => {
      expect(() => configManager.getAll()).toThrow(
        'Configuration not loaded'
      );
    });
  });

  describe('_validateConfig', () => {
    it('should reject non-object config', async () => {
      await expect(configManager.save(null)).rejects.toThrow(
        'Config must be an object'
      );
    });

    it('should reject interval below minimum', async () => {
      const config = {
        version: '1.0.0',
        interval: 3,
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(config)).rejects.toThrow(
        'Interval must be a number between 5 and 120'
      );
    });

    it('should reject interval above maximum', async () => {
      const config = {
        version: '1.0.0',
        interval: 150,
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(config)).rejects.toThrow(
        'Interval must be a number between 5 and 120'
      );
    });

    it('should accept interval at minimum boundary', async () => {
      const config = {
        version: '1.0.0',
        interval: 5,
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(config)).resolves.not.toThrow();
    });

    it('should accept interval at maximum boundary', async () => {
      const config = {
        version: '1.0.0',
        interval: 120,
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(config)).resolves.not.toThrow();
    });

    it('should reject non-array documents', async () => {
      const config = {
        version: '1.0.0',
        interval: 30,
        documents: 'not an array',
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(config)).rejects.toThrow(
        'Documents must be an array'
      );
    });

    it('should reject non-boolean audioEnabled', async () => {
      const config = {
        version: '1.0.0',
        interval: 30,
        documents: [],
        audioEnabled: 'yes',
        difficulty: 'medium',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(config)).rejects.toThrow(
        'audioEnabled must be a boolean'
      );
    });

    it('should reject invalid difficulty', async () => {
      const config = {
        version: '1.0.0',
        interval: 30,
        documents: [],
        audioEnabled: true,
        difficulty: 'impossible',
        theme: 'halloween',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(config)).rejects.toThrow(
        'difficulty must be one of: easy, medium, hard'
      );
    });

    it('should reject invalid theme', async () => {
      const config = {
        version: '1.0.0',
        interval: 30,
        documents: [],
        audioEnabled: true,
        difficulty: 'medium',
        theme: 'rainbow',
        lastRun: new Date().toISOString()
      };
      
      await expect(configManager.save(config)).rejects.toThrow(
        'theme must be one of: halloween, dark'
      );
    });

    it('should accept all valid difficulty levels', async () => {
      for (const difficulty of ['easy', 'medium', 'hard']) {
        const config = {
          version: '1.0.0',
          interval: 30,
          documents: [],
          audioEnabled: true,
          difficulty,
          theme: 'halloween',
          lastRun: new Date().toISOString()
        };
        
        await expect(configManager.save(config)).resolves.not.toThrow();
      }
    });

    it('should accept all valid themes', async () => {
      for (const theme of ['halloween', 'dark']) {
        const config = {
          version: '1.0.0',
          interval: 30,
          documents: [],
          audioEnabled: true,
          difficulty: 'medium',
          theme,
          lastRun: new Date().toISOString()
        };
        
        await expect(configManager.save(config)).resolves.not.toThrow();
      }
    });
  });
});
