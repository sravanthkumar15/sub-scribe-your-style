
const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
  console.log('Created dist directory');
}

// Copy manifest.json to dist folder
try {
  fs.copyFileSync(
    path.resolve(__dirname, 'manifest.json'),
    path.resolve(__dirname, '../dist/manifest.json')
  );
  console.log('manifest.json copied successfully to dist folder');
} catch (err) {
  console.error('Error copying manifest.json:', err);
}

// Copy content.js to dist folder if it doesn't exist
try {
  if (!fs.existsSync(path.resolve(__dirname, '../dist/content.js'))) {
    fs.copyFileSync(
      path.resolve(__dirname, 'content.js'),
      path.resolve(__dirname, '../dist/content.js')
    );
    console.log('content.js copied successfully to dist folder');
  } else {
    console.log('content.js already exists in dist folder');
  }
} catch (err) {
  console.error('Error handling content script:', err);
}

console.log('Extension files prepared successfully! Ready for upload.');
