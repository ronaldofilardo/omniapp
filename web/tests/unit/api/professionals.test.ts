import { POST, GET, PUT, DELETE } from '@/app/api/professionals/route'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest'
import { auth } from '@/lib/auth'

// Mock auth
vi.mock('../../../src/lib/auth', () => ({
  auth: vi.fn(),
}))

// Desabilita o mock global do Prisma para este teste usar o banco real
vi.unmock('@/lib/prisma')

const prisma = new PrismaClient()

describe('API /api/professionals', () => {
  let createdProfessionalId: string
  let createdUserId: string
  let testCpf: string

  beforeAll(async () => {
    // Cria usuário com e-mail e CPF aleatórios para evitar conflito de chave única
    const randomEmail = `user_${Date.now()}_${Math.floor(Math.random()*10000)}@email.com`
    testCpf = String(Math.floor(10000000000 + Math.random() * 89999999999))
    const user = await prisma.user.create({
      data: {
        email: randomEmail,
        name: 'Usuário Teste',
        password: 'test',
        cpf: testCpf,
      },
    })
    createdUserId = user.id
  })

  afterAll(async () => {
    if (createdProfessionalId) {
      await prisma.professional.delete({ where: { id: createdProfessionalId } })
    }
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } })
    }
  })

  describe('POST /api/professionals', () => {
    it('cria um novo profissional', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const professionalData = {
        name: 'Dr. House',
        specialty: 'Diagnóstico',
        address: '123, Baker Street',
        contact: '999-888-777',
      }

      const request = new Request('http://localhost/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(professionalData),
      })

      const response = await POST(request)
      const data = await response.json()

      createdProfessionalId = data.id // Guarda o ID para limpeza

      expect(response.status).toBe(201)
      expect(data.name).toBe(professionalData.name)
      expect(data.specialty).toBe(professionalData.specialty)
    })

    it('retorna erro 401 quando usuário não está autenticado', async () => {
      ;(auth as any).mockResolvedValue(null)

      const professionalData = {
        name: 'Dr. Test',
        specialty: 'Teste',
      }

      const request = new Request('http://localhost/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(professionalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Não autorizado')
    })

    it('retorna erro 400 quando nome não é fornecido', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const professionalData = {
        specialty: 'Teste',
      }

      const request = new Request('http://localhost/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(professionalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Nome é obrigatório.')
    })

    it('define especialidade como "A ser definido" quando não fornecida', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const professionalData = {
        name: 'Dr. Sem Especialidade',
      }

      const request = new Request('http://localhost/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(professionalData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.specialty).toBe('A ser definido')
    })
  })

  describe('GET /api/professionals', () => {
    it('retorna lista de profissionais do usuário', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const request = new Request('http://localhost/api/professionals')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('retorna erro 401 quando usuário não está autenticado', async () => {
      ;(auth as any).mockResolvedValue(null)

      const request = new Request('http://localhost/api/professionals')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Não autorizado')
    })

    it('retorna especialidades únicas quando type=specialties', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const request = new Request('http://localhost/api/professionals?type=specialties')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('PUT /api/professionals', () => {
    it('atualiza profissional existente', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const updateData = {
        id: createdProfessionalId,
        name: 'Dr. House Atualizado',
        specialty: 'Diagnóstico Avançado',
        address: '456, New Street',
        contact: '111-222-333',
      }

      const request = new Request('http://localhost/api/professionals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe(updateData.name)
      expect(data.specialty).toBe(updateData.specialty)
    })

    it('retorna erro 400 quando ID não é fornecido', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const updateData = {
        name: 'Dr. Test',
        specialty: 'Teste',
      }

      const request = new Request('http://localhost/api/professionals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ID, nome e especialidade são obrigatórios.')
    })
  })

  describe('DELETE /api/professionals', () => {
    it('deleta profissional existente', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const request = new Request(`http://localhost/api/professionals?id=${createdProfessionalId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      createdProfessionalId = '' // Já foi deletado
    })

    it('retorna erro 400 quando ID não é fornecido', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const request = new Request('http://localhost/api/professionals', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ID do profissional é obrigatório.')
    })

    it('retorna erro 404 quando profissional não existe', async () => {
      ;(auth as any).mockResolvedValue({ id: createdUserId, role: 'RECEPTOR' })

      const request = new Request('http://localhost/api/professionals?id=non-existent-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Profissional não encontrado.')
    })
  })
})
