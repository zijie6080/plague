import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  server: { port: 5173 },
});
