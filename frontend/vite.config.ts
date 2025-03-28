import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path'; // Import the 'path' module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  build: {
    target: 'esnext', // Modern JS for compatibility with Vue-i18n
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Correctly use 'path' here
    }
  }
});
