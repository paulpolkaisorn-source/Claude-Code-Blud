import { defineConfig } from '@playwright/test';

// Smoke suite for the built page. The webServer builds, then serves dist/ with
// `vite preview` on 4180, clear of the dev (5173) and preview (4173) ports.
const BASE_URL = 'http://127.0.0.1:4180';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // Unset by default, so Playwright resolves the bundled Chromium from
    // PLAYWRIGHT_BROWSERS_PATH. Set PW_CHROMIUM to force a specific binary.
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM ?? undefined,
    },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4180 --strictPort --host 127.0.0.1',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'reduced',
      use: {
        viewport: { width: 1440, height: 900 },
        // In 1.56 reducedMotion is only typed under contextOptions, not as a top-level use option.
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],
});
