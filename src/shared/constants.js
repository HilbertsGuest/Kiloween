// IPC Channel Constants
const IPC_CHANNELS = {
  // Config channels
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_UPDATED: 'config:updated',
  
  // Document channels
  DOCUMENT_ADD: 'document:add',
  DOCUMENT_REMOVE: 'document:remove',
  DOCUMENT_VALIDATE: 'document:validate',
  DOCUMENTS_VALIDATE_ALL: 'documents:validate-all',
  
  // Scare sequence channels
  SCARE_START: 'scare:start',
  SCARE_STAGE_COMPLETE: 'scare:stage-complete',
  SCARE_CANCEL: 'scare:cancel',
  
  // Question channels
  QUESTION_SHOW: 'question:show',
  ANSWER_SUBMIT: 'answer:submit',
  ANSWER_FEEDBACK: 'answer:feedback',
  QUESTIONS_STATUS: 'questions:status',
  QUESTIONS_REGENERATE: 'questions:regenerate',
  
  // Timer channels
  TIMER_START: 'timer:start',
  TIMER_STOP: 'timer:stop',
  TIMER_RESET: 'timer:reset',
  TIMER_STATUS: 'timer:status',
  
  // Session statistics channels
  SESSION_GET_STATS: 'session:get-stats',
  SESSION_RESET: 'session:reset'
};

// Configuration Keys
const CONFIG_KEYS = {
  INTERVAL: 'interval',
  DOCUMENTS: 'documents',
  AUDIO_ENABLED: 'audioEnabled',
  DIFFICULTY: 'difficulty',
  THEME: 'theme',
  LAST_RUN: 'lastRun'
};

// Default Configuration
const DEFAULT_CONFIG = {
  version: '1.0.0',
  interval: 30,
  documents: [],
  audioEnabled: true,
  difficulty: 'medium',
  theme: 'halloween',
  lastRun: null
};

// Scare Sequence Stages
const SCARE_STAGES = {
  SHAKE: 'shake',
  DARKEN: 'darken',
  TUNNEL: 'tunnel',
  JUMPSCARE: 'jumpscare',
  QUESTION: 'question'
};

// Supported Document Formats
const SUPPORTED_FORMATS = ['.pdf', '.docx', '.md', '.txt'];

// Difficulty Levels
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

// Themes
const THEMES = ['halloween', 'dark'];

module.exports = {
  IPC_CHANNELS,
  CONFIG_KEYS,
  DEFAULT_CONFIG,
  SCARE_STAGES,
  SUPPORTED_FORMATS,
  DIFFICULTY_LEVELS,
  THEMES
};
