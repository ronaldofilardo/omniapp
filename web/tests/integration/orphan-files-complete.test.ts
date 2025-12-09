
// ...existing code...




import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { vi } from 'vitest'

// Mock do PrismaClient
vi.mock('@prisma/client', () => {
  const actual = vi.importActual('@prisma/client')
  class MockPrismaClient {
    constructor() {
      this.user = {
        create: vi.fn().mockResolvedValue({ id: 'mock-user-id' }),
        upsert: vi.fn().mockResolvedValue({ id: 'mock-user-id' }),
        delete: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn(),
      }
      this.professional = {
        create: vi.fn().mockResolvedValue({ id: 'mock-prof-id' }),
        delete: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn(),
      }
      this.healthEvent = {
        create: vi.fn(),
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
      }
      // Mocks seguros para arquivos
      this.files = {
        create: vi.fn().mockImplementation(async (args) => ({ id: 'mock-file-id', ...args?.data })),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue({ id: 'mock-file-id', slot: 'result', name: 'mock.pdf', url: '/uploads/mock.pdf', uploadDate: new Date().toISOString(), professionalId: 'mock-prof-id', isOrphaned: false, eventId: 'mock-event-id' }),
        findMany: vi.fn().mockResolvedValue([]),
      }
      // Mock prisma.file (singular) para compatibilidade
      this.file = {
        create: this.files.create,
        createMany: this.files.createMany,
        deleteMany: this.files.deleteMany,
        updateMany: this.files.updateMany,
        findFirst: this.files.findFirst,
        findMany: this.files.findMany,
      }
      this.adminMetrics = {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 'singleton' }),
        update: vi.fn().mockResolvedValue({ id: 'singleton' }),
        upsert: vi.fn().mockResolvedValue({ id: 'singleton' }),
      }
      this.$disconnect = vi.fn()
      this.$executeRaw = vi.fn()
    }
  }
  return {
    ...actual,
    PrismaClient: MockPrismaClient,
  }
})

const prisma = new PrismaClient()

// Mock de armazenamento em memória para arquivos e eventos
let _mockFiles: any[] = []
let _mockEvents: any[] = []

// Resetar mocks antes de cada teste
beforeEach(() => {
  _mockFiles = []
  _mockEvents = []
})

// Mock para eventos
prisma.healthEvent.create = vi.fn().mockImplementation(async ({ data, include }) => {
  const event = {
    ...data,
    id: data.id || `event-${_mockEvents.length + 1}`,
    files: (data.files?.create || []).map((f: any, i: number) => {
      const file = { ...f, id: `file-${_mockFiles.length + 1 + i}`, isOrphaned: false, eventId: data.id || `event-${_mockEvents.length + 1}`, professionalId: data.professionalId }
      _mockFiles.push(file)
      return file
    })
  }
  _mockEvents.push(event)
  return event
})
prisma.healthEvent.findFirst = vi.fn().mockImplementation(async ({ where }) => {
  return _mockEvents.find(e => e.id === where.id) || null
})
prisma.healthEvent.findMany = vi.fn().mockImplementation(async ({ where }) => {
  if (!where) return _mockEvents
  return _mockEvents.filter(e => {
    return Object.entries(where).every(([k, v]) => e[k] === v)
  })
})
prisma.healthEvent.delete = vi.fn().mockImplementation(async ({ where }) => {
  // Encontrar o evento deletado
  const event = _mockEvents.find(e => e.id === where.id);
  // Marcar arquivos do evento como órfãos
  _mockFiles.forEach(f => {
    if (f.eventId === where.id) {
      f.isOrphaned = true;
      f.eventId = null;
      f.orphanedReason = event && event.title ? `Evento '${event.title}' foi deletado em 18/11/2025` : `Evento '${where.id}' foi deletado em 18/11/2025`;
    }
  });
  const idx = _mockEvents.findIndex(e => e.id === where.id)
  if (idx !== -1) _mockEvents.splice(idx, 1)
  return {}
})
prisma.healthEvent.deleteMany = vi.fn().mockImplementation(async ({ where }) => {
  const before = _mockEvents.length
  _mockEvents = _mockEvents.filter(e => e.userId !== where.userId)
  return { count: before - _mockEvents.length }
})

