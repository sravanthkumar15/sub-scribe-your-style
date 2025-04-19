
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { resolve } from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    {
      name: 'copy-manifest',
      buildEnd() {
        // Ensure dist directory exists
        if (!fs.existsSync('dist')) {
          fs.mkdirSync('dist');
        }
        
        // Copy manifest.json to dist folder
        fs.copyFileSync(
          resolve(__dirname, 'src/manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );
        
        // Copy content script to dist folder 
        fs.copyFileSync(
          resolve(__dirname, 'src/content.js'),
          resolve(__dirname, 'dist/content.js')
        );
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    }
  }
}));
