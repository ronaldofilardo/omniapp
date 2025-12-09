import { vi } from 'vitest'

// Mock do crypto - ANTES de tudo
vi.mock('crypto', () => {
  const mockFn = vi.fn(() => 'test-uuid-123')
  return {
    randomUUID: mockFn,
    default: { randomUUID: mockFn },
  }
})

// Mock do fs - ANTES de tudo
vi.mock('fs/promises', () => {
  const writeFileMock = vi.fn().mockResolvedValue(undefined)
  const mkdirMock = vi.fn().mockResolvedValue(undefined)
  return {
    writeFile: writeFileMock,
    mkdir: mkdirMock,
    default: { writeFile: writeFileMock, mkdir: mkdirMock },
  }
})

// Imports do vitest
import { describe, it, expect, beforeEach } from 'vitest'

// Mock do storageManager
vi.mock('@/lib/storage', () => ({
  storageManager: {
    upload: vi.fn().mockResolvedValue({
      success: true,
      url: 'http://localhost:3000/uploads/test-uuid-123.pdf',
      filename: 'test-uuid-123.pdf',
    }),
    getFileUrl: vi.fn((filename) => `http://localhost:3000/uploads/${filename}`),
  },
}))

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do Prisma
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      adminMetrics: {
        upsert: vi.fn(),
      },
    },
  };
})

// Mock de rate limiter
vi.mock('@/lib/utils/rateLimit', () => ({
  uploadRateLimiter: {
    check: vi.fn(() => ({ allowed: true })),
  },
}))

// Mock de audit service
vi.mock('@/lib/services/auditService', () => ({
  logSecurityEvent: vi.fn(),
}))

// Agora os imports
import { POST } from '@/app/api/upload/route'
import { NextRequest } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/upload - POST', () => {
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
    } as unknown as NextRequest
  }

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'RECEPTOR',
  }

  describe('Autenticação', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const formData = new FormData()
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.detail || data.error).toContain('Autenticação obrigatória')
    })

    it('should proceed with upload if user is authenticated', async () => {
      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.adminMetrics.upsert.mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('url')
      expect(data).toHaveProperty('name')
      expect(data).toHaveProperty('uploadDate')
    })
  })

  describe('Validação de arquivo', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.adminMetrics.upsert.mockResolvedValue({})
    })

    it('should return 400 if no file is provided', async () => {
      const formData = new FormData()

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.detail || data.error).toContain('Nenhum arquivo enviado')
    })

    it('should return 400 for file too large', async () => {
      // Criar arquivo maior que 2MB (limite padrão)
      const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('file', largeFile)

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.detail || data.error).toContain('Arquivo deve ter menos de')
    })

    it('should return 400 for invalid file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', invalidFile)

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.detail || data.error).toContain('Somente imagens e PDFs são permitidos')
    })
  })
})
