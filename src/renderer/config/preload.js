// Preload script for configuration window
// This script runs in a privileged context and exposes safe APIs to the renderer

console.log('Preload script starting...');

try {
  const { contextBridge, ipcRenderer } = require('electron');
  console.log('Electron modules loaded');
  
  // Inline IPC channel constants (can't import in preload sandbox)
  const IPC_CHANNELS = {
    CONFIG_GET: 'config:get',
    CONFIG_SET: 'config:set',
    CONFIG_UPDATED: 'config:updated',
    DOCUMENT_ADD: 'document:add',
    DOCUMENT_REMOVE: 'document:remove',
    DOCUMENT_VALIDATE: 'document:validate',
    DOCUMENTS_VALIDATE_ALL: 'documents:validate-all',
    QUESTIONS_STATUS: 'questions:status',
    QUESTIONS_REGENERATE: 'questions:regenerate',
    SESSION_GET_STATS: 'session:get-stats',
    SESSION_RESET: 'session:reset'
  };
  console.log('Constants defined');

  // Expose protected methods that allow the renderer process to use
  // ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration methods
  getConfig: (key) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET, key),
  setConfig: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, key, value),
  onConfigUpdate: (callback) => {
    const subscription = (event, config) => callback(config);
    ipcRenderer.on(IPC_CHANNELS.CONFIG_UPDATED, subscription);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONFIG_UPDATED, subscription);
  },
  
  // Document methods
  selectDocuments: () => ipcRenderer.invoke('dialog:selectDocuments'),
  addDocument: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_ADD, filePath),
  removeDocument: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_REMOVE, filePath),
  validateDocument: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_VALIDATE, filePath),
  validateAllDocuments: () => ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_VALIDATE_ALL),
  
  // Question methods
  getQuestionStatus: () => ipcRenderer.invoke(IPC_CHANNELS.QUESTIONS_STATUS),
  regenerateQuestions: () => ipcRenderer.invoke(IPC_CHANNELS.QUESTIONS_REGENERATE),
  
  // Session statistics methods
  getSessionStats: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_STATS),
  resetSession: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_RESET),
  
  // Platform info
  platform: process.platform
  });

  console.log('electronAPI exposed successfully');
  console.log('Available methods:', Object.keys(window.electronAPI || {}));
} catch (error) {
  console.error('Error in preload script:', error);
}

console.log('Config preload script loaded');
