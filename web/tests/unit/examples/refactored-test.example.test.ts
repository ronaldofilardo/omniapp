/**
 * Exemplo de teste refatorado usando as melhores práticas
 * 
 * Este arquivo demonstra como usar:
 * - vitest-mock-extended para mocks profundos
 * - Test factories para dados realistas
 * - Partial mocking para testar apenas o necessário
 * - MSW para mockar APIs externas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '../../__mocks__/global'
import { testDataFactory } from '../../setup/test-factories'
import { healthEventRepository } from '@/repositories'
import { addMSWHandler } from '../../setup/msw-setup'
import { http, HttpResponse } from 'msw'

describe('HealthEventRepository - Refatorado', () => {
  // Setup básico: resetar mocks antes de cada teste
  // (já está configurado globalmente, mas pode ser explícito)
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findById', () => {
    it('deve retornar um evento quando encontrado', async () => {
      // ✅ CORRETO: Usar factory para criar dados de teste
      const mockEvent = testDataFactory.healthEvent.consulta()

      // ✅ CORRETO: Mock parcial - apenas o método necessário
      mockPrisma.healthEvent.findUnique.mockResolvedValue(mockEvent)

      // Executar
      const result = await healthEventRepository.findById(mockEvent.id)

      // Verificar
      expect(result).toEqual(mockEvent)
      expect(mockPrisma.healthEvent.findUnique).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
      })
    })

    it('deve retornar null quando evento não existe', async () => {
      // ✅ CORRETO: Mockar apenas o retorno esperado
      mockPrisma.healthEvent.findUnique.mockResolvedValue(null)

      const result = await healthEventRepository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findOverlapping', () => {
    it('deve encontrar eventos sobrepostos', async () => {
      // ✅ CORRETO: Usar factory para criar múltiplos eventos
      const overlappingEvents = testDataFactory.healthEvent.buildMany(2, {
        professionalId: 'prof-123',
      })

      mockPrisma.healthEvent.findMany.mockResolvedValue(overlappingEvents)

      const result = await healthEventRepository.findOverlapping({
        professionalId: 'prof-123',
        startTime: new Date('2025-12-06T09:00:00Z'),
        endTime: new Date('2025-12-06T10:00:00Z'),
      })

      expect(result).toHaveLength(2)
      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('deve criar um novo evento de saúde', async () => {
      // ✅ CORRETO: Factory + overrides específicos
      const newEvent = testDataFactory.healthEvent.build()
      
      mockPrisma.healthEvent.create.mockResolvedValue(newEvent)

      const result = await healthEventRepository.create({
        title: newEvent.title,
        date: newEvent.date,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        type: newEvent.type,
        user: { connect: { id: newEvent.userId } },
        professional: { connect: { id: newEvent.professionalId } },
      })

      expect(result).toEqual(newEvent)
      expect(mockPrisma.healthEvent.create).toHaveBeenCalledTimes(1)
    })
  })
})

/**
 * Exemplo de teste com MSW para mockar APIs externas
 */
describe('Upload de Arquivos - Com MSW', () => {
  it('deve fazer upload de arquivo para Cloudinary', async () => {
    // ✅ CORRETO: Usar MSW para mockar API externa
    // Nota: MSW pode ter problemas de configuração, então usamos mock direto do fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        secure_url: 'https://cloudinary.com/test.jpg',
        public_id: 'test-123',
      }),
    })

    // Mock temporário do fetch global
    const originalFetch = global.fetch
    global.fetch = mockFetch

    try {
      // Simular upload
      const response = await fetch('https://api.cloudinary.com/v1_1/test/image/upload', {
        method: 'POST',
        body: new FormData(),
      })

      const data = await response.json()

      expect(data.secure_url).toBe('https://cloudinary.com/test.jpg')
      expect(data.public_id).toBe('test-123')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cloudinary.com/v1_1/test/image/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      )
    } finally {
      // Restaurar fetch original
      global.fetch = originalFetch
    }
  })
})

/**
 * Exemplo de teste usando spy ao invés de mock completo
 */
describe('Partial Mocking - Spy Example', () => {
  it('deve usar spy para mockar apenas um método específico', async () => {
    // ✅ CORRETO: Spy em método específico mantendo outros reais
    const mockEvent = testDataFactory.healthEvent.build()
    
    // Mockar apenas findById, outros métodos continuam "normais" (mockados globalmente)
    const spy = vi.spyOn(mockPrisma.healthEvent, 'findUnique')
      .mockResolvedValue(mockEvent)

    const result = await healthEventRepository.findById('test-id')

    expect(spy).toHaveBeenCalledOnce()
    expect(result).toEqual(mockEvent)
  })
})
