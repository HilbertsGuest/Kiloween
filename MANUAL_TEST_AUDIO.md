# Manual Test Plan: Audio Support for Jump Scare

## Overview
This document describes how to manually test the audio functionality for the jump scare sequence.

## Prerequisites
- Application built and running
- Access to configuration window
- Speakers or headphones connected

## Test Cases

### Test 1: Audio Enabled (Default)
**Objective**: Verify audio plays when enabled

**Steps**:
1. Launch the application
2. Open configuration window from system tray
3. Verify "Audio Enabled" toggle is ON (default)
4. Set timer interval to 1 minute (for quick testing)
5. Save configuration
6. Wait for timer to expire
7. Observe the scare sequence

**Expected Result**:
- When jump scare appears, you should hear a sound effect
- Sound should be brief (< 1 second)
- Sound should be spooky/startling

**Pass Criteria**: ✓ Audio plays during jump scare

---

### Test 2: Audio Disabled
**Objective**: Verify no audio plays when disabled

**Steps**:
1. Open configuration window
2. Toggle "Audio Enabled" to OFF
3. Save configuration
4. Wait for timer to expire
5. Observe the scare sequence

**Expected Result**:
- Jump scare appears normally
- NO sound plays
- Sequence continues without audio

**Pass Criteria**: ✓ No audio plays, sequence works normally

---

### Test 3: Audio Configuration Persistence
**Objective**: Verify audio setting persists across restarts

**Steps**:
1. Open configuration window
2. Disable audio
3. Save configuration
4. Close application completely
5. Restart application
6. Open configuration window

**Expected Result**:
- Audio toggle should still be OFF
- Setting persisted in config.json

**Pass Criteria**: ✓ Audio setting persists after restart

---

### Test 4: Audio Fallback (No Audio File)
**Objective**: Verify fallback beep plays if audio file missing

**Steps**:
1. Ensure audio is enabled in config
2. Note: jumpscare.mp3 file doesn't exist (expected)
3. Wait for timer to expire
4. Observe the scare sequence

**Expected Result**:
- Jump scare appears normally
- A synthesized beep sound plays (fallback)
- Beep is low-frequency (150Hz), harsh/spooky
- Duration is about 0.5 seconds

**Pass Criteria**: ✓ Fallback beep plays when audio file unavailable

---

### Test 5: Audio with ESC Cancellation
**Objective**: Verify audio stops when sequence cancelled

**Steps**:
1. Enable audio in configuration
2. Wait for timer to expire
3. When jump scare appears and audio plays
4. Immediately press ESC key

**Expected Result**:
- Scare sequence cancels
- Audio stops playing
- Window closes
- Timer resets

**Pass Criteria**: ✓ Audio stops when sequence cancelled

---

### Test 6: Multiple Scare Sequences
**Objective**: Verify audio plays correctly on repeated scares

**Steps**:
1. Enable audio
2. Set timer to 1 minute
3. Wait for first scare sequence
4. Complete the question
5. Wait for second scare sequence
6. Observe audio behavior

**Expected Result**:
- Audio plays on first scare
- Audio plays on second scare
- Audio resets to beginning each time
- No audio overlap or glitches

**Pass Criteria**: ✓ Audio works correctly on repeated scares

---

## Configuration File Verification

After testing, verify the configuration file:

**Location**: `%APPDATA%/spooky-study-app/config.json` (Windows)

**Expected Content**:
```json
{
  "version": "1.0.0",
  "interval": 30,
  "documents": [],
  "audioEnabled": true,  // or false if disabled
  "difficulty": "medium",
  "theme": "halloween",
  "lastRun": "2025-11-18T..."
}
```

## Error Scenarios

### Scenario 1: Autoplay Blocked
**Situation**: Browser/Electron blocks autoplay

**Expected Behavior**:
- Fallback beep should play instead
- No error shown to user
- Sequence continues normally

### Scenario 2: Audio Context Unavailable
**Situation**: Web Audio API not supported

**Expected Behavior**:
- No audio plays
- No error shown to user
- Sequence continues normally
- Console logs error (for debugging)

## Console Verification

Open DevTools (Ctrl+Shift+I) and check console logs:

**When Audio Enabled**:
```
AudioManager initialized
Audio enabled
Jump scare audio playing
```

**When Audio Disabled**:
```
AudioManager initialized
Audio disabled
Audio disabled - skipping playback
```

**When Fallback Used**:
```
AudioManager initialized
Audio enabled
Failed to play audio: [error]
Playing fallback beep sound
```

## Notes

- Audio file (`jumpscare.mp3`) is not included in current implementation
- Fallback beep provides functional audio for testing
- In production, bundle a proper audio file with the application
- All error scenarios should degrade gracefully without breaking the scare sequence

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Test 1: Audio Enabled | ⬜ | |
| Test 2: Audio Disabled | ⬜ | |
| Test 3: Configuration Persistence | ⬜ | |
| Test 4: Audio Fallback | ⬜ | |
| Test 5: ESC Cancellation | ⬜ | |
| Test 6: Multiple Sequences | ⬜ | |

**Tester**: _______________  
**Date**: _______________  
**Overall Result**: ⬜ Pass / ⬜ Fail
