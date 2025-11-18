# Build Resources

This directory contains resources needed for building the application installer.

## Icon File

The application requires an `icon.ico` file for Windows builds. 

### Current Status

- `icon.svg` - Source SVG icon design (spooky book with eyes)
- `icon-placeholder.txt` - Instructions for creating the icon
- `create-icon.js` - Helper script with icon creation guidance

### Creating the Icon

Since .ico files require multiple resolutions, you need to convert the SVG to ICO format:

#### Option 1: Online Converter (Easiest)
1. Open `icon.svg` in a browser or image editor
2. Export/save as PNG at 256x256 pixels
3. Visit https://icoconvert.com or https://cloudconvert.com
4. Upload the PNG and convert to ICO (with multiple sizes)
5. Download and save as `build/icon.ico`

#### Option 2: ImageMagick (Command Line)
```bash
# First convert SVG to PNG
convert icon.svg -resize 256x256 icon.png

# Then create ICO with multiple sizes
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

#### Option 3: Inkscape (Free Software)
```bash
inkscape icon.svg --export-type=png --export-width=256 --export-filename=icon.png
# Then use online converter or ImageMagick for ICO
```

### Testing Without Icon

For testing the build process without a proper icon, you can temporarily modify `package.json`:

```json
"win": {
  "target": "nsis",
  // Comment out or remove the icon line:
  // "icon": "build/icon.ico"
}
```

However, the final production build should include a proper icon.

## Build Configuration

The `package.json` file contains the electron-builder configuration for:
- NSIS installer (standard Windows installer)
- Portable executable (no installation required)
- Auto-updater setup (GitHub releases)

See the main README.md for build instructions.
