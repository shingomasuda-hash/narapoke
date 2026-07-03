import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }, // スマホ幅を最優先で検証
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
