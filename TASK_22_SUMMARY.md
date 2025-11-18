# Task 22 Summary: Screen Darkening Transition

## Overview
Implemented the screen darkening transition that occurs after the shake effect completes. This creates a spooky atmosphere by gradually darkening the screen and prompting the user to click to continue.

## Implementation Details

### Components Implemented

1. **Dark Overlay Element** (`#dark-overlay`)
   - Full-screen semi-transparent overlay
   - Positioned absolutely with z-index 10
   - Initially hidden with `display: none`
   - Contains click prompt indicator

2. **Click Prompt** (`#click-prompt`)
   - Subtle text indicator: "Click to continue..."
   - Pulsing animation for visibility
   - Semi-transparent white color with text shadow
   - User-select disabled for clean UX

3. **Transition Function** (`transitionToDarkening()`)
   - Hides shake layer
   - Shows dark overlay with initial transparent background
   - Uses double `requestAnimationFrame` for smooth CSS transition
   - Fades to 95% opacity over 2 seconds
   - Adds single-use click listener

4. **Click Handler** (`handleDarkOverlayClick()`)
   - Hides dark overlay when clicked
   - Transitions to tunnel stage
   - Uses `{ once: true }` to prevent multiple triggers

### CSS Styling

```css
#dark-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0);
  display: none;
  justify-content: center;
  align-items: center;
  transition: background 2s ease-in;
  cursor: pointer;
  z-index: 10;
}

#click-prompt {
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  text-align: center;
  animation: pulse 2s infinite;
  user-select: none;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

@keyframes pulse {
  0%, 100% { 
    opacity: 0.5;
    transform: scale(1);
  }
  50% { 
    opacity: 0.9;
    transform: scale(1.05);
  }
}
```

### JavaScript Implementation

```javascript
function transitionToDarkening() {
  console.log('Transitioning to darkening stage');
  currentStage = STAGES.DARK;
  
  // Hide shake layer
  shakeLayer.style.display = 'none';
  
  // Show dark overlay with initial transparent state
  darkOverlay.style.display = 'flex';
  darkOverlay.style.background = 'rgba(0, 0, 0, 0)';
  
  // Trigger fade-in animation after a brief delay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      darkOverlay.style.background = 'rgba(0, 0, 0, 0.95)';
    });
  });
  
  // Add click listener to proceed to next stage
  darkOverlay.addEventListener('click', handleDarkOverlayClick, { once: true });
  
  console.log('Darkening stage active - waiting for user click');
}

function handleDarkOverlayClick() {
  console.log('Dark overlay clicked - proceeding to tunnel stage');
  
  // Remove the overlay
  darkOverlay.style.display = 'none';
  
  // Transition to tunnel stage
  transitionToTunnel();
}
```

## Requirements Verified

### Requirement 3.4: Darkening after shake
✅ **WHEN the screen shake reaches maximum intensity THEN the system SHALL transition to the darkening effect**
- `transitionToDarkening()` is called after shake completes
- Shake layer is hidden before darkening begins

### Requirement 4.1: Begin darkening after shake
✅ **WHEN the screen shake reaches maximum intensity THEN the system SHALL begin darkening the screen**
- Darkening begins immediately after shake sequence
- Smooth transition from shake to dark overlay

### Requirement 4.2: Semi-transparent dark overlay
✅ **WHEN darkening begins THEN the system SHALL apply a semi-transparent dark overlay that gradually increases opacity**
- Starts at `rgba(0, 0, 0, 0)` (fully transparent)
- Fades to `rgba(0, 0, 0, 0.95)` (95% opacity)
- 2-second CSS transition for smooth fade-in

### Requirement 4.3: Wait for user interaction
✅ **WHEN the screen is fully darkened THEN the system SHALL wait for user interaction (click)**
- Click listener added with `{ once: true }`
- User must click to proceed to next stage
- Click can occur during fade-in (doesn't wait for completion)

### Requirement 4.4: Display visual cue
✅ **WHEN the screen is darkened THEN the system SHALL display a subtle visual cue indicating the user should click**
- "Click to continue..." text displayed
- Pulsing animation for visibility
- Text shadow for contrast against dark background
- Cursor changes to pointer on hover

## Test Results

All 22 tests passing:

### Test Coverage
- ✅ Darkening Stage Initialization (4 tests)
  - Hides shake layer
  - Shows dark overlay
  - Starts with transparent background
  - Fades to dark background

- ✅ Click Prompt Display (2 tests)
  - Displays click prompt indicator
  - Has pulse animation

- ✅ Click Detection (4 tests)
  - Adds click listener
  - Hides overlay when clicked
  - Transitions to tunnel stage
  - Only triggers once per click

- ✅ Transition Timing (2 tests)
  - Uses 2s transition
  - Accepts clicks during fade

- ✅ Visual Feedback (3 tests)
  - Cursor pointer on overlay
  - Proper z-index
  - Text shadow on prompt

- ✅ Requirement Tests (7 tests)
  - All 5 requirements verified with dedicated tests

## Files Modified

1. **src/renderer/scare/index.html**
   - Already contained dark overlay structure
   - No changes needed

2. **src/renderer/scare/styles.css**
   - Already contained dark overlay styles
   - No changes needed

3. **src/renderer/scare/renderer.js**
   - Added `transitionToDarkening()` function
   - Added `handleDarkOverlayClick()` function
   - Exposed functions on window object for testing
   - Integrated with shake sequence completion

4. **src/renderer/scare/darkening.test.js**
   - Fixed test setup to properly load CSS and scripts
   - Updated to use exposed window functions
   - Added afterEach cleanup
   - All 22 tests passing

## Demo

A standalone demo file `TASK_22_DEMO.html` has been created to showcase the darkening transition functionality. Open it in a browser to test:
- Click "Test Darkening Transition" to see the fade-in effect
- Click the darkened screen to proceed
- Click "Reset Demo" to try again

## Integration

The darkening transition is automatically triggered when the shake sequence completes:

```javascript
// In startShake() function
if (currentLevel < shakeProgression.length) {
  // Continue shaking...
} else {
  // Shake complete, transition to next stage
  stopShake();
  transitionToDarkening();  // ← Automatic transition
}
```

## Next Steps

Task 23 (Tunnel Animation) will be triggered when the user clicks the dark overlay, continuing the scare sequence flow.

## Technical Notes

### Double requestAnimationFrame
The implementation uses a double `requestAnimationFrame` call to ensure the CSS transition works properly:

```javascript
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    darkOverlay.style.background = 'rgba(0, 0, 0, 0.95)';
  });
});
```

This is necessary because:
1. First RAF ensures the initial transparent state is rendered
2. Second RAF ensures the browser has processed the initial state
3. Then the transition to dark can animate smoothly

### Event Listener Options
The click listener uses `{ once: true }` to automatically remove itself after one click, preventing multiple triggers and ensuring clean state management.

### Z-Index Layering
The dark overlay has `z-index: 10` to ensure it appears above the shake layer but below any future UI elements that might need higher priority.

## Performance

- CSS transitions are hardware-accelerated
- No JavaScript animation loops
- Single event listener with automatic cleanup
- Minimal DOM manipulation
- Smooth 60fps animation

## Accessibility Considerations

- Clear visual indicator (click prompt)
- Pulsing animation draws attention
- Text shadow ensures readability
- Cursor feedback (pointer on hover)
- Keyboard support could be added (ESC key) in future tasks
