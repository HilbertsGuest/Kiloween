// Configuration Window Renderer Process
// Handles UI interactions and updates

// DOM Elements
const intervalSlider = document.getElementById('interval-slider');
const intervalValue = document.getElementById('interval-value');
const audioToggle = document.getElementById('audio-toggle');
const audioLabel = document.getElementById('audio-label');
const difficultyDropdown = document.getElementById('difficulty-dropdown');
const saveButton = document.getElementById('save-button');
const statusMessage = document.getElementById('status-message');
const addDocumentBtn = document.getElementById('add-document-btn');
const dropZone = document.getElementById('drop-zone');
const documentList = document.getElementById('document-list');
const emptyState = document.getElementById('empty-state');

// Session statistics elements
const statQuestions = document.getElementById('stat-questions');
const statCorrect = document.getElementById('stat-correct');
const statAccuracy = document.getElementById('stat-accuracy');
const statStreak = document.getElementById('stat-streak');
const statBestStreak = document.getElementById('stat-best-streak');
const statDuration = document.getElementById('stat-duration');
const resetSessionBtn = document.getElementById('reset-session-btn');

// Current configuration state
let currentConfig = {
  interval: 30,
  audioEnabled: true,
  difficulty: 'medium',
  documents: []
};

/**
 * Initialize the configuration UI
 */
function initializeUI() {
  // Set up interval slider
  intervalSlider.addEventListener('input', handleIntervalChange);
  
  // Set up audio toggle
  audioToggle.addEventListener('change', handleAudioToggle);
  
  // Set up difficulty dropdown
  difficultyDropdown.addEventListener('change', handleDifficultyChange);
  
  // Set up save button
  saveButton.addEventListener('click', handleSave);
  
  // Set up document management
  addDocumentBtn.addEventListener('click', handleAddDocument);
  setupDragAndDrop();
  
  // Set up session statistics
  resetSessionBtn.addEventListener('click', handleResetSession);
  
  // Listen for config updates from main process
  window.electronAPI.onConfigUpdate((config) => {
    console.log('Config updated from main process:', config);
    handleConfigUpdate(config);
  });
  
  // Load initial configuration
  loadConfiguration();
  
  // Load session statistics
  loadSessionStatistics();
  
  // Refresh statistics every 30 seconds
  setInterval(loadSessionStatistics, 30000);
  
  console.log('Configuration UI initialized');
}

/**
 * Handle interval slider changes
 */
function handleIntervalChange(event) {
  const value = parseInt(event.target.value);
  intervalValue.textContent = value;
  currentConfig.interval = value;
  
  // Validate in real-time
  validateConfigurationRealTime();
}

/**
 * Handle audio toggle changes
 */
function handleAudioToggle(event) {
  const isEnabled = event.target.checked;
  currentConfig.audioEnabled = isEnabled;
  audioLabel.textContent = isEnabled ? 'Audio Enabled' : 'Audio Disabled';
  
  // Validate in real-time
  validateConfigurationRealTime();
}

/**
 * Handle difficulty dropdown changes
 */
function handleDifficultyChange(event) {
  currentConfig.difficulty = event.target.value;
  
  // Validate in real-time
  validateConfigurationRealTime();
}

/**
 * Handle save button click
 */
async function handleSave() {
  try {
    // Validate configuration
    validateConfiguration(currentConfig);
    
    // Show saving feedback
    showStatusMessage('Saving configuration...', 'info');
    saveButton.disabled = true;
    
    // Send configuration to main process via IPC
    console.log('Saving configuration:', currentConfig);
    
    // Prepare config object for saving (exclude UI-only properties)
    const configToSave = {
      interval: currentConfig.interval,
      audioEnabled: currentConfig.audioEnabled,
      difficulty: currentConfig.difficulty,
      documents: currentConfig.documents.map(doc => doc.path || doc)
    };
    
    await window.electronAPI.setConfig(configToSave);
    
    // Show success message
    showStatusMessage('Configuration saved successfully!', 'success');
    
  } catch (error) {
    console.error('Failed to save configuration:', error);
    showStatusMessage(`Error: ${error.message}`, 'error');
  } finally {
    saveButton.disabled = false;
  }
}

/**
 * Load configuration from storage
 */
