import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/events/route'
import { POST as CreateProfessional } from '@/app/api/professionals/route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    professional: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    healthEvent: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    }
  }
}))

describe('Criar Evento a partir do Resultado (API)', () => {
  const mockUserId = 'test-user-id'
  const mockDoctorName = 'Dr. Teste'
  
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock do usuário padrão
    ;(prisma.user.findUnique as any).mockResolvedValue({ id: mockUserId })
    // Mock da criação do profissional
    ;(prisma.professional.create as any).mockResolvedValue({
      id: 'test-prof-id',
      name: mockDoctorName,
      specialty: 'A ser definido',
      userId: mockUserId
    })
    // Mock da criação do evento
    ;(prisma.healthEvent.create as any).mockResolvedValue({
      id: 'test-event-id',
      title: 'Resultado: teste.jpg',
      type: 'EXAME',
      professionalId: 'test-prof-id'
    })
  })

  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip('cria profissional automaticamente ao criar evento do resultado', async () => {
    const mockProfessionalId = 'test-prof-id'
    const mockEventId = 'test-event-id'

    // Criar profissional
    const profRequest = new Request('http://localhost/api/professionals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: mockDoctorName,
        specialty: 'A ser definido',
        userId: mockUserId
      })
    })

    const profResponse = await CreateProfessional(profRequest)
    const profData = await profResponse.json()

    expect(profResponse.status).toBe(201)
    expect(profData.id).toBe(mockProfessionalId)
    expect(profData.name).toBe(mockDoctorName)
    expect(prisma.professional.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: mockDoctorName,
        specialty: 'A ser definido',
        userId: mockUserId
      })
    })

    // Criar evento vinculado ao profissional
    const eventRequest = new Request('http://localhost/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Laudo: teste.jpg',
        type: 'EXAME',
        professionalId: mockProfessionalId,
        date: '2025-11-01',
        startTime: '09:00',
        endTime: '09:30',
        files: [{
          slot: 'result',
          name: 'teste.jpg',
          url: 'uploads/teste.jpg'
        }]
      })
    })

    const eventResponse = await POST(eventRequest)
    const eventData = await eventResponse.json()

    expect(eventResponse.status).toBe(201)
    expect(eventData.id).toBe(mockEventId)
    expect(eventData.professionalId).toBe(mockProfessionalId)
    expect(prisma.healthEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'EXAME',
        professionalId: mockProfessionalId
      })
    })
  })
})
