/**
 * Automated Installation Testing Script
 * 
 * This script performs automated checks on the built installer
 * to verify it's ready for distribution.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('Installation Package Testing');
console.log('='.repeat(60));
console.log();

let hasErrors = false;
let hasWarnings = false;

/**
 * Check if file exists and get its size
 */
function checkBuildArtifact(filePath, expectedMinSize = 0) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`✗ ${filePath}: NOT FOUND`);
    hasErrors = true;
    return false;
  }
  
  const stats = fs.statSync(fullPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  if (stats.size < expectedMinSize) {
    console.log(`⚠ ${filePath}: ${sizeMB} MB (smaller than expected)`);
    hasWarnings = true;
  } else {
    console.log(`✓ ${filePath}: ${sizeMB} MB`);
  }
  
  return true;
}

/**
 * Check dist directory structure
 */
function checkDistDirectory() {
  console.log('Checking dist directory...\n');
  
  const distPath = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('✗ dist/ directory not found');
    console.log('  Run: npm run build');
    hasErrors = true;
    return false;
  }
  
  console.log('✓ dist/ directory exists\n');
  
  // Check for build artifacts
  const pkg = require('../package.json');
  const version = pkg.version;
  const productName = pkg.build.productName;
  
  console.log('Checking build artifacts:\n');
  
  // NSIS installer
  const installerName = `${productName}-${version}-x64.exe`;
  checkBuildArtifact(`dist/${installerName}`, 100 * 1024 * 1024); // Min 100 MB
  
  // Portable executable
  const portableName = `${productName}-${version}-portable.exe`;
  checkBuildArtifact(`dist/${portableName}`, 100 * 1024 * 1024); // Min 100 MB
  
  // Update metadata
  checkBuildArtifact('dist/latest.yml', 100); // Min 100 bytes
  
  // Check unpacked directory (if exists)
  const unpackedPath = path.join(distPath, 'win-unpacked');
  if (fs.existsSync(unpackedPath)) {
    console.log('\n✓ Unpacked directory exists (win-unpacked/)');
    
    // Check critical files in unpacked
    const criticalFiles = [
      `${productName}.exe`,
      'resources/app.asar',
      'locales'
    ];
    
    console.log('\nChecking unpacked files:');
    for (const file of criticalFiles) {
      const filePath = path.join(unpackedPath, file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✓ ${file}`);
      } else {
        console.log(`  ✗ ${file}: MISSING`);
        hasErrors = true;
      }
    }
  }
  
  return !hasErrors;
}

/**
 * Verify installer metadata
 */
function verifyInstallerMetadata() {
  console.log('\n' + '='.repeat(60));
  console.log('Verifying Installer Metadata');
  console.log('='.repeat(60));
  console.log();
  
  const pkg = require('../package.json');
  
  console.log('Package Information:');
  console.log(`  Name: ${pkg.name}`);
  console.log(`  Version: ${pkg.version}`);
  console.log(`  Product Name: ${pkg.build.productName}`);
  console.log(`  App ID: ${pkg.build.appId}`);
  console.log();
  
  console.log('Build Configuration:');
  console.log(`  Output Directory: ${pkg.build.directories.output}`);
  console.log(`  Windows Target: ${JSON.stringify(pkg.build.win.target)}`);
  console.log(`  Icon: ${pkg.build.win.icon}`);
  console.log();
  
  console.log('NSIS Configuration:');
  console.log(`  One Click: ${pkg.build.nsis.oneClick}`);
  console.log(`  Allow Directory Change: ${pkg.build.nsis.allowToChangeInstallationDirectory}`);
  console.log(`  Desktop Shortcut: ${pkg.build.nsis.createDesktopShortcut}`);
  console.log(`  Start Menu Shortcut: ${pkg.build.nsis.createStartMenuShortcut}`);
  console.log(`  Delete App Data on Uninstall: ${pkg.build.nsis.deleteAppDataOnUninstall}`);
  console.log();
  
  // Check if icon exists
  const iconPath = path.join(__dirname, '..', pkg.build.win.icon);
  if (fs.existsSync(iconPath)) {
    console.log('✓ Icon file exists');
  } else {
    console.log('⚠ Icon file not found (build may have used default)');
    hasWarnings = true;
  }
}

/**
 * Check latest.yml for auto-updater
 */
function checkUpdateMetadata() {
  console.log('\n' + '='.repeat(60));
  console.log('Checking Auto-Update Metadata');
  console.log('='.repeat(60));
  console.log();
  
  const latestYmlPath = path.join(__dirname, '..', 'dist', 'latest.yml');
  
  if (!fs.existsSync(latestYmlPath)) {
    console.log('⚠ latest.yml not found');
    console.log('  Auto-updates will not work without this file');
    hasWarnings = true;
    return;
  }
  
  const content = fs.readFileSync(latestYmlPath, 'utf8');
  console.log('latest.yml content:');
  console.log(content);
  
  // Parse and validate
  if (content.includes('version:') && content.includes('path:')) {
    console.log('✓ latest.yml appears valid');
  } else {
    console.log('⚠ latest.yml may be incomplete');
    hasWarnings = true;
  }
}

/**
 * Generate installation test report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('Installation Test Report');
  console.log('='.repeat(60));
  console.log();
  
  const pkg = require('../package.json');
  const version = pkg.version;
  const productName = pkg.build.productName;
  
  console.log('Build Summary:');
  console.log(`  Product: ${productName}`);
  console.log(`  Version: ${version}`);
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log();
  
  console.log('Artifacts:');
  console.log(`  Installer: dist/${productName}-${version}-x64.exe`);
  console.log(`  Portable: dist/${productName}-${version}-portable.exe`);
  console.log(`  Metadata: dist/latest.yml`);
  console.log();
  
  console.log('Next Steps:');
  console.log('  1. Manual Testing:');
  console.log('     - See MANUAL_TEST_INSTALLATION.md for detailed test procedures');
  console.log('     - Test installation on a clean Windows system');
  console.log('     - Test uninstallation and cleanup');
  console.log('     - Test portable version');
  console.log();
  console.log('  2. Distribution:');
  console.log('     - Upload artifacts to GitHub Releases');
  console.log('     - Include latest.yml for auto-updates');
  console.log('     - Tag release with v' + version);
  console.log();
  console.log('  3. Documentation:');
  console.log('     - Update README.md with download links');
  console.log('     - Create release notes');
  console.log('     - Update changelog');
  console.log();
}

/**
 * Main test function
 */
async function main() {
  try {
    // Check dist directory and artifacts
    const hasArtifacts = checkDistDirectory();
    
    if (!hasArtifacts) {
      console.log('\n✗ Build artifacts not found or incomplete');
      console.log('  Run: npm run build');
      process.exit(1);
    }
    
    // Verify metadata
    verifyInstallerMetadata();
    
    // Check update metadata
    checkUpdateMetadata();
    
    // Generate report
    generateReport();
    
    // Final summary
    console.log('='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    
    if (hasErrors) {
      console.log('✗ FAILED: Critical issues found');
      console.log('  Fix the errors above before distributing');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('⚠ PASSED WITH WARNINGS');
      console.log('  Review warnings above');
      console.log('  Proceed with caution');
      process.exit(0);
    } else {
      console.log('✓ SUCCESS: All checks passed!');
      console.log('  Build artifacts are ready for distribution');
      console.log('  Proceed with manual testing');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests
main();
