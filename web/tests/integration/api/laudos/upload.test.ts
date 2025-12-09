import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/laudos/upload/route'
import { NextRequest } from 'next/server'

// Mock do auditService
vi.mock('@/lib/services/auditService', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  logDocumentSubmission: vi.fn().mockResolvedValue(undefined),
}))

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/lib/auth'

const mockAuth = auth as any

describe('/api/laudos/upload - POST', () => {
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
    role: 'EMISSOR',
  }

  describe('Autenticação', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const formData = new FormData()
      const file = new File(['test'], 'laudo.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('paciente_id', 'paciente-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Autenticação obrigatória')
    })

    it('should proceed if user is authenticated', async () => {
      mockAuth.mockResolvedValue(mockUser)

      const formData = new FormData()
      const file = new File(['test'], 'laudo.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('paciente_id', 'paciente-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('fileName')
      expect(data).toHaveProperty('uploadedAt')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('pacienteId')
    })
  })

  describe('Validação de arquivo', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
    })

    it('should return 400 if no file is provided', async () => {
      const formData = new FormData()
      formData.append('paciente_id', 'paciente-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Arquivo não fornecido')
    })
  })
})
