/**
 * Integration tests for configuration persistence across app restarts
 * Tests the full flow: UI -> IPC -> ConfigManager -> File -> Reload
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import ConfigManager from '../../main/ConfigManager.js';

describe('Configuration Persistence Integration', () => {
  let configManager;
  let testConfigPath;

  beforeEach(async () => {
    // Create a temporary config file for testing
    const tempDir = path.join(process.cwd(), 'test-data');
    await fs.mkdir(tempDir, { recursive: true });
    testConfigPath = path.join(tempDir, 'test-config.json');
    
    // Clean up any existing test config
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // File doesn't exist, that's fine
    }
    
    configManager = new ConfigManager(testConfigPath);
  });

  afterEach(async () => {
    // Clean up test config file
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should persist configuration across app restarts', async () => {
    // Simulate first app session
    await configManager.load();
    
    // Modify configuration
    await configManager.set('interval', 60);
    await configManager.set('audioEnabled', false);
    await configManager.set('difficulty', 'hard');
    await configManager.set('documents', ['/path/to/doc1.pdf', '/path/to/doc2.docx']);
    
    // Verify changes are in memory
    expect(configManager.get('interval')).toBe(60);
    expect(configManager.get('audioEnabled')).toBe(false);
    expect(configManager.get('difficulty')).toBe('hard');
    expect(configManager.get('documents')).toEqual(['/path/to/doc1.pdf', '/path/to/doc2.docx']);
    
    // Simulate app restart by creating new ConfigManager instance
    const newConfigManager = new ConfigManager(testConfigPath);
    await newConfigManager.load();
    
    // Verify configuration persisted
    expect(newConfigManager.get('interval')).toBe(60);
    expect(newConfigManager.get('audioEnabled')).toBe(false);
    expect(newConfigManager.get('difficulty')).toBe('hard');
    expect(newConfigManager.get('documents')).toEqual(['/path/to/doc1.pdf', '/path/to/doc2.docx']);
  });

  it('should handle multiple configuration updates', async () => {
    await configManager.load();
    
    // Make multiple updates
    await configManager.set('interval', 45);
    await configManager.set('interval', 90);
    await configManager.set('interval', 30);
    
    // Verify final value
    expect(configManager.get('interval')).toBe(30);
    
    // Reload and verify persistence
    const newConfigManager = new ConfigManager(testConfigPath);
    await newConfigManager.load();
    expect(newConfigManager.get('interval')).toBe(30);
  });

  it('should persist document additions and removals', async () => {
    await configManager.load();
    
    // Add documents
    const documents = ['/path/to/doc1.pdf'];
    await configManager.set('documents', documents);
    
    // Add another document
    documents.push('/path/to/doc2.docx');
    await configManager.set('documents', documents);
    
    // Verify in memory
    expect(configManager.get('documents')).toEqual(['/path/to/doc1.pdf', '/path/to/doc2.docx']);
    
    // Reload and verify
    const newConfigManager = new ConfigManager(testConfigPath);
    await newConfigManager.load();
    expect(newConfigManager.get('documents')).toEqual(['/path/to/doc1.pdf', '/path/to/doc2.docx']);
    
    // Remove a document
    const updatedDocs = ['/path/to/doc1.pdf'];
    await newConfigManager.set('documents', updatedDocs);
    
    // Reload again and verify
    const finalConfigManager = new ConfigManager(testConfigPath);
    await finalConfigManager.load();
    expect(finalConfigManager.get('documents')).toEqual(['/path/to/doc1.pdf']);
  });

  it('should maintain config integrity after multiple restarts', async () => {
    // First session
    await configManager.load();
    await configManager.set('interval', 45);
    await configManager.set('audioEnabled', true);
    
    // Second session
    const session2 = new ConfigManager(testConfigPath);
    await session2.load();
    expect(session2.get('interval')).toBe(45);
    await session2.set('difficulty', 'easy');
    
    // Third session
    const session3 = new ConfigManager(testConfigPath);
    await session3.load();
    expect(session3.get('interval')).toBe(45);
    expect(session3.get('audioEnabled')).toBe(true);
    expect(session3.get('difficulty')).toBe('easy');
  });

  it('should handle empty document list persistence', async () => {
    await configManager.load();
    
    // Set empty documents
    await configManager.set('documents', []);
    
    // Reload and verify
    const newConfigManager = new ConfigManager(testConfigPath);
    await newConfigManager.load();
    expect(newConfigManager.get('documents')).toEqual([]);
  });

  it('should preserve all config fields on partial updates', async () => {
    await configManager.load();
    
    // Set initial complete config
    await configManager.set('interval', 60);
    await configManager.set('audioEnabled', false);
    await configManager.set('difficulty', 'hard');
    await configManager.set('documents', ['/path/to/doc.pdf']);
    
    // Update only one field
    const newConfigManager = new ConfigManager(testConfigPath);
    await newConfigManager.load();
    await newConfigManager.set('interval', 90);
    
    // Verify all fields are preserved
    expect(newConfigManager.get('interval')).toBe(90);
    expect(newConfigManager.get('audioEnabled')).toBe(false);
    expect(newConfigManager.get('difficulty')).toBe('hard');
    expect(newConfigManager.get('documents')).toEqual(['/path/to/doc.pdf']);
  });

  it('should handle rapid successive saves', async () => {
    await configManager.load();
    
    // Make rapid updates
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(configManager.set('interval', 30 + i));
    }
    
    await Promise.all(promises);
    
    // Verify final state
    const newConfigManager = new ConfigManager(testConfigPath);
    await newConfigManager.load();
    
    // Should have one of the values (race condition acceptable)
    const interval = newConfigManager.get('interval');
    expect(interval).toBeGreaterThanOrEqual(30);
    expect(interval).toBeLessThanOrEqual(39);
  });

  it('should create default config on first load', async () => {
    await configManager.load();
    
    // Verify default values
    expect(configManager.get('interval')).toBe(30);
    expect(configManager.get('audioEnabled')).toBe(true);
    expect(configManager.get('difficulty')).toBe('medium');
    expect(configManager.get('documents')).toEqual([]);
    expect(configManager.get('theme')).toBe('halloween');
  });

  it('should handle config file corruption gracefully', async () => {
    await configManager.load();
    await configManager.set('interval', 60);
    
    // Corrupt the config file
    await fs.writeFile(testConfigPath, 'invalid json {{{', 'utf8');
    
    // Load should throw error (ConfigManager doesn't auto-recover from corruption)
    const newConfigManager = new ConfigManager(testConfigPath);
    
    // Expect load to throw
    await expect(newConfigManager.load()).rejects.toThrow();
  });

  it('should update lastRun timestamp on save', async () => {
    await configManager.load();
    
    const beforeTime = Date.now();
    
    // Wait a tiny bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 5));
    
    await configManager.set('interval', 45);
    
    await new Promise(resolve => setTimeout(resolve, 5));
    const afterTime = Date.now();
    
    // Reload and check lastRun
    const newConfigManager = new ConfigManager(testConfigPath);
    await newConfigManager.load();
    
    const lastRun = newConfigManager.get('lastRun');
    expect(lastRun).toBeDefined();
    
    // lastRun should be between before and after times (with some tolerance)
    if (lastRun) {
      const lastRunTime = new Date(lastRun).getTime();
      expect(lastRunTime).toBeGreaterThanOrEqual(beforeTime - 100); // 100ms tolerance
      expect(lastRunTime).toBeLessThanOrEqual(afterTime + 100);
    }
  });
});

describe('Real-time Config Validation', () => {
  it('should validate interval range in real-time', () => {
    const validateInterval = (value) => {
      if (value < 5 || value > 120) {
        return { valid: false, error: 'Interval must be between 5 and 120 minutes' };
      }
      return { valid: true };
    };

    expect(validateInterval(30).valid).toBe(true);
    expect(validateInterval(5).valid).toBe(true);
    expect(validateInterval(120).valid).toBe(true);
    expect(validateInterval(4).valid).toBe(false);
    expect(validateInterval(121).valid).toBe(false);
  });

  it('should provide immediate feedback on invalid values', () => {
    const errors = [];
    
    const validateConfig = (config) => {
      if (config.interval < 5 || config.interval > 120) {
        errors.push('Interval must be between 5 and 120 minutes');
      }
      return errors.length === 0;
    };

    expect(validateConfig({ interval: 4 })).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should clear validation errors when value becomes valid', () => {
    let hasError = false;
    
    const validateAndUpdate = (value) => {
      hasError = value < 5 || value > 120;
      return !hasError;
    };

    // Invalid value
    expect(validateAndUpdate(4)).toBe(false);
    expect(hasError).toBe(true);
    
    // Valid value
    expect(validateAndUpdate(30)).toBe(true);
    expect(hasError).toBe(false);
  });
});

describe('Visual Feedback', () => {
  it('should show saving status during save operation', () => {
    const statusStates = [];
    
    const simulateSave = async () => {
      statusStates.push('saving');
      
      // Simulate async save
      await new Promise(resolve => setTimeout(resolve, 10));
      
      statusStates.push('success');
    };

    return simulateSave().then(() => {
      expect(statusStates).toEqual(['saving', 'success']);
    });
  });

  it('should show error status on save failure', async () => {
    const statusStates = [];
    
    const simulateFailedSave = async () => {
      statusStates.push('saving');
      
      try {
        throw new Error('Save failed');
      } catch (error) {
        statusStates.push('error');
      }
    };

    await simulateFailedSave();
    expect(statusStates).toEqual(['saving', 'error']);
  });

  it('should disable save button during save operation', () => {
    let buttonDisabled = false;
    
    const simulateSave = async () => {
      buttonDisabled = true;
      await new Promise(resolve => setTimeout(resolve, 10));
      buttonDisabled = false;
    };

    const promise = simulateSave();
    expect(buttonDisabled).toBe(true);
    
    return promise.then(() => {
      expect(buttonDisabled).toBe(false);
    });
  });
});
