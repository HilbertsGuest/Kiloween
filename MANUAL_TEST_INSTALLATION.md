# Manual Installation Testing Guide

This document provides step-by-step instructions for manually testing the installation and uninstallation of the Spooky Study App.

## Prerequisites

Before testing, ensure you have:
1. Built the application: `npm run build`
2. Located the installer in the `dist/` directory
3. A clean Windows system or VM for testing

## Test 1: NSIS Installer Installation

### Setup
- File: `dist/Spooky Study App-1.0.0-x64.exe`
- Test on: Clean Windows system

### Steps

1. **Launch Installer**
   - [ ] Double-click the installer executable
   - [ ] Verify installer window opens
   - [ ] Check that app name and version are displayed correctly

2. **License Agreement**
   - [ ] Read the license agreement
   - [ ] Verify "I Agree" button is present
   - [ ] Click "I Agree"

3. **Installation Location**
   - [ ] Verify default location is shown (e.g., `C:\Program Files\Spooky Study App`)
   - [ ] Click "Browse" and select a different location
   - [ ] Verify the path updates correctly
   - [ ] Return to default location
   - [ ] Click "Next"

4. **Installation Options**
   - [ ] Verify "Create Desktop Shortcut" checkbox is present and checked
   - [ ] Verify "Create Start Menu Shortcut" checkbox is present and checked
   - [ ] Click "Install"

5. **Installation Progress**
   - [ ] Verify progress bar appears
   - [ ] Verify installation completes without errors
   - [ ] Check that "Run Spooky Study App" checkbox appears
   - [ ] Leave it checked
   - [ ] Click "Finish"

6. **Post-Installation Verification**
   - [ ] Verify app launches automatically
   - [ ] Check system tray for app icon
   - [ ] Verify desktop shortcut was created
   - [ ] Verify Start Menu entry exists (Start → Spooky Study App)
   - [ ] Check installation directory contains all files:
     - [ ] `Spooky Study App.exe`
     - [ ] `resources/` folder
     - [ ] `locales/` folder
     - [ ] Other Electron files

7. **App Functionality**
   - [ ] Right-click system tray icon
   - [ ] Verify menu appears with "Configuration" and "Exit" options
   - [ ] Click "Configuration"
   - [ ] Verify configuration window opens
   - [ ] Close configuration window
   - [ ] Verify app continues running in background

