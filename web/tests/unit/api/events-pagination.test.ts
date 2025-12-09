import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/events/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock das dependências
vi.mock('@/lib/auth')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    healthEvent: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('GET /api/events - Paginação', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'RECEPTOR',
  }

  const mockEvents = Array.from({ length: 100 }, (_, i) => ({
    id: `event-${i}`,
    title: `Consulta ${i}`,
    description: 'Descrição teste',
    date: new Date('2025-01-15'),
    type: 'CONSULTA',
    startTime: '09:00',
    endTime: '10:00',
    professionalId: 'prof-1',
    professional: {
      id: 'prof-1',
      name: 'Dr. João',
      specialty: 'Cardiologia',
    },
    files: [],
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue(mockUser as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve retornar 20 eventos por padrão (página 1)', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(
      mockEvents.slice(0, 20) as any
    )
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.events).toHaveLength(20)
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    })

    expect(prisma.healthEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      })
    )
  })

  it('deve respeitar o limite máximo de 1000 por página', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents as any)
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events?limit=2000')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.limit).toBe(1000) // Limite máximo aplicado

    expect(prisma.healthEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1000,
      })
    )
  })

  it('deve navegar para página 2 corretamente', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(
      mockEvents.slice(20, 40) as any
    )
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events?page=2')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNext: true,
      hasPrev: true,
    })

    expect(prisma.healthEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20, // (página 2 - 1) * 20
        take: 20,
      })
    )
  })

  it('deve aceitar limite personalizado de 10 eventos', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(
      mockEvents.slice(0, 10) as any
    )
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events?limit=10')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.events).toHaveLength(10)
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrev: false,
    })
  })

  it('deve indicar hasNext=false na última página', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(
      mockEvents.slice(80, 100) as any
    )
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events?page=5&limit=20')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination).toEqual({
      page: 5,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNext: false, // Última página
      hasPrev: true,
    })
  })

  it('deve filtrar apenas arquivos não órfãos', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents as any)
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events')
    await GET(req)

    expect(prisma.healthEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          files: expect.objectContaining({
            where: { isOrphaned: false },
          }),
        }),
      })
    )
  })

  it('deve ordenar eventos por data decrescente', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents as any)
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events')
    await GET(req)

    expect(prisma.healthEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { date: 'desc' },
      })
    )
  })

  it('deve incluir headers de cache de 5 minutos', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents as any)
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events')
    const response = await GET(req)

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=300'
    )
  })

  it('deve retornar 401 se usuário não autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/events')
    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Autenticação necessária' })
  })

  it('deve lidar com página inválida (forçar mínimo 1)', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents as any)
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events?page=-5')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.page).toBe(1) // Forçado para 1
  })

  it('deve lidar com limite inválido (forçar mínimo 1)', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents as any)
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events?limit=0')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.limit).toBe(1) // Forçado para 1
  })

  it('deve selecionar apenas campos necessários (otimização)', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents as any)
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(100)

    const req = new NextRequest('http://localhost/api/events')
    await GET(req)

    expect(prisma.healthEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
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
              specialty: true,
            },
          },
          files: {
            select: {
              id: true,
              slot: true,
              name: true,
              url: true,
              uploadDate: true,
            },
            where: { isOrphaned: false },
          },
        },
      })
    )
  })

  it('deve calcular totalPages corretamente com divisão não exata', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents as any)
    vi.mocked(prisma.healthEvent.count).mockResolvedValue(95) // 95 eventos

    const req = new NextRequest('http://localhost/api/events?limit=20')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.totalPages).toBe(5) // Math.ceil(95/20) = 5
  })

  it('deve retornar erro 500 em caso de falha no banco', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockRejectedValue(
      new Error('Database error')
    )

    const req = new NextRequest('http://localhost/api/events')
    const response = await GET(req)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Erro interno do servidor ao buscar eventos',
      })
    )
  })
})
