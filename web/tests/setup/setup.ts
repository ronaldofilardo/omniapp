// tests/setup.ts - Setup global aprimorado para testes
// IMPORTANTE: Importar mocks globais PRIMEIRO, antes de qualquer outro módulo
import React from 'react'
import '../__mocks__/global'

import '@testing-library/jest-dom'
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { resetAllMocks } from '../__mocks__/global'

// Importar MSW setup
import { setupMSW } from './msw-setup'

// Configuração global para React 19
global.React = React

// Garantir que window esteja sempre disponível no ambiente de teste
if (typeof window === 'undefined') {
  // @ts-ignore - Estamos em ambiente de teste
  global.window = global as any
}

// Inicializar MSW para mockar APIs externas
setupMSW()

// Mock para ResizeObserver (classe, não factory)
if (!('ResizeObserver' in globalThis) ||
    typeof globalThis.ResizeObserver !== 'function' ||
    globalThis.ResizeObserver.name !== 'MockResizeObserver') {
  class MockResizeObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true, // permite sobrescrita e deleção pelo teardown do Vitest
    configurable: true,
    value: MockResizeObserver,
  });
}


// Mock global robusto para IntersectionObserver (classe, não função/factory)
if (!('IntersectionObserver' in globalThis) ||
    typeof globalThis.IntersectionObserver !== 'function' ||
    globalThis.IntersectionObserver.name !== 'MockIntersectionObserver') {
  class MockIntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true, // permite sobrescrita e deleção pelo teardown do Vitest
    configurable: true,
    value: MockIntersectionObserver,
  });
}

// Mock para matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock para localStorage/sessionStorage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
}

Object.defineProperty(window, 'localStorage', { value: mockStorage })
Object.defineProperty(window, 'sessionStorage', { value: mockStorage })

// Suprimir warnings do Radix UI (Dialog/Select) para não poluir o output dos testes
const originalConsoleError = console.error;
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = args[0];
    if (
      typeof msg === 'string' &&
      (msg.includes('DialogContent') || 
       msg.includes('aria-describedby') || 
       msg.includes('DialogTitle') ||
       msg.includes('Warning: ReactDOM.render is no longer supported'))
    ) {
      return;
    }
    originalConsoleError(...args);
  });
});

afterAll(() => {
  (console.error as any).mockRestore?.();
});

// Extende expect
expect.extend(matchers)

// Limpa após cada teste
afterEach(async () => {
  cleanup()
  vi.clearAllMocks()

  // Aguardar um tick para garantir que todas as promises pendentes sejam resolvidas
  await new Promise(resolve => setImmediate(resolve))

  // Aguardar qualquer promise pendente do React
  await new Promise(resolve => setTimeout(resolve, 0))
}, 10000) // Aumentar timeout para 10 segundos
