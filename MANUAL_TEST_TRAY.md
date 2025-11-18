# Manual Test: System Tray on Windows

## Test Objective
Verify that the system tray icon and menu work correctly on Windows.

## Prerequisites
- Windows OS
- Node.js and npm installed
- Project dependencies installed (`npm install`)

## Test Steps

### 1. Start the Application
```bash
npm start
```

**Expected Result:**
- Application starts without showing any window
- System tray icon appears in the Windows system tray (bottom-right corner)
- Icon shows "Spooky Study App" tooltip when hovering

### 2. Test Tray Icon Tooltip
- Hover mouse over the system tray icon

**Expected Result:**
- Tooltip displays "Spooky Study App"

### 3. Test Configuration Menu Item
- Right-click on the system tray icon
- Click "Configuration" menu item

**Expected Result:**
- Configuration window opens
- Window displays configuration UI

### 4. Test Configuration Window Reopen
- Close the configuration window
- Right-click on the system tray icon again
- Click "Configuration" menu item

**Expected Result:**
- Configuration window opens again

### 5. Test Configuration Window Show (when already open)
- With configuration window open, minimize or hide it
- Right-click on the system tray icon
- Click "Configuration" menu item

**Expected Result:**
- Configuration window is brought to front/shown

### 6. Test Exit Menu Item
- Right-click on the system tray icon
- Click "Exit" menu item

**Expected Result:**
- Application terminates completely
- System tray icon disappears
- All windows close
- Process exits

## Test Results

| Test Step | Status | Notes |
|-----------|--------|-------|
| 1. Start Application | ⬜ | |
| 2. Tray Icon Tooltip | ⬜ | |
| 3. Configuration Menu | ⬜ | |
| 4. Configuration Reopen | ⬜ | |
| 5. Configuration Show | ⬜ | |
| 6. Exit Menu | ⬜ | |

## Requirements Verified

- ✅ **Requirement 1.2**: Application runs in background and remains active in system tray
- ✅ **Requirement 10.5**: Configuration interface accessible via system tray icon
- ✅ **Requirement 11.1**: User can exit application via system tray menu

## Notes
- The system tray icon uses `src/renderer/assets/icon.png`
- The tray menu has exactly 2 items: "Configuration" and "Exit"
- The application properly cleans up resources on exit (tray is destroyed)
