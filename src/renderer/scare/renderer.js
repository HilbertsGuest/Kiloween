// Scare window renderer process

// Scare sequence stages
const STAGES = {
  SHAKE: 'shake',
  DARK: 'dark',
  TUNNEL: 'tunnel',
  JUMPSCARE: 'jumpscare',
  QUESTION: 'question'
};

let currentStage = null;

// DOM elements
let shakeLayer;
let darkOverlay;
let tunnelCanvas;
let jumpscareLayer;
let jumpScare;
let audioManager;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Scare window loaded');
  
  // Initialize DOM references
  shakeLayer = document.getElementById('shake-layer');
  darkOverlay = document.getElementById('dark-overlay');
  tunnelCanvas = document.getElementById('tunnel-canvas');
  jumpscareLayer = document.getElementById('jumpscare-layer');
  
  // Initialize audio manager
  audioManager = new AudioManager();
  await audioManager.init();
  
  // Load audio config setting
  await loadAudioConfig();
  
  // Initialize jump scare
  jumpScare = new JumpScare();
  jumpScare.init();
  
  // Set up IPC listeners for questions
  setupQuestionListeners();
  
  // Set up ESC key listener for sequence cancellation
  setupEscapeKeyListener();
  
  // Expose functions for testing and IPC
  window.startShake = startShake;
  window.transitionToDarkening = transitionToDarkening;
  window.handleDarkOverlayClick = handleDarkOverlayClick;
  window.transitionToTunnel = transitionToTunnel;
  window.transitionToJumpScare = transitionToJumpScare;
  window.showJumpScareWithQuestion = showJumpScareWithQuestion;
  window.jumpScare = jumpScare;
  window.audioManager = audioManager;
  window.cancelSequence = cancelSequence;
});

/**
 * Start the screen shake effect with progressive intensity
 * Duration: 3-5 seconds with increasing amplitude
 */
function startShake() {
  console.log('Starting shake sequence');
  currentStage = STAGES.SHAKE;
  
  // Show shake layer
  shakeLayer.style.display = 'block';
  
  // Progressive shake intensity levels
  const shakeProgression = [
    { className: 'shake-subtle', duration: 600 },   // 0.6s - very subtle
    { className: 'shake-light', duration: 800 },    // 0.8s - light shake
    { className: 'shake-medium', duration: 1000 },  // 1.0s - medium shake
    { className: 'shake-strong', duration: 1200 },  // 1.2s - strong shake
    { className: 'shake-intense', duration: 1400 }  // 1.4s - intense shake
  ];
  
  let currentLevel = 0;
  
  // Apply first shake level
  applyShakeLevel(shakeProgression[currentLevel].className);
  
  // Function to schedule next shake level
  const scheduleNextLevel = () => {
    const currentDuration = shakeProgression[currentLevel].duration;
    
    setTimeout(() => {
      currentLevel++;
      
      if (currentLevel < shakeProgression.length) {
        // Apply next shake level
        applyShakeLevel(shakeProgression[currentLevel].className);
        scheduleNextLevel();
      } else {
        // Shake complete, transition to next stage
        stopShake();
        transitionToDarkening();
      }
    }, currentDuration);
  };
  
  // Start the progression
  scheduleNextLevel();
}

/**
 * Apply a shake intensity level
 */
function applyShakeLevel(className) {
  // Remove all shake classes
  shakeLayer.classList.remove('shake-subtle', 'shake-light', 'shake-medium', 'shake-strong', 'shake-intense');
  
  // Apply new shake class
  shakeLayer.classList.add(className);
  
  console.log(`Shake level: ${className}`);
}

/**
 * Stop the shake effect
 */
function stopShake() {
  // Remove all shake classes
  shakeLayer.classList.remove('shake-subtle', 'shake-light', 'shake-medium', 'shake-strong', 'shake-intense');
  
  console.log('Shake sequence complete');
}

/**
 * Transition to darkening stage
 * Implements fade-in effect with click prompt
 */
function transitionToDarkening() {
  console.log('Transitioning to darkening stage');
  currentStage = STAGES.DARK;
  
  // Hide shake layer
  shakeLayer.style.display = 'none';
  
  // Show dark overlay with initial transparent state
  darkOverlay.style.display = 'flex';
  darkOverlay.style.background = 'rgba(0, 0, 0, 0)';
  
  // Trigger fade-in animation after a brief delay (allows CSS transition to work)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      darkOverlay.style.background = 'rgba(0, 0, 0, 0.95)';
    });
  });
  
  // Add click listener to proceed to next stage
  darkOverlay.addEventListener('click', handleDarkOverlayClick, { once: true });
  
  console.log('Darkening stage active - waiting for user click');
}

/**
 * Handle click on dark overlay to proceed to tunnel stage
 */
function handleDarkOverlayClick() {
  console.log('Dark overlay clicked - proceeding to tunnel stage');
  
  // Remove the overlay (will be replaced by tunnel)
  darkOverlay.style.display = 'none';
  
  // Transition to tunnel stage (will be implemented in task 23)
  transitionToTunnel();
}

/**
 * Transition to tunnel stage
 */
