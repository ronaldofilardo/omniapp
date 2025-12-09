import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/upload-file/route'

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do audit service
vi.mock('@/lib/services/auditService', () => ({
  logSecurityEvent: vi.fn(),
}))

// Mock do fileHashServer
vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBuffer: vi.fn().mockReturnValue('mock-hash'),
}))

// Mock do fs
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-file-id'),
}))

// Mock do virusScan
vi.mock('@/lib/utils/virusScan', () => ({
  scanForViruses: vi.fn().mockResolvedValue({ isClean: true }),
}))

// Mock do storageManager
vi.mock('@/lib/storage', () => ({
  storageManager: {
    upload: vi.fn().mockResolvedValue({
      success: true,
      url: '/uploads/event-1/test-slot-test.png',
      filename: 'test-slot-test.png'
    }),
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/upload-file - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (formData: FormData) => {
    return {
      formData: vi.fn().mockResolvedValue(formData),
      headers: {
        get: vi.fn((key: string) => {
          const headers = {
            'x-forwarded-for': '127.0.0.1',
            'x-real-ip': '127.0.0.1',
            'user-agent': 'test-agent'
          }
          return headers[key as keyof typeof headers] || null
        })
      }
    } as unknown as Request
  }

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'RECEPTOR',
  }

  const mockEvent = {
    id: 'event-1',
    userId: 'user-1',
    title: 'Test Event',
  }

  describe('Autenticação', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const formData = new FormData()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Autenticação obrigatória')
    })
  })

  describe('Autorização', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
    })

    it('should return 404 if event does not exist', async () => {
      mockPrisma.healthEvent.findUnique.mockResolvedValue(null)

      const formData = new FormData()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'nonexistent-event')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Evento não encontrado.')
    })

    it('should return 403 if user does not own the event', async () => {
      const otherUserEvent = { ...mockEvent, userId: 'other-user' }
      mockPrisma.healthEvent.findUnique.mockResolvedValue(otherUserEvent)

      const formData = new FormData()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Acesso negado: você não tem permissão para fazer upload neste evento.')
    })

    it('should proceed with upload if user owns the event', async () => {
      mockPrisma.healthEvent.findUnique.mockResolvedValue(mockEvent)
      mockPrisma.files.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.files.create.mockResolvedValue({})
      mockPrisma.adminMetrics.upsert.mockResolvedValue({})

      const formData = new FormData()
      const fileContent = 'test'
      const file = new File([fileContent], 'test.png', { type: 'image/png' })
      // Mock arrayBuffer method
      Object.defineProperty(file, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(new TextEncoder().encode(fileContent).buffer)
      })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('url')
      expect(data).toHaveProperty('name')
    })
  })

  describe('Validação de dados', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.healthEvent.findUnique.mockResolvedValue(mockEvent)
    })

    it('should return 400 if required fields are missing', async () => {
      const formData = new FormData()
      // Missing file, slot, and eventId

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Dados incompletos.')
    })

    it('should return 400 for non-image and non-PDF files', async () => {
      const formData = new FormData()
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Apenas arquivos de imagem ou PDFs são aceitos (PNG, JPG, JPEG, GIF, PDF, etc.).')
    })

    it('should accept PDF files', async () => {
      mockPrisma.files.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.files.create.mockResolvedValue({})
      mockPrisma.adminMetrics.upsert.mockResolvedValue({})

      const formData = new FormData()
      const fileContent = 'test pdf content'
      const file = new File([fileContent], 'test.pdf', { type: 'application/pdf' })
      // Mock arrayBuffer method
      Object.defineProperty(file, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(new TextEncoder().encode(fileContent).buffer)
      })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
    })
  })
})
