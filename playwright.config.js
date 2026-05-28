import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 1,
  workers: 2,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://ia-diagnostic.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    // ── API : un seul navigateur suffit ──────────────────────────────
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Fonctionnel — Desktop 3 navigateurs ──────────────────────────
    {
      name: 'chromium',
      testMatch: ['**/functional/**/*.spec.js', '**/ui/**/*.spec.js'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: ['**/functional/**/*.spec.js', '**/ui/**/*.spec.js'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: ['**/functional/**/*.spec.js', '**/ui/**/*.spec.js'],
      use: { ...devices['Desktop Safari'] },
    },

    // ── UI Responsive — Mobile & Tablette ────────────────────────────
    {
      name: 'mobile-chrome',
      testMatch: '**/ui/**/*.spec.js',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      testMatch: '**/ui/**/*.spec.js',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'tablet',
      testMatch: '**/ui/**/*.spec.js',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],
});
