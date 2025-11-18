/**
 * Build Verification Script
 * 
 * Verifies that the build environment is properly configured
 * and all prerequisites are met before building.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('Spooky Study App - Build Verification');
console.log('='.repeat(60));
console.log();

let hasErrors = false;
let hasWarnings = false;

/**
 * Check if a file exists
 */
function checkFile(filePath, required = true) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✓' : (required ? '✗' : '⚠');
  const message = exists ? 'Found' : (required ? 'MISSING' : 'Not found (optional)');
  
  console.log(`${status} ${filePath}: ${message}`);
  
  if (!exists && required) {
    hasErrors = true;
  } else if (!exists && !required) {
    hasWarnings = true;
  }
  
  return exists;
}

/**
 * Check if a command is available
 */
function checkCommand(command, name) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe' });
    console.log(`✓ ${name}: Installed`);
    return true;
  } catch (error) {
    console.log(`✗ ${name}: NOT INSTALLED`);
    hasErrors = true;
    return false;
  }
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  
  if (major >= 16) {
    console.log(`✓ Node.js: ${version} (OK)`);
    return true;
  } else {
    console.log(`✗ Node.js: ${version} (Need v16 or higher)`);
    hasErrors = true;
    return false;
  }
}

/**
 * Check package.json configuration
 */
function checkPackageJson() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  
  if (!checkFile(packagePath)) {
    return false;
  }
  
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check required fields
  const requiredFields = ['name', 'version', 'main', 'build'];
  let allPresent = true;
  
  for (const field of requiredFields) {
    if (!pkg[field]) {
      console.log(`✗ package.json missing field: ${field}`);
      hasErrors = true;
      allPresent = false;
    }
  }
  
  if (allPresent) {
    console.log(`✓ package.json: All required fields present`);
    console.log(`  - Name: ${pkg.name}`);
    console.log(`  - Version: ${pkg.version}`);
    console.log(`  - Main: ${pkg.main}`);
  }
  
  // Check build configuration
  if (pkg.build) {
    console.log(`✓ Build configuration: Present`);
    console.log(`  - App ID: ${pkg.build.appId || 'Not set'}`);
    console.log(`  - Product Name: ${pkg.build.productName || 'Not set'}`);
    
    if (pkg.build.win) {
      console.log(`  - Windows target: ${JSON.stringify(pkg.build.win.target)}`);
      console.log(`  - Icon: ${pkg.build.win.icon || 'Not set'}`);
    }
  }
  
  return allPresent;
}

/**
 * Check dependencies
 */
function checkDependencies() {
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('✗ node_modules: NOT FOUND');
    console.log('  Run: npm install');
    hasErrors = true;
    return false;
  }
  
  console.log('✓ node_modules: Found');
  
  // Check critical dependencies
  const criticalDeps = [
    'electron',
    'electron-builder',
    'electron-updater'
  ];
  
  let allPresent = true;
  for (const dep of criticalDeps) {
    const depPath = path.join(nodeModulesPath, dep);
    if (!fs.existsSync(depPath)) {
      console.log(`  ✗ ${dep}: NOT INSTALLED`);
      hasErrors = true;
      allPresent = false;
    }
  }
  
  if (allPresent) {
    console.log('  ✓ All critical dependencies installed');
  }
  
  return allPresent;
}

/**
 * Check source files
 */
function checkSourceFiles() {
  const requiredFiles = [
    'src/main/index.js',
    'src/main/ConfigManager.js',
    'src/main/DocumentProcessor.js',
    'src/main/QuestionGenerator.js',
    'src/main/TimerManager.js',
    'src/main/ScareController.js',
    'src/main/AutoUpdater.js',
    'src/renderer/config/index.html',
    'src/renderer/scare/index.html',
    'src/shared/constants.js'
  ];
  
  console.log('\nChecking source files:');
  let allPresent = true;
  
  for (const file of requiredFiles) {
    if (!checkFile(file)) {
      allPresent = false;
    }
  }
  
  return allPresent;
}

/**
 * Check build resources
 */
function checkBuildResources() {
  console.log('\nChecking build resources:');
  
  // Icon is critical for Windows builds
  const hasIcon = checkFile('build/icon.ico', true);
  
  if (!hasIcon) {
    console.log('\n⚠ WARNING: Icon file is missing!');
    console.log('  The build will fail without an icon.');
    console.log('  See build/README.md for instructions on creating the icon.');
    console.log('  Or temporarily remove the icon field from package.json for testing.');
  }
  
  return hasIcon;
}

/**
 * Run tests
 */
function runTests() {
  console.log('\nRunning tests...');
  
  try {
    execSync('npm test', { stdio: 'inherit' });
    console.log('✓ All tests passed');
    return true;
  } catch (error) {
    console.log('✗ Tests failed');
    console.log('  Fix test failures before building');
    hasErrors = true;
    return false;
  }
}

/**
 * Main verification
 */
async function main() {
  console.log('Checking prerequisites...\n');
  
  // Check Node.js
  checkNodeVersion();
  
  // Check commands
  checkCommand('npm', 'npm');
  checkCommand('git', 'git');
  
  console.log('\nChecking project configuration...\n');
  
  // Check package.json
  checkPackageJson();
  
  // Check dependencies
  console.log();
  checkDependencies();
  
  // Check source files
  checkSourceFiles();
  
  // Check build resources
  checkBuildResources();
  
  // Run tests (optional, can be skipped with --skip-tests)
  if (!process.argv.includes('--skip-tests')) {
    console.log();
    const testsPass = runTests();
    if (!testsPass) {
      console.log('\n⚠ You can skip tests with: node scripts/verify-build.js --skip-tests');
    }
  } else {
    console.log('\n⚠ Tests skipped (--skip-tests flag)');
    hasWarnings = true;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Verification Summary');
  console.log('='.repeat(60));
  
  if (hasErrors) {
    console.log('✗ FAILED: Please fix the errors above before building');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠ PASSED WITH WARNINGS: Review warnings above');
    console.log('\nYou can proceed with the build, but some features may not work correctly.');
    process.exit(0);
  } else {
    console.log('✓ SUCCESS: All checks passed!');
    console.log('\nYou can now build the application:');
    console.log('  npm run build      - Create installer and portable exe');
    console.log('  npm run package    - Create unpacked directory only');
    process.exit(0);
  }
}

// Run verification
main().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
