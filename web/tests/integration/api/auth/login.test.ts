import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}))

// Mock do auditService
vi.mock('@/lib/services/auditService', () => ({
  logAuthEvent: vi.fn().mockResolvedValue(undefined),
}))

// Mock do lib/prisma.ts antes de importar a rota
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// Importar a rota e o prisma mockado depois do mock
import { POST } from '@/app/api/auth/login/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Criar referência tipada para o mock
const mockPrisma = prisma as any
const mockBcrypt = bcrypt as any

describe('/api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'RECEPTOR',
        emailVerified: true,
      }

      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'RECEPTOR',
        emailVerified: true,
      })
      expect(data.user).not.toHaveProperty('password')
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: { equals: 'test@example.com', mode: 'insensitive' },
        },
        include: { emissorInfo: true },
      })
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashed-password'
      )
    })

    it('should login successfully with valid credentials for ADMIN', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@omni.com',
        password: 'hashed-password',
        name: 'Admin User',
        role: 'ADMIN',
        emailVerified: true,
      }

      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)

      const requestBody = {
        email: 'admin@omni.com',
        password: '123456',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual({
        id: 'admin-1',
        email: 'admin@omni.com',
        name: 'Admin User',
        role: 'ADMIN',
        emailVerified: true,
      })
      expect(data.user).not.toHaveProperty('password')
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: { equals: 'admin@omni.com', mode: 'insensitive' },
        },
        include: { emissorInfo: true },
      })
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        '123456',
        'hashed-password'
      )
    })

    it('should return 400 for missing email or password', async () => {
      const requestBody = {
        email: 'test@example.com',
        // missing password
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('E-mail e senha são obrigatórios')
    })

    it('should return 401 for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const requestBody = {
        email: 'nonexistent@example.com',
        password: 'password123',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Credenciais inválidas')
    })

    it('should return 401 for invalid password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'RECEPTOR',
        emailVerified: true,
      }

      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(false)

      const requestBody = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Credenciais inválidas')
    })

    it('should return 403 for unverified email', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'RECEPTOR',
        emailVerified: false,
      }

      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada (e spam).')
    })

    it('should allow login for unverified labor@omni.com (test email)', async () => {
      const mockUser = {
        id: 'labor-1',
        email: 'labor@omni.com',
        password: 'hashed-password',
        name: 'Labor User',
        role: 'RECEPTOR',
        emailVerified: false,
      }

      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)

      const requestBody = {
        email: 'labor@omni.com',
        password: 'password123',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.email).toBe('labor@omni.com')
      expect(data.user.emailVerified).toBe(false)
    })

    it('should allow login for unverified admin@omni.com (test email)', async () => {
      const mockUser = {
        id: 'admin-test-1',
        email: 'admin@omni.com',
        password: 'hashed-password',
        name: 'Admin Test User',
        role: 'ADMIN',
        emailVerified: false,
      }

      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)

      const requestBody = {
        email: 'admin@omni.com',
        password: 'password123',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.email).toBe('admin@omni.com')
      expect(data.user.emailVerified).toBe(false)
    })

    it('should return 500 on database error', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'))

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno do servidor')
    })

    it('should return 401 for invalid password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'RECEPTOR',
        emailVerified: true,
      }

      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'))

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
        headers: { get: vi.fn() },
        cookies: {},
        nextUrl: {},
        page: {},
        ua: '',
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno do servidor')
    })
  })
})