function transitionToTunnel() {
  console.log('Transitioning to tunnel stage');
  currentStage = STAGES.TUNNEL;
  
  // Show tunnel canvas
  tunnelCanvas.style.display = 'block';
  
  // Start tunnel animation
  if (window.tunnelAnimation) {
    window.tunnelAnimation.start();
    
    // Set up callback for when tunnel completes
    window.onTunnelComplete = () => {
      console.log('Tunnel animation complete');
      transitionToJumpScare();
    };
  } else {
    console.error('Tunnel animation not initialized');
  }
}

/**
 * Transition to jump scare stage
 * @param {Object} options - Options for jump scare (creature, question)
 */
async function transitionToJumpScare(options = {}) {
  console.log('Transitioning to jump scare stage');
  currentStage = STAGES.JUMPSCARE;
  
  // Play jump scare audio if enabled
  if (audioManager) {
    await audioManager.play();
  }
  
  // Trigger jump scare with optional creature and question
  if (jumpScare) {
    jumpScare.trigger(options);
  } else {
    console.error('Jump scare not initialized');
  }
}

/**
 * Show jump scare with a question
 * @param {Object} question - Question object
 */
function showJumpScareWithQuestion(question) {
  transitionToJumpScare({ question });
}

/**
 * Load audio configuration from main process
 * Sets the audio enabled/disabled state based on user config
 */
async function loadAudioConfig() {
  // Check if electronAPI is available (not in test environment)
  if (!window.electronAPI || !window.electronAPI.getConfig) {
    console.log('electronAPI not available - using default audio settings');
    return;
  }

  try {
    // Get config from main process
    const config = await window.electronAPI.getConfig();
    
    if (config && typeof config.audioEnabled === 'boolean') {
      audioManager.setEnabled(config.audioEnabled);
      console.log(`Audio config loaded: ${config.audioEnabled ? 'enabled' : 'disabled'}`);
    }
  } catch (error) {
    console.error('Failed to load audio config:', error);
    // Continue with default settings
  }
}

/**
 * Set up IPC listeners for question-related events
 */
function setupQuestionListeners() {
  // Check if electronAPI is available (not in test environment)
  if (!window.electronAPI) {
    console.log('electronAPI not available - running in test mode');
    return;
  }

  // Listen for question show events from main process
  window.electronAPI.onShowQuestion((questionData) => {
    console.log('Received question from main process:', questionData);
    
    // Check if this is an error case (no questions available)
    if (questionData.error) {
      handleNoQuestionsAvailable(questionData.error);
      return;
    }
    
    // Show the question in the jump scare
    if (jumpScare && jumpScare.isJumpScareActive()) {
      // Jump scare is already showing, just add the question
      jumpScare.showQuestion(questionData);
    } else {
      // Jump scare not showing yet, trigger it with the question
      transitionToJumpScare({ question: questionData });
    }
  });

  // Listen for answer feedback from main process
  window.electronAPI.onAnswerFeedback((feedback) => {
    console.log('Received answer feedback:', feedback);
    
    if (jumpScare) {
      jumpScare.showFeedbackFromMain(feedback);
    }
  });

  console.log('Question IPC listeners set up');
}

/**
 * Handle the case when no questions are available
 * @param {string} errorMessage - Error message to display
 */
function handleNoQuestionsAvailable(errorMessage) {
  console.warn('No questions available:', errorMessage);
  
  // Show error message in the question container
  if (jumpScare && jumpScare.isJumpScareActive()) {
    jumpScare.showNoQuestionsError(errorMessage);
  } else {
    // If jump scare isn't active, show it with error
    transitionToJumpScare({ 
      noQuestions: true,
      errorMessage: errorMessage 
    });
  }
}

/**
 * Set up ESC key listener for sequence cancellation
 * Allows user to cancel the scare sequence at any stage
 */
function setupEscapeKeyListener() {
  document.addEventListener('keydown', (event) => {
    // Check if ESC key was pressed
    if (event.key === 'Escape' || event.keyCode === 27) {
      console.log('ESC key pressed - cancelling scare sequence');
      cancelSequence();
    }
  });
  
  console.log('ESC key listener set up');
}

/**
 * Cancel the current scare sequence
 * Stops all animations, clears the stage, and notifies main process
 */
function cancelSequence() {
  console.log('Cancelling scare sequence at stage:', currentStage);
  
  // Stop any ongoing animations based on current stage
  switch (currentStage) {
    case STAGES.SHAKE:
      stopShake();
      shakeLayer.style.display = 'none';
      break;
      
    case STAGES.DARK:
      darkOverlay.style.display = 'none';
      // Remove click listener if it exists
      darkOverlay.removeEventListener('click', handleDarkOverlayClick);
      break;
      
    case STAGES.TUNNEL:
      if (window.tunnelAnimation) {
        window.tunnelAnimation.stop();
      }
      tunnelCanvas.style.display = 'none';
      break;
      
    case STAGES.JUMPSCARE:
    case STAGES.QUESTION:
      if (jumpScare) {
        jumpScare.hide();
      }
      break;
      
    default:
      console.log('No active stage to cancel');
  }
  
  // Reset current stage
  currentStage = null;
  
  // Notify main process that sequence was cancelled
  if (window.electronAPI) {
    window.electronAPI.scareCancel();
  }
  
  console.log('Scare sequence cancelled');
}
