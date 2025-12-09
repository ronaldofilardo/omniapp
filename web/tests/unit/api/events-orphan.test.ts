import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/events/route'

// Mock de autenticação
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ id: 'user-1', role: 'RECEPTOR' }),
}))

// Estado simples dos mocks
let mockEvents: any[] = []
let mockFiles: any[] = []

// Mock do prisma da lib
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      healthEvent: {
        findUnique: vi.fn().mockImplementation(async ({ where, include }) => {
          const event = mockEvents.find(e => e.id === where.id) || null
          if (event && include?.files) {
            return { ...event, files: mockFiles.filter(f => f.eventId === event.id) }
          }
          return event
        }),
        delete: vi.fn().mockImplementation(async ({ where }) => {
          const event = mockEvents.find(e => e.id === where.id)
          if (event) {
            mockEvents = mockEvents.filter(e => e.id !== where.id)
            return event
          }
          return null
        })
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          cpf: '12345678900',
          name: 'Test User'
        })
      },
      professional: {
        findUnique: vi.fn().mockResolvedValue({ id: 'prof-1', name: 'Dr. Test' })
      },
      files: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      $disconnect: vi.fn()
    }
  }
})

describe('API Events - Arquivos Órfãos', () => {
  beforeEach(() => {
    // Reset mock state
    mockEvents.length = 0
    mockFiles.length = 0
    vi.clearAllMocks()
  })

  it('deve retornar 404 quando evento não existe', async () => {
    // Arrange - evento não existe em mockEvents
    const request = new NextRequest('http://localhost:3000/api/events?userId=test-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'non-existent', deleteFiles: false })
    })

    // Act
    const response = await DELETE(request)
    const result = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(result.error).toBe('Evento não encontrado')
  })

  it('deve retornar 400 quando ID não é fornecido', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/events?userId=test-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteFiles: false })
    })

    // Act
    const response = await DELETE(request)
    const result = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(result.error).toBe('ID do evento é obrigatório')
  })

  it('deve deletar evento quando existe', async () => {
    // Arrange - adicionar evento no mock
    mockEvents.push({ 
      id: 'test-event', 
      title: 'Test Event', 
      userId: 'test-user', 
      professionalId: 'prof-1',
      type: 'CONSULTA',
      date: new Date('2025-11-21'),
      startTime: '10:00',
      endTime: '11:00'
    })
    
    const request = new NextRequest('http://localhost:3000/api/events?userId=test-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-event', deleteFiles: false })
    })

    // Act
    const response = await DELETE(request)
    const result = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
  })

  it('deve marcar arquivos como órfãos quando deleteFiles=false', async () => {
    // Arrange
    mockEvents.push({ 
      id: 'test-event-with-files', 
      title: 'Test Event with Files', 
      userId: 'test-user', 
      professionalId: 'prof-1',
      type: 'CONSULTA',
      date: new Date('2025-11-21'),
      startTime: '10:00',
      endTime: '11:00'
    })
    mockFiles.push({ id: 'file-1', eventId: 'test-event-with-files', name: 'test.pdf' })
    
    const request = new NextRequest('http://localhost:3000/api/events?userId=test-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-event-with-files', deleteFiles: false })
    })

    // Act
    const response = await DELETE(request)
    const result = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
  })

  it('deve deletar arquivos quando deleteFiles=true', async () => {
    // Arrange
    mockEvents.push({ 
      id: 'test-event-delete-files', 
      title: 'Test Event Delete Files', 
      userId: 'test-user',
      professionalId: 'prof-1',
      type: 'EXAME',
      date: new Date('2025-11-21'),
      startTime: '14:00',
      endTime: '15:00'
    })
    mockFiles.push({ id: 'file-2', eventId: 'test-event-delete-files', name: 'exam.pdf' })
    
    const request = new NextRequest('http://localhost:3000/api/events?userId=test-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test-event-delete-files', deleteFiles: true })
    })

    // Act
    const response = await DELETE(request)
    const result = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
  })
})
