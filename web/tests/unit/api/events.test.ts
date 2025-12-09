import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de cookies do Next.js
vi.mock('next/headers', () => ({
  cookies: () => ({ get: vi.fn(), set: vi.fn() })
}))

// Mock de auth ANTES de importar as rotas
vi.mock('../../../src/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock fs (para LocalStorageProvider)
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal()
  const mkdirMock = vi.fn()
  const writeFileMock = vi.fn()
  return {
    ...actual,
    default: {
      ...actual.default,
      promises: {
        mkdir: mkdirMock,
        writeFile: writeFileMock,
      },
    },
    promises: {
      mkdir: mkdirMock,
      writeFile: writeFileMock,
    },
  }
})

// Mock de validateBase64Content
vi.mock('@/lib/utils/filePath', () => ({
  validateBase64Content: vi.fn(() => ({ isValid: true, detectedMimeType: 'application/pdf' }))
}))

// Mock prisma
vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    healthEvent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    files: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      update: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(prisma)),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
  },
}))

// Importar as rotas DEPOIS dos mocks
import { DELETE, PUT, GET } from '@/app/api/events/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { promises as fsPromises } from 'fs'

describe('/api/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock auth to return authenticated user
    vi.mocked(auth).mockResolvedValue({ id: 'user-1', role: 'RECEPTOR' })
  })

  describe('DELETE', () => {
    it('deve deletar evento com sucesso', async () => {
      const mockEvent = { id: 'event-1', userId: 'user-1', files: [], professionalId: 'prof-1' }
      ;(prisma.healthEvent.findUnique as any).mockImplementation((args: any) => {
        if (args.include?.files) {
          return Promise.resolve(mockEvent)
        }
        return Promise.resolve(null)
      })
      ;(prisma.healthEvent.delete as any).mockResolvedValue(mockEvent)

      const request = new Request('http://localhost/api/events', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'event-1' }),
      })

      const response = await DELETE(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(prisma.healthEvent.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1', userId: 'user-1' },
          include: expect.objectContaining({ files: true })
        })
      )
      expect(prisma.healthEvent.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1', userId: 'user-1' }
        })
      )
    })

    it('deve retornar erro 404 quando evento não pertence ao usuário', async () => {
      ;(prisma.healthEvent.findUnique as any).mockResolvedValue(null)

      const request = new Request('http://localhost/api/events', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'event-1' }),
      })

      const response = await DELETE(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Evento não encontrado')
    })

    it('deve retornar erro 401 quando usuário não autenticado', async () => {
      ;(auth as any).mockResolvedValue(null)

      const request = new Request('http://localhost/api/events', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'event-1' }),
      })

      const response = await DELETE(request)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toBe('Não autorizado')
    })

    it('deve salvar arquivos quando content presente', async () => {
      const mockEvent = { id: 'event-1', userId: 'user-1', files: [], professionalId: 'prof-1' }
      ;(prisma.healthEvent.findUnique as any).mockResolvedValue(mockEvent)
      ;(prisma.healthEvent.update as any).mockResolvedValue(mockEvent)
      ;(prisma.files.createMany as any).mockResolvedValue({})
      ;(prisma.healthEvent.delete as any).mockResolvedValue(mockEvent)
      ;(prisma.user.findUnique as any).mockResolvedValue({ id: 'user-1', cpf: '12345678901', name: 'Test User' })

      const request = new Request('http://localhost/api/events', {
        method: 'PUT',
        headers: { 'x-slot': 'result' },
        body: JSON.stringify({
          id: 'event-1',
          title: 'Test',
          date: '2025-01-01',
          type: 'CONSULTATION',
          startTime: '10:00',
          endTime: '11:00',
          professionalId: 'prof-1',
          files: [{
            slot: 'result',
            name: 'test.pdf',
            url: '/uploads/event-1/result-test.pdf',
            physicalPath: '/uploads/event-1/result-test.pdf',
            uploadDate: '2025-01-01',
            content: 'base64content'
          }]
        }),
      })

      const response = await PUT(request)

      expect(vi.mocked(fsPromises.mkdir)).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      )
      expect(vi.mocked(fsPromises.writeFile)).toHaveBeenCalledWith(
        expect.any(String),
        Buffer.from('base64content', 'base64')
      )

      // Mock de auth já está isolado no beforeEach, mas para garantir:
      ;(auth as any).mockResolvedValue({ id: 'user-1', role: 'RECEPTOR' })
    })

    it('deve retornar conflito quando arquivo já existe no slot', async () => {
      const mockEvent = {
        id: 'event-1',
        userId: 'user-1',
        files: [{ slot: 'result', name: 'existing.pdf' }]
      }
      ;(prisma.healthEvent.findUnique as any).mockResolvedValue(mockEvent)

      const request = new Request('http://localhost/api/events', {
        method: 'PUT',
        headers: { 'x-slot': 'result' },
        body: JSON.stringify({
          id: 'event-1',
          title: 'Test',
          date: '2025-01-01',
          type: 'CONSULTATION',
          startTime: '10:00',
          endTime: '11:00',
          professionalId: 'prof-1',
          files: [{
            slot: 'result',
            name: 'new.pdf',
            url: '/uploads/event-1/result-new.pdf',
            physicalPath: '/uploads/event-1/result-new.pdf',
            uploadDate: '2025-01-01'
          }]
        }),
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toEqual(expect.objectContaining({
        id: 'event-1',
        userId: 'user-1',
        files: expect.any(Array)
      }))
    })

    it('deve sobrescrever quando overwrite=true', async () => {
      const mockEvent = {
        id: 'event-1',
        userId: 'user-1',
        files: [{ slot: 'result', name: 'existing.pdf' }]
      }
      ;(prisma.healthEvent.findUnique as any).mockResolvedValue(mockEvent)
      ;(prisma.healthEvent.update as any).mockResolvedValue(mockEvent)
      ;(prisma.files.createMany as any).mockResolvedValue({})

      const request = new Request('http://localhost/api/events', {
        method: 'PUT',
        headers: {
          'x-slot': 'result',
          'x-overwrite-result': 'true'
        },
        body: JSON.stringify({
          id: 'event-1',
          title: 'Test',
          date: '2025-01-01',
          type: 'CONSULTATION',
          startTime: '10:00',
          endTime: '11:00',
          professionalId: 'prof-1',
          files: [{
            slot: 'result',
            name: 'new.pdf',
            url: '/uploads/event-1/result-new.pdf',
            physicalPath: '/uploads/event-1/result-new.pdf',
            uploadDate: '2025-01-01'
          }]
        }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(prisma.files.deleteMany).toHaveBeenCalled()
      expect(prisma.files.createMany).toHaveBeenCalled()
    })
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
      ]

      ;(prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents)
      ;(prisma.healthEvent.count as any).mockResolvedValue(1)

      const request = new Request('http://localhost/api/events')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.events).toEqual(mockEvents)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      })
      expect(prisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          type: true,
          startTime: true,
          endTime: true,
          professionalId: true,
          professional: {
            select: {
              id: true,
              name: true,
              specialty: true
            }
          },
          files: {
            select: {
              id: true,
              slot: true,
              name: true,
              url: true,
              uploadDate: true
            },
            where: { isOrphaned: false }
          }
        },
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20,
      })
      expect(prisma.healthEvent.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' }
      })
    })
  })
})