8. **Registry Entries**
   - [ ] Open Registry Editor (regedit)
   - [ ] Navigate to `HKEY_CURRENT_USER\Software\Spooky Study App`
   - [ ] Verify registry entries exist
   - [ ] Navigate to `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
   - [ ] Verify uninstaller entry exists

### Expected Results
- ✓ Installation completes without errors
- ✓ All shortcuts are created
- ✓ App launches and runs correctly
- ✓ Registry entries are created

## Test 2: NSIS Installer Uninstallation

### Steps

1. **Launch Uninstaller via Control Panel**
   - [ ] Open Control Panel → Programs → Programs and Features
   - [ ] Find "Spooky Study App" in the list
   - [ ] Click "Uninstall"
   - [ ] Verify uninstaller window opens

2. **Uninstallation Confirmation**
   - [ ] Verify confirmation dialog appears
   - [ ] Click "Yes" to confirm uninstallation

3. **Uninstallation Progress**
   - [ ] Verify progress bar appears
   - [ ] Verify uninstallation completes without errors
   - [ ] Click "Close" when finished

4. **Post-Uninstallation Verification**
   - [ ] Verify desktop shortcut is removed
   - [ ] Verify Start Menu entry is removed
   - [ ] Check installation directory is removed
   - [ ] Verify app is no longer in Programs and Features list
   - [ ] Check system tray - app icon should be gone

5. **Data Cleanup Verification**
   - [ ] Navigate to `%APPDATA%\spooky-study-app`
   - [ ] Verify app data is removed (if deleteAppDataOnUninstall is true)
   - [ ] Check Registry Editor
   - [ ] Verify registry entries are removed

### Expected Results
- ✓ Uninstallation completes without errors
- ✓ All files and shortcuts are removed
- ✓ App data is cleaned up
- ✓ Registry entries are removed

## Test 3: Portable Executable

### Setup
- File: `dist/Spooky Study App-1.0.0-portable.exe`
- Test on: Clean Windows system

### Steps

1. **Launch Portable App**
   - [ ] Copy portable exe to a test folder (e.g., `C:\Test\`)
   - [ ] Double-click the portable executable
   - [ ] Verify app launches without installation

2. **First Run**
   - [ ] Verify system tray icon appears
   - [ ] Right-click tray icon and open Configuration
   - [ ] Configure some settings (interval, add a document)
   - [ ] Close configuration window

3. **Data Location**
   - [ ] Check the folder where portable exe is located
   - [ ] Verify `data/` folder is created in the same directory
   - [ ] Verify `config.json` exists in `data/` folder

4. **Portability Test**
   - [ ] Close the app (Exit from tray menu)
   - [ ] Copy the entire folder to a different location or USB drive
   - [ ] Launch the portable exe from the new location
   - [ ] Verify settings are preserved
   - [ ] Verify app works correctly

5. **Cleanup**
   - [ ] Close the app
   - [ ] Delete the folder containing the portable exe
   - [ ] Verify no files are left elsewhere on the system
   - [ ] Check `%APPDATA%` - should be empty or minimal

### Expected Results
- ✓ App runs without installation
- ✓ Settings are stored in local data folder
- ✓ App is truly portable (can be moved)
- ✓ No system-wide changes are made

## Test 4: Upgrade Installation

### Setup
- Build two versions: v1.0.0 and v1.0.1
- Install v1.0.0 first

### Steps

1. **Install Version 1.0.0**
   - [ ] Install v1.0.0 using NSIS installer
   - [ ] Configure some settings
   - [ ] Add test documents
   - [ ] Note the configuration

2. **Install Version 1.0.1 (Upgrade)**
   - [ ] Run v1.0.1 installer
   - [ ] Verify it detects existing installation
   - [ ] Proceed with installation
   - [ ] Verify upgrade completes

3. **Post-Upgrade Verification**
   - [ ] Launch the app
   - [ ] Verify settings are preserved
   - [ ] Verify documents are still configured
   - [ ] Check version in About or Help menu
   - [ ] Verify it shows v1.0.1

### Expected Results
- ✓ Upgrade installs without errors
- ✓ User settings are preserved
- ✓ App version is updated

## Test 5: Auto-Updater (Optional)

### Setup
- Requires GitHub release with v1.0.1
- Install v1.0.0

### Steps

1. **Trigger Update Check**
   - [ ] Launch app v1.0.0
   - [ ] Wait 10 seconds for auto-update check
   - [ ] Or manually trigger check (if implemented)

2. **Update Available Dialog**
   - [ ] Verify dialog appears: "Update Available"
   - [ ] Verify version number is shown (v1.0.1)
   - [ ] Click "Download"

3. **Download Progress**
   - [ ] Verify download starts
   - [ ] Check console logs for progress
   - [ ] Wait for download to complete

4. **Update Ready Dialog**
   - [ ] Verify dialog appears: "Update Ready"
   - [ ] Click "Restart Now"

5. **Post-Update Verification**
   - [ ] Verify app restarts
   - [ ] Check version is now v1.0.1
   - [ ] Verify settings are preserved
   - [ ] Verify app works correctly

### Expected Results
- ✓ Update is detected automatically
- ✓ Download completes successfully
- ✓ App updates and restarts
- ✓ Settings are preserved

## Test 6: Error Scenarios

### Test 6.1: Insufficient Permissions
- [ ] Try to install to `C:\Windows\` (should fail or request admin)
- [ ] Verify appropriate error message

### Test 6.2: Disk Space
- [ ] Try to install on a drive with insufficient space
- [ ] Verify appropriate error message

### Test 6.3: Corrupted Installer
- [ ] Modify installer file to corrupt it
- [ ] Try to run it
- [ ] Verify Windows shows error or installer fails gracefully

### Test 6.4: Installation Interruption
- [ ] Start installation
- [ ] Cancel during installation
- [ ] Verify partial installation is cleaned up
- [ ] Verify no broken shortcuts remain

### Test 6.5: Uninstallation with App Running
- [ ] Launch the app
- [ ] Try to uninstall while app is running
- [ ] Verify appropriate message (close app first)
- [ ] Or verify app is closed automatically

## Test 7: Multi-User Scenarios

### Test 7.1: Per-User Installation
- [ ] Install as User A
- [ ] Verify User B cannot see the app
- [ ] Verify each user has separate settings

### Test 7.2: System-Wide Installation
- [ ] Install with admin rights for all users
- [ ] Verify all users can access the app
- [ ] Verify each user has separate settings

## Checklist Summary

### Installation Tests
- [ ] NSIS installer installs correctly
- [ ] Desktop shortcut created
- [ ] Start Menu entry created
- [ ] App launches after installation
- [ ] All files are present

### Uninstallation Tests
- [ ] Uninstaller runs correctly
- [ ] All files removed
- [ ] Shortcuts removed
- [ ] Registry cleaned up
- [ ] App data removed (if configured)

### Portable Tests
- [ ] Portable exe runs without installation
- [ ] Settings stored locally
- [ ] Truly portable (can be moved)
- [ ] No system-wide changes

### Upgrade Tests
- [ ] Upgrade installs over old version
- [ ] Settings preserved
- [ ] Version updated correctly

### Auto-Update Tests
- [ ] Updates detected automatically
- [ ] Download works
- [ ] Installation works
- [ ] Settings preserved

## Reporting Issues

If you encounter any issues during testing, please report:

1. **Test number and step** where issue occurred
2. **Expected behavior** vs **actual behavior**
3. **Error messages** (screenshots if possible)
4. **System information**:
   - Windows version
   - User account type (admin/standard)
   - Antivirus software
   - Available disk space
5. **Log files**:
   - Installation log (if available)
   - App log: `%APPDATA%\spooky-study-app\app.log`

## Notes

- Test on a clean system or VM for best results
- Test with both admin and standard user accounts
- Test with antivirus enabled (may affect installation)
- Test on different Windows versions (10, 11)
- Keep installation logs for debugging

## Success Criteria

All tests should pass with:
- ✓ No errors during installation/uninstallation
- ✓ App functions correctly after installation
- ✓ Clean uninstallation with no leftover files
- ✓ Portable version works independently
- ✓ Upgrades preserve user settings
- ✓ Auto-updates work correctly (if enabled)
