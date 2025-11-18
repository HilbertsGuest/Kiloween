# Spooky Study App 🎃📚

> A Halloween-themed desktop application that transforms procrastination into productive learning

This is my resurrection / costume contest entry for the Kiloween hackathon.

## Overview

The Spooky Study App is a desktop application that runs silently in the background and periodically interrupts unproductive computer time with a spooky experience followed by educational questions derived from your coursework documents. It's designed to help students stay productive by turning procrastination breaks into learning opportunities.

### How It Works

1. **Background Mode**: The app runs quietly in your system tray
2. **Timer Countdown**: After your configured interval (5-120 minutes), the sequence begins
3. **Scare Sequence**: Progressive effects build tension (shake → darken → tunnel → jump scare)
4. **Educational Question**: Answer a question generated from your study materials
5. **Immediate Feedback**: Get instant feedback and return to your work
6. **Repeat**: The timer resets and the cycle continues

## Features

- 🎃 **Background Execution**: Runs silently in the system tray
- ⏰ **Configurable Timing**: Set intervals from 5-120 minutes
- 👻 **Progressive Scare Sequence**: Screen shake → darkening → tunnel animation → jump scare
- 📚 **Educational Questions**: Generated from your study materials (PDF, DOCX, MD, TXT)
- 🎨 **Halloween Theme**: Spooky ASCII art and dark color scheme
- 📊 **Session Statistics**: Track your learning progress with detailed stats
- 🎯 **Difficulty Levels**: Choose from easy, medium, or hard questions
- 🔊 **Optional Audio**: Enable/disable jump scare sound effects
- 🔄 **Auto-Updates**: Automatic updates via GitHub releases
- ⚡ **Lightweight**: Uses less than 5% CPU and 100MB RAM during idle

## Installation

### System Requirements

- **Operating System**: Windows 10 or later (64-bit)
- **RAM**: 4GB minimum (app uses <100MB)
- **Disk Space**: 200MB for installation
- **Display**: 1280x720 minimum resolution

### Download

