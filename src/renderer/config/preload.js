// Preload script for configuration window
// This script runs in a privileged context and exposes safe APIs to the renderer

const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('../../shared/constants');

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

console.log('Config preload script loaded');
