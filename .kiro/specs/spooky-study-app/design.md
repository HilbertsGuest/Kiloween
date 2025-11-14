# Design Document

## Overview

The Spooky Study App is a cross-platform desktop application built with Electron that runs in the background and periodically interrupts users with a Halloween-themed scare sequence followed by educational questions. The application consists of a background process that manages timing, a configuration interface for settings management, a full-screen overlay for the scare sequence, and a document processing engine that generates questions from user-provided study materials.

### Technology Stack

- **Framework**: Electron (for cross-platform desktop app with system tray support)
- **Frontend**: HTML5, CSS3, JavaScript (for UI and animations)
- **Backend**: Node.js (for document processing and background tasks)
- **Document Processing**: pdf-parse (PDF), mammoth (DOCX), markdown-it (MD)
- **Storage**: JSON file-based configuration and question cache
- **AI/NLP**: Simple keyword extraction and question generation algorithms (or optional integration with local LLM)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Timer      │  │  Document    │  │  Question    │   │
│  │  Manager     │  │  Processor   │  │  Generator   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│        │                  │                  │          │
│        └──────────────────┴──────────────────┘          │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│  System Tray   │  │  Config Window │  │ Scare Window│
│   (Renderer)   │  │   (Renderer)   │  │  (Renderer) │
└────────────────┘  └────────────────┘  └─────────────┘
```

### Process Architecture

1. **Main Process**: Manages application lifecycle, timer, document processing, and IPC communication
2. **System Tray**: Provides quick access to configuration and exit options
3. **Configuration Window**: Hidden window for settings management
4. **Scare Window**: Full-screen transparent overlay for the scare sequence

## Components and Interfaces

### 1. Main Process Components

#### TimerManager
Manages the countdown timer and triggers scare sequences.

```javascript
class TimerManager {
  constructor(configManager, scareController)
  
  // Start the timer with configured interval
  start(): void
  
  // Stop the timer
  stop(): void
  
  // Reset timer to configured interval
  reset(): void
  
  // Get remaining time
  getRemainingTime(): number
  
  // Event: onTimerExpired
}
```

#### DocumentProcessor
Handles reading and parsing various document formats.

```javascript
class DocumentProcessor {
  constructor(configManager)
  
  // Process a document and extract text content
  processDocument(filePath: string): Promise<DocumentContent>
  
  // Process all configured documents
  processAllDocuments(): Promise<DocumentContent[]>
  
  // Validate document format
  validateDocument(filePath: string): boolean
  
  // Get supported formats
  getSupportedFormats(): string[]
}

interface DocumentContent {
  filePath: string
  content: string
  metadata: {
    title: string
    pageCount?: number
    wordCount: number
  }
}
```

#### QuestionGenerator
Generates educational questions from processed documents.

```javascript
class QuestionGenerator {
  constructor(documentProcessor)
  
  // Generate questions from documents
  generateQuestions(documents: DocumentContent[]): Question[]
  
  // Get a random unused question
  getNextQuestion(): Question
  
  // Mark question as used
  markQuestionUsed(questionId: string): void
  
  // Reset used questions
  resetSession(): void
}

interface Question {
  id: string
  text: string
  type: 'multiple-choice' | 'text'
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  sourceDocument: string
}
```

#### ConfigManager
Manages application configuration and persistence.

```javascript
class ConfigManager {
  constructor(configPath: string)
  
  // Load configuration from disk
  load(): Promise<Config>
  
  // Save configuration to disk
  save(config: Config): Promise<void>
  
  // Get specific config value
  get(key: string): any
  
  // Set specific config value
  set(key: string, value: any): void
}

interface Config {
  interval: number // minutes
  documents: string[]
  audioEnabled: boolean
  difficulty: 'easy' | 'medium' | 'hard'
  theme: 'halloween' | 'dark'
}
```

#### ScareController
Orchestrates the scare sequence and question presentation.

```javascript
class ScareController {
  constructor(questionGenerator)
  
  // Start the scare sequence
  startSequence(): void
  
  // Handle user interaction during sequence
  handleClick(stage: number): void
  
  // Show question after scare
  showQuestion(question: Question): void
  
  // Validate user answer
  validateAnswer(answer: string): boolean
  
  // End sequence and return to background
  endSequence(): void
}
```

### 2. Renderer Process Components

#### Scare Window (Full-Screen Overlay)

**Stages:**
1. **Screen Shake**: Progressive shake effect using CSS transforms
2. **Darkening**: Fade-in dark overlay with click prompt
3. **Tunnel Animation**: Canvas-based tunnel with forward movement
4. **Jump Scare**: Full-screen creature with question overlay
5. **Question Interface**: Interactive question with answer validation

**HTML Structure:**
```html
<div id="scare-container">
  <div id="shake-layer"></div>
  <div id="dark-overlay"></div>
  <canvas id="tunnel-canvas"></canvas>
  <div id="jumpscare-layer">
    <div id="creature-ascii"></div>
    <div id="question-container"></div>
  </div>
