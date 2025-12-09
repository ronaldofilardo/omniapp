import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Resend - deve ser o primeiro mock
vi.mock('resend', () => {
  class MockResend {
    constructor() {
      this.emails = {
        send: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
      };
    }
  }

  return {
    Resend: MockResend,
  };
})

// Mock do resend.ts
vi.mock('@/lib/resend', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock do bcrypt
vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  default: {
    hash: vi.fn(),
  },
}))

// Mock do lib/prisma.ts antes de importar a rota
// REMOVIDO: O mock global do Prisma já está configurado em tests/__mocks__/global.ts

// Importar a rota e o prisma mockado depois do mock
import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Criar referência tipada para o mock
const mockPrisma = prisma as any
const mockBcrypt = bcrypt as any

describe('/api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.findFirst.mockResolvedValue(null)
  })

  describe('POST', () => {
    it('should register successfully with valid data', async () => {
      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        cpf: '12345678901',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }
      const mockUser = {
        id: 'user-1',
        email: requestBody.email,
        password: 'hashed-password',
        name: requestBody.name,
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockUser)
      mockBcrypt.hash.mockResolvedValue('hashed-password')

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as Request

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      })
      expect(data.user).not.toHaveProperty('password')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
       expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          name: 'Test User',
          cpf: '12345678901',
          role: 'RECEPTOR',
          telefone: null,
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
          emailVerified: null,
        },
      })
    })

    it('should return 400 for missing email or password', async () => {
      const requestBody = {
        email: 'test@example.com',
        // missing password
        cpf: '12345678901',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as Request

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
       expect(data.error).toBe('E-mail, senha e CPF são obrigatórios')
    })

    it('should return 400 for existing user', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Existing User',
        cpf: '12345678901',
      }

      mockPrisma.user.findUnique.mockResolvedValue(existingUser)

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        cpf: '12345678901',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      mockPrisma.user.findUnique.mockResolvedValue(existingUser)
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as Request

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
       expect(data.error).toBe('E-mail já cadastrado')
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('should return 500 on database error during findUnique', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        cpf: '12345678901',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as Request

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno do servidor')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
    })

    it('should return 500 on bcrypt error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockBcrypt.hash.mockRejectedValue(new Error('Bcrypt error'))

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        cpf: '12345678901',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as Request

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno do servidor')
    })

    it('should return 500 on database error during create', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockBcrypt.hash.mockResolvedValue('hashed-password')
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'))

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        cpf: '12345678901',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as Request

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno do servidor')
    })

    it('should handle optional name field', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: null,
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockUser)
      mockBcrypt.hash.mockResolvedValue('hashed-password')

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
        // name is optional
        cpf: '12345678901',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as Request

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user.name).toBeNull()
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          name: undefined,
          cpf: '12345678901',
          role: 'RECEPTOR',
          telefone: null,
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
          emailVerified: null,
        },
      })
    })
  })
})

