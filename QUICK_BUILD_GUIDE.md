# Quick Build Guide

Fast reference for building the Spooky Study App.

## Prerequisites

- Node.js v16+
- npm
- Git

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Verify build environment
npm run verify

# 3. Build the application
npm run build
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run verify` | Check build prerequisites |
| `npm run build` | Build installer + portable exe |
| `npm run package` | Build unpacked directory only |
| `npm run test:install` | Verify build artifacts |

## Build Outputs

After `npm run build`:

```
dist/
├── Spooky Study App-1.0.0-x64.exe      # Installer
├── Spooky Study App-1.0.0-portable.exe # Portable
└── latest.yml                           # Auto-update metadata
```

## Common Issues

### Icon Missing
**Error**: `build/icon.ico not found`

**Fix**: Icon placeholder exists for testing. For production:
1. See `build/README.md` for icon creation
2. Or temporarily remove icon from `package.json`

### electron-updater Not Installed
**Error**: `Cannot find module 'electron-updater'`

**Fix**:
```bash
npm install
```

### Build Fails
**Error**: Various build errors

**Fix**:
1. Run `npm run verify` to diagnose
2. Check `BUILD.md` for detailed troubleshooting
3. Ensure all tests pass: `npm test`

## Testing

### Before Building
```bash
npm test
```

### After Building
```bash
npm run test:install
```

### Manual Testing
See `MANUAL_TEST_INSTALLATION.md` for detailed procedures.

## Distribution

### GitHub Releases
1. Create release: `v1.0.0`
2. Upload files from `dist/`:
   - `Spooky Study App-1.0.0-x64.exe`
   - `Spooky Study App-1.0.0-portable.exe`
   - `latest.yml`
3. Add release notes
4. Publish

### Auto-Updates
Auto-updates work automatically once published to GitHub releases.

## More Information

- **Detailed Build Guide**: `BUILD.md`
- **Installation Testing**: `MANUAL_TEST_INSTALLATION.md`
- **Icon Creation**: `build/README.md`
- **Implementation Details**: `TASK_39_SUMMARY.md`

## Quick Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Tests passing (`npm test`)
- [ ] Build verified (`npm run verify`)
- [ ] Application built (`npm run build`)
- [ ] Artifacts tested (`npm run test:install`)
- [ ] Manual testing completed
- [ ] Ready for distribution

---

**Need Help?** See `BUILD.md` for comprehensive documentation.