async function loadConfiguration() {
  try {
    // Load from main process via IPC
    const config = await window.electronAPI.getConfig();
    
    if (config) {
      // Transform documents array to include metadata
      const documents = (config.documents || []).map(docPath => {
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
      
      currentConfig = {
        interval: config.interval || 30,
        audioEnabled: config.audioEnabled !== undefined ? config.audioEnabled : true,
        difficulty: config.difficulty || 'medium',
        documents: documents
      };
    }
    
    // Update UI with loaded configuration
    updateUIFromConfig(currentConfig);
    
    // Validate all documents in background
    validateAllDocuments();
    
    console.log('Configuration loaded:', currentConfig);
  } catch (error) {
    console.error('Failed to load configuration:', error);
    // Use default configuration
    updateUIFromConfig(currentConfig);
  }
}

/**
 * Validate all documents and update UI with results
 */
async function validateAllDocuments() {
  if (!currentConfig.documents || currentConfig.documents.length === 0) {
    // Check question status when no documents
    await checkQuestionStatus();
    return;
  }
  
  try {
    // Check if validateAllDocuments API exists
    if (!window.electronAPI.validateAllDocuments) {
      console.warn('validateAllDocuments API not available');
      return;
    }
    
    const result = await window.electronAPI.validateAllDocuments();
    
    // Update document statuses
    currentConfig.documents = currentConfig.documents.filter(doc => {
      const isValid = result.valid.includes(doc.path);
      if (!isValid) {
        // Find error info
        const errorInfo = result.invalid.find(inv => inv.filePath === doc.path);
        if (errorInfo) {
          doc.status = 'invalid';
          doc.error = errorInfo.userFriendlyError || errorInfo.error;
        }
      }
      return isValid; // Remove invalid documents from UI
    });
    
    // Show notification if documents were removed
    if (result.removed && result.removed.length > 0) {
      const removedNames = result.removed.map(p => p.split(/[\\/]/).pop()).join(', ');
      showStatusMessage(
        `Removed ${result.removed.length} invalid document(s): ${removedNames}`,
        'error'
      );
      
      // Auto-clear after 5 seconds
      setTimeout(clearStatusMessage, 5000);
    }
    
    // Re-render document list
    renderDocumentList();
    
    // Check question status after validation
    await checkQuestionStatus();
    
  } catch (error) {
    console.error('Error validating all documents:', error);
    // Don't show error to user, just log it
  }
}

/**
 * Check question status and display warnings if needed
 */
async function checkQuestionStatus() {
  try {
    // Check if API exists
    if (!window.electronAPI.getQuestionStatus) {
      console.warn('getQuestionStatus API not available');
      return;
    }
    
    const status = await window.electronAPI.getQuestionStatus();
    
    // Display warning if no questions available
    if (!status.hasQuestions) {
      if (currentConfig.documents.length === 0) {
        showStatusMessage(
          'No documents configured. Please add study materials to generate questions.',
          'warning'
        );
      } else {
        showStatusMessage(
          'No questions available. Please check your document configuration or try regenerating questions.',
          'warning'
        );
      }
    } else if (!status.hasUnusedQuestions) {
      showStatusMessage(
        `All ${status.totalQuestions} questions have been used. Questions will be regenerated on next timer expiration.`,
        'info'
      );
      // Auto-clear after 5 seconds
      setTimeout(clearStatusMessage, 5000);
    } else {
      // Questions are available, clear any warnings
      if (statusMessage.className.includes('warning')) {
        clearStatusMessage();
      }
    }
  } catch (error) {
    console.error('Error checking question status:', error);
    // Don't show error to user, just log it
  }
}

/**
 * Show status message to user
 */
function showStatusMessage(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  // Auto-clear success messages after 3 seconds
  if (type === 'success') {
    setTimeout(clearStatusMessage, 3000);
  }
}

/**
 * Clear status message
 */
function clearStatusMessage() {
  statusMessage.textContent = '';
  statusMessage.className = 'status-message';
}

/**
 * Handle add document button click
 */
async function handleAddDocument() {
  console.log('Add document button clicked');
  try {
    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.selectDocuments) {
      console.error('electronAPI.selectDocuments not available');
      showStatusMessage('File dialog not available', 'error');
      return;
    }
    
    console.log('Calling selectDocuments...');
    // Use Electron dialog API to select files
    const result = await window.electronAPI.selectDocuments();
    console.log('Dialog result:', result);
    
    if (result && result.filePaths && result.filePaths.length > 0) {
      // Convert file paths to File-like objects
      const files = result.filePaths.map(filePath => ({
        path: filePath,
        name: filePath.split(/[\\/]/).pop(), // Get filename from path
        size: 0 // Size will be determined during validation
      }));
      
      console.log('Adding files:', files);
      addDocuments(files);
    } else {
      console.log('No files selected or dialog cancelled');
    }
  } catch (error) {
    console.error('Error selecting documents:', error);
    showStatusMessage('Failed to open file dialog: ' + error.message, 'error');
  }
}

/**
 * Set up drag and drop functionality
 */
function setupDragAndDrop() {
  // Prevent default drag behaviors on the whole document
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  // Highlight drop zone when dragging over it
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    }, false);
  });
  
  // Handle dropped files
  dropZone.addEventListener('drop', handleDrop, false);
}

