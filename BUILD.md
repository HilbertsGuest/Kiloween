# Build and Distribution Guide

This document explains how to build and distribute the Spooky Study App for Windows.

## Prerequisites

### Required Software

1. **Node.js** (v16 or higher)
   - Download from https://nodejs.org/

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Git** (for version control)
   - Download from https://git-scm.com/

### Optional Tools

- **ImageMagick** or **Inkscape** (for icon conversion)
- **NSIS** (automatically downloaded by electron-builder)

## Initial Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd spooky-study-app
```

2. Install dependencies:
```bash
npm install
```

3. Create the application icon:
   - See `build/README.md` for icon creation instructions
   - The icon must be placed at `build/icon.ico`

## Development Build

Run the app in development mode:

```bash
npm start
```

Or with hot reload:

```bash
npm run dev
```

## Testing

Run all tests before building:

```bash
npm test
```

Run specific test suites:

```bash
npm run test:unit
npm run test:integration
```

## Production Build

### Step 1: Prepare for Build

1. Ensure all tests pass:
```bash
npm test
```

2. Verify the icon exists:
```bash
dir build\icon.ico
```

3. Update version in `package.json` if needed:
```json
{
  "version": "1.0.0"
}
```

### Step 2: Build the Application

#### Build for Windows (NSIS Installer + Portable)

```bash
npm run build
```

This creates:
- `dist/Spooky Study App-1.0.0-x64.exe` - NSIS installer
- `dist/Spooky Study App-1.0.0-portable.exe` - Portable executable

#### Build Directory Only (for testing)

```bash
npm run package
```

This creates an unpacked directory in `dist/win-unpacked/` without creating installers.

### Step 3: Test the Build

1. **Test the installer:**
   - Run `dist/Spooky Study App-1.0.0-x64.exe`
   - Follow installation wizard
   - Verify app launches from Start Menu
   - Test all features
   - Uninstall and verify cleanup

2. **Test the portable version:**
   - Run `dist/Spooky Study App-1.0.0-portable.exe`
   - Verify app runs without installation
   - Test all features

## Build Configuration

The build is configured in `package.json` under the `build` section:

```json
{
  "build": {
    "appId": "com.spookystudy.app",
    "productName": "Spooky Study App",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    }
  }
}
```

### Key Configuration Options

- **appId**: Unique identifier for the app
- **productName**: Display name shown to users
- **target**: Build types (nsis, portable, zip, etc.)
- **icon**: Path to application icon
- **oneClick**: If false, shows installation wizard
- **allowToChangeInstallationDirectory**: Let users choose install location

## Distribution

### GitHub Releases

1. Create a new release on GitHub:
   - Tag: `v1.0.0`
   - Title: `Spooky Study App v1.0.0`
   - Description: Release notes

2. Upload build artifacts:
   - `Spooky Study App-1.0.0-x64.exe` (installer)
   - `Spooky Study App-1.0.0-portable.exe` (portable)
   - `latest.yml` (for auto-updater)

3. Publish the release

### Auto-Updates

The app includes auto-update functionality via `electron-updater`:

- Checks for updates on startup (after 10 seconds)
- Checks periodically every 4 hours
- Downloads updates from GitHub releases
- Prompts user to install updates

To enable auto-updates:

1. Configure GitHub repository in `package.json`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "spooky-study-app"
    }
  }
}
```

2. Generate a GitHub token with `repo` scope
3. Set environment variable: `GH_TOKEN=your_token`
4. Build and publish: `npm run build -- --publish always`

## Troubleshooting

### Icon Not Found

**Error:** `Cannot find icon at build/icon.ico`

**Solution:**
1. Create the icon following `build/README.md` instructions
2. Or temporarily remove icon from `package.json` for testing

### Build Fails on Windows

**Error:** `NSIS error` or `electron-builder error`

**Solution:**
1. Run as Administrator
2. Disable antivirus temporarily
3. Clear build cache: `rmdir /s /q dist node_modules`
4. Reinstall: `npm install`

### App Won't Start After Build

**Error:** App crashes on launch

**Solution:**
1. Check `%APPDATA%\spooky-study-app\app.log` for errors
2. Verify all dependencies are in `dependencies` (not `devDependencies`)
3. Test with `npm run package` first

### Auto-Updater Not Working

**Error:** Updates not detected

**Solution:**
1. Verify app is packaged (`app.isPackaged === true`)
2. Check GitHub release has `latest.yml` file
3. Verify `publish` configuration in `package.json`
4. Check console logs for update errors

## File Sizes

Expected build sizes:

- Installer: ~150-200 MB
- Portable: ~150-200 MB
- Unpacked: ~200-250 MB

The size includes:
- Electron runtime (~100 MB)
- Node.js modules
- Application code
- Chromium browser engine

## Code Signing (Optional)

For production releases, consider code signing:

1. Obtain a code signing certificate
2. Configure in `package.json`:
```json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```

3. Or use environment variables:
```bash
set CSC_LINK=path\to\cert.pfx
set CSC_KEY_PASSWORD=password
npm run build
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Support

For build issues:
- Check electron-builder docs: https://www.electron.build/
- Check Electron docs: https://www.electronjs.org/docs/latest/
- Open an issue on GitHub

## License

MIT License - See LICENSE file for details
