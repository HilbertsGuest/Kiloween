# Implementation Plan

- [x] 1. Set up Electron project structure and dependencies





  - Initialize npm project with package.json
  - Install Electron and core dependencies (electron, electron-builder)
  - Install document processing libraries (pdf-parse, mammoth, markdown-it)
  - Create basic folder structure (src/main, src/renderer, src/shared)
  - Configure Electron main and renderer entry points
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement ConfigManager for settings persistence





  - Create ConfigManager class with load/save methods
  - Define Config interface with all settings properties
  - Implement JSON file read/write with error handling
  - Add default configuration creation on first run
  - Write unit tests for ConfigManager
  - _Requirements: 2.4, 8.6, 10.4_

- [x] 3. Create main process entry point and application lifecycle





  - Set up Electron main process with app lifecycle handlers
  - Implement single instance lock to prevent multiple app instances
  - Initialize ConfigManager on app startup
  - Add graceful shutdown handling
  - Write tests for application lifecycle
  - _Requirements: 1.1, 1.2, 11.2_

- [x] 4. Implement system tray with basic menu





  - Create system tray icon and menu structure
  - Add menu items for "Configuration", "Exit"
  - Implement exit functionality that terminates the app
  - Add tray icon click handlers
  - Test system tray on Windows
  - _Requirements: 1.2, 10.5, 11.1_

- [x] 5. Create configuration window UI





  - Create HTML/CSS for configuration window
  - Implement interval slider with minute display (5-120 minutes)
  - Add audio toggle switch
  - Add difficulty dropdown (easy/medium/hard)
  - Style with Halloween theme
  - _Requirements: 2.1, 10.1, 10.2_

- [x] 6. Implement document management UI in configuration window





  - Add file picker button for adding documents
  - Create document list display with remove buttons
  - Implement drag-and-drop for adding documents
  - Add visual indicators for document status (valid/invalid)
  - Style document list section
  - _Requirements: 8.1, 8.3, 10.1_

- [x] 7. Implement IPC communication between main and renderer processes





  - Define IPC channel constants in shared module
  - Implement main process IPC handlers for config operations
  - Implement renderer process IPC senders for config changes
  - Add IPC handlers for document add/remove operations
  - Write tests for IPC message validation
  - _Requirements: 10.2, 10.3_

- [x] 8. Connect configuration UI to ConfigManager via IPC





  - Load current config on window open
  - Send config updates to main process on user changes
  - Implement real-time config validation in renderer
  - Add visual feedback for save operations
  - Test configuration persistence across app restarts
  - _Requirements: 10.2, 10.3, 10.4_

- [x] 9. Implement DocumentProcessor for file validation





  - Create DocumentProcessor class with format validation
  - Implement file existence checking
  - Add supported format detection (PDF, DOCX, MD, TXT)
  - Implement file size validation (max 50MB)
  - Write unit tests for validation logic
  - _Requirements: 8.2, 8.3, 12.1_

- [x] 10. Implement PDF document parsing





  - Integrate pdf-parse library
  - Implement PDF text extraction
  - Extract metadata (title, page count)
  - Handle encrypted/corrupted PDFs gracefully
  - Write unit tests with sample PDF files
  - _Requirements: 8.3, 8.4, 12.1_

- [x] 11. Implement DOCX document parsing





  - Integrate mammoth library
  - Implement DOCX text extraction
  - Extract metadata (title, word count)
  - Handle corrupted DOCX files gracefully
  - Write unit tests with sample DOCX files
  - _Requirements: 8.3, 8.4, 12.1_

- [x] 12. Implement Markdown and TXT document parsing





  - Integrate markdown-it library for MD files
  - Implement plain text reading for TXT files
  - Extract metadata (word count, headings)
  - Handle encoding issues gracefully
  - Write unit tests with sample files
  - _Requirements: 8.3, 8.4, 12.1_

- [x] 13. Implement document processing orchestration





  - Create processAllDocuments method that processes configured documents
  - Implement async processing with Promise.all
  - Add progress tracking for multiple documents
  - Implement error aggregation and reporting
  - Write integration tests for multi-document processing
  - _Requirements: 8.4, 12.1, 12.2_

