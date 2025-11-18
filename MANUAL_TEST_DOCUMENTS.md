# Manual Test: Document Management UI

## Test Date
2025-11-14

## Test Environment
- OS: Windows
- Browser: Electron
- Task: Task 6 - Document Management UI

## Test Scenarios

### 1. Add Document Button
**Steps:**
1. Open configuration window
2. Click "Add Document" button
3. Select a PDF file from file picker
4. Verify document appears in list

**Expected Results:**
- File picker opens with correct filters (.pdf, .docx, .md, .txt)
- Selected document appears in document list
- Document shows "Checking..." status initially
- Status changes to "Valid" after validation
- Document icon matches file type (📕 for PDF)

**Status:** ⏳ Pending Manual Test

---

### 2. Multiple Document Selection
**Steps:**
1. Click "Add Document" button
2. Select multiple files (Ctrl+Click)
3. Verify all documents are added

**Expected Results:**
- All selected files appear in list
- Each document has correct icon
- No duplicates if same file selected twice

**Status:** ⏳ Pending Manual Test

---

### 3. Drag and Drop - Single File
**Steps:**
1. Drag a PDF file from file explorer
2. Drop it onto the drop zone
3. Verify document is added

**Expected Results:**
- Drop zone highlights when dragging over it
- Document appears in list after drop
- Drop zone returns to normal state

**Status:** ⏳ Pending Manual Test

---

### 4. Drag and Drop - Multiple Files
**Steps:**
1. Select multiple study documents
2. Drag them onto drop zone
3. Verify all are added

**Expected Results:**
- All files added to list
- Each shows correct status
- List scrolls if more than ~5 documents

**Status:** ⏳ Pending Manual Test

---

### 5. Invalid File Type
**Steps:**
1. Try to add an image file (.jpg)
2. Verify error message appears

**Expected Results:**
- Error message: "Invalid file type: [filename]. Supported: PDF, DOCX, MD, TXT"
- File is not added to list
- Error message is red

**Status:** ⏳ Pending Manual Test

---

### 6. Duplicate Detection
**Steps:**
1. Add a document
2. Try to add the same document again
3. Verify error message

**Expected Results:**
- Error message: "Document already added: [filename]"
- Document is not duplicated in list

**Status:** ⏳ Pending Manual Test

---

### 7. Remove Document
**Steps:**
1. Add several documents
2. Click "Remove" button on one document
3. Confirm removal in dialog
4. Verify document is removed

**Expected Results:**
- Confirmation dialog appears
- Document is removed from list
- Other documents remain
- Empty state shows if all removed

**Status:** ⏳ Pending Manual Test

---

### 8. Document List Display
**Steps:**
1. Add documents with different extensions
2. Verify each displays correctly

**Expected Results:**
- PDF: 📕 icon
- DOCX: 📘 icon
- MD: 📗 icon
- TXT: 📄 icon
- File name displayed (truncated if long)
- Full path shown below name (truncated if long)
- Status indicator shows correct color:
  - Green for valid
  - Red for invalid
  - Orange for checking

**Status:** ⏳ Pending Manual Test

---

### 9. Empty State
**Steps:**
1. Open configuration with no documents
2. Verify empty state displays

**Expected Results:**
- Empty state shows 📚 icon
- Message: "No documents added yet"
- Hint: "Add study materials to generate questions"

**Status:** ⏳ Pending Manual Test

---

### 10. Document List Scrolling
**Steps:**
1. Add more than 5 documents
2. Verify list scrolls

**Expected Results:**
- List has scrollbar
- Scrollbar styled with purple/orange theme
- All documents accessible via scroll

**Status:** ⏳ Pending Manual Test

---

### 11. Hover Effects
**Steps:**
1. Hover over various UI elements
2. Verify animations work

**Expected Results:**
- Add Document button: lifts up, shadow increases
- Drop zone: background lightens, border color changes
- Document items: slide right slightly, shadow appears
- Remove buttons: background turns red, scales up

**Status:** ⏳ Pending Manual Test

---

### 12. Configuration Persistence
**Steps:**
1. Add several documents
2. Click "Save Configuration"
3. Close and reopen configuration window
4. Verify documents are still there

**Expected Results:**
- Documents persist in localStorage
- All document properties preserved
- Status indicators correct

**Status:** ⏳ Pending Manual Test

---

### 13. Long File Names
**Steps:**
1. Add document with very long filename
2. Verify display handles it gracefully

**Expected Results:**
- File name truncated with ellipsis (...)
- Full name visible on hover (title attribute)
- Path also truncated if needed

**Status:** ⏳ Pending Manual Test

---

### 14. Different File Types
**Steps:**
1. Add one of each supported type:
   - sample.pdf
   - notes.docx
   - readme.md
   - data.txt
2. Verify each displays correctly

**Expected Results:**
- Each has correct icon
- All show "Valid" status
- All can be removed individually

**Status:** ⏳ Pending Manual Test

---

## Visual Verification

### Halloween Theme Consistency
- [ ] Drop zone uses purple/orange theme
- [ ] Document items have dark purple background
- [ ] Status indicators glow appropriately
- [ ] Hover effects use theme colors
- [ ] Scrollbar styled with theme colors

### Animations
- [ ] Document items slide in when added
- [ ] Status indicator pulses when "checking"
- [ ] Hover effects smooth and responsive
- [ ] Remove button scales on hover

### Responsiveness
- [ ] Layout works at different window sizes
- [ ] Text truncation works properly
- [ ] Scrolling smooth and functional

## Notes
- Document validation (valid/invalid status) will be fully implemented in Task 9
- Currently, all documents show as "checking" then "valid" after 500ms
- IPC communication for actual file validation will be added in Tasks 7-8

## Requirements Coverage
✅ Requirement 8.1: Configuration interface displays option to add document file paths
✅ Requirement 8.3: System accepts common formats (PDF, TXT, DOCX, MD)
✅ Requirement 10.1: Configuration interface displays all customizable settings in clear layout