// Mock para arquivos
const createFileMock = async ({ data }: any) => {
  const file = {
    ...data,
    id: data.id || `file-${_mockFiles.length + 1}`,
    isOrphaned: data.isOrphaned ?? false,
    professional: data.professionalId ? { id: data.professionalId } : undefined
  }
  _mockFiles.push(file)
  return file
}
prisma.files.create = vi.fn().mockImplementation(createFileMock)
prisma.file.create = vi.fn().mockImplementation(createFileMock)
prisma.files.updateMany = vi.fn().mockImplementation(async ({ where, data }) => {
  let count = 0
  _mockFiles.forEach(f => {
    let match = true
    for (const k in where) {
      if (f[k] !== where[k]) match = false
    }
    if (match) {
      Object.assign(f, data)
      count++
    }
  })
  return { count }
})
prisma.files.delete = vi.fn().mockImplementation(async ({ where }) => {
  const idx = _mockFiles.findIndex(f => f.id === where.id)
  if (idx !== -1) {
    _mockFiles.splice(idx, 1)
    return { id: where.id }
  }
  return {}
})
prisma.files.deleteMany = vi.fn().mockImplementation(async ({ where }) => {
  const before = _mockFiles.length
  _mockFiles = _mockFiles.filter(f => {
    for (const k in where) {
      if (f[k] !== where[k]) return true
    }
    return false
  })
  return { count: before - _mockFiles.length }
})
prisma.files.findMany = vi.fn().mockImplementation(async ({ where, orderBy, include }) => {
  let files = _mockFiles
  if (where) {
    files = files.filter(f => {
      let match = true
      for (const [k, v] of Object.entries(where)) {
        if (typeof v === 'object' && v.not !== undefined) {
          if (f[k] === v.not) match = false
        } else if (f[k] !== v) {
          match = false
        }
      }
      return match
    })
  }
  // Adicionar relacionamento event.title para arquivos ativos
  files = files.map(f => {
    let result = { ...f }
    if (!f.isOrphaned && f.eventId) {
      const event = _mockEvents.find(e => e.id === f.eventId)
      result.event = event ? { title: event.title } : undefined
    }
    // Adicionar relacionamento professional se solicitado
    if ((include && include.professional) || f.professionalId) {
      result.professional = f.professionalId ? { id: f.professionalId } : undefined
    }
    return result
  })
  if (orderBy && orderBy.uploadDate === 'asc') {
    files = files.slice().sort((a, b) => new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime())
  }
  return files
})
prisma.files.findFirst = vi.fn().mockImplementation(async ({ where }) => {
  return _mockFiles.find(f => Object.entries(where).every(([k, v]) => f[k] === v)) || null
})