/**
 * Prevent default drag behaviors
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Handle file drop
 */
function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = Array.from(dt.files);
  addDocuments(files);
}

/**
 * Add documents to the list
 */
async function addDocuments(files) {
  if (!files || files.length === 0) {
    return;
  }
  
  for (const file of files) {
    try {
      // Validate file type
      const validExtensions = ['.pdf', '.docx', '.md', '.txt'];
      const fileName = file.name.toLowerCase();
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValid) {
        showStatusMessage(`Invalid file type: ${file.name}. Supported: PDF, DOCX, MD, TXT`, 'error');
        continue;
      }
      
      // Get file path
      const filePath = file.path || file.name;
      
      // Check if document already exists
      if (currentConfig.documents.some(doc => doc.path === filePath)) {
        showStatusMessage(`Document already added: ${file.name}`, 'error');
        continue;
      }
      
      // Add document to UI immediately with checking status
      const document = {
        path: filePath,
        name: file.name,
        status: 'checking',
        size: file.size
      };
      
      currentConfig.documents.push(document);
      renderDocumentList();
      
      // Validate document via IPC
      const validation = await window.electronAPI.validateDocument(filePath);
      
      if (validation.valid) {
        document.status = 'valid';
        document.size = validation.size || file.size;
        
        // Add to main process config
        try {
          await window.electronAPI.addDocument(filePath);
          console.log('Document added:', file.name);
        } catch (addError) {
          // Handle add error with user-friendly message
          document.status = 'invalid';
          const errorMsg = addError.userFriendly || addError.message || 'Failed to add document';
          showStatusMessage(`${file.name}: ${errorMsg}`, 'error');
        }
      } else {
        document.status = 'invalid';
        document.error = validation.userFriendlyError || validation.error;
        const errorMsg = validation.userFriendlyError || validation.error || 'Invalid document';
        showStatusMessage(`${file.name}: ${errorMsg}`, 'error');
      }
      
      renderDocumentList();
      
    } catch (error) {
      console.error('Error adding document:', error);
      const errorMsg = error.userFriendly || error.message || 'Unknown error';
      showStatusMessage(`Error adding ${file.name}: ${errorMsg}`, 'error');
      
      // Remove from UI if failed
      const index = currentConfig.documents.findIndex(doc => doc.name === file.name);
      if (index !== -1) {
        currentConfig.documents.splice(index, 1);
        renderDocumentList();
      }
    }
  }
  
  clearStatusMessage();
}

/**
 * Remove document from list
 */
async function removeDocument(index) {
  const document = currentConfig.documents[index];
  
  if (confirm(`Remove "${document.name}" from the list?`)) {
    try {
      // Remove from main process config
      await window.electronAPI.removeDocument(document.path);
      
      // Remove from UI
      currentConfig.documents.splice(index, 1);
      renderDocumentList();
      clearStatusMessage();
      
      console.log('Document removed:', document.name);
    } catch (error) {
      console.error('Error removing document:', error);
      showStatusMessage(`Error removing document: ${error.message}`, 'error');
    }
  }
}

/**
 * Render the document list
 */
function renderDocumentList() {
  // Clear existing list
  documentList.innerHTML = '';
  
  // Show/hide empty state
  if (currentConfig.documents.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  } else {
    emptyState.classList.add('hidden');
  }
  
  // Render each document
  currentConfig.documents.forEach((doc, index) => {
    const docItem = createDocumentItem(doc, index);
    documentList.appendChild(docItem);
  });
}

/**
 * Create a document item element
 */
function createDocumentItem(doc, index) {
  const item = document.createElement('div');
  item.className = 'document-item';
  
  // Get file icon based on extension
  const icon = getFileIcon(doc.name);
  
  // Get status info
  const statusInfo = getStatusInfo(doc.status);
  
  item.innerHTML = `
    <div class="document-info">
      <span class="document-icon">${icon}</span>
      <div class="document-details">
        <div class="document-name" title="${doc.name}">${doc.name}</div>
        <div class="document-path" title="${doc.path}">${doc.path}</div>
      </div>
    </div>
    <div class="document-status">
      <span class="status-indicator ${doc.status}"></span>
      <span class="status-text ${doc.status}">${statusInfo}</span>
    </div>
    <button class="remove-btn" data-index="${index}">Remove</button>
  `;
  
  // Add remove button handler
  const removeBtn = item.querySelector('.remove-btn');
  removeBtn.addEventListener('click', () => removeDocument(index));
  
  return item;
}

