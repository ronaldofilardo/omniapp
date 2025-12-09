import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
vi.mock('../../../src/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock performance metrics
vi.mock('../../../src/lib/monitoring/performanceMetrics', () => ({
  recordRequestMetric: vi.fn(),
  createTimer: vi.fn(() => ({ stop: vi.fn(() => 100) })),
}))

// Mock middlewares
vi.mock('../../../src/lib/middleware/rls', () => ({
  withRLS: vi.fn(async (req, handler) => {
    return await handler(req)
  }),
}))

vi.mock('../../../src/lib/middleware/performanceMiddleware', () => ({
  withPerformanceTracking: vi.fn(async (handler) => {
    return await handler()
  }),
}))

// Mock do lib/prisma.ts antes de importar a rota
vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    healthEvent: {
      findMany: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
  },
}))

// Importar a rota e o prisma mockado depois do mock
import { GET } from '@/app/api/repository/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Criar referência tipada para o mock
const mockPrisma = prisma as any

describe('/api/repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(auth as any).mockResolvedValue({ id: 'user-1', role: 'RECEPTOR' })
  })

  describe('GET', () => {
    it('should return events with files for authenticated user', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Consulta Médica',
          date: '2025-01-15',
          type: 'CONSULTA',
          files: [
            { slot: 'result', name: 'exame.pdf', url: '/uploads/exame.pdf' },
          ],
          professional: {
            id: 'prof-1',
            name: 'Dr. Silva',
            specialty: 'Cardiologia',
          },
        },
        {
          id: 'event-2',
          title: 'Exame Laboratorial',
          date: '2025-01-20',
          type: 'EXAME',
          files: [
            {
              slot: 'certificate',
              name: 'atestado.pdf',
              url: '/uploads/atestado.pdf',
            },
          ],
          professional: {
            id: 'prof-2',
            name: 'Dra. Santos',
            specialty: 'Clínica Geral',
          },
        },
      ]

      mockPrisma.healthEvent.findMany.mockResolvedValue(mockEvents)

      const req = { url: 'http://localhost/api/repository' } as Request
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockEvents)
      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
        },
        include: {
          professional: true,
          files: true,
        },
        orderBy: {
          date: 'desc',
        },
      })
    })

    it('should return empty array when no events with files exist', async () => {
      const mockEvents: any[] = []
      mockPrisma.healthEvent.findMany.mockResolvedValue(mockEvents)
      const req = { url: 'http://localhost/api/repository' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return 401 if user is not authenticated', async () => {
      ;(auth as any).mockResolvedValue(null)
      const req = { url: 'http://localhost/api/repository' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Não autorizado')
    })

    it('should return 500 on database error during events lookup', async () => {
      mockPrisma.healthEvent.findMany.mockRejectedValue(new Error('Database error'))
      const req = { url: 'http://localhost/api/repository' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno ao buscar dados do repositório.')
    })

    it('should return 500 on database error during events lookup', async () => {
      mockPrisma.healthEvent.findMany.mockRejectedValue(
        new Error('Database error')
      )

      const req = { url: 'http://localhost/api/repository' } as Request
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno ao buscar dados do repositório.')
    })

    it('should filter out events with empty files array', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Consulta Médica',
          date: '2025-01-15',
          type: 'CONSULTA',
          files: [
            { slot: 'result', name: 'exame.pdf', url: '/uploads/exame.pdf' },
          ],
          professional: {
            id: 'prof-1',
            name: 'Dr. Silva',
            specialty: 'Cardiologia',
          },
        },
      ]
      mockPrisma.healthEvent.findMany.mockResolvedValue([mockEvents[0]])
      const req = { url: 'http://localhost/api/repository' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('event-1')
    })

    it('should order events by date descending', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Evento Antigo',
          date: '2025-01-10',
          type: 'CONSULTA',
          files: [
            { slot: 'result', name: 'file.pdf', url: '/uploads/file.pdf' },
          ],
          professional: {
            id: 'prof-1',
            name: 'Dr. Silva',
            specialty: 'Cardiologia',
          },
        },
        {
          id: 'event-2',
          title: 'Evento Novo',
          date: '2025-01-20',
          type: 'EXAME',
          files: [
            { slot: 'certificate', name: 'cert.pdf', url: '/uploads/cert.pdf' },
          ],
          professional: {
            id: 'prof-2',
            name: 'Dra. Santos',
            specialty: 'Clínica Geral',
          },
        },
      ]
      mockPrisma.healthEvent.findMany.mockResolvedValue([
        mockEvents[1],
        mockEvents[0],
      ])
      const req = { url: 'http://localhost/api/repository' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].date).toBe('2025-01-20') // Most recent first
      expect(data[1].date).toBe('2025-01-10')
    })
  })
})
