import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Exclude /api directory from the client bundle
const excludeApi = () => {
  return {
    name: 'exclude-api-folder',
    load(id: string) {
      if (id.includes('/api/')) return ''; // Prevent Vite from processing it
    },
  };
};

export default defineConfig({
  plugins: [react(), excludeApi()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
