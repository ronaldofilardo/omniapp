import { vi } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

// =============================================================================
// CONFIGURAÇÃO DE MOCK GLOBAL - APLICADA ANTES DE QUALQUER IMPORTAÇÃO
// =============================================================================

/**
 * Mock profundo e tipado do Prisma Client usando vitest-mock-extended
 * Benefícios:
 * - Tipagem completa automática
 * - Mocks aninhados (nested mocks)
 * - Menos código manual
 * - Mais estável e fácil de manter
 */
export const mockPrisma = mockDeep<PrismaClient>()

// Mock do módulo Prisma ANTES de qualquer importação
// NÃO MOCKAR em testes de integração (usa o Prisma real para testar DB)
const isIntegrationTest = process.env.VITEST_POOL_ID?.includes('integration') || 
                         process.argv.some(arg => arg.includes('integration'))

if (!isIntegrationTest) {
  vi.mock('../../src/lib/prisma', () => ({
    prisma: mockPrisma,
    default: mockPrisma,
  }))

  // Mock com alias também
  vi.mock('@/lib/prisma', () => ({
    prisma: mockPrisma,
    default: mockPrisma,
  }))
}

// Mock do Next.js Router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock do Next Auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock do cookies do Next.js
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'test-session-value' })),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// Mock de APIs do browser
global.alert = vi.fn()
global.confirm = vi.fn(() => true)
global.prompt = vi.fn()

// Mock para ResizeObserver (necessário para alguns componentes)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock para IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock para scrollIntoView (usado por Radix UI)
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
}

// Mock para console em testes (evita poluição de logs)
if (process.env.NODE_ENV === 'test') {
  // Manter console.error para debugging, mas silenciar warnings desnecessários
  const originalConsoleWarn = console.warn
  console.warn = vi.fn((message, ...args) => {
    // Só mostrar warnings importantes
    if (message && typeof message === 'string' && 
        !message.includes('act()') && 
        !message.includes('ReactDOMTestUtils')) {
      originalConsoleWarn(message, ...args)
    }
  })
}

// Função para resetar todos os mocks de forma eficiente
export const resetAllMocks = () => {
  vi.clearAllMocks()
  mockReset(mockPrisma) // Reseta profundamente usando vitest-mock-extended
}

// Configurar limpeza automática após cada teste
if (typeof afterEach !== 'undefined') {
  afterEach(() => {
    resetAllMocks()
  })
}
