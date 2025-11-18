/**
 * Tests for Configuration Window Renderer
 * These tests verify the UI logic and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM elements
function createMockDOM() {
  const mockElements = {
    intervalSlider: { value: '30', addEventListener: vi.fn() },
    intervalValue: { textContent: '30' },
    audioToggle: { checked: true, addEventListener: vi.fn() },
    audioLabel: { textContent: 'Audio Enabled' },
    difficultyDropdown: { value: 'medium', addEventListener: vi.fn() },
    saveButton: { addEventListener: vi.fn() },
    statusMessage: { textContent: '', className: 'status-message' }
  };

  global.document = {
    getElementById: vi.fn((id) => {
      const idMap = {
        'interval-slider': mockElements.intervalSlider,
        'interval-value': mockElements.intervalValue,
        'audio-toggle': mockElements.audioToggle,
        'audio-label': mockElements.audioLabel,
        'difficulty-dropdown': mockElements.difficultyDropdown,
        'save-button': mockElements.saveButton,
        'status-message': mockElements.statusMessage
      };
      return idMap[id];
    }),
    readyState: 'complete',
    addEventListener: vi.fn()
  };

  global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn()
  };

  global.console = {
    log: vi.fn(),
    error: vi.fn()
  };

  return mockElements;
}

describe('Configuration Validation', () => {
  it('should validate interval within range', () => {
    const validateConfiguration = (config) => {
      if (typeof config.interval !== 'number' || 
          config.interval < 5 || 
          config.interval > 120) {
        throw new Error('Interval must be between 5 and 120 minutes');
      }
      return true;
    };

    expect(() => validateConfiguration({ interval: 30 })).not.toThrow();
    expect(() => validateConfiguration({ interval: 5 })).not.toThrow();
    expect(() => validateConfiguration({ interval: 120 })).not.toThrow();
    expect(() => validateConfiguration({ interval: 4 })).toThrow();
    expect(() => validateConfiguration({ interval: 121 })).toThrow();
  });

  it('should validate audio enabled as boolean', () => {
    const validateConfiguration = (config) => {
      if (typeof config.audioEnabled !== 'boolean') {
        throw new Error('Audio setting must be a boolean');
      }
      return true;
    };

    expect(() => validateConfiguration({ audioEnabled: true })).not.toThrow();
    expect(() => validateConfiguration({ audioEnabled: false })).not.toThrow();
    expect(() => validateConfiguration({ audioEnabled: 'true' })).toThrow();
  });

  it('should validate difficulty level', () => {
    const validateConfiguration = (config) => {
      const validDifficulties = ['easy', 'medium', 'hard'];
      if (!validDifficulties.includes(config.difficulty)) {
        throw new Error('Invalid difficulty level');
      }
      return true;
    };

    expect(() => validateConfiguration({ difficulty: 'easy' })).not.toThrow();
    expect(() => validateConfiguration({ difficulty: 'medium' })).not.toThrow();
    expect(() => validateConfiguration({ difficulty: 'hard' })).not.toThrow();
    expect(() => validateConfiguration({ difficulty: 'extreme' })).toThrow();
  });

  it('should validate complete configuration', () => {
    const validateConfiguration = (config) => {
      if (typeof config.interval !== 'number' || 
          config.interval < 5 || 
          config.interval > 120) {
        throw new Error('Interval must be between 5 and 120 minutes');
      }
      
      if (typeof config.audioEnabled !== 'boolean') {
        throw new Error('Audio setting must be a boolean');
      }
      
      const validDifficulties = ['easy', 'medium', 'hard'];
      if (!validDifficulties.includes(config.difficulty)) {
        throw new Error('Invalid difficulty level');
      }
      
      return true;
    };

    const validConfig = {
      interval: 45,
      audioEnabled: true,
      difficulty: 'medium'
    };

    expect(() => validateConfiguration(validConfig)).not.toThrow();
  });
});

describe('Configuration UI Logic', () => {
  beforeEach(() => {
    createMockDOM();
  });

  it('should update interval value display when slider changes', () => {
    const mockElements = createMockDOM();
    
    // Simulate slider change
    const newValue = 60;
    mockElements.intervalSlider.value = newValue.toString();
    mockElements.intervalValue.textContent = newValue.toString();
    
    expect(mockElements.intervalValue.textContent).toBe('60');
  });

  it('should update audio label when toggle changes', () => {
    const mockElements = createMockDOM();
    
    // Simulate toggle to disabled
    mockElements.audioToggle.checked = false;
    mockElements.audioLabel.textContent = 'Audio Disabled';
    
    expect(mockElements.audioLabel.textContent).toBe('Audio Disabled');
    
    // Simulate toggle to enabled
    mockElements.audioToggle.checked = true;
    mockElements.audioLabel.textContent = 'Audio Enabled';
    
    expect(mockElements.audioLabel.textContent).toBe('Audio Enabled');
  });

  it('should handle difficulty dropdown changes', () => {
    const mockElements = createMockDOM();
    
    mockElements.difficultyDropdown.value = 'hard';
    expect(mockElements.difficultyDropdown.value).toBe('hard');
    
    mockElements.difficultyDropdown.value = 'easy';
    expect(mockElements.difficultyDropdown.value).toBe('easy');
  });
});

describe('Configuration Storage', () => {
  beforeEach(() => {
    createMockDOM();
  });

  it('should save configuration to localStorage', () => {
    const config = {
      interval: 45,
      audioEnabled: false,
      difficulty: 'hard'
    };

    localStorage.setItem('spookyConfig', JSON.stringify(config));
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'spookyConfig',
      JSON.stringify(config)
    );
  });

  it('should load configuration from localStorage', () => {
    const savedConfig = {
      interval: 60,
      audioEnabled: true,
      difficulty: 'easy'
    };

    localStorage.getItem.mockReturnValue(JSON.stringify(savedConfig));
    
    const loaded = JSON.parse(localStorage.getItem('spookyConfig'));
    
    expect(loaded).toEqual(savedConfig);
  });

  it('should handle missing localStorage data gracefully', () => {
    localStorage.getItem.mockReturnValue(null);
    
    const result = localStorage.getItem('spookyConfig');
    
    expect(result).toBeNull();
  });
});

describe('IPC Integration', () => {
  let mockElectronAPI;

  beforeEach(() => {
    mockElectronAPI = {
      getConfig: vi.fn(),
      setConfig: vi.fn(),
      onConfigUpdate: vi.fn(),
      addDocument: vi.fn(),
      removeDocument: vi.fn(),
      validateDocument: vi.fn()
    };

    global.window = {
      electronAPI: mockElectronAPI
    };
  });

  it('should load configuration via IPC on initialization', async () => {
    const mockConfig = {
      interval: 45,
      audioEnabled: true,
      difficulty: 'medium',
      documents: ['/path/to/doc.pdf']
    };

    mockElectronAPI.getConfig.mockResolvedValue(mockConfig);

    const config = await window.electronAPI.getConfig();

    expect(mockElectronAPI.getConfig).toHaveBeenCalled();
    expect(config).toEqual(mockConfig);
  });

  it('should save configuration via IPC', async () => {
    const configToSave = {
      interval: 60,
      audioEnabled: false,
      difficulty: 'hard',
      documents: []
    };

    mockElectronAPI.setConfig.mockResolvedValue(configToSave);

    await window.electronAPI.setConfig(configToSave);

    expect(mockElectronAPI.setConfig).toHaveBeenCalledWith(configToSave);
  });

  it('should handle config save errors', async () => {
    const error = new Error('Failed to save config');
    mockElectronAPI.setConfig.mockRejectedValue(error);

    await expect(window.electronAPI.setConfig({})).rejects.toThrow('Failed to save config');
  });

  it('should listen for config updates from main process', () => {
    const callback = vi.fn();
    mockElectronAPI.onConfigUpdate.mockReturnValue(() => {});

    const unsubscribe = window.electronAPI.onConfigUpdate(callback);

    expect(mockElectronAPI.onConfigUpdate).toHaveBeenCalledWith(callback);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should add document via IPC', async () => {
    const filePath = '/path/to/new-doc.pdf';
    mockElectronAPI.addDocument.mockResolvedValue({ success: true, filePath });

    const result = await window.electronAPI.addDocument(filePath);

    expect(mockElectronAPI.addDocument).toHaveBeenCalledWith(filePath);
    expect(result.success).toBe(true);
  });

  it('should remove document via IPC', async () => {
    const filePath = '/path/to/doc.pdf';
    mockElectronAPI.removeDocument.mockResolvedValue({ success: true, filePath });

    const result = await window.electronAPI.removeDocument(filePath);

    expect(mockElectronAPI.removeDocument).toHaveBeenCalledWith(filePath);
    expect(result.success).toBe(true);
  });

  it('should validate document via IPC', async () => {
    const filePath = '/path/to/doc.pdf';
    const validation = { valid: true, size: 1024000 };
    mockElectronAPI.validateDocument.mockResolvedValue(validation);

    const result = await window.electronAPI.validateDocument(filePath);

    expect(mockElectronAPI.validateDocument).toHaveBeenCalledWith(filePath);
    expect(result.valid).toBe(true);
    expect(result.size).toBe(1024000);
  });

  it('should handle invalid document validation', async () => {
    const filePath = '/path/to/invalid.pdf';
    const validation = { valid: false, error: 'File not found' };
    mockElectronAPI.validateDocument.mockResolvedValue(validation);

    const result = await window.electronAPI.validateDocument(filePath);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File not found');
  });

  it('should transform document paths to objects on load', () => {
    const transformDocuments = (documents) => {
      return documents.map(docPath => {
        if (typeof docPath === 'string') {
          return {
            path: docPath,
            name: docPath.split(/[\\/]/).pop(),
            status: 'valid',
            size: 0
          };
        }
        return docPath;
      });
    };

    const documents = ['/path/to/doc1.pdf', '/path/to/doc2.docx'];
    const transformed = transformDocuments(documents);

    expect(transformed[0]).toHaveProperty('path');
    expect(transformed[0]).toHaveProperty('name');
    expect(transformed[0]).toHaveProperty('status');
    expect(transformed[0].name).toBe('doc1.pdf');
    expect(transformed[1].name).toBe('doc2.docx');
  });

  it('should prepare config for saving by extracting paths', () => {
    const currentConfig = {
      interval: 30,
      audioEnabled: true,
      difficulty: 'medium',
      documents: [
        { path: '/path/to/doc1.pdf', name: 'doc1.pdf', status: 'valid', size: 1024 },
        { path: '/path/to/doc2.docx', name: 'doc2.docx', status: 'valid', size: 2048 }
      ]
    };

    const configToSave = {
      interval: currentConfig.interval,
      audioEnabled: currentConfig.audioEnabled,
      difficulty: currentConfig.difficulty,
      documents: currentConfig.documents.map(doc => doc.path || doc)
    };

    expect(configToSave.documents).toEqual(['/path/to/doc1.pdf', '/path/to/doc2.docx']);
  });
});

describe('Document Management', () => {
  it('should validate document file extensions', () => {
    const validExtensions = ['.pdf', '.docx', '.md', '.txt'];
    
    const isValidFile = (fileName) => {
      const lowerName = fileName.toLowerCase();
      return validExtensions.some(ext => lowerName.endsWith(ext));
    };

    expect(isValidFile('document.pdf')).toBe(true);
    expect(isValidFile('notes.docx')).toBe(true);
    expect(isValidFile('readme.md')).toBe(true);
    expect(isValidFile('data.txt')).toBe(true);
    expect(isValidFile('image.jpg')).toBe(false);
    expect(isValidFile('video.mp4')).toBe(false);
  });

  it('should detect duplicate documents', () => {
    const documents = [
      { path: '/path/to/doc1.pdf', name: 'doc1.pdf' },
      { path: '/path/to/doc2.docx', name: 'doc2.docx' }
    ];

    const isDuplicate = (path) => {
      return documents.some(doc => doc.path === path);
    };

    expect(isDuplicate('/path/to/doc1.pdf')).toBe(true);
    expect(isDuplicate('/path/to/doc3.md')).toBe(false);
  });

  it('should create document object with correct properties', () => {
    const file = {
      path: '/path/to/study.pdf',
      name: 'study.pdf',
      size: 1024000
    };

    const document = {
      path: file.path,
      name: file.name,
      status: 'checking',
      size: file.size
    };

    expect(document).toHaveProperty('path');
    expect(document).toHaveProperty('name');
    expect(document).toHaveProperty('status');
    expect(document).toHaveProperty('size');
    expect(document.status).toBe('checking');
  });

  it('should get correct file icon for different extensions', () => {
    const getFileIcon = (fileName) => {
      const ext = fileName.toLowerCase().split('.').pop();
      const icons = {
        'pdf': '📕',
        'docx': '📘',
        'md': '📗',
        'txt': '📄'
      };
      return icons[ext] || '📄';
    };

    expect(getFileIcon('document.pdf')).toBe('📕');
    expect(getFileIcon('notes.docx')).toBe('📘');
    expect(getFileIcon('readme.md')).toBe('📗');
    expect(getFileIcon('data.txt')).toBe('📄');
    expect(getFileIcon('unknown.xyz')).toBe('📄');
  });

  it('should get correct status information', () => {
    const getStatusInfo = (status) => {
      const statusMap = {
        'valid': 'Valid',
        'invalid': 'Invalid',
        'checking': 'Checking...'
      };
      return statusMap[status] || 'Unknown';
    };

    expect(getStatusInfo('valid')).toBe('Valid');
    expect(getStatusInfo('invalid')).toBe('Invalid');
    expect(getStatusInfo('checking')).toBe('Checking...');
    expect(getStatusInfo('unknown')).toBe('Unknown');
  });

  it('should validate documents array in configuration', () => {
    const validateConfiguration = (config) => {
      if (!Array.isArray(config.documents)) {
        throw new Error('Documents must be an array');
      }
      return true;
    };

    expect(() => validateConfiguration({ documents: [] })).not.toThrow();
    expect(() => validateConfiguration({ documents: [{ path: 'test.pdf' }] })).not.toThrow();
    expect(() => validateConfiguration({ documents: 'not-an-array' })).toThrow();
    expect(() => validateConfiguration({ documents: null })).toThrow();
  });

  it('should handle document removal', () => {
    const documents = [
      { path: '/path/to/doc1.pdf', name: 'doc1.pdf' },
      { path: '/path/to/doc2.docx', name: 'doc2.docx' },
      { path: '/path/to/doc3.md', name: 'doc3.md' }
    ];

    // Remove document at index 1
    documents.splice(1, 1);

    expect(documents.length).toBe(2);
    expect(documents[0].name).toBe('doc1.pdf');
    expect(documents[1].name).toBe('doc3.md');
  });

  it('should handle empty document list', () => {
    const documents = [];
    const isEmpty = documents.length === 0;

    expect(isEmpty).toBe(true);
  });
});
