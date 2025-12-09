// vitest.config.ts - Configuração unificada do Vitest
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks', // Usar forks para melhor controle de memória
    maxWorkers: 1, // Limitar a 1 worker
    setupFiles: [
      './tests/__mocks__/global.ts', // Mocks globais aplicados PRIMEIRO
      './tests/setup/setupJestDom.ts', // Setup dedicado para jest-dom (matchers)
      './tests/setup/setup.ts', // Setup global unificado para testes
    ],
    include: [
      './tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      './tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      './tests/performance/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      './tests/e2e/**', // Exclui testes E2E do Vitest
      './tests/results/**', // Exclui resultados de teste
      '**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', // Exclui arquivos E2E por nome
      '**/*e2e*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', // Exclui arquivos com 'e2e' no nome
      '**/*spec*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', // Exclui arquivos spec (usados por Playwright)
      '**/*.spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', // Exclui arquivos .spec
      '**/.next/**', // Exclui build do Next.js (recursivo, qualquer subpasta)
      '.next/**', // Exclui .next na raiz
      '.next/**/**', // Exclui tudo dentro de .next recursivamente
      '.next/standalone/**', // Exclui especificamente o standalone
      './tests/e2e/**/*', // Exclusão adicional para testes E2E
      './tests/e2e/**/*.spec.ts', // Exclusão específica para arquivos spec do Playwright
      './tests/e2e/**/*.test.ts', // Exclusão específica para arquivos test do Playwright
      './tests/e2e/**/*.ts', // Exclui todos os arquivos TypeScript em tests/e2e
      './tests/e2e/**/*.js', // Exclui todos os arquivos JavaScript em tests/e2e
      './tests/e2e/**/*', // Exclusão redundante mas segura
      '**/playwright.config.ts', // Exclui arquivo de configuração do Playwright
      '**/playwright.config.js', // Exclui arquivo de configuração do Playwright
    ],
    env: {
      NODE_ENV: 'test',
      NEXTAUTH_SECRET: 'test-secret',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
    },
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        '../tests/',
        '**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
      '@sentry/nextjs': path.resolve(__dirname, './tests/__mocks__/@sentry/nextjs.ts'),
      'logrocket': path.resolve(__dirname, './tests/__mocks__/logrocket.ts'),
      '@datadog/browser-rum': path.resolve(__dirname, './tests/__mocks__/@datadog/browser-rum.ts'),
    },
  },
})
