// Tunnel animation using Canvas
// Implements forward movement animation with Halloween color scheme

class TunnelAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isAnimating = false;
    this.isPaused = false;
    this.animationFrame = null;
    this.depth = 0; // Current depth in tunnel
    this.maxDepth = 100; // Maximum depth for animation
    this.speed = 0; // Current animation speed
    this.clickCount = 0; // Track number of clicks
    
    // Halloween color scheme
    this.colors = {
      primary: '#4a0e4e', // Dark purple
      secondary: '#ff6b35', // Orange
      accent: '#2d1b2e', // Very dark purple
      highlight: '#ffa500' // Bright orange
    };
    
    // Resize canvas to window size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  /**
   * Resize canvas to match window dimensions
   */
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
  }
  
  /**
   * Start the tunnel animation
   */
  start() {
    console.log('Starting tunnel animation');
    this.isAnimating = true;
    this.isPaused = false;
    this.depth = 0;
    this.speed = 0;
    this.clickCount = 0;
    
    // Draw initial static tunnel
    this.drawTunnel();
    
    // Set up click handler for progression
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }
  
  /**
   * Handle click events for tunnel progression
   */
  handleClick() {
    if (!this.isAnimating) return;
    
    this.clickCount++;
    console.log(`Tunnel click ${this.clickCount}`);
    
    if (this.clickCount === 1) {
      // First click: start forward movement
      this.startForwardMovement();
    } else if (this.clickCount === 2 && this.isPaused) {
      // Second click: continue to jump scare
      this.continueToJumpScare();
    }
  }
  
  /**
   * Start forward movement animation (first click)
   */
  startForwardMovement() {
    console.log('Starting forward movement');
    this.isPaused = false;
    this.speed = 1.5; // Initial speed
    
    const startTime = Date.now();
    const duration = 2500; // 2.5 seconds
    
    const animate = () => {
      if (!this.isAnimating || this.isPaused) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Accelerate through tunnel
      this.depth = progress * 50; // Move halfway through tunnel
      this.speed = 1.5 + (progress * 2); // Increase speed
      
      this.drawTunnel();
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        // Animation complete, pause and wait for second click
        this.pauseForSecondClick();
      }
    };
    
    animate();
  }
  
  /**
   * Pause animation and wait for second click
   */
  pauseForSecondClick() {
    console.log('Tunnel paused - waiting for second click');
    this.isPaused = true;
    
    // Draw visual indicator for second click
    this.drawClickPrompt();
  }
  
  /**
   * Continue animation to jump scare (second click)
   */
  continueToJumpScare() {
    console.log('Continuing to jump scare');
    this.isPaused = false;
    
    const startDepth = this.depth;
    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds to complete
    
    const animate = () => {
      if (!this.isAnimating) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Accelerate rapidly to end
      this.depth = startDepth + ((this.maxDepth - startDepth) * progress);
      this.speed = 3 + (progress * 5); // Rapid acceleration
      
      this.drawTunnel();
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        // Tunnel complete, trigger jump scare
        this.stop();
        this.triggerJumpScare();
      }
    };
    
    animate();
  }
  
  /**
   * Draw the tunnel using concentric shapes
   */
  drawTunnel() {
    // Clear canvas
    this.ctx.fillStyle = this.colors.accent;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw concentric rectangles creating tunnel effect
    const numLayers = 20;
    
    for (let i = 0; i < numLayers; i++) {
      const layerDepth = i + this.depth;
      const scale = 1 - (layerDepth / this.maxDepth);
      
      if (scale <= 0) continue;
      
      // Calculate size based on depth
      const size = Math.max(this.canvas.width, this.canvas.height) * scale;
      const x = this.centerX - (size / 2);
      const y = this.centerY - (size / 2);
      
      // Alternate colors for depth effect
      const colorIndex = Math.floor(layerDepth) % 2;
      this.ctx.fillStyle = colorIndex === 0 ? this.colors.primary : this.colors.secondary;
      
      // Add some transparency for depth
      const alpha = 0.7 + (scale * 0.3);
      this.ctx.globalAlpha = alpha;
      
      // Draw rectangle
      this.ctx.fillRect(x, y, size, size);
      
      // Draw inner border for more detail
      this.ctx.strokeStyle = this.colors.highlight;
      this.ctx.lineWidth = 2 * scale;
      this.ctx.globalAlpha = alpha * 0.5;
      this.ctx.strokeRect(x, y, size, size);
    }
    
    // Reset alpha
    this.ctx.globalAlpha = 1;
    
    // Add circular vignette effect
    this.drawVignette();
  }
  
  /**
   * Draw vignette effect around edges
   */
  drawVignette() {
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, this.canvas.width * 0.3,
      this.centerX, this.centerY, this.canvas.width * 0.7
    );
    
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Draw click prompt indicator
   */
  drawClickPrompt() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = 'Click to continue...';
    const textY = this.canvas.height - 50;
    
    // Add glow effect
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    this.ctx.shadowBlur = 10;
    
    this.ctx.fillText(text, this.centerX, textY);
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
  }
  
  /**
   * Stop the tunnel animation
   */
  stop() {
    console.log('Stopping tunnel animation');
    this.isAnimating = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Remove click listener
    this.canvas.removeEventListener('click', this.handleClick);
  }
  
  /**
   * Trigger jump scare (to be connected to main sequence)
   */
  triggerJumpScare() {
    console.log('Tunnel complete - triggering jump scare');
    
    // Hide tunnel canvas
    this.canvas.style.display = 'none';
    
    // Notify main sequence (if callback exists)
    if (window.onTunnelComplete) {
      window.onTunnelComplete();
    }
  }
}

// Initialize tunnel animation when DOM is ready
let tunnelAnimation = null;

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('tunnel-canvas');
  if (canvas) {
    tunnelAnimation = new TunnelAnimation(canvas);
    
    // Expose to window for external control
    window.tunnelAnimation = tunnelAnimation;
  }
});
