
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { resolve } from "path";
import fs from "fs";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'content' ? '[name].js' : 'assets/[name]-[hash].js';
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    {
      name: 'copy-extension-files',
      buildEnd() {
        if (!fs.existsSync('dist')) {
          fs.mkdirSync('dist');
        }
        
        // Copy manifest.json to dist folder
        fs.copyFileSync(
          resolve(__dirname, 'src/manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );

        // Ensure content.js is also available in the right location
        // The rollup config should handle this, but let's make sure as a fallback
        try {
          if (fs.existsSync(resolve(__dirname, 'dist/content.js'))) {
            console.log('Content script successfully bundled by rollup');
          } else {
            console.log('Copying content script as fallback');
            fs.copyFileSync(
              resolve(__dirname, 'src/content.js'),
              resolve(__dirname, 'dist/content.js')
            );
          }
        } catch (err) {
          console.error('Error handling content script:', err);
        }
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
