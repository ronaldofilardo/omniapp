import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/auth/login/route'

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock do bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}))

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Helper para criar mock de request com headers
function createMockRequest(body: any) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: vi.fn((key: string) => {
        if (key === 'x-forwarded-for') return '127.0.0.1'
        if (key === 'user-agent') return 'test-agent'
        return null
      }),
    },
  } as any
}

describe('/api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock bcrypt.compare para sempre retornar true
    ;(bcrypt.compare as any).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('deve permitir login para labor@omni.com mesmo sem email verificado', async () => {
    // Mock do usuário labor@omni.com sem email verificado
    prisma.user.findFirst.mockResolvedValue({
      id: '1',
      email: 'labor@omni.com',
      password: 'hashed-password',
      name: 'Laboratório Omni',
      role: 'EMISSOR',
      emailVerified: null, // Não verificado
      emissorInfo: {
        clinicName: 'Laboratório Omni',
        cnpj: '12.345.678/0001-99',
      },
    })

    const request = {
      json: vi.fn().mockResolvedValue({
        email: 'labor@omni.com',
        password: '123456',
      }),
      headers: {
        get: vi.fn((key: string) => {
          if (key === 'x-forwarded-for') return '127.0.0.1'
          if (key === 'user-agent') return 'test-agent'
          return null
        }),
      },
    } as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('labor@omni.com')
    expect(data.user.role).toBe('EMISSOR')
  })

  it('deve permitir login para admin@omni.com mesmo sem email verificado', async () => {
    // Mock do usuário admin@omni.com sem email verificado
    prisma.user.findFirst.mockResolvedValue({
      id: '4',
      email: 'admin@omni.com',
      password: 'hashed-password',
      name: 'Admin Omni',
      role: 'ADMIN',
      emailVerified: null, // Não verificado
    })

    const request = createMockRequest({
      email: 'admin@omni.com',
      password: '123456',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('admin@omni.com')
    expect(data.user.role).toBe('ADMIN')
  })

  it('deve bloquear login para outros usuários sem email verificado', async () => {
    // Mock de outro usuário sem email verificado
    prisma.user.findFirst.mockResolvedValue({
      id: '2',
      email: 'outro@exemplo.com',
      password: 'hashed-password',
      name: 'Outro Usuário',
      role: 'RECEPTOR',
      emailVerified: null, // Não verificado
    })

    const request = createMockRequest({
      email: 'test@exemplo.com',
      password: '123456',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada (e spam).')
  })

  it('deve permitir login para usuários com email verificado', async () => {
    // Mock de usuário com email verificado
    prisma.user.findFirst.mockResolvedValue({
      id: '3',
      email: 'verificado@exemplo.com',
      password: 'hashed-password',
      name: 'Usuário Verificado',
      role: 'RECEPTOR',
      emailVerified: new Date(), // Verificado
    })

    const request = createMockRequest({
      email: 'verificado@exemplo.com',
      password: '123456',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('verificado@exemplo.com')
  })

  it('deve retornar erro para credenciais inválidas', async () => {
    // Mock de usuário não encontrado
    prisma.user.findFirst.mockResolvedValue(null)

    const request = createMockRequest({
      email: 'naoexiste@exemplo.com',
      password: '123456',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Credenciais inválidas')
  })

  it('deve retornar erro para senha incorreta', async () => {
    // Mock bcrypt.compare para retornar false
    ;(bcrypt.compare as any).mockResolvedValue(false)

    prisma.user.findFirst.mockResolvedValue({
      id: '4',
      email: 'teste@exemplo.com',
      password: 'hashed-password',
      name: 'Teste',
      role: 'RECEPTOR',
      emailVerified: new Date(),
    })

    const request = createMockRequest({
      email: 'teste@exemplo.com',
      password: 'senhaerrada',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Credenciais inválidas')
  })
})
