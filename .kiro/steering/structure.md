# Project Structure

## Root Directory

- `README.md`: Project overview and hackathon entry information
- `LICENSE`: MIT License
- `.gitattributes`: Git configuration for line endings
- `.kiro/`: Kiro IDE configuration and specifications

## Kiro Directory (.kiro/)

### specs/spooky-study-app/
Contains the complete specification for the Spooky Study App:
- `requirements.md`: Detailed user stories and acceptance criteria (12 requirements)
- `design.md`: Technical architecture, component interfaces, data models, and implementation phases
- `tasks.md`: 40-task implementation plan with dependencies and requirement mappings

### steering/
AI assistant guidance documents (this directory):
- `product.md`: Product overview and key features
- `tech.md`: Technology stack and common commands
- `structure.md`: Project organization (this file)

## Planned Source Structure

When implementation begins, the project will follow this structure:

```
src/
├── main/
│   ├── index.js              # Main process entry point
│   ├── ConfigManager.js      # Settings persistence
│   ├── DocumentProcessor.js  # Document parsing
│   ├── QuestionGenerator.js  # Question creation
│   ├── TimerManager.js       # Interval timing
│   └── ScareController.js    # Sequence orchestration
├── renderer/
│   ├── config/
│   │   ├── index.html        # Configuration UI
│   │   ├── styles.css        # Config styling
│   │   └── renderer.js       # Config logic
│   └── scare/
│       ├── index.html        # Scare sequence UI
│       ├── styles.css        # Scare styling
│       ├── renderer.js       # Scare logic
│       └── tunnel.js         # Canvas animation
└── shared/
    ├── constants.js          # IPC channels, config keys
    └── types.js              # Shared interfaces
```

## Data Files (Runtime)

Created at runtime in user data directory:
- `config.json`: User settings and document paths
- `questions.json`: Generated questions cache
- `session.json`: Current session statistics
- `app.log`: Error and debug logs

## Key Organizational Principles

1. **Separation of Concerns**: Main process handles business logic, renderers handle UI
2. **Modular Components**: Each class has single responsibility
3. **Shared Constants**: IPC channels and config keys centralized
4. **Test Colocation**: Tests live alongside source files
5. **Spec-Driven**: Implementation follows detailed spec documents in .kiro/specs/
