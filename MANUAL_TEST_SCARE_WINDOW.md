# Manual Test: Scare Window with Transparent Overlay

## Test Date: 2025-11-15
## Task: Task 20 - Create scare window with transparent overlay

## Overview
This document describes manual testing procedures for the scare window functionality, which creates a full-screen, frameless, transparent overlay window.

## Prerequisites
- Application must be running
- Timer must be configured (can use short interval for testing)

## Test Cases

### Test 1: Window Creation
**Objective**: Verify that the scare window is created with correct configuration

**Steps**:
1. Start the application
2. Open developer console (if available)
3. Check console logs for "Scare window created" message

**Expected Results**:
- Window is created but not visible
- No errors in console
- Window is configured as frameless, transparent, always-on-top

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 2: Window Dimensions
**Objective**: Verify that the window covers the entire screen

**Steps**:
1. Note your screen resolution
2. Trigger the scare window (wait for timer or use test trigger)
3. Verify window covers entire screen

**Expected Results**:
- Window dimensions match primary display size
- Window positioned at (0, 0)
- No gaps or borders visible

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
Screen Resolution: _______
Window covers full screen: Yes / No
```

---

### Test 3: Frameless Configuration
**Objective**: Verify that the window has no frame or title bar

**Steps**:
1. Trigger the scare window
2. Observe the window appearance

**Expected Results**:
- No title bar visible
- No window borders
- No minimize/maximize/close buttons
- Window appears as overlay

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 4: Transparent Background
**Objective**: Verify that the window has a transparent background

**Steps**:
1. Trigger the scare window
2. Observe if underlying desktop/windows are visible through empty areas

**Expected Results**:
- Window background is transparent
- Only HTML content is visible
- Underlying content shows through transparent areas

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 5: Always-On-Top Behavior
**Objective**: Verify that the window stays on top of all other windows

**Steps**:
1. Open several other applications
2. Trigger the scare window
3. Try to click on other windows or use Alt+Tab

**Expected Results**:
- Scare window remains on top
- Other windows cannot be brought to front
- Window blocks interaction with other applications

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 6: Show Window Functionality
**Objective**: Verify that showScareWindow() displays the window

**Steps**:
1. Wait for timer to expire (or trigger manually)
2. Observe window appearance

**Expected Results**:
- Window becomes visible
- Window receives focus
- Console shows "Scare window shown" message

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 7: Hide Window Functionality
**Objective**: Verify that hideScareWindow() hides the window

**Steps**:
1. Show the scare window
2. Press ESC key to cancel sequence
3. Observe window behavior

**Expected Results**:
- Window becomes hidden
- Desktop/other windows become accessible
- Console shows "Scare window hidden" message
- Window remains in memory (not destroyed)

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 8: Destroy Window Functionality
**Objective**: Verify that destroyScareWindow() removes the window

**Steps**:
1. Show the scare window
2. Close the application
3. Check console logs

**Expected Results**:
- Window is destroyed during shutdown
- Console shows "Scare window destroyed" message
- No memory leaks

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 9: Timer Integration
**Objective**: Verify that timer expiration triggers the scare window

**Steps**:
1. Configure timer with short interval (e.g., 1 minute)
2. Start the timer
3. Wait for timer to expire
4. Observe window behavior

**Expected Results**:
- Scare window appears when timer expires
- Console shows "Timer expired! Triggering scare sequence..."
- Window receives SCARE_START IPC message

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
Timer interval: _______
Window appeared: Yes / No
Timing accurate: Yes / No
```

---

### Test 10: ESC Key Cancellation
**Objective**: Verify that ESC key cancels the scare sequence

**Steps**:
1. Trigger the scare window
2. Press ESC key
3. Observe window behavior

**Expected Results**:
- Window is hidden
- Timer is reset to configured interval
- Console shows "Scare sequence cancelled by user"

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 11: Multiple Show/Hide Cycles
**Objective**: Verify that window can be shown and hidden multiple times

**Steps**:
1. Trigger scare window (show)
2. Press ESC (hide)
3. Wait for timer to expire again (show)
4. Press ESC again (hide)
5. Repeat 2-3 times

**Expected Results**:
- Window shows and hides correctly each time
- No performance degradation
- No memory leaks
- Window reuses same instance

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
Number of cycles tested: _______
Any issues observed: _______
```

---

### Test 12: Window on Multiple Monitors
**Objective**: Verify window behavior with multiple monitors (if available)

**Steps**:
1. Connect second monitor (if available)
2. Trigger scare window
3. Observe which monitor(s) show the window

**Expected Results**:
- Window appears on primary display
- Window covers entire primary display
- Secondary monitors not affected (or covered based on config)

**Status**: ⬜ Pass / ⬜ Fail / ⬜ N/A (single monitor)

**Notes**:
```
Number of monitors: _______
Window behavior: _______
```

---

## Performance Testing

### Test 13: Window Creation Performance
**Objective**: Verify that window creation is fast

**Steps**:
1. Note timestamp when timer expires
2. Note timestamp when window appears
3. Calculate delay

**Expected Results**:
- Window appears within 100ms of timer expiration
- No noticeable lag

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
Measured delay: _______ ms
```

---

### Test 14: Memory Usage
**Objective**: Verify that window doesn't cause memory leaks

**Steps**:
1. Note memory usage before creating window
2. Show and hide window 10 times
3. Note memory usage after
4. Compare values

**Expected Results**:
- Memory usage increases minimally
- Memory is released when window is destroyed
- No significant memory leaks

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
Initial memory: _______ MB
After 10 cycles: _______ MB
Difference: _______ MB
```

---

## Edge Cases

### Test 15: Window Creation During Load
**Objective**: Verify behavior when window is shown while still loading

**Steps**:
1. Modify code to trigger window immediately on startup
2. Observe behavior

**Expected Results**:
- Window waits for content to load before showing
- No errors occur
- Window shows correctly once loaded

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

### Test 16: Rapid Show/Hide
**Objective**: Verify behavior with rapid show/hide calls

**Steps**:
1. Trigger multiple show/hide calls in quick succession
2. Observe behavior

**Expected Results**:
- No crashes or errors
- Window state is consistent
- Last call determines final state

**Status**: ⬜ Pass / ⬜ Fail

**Notes**:
```
[Add notes here]
```

---

## Summary

**Total Tests**: 16
**Passed**: _______
**Failed**: _______
**N/A**: _______

**Overall Status**: ⬜ Pass / ⬜ Fail

**Critical Issues**:
```
[List any critical issues found]
```

**Minor Issues**:
```
[List any minor issues found]
```

**Recommendations**:
```
[Add any recommendations for improvements]
```

---

## Test Environment

**Operating System**: Windows ___
**Screen Resolution**: _______
**Number of Monitors**: _______
**Node.js Version**: _______
**Electron Version**: _______
**Application Version**: _______

**Tester Name**: _______
**Test Date**: _______
**Test Duration**: _______ minutes
