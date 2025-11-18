// Preload script for scare window
// This script runs in a privileged context and exposes safe APIs to the renderer

const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('../../shared/constants');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Scare sequence methods
  onScareStart: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.SCARE_START, subscription);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SCARE_START, subscription);
  },
  
  scareStageComplete: (stage) => ipcRenderer.send(IPC_CHANNELS.SCARE_STAGE_COMPLETE, stage),
  
  scareCancel: () => ipcRenderer.send(IPC_CHANNELS.SCARE_CANCEL),
  
  // Question methods
  onShowQuestion: (callback) => {
    const subscription = (event, question) => callback(question);
    ipcRenderer.on(IPC_CHANNELS.QUESTION_SHOW, subscription);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener(IPC_CHANNELS.QUESTION_SHOW, subscription);
  },
  
  submitAnswer: (questionId, answer) => ipcRenderer.send(IPC_CHANNELS.ANSWER_SUBMIT, questionId, answer),
  
  onAnswerFeedback: (callback) => {
    const subscription = (event, feedback) => callback(feedback);
    ipcRenderer.on(IPC_CHANNELS.ANSWER_FEEDBACK, subscription);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ANSWER_FEEDBACK, subscription);
  },
  
  // Configuration methods (for audio settings)
  getConfig: (key) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET, key),
  
  // Platform info
  platform: process.platform
});

console.log('Scare preload script loaded');
