/**
 * Mock Helper Utilities
 * Ferramentas padronizadas para criar mocks estáveis e reutilizáveis
 */

import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import { beforeEach } from 'vitest'

/**
 * Mock profundo do Prisma Client usando vitest-mock-extended
 * Este mock é automaticamente tipado e suporta nested mocks
 */
export const createMockPrisma = (): DeepMockProxy<PrismaClient> => {
  return mockDeep<PrismaClient>()
}

/**
 * Mock global do Prisma para ser usado em todos os testes
 */
export let mockPrisma: DeepMockProxy<PrismaClient>

/**
 * Inicializa o mock do Prisma (chamar no setup global)
 */
export function initializePrismaMock() {
  mockPrisma = createMockPrisma()
  return mockPrisma
}

/**
 * Reseta todos os mocks do Prisma (chamar no beforeEach)
 */
export function resetPrismaMock() {
  if (mockPrisma) {
    mockReset(mockPrisma)
  }
}

/**
 * Setup automático de reset de mocks para usar em testes
 * Exemplo: setupMockReset()
 */
export function setupMockReset() {
  beforeEach(() => {
    resetPrismaMock()
  })
}

/**
 * Factory helper para criar dados de teste tipados
 */
export function createTestData<T>(defaults: Partial<T>, overrides?: Partial<T>): T {
  return {
    ...defaults,
    ...overrides,
  } as T
}

/**
 * Mock parcial - mocka apenas métodos específicos
 * Exemplo:
 * mockPartial(mockPrisma.user, {
 *   findUnique: vi.fn().mockResolvedValue(testUser)
 * })
 */
export function mockPartial<T extends Record<string, any>>(
  target: T,
  methods: Partial<Record<keyof T, any>>
) {
  Object.entries(methods).forEach(([key, value]) => {
    if (value !== undefined) {
      (target as any)[key] = value
    }
  })
  return target
}