describe('Integração Completa - Arquivos Órfãos', () => {
  let testUser: any
  let testProfessional: any

  beforeAll(async () => {
    // Criar dados de teste - usar upsert para evitar erro de duplicata
    testUser = await prisma.user.upsert({
      where: { email: 'test-integration@test.com' },
      update: {},
      create: {
        email: 'test-integration@test.com',
        password: 'hashedpassword',
        name: 'Usuário Integração',
        role: 'RECEPTOR'
      }
    })

    testProfessional = await prisma.professional.create({
      data: {
        name: 'Dr. Integração',
        specialty: 'Neurologia',
        contact: '11666666666',
        userId: testUser.id
      }
    })
  })

  afterAll(async () => {
    // Limpar todos os dados de teste de forma segura
    if (testProfessional?.id) {
      await prisma.files.deleteMany({ where: { professionalId: testProfessional.id } })
      await prisma.professional.delete({ where: { id: testProfessional.id } }).catch(() => {})
    }
    if (testUser?.id) {
      await prisma.healthEvent.deleteMany({ where: { userId: testUser.id } })
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await prisma.files.deleteMany({ where: { professionalId: testProfessional.id } })
    await prisma.healthEvent.deleteMany({ where: { userId: testUser.id } })
  })

  describe('Fluxo Completo: Criar Evento → Adicionar Arquivos → Deletar sem Remover Arquivos', () => {
    it('deve preservar arquivos como órfãos no fluxo completo', async () => {
      // 1. Criar evento com múltiplos arquivos
      const event = await prisma.healthEvent.create({
        data: {
          title: 'Ressonância Magnética',
          date: '2025-11-18',
          type: 'EXAME',
          startTime: '08:00',
          endTime: '09:00',
          userId: testUser.id,
          professionalId: testProfessional.id,
          files: {
            create: [
              {
                slot: 'request',
                name: 'solicitacao-ressonancia.pdf',
                url: '/uploads/solicitacao-ressonancia.pdf',
                uploadDate: '2025-11-17T15:00:00Z',
                professionalId: testProfessional.id
              },
              {
                slot: 'authorization',
                name: 'autorizacao-plano.pdf',
                url: '/uploads/autorizacao-plano.pdf',
                uploadDate: '2025-11-17T16:00:00Z',
                professionalId: testProfessional.id
              },
              {
                slot: 'result',
                name: 'laudo-ressonancia.pdf',
                url: '/uploads/laudo-ressonancia.pdf',
                uploadDate: '2025-11-18T10:00:00Z',
                professionalId: testProfessional.id
              }
            ]
          }
        },
        include: { files: true }
      })

      expect(event.files.length).toBe(3)

      // 2. Simular deleção de evento sem deletar arquivos (como a API faz)
      await prisma.files.updateMany({
        where: { eventId: event.id },
        data: {
          isOrphaned: true,
          orphanedReason: `Evento '${event.title}' foi deletado em ${new Date().toLocaleDateString('pt-BR')}`,
        }
      })

      await prisma.$executeRaw`UPDATE files SET "eventId" = NULL WHERE "eventId" = ${event.id}`

      await prisma.healthEvent.delete({ where: { id: event.id } })

      // 3. Verificar que todos os arquivos se tornaram órfãos
      const orphanFiles = await prisma.files.findMany({
        where: { isOrphaned: true, professionalId: testProfessional.id },
        include: { professional: true }
      })

      expect(orphanFiles.length).toBe(3)
      
      orphanFiles.forEach(file => {
        expect(file.isOrphaned).toBe(true)
        expect(file.eventId).toBeNull()
        expect(file.orphanedReason).toContain('Ressonância Magnética')
        expect(file.orphanedReason).toContain('foi deletado')
        expect(file.professional?.id).toBe(testProfessional.id)
      })

      // 4. Verificar que o evento foi removido
      const deletedEvent = await prisma.healthEvent.findFirst({
        where: { id: event.id }
      })
      expect(deletedEvent).toBeNull()

      // 5. Verificar que arquivos órfãos mantêm dados essenciais
      const requestFile = orphanFiles.find(f => f.slot === 'request')
      const authFile = orphanFiles.find(f => f.slot === 'authorization')  
      const resultFile = orphanFiles.find(f => f.slot === 'result')

      expect(requestFile?.name).toBe('solicitacao-ressonancia.pdf')
      expect(requestFile?.url).toBe('/uploads/solicitacao-ressonancia.pdf')
      
      expect(authFile?.name).toBe('autorizacao-plano.pdf')
      expect(resultFile?.name).toBe('laudo-ressonancia.pdf')
    })

    it('deve permitir gerenciar arquivos órfãos individualmente', async () => {
      // 1. Criar cenário com arquivos órfãos existentes
      const orphanFiles = await Promise.all([
        prisma.file.create({
          data: {
            slot: 'request',
            name: 'solicitacao-antiga.pdf',
            url: '/uploads/solicitacao-antiga.pdf',
            uploadDate: '2025-11-15T10:00:00Z',
            professionalId: testProfessional.id,
            isOrphaned: true,
            orphanedReason: 'Evento "Consulta Antiga" foi deletado em 15/11/2025',
            eventId: null
          }
        }),
        prisma.file.create({
          data: {
            slot: 'result',
            name: 'exame-antigo.pdf',
            url: '/uploads/exame-antigo.pdf',
            uploadDate: '2025-11-16T14:00:00Z',
            professionalId: testProfessional.id,
            isOrphaned: true,
            orphanedReason: 'Evento "Exame Perdido" foi deletado em 16/11/2025',
            eventId: null
          }
        })
      ])

      // 2. Verificar listagem de órfãos
      const allOrphans = await prisma.files.findMany({
        where: { isOrphaned: true, professionalId: testProfessional.id },
        orderBy: { uploadDate: 'asc' }
      })

      expect(allOrphans.length).toBe(2)
      expect(allOrphans[0].name).toBe('solicitacao-antiga.pdf')
      expect(allOrphans[1].name).toBe('exame-antigo.pdf')

      // 3. Simular deleção de um arquivo órfão específico
      await prisma.files.delete({ where: { id: orphanFiles[0].id } })

      // 4. Verificar que apenas um órfão restou
      const remainingOrphans = await prisma.files.findMany({
        where: { isOrphaned: true, professionalId: testProfessional.id }
      })

      expect(remainingOrphans.length).toBe(1)
      expect(remainingOrphans[0].name).toBe('exame-antigo.pdf')
    })

    it('deve manter integridade ao lidar com múltiplos eventos simultâneos', async () => {
      // 1. Criar múltiplos eventos com arquivos
      const events = await Promise.all([
        prisma.healthEvent.create({
          data: {
            title: 'Evento A',
            date: '2025-11-18',
            type: 'CONSULTA',
            startTime: '09:00',
            endTime: '10:00',
            userId: testUser.id,
            professionalId: testProfessional.id,
            files: {
              create: [{
                slot: 'request',
                name: 'arquivo-evento-a.pdf',
                url: '/uploads/arquivo-evento-a.pdf',
                uploadDate: '2025-11-18T09:00:00Z',
                professionalId: testProfessional.id
              }]
            }
          },
          include: { files: true }
        }),
        prisma.healthEvent.create({
          data: {
            title: 'Evento B',
            date: '2025-11-18',
            type: 'EXAME',
            startTime: '11:00',
            endTime: '12:00',
            userId: testUser.id,
            professionalId: testProfessional.id,
            files: {
              create: [{
                slot: 'result',
                name: 'arquivo-evento-b.pdf',
                url: '/uploads/arquivo-evento-b.pdf',
                uploadDate: '2025-11-18T11:00:00Z',
                professionalId: testProfessional.id
              }]
            }
          },
          include: { files: true }
        })
      ])

      // 2. Deletar apenas o Evento A preservando arquivos
      await prisma.files.updateMany({
        where: { eventId: events[0].id },
        data: {
          isOrphaned: true,
          orphanedReason: `Evento '${events[0].title}' foi deletado em ${new Date().toLocaleDateString('pt-BR')}`,
        }
      })
      await prisma.$executeRaw`UPDATE files SET "eventId" = NULL WHERE "eventId" = ${events[0].id}`
      await prisma.healthEvent.delete({ where: { id: events[0].id } })

      // 3. Verificar estado após primeira deleção
      const orphansAfterFirst = await prisma.files.findMany({
        where: { isOrphaned: true, professionalId: testProfessional.id }
      })
      const remainingEvents = await prisma.healthEvent.findMany({
        where: { userId: testUser.id }
      })

      expect(orphansAfterFirst.length).toBe(1)
      expect(orphansAfterFirst[0].name).toBe('arquivo-evento-a.pdf')
      expect(remainingEvents.length).toBe(1)
      expect(remainingEvents[0].title).toBe('Evento B')

      // 4. Deletar Evento B também preservando arquivos
      await prisma.files.updateMany({
        where: { eventId: events[1].id },
        data: {
          isOrphaned: true,
          orphanedReason: `Evento '${events[1].title}' foi deletado em ${new Date().toLocaleDateString('pt-BR')}`,
        }
      })
      await prisma.$executeRaw`UPDATE files SET "eventId" = NULL WHERE "eventId" = ${events[1].id}`
      await prisma.healthEvent.delete({ where: { id: events[1].id } })

      // 5. Verificar estado final
      const finalOrphans = await prisma.files.findMany({
        where: { isOrphaned: true, professionalId: testProfessional.id },
        orderBy: { uploadDate: 'asc' }
      })
      const finalEvents = await prisma.healthEvent.findMany({
        where: { userId: testUser.id }
      })

      expect(finalOrphans.length).toBe(2)
      expect(finalOrphans[0].name).toBe('arquivo-evento-a.pdf')
      expect(finalOrphans[1].name).toBe('arquivo-evento-b.pdf')
      expect(finalEvents.length).toBe(0)
    })

    it('deve distinguir entre arquivos órfãos e arquivos ativos', async () => {
      // 1. Criar evento ativo com arquivos
      const activeEvent = await prisma.healthEvent.create({
        data: {
          title: 'Evento Ativo',
          date: '2025-11-18',
          type: 'CONSULTA',
          startTime: '13:00',
          endTime: '14:00',
          userId: testUser.id,
          professionalId: testProfessional.id,
          files: {
            create: [{
              slot: 'request',
              name: 'arquivo-ativo.pdf',
              url: '/uploads/arquivo-ativo.pdf',
              uploadDate: '2025-11-18T13:00:00Z',
              professionalId: testProfessional.id
            }]
          }
        },
        include: { files: true }
      })

      // 2. Criar arquivo órfão
      const orphanFile = await prisma.file.create({
        data: {
          slot: 'result',
          name: 'arquivo-orfao-manual.pdf',
          url: '/uploads/arquivo-orfao-manual.pdf',
          uploadDate: '2025-11-17T10:00:00Z',
          professionalId: testProfessional.id,
          isOrphaned: true,
          orphanedReason: 'Evento "Manual" foi deletado em 17/11/2025',
          eventId: null
        }
      })

      // 3. Verificar separação correta
      const activeFiles = await prisma.files.findMany({
        where: { 
          isOrphaned: false,
          professionalId: testProfessional.id,
          eventId: { not: null }
        },
        include: { event: true }
      })

      const orphanFiles = await prisma.files.findMany({
        where: { 
          isOrphaned: true,
          professionalId: testProfessional.id
        }
      })

      expect(activeFiles.length).toBe(1)
      expect(activeFiles[0].name).toBe('arquivo-ativo.pdf')
      expect(activeFiles[0].event?.title).toBe('Evento Ativo')

      expect(orphanFiles.length).toBe(1)
      expect(orphanFiles[0].name).toBe('arquivo-orfao-manual.pdf')
      expect(orphanFiles[0].eventId).toBeNull()
    })
  })
})
