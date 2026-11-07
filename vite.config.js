import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path: GitHub Pages default; Cloudflare builds set VITE_BASE=/ (see docs/migration/DECISIONS.md).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/movie-database/',
  // React 16.13 has no react/jsx-runtime, so keep the classic runtime.
  plugins: [react({ jsxRuntime: 'classic' })],
  build: { outDir: 'build' },
  server: { port: 3000 },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: './src/setupTests.js',
  },
});
