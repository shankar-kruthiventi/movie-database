import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path: GitHub Pages default; Cloudflare builds set VITE_BASE=/ (see docs/migration/DECISIONS.md).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/movie-database/',
  // React 19 ships react/jsx-runtime: use the plugin's default automatic runtime (existing `import React` lines are harmless).
  plugins: [react()],
  build: {
    outDir: 'build',
    // Keep the CRA output layout (static/js, static/css, static/media): BC-17 asserts it.
    rollupOptions: {
      output: {
        entryFileNames: 'static/js/[name].[hash].js',
        chunkFileNames: 'static/js/[name].[hash].chunk.js',
        assetFileNames: (info) =>
          /\.css$/.test(info.names?.[0] ?? '') ? 'static/css/[name].[hash][extname]' : 'static/media/[name].[hash][extname]',
      },
    },
  },
  server: { port: 3000 },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: './src/setupTests.ts',
  },
});
