/**
 * AudioManager - Manages audio playback for jump scare sound effects
 * Respects user's audio enabled/disabled configuration
 */
class AudioManager {
  constructor() {
    this.enabled = true;
    this.audio = null;
    this.audioPath = 'jumpscare.mp3';
  }

  /**
   * Initialize the audio manager
   * Creates the audio element and sets up error handling
   */
  async init() {
    try {
      // Create audio element
      this.audio = new Audio();
      this.audio.preload = 'auto';
      
      // Set up error handling
      this.audio.addEventListener('error', (e) => {
        console.warn('Audio file not found, will use fallback beep:', e);
        // Mark audio as unavailable so we use fallback
        this.audio = null;
      });
      
      // Try to load the audio file
      // In a real implementation, this would be a bundled asset
      // For now, we'll use Web Audio API as fallback if file doesn't exist
      this.audio.src = this.audioPath;
      
      console.log('AudioManager initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      // Continue without audio - graceful degradation
      this.audio = null;
    }
  }

  /**
   * Set whether audio is enabled
   * @param {boolean} enabled - True to enable audio, false to disable
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Play the jump scare sound effect
   * Only plays if audio is enabled
   * @returns {Promise<void>}
   */
  async play() {
    if (!this.enabled) {
      console.log('Audio disabled - skipping playback');
      return;
    }

    if (!this.audio) {
      console.warn('Audio not initialized');
      return;
    }

    try {
      // Reset audio to beginning
      this.audio.currentTime = 0;
      
      // Attempt to play
      await this.audio.play();
      console.log('Jump scare audio playing');
    } catch (error) {
      // Handle autoplay restrictions or other playback errors
      console.error('Failed to play audio:', error);
      
      // Try fallback beep sound using Web Audio API
      this.playFallbackBeep();
    }
  }

  /**
   * Play a fallback beep sound using Web Audio API
   * Used when the audio file fails to load or play
   */
  playFallbackBeep() {
    if (!this.enabled) {
      return;
    }

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create oscillator for beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound - low frequency for spooky effect
      oscillator.frequency.value = 150; // Low frequency
      oscillator.type = 'sawtooth'; // Harsh sound
      
      // Configure volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5); // Decay
      
      // Play for 0.5 seconds
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('Playing fallback beep sound');
    } catch (error) {
      console.error('Failed to play fallback beep:', error);
      // Complete graceful degradation - no audio at all
    }
  }

  /**
   * Stop any currently playing audio
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }
}

// Make AudioManager available globally for the renderer process
if (typeof window !== 'undefined') {
  window.AudioManager = AudioManager;
}