- [x] 14. Implement basic QuestionGenerator with keyword extraction





  - Create QuestionGenerator class
  - Implement keyword extraction from document content
  - Identify key concepts using frequency analysis
  - Extract sentences containing keywords as question sources
  - Write unit tests for keyword extraction
  - _Requirements: 7.2, 9.1_

- [x] 15. Implement multiple-choice question generation





  - Generate question text from extracted sentences
  - Create correct answer from context
  - Generate plausible distractor options from document
  - Ensure grammatical correctness of questions
  - Write unit tests for question quality
  - _Requirements: 7.3, 9.2, 9.3, 9.4_

- [x] 16. Implement question caching and session management





  - Create question cache storage (questions.json)
  - Implement cache save/load functionality
  - Track used questions in current session
  - Implement getNextQuestion with uniqueness guarantee
  - Write tests for session management
  - _Requirements: 7.5, 12.2_

- [x] 17. Implement answer validation and feedback





  - Create answer validation logic for multiple-choice
  - Implement feedback message generation
  - Add positive reinforcement for correct answers
  - Add explanatory feedback for incorrect answers
  - Write unit tests for validation logic
  - _Requirements: 7.4, 9.5_

- [x] 18. Implement TimerManager for scare sequence triggering




  - Create TimerManager class with start/stop/reset methods
  - Implement countdown using setInterval
  - Add timer expiration event emission
  - Implement timer persistence across app restarts
  - Write unit tests for timer logic
  - _Requirements: 2.3, 11.3_

- [x] 19. Connect TimerManager to ConfigManager for interval updates





  - Load interval from config on timer initialization
  - Implement config change listener for interval updates
  - Reset timer when interval changes
  - Add timer state to session management
  - Test timer behavior with config changes
  - _Requirements: 2.3, 2.4_

- [x] 20. Create scare window with transparent overlay





  - Create BrowserWindow for scare sequence
  - Configure window as frameless, transparent, always-on-top
  - Set window to full-screen dimensions
  - Implement window show/hide functionality
  - Test window creation on Windows
  - _Requirements: 3.1, 4.3, 5.1_

- [x] 21. Implement screen shake effect








  - Create HTML/CSS structure for shake layer
  - Implement progressive shake animation using CSS transforms
  - Add JavaScript to control shake intensity over time
  - Implement 3-5 second shake duration with increasing amplitude
  - Test shake smoothness and performance
  - _Requirements: 3.1, 3.2, 3.3_
-

- [x] 22. Implement screen darkening transition








  - Create dark overlay div with opacity animation
  - Implement fade-in effect after shake completes
  - Add subtle click prompt indicator
  - Implement click detection to proceed
  - Test transition timing and smoothness
  - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4_
-



- [x] 23. Implement tunnel animation with Canvas


  - Create canvas element for tunnel rendering
  - Implement tunnel drawing using concentric circles/rectangles
  - Add forward movement animation on first click
  - Implement 2-3 second animation duration
  - Use Halloween color scheme (dark purples, oranges)
  - _Requirements: 5.1, 5.2, 5.5_

- [x] 24. Implement tunnel pause and second click detection







  - Pause tunnel animation after first movement
  - Add visual indicator for second click
  - Detect second click to trigger jump scare
  - Implement smooth transition to jump scare
  - Test click detection reliability
  - _Requirements: 5.3, 5.4_


- [x] 25. Create jump scare creature display with ASCII art






  - Create creature ASCII art designs (multiple variations)
  - Implement full-screen creature display
  - Add sudden appearance animation
  - Implement text overlay for question
  - Test visual impact and timing
  - _Requirements: 6.1, 6.2, 6.4, 6.5_


- [x] 26. Implement ScareController to orchestrate sequence






  - Create ScareController class
  - Implement stage progression (shake → dark → tunnel → scare)
  - Add click handlers for stage transitions
  - Implement IPC communication with scare window
  - Write integration tests for sequence flow
  - _Requirements: 3.1, 4.1, 5.1, 6.1_


