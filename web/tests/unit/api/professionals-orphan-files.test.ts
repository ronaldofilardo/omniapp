import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DELETE } from '@/app/api/professionals/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Mock auth
vi.mock('../../../src/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock prisma
vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    professional: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    files: {
      create: vi.fn(),
    },
  },
}))

describe('DELETE /api/professionals - Correção: physicalPath em arquivos órfãos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(auth as any).mockResolvedValue({ id: 'user-1', role: 'ADMIN' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve criar arquivos órfãos com physicalPath ao deletar profissional', async () => {
    const mockProfessional = {
      id: 'prof-1',
      name: 'Dr. João Silva',
      userId: 'user-1',
      events: [
        {
          id: 'event-1',
          files: [
            {
              id: 'file-1',
              slot: 'result',
              name: 'exame.pdf',
              url: '/uploads/exame.pdf',
              physicalPath: '/var/www/uploads/exame.pdf',
              uploadDate: '2025-11-20',
              expiryDate: null,
            },
          ],
        },
      ],
    }

    ;(prisma.professional.findUnique as any).mockResolvedValue(mockProfessional)
    ;(prisma.professional.delete as any).mockResolvedValue(mockProfessional)
    ;(prisma.files.create as any).mockResolvedValue({})

    const request = new Request('http://localhost/api/professionals?id=prof-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    
    expect(response.status).toBe(200)

    // Verificar que files.create foi chamado com physicalPath
    expect(prisma.files.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        physicalPath: '/var/www/uploads/exame.pdf',
        isOrphaned: true,
        orphanedReason: 'Profissional deletado: Dr. João Silva',
      }),
    })
  })

  it('deve incluir todos os campos obrigatórios ao criar arquivo órfão', async () => {
    const mockProfessional = {
      id: 'prof-2',
      name: 'Dra. Maria Santos',
      userId: 'user-1',
      events: [
        {
          id: 'event-2',
          files: [
            {
              id: 'file-2',
              slot: 'prescription',
              name: 'receita.pdf',
              url: '/uploads/receita.pdf',
              physicalPath: '/var/www/uploads/receita.pdf',
              uploadDate: '2025-11-21',
              expiryDate: '2025-12-21',
            },
          ],
        },
      ],
    }

    ;(prisma.professional.findUnique as any).mockResolvedValue(mockProfessional)
    ;(prisma.professional.delete as any).mockResolvedValue(mockProfessional)
    ;(prisma.files.create as any).mockResolvedValue({})

    const request = new Request('http://localhost/api/professionals?id=prof-2', {
      method: 'DELETE',
    })

    await DELETE(request)

    // Verificar que todos os campos foram incluídos
    expect(prisma.files.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 'event-2',
        professionalId: null,
        slot: 'prescription',
        name: 'receita.pdf',
        url: '/uploads/receita.pdf',
        physicalPath: '/var/www/uploads/receita.pdf',
        uploadDate: '2025-11-21',
        expiryDate: '2025-12-21',
        isOrphaned: true,
        orphanedReason: 'Profissional deletado: Dra. Maria Santos',
      }),
    })
  })

  it('deve processar múltiplos arquivos corretamente', async () => {
    const mockProfessional = {
      id: 'prof-3',
      name: 'Dr. Pedro Costa',
      userId: 'user-1',
      events: [
        {
          id: 'event-3',
          files: [
            {
              id: 'file-3',
              slot: 'result',
              name: 'exame1.pdf',
              url: '/uploads/exame1.pdf',
              physicalPath: '/var/www/uploads/exame1.pdf',
              uploadDate: '2025-11-19',
              expiryDate: null,
            },
            {
              id: 'file-4',
              slot: 'prescription',
              name: 'receita1.pdf',
              url: '/uploads/receita1.pdf',
              physicalPath: '/var/www/uploads/receita1.pdf',
              uploadDate: '2025-11-19',
              expiryDate: '2025-12-19',
            },
          ],
        },
      ],
    }

    ;(prisma.professional.findUnique as any).mockResolvedValue(mockProfessional)
    ;(prisma.professional.delete as any).mockResolvedValue(mockProfessional)
    ;(prisma.files.create as any).mockResolvedValue({})

    const request = new Request('http://localhost/api/professionals?id=prof-3', {
      method: 'DELETE',
    })

    await DELETE(request)

    // Deve ter criado 2 arquivos órfãos
    expect(prisma.files.create).toHaveBeenCalledTimes(2)
  })
})
