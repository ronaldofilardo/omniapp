import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do RLS middleware
vi.mock('@/lib/middleware/rls', () => ({
  setRLSContext: vi.fn().mockResolvedValue(undefined),
  withRLS: vi.fn((req, handler) => handler(req)),
}))

// Mock do lib/auth.ts
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do lib/prisma.ts
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}))

// Importar a rota e os mocks depois
import { GET } from '@/app/api/users/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Criar referências tipadas
const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return users list for admin user', async () => {
      const mockUser = {
        id: 'admin-1',
        role: 'ADMIN',
      }

      const mockUsers = [
        {
          id: 'user-1',
          email: 'receptor@example.com',
          name: 'Receptor User',
          role: 'RECEPTOR',
          createdAt: '2023-01-01T00:00:00.000Z',
          cpf: '12345678901',
          telefone: '11999999999',
          emissorInfo: null,
        },
        {
          id: 'user-2',
          email: 'emissor@example.com',
          name: 'Emissor User',
          role: 'EMISSOR',
          createdAt: '2023-01-02T00:00:00.000Z',
          cpf: null,
          telefone: '11888888888',
          emissorInfo: {
            clinicName: 'Clinic Test',
            cnpj: '12345678000199',
            address: 'Rua Teste, 123',
            contact: '11777777777',
          },
        },
      ]

      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)

      const mockRequest = {
        url: 'http://localhost:3000/api/users',
      } as any

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toEqual(mockUsers)
      expect(mockAuth).toHaveBeenCalled()
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          cpf: true,
          telefone: true,
          emissorInfo: {
            select: {
              clinicName: true,
              cnpj: true,
              address: true,
              contact: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should filter users by role when query param is provided', async () => {
      const mockUser = {
        id: 'admin-1',
        role: 'ADMIN',
      }

      const mockUsers = [
        {
          id: 'user-1',
          email: 'receptor@example.com',
          name: 'Receptor User',
          role: 'RECEPTOR',
          createdAt: '2023-01-01T00:00:00.000Z',
          cpf: '12345678901',
          telefone: '11999999999',
          emissorInfo: null,
        },
      ]

      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)

      const mockRequest = {
        url: 'http://localhost:3000/api/users?role=RECEPTOR',
      } as any

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toEqual(mockUsers)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'RECEPTOR' },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return 403 for non-admin user', async () => {
      const mockUser = {
        id: 'user-1',
        role: 'RECEPTOR',
      }

      mockAuth.mockResolvedValue(mockUser)

      const mockRequest = {
        url: 'http://localhost:3000/api/users',
      } as any

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.detail || data.error).toContain('autorizado')
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled()
    })

    it('should return 403 when no authenticated user', async () => {
      mockAuth.mockResolvedValue(null)

      const mockRequest = {
        url: 'http://localhost:3000/api/users',
      } as any

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.detail || data.error).toContain('autorizado')
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled()
    })

    it('should return 500 on database error', async () => {
      const mockUser = {
        id: 'admin-1',
        role: 'ADMIN',
      }

      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'))

      const mockRequest = {
        url: 'http://localhost:3000/api/users',
      } as any

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.detail || data.error || data.title).toBeDefined()
    })
  })
})