- [x] 27. Connect ScareController to TimerManager






  - Implement timer expiration handler in ScareController
  - Trigger scare sequence when timer expires
  - Reset timer after sequence completes
  - Add sequence cancellation on ESC key
  - Test full timer-to-scare flow



  - _Requirements: 2.3, 11.3_

- [x] 28. Implement question display UI in scare window






  - Create question container with styling
  - Display question text after jump scare
  - Render multiple-choice options as buttons

  - Add hover effects and visual feedback
  - Style with Halloween theme
  - _Requirements: 6.4, 7.3_

- [x] 29. Connect question display to QuestionGenerator






  - Request question from main process after scare
  - Receive question via IPC and display
  - Handle case when no questions available
  - Implement fallback behavior for missing questions
  - Test question display with various question types
  - _Requirements: 7.1, 7.2, 12.2, 12.3_


- [x] 30. Implement answer submission and validation flow






  - Add click handlers to answer option buttons
  - Send answer to main process via IPC
  - Receive validation result and feedback
  - Display feedback message (correct/incorrect)
  - Mark question as used in session
  - _Requirements: 7.4, 7.5_


- [x] 31. Implement answer feedback display and sequence completion






  - Show visual feedback for correct answers (green, positive message)
  - Show visual feedback for incorrect answers (red, explanation)
  - Add delay before closing scare window
  - Fade out scare window after feedback
  - Return to background mode
  - _Requirements: 9.5, 7.4_


- [x] 32. Implement ESC key handling for sequence cancellation






  - Add global ESC key listener in scare window
  - Cancel current sequence stage on ESC press
  - Close scare window gracefully
  - Reset timer to configured interval
  - Test cancellation at each stage
  - _Requirements: 11.3_

- [x] 33. Add error handling for document processing failures







  - Implement try-catch blocks in document processing
  - Log errors to file for debugging
  - Display user-friendly error messages in config UI
  - Remove invalid documents from config automatically
  - Test with corrupted and missing files
  - _Requirements: 12.1, 12.3_

- [x] 34. Add error handling for question generation failures





  - Implement fallback to cached questions on generation failure
  - Display warning when no questions can be generated
  - Prompt user to check document configuration
  - Prevent timer from starting without valid questions
  - Test with empty and invalid documents
  - _Requirements: 12.2, 12.3, 12.4_

- [x] 35. Implement session statistics tracking





  - Track questions answered, correct answers, streak
  - Save session state to session.json
  - Display statistics in configuration window
  - Reset statistics on new session
  - Write tests for statistics calculations
  - _Requirements: 11.4_

- [ ] 36. Add audio support for jump scare (optional)














  - Add audio file for jump scare sound effect
  - Implement audio playback on jump scare trigger
  - Respect audio enabled/disabled config setting
  - Handle audio playback errors gracefully
  - Test audio on Windows
  - _Requirements: 6.3_

- [x] 37. Implement resource usage optimization





  - Profile CPU and memory usage during idle
  - Optimize document processing to use worker threads
  - Implement lazy loading for question generation
  - Add memory limits for question cache
  - Verify resource usage meets requirements (CPU < 5%, Memory < 100MB)
  - _Requirements: 1.3_

- [x] 38. Create end-to-end test for full application flow





  - Write automated test for app launch to configuration
  - Test document addition and processing
  - Simulate timer expiration and scare sequence
  - Test question answering and feedback
  - Verify return to background mode
  - _Requirements: All_

- [x] 39. Implement application packaging and distribution





  - Configure electron-builder for Windows
  - Create application icon
  - Set up auto-updater configuration
  - Build installer package
  - Test installation and uninstallation
  - _Requirements: 1.1, 1.2_

- [x] 40. Create README with setup and usage instructions





  - Document installation steps
  - Explain configuration options
  - Provide troubleshooting guide
  - Add screenshots of UI
  - Include development setup instructions
  - _Requirements: 10.1_