</div>
```

#### Configuration Window

**Sections:**
- Interval Settings (slider with minute display)
- Document Management (file picker, list of added documents)
- Audio Settings (toggle)
- Difficulty Settings (dropdown)
- Theme Selection (dropdown)

### 3. IPC Communication

**Main → Renderer:**
- `start-scare-sequence`: Trigger scare window
- `show-question`: Display question after scare
- `config-updated`: Notify of configuration changes
- `answer-feedback`: Provide answer validation result

**Renderer → Main:**
- `scare-stage-complete`: Notify stage completion
- `answer-submitted`: Send user's answer
- `config-change`: Update configuration
- `add-document`: Add new document path
- `remove-document`: Remove document path

## Data Models

### Configuration File (config.json)
```json
{
  "version": "1.0.0",
  "interval": 30,
  "documents": [
    "/path/to/study/material1.pdf",
    "/path/to/notes.md"
  ],
  "audioEnabled": true,
  "difficulty": "medium",
  "theme": "halloween",
  "lastRun": "2025-11-14T10:30:00Z"
}
```

### Question Cache (questions.json)
```json
{
  "generated": "2025-11-14T10:00:00Z",
  "questions": [
    {
      "id": "q1",
      "text": "What is the primary function of mitochondria?",
      "type": "multiple-choice",
      "options": [
        "Energy production",
        "Protein synthesis",
        "DNA replication",
        "Cell division"
      ],
      "correctAnswer": 0,
      "explanation": "Mitochondria are the powerhouse of the cell.",
      "sourceDocument": "/path/to/biology.pdf"
    }
  ],
  "usedInSession": ["q1"]
}
```

### Session State (session.json)
```json
{
  "sessionStart": "2025-11-14T09:00:00Z",
  "questionsAnswered": 5,
  "correctAnswers": 3,
  "currentStreak": 2,
  "timerStarted": "2025-11-14T10:00:00Z"
}
```

## Error Handling

### Document Processing Errors
- **File Not Found**: Log error, remove from config, notify user in config UI
- **Unsupported Format**: Validate before adding, show error message
- **Parse Error**: Skip document, log error, continue with other documents
- **Empty Document**: Warn user, allow but don't generate questions

### Question Generation Errors
- **No Documents**: Show warning in config UI, disable timer
- **Insufficient Content**: Generate simpler questions or use fallback questions
- **Generation Failure**: Use cached questions from previous session

### Runtime Errors
- **Timer Failure**: Restart timer, log error
- **Window Creation Failure**: Retry once, then show notification
- **IPC Communication Failure**: Implement timeout and retry logic
- **Config Save Failure**: Keep in-memory config, retry on next change

### User Experience Errors
- **Escape During Scare**: Allow graceful exit, reset timer
- **Window Focus Loss**: Pause sequence, resume on focus
- **Multiple Instances**: Prevent multiple instances using lock file

## Testing Strategy

### Unit Tests

1. **DocumentProcessor Tests**
   - Test PDF parsing with sample files
   - Test DOCX parsing with sample files
   - Test Markdown parsing
   - Test error handling for corrupted files
   - Test format validation

2. **QuestionGenerator Tests**
   - Test question generation from sample content
   - Test question uniqueness in session
   - Test difficulty levels
   - Test answer validation

3. **ConfigManager Tests**
   - Test config loading and saving
   - Test default config creation
   - Test config validation
   - Test migration from old versions

4. **TimerManager Tests**
   - Test timer start/stop/reset
   - Test interval changes
   - Test timer expiration events

### Integration Tests

1. **Document to Question Flow**
   - Add document → Process → Generate questions → Verify quality

2. **Scare Sequence Flow**
   - Timer expires → Shake → Darken → Tunnel → Scare → Question → Answer

3. **Configuration Flow**
   - Change settings → Save → Restart → Verify persistence

### End-to-End Tests

1. **Full Application Flow**
   - Launch app → Configure documents → Wait for timer → Complete scare sequence → Answer question → Return to background

2. **Error Recovery**
   - Simulate document deletion during runtime
   - Simulate config corruption
   - Test recovery mechanisms

### Manual Testing

1. **Visual Effects**
   - Verify shake effect smoothness
   - Verify tunnel animation quality
   - Verify jump scare timing and impact

2. **User Experience**
   - Test configuration UI usability
   - Test system tray interactions
   - Test escape/cancel functionality

3. **Cross-Platform**
   - Test on Windows
   - Test on macOS
   - Test on Linux

## Implementation Phases

### Phase 1: Core Infrastructure
- Set up Electron project structure
- Implement ConfigManager
- Implement system tray with basic menu
- Create configuration window UI

### Phase 2: Document Processing
- Implement DocumentProcessor for all formats
- Add file validation
- Create document management UI
- Implement error handling

### Phase 3: Question Generation
- Implement basic QuestionGenerator
- Create question cache system
- Implement session management
- Add question validation

### Phase 4: Scare Sequence
- Implement TimerManager
- Create scare window with all stages
- Implement screen shake effect
- Implement tunnel animation
- Create jump scare display

### Phase 5: Question Interface
- Implement question display UI
- Add answer validation
- Implement feedback system
- Add scoring/statistics

### Phase 6: Polish and Testing
- Add audio effects
- Improve animations
- Comprehensive testing
- Bug fixes and optimization

## Security Considerations

1. **File Access**: Validate all file paths to prevent directory traversal
2. **User Input**: Sanitize all user input in configuration
3. **IPC Security**: Validate all IPC messages
4. **Resource Limits**: Limit document size and processing time
5. **Data Privacy**: Keep all data local, no external network calls

## Performance Considerations

1. **Document Processing**: Process documents asynchronously on background thread
2. **Question Caching**: Cache generated questions to avoid reprocessing
3. **Memory Management**: Limit number of cached questions
4. **Animation Performance**: Use CSS transforms and requestAnimationFrame for smooth animations
5. **Startup Time**: Lazy load document processing until first timer expiration
