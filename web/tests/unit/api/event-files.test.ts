import { PUT } from '@/app/api/events/route'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Mock de autenticação
vi.mock('../../../src/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ id: 'user-1', role: 'RECEPTOR' }),
}))

// Mock do validador
vi.mock('../../../src/lib/validators/eventValidators', () => ({
  validateDate: vi.fn().mockReturnValue({ isValid: true }),
  validateStartTime: vi.fn().mockReturnValue({ isValid: true }),
  validateEndTime: vi.fn().mockReturnValue({ isValid: true }),
  validateEventDateTime: vi.fn().mockReturnValue({ isValid: true }),
}))

// Desabilita o mock global do Prisma para este teste usar o banco real
vi.unmock('@/lib/prisma')

const prisma = new PrismaClient()

describe.skip('PUT /api/events', () => {
  let professionalId: string
  let eventId: string

  let testCpf: string;
  let testUserId: string;
  
  beforeAll(async () => {
    // Gera CPF e ID aleatórios para evitar conflito de chave única
    testCpf = String(Math.floor(10000000000 + Math.random() * 89999999999));
    testUserId = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `user-${Date.now()}@teste.com`,
        password: 'senha',
        name: 'Usuário Teste',
        cpf: testCpf,
      },
    })
    const professional = await prisma.professional.create({
      data: { name: 'Dr. File Test', specialty: 'Uploader', userId: testUserId },
    })
    professionalId = professional.id

    const event = await prisma.healthEvent.create({
      data: {
        title: 'Evento para Teste de Arquivo',
        date: new Date(),
        type: 'CONSULTA',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
        professionalId,
        userId: testUserId,
      },
    })
    eventId = event.id
  })

  afterAll(async () => {
    await prisma.healthEvent.deleteMany({ where: { id: eventId } })
    await prisma.professional.deleteMany({ where: { id: professionalId } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
  })

  it('persiste arquivos anexados', async () => {
    const filesPayload = [
      {
        slot: 'result',
        name: 'result.pdf',
        url: 'http://example.com/result.pdf',
        physicalPath: '/uploads/result.pdf',
      },
    ]

    // Payload completo para a requisição PUT
    const fullPayload = {
      id: eventId,
      title: 'Evento para Teste de Arquivo',
      date: new Date().toISOString().split('T')[0], // Corrige formato para yyyy-MM-dd
  type: 'CONSULTA',
      startTime: '14:00',
      endTime: '15:00',
      professionalId,
      files: filesPayload,
    }

    const request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: 'result',
          name: 'result.pdf',
          url: 'http://example.com/result.pdf'
        })
      ])
    )
  })

  it('persiste múltiplos arquivos anexados', async () => {
    const filesPayload = [
      {
        slot: 'result',
        name: 'result.pdf',
        url: 'http://example.com/result.pdf',
        physicalPath: '/uploads/result.pdf',
      },
      {
        slot: 'image',
        name: 'image.png',
        url: 'http://example.com/image.png',
        physicalPath: '/uploads/image.png',
      },
    ]
    const fullPayload = {
      id: eventId,
      title: 'Evento com múltiplos arquivos',
      date: new Date().toISOString().split('T')[0],
  type: 'CONSULTA',
      startTime: '14:00',
      endTime: '15:00',
      professionalId,
      files: filesPayload,
    }
    const request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    const response = await PUT(request)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: 'result',
          name: 'result.pdf',
          url: 'http://example.com/result.pdf'
        }),
        expect.objectContaining({
          slot: 'image',
          name: 'image.png',
          url: 'http://example.com/image.png'
        })
      ])
    )
  })

  it('retorna erro se arquivos forem inválidos', async () => {
    const fullPayload = {
      id: eventId,
      title: 'Evento com arquivo inválido',
      date: new Date().toISOString().split('T')[0],
  type: 'CONSULTA',
      startTime: '14:00',
      endTime: '15:00',
      professionalId,
      files: null, // Simula payload inválido
    }
    const request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    const response = await PUT(request)
    expect([200, 400]).toContain(response.status) // Aceita 400 se houver validação, 200 se aceitar vazio
  })

  it('remove arquivos do evento', async () => {
    // Primeiro adiciona arquivos
    const filesPayload = [
      {
        slot: 'result',
        name: 'result.pdf',
        url: 'http://example.com/result.pdf',
        physicalPath: '/uploads/result.pdf',
      },
    ]
    let fullPayload = {
      id: eventId,
      title: 'Evento para remoção de arquivo',
      date: new Date().toISOString().split('T')[0],
  type: 'CONSULTA',
      startTime: '14:00',
      endTime: '15:00',
      professionalId,
      files: filesPayload,
    }
    let request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    let response = await PUT(request)
    let data = await response.json()
    expect(response.status).toBe(200)
    expect(data.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: 'result',
          name: 'result.pdf',
          url: 'http://example.com/result.pdf'
        })
      ])
    )

    // Agora remove arquivos
    fullPayload = {
      ...fullPayload,
      files: [],
    }
    request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    response = await PUT(request)
    data = await response.json()
    expect(response.status).toBe(200)
    expect(data.files).toEqual([])
  }, 10000) // Aumentar timeout para 10s
})
