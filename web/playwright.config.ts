import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '../tests/e2e',
  fullyParallel: false, // Desabilitar paralelismo para evitar problemas de estado
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Apenas 1 worker para rodar testes em série
  reporter: 'html',
  globalSetup: '../tests/setup/setup-tests.ts',
  timeout: 60000, // 60s timeout global para cada teste
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    actionTimeout: 15000, // 15s para cada ação individual
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:123456@localhost:5432/omni_mvp_test?schema=public'
    },
  },
})