/**
 * Get file icon based on extension
 */
function getFileIcon(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  
  const icons = {
    'pdf': '📕',
    'docx': '📘',
    'md': '📗',
    'txt': '📄'
  };
  
  return icons[ext] || '📄';
}

/**
 * Get status information
 */
function getStatusInfo(status) {
  const statusMap = {
    'valid': 'Valid',
    'invalid': 'Invalid',
    'checking': 'Checking...'
  };
  
  return statusMap[status] || 'Unknown';
}

/**
 * Update UI elements from configuration object
 */
function updateUIFromConfig(config) {
  // Update interval slider
  intervalSlider.value = config.interval;
  intervalValue.textContent = config.interval;
  
  // Update audio toggle
  audioToggle.checked = config.audioEnabled;
  audioLabel.textContent = config.audioEnabled ? 'Audio Enabled' : 'Audio Disabled';
  
  // Update difficulty dropdown
  difficultyDropdown.value = config.difficulty;
  
  // Update document list
  if (config.documents && config.documents.length > 0) {
    renderDocumentList();
  }
}

/**
 * Handle configuration update from main process
 */
function handleConfigUpdate(config) {
  // Transform documents array to include metadata
  const documents = (config.documents || []).map(docPath => {
    if (typeof docPath === 'string') {
      // Check if we already have this document with metadata
      const existing = currentConfig.documents.find(doc => doc.path === docPath);
      if (existing) {
        return existing;
      }
      return {
        path: docPath,
        name: docPath.split(/[\\/]/).pop(),
        status: 'valid',
        size: 0
      };
    }
    return docPath;
  });
  
  currentConfig = {
    interval: config.interval || 30,
    audioEnabled: config.audioEnabled !== undefined ? config.audioEnabled : true,
    difficulty: config.difficulty || 'medium',
    documents: documents
  };
  
  // Update UI
  updateUIFromConfig(currentConfig);
}

/**
 * Validate configuration in real-time
 */
function validateConfigurationRealTime() {
  const errors = [];
  
  // Validate interval
  if (currentConfig.interval < 5 || currentConfig.interval > 120) {
    errors.push('Interval must be between 5 and 120 minutes');
  }
  
  // Show validation errors
  if (errors.length > 0) {
    showStatusMessage(errors[0], 'error');
    saveButton.disabled = true;
    return false;
  } else {
    clearStatusMessage();
    saveButton.disabled = false;
    return true;
  }
}

/**
 * Validate configuration before saving
 */
function validateConfiguration(config) {
  // Validate interval
  if (typeof config.interval !== 'number' || 
      config.interval < 5 || 
      config.interval > 120) {
    throw new Error('Interval must be between 5 and 120 minutes');
  }
  
  // Validate audioEnabled
  if (typeof config.audioEnabled !== 'boolean') {
    throw new Error('Audio setting must be a boolean');
  }
  
  // Validate difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (!validDifficulties.includes(config.difficulty)) {
    throw new Error('Invalid difficulty level');
  }
  
  // Validate documents array
  if (!Array.isArray(config.documents)) {
    throw new Error('Documents must be an array');
  }
  
  return true;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}

/**
 * Load and display session statistics
 */
async function loadSessionStatistics() {
  try {
    const stats = await window.electronAPI.getSessionStats();
    
    if (stats.error) {
      console.error('Error loading session stats:', stats.error);
      return;
    }
    
    // Update statistics display
    statQuestions.textContent = stats.questionsAnswered || 0;
    statCorrect.textContent = stats.correctAnswers || 0;
    statAccuracy.textContent = `${stats.accuracy || 0}%`;
    statStreak.textContent = stats.currentStreak || 0;
    statBestStreak.textContent = stats.bestStreak || 0;
    statDuration.textContent = stats.duration || '0m';
    
    console.log('Session statistics loaded:', stats);
  } catch (error) {
    console.error('Failed to load session statistics:', error);
  }
}

/**
 * Handle reset session button click
 */
async function handleResetSession() {
  try {
    const confirmed = confirm('Are you sure you want to reset session statistics? This cannot be undone.');
    
    if (!confirmed) {
      return;
    }
    
    const result = await window.electronAPI.resetSession();
    
    if (result.success) {
      showStatus('Session statistics reset successfully', 'success');
      // Reload statistics to show reset values
      await loadSessionStatistics();
    } else {
      showStatus(`Failed to reset session: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Error resetting session:', error);
    showStatus('Failed to reset session statistics', 'error');
  }
}
