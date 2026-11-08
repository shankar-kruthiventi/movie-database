// Characterization suite config. Serves the PRODUCTION build at /movie-database/ (never the dev server).
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT || 4173); // server.mjs reads the same variable

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  // Platform-neutral snapshot names: baseline images are created from the OLD build only.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
  },
  // Everything runs on Chromium; only the wallpaper spec (BC-23) also runs on WebKit (desktop Safari, iPhone).
  projects: [
    { name: 'chromium' },
    { name: 'webkit', testMatch: 'background.spec.js', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'webkit-mobile', testMatch: 'background.spec.js', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'node e2e/server.mjs',
    port: PORT,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
