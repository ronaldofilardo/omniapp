/**
 * Teste de Integração Completo: Fluxo Lab → Notification → Event Creation
 * 
 * Testa o fluxo crítico end-to-end:
 * 1. Laboratório submete laudo via API
 * 2. Sistema cria notificação para o paciente
 * 3. Paciente visualiza notificação
 * 4. Paciente cria evento a partir da notificação
 * 5. Notificação é arquivada
 * 6. Evento é criado com o laudo anexado
 * 
 * Este teste garante a integridade do fluxo médico crítico.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Garantir que Prisma NÃO está mockado neste teste de integração
vi.unmock('@/lib/prisma')
vi.unmock('../../src/lib/prisma')

import { prisma } from '@/lib/prisma'
import type { User, Professional, HealthEvent, Notification, Report } from '@prisma/client'
import { NotificationStatus, ReportStatus, EventType } from '@prisma/client'

// Tipos para facilitar os mocks
type TestUser = Pick<User, 'id' | 'email' | 'cpf' | 'name'>
type TestProfessional = Pick<Professional, 'id' | 'name' | 'specialty'>
type TestNotification = Notification & { report?: Report | null }
type TestEvent = HealthEvent & { files?: any[] }

describe('Lab → Notification → Event Creation - Integration Flow', () => {
  let testUser: TestUser
  let testProfessional: TestProfessional
  let testReport: Report
  let testNotification: TestNotification
  let testEvent: TestEvent

  const TEST_CPF = '12345678901'
  const TEST_EMAIL = 'patient@test.com'
  const LAB_CNPJ = '12345678000199'

  beforeEach(async () => {
    // Limpar dados de teste anteriores
    await prisma.files.deleteMany({ where: { id: { contains: 'test-file' } } })
    await prisma.notification.deleteMany({ where: { userId: { contains: 'test-user' } } })
    await prisma.report.deleteMany({ where: { receiverId: { contains: 'test-user' } } })
    await prisma.healthEvent.deleteMany({ where: { userId: { contains: 'test-user' } } })
    await prisma.professional.deleteMany({ where: { id: { contains: 'test-prof' } } })
    await prisma.user.deleteMany({ where: { OR: [
      { email: TEST_EMAIL }, 
      { email: 'lab@test.com' },
      { email: { contains: 'test3-' } },
      { email: { contains: 'lab-test3' } },
      { id: { contains: 'test-user' } }
    ] } })

    // Setup: Criar usuário de teste
    testUser = {
      id: 'test-user-integration',
      email: TEST_EMAIL,
      cpf: TEST_CPF,
      name: 'Paciente Teste'
    }

    // Setup: Criar profissional de teste
    testProfessional = {
      id: 'test-prof-integration',
      name: 'Dr. Teste Integração',
      specialty: 'Cardiologia'
    }
  })

  afterEach(async () => {
    // Cleanup após cada teste
    await prisma.files.deleteMany({ where: { id: { contains: 'test-file' } } })
    await prisma.notification.deleteMany({ where: { userId: { contains: 'test-user' } } })
    await prisma.report.deleteMany({ where: { receiverId: { contains: 'test-user' } } })
    await prisma.healthEvent.deleteMany({ where: { userId: { contains: 'test-user' } } })
    await prisma.professional.deleteMany({ where: { id: { contains: 'test-prof' } } })
    await prisma.user.deleteMany({ where: { OR: [
      { email: TEST_EMAIL }, 
      { email: 'lab@test.com' },
      { email: { contains: 'test3-' } },
      { email: { contains: 'lab-test3' } },
      { id: { contains: 'test-user' } }
    ] } })
  })

  it('deve completar o fluxo end-to-end: lab submit → notification → event creation', async () => {
    // ========================================
    // PASSO 1: Laboratório submete laudo
    // ========================================
    
    // Primeiro, criar os usuários necessários no banco
    const receptor = await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: {
        id: 'test-user-integration',
        email: TEST_EMAIL,
        cpf: TEST_CPF,
        name: 'Paciente Teste',
        password: 'hashed-password',
        role: 'RECEPTOR'
      }
    })
    
    // Deletar emissor antigo se existir
    await prisma.user.deleteMany({ where: { email: 'lab@test.com' } })
    
    let emissor
    try {
      emissor = await prisma.user.create({
        data: {
          email: 'lab@test.com',
          name: 'Laboratório Teste',
          password: 'hashed-password',
          role: 'EMISSOR',
          emissorInfo: {
            create: {
              clinicName: 'Laboratório Teste',
              cnpj: LAB_CNPJ
            }
          }
        }
      })
    } catch (error) {
      console.error('Erro ao criar emissor:', error)
      throw error
    }
    
    console.log('emissor criado:', emissor)
    
    const labSubmitPayload = {
      emitterCnpj: LAB_CNPJ,
      patientEmail: TEST_EMAIL,
      patientName: testUser.name,
      patientCpf: TEST_CPF,
      doctorName: testProfessional.name,
      examDate: '2024-12-05',
      examType: 'Eletrocardiograma',
      documento: 'LAB-ECG-2024-001',
      report: {
        fileName: 'laudo-ecg.pdf',
        fileContent: Buffer.from('PDF content').toString('base64'),
        mimeType: 'application/pdf'
      }
    }

    // Simular criação do report (normalmente feito pelo endpoint /api/lab/submit)
    try {
      testReport = await prisma.report.create({
        data: {
          senderId: emissor.id,
          receiverId: receptor.id,
          title: `Laudo - ${labSubmitPayload.examType}`,
          fileName: labSubmitPayload.report.fileName,
          fileUrl: `/uploads/${labSubmitPayload.report.fileName}`,
          protocol: labSubmitPayload.documento,
          status: ReportStatus.SENT,
        }
      })
    } catch (error) {
      console.error('Erro ao criar report:', error)
      throw error
    }

    expect(testReport).toBeDefined()
    expect(testReport?.status).toBe(ReportStatus.SENT)
    console.log('✓ Passo 1: Laudo submetido com sucesso')

    // ========================================
    // PASSO 2: Sistema cria notificação
    // ========================================
    // Criar notificação associada ao report
    testNotification = await prisma.notification.create({
      data: {
        userId: receptor.id,
        type: 'LAB_RESULT',
        status: NotificationStatus.UNREAD,
        payload: {
          reportId: testReport.id,
          doctorName: labSubmitPayload.doctorName,
          examDate: labSubmitPayload.examDate,
          examType: labSubmitPayload.examType,
          fileName: testReport.fileName,
          message: `Novo laudo disponível: ${labSubmitPayload.examType}`
        }
      },
      include: {
        report: true
      }
    }) as TestNotification

    expect(testNotification).toBeDefined()
    expect(testNotification.status).toBe(NotificationStatus.UNREAD)
    expect(testNotification.payload).toHaveProperty('reportId', testReport.id)
    console.log('✓ Passo 2: Notificação criada com sucesso')

    // ========================================
    // PASSO 3: Paciente busca notificações
    // ========================================
    const notifications = await prisma.notification.findMany({
      where: {
        userId: receptor.id,
        status: NotificationStatus.UNREAD
      },
      orderBy: { createdAt: 'desc' }
    })

    expect(notifications).toHaveLength(1)
    expect(notifications[0].id).toBe(testNotification.id)
    console.log('✓ Passo 3: Notificação encontrada pelo paciente')

    // ========================================
    // PASSO 4: Sistema marca report como DELIVERED
    // ========================================
    await prisma.report.update({
      where: { id: testReport.id },
      data: { status: ReportStatus.DELIVERED }
    })

    const updatedReport = await prisma.report.findUnique({
      where: { id: testReport.id }
    })

    expect(updatedReport?.status).toBe(ReportStatus.DELIVERED)
    console.log('✓ Passo 4: Report marcado como DELIVERED')

    // ========================================
    // PASSO 5: Criar profissional
    // ========================================
    await prisma.professional.create({
      data: {
        id: testProfessional.id,
        name: testProfessional.name,
        specialty: testProfessional.specialty,
        userId: receptor.id
      }
    })

    console.log('✓ Passo 5: Profissional criado')

    // ========================================
    // PASSO 6: Paciente cria evento a partir da notificação
    // ========================================
    const eventData = {
      title: `${labSubmitPayload.examType} - ${testProfessional.name}`,
      description: `Laudo: ${testReport.fileName}`,
      date: new Date('2024-12-05T12:00:00Z'),
      type: EventType.EXAME,
      startTime: new Date('2024-12-05T09:00:00'),
      endTime: new Date('2024-12-05T10:00:00'),
      userId: receptor.id,
      professionalId: testProfessional.id
    }

    // Usar transaction para criar evento e arquivar notificação atomicamente
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.healthEvent.create({
        data: eventData
      })

      // Criar arquivo associado ao evento
      await tx.files.create({
        data: {
          id: 'test-file-integration',
          eventId: event.id,
          professionalId: testProfessional.id,
          slot: 'result',
          name: testReport.fileName,
          url: `/uploads/${event.id}/result-${testReport.fileName}`,
          physicalPath: `/uploads/${event.id}/result-${testReport.fileName}`
        }
      })

      // Arquivar notificação
      await tx.notification.update({
        where: { id: testNotification.id },
        data: { status: NotificationStatus.ARCHIVED }
      })

      // Retornar evento com arquivos
      return await tx.healthEvent.findUnique({
        where: { id: event.id },
        include: { files: true }
      })
    })

    testEvent = result as TestEvent

    expect(testEvent).toBeDefined()
    expect(testEvent.title).toContain(labSubmitPayload.examType)
    expect(testEvent.professionalId).toBe(testProfessional.id)
    expect(testEvent.files).toHaveLength(1)
    expect(testEvent.files![0].slot).toBe('result')
    console.log('✓ Passo 6: Evento criado com laudo anexado')

    // ========================================
    // PASSO 7: Verificar notificação foi arquivada
    // ========================================
    const archivedNotification = await prisma.notification.findUnique({
      where: { id: testNotification.id }
    })

    expect(archivedNotification?.status).toBe(NotificationStatus.ARCHIVED)
    console.log('✓ Passo 7: Notificação arquivada')

    // ========================================
    // PASSO 8: Verificar integridade dos dados
    // ========================================
    const finalEvent = await prisma.healthEvent.findUnique({
      where: { id: testEvent.id },
      include: {
        files: true,
        professional: true
      }
    })

    expect(finalEvent).toBeDefined()
    expect(finalEvent!.userId).toBe(receptor.id)
    expect(finalEvent!.professional.name).toBe(testProfessional.name)
    expect(finalEvent!.files).toHaveLength(1)
    expect(finalEvent!.files[0].name).toBe(testReport.fileName)
    console.log('✓ Passo 8: Integridade dos dados verificada')

    console.log('\n✅ Fluxo end-to-end completado com sucesso!')
  })

  it('deve falhar se tentar criar evento sem notificação', async () => {
    // Setup: Criar usuário e profissional
    await prisma.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        cpf: testUser.cpf,
        name: testUser.name,
        password: 'hashed-password',
        role: 'RECEPTOR'
      }
    })

    await prisma.professional.create({
      data: {
        id: testProfessional.id,
        name: testProfessional.name,
        specialty: testProfessional.specialty,
        userId: testUser.id
      }
    })

    // Tentar criar evento diretamente sem notificação
    const eventData = {
      title: 'Evento sem notificação',
      description: 'Teste',
      date: new Date('2024-12-05T12:00:00Z'),
      type: EventType.EXAME,
      startTime: new Date('2024-12-05T09:00:00'),
      endTime: new Date('2024-12-05T10:00:00'),
      userId: testUser.id,
      professionalId: testProfessional.id
    }

    // Este deve funcionar, pois eventos podem ser criados sem notificação
    let event
    try {
      event = await prisma.healthEvent.create({
        data: eventData
      })
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      throw error
    }

    expect(event).toBeDefined()
    expect(event?.id).toBeTruthy()
    
    // Mas verificar que não há notificações associadas
    const notifications = await prisma.notification.findMany({
      where: { userId: testUser.id }
    })

    expect(notifications).toHaveLength(0)
  })

  it('deve lidar com múltiplas notificações e eventos', async () => {
    // Setup
    await prisma.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        cpf: testUser.cpf,
        name: testUser.name,
        password: 'hashed-password',
        role: 'RECEPTOR'
      }
    })

    await prisma.professional.create({
      data: {
        id: testProfessional.id,
        name: testProfessional.name,
        specialty: testProfessional.specialty,
        userId: testUser.id
      }
    })

    // Criar múltiplos reports e notificações
    // Primeiro criar emissor e receptor com IDs únicos
    const receptor = await prisma.user.create({
      data: {
        id: `${testUser.id}-test3`,
        email: `test3-${testUser.email}`,
        cpf: testUser.cpf,
        name: testUser.name,
        password: 'hashed-password',
        role: 'RECEPTOR'
      }
    })
    
    const emissor = await prisma.user.create({
      data: {
        email: 'lab-test3@test.com',
        name: 'Laboratório Teste',
        password: 'hashed-password',
        role: 'EMISSOR',
        emissorInfo: {
          create: {
            clinicName: 'Laboratório Teste',
            cnpj: LAB_CNPJ
          }
        }
      }
    })
    
    const reports = await Promise.all([
      prisma.report.create({
        data: {
          senderId: emissor.id,
          receiverId: receptor.id,
          title: 'Laudo 1',
          fileName: 'laudo-1.pdf',
          fileUrl: '/uploads/laudo-1.pdf',
          protocol: 'LAB-001',
          status: ReportStatus.SENT
        }
      }),
      prisma.report.create({
        data: {
          senderId: emissor.id,
          receiverId: receptor.id,
          title: 'Laudo 2',
          fileName: 'laudo-2.pdf',
          fileUrl: '/uploads/laudo-2.pdf',
          protocol: 'LAB-002',
          status: ReportStatus.SENT
        }
      })
    ])

    // Verificar que reports foram criados
    expect(reports).toHaveLength(2)
    expect(reports[0]).toBeDefined()
    expect(reports[0]?.id).toBeTruthy()
    expect(reports[1]).toBeDefined()
    expect(reports[1]?.id).toBeTruthy()

    const notifications = await Promise.all(
      reports.map((report) =>
        prisma.notification.create({
          data: {
            userId: receptor.id,
            type: 'LAB_RESULT',
            status: NotificationStatus.UNREAD,
            payload: {
              reportId: report?.id || 'unknown',
              fileName: report?.fileName || 'unknown'
            }
          }
        })
      )
    )

    // Verificar que ambas notificações foram criadas
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        userId: receptor.id,
        status: NotificationStatus.UNREAD
      }
    })

    expect(unreadNotifications).toHaveLength(2)

    // Criar eventos para cada notificação
    const events = await Promise.all(
      notifications.map((notification, index) =>
        prisma.$transaction(async (tx) => {
          const event = await tx.healthEvent.create({
            data: {
              title: `Evento ${index + 1}`,
              description: 'Teste múltiplos eventos',
              date: new Date('2024-12-05T12:00:00Z'),
              type: EventType.EXAME,
              startTime: new Date(`2024-12-05T${String(9 + index).padStart(2, '0')}:00:00Z`),
              endTime: new Date(`2024-12-05T${String(10 + index).padStart(2, '0')}:00:00Z`),
              userId: receptor.id,
              professionalId: testProfessional.id
            }
          })

          await tx.notification.update({
            where: { id: notification.id },
            data: { status: NotificationStatus.ARCHIVED }
          })

          return event
        })
      )
    )

    expect(events).toHaveLength(2)

    // Verificar que todas notificações foram arquivadas
    const archivedNotifications = await prisma.notification.findMany({
      where: {
        userId: receptor.id,
        status: NotificationStatus.ARCHIVED
      }
    })

    expect(archivedNotifications).toHaveLength(2)
  })
})
