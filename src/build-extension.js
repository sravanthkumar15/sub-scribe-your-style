
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name from the current file URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Copy content.js to dist folder
try {
  fs.copyFileSync(
    path.resolve(__dirname, 'content.js'),
    path.resolve(__dirname, '../dist/content.js')
  );
  console.log('content.js copied successfully to dist folder');
} catch (err) {
  console.error('Error handling content script:', err);
}

// Create basic icon files
const createIcon = (size, outputPath) => {
  const canvas = new Uint8Array(size * size * 4);
  // Fill with a simple gradient (purple to pink)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      canvas[i] = Math.floor(128 + (x / size) * 127); // R
      canvas[i + 1] = Math.floor(64 + (y / size) * 64); // G
      canvas[i + 2] = 255; // B
      canvas[i + 3] = 255; // Alpha
    }
  }

  // Write a simple PPM file format (we'll convert this to PNG)
  const header = `P6\n${size} ${size}\n255\n`;
  const ppmData = Buffer.alloc(header.length + size * size * 3);
  
  // Write header
  ppmData.write(header);
  
  // Convert RGBA to RGB and write to buffer
  for (let i = 0; i < size * size; i++) {
    const rgba = i * 4;
    const rgb = header.length + i * 3;
    ppmData[rgb] = canvas[rgba]; // R
    ppmData[rgb + 1] = canvas[rgba + 1]; // G
    ppmData[rgb + 2] = canvas[rgba + 2]; // B
  }
  
  // Write PPM file
  const tempPath = path.resolve(__dirname, `../dist/icon${size}.ppm`);
  fs.writeFileSync(tempPath, ppmData);
  
  console.log(`Created icon${size}.ppm`);
  console.log(`Note: You'll need to manually convert icon${size}.ppm to icon${size}.png`);
}

// Create icons of different sizes
try {
  createIcon(16, '../dist/icon16.ppm');
  createIcon(48, '../dist/icon48.ppm');
  createIcon(128, '../dist/icon128.ppm');
  console.log("Generated icon files (in PPM format, please convert to PNG)");
} catch (err) {
  console.error('Error creating icon files:', err);
}

console.log('Extension files prepared successfully! Ready for upload.');
console.log('IMPORTANT: You need to manually convert .ppm icon files to .png before loading the extension.');
