import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Performance - Arquivos Órfãos', () => {
  describe('Consultas de Performance', () => {
    it('deve executar busca de arquivos órfãos em tempo aceitável', async () => {
      const startTime = Date.now()
      
      const orphanFiles = await prisma.files.findMany({
        where: { isOrphaned: true },
        include: {
          professionals: true,
          health_events: true
        },
        take: 100
      })
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      // Deve executar em menos de 500ms
      expect(executionTime).toBeLessThan(500)
      expect(Array.isArray(orphanFiles)).toBe(true)
    })

    it('deve executar contagem de arquivos órfãos eficientemente', async () => {
      const startTime = Date.now()
      
      const count = await prisma.files.count({
        where: { isOrphaned: true }
      })
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      // Contagem deve ser muito rápida
      expect(executionTime).toBeLessThan(100)
      expect(typeof count).toBe('number')
    })

    it('deve executar update de múltiplos arquivos em transação eficientemente', async () => {
      // Criar dados de teste temporários
      const testUser = await prisma.user.upsert({
        where: { email: 'perf-test@test.com' },
        update: {},
        create: {
          email: 'perf-test@test.com',
          password: 'hash',
          name: 'Perf Test',
          role: 'RECEPTOR'
        }
      })

      const testProfessional = await prisma.professional.create({
        data: {
          name: 'Dr. Performance',
          specialty: 'Test',
          contact: '11999999999',
          userId: testUser.id
        }
      })

      const testEvent = await prisma.healthEvent.create({
        data: {
          title: 'Performance Test Event',
          date: new Date('2025-11-18'),
          type: 'EXAME',
          startTime: new Date('2025-11-18T10:00:00Z'),
          endTime: new Date('2025-11-18T11:00:00Z'),
          userId: testUser.id,
          professionalId: testProfessional.id,
          files: {
            create: [
              {
                id: 'perf-file-1',
                slot: 'request',
                name: 'perf-file-1.pdf',
                url: '/uploads/perf-file-1.pdf',
                uploadDate: new Date('2025-11-18T10:00:00Z'),
                professionalId: testProfessional.id,
                physicalPath: '/uploads/perf-file-1.pdf'
              },
              {
                id: 'perf-file-2',
                slot: 'result',
                name: 'perf-file-2.pdf',
                url: '/uploads/perf-file-2.pdf',
                uploadDate: new Date('2025-11-18T10:00:00Z'),
                professionalId: testProfessional.id,
                physicalPath: '/uploads/perf-file-2.pdf'
              }
            ]
          }
        }
      })

      const startTime = Date.now()

      // Simular processo de orfanização em transação
      await prisma.$transaction(async (tx) => {
        await tx.files.updateMany({
          where: { eventId: testEvent.id },
          data: {
            isOrphaned: true,
            orphanedReason: `Evento '${testEvent.title}' foi deletado em ${new Date().toLocaleDateString('pt-BR')}`
          }
        })

        await tx.$executeRaw`UPDATE files SET "eventId" = NULL WHERE "eventId" = ${testEvent.id}`
        
        await tx.healthEvent.delete({ where: { id: testEvent.id } })
      })

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Transação deve executar em menos de 1 segundo
      expect(executionTime).toBeLessThan(1000)

      // Limpar dados de teste
      await prisma.files.deleteMany({ where: { professionalId: testProfessional.id } })
      await prisma.professional.delete({ where: { id: testProfessional.id } })
      await prisma.user.delete({ where: { id: testUser.id } })
    })
  })

  describe('Índices e Otimizações', () => {
    it('deve usar índices eficientemente para consultas por isOrphaned', async () => {
      const startTime = Date.now()
      
      // Esta consulta deve usar o índice em isOrphaned se existir
      const orphanFiles = await prisma.files.findMany({
        where: { 
          isOrphaned: true,
          professionalId: { not: null }
        },
        select: {
          id: true,
          name: true,
          isOrphaned: true,
          orphanedReason: true
        },
        take: 50
      })
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      // Deve ser rápida mesmo com select específico
      expect(executionTime).toBeLessThan(300)
      expect(Array.isArray(orphanFiles)).toBe(true)
    })

    it('deve executar consultas com joins eficientemente', async () => {
      const startTime = Date.now()
      
      const orphanFilesWithData = await prisma.files.findMany({
        where: { isOrphaned: true },
        include: {
          professionals: {
            select: {
              id: true,
              name: true,
              specialty: true
            }
          }
        },
        take: 20
      })
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      // Join com professional deve ser eficiente
      expect(executionTime).toBeLessThan(400)
      expect(Array.isArray(orphanFilesWithData)).toBe(true)
    })
  })
})