Download the latest release from the [Releases](https://github.com/your-username/spooky-study-app/releases) page:

- **Installer** (recommended): `Spooky Study App-1.0.0-x64.exe`
  - Full installation with Start Menu and Desktop shortcuts
  - Automatic updates enabled
  - Settings stored in AppData
  
- **Portable**: `Spooky Study App-1.0.0-portable.exe`
  - No installation required
  - Run from any folder (USB drive, cloud storage, etc.)
  - Settings stored in `data/` folder next to executable

### Installation Methods

#### Method 1: Installer (Recommended)

1. Download `Spooky Study App-1.0.0-x64.exe`
2. Double-click the installer
3. Choose installation directory (or use default)
4. Select additional options:
   - ✅ Create Desktop shortcut
   - ✅ Create Start Menu shortcut
5. Click "Install" and wait for completion
6. Launch the app from Desktop or Start Menu

**Installation Location**: `C:\Program Files\Spooky Study App\`  
**Settings Location**: `%APPDATA%\spooky-study-app\`

#### Method 2: Portable Version

1. Download `Spooky Study App-1.0.0-portable.exe`
2. Create a folder (e.g., `C:\SpookyStudyApp\` or on USB drive)
3. Move the executable to that folder
4. Double-click to run (no installation needed)
5. Settings are stored in `data/` subfolder

**Note**: Portable version does not auto-update. Download new versions manually.

### First-Time Setup

After installation, the app will:
1. Start automatically in the background
2. Create a system tray icon (🎃)
3. Generate default configuration files
4. Wait for you to configure settings

**Next Steps**: Right-click the tray icon → "Configuration" to set up your study documents and preferences.

## Usage

### Quick Start Guide

1. **Launch the app** - It starts in the background (look for 🎃 in system tray)
2. **Open Configuration** - Right-click tray icon → "Configuration"
3. **Add study documents** - Click "Add Document" or drag & drop files
4. **Set interval** - Choose how often to be interrupted (5-120 minutes)
5. **Configure preferences** - Adjust audio, difficulty, etc.
6. **Start studying** - Close config window and let the app run!

### Configuration Options

#### ⏰ Scare Interval
Set how often the scare sequence triggers:
- **Minimum**: 5 minutes (for intense study sessions)
- **Maximum**: 120 minutes (2 hours)
- **Recommended**: 30-45 minutes for optimal learning
- **Tip**: Start with longer intervals and decrease as you build tolerance

#### 📚 Study Documents
Add documents for question generation:

**Supported Formats**:
- **PDF** (`.pdf`) - Textbooks, papers, lecture slides
- **Word** (`.docx`) - Notes, essays, study guides
- **Markdown** (`.md`) - README files, formatted notes
- **Text** (`.txt`) - Plain text notes

**How to Add**:
1. Click "Add Document" button
2. Or drag & drop files onto the drop zone
3. Files are validated automatically
4. Invalid files show error indicators

**Document Requirements**:
- Maximum file size: 50MB per document
- Must contain readable text (scanned PDFs may not work)
- Encrypted/password-protected files not supported

**Managing Documents**:
- Click ❌ to remove a document
- Documents are processed when added
- Questions are cached for performance
- Add multiple documents for variety

#### 🎯 Question Difficulty

Choose the complexity of generated questions:

- **Easy**: Simple recall and definition questions
  - "What is X?"
  - "Define Y"
  - Best for memorization
  
- **Medium** (default): Understanding and application questions
  - "How does X relate to Y?"
  - "Explain the process of Z"
  - Best for comprehension
  
- **Hard**: Analysis and synthesis questions
  - "Compare and contrast X and Y"
  - "What would happen if Z?"
  - Best for deep learning

#### 🔊 Audio Settings

Toggle jump scare sound effects:
- **Enabled**: Plays spooky sound during jump scare
- **Disabled**: Silent mode (for libraries, offices)
- **Note**: Audio files are included in installation

#### 📊 Session Statistics

Track your learning progress:
- **Questions Answered**: Total questions in this session
- **Correct Answers**: Number of correct responses
- **Accuracy**: Percentage of correct answers
- **Current Streak**: Consecutive correct answers
- **Best Streak**: Highest streak in this session
- **Session Duration**: Time since session started

**Reset Statistics**: Click "Reset Session Statistics" to start fresh

### The Scare Sequence

When the timer expires, here's what happens:

#### Stage 1: Screen Shake (3-5 seconds)
- Screen begins shaking subtly
- Intensity increases progressively
- Builds anticipation

#### Stage 2: Darkening (until click)
- Screen fades to dark overlay
- Subtle click prompt appears
- Click anywhere to continue

#### Stage 3: Tunnel Animation (2-3 seconds)
- Spooky tunnel appears
- First click: Move forward through tunnel
- Animation pauses
- Second click: Continue to jump scare

#### Stage 4: Jump Scare
- Creature appears suddenly
- ASCII art creature display
- Optional sound effect plays
- Question appears below creature

#### Stage 5: Question & Answer
- Multiple choice question displayed
- Click your answer
- Immediate feedback (correct/incorrect)
- Explanation provided
- Window closes after 3 seconds

**Escape Anytime**: Press **ESC** during any stage to cancel and return to background mode.

### System Tray Menu

Right-click the 🎃 tray icon for options:

- **Configuration**: Open settings window
- **Exit**: Close the application completely

**Note**: Closing the configuration window does NOT exit the app - it continues running in the background.

## Development

### Prerequisites

**Required**:
- **Node.js**: v16.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v7.0.0 or higher (comes with Node.js)
- **Git**: For version control ([Download](https://git-scm.com/))

**Optional**:
- **Visual Studio Code**: Recommended IDE
- **Windows SDK**: For building native modules (usually included with Node.js)

### Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/your-username/spooky-study-app.git
cd spooky-study-app
```

#### 2. Install Dependencies

```bash
npm install
```

This installs:
- Electron framework
- Document processing libraries (pdf-parse, mammoth, markdown-it)
- Build tools (electron-builder)
- Testing framework (vitest)

#### 3. Run in Development Mode

```bash
# Standard mode
npm start

# Development mode with DevTools
npm run dev
```

The app will launch with:
- Developer console enabled
- Hot reload for renderer processes
- Verbose logging
- Test data pre-loaded

#### 4. Project Structure

```
spooky-study-app/
├── src/
│   ├── main/                    # Main process (Node.js)
│   │   ├── index.js            # Entry point
│   │   ├── ConfigManager.js    # Settings management
│   │   ├── DocumentProcessor.js # Document parsing
│   │   ├── QuestionGenerator.js # Question creation
│   │   ├── TimerManager.js     # Timer logic
│   │   ├── ScareController.js  # Sequence orchestration
│   │   ├── SessionManager.js   # Statistics tracking
│   │   ├── ResourceMonitor.js  # Performance monitoring
│   │   ├── ErrorLogger.js      # Error logging
│   │   └── AutoUpdater.js      # Update management
│   ├── renderer/               # Renderer processes (UI)
│   │   ├── config/            # Configuration window
│   │   │   ├── index.html
│   │   │   ├── styles.css
│   │   │   └── renderer.js
│   │   └── scare/             # Scare sequence window
│   │       ├── index.html
│   │       ├── styles.css
│   │       ├── renderer.js
│   │       ├── tunnel.js      # Canvas animation
│   │       └── audio.js       # Sound effects
│   └── shared/                # Shared code
│       ├── constants.js       # IPC channels, config keys
│       └── types.js           # Type definitions
├── build/                     # Build resources
│   ├── icon.ico              # App icon
│   └── create-icon.js        # Icon generator
├── data/                      # Runtime data (gitignored)
│   ├── config.json
│   ├── questions.json
│   ├── session.json
│   └── app.log
├── test-data/                 # Sample documents for testing
│   ├── sample.pdf
│   ├── sample.docx
│   ├── sample.md
│   └── sample.txt
├── scripts/                   # Build and test scripts
│   ├── verify-build.js       # Pre-build verification
│   └── test-installation.js  # Post-build testing
├── dist/                      # Build output (gitignored)
├── package.json              # Dependencies and scripts
├── vitest.config.js          # Test configuration
└── README.md                 # This file
```

### Testing

#### Run All Tests

```bash
npm test
```

Runs all unit, integration, and E2E tests.

#### Watch Mode

```bash
npm run test:watch
```

Runs tests in watch mode - automatically re-runs when files change.

#### Unit Tests Only

```bash
npm run test:unit
```

Runs only unit tests (faster for development).

#### Test Coverage

Tests are located alongside source files:
- `ConfigManager.test.js` - Configuration management
- `DocumentProcessor.test.js` - Document parsing
- `QuestionGenerator.test.js` - Question generation
- `TimerManager.test.js` - Timer logic
- `ScareController.test.js` - Sequence orchestration
- `*.integration.test.js` - Integration tests
- `*.e2e.test.js` - End-to-end tests

### Building

#### Verify Build Environment

```bash
npm run verify
```

Checks:
- Node.js version
- npm version
- Required dependencies
- Build tools availability
- Runs tests

#### Build for Production

```bash
npm run build
```

Creates:
- Installer: `dist/Spooky Study App-1.0.0-x64.exe`
- Portable: `dist/Spooky Study App-1.0.0-portable.exe`

#### Build Unpacked (Testing)

```bash
npm run package
```

Creates unpacked directory in `dist/win-unpacked/` for testing without installation.

#### Test Installation

```bash
npm run test:install
```

Verifies build artifacts:
- Checks file existence
- Validates file sizes
- Tests executable launch
- Verifies installer structure

### Development Workflow

#### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# Edit files in src/

# Run tests
npm test

# Test in development mode
npm run dev
```

#### 2. Testing Changes

```bash
# Run specific test file
npx vitest src/main/MyComponent.test.js

# Run with coverage
npx vitest --coverage

# Run integration tests
npx vitest --run "*.integration.test.js"
```

#### 3. Building and Testing

```bash
# Verify everything works
npm run verify

# Build
npm run build

# Test the build
npm run test:install

# Manually test the installer
cd dist
# Run the installer
```

#### 4. Debugging

**Main Process**:
- Add `console.log()` statements
- Check `data/app.log` for errors
- Use `--inspect` flag for Node.js debugging

**Renderer Process**:
- Open DevTools (F12 in development mode)
- Use `console.log()` in renderer.js
- Inspect elements and network requests

**IPC Communication**:
- Log IPC messages in both processes
- Check `shared/constants.js` for channel names
- Verify message payloads

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Naming**: camelCase for variables, PascalCase for classes
- **Comments**: JSDoc style for functions

### Common Development Tasks

#### Add New Configuration Option

1. Update `ConfigManager.js` with new property
2. Add UI element in `renderer/config/index.html`
3. Add handler in `renderer/config/renderer.js`
4. Update IPC communication if needed
5. Add tests

#### Add New Document Format

1. Install parser library (`npm install parser-lib`)
2. Add format to `DocumentProcessor.js`
3. Implement parsing method
4. Add validation
5. Add tests with sample file

#### Modify Scare Sequence

1. Edit `renderer/scare/renderer.js` for logic
2. Edit `renderer/scare/styles.css` for styling
3. Update `ScareController.js` for orchestration
4. Test all stages
5. Add integration tests

#### Add New Question Type

1. Update `QuestionGenerator.js` with new type
2. Add rendering in `renderer/scare/renderer.js`
3. Update validation logic
4. Add tests

### Performance Profiling

```bash
# Monitor resource usage
node VERIFY_RESOURCE_OPTIMIZATION.js

# Profile with Chrome DevTools
npm run dev
# Open DevTools → Performance tab
# Record during scare sequence
```

### Troubleshooting Development Issues

#### npm install fails

```bash
# Clear cache
npm cache clean --force

# Delete node_modules and reinstall
rmdir /s /q node_modules
npm install
```

#### Electron won't start

```bash
# Rebuild native modules
npm rebuild

# Check for port conflicts
# Electron uses random ports for IPC
```

#### Tests failing

```bash
# Run tests with verbose output
npx vitest --reporter=verbose

# Run single test file
npx vitest src/main/MyComponent.test.js
```

#### Build fails

```bash
# Check build environment
npm run verify

# Clean dist folder
rmdir /s /q dist

# Rebuild
npm run build
```

See [BUILD.md](BUILD.md) for detailed build instructions and troubleshooting.

## Project Structure

```
spooky-study-app/
├── src/
│   ├── main/           # Main process (Node.js)
│   │   ├── index.js
│   │   ├── ConfigManager.js
│   │   ├── DocumentProcessor.js
│   │   ├── QuestionGenerator.js
│   │   ├── TimerManager.js
│   │   ├── ScareController.js
│   │   └── AutoUpdater.js
│   ├── renderer/       # Renderer processes (UI)
│   │   ├── config/     # Configuration window
│   │   └── scare/      # Scare sequence window
│   └── shared/         # Shared constants and types
├── build/              # Build resources (icon, etc.)
├── data/               # Runtime data (config, questions, logs)
├── scripts/            # Build and test scripts
└── test-data/          # Sample documents for testing
```

## Configuration Files

### Config Location

**Installer Version**: `%APPDATA%\spooky-study-app\`  
**Portable Version**: `data\` folder next to executable

### Configuration Files

#### config.json
Main application settings:

```json
{
  "version": "1.0.0",
  "interval": 30,
  "documents": [
    "C:\\Users\\YourName\\Documents\\biology-notes.pdf",
    "C:\\Users\\YourName\\Documents\\history-study-guide.docx"
  ],
  "audioEnabled": true,
  "difficulty": "medium",
  "lastRun": "2025-11-18T10:30:00Z"
}
```

#### questions.json
Cached questions from your documents:

```json
{
  "generated": "2025-11-18T10:00:00Z",
  "questions": [
    {
      "id": "q1",
      "text": "What is the primary function of mitochondria?",
      "type": "multiple-choice",
      "options": ["Energy production", "Protein synthesis", "DNA replication"],
      "correctAnswer": 0,
      "explanation": "Mitochondria are the powerhouse of the cell.",
      "sourceDocument": "C:\\Users\\YourName\\Documents\\biology-notes.pdf"
    }
  ],
  "usedInSession": []
}
```

#### session.json
Current session statistics:

```json
{
  "sessionStart": "2025-11-18T09:00:00Z",
  "questionsAnswered": 5,
  "correctAnswers": 4,
  "currentStreak": 2,
  "bestStreak": 3,
  "timerStarted": "2025-11-18T10:00:00Z"
}
```

#### app.log
Error and debug logs for troubleshooting

### Manual Configuration

You can edit `config.json` manually if needed:

1. Exit the application completely
2. Navigate to config directory
3. Edit `config.json` in a text editor
4. Save and restart the app

**Warning**: Invalid JSON will cause the app to reset to defaults.

## Troubleshooting

### Common Issues

#### App Won't Start

**Symptoms**: Double-clicking does nothing, no tray icon appears

**Solutions**:
1. Check Task Manager - app may already be running
   - Press `Ctrl+Shift+Esc`
   - Look for "Spooky Study App" in Processes
   - End task if found, then restart
2. Run as Administrator (right-click → "Run as administrator")
3. Check Windows Event Viewer for error logs
4. Reinstall the application

#### Tray Icon Not Visible

**Symptoms**: App is running but no tray icon

**Solutions**:
1. Check hidden icons in system tray
   - Click the up arrow (^) in system tray
   - Look for 🎃 icon
2. Windows Settings → Personalization → Taskbar
   - Select which icons appear on taskbar
   - Enable "Spooky Study App"

#### Scare Sequence Not Triggering

**Symptoms**: Timer expires but nothing happens

**Solutions**:
1. Check if documents are configured
   - Open Configuration window
   - Verify documents are listed
   - Ensure at least one valid document
2. Check app.log for errors
   - Navigate to config directory
   - Open `app.log` in text editor
   - Look for error messages
3. Verify timer is running
   - Configuration window shows session duration
   - If 0m, timer may not have started
4. Restart the application

#### Questions Not Generating

**Symptoms**: "No questions available" error

**Solutions**:
1. **Check document content**
   - Documents must contain readable text
   - Scanned PDFs without OCR won't work
   - Encrypted/password-protected files not supported
2. **Verify document format**
   - Only PDF, DOCX, MD, TXT supported
   - Check file extensions
3. **Check file size**
   - Maximum 50MB per document
   - Large files may timeout
4. **Re-add documents**
   - Remove and re-add problematic documents
   - Check for error indicators
5. **Delete questions cache**
   - Close app
   - Delete `questions.json`
   - Restart app to regenerate

#### Document Processing Errors

**Symptoms**: Red error indicator on document, "Failed to process" message

**Solutions**:
1. **File not found**
   - Document may have been moved/deleted
   - Update path or remove document
2. **Corrupted file**
   - Try opening file in native app (Adobe Reader, Word)
   - If corrupted, remove from app
3. **Unsupported format**
   - Verify file extension
   - Convert to supported format
4. **Permission issues**
   - Ensure app has read access to file
   - Move file to accessible location

#### Audio Not Playing

**Symptoms**: No sound during jump scare

**Solutions**:
1. Check audio toggle in Configuration
   - Ensure "Audio Enabled" is ON
2. Check system volume
   - Ensure Windows volume is not muted
   - Check app volume in Volume Mixer
3. Check audio files
   - Audio files should be in installation directory
   - Reinstall if missing

#### High CPU/Memory Usage

**Symptoms**: App using >5% CPU or >100MB RAM during idle

**Solutions**:
1. Check number of documents
   - Too many large documents may cause issues
   - Limit to 5-10 documents
2. Check document sizes
   - Remove very large files (>50MB)
3. Clear question cache
   - Delete `questions.json`
   - Restart app
4. Restart the application
5. Report issue with logs

#### Configuration Not Saving

**Symptoms**: Settings reset after restart

**Solutions**:
1. Check file permissions
   - Ensure write access to config directory
   - Run as Administrator if needed
2. Check disk space
   - Ensure sufficient space for config files
3. Check for file locks
   - Close other apps that might lock files
4. Manually verify config.json
   - Check if file exists and is writable

#### ESC Key Not Working

**Symptoms**: Can't cancel scare sequence with ESC

**Solutions**:
1. Try clicking outside the window
2. Press ESC multiple times
3. Alt+F4 to force close window
4. Restart application if stuck

### Performance Issues

#### Slow Document Processing

**Solutions**:
- Reduce number of documents
- Use smaller files
- Close other resource-intensive apps
- Check CPU usage in Task Manager

#### Laggy Animations

**Solutions**:
- Update graphics drivers
- Close other apps
- Reduce screen resolution temporarily
- Check GPU usage

### Getting Help

If you're still experiencing issues:

1. **Check Logs**
   - Location: `%APPDATA%\spooky-study-app\app.log`
   - Contains error messages and debug info

2. **Gather Information**
   - Windows version
   - App version
   - Error messages from logs
   - Steps to reproduce

3. **Report Issue**
   - Open GitHub issue
   - Include log excerpts
   - Describe problem clearly
   - Attach screenshots if relevant

4. **Community Support**
   - Check existing GitHub issues
   - Search for similar problems
   - Ask in discussions

### Uninstallation

#### Installer Version

1. Windows Settings → Apps → Apps & features
2. Find "Spooky Study App"
3. Click → Uninstall
4. Follow uninstaller prompts
5. Choose whether to delete app data

**Note**: Uninstaller can optionally remove all settings and data.

#### Portable Version

1. Close the application
2. Delete the executable and `data/` folder
3. No registry entries or system files to clean

### Reset to Defaults

To completely reset the app:

1. Exit the application
2. Navigate to config directory
3. Delete all files (`config.json`, `questions.json`, `session.json`)
4. Restart the app
5. Reconfigure from scratch

## Documentation

- [BUILD.md](BUILD.md) - Build and distribution guide
- [MANUAL_TEST_INSTALLATION.md](MANUAL_TEST_INSTALLATION.md) - Installation testing procedures
- [.kiro/specs/spooky-study-app/](/.kiro/specs/spooky-study-app/) - Complete specification documents
  - [requirements.md](/.kiro/specs/spooky-study-app/requirements.md) - Detailed requirements
  - [design.md](/.kiro/specs/spooky-study-app/design.md) - Technical architecture
  - [tasks.md](/.kiro/specs/spooky-study-app/tasks.md) - Implementation plan

## Screenshots

### Configuration Window
![Configuration Window](docs/screenshots/config-window.png)
*Configure interval, documents, audio, difficulty, and view session statistics*

### Scare Sequence Stages

#### Stage 1: Screen Shake
![Screen Shake](docs/screenshots/shake.png)
*Progressive screen shake builds anticipation*

#### Stage 2: Darkening
![Darkening](docs/screenshots/darken.png)
*Screen darkens with click prompt*

#### Stage 3: Tunnel Animation
![Tunnel](docs/screenshots/tunnel.png)
*Spooky tunnel animation with Halloween colors*

#### Stage 4: Jump Scare & Question
![Jump Scare](docs/screenshots/jumpscare.png)
*ASCII art creature with educational question*

#### Stage 5: Answer Feedback
![Feedback](docs/screenshots/feedback.png)
*Immediate feedback with explanation*

### System Tray
![System Tray](docs/screenshots/tray.png)
*Minimal system tray presence*

**Note**: Screenshots are illustrative. Actual appearance may vary.

## Contributing

This is a hackathon project, but contributions are welcome!

### How to Contribute

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/your-username/spooky-study-app.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow code style guidelines
   - Add comments for complex logic
   - Update documentation if needed

4. **Add tests**
   - Write unit tests for new functions
   - Add integration tests for features
   - Ensure all tests pass: `npm test`

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add amazing feature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Submit a pull request**
   - Describe your changes
   - Reference any related issues
   - Wait for review

### Contribution Guidelines

- **Code Quality**: Follow existing code style
- **Testing**: All new code must have tests
- **Documentation**: Update README and comments
- **Commits**: Use clear, descriptive commit messages
- **Issues**: Check existing issues before creating new ones

### Areas for Contribution

- 🐛 **Bug Fixes**: Fix reported issues
- ✨ **Features**: Add new functionality
- 📝 **Documentation**: Improve guides and comments
- 🎨 **UI/UX**: Enhance visual design
- 🧪 **Testing**: Add more test coverage
- 🌍 **Localization**: Add language support
- 🎵 **Audio**: Add more sound effects
- 🎃 **Creatures**: Design new ASCII art creatures

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Keep discussions on-topic

## License

MIT License - See [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Created for the [Kiloween Hackathon](https://kiloween.dev/)
- Inspired by the need to make procrastination productive

## Frequently Asked Questions (FAQ)

### General Questions

**Q: Is this app safe to use?**  
A: Yes! The app is open source, runs locally, and doesn't send any data over the network. All your documents and settings stay on your computer.

**Q: Does it work on Mac or Linux?**  
A: Currently Windows only. Mac and Linux support is planned for future releases.

**Q: Can I use this for work/professional studying?**  
A: Absolutely! While Halloween-themed, it's a legitimate study tool. You can disable audio for professional environments.

**Q: Will this interrupt important work?**  
A: Press ESC anytime to cancel the sequence. Consider using longer intervals (60+ minutes) or pausing the app during critical work.

**Q: How much does it cost?**  
A: It's completely free and open source under the MIT license.

### Technical Questions

**Q: What happens to my documents?**  
A: Documents are read locally and never uploaded anywhere. Text is extracted and cached locally for question generation.

**Q: How are questions generated?**  
A: The app uses keyword extraction and natural language processing to identify key concepts and create questions from your documents.

**Q: Can I use scanned PDFs?**  
A: Only if they have OCR (text layer). Pure image PDFs won't work.

**Q: How many documents can I add?**  
A: No hard limit, but 5-10 documents is recommended for best performance.

**Q: Does it work offline?**  
A: Yes! Everything runs locally. Internet is only needed for auto-updates.

**Q: Can I customize the creatures?**  
A: Not currently through the UI, but you can modify the ASCII art in the source code.

### Privacy & Security

**Q: What data is collected?**  
A: None. No analytics, no telemetry, no data collection. Everything stays local.

**Q: Can others see my study materials?**  
A: No. Documents and questions are stored locally on your computer only.

**Q: Is my progress tracked online?**  
A: No. Session statistics are stored locally and reset when you close the app.

### Usage Questions

**Q: Can I pause the timer?**  
A: Not currently. You can exit the app to stop it completely, or set a very long interval.

**Q: What if I run out of questions?**  
A: Questions are reused after all have been shown once. Add more documents for more variety.

**Q: Can I review past questions?**  
A: Not currently. This feature may be added in future versions.

**Q: Can I export my statistics?**  
A: Not currently, but session data is stored in `session.json` which you can read manually.

## Support

### Getting Help

**Documentation**:
- Read this README thoroughly
- Check [BUILD.md](BUILD.md) for build issues
- Review [Troubleshooting](#troubleshooting) section above
- Read specification docs in `.kiro/specs/`

**GitHub Issues**:
- Search [existing issues](https://github.com/your-username/spooky-study-app/issues)
- Open a [new issue](https://github.com/your-username/spooky-study-app/issues/new) if needed
- Provide logs from `app.log`
- Include steps to reproduce

**Discussions**:
- Ask questions in [GitHub Discussions](https://github.com/your-username/spooky-study-app/discussions)
- Share tips and tricks
- Request features
- Help other users

### Reporting Bugs

When reporting bugs, please include:

1. **System Information**
   - Windows version
   - App version
   - Installation method (installer/portable)

2. **Description**
   - What you expected to happen
   - What actually happened
   - Steps to reproduce

3. **Logs**
   - Relevant excerpts from `app.log`
   - Error messages
   - Screenshots if applicable

4. **Configuration**
   - Number of documents
   - Document formats
   - Settings (interval, difficulty, etc.)

### Feature Requests

Have an idea? We'd love to hear it!

1. Check if it's already requested
2. Open a GitHub issue with "Feature Request" label
3. Describe the feature and use case
4. Explain why it would be valuable

### Security Issues

Found a security vulnerability?

- **DO NOT** open a public issue
- Email security concerns privately
- Allow time for a fix before disclosure

## Roadmap

### Planned Features

- 🍎 **macOS Support**: Native Mac application
- 🐧 **Linux Support**: Linux compatibility
- 🌍 **Localization**: Multiple language support
- 🎨 **Themes**: More visual themes beyond Halloween
- 📊 **Advanced Statistics**: Detailed progress tracking
- 🔄 **Question Review**: Review past questions
- ⏸️ **Pause Timer**: Temporarily pause without exiting
- 🎯 **Custom Questions**: Add your own questions
- 🤖 **AI Integration**: Optional LLM for better questions
- 📱 **Mobile Companion**: View stats on mobile

### Version History

**v1.0.0** (Current)
- Initial release
- Core scare sequence
- Document processing (PDF, DOCX, MD, TXT)
- Question generation
- Session statistics
- Auto-updates
- Windows support

## License

MIT License - See [LICENSE](LICENSE) file for details.

This means you can:
- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Use privately

You must:
- 📄 Include license and copyright notice

You cannot:
- ❌ Hold liable

## Acknowledgments

### Built With

- [Electron](https://www.electronjs.org/) - Desktop app framework
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF text extraction
- [mammoth](https://www.npmjs.com/package/mammoth) - DOCX parsing
- [markdown-it](https://www.npmjs.com/package/markdown-it) - Markdown rendering
- [electron-builder](https://www.electron.build/) - Application packaging
- [Vitest](https://vitest.dev/) - Testing framework

### Inspiration

- Created for the [Kiloween Hackathon](https://kiloween.dev/)
- Inspired by the need to make procrastination productive
- Halloween theme for fun and engagement

### Special Thanks

- Kiloween organizers for the hackathon
- Electron community for excellent documentation
- Open source contributors of all dependencies
- Beta testers and early users

## Contact

- **GitHub**: [your-username/spooky-study-app](https://github.com/your-username/spooky-study-app)
- **Issues**: [Report a bug](https://github.com/your-username/spooky-study-app/issues)
- **Discussions**: [Ask questions](https://github.com/your-username/spooky-study-app/discussions)

---

Made with 🎃 for Kiloween 2025

**Happy Studying! 📚👻**
