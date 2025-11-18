# Manual Testing Guide: Configuration IPC Integration

## Prerequisites
- App must be running: `npm start`
- Configuration window should be accessible from system tray

## Test 1: Load Configuration on Window Open
1. Launch the app
2. Open configuration window from system tray
3. **Expected**: Window displays default settings:
   - Interval: 30 minutes
   - Audio: Enabled
   - Difficulty: Medium
   - Documents: Empty list

## Test 2: Save Configuration Changes
1. Open configuration window
2. Change interval to 60 minutes
3. Toggle audio to disabled
4. Change difficulty to Hard
5. Click "Save Configuration"
6. **Expected**: 
   - Status message shows "Saving configuration..."
   - Save button becomes disabled briefly
   - Status message changes to "Configuration saved successfully!" (green)
   - Message auto-clears after 3 seconds

## Test 3: Configuration Persistence
1. Make changes to configuration (e.g., interval to 45)
2. Click Save
3. Close configuration window
4. Close the entire app (Exit from tray)
5. Restart the app
6. Open configuration window
7. **Expected**: All settings from step 1 are preserved

## Test 4: Real-time Validation
1. Open configuration window
2. Move interval slider to minimum (5 minutes)
3. **Expected**: No error, save button enabled
4. Try to set interval below 5 (if possible via manual input)
5. **Expected**: Error message appears, save button disabled
6. Move slider to valid value
7. **Expected**: Error clears, save button enabled

## Test 5: Add Documents
1. Open configuration window
2. Click "Add Documents" button
3. Select a PDF file
4. **Expected**:
   - Document appears in list with "Checking..." status
   - Status changes to "Valid" with green indicator
   - Document icon shows 📕 for PDF
5. Try adding the same document again
6. **Expected**: Error message "Document already added"

## Test 6: Remove Documents
1. Add a document to the list
2. Click "Remove" button on the document
3. Confirm removal in dialog
4. **Expected**:
   - Document removed from UI
   - Configuration updated in main process
5. Close and reopen window
6. **Expected**: Document is still removed (persisted)

## Test 7: Document Validation
1. Try to add an invalid file type (e.g., .jpg)
2. **Expected**: Error message "Invalid file type"
3. Try to add a non-existent file path (via drag-drop if possible)
4. **Expected**: Error message "File not found" or "Invalid document"

## Test 8: Config Update Notifications
1. Open configuration window
2. Keep window open
3. (If possible) Modify config file directly or via another window
4. **Expected**: UI updates automatically to reflect changes

## Test 9: Multiple Rapid Changes
1. Open configuration window
2. Quickly change multiple settings:
   - Move interval slider
   - Toggle audio
   - Change difficulty
3. Click Save
4. **Expected**: All changes saved correctly
5. Reload window to verify

## Test 10: Error Handling
1. Open configuration window
2. Make changes
3. (Simulate error by making config file read-only if possible)
4. Click Save
5. **Expected**: Error message displayed in red
6. Save button re-enabled for retry

## Success Criteria
- ✅ All settings load correctly on window open
- ✅ Changes save successfully with visual feedback
- ✅ Settings persist across app restarts
- ✅ Real-time validation prevents invalid values
- ✅ Document management works via IPC
- ✅ Error messages are clear and helpful
- ✅ UI stays responsive during operations
- ✅ No console errors during normal operation

## Common Issues
- **Settings don't persist**: Check that config file is writable
- **Documents don't validate**: Ensure file paths are accessible
- **Save button stays disabled**: Check for validation errors
- **No visual feedback**: Check browser console for errors
