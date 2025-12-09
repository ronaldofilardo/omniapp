import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/events/route'
import { NextRequest } from 'next/server'

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do Prisma
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      healthEvent: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      files: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

// Mock do audit service
vi.mock('@/lib/services/auditService', () => ({
  logDocumentSubmission: vi.fn(),
  logHealthEvent: vi.fn(),
}))

// Mock do fileHashServer
vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBase64: vi.fn(),
}))

// Mock do fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}))

vi.mock('fs/promises', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/events - POST with file upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: { get: vi.fn() },
    } as unknown as NextRequest
  }

  const mockUser = {
    id: 'logged-user-1',
    email: 'loggeduser@example.com',
    name: 'Logged User',
    cpf: '11122233344',
    role: 'RECEPTOR',
  }

  const validEventBody = {
    title: 'Consulta Cardiologia',
    description: 'Consulta de rotina',
    date: '2024-12-01',
    type: 'CONSULTA',
    startTime: '10:00',
    endTime: '11:00',
    professionalId: 'prof-1',
    files: [
      {
        name: 'exame-sangue.pdf',
        content: Buffer.from('PDF content').toString('base64'),
      },
    ],
  }

  describe('Autenticação', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const req = createMockRequest(validEventBody)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Não autorizado')
    })
  })

  describe('File-only updates (PUT)', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
    })

    it('should handle file-only updates without modifying event data', async () => {
      // Mock para file-only update (sem campos de evento)
      const fileOnlyBody = {
        id: 'event-1',
        files: [
          {
            name: 'nota-fiscal.pdf',
            url: '/uploads/event-1/nota-fiscal.pdf',
            physicalPath: '/uploads/event-1/nota-fiscal.pdf',
            uploadDate: '2025-12-03T22:49:25.365Z',
            slot: 'invoice',
          },
        ],
      }

      // Mock do evento existente
      const mockExistingEvent = {
        id: 'event-1',
        professionalId: 'prof-1',
        title: 'Consulta Original',
        date: new Date('2024-12-01'),
        startTime: new Date('2024-12-01T10:00:00Z'),
        endTime: new Date('2024-12-01T11:00:00Z'),
      }

      mockPrisma.healthEvent.findUnique.mockResolvedValue(mockExistingEvent)
      mockPrisma.files.createMany.mockResolvedValue({ count: 1 })

      const req = createMockRequest(fileOnlyBody)
      const { PUT } = await import('@/app/api/events/route')
      const response = await PUT(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.files.createMany).toHaveBeenCalledWith({
        data: [
          {
            id: expect.any(String),
            eventId: 'event-1',
            professionalId: 'prof-1',
            slot: 'invoice',
            name: 'nota-fiscal.pdf',
            url: '/uploads/event-1/nota-fiscal.pdf',
            physicalPath: '/uploads/event-1/nota-fiscal.pdf',
            uploadDate: new Date('2025-12-03T22:49:25.365Z'),
            expiryDate: null,
          },
        ],
      })

      // Verificar que não houve atualização do evento
      expect(mockPrisma.healthEvent.update).not.toHaveBeenCalled()
    })

    it('should validate uploadDate parsing safely', async () => {
      const fileOnlyBody = {
        id: 'event-1',
        files: [
          {
            name: 'test.pdf',
            url: '/uploads/event-1/test.pdf',
            physicalPath: '/uploads/event-1/test.pdf',
            uploadDate: 'invalid-date-string', // Data inválida
            slot: 'result',
          },
        ],
      }

      const mockExistingEvent = {
        id: 'event-1',
        professionalId: 'prof-1',
      }

      mockPrisma.healthEvent.findUnique.mockResolvedValue(mockExistingEvent)
      mockPrisma.files.createMany.mockResolvedValue({ count: 1 })

      const req = createMockRequest(fileOnlyBody)
      const { PUT } = await import('@/app/api/events/route')
      const response = await PUT(req)

      expect(response.status).toBe(200)
      expect(mockPrisma.files.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            uploadDate: null, // Deve ser null para data inválida
          }),
        ],
      })
    })

    it('should reject file-only updates without files array', async () => {
      const invalidFileOnlyBody = {
        id: 'event-1',
        // Sem files array
      }

      const req = createMockRequest(invalidFileOnlyBody)
      const { PUT } = await import('@/app/api/events/route')
      const response = await PUT(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Campos obrigatórios ausentes')
    })

    it('should reject file-only updates with event fields', async () => {
      const mixedBody = {
        id: 'event-1',
        title: 'Novo Título', // Campo de evento presente
        files: [
          {
            name: 'test.pdf',
            url: '/uploads/event-1/test.pdf',
            physicalPath: '/uploads/event-1/test.pdf',
            slot: 'result',
          },
        ],
      }

      const req = createMockRequest(mixedBody)
      const { PUT } = await import('@/app/api/events/route')
      const response = await PUT(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Campos obrigatórios ausentes')
    })
  })

  // NOTA: Testes de integração mais complexos para POST de eventos com arquivos
  // são implementados como testes E2E devido à complexidade dos mocks necessários
  // (healthEvent, files, validações de datas, professional lookup, etc).
  //
  // Os testes unitários acima garantem:
  // 1. Autenticação funciona corretamente
  // 2. Estrutura básica da rota está correta
  // 3. File-only updates funcionam corretamente
  // 4. Parsing seguro de datas
  //
  // Para testes completos do fluxo de hash calculation e audit logging,
  // veja os testes das rotas /lab/submit e /document/submit que têm
  // estrutura mais simples e são mais fáceis de mockar.
})

