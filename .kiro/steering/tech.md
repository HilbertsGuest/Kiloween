# Technology Stack

## Framework & Runtime

- **Electron**: Cross-platform desktop application framework
- **Node.js**: Backend runtime for document processing and background tasks
- **HTML5/CSS3/JavaScript**: Frontend UI and animations

## Key Dependencies

### Document Processing
- `pdf-parse`: PDF text extraction
- `mammoth`: DOCX document parsing
- `markdown-it`: Markdown rendering and parsing

### Build & Distribution
- `electron-builder`: Application packaging and installer creation

## Project Structure

```
src/
├── main/           # Main process (Node.js)
│   ├── ConfigManager
│   ├── DocumentProcessor
│   ├── QuestionGenerator
│   ├── TimerManager
│   └── ScareController
├── renderer/       # Renderer processes (UI)
│   ├── config/     # Configuration window
│   └── scare/      # Scare sequence window
└── shared/         # Shared types and constants
```

## Common Commands

### Development
```bash
npm install              # Install dependencies
npm start               # Run app in development mode
npm run dev             # Run with hot reload
```

### Testing
```bash
npm test                # Run all tests
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests
```

### Building
```bash
npm run build           # Build for production
npm run package         # Create distributable package
npm run dist            # Create installer
```

## Architecture Patterns

- **IPC Communication**: Main process ↔ Renderer processes via Electron IPC
- **Event-Driven**: Timer expiration triggers scare sequence
- **File-Based Storage**: JSON files for config, questions cache, and session state
- **Async Processing**: Document processing on background threads
- **Error Handling**: Graceful degradation with fallback mechanisms

## Performance Requirements

- CPU usage < 5% during idle
- Memory usage < 100MB
- Smooth animations (60fps) during scare sequence
- Document processing: async, non-blocking

## Platform Support

Primary target: Windows (cmd shell)
Future: macOS, Linux
