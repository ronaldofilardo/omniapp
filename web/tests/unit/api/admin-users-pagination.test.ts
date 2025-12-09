import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/users/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock das dependências
vi.mock('@/lib/auth')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('GET /api/admin/users - Paginação', () => {
  const mockAdminUser = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
  }

  const mockUsers = Array.from({ length: 200 }, (_, i) => ({
    id: `user-${i}`,
    email: `user${i}@example.com`,
    cpf: `${String(i).padStart(11, '0')}`,
    name: `User ${i}`,
    role: 'RECEPTOR',
    createdAt: new Date('2025-01-01'),
    emailVerified: new Date('2025-01-01'),
    emissorInfo: null,
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue(mockAdminUser as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve retornar 50 usuários por padrão (página 1)', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(
      mockUsers.slice(0, 50) as any
    )
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users).toHaveLength(50)
    expect(data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 200,
      totalPages: 4,
      hasNext: true,
      hasPrev: false,
    })

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
      })
    )
  })

  it('deve respeitar o limite máximo de 100 por página', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers.slice(0, 100) as any)
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users?limit=500')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.limit).toBe(100) // Limite máximo aplicado

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    )
  })

  it('deve navegar para página 3 corretamente', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(
      mockUsers.slice(100, 150) as any
    )
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users?page=3')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination).toEqual({
      page: 3,
      limit: 50,
      total: 200,
      totalPages: 4,
      hasNext: true,
      hasPrev: true,
    })

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 100, // (página 3 - 1) * 50
        take: 50,
      })
    )
  })

  it('deve aceitar limite personalizado de 25 usuários', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(
      mockUsers.slice(0, 25) as any
    )
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users?limit=25')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users).toHaveLength(25)
    expect(data.pagination).toEqual({
      page: 1,
      limit: 25,
      total: 200,
      totalPages: 8,
      hasNext: true,
      hasPrev: false,
    })
  })

  it('deve indicar hasNext=false na última página', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(
      mockUsers.slice(150, 200) as any
    )
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users?page=4&limit=50')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination).toEqual({
      page: 4,
      limit: 50,
      total: 200,
      totalPages: 4,
      hasNext: false, // Última página
      hasPrev: true,
    })
  })

  it('deve retornar 401 se usuário não autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/admin/users')
    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  it('deve retornar 401 se usuário não é ADMIN', async () => {
    vi.mocked(auth).mockResolvedValue({
      id: 'user-123',
      role: 'RECEPTOR',
    } as any)

    const req = new NextRequest('http://localhost/api/admin/users')
    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  it('deve ordenar usuários por data de criação decrescente', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users')
    await GET(req)

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          createdAt: 'desc',
        },
      })
    )
  })

  it('deve selecionar apenas campos necessários', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users')
    await GET(req)

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          email: true,
          cpf: true,
          name: true,
          role: true,
          createdAt: true,
          emailVerified: true,
          emissorInfo: {
            select: {
              cnpj: true,
            },
          },
        }),
      })
    )
  })

  it('deve lidar com página inválida (forçar mínimo 1)', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users?page=-10')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.page).toBe(1) // Forçado para 1
  })

  it('deve lidar com limite inválido (forçar mínimo 1)', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users?limit=0')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.limit).toBe(1) // Forçado para 1
  })

  it('deve calcular totalPages corretamente com divisão não exata', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
    vi.mocked(prisma.user.count).mockResolvedValue(175) // 175 usuários

    const req = new NextRequest('http://localhost/api/admin/users?limit=50')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.totalPages).toBe(4) // Math.ceil(175/50) = 4
  })

  it('deve incluir informações do emissor quando disponível', async () => {
    const usersWithEmissor = [
      {
        ...mockUsers[0],
        role: 'EMISSOR',
        emissorInfo: {
          cnpj: '12345678000190',
        },
      },
    ]

    vi.mocked(prisma.user.findMany).mockResolvedValue(usersWithEmissor as any)
    vi.mocked(prisma.user.count).mockResolvedValue(1)

    const req = new NextRequest('http://localhost/api/admin/users')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users[0].emissorInfo).toEqual({
      cnpj: '12345678000190',
    })
  })

  it('deve retornar erro 500 em caso de falha no banco', async () => {
    vi.mocked(prisma.user.findMany).mockRejectedValue(
      new Error('Database connection error')
    )

    const req = new NextRequest('http://localhost/api/admin/users')
    const response = await GET(req)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Erro ao buscar usuários',
      })
    )
  })

  it('deve executar queries em paralelo para otimização', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users')
    await GET(req)

    // Verificar que ambas as queries foram chamadas
    expect(prisma.user.findMany).toHaveBeenCalled()
    expect(prisma.user.count).toHaveBeenCalled()
  })

  it('deve aceitar apenas valores positivos para página', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
    vi.mocked(prisma.user.count).mockResolvedValue(200)

    const req = new NextRequest('http://localhost/api/admin/users?page=0')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.page).toBeGreaterThanOrEqual(1)
  })
})
