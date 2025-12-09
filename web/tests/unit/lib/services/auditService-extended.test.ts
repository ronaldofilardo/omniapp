import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Prisma - DEVE vir antes dos imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  logAuthEvent,
  logHealthEvent,
  logPermissionEvent,
} from '@/lib/services/auditService'

const mockPrisma = prisma as any

describe('auditService - Novos Eventos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logAuthEvent', () => {
    it('deve registrar login bem-sucedido', async () => {
      const authData = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userCpf: '12345678900',
        userName: 'João Silva',
        action: 'LOGIN_SUCCESS' as const,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {
          userRole: 'RECEPTOR',
        },
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-1',
        ...authData,
      })

      await logAuthEvent(authData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          origin: 'PORTAL_LOGADO',
          receiverCpf: '12345678900',
          patientId: 'user-123',
          patientName: 'João Silva',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          status: 'SUCCESS',
          documentType: 'auth',
        }),
      })
    })

    it('deve registrar falha de login', async () => {
      const authData = {
        userEmail: 'wrong@example.com',
        action: 'LOGIN_FAILURE' as const,
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        metadata: {
          reason: 'invalid_password',
        },
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-2',
      })

      await logAuthEvent(authData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGIN_FAILURE',
          status: 'USER_NOT_FOUND',
          receiverCpf: 'sistema',
        }),
      })
    })

    it('deve registrar logout', async () => {
      const authData = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userCpf: '12345678900',
        userName: 'João Silva',
        action: 'LOGOUT' as const,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-3',
      })

      await logAuthEvent(authData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGOUT',
          status: 'SUCCESS',
        }),
      })
    })

    it('deve registrar mudança de email', async () => {
      const authData = {
        userId: 'user-123',
        userEmail: 'old@example.com',
        userCpf: '12345678900',
        userName: 'João Silva',
        action: 'EMAIL_CHANGE' as const,
        ip: '192.168.1.1',
        metadata: {
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
        },
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-4',
      })

      await logAuthEvent(authData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EMAIL_CHANGE',
          metadata: expect.objectContaining({
            oldEmail: 'old@example.com',
            newEmail: 'new@example.com',
          }),
        }),
      })
    })

    it('não deve lançar erro se auditoria falhar', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'))

      await expect(
        logAuthEvent({
          userId: 'user-123',
          userEmail: 'user@example.com',
          userCpf: '12345678900',
          action: 'LOGIN_SUCCESS',
          ip: '192.168.1.1',
        })
      ).resolves.not.toThrow()
    })
  })

  describe('logHealthEvent', () => {
    const baseHealthEventData = {
      userId: 'user-123',
      userCpf: '12345678900',
      userName: 'João Silva',
      eventId: 'event-456',
      eventType: 'CONSULTA',
      eventTitle: 'Consulta Cardiologista',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    }

    it('deve registrar criação de evento médico', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-5',
      })

      await logHealthEvent({
        ...baseHealthEventData,
        action: 'CREATED',
        metadata: {
          professionalId: 'prof-789',
          hasFiles: true,
        },
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'HEALTH_EVENT_CREATED',
          origin: 'PORTAL_LOGADO',
          receiverCpf: '12345678900',
          patientId: 'user-123',
          status: 'SUCCESS',
          documentType: 'health_event',
          metadata: expect.objectContaining({
            eventId: 'event-456',
            action: 'CREATED',
            eventType: 'CONSULTA',
            eventTitle: 'Consulta Cardiologista',
          }),
        }),
      })
    })

    it('deve registrar atualização de evento médico', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-6',
      })

      await logHealthEvent({
        ...baseHealthEventData,
        action: 'UPDATED',
        metadata: {
          isFileOnlyUpdate: false,
        },
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'HEALTH_EVENT_UPDATED',
          metadata: expect.objectContaining({
            action: 'UPDATED',
          }),
        }),
      })
    })

    it('deve registrar exclusão de evento médico', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-7',
      })

      await logHealthEvent({
        ...baseHealthEventData,
        action: 'DELETED',
        metadata: {
          hadFiles: true,
          filesCount: 3,
          filesDeleted: true,
        },
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'HEALTH_EVENT_DELETED',
          metadata: expect.objectContaining({
            action: 'DELETED',
            hadFiles: true,
            filesCount: 3,
          }),
        }),
      })
    })

    it('não deve lançar erro se auditoria falhar', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'))

      await expect(
        logHealthEvent({
          ...baseHealthEventData,
          action: 'CREATED',
        })
      ).resolves.not.toThrow()
    })
  })

  describe('logPermissionEvent', () => {
    it('deve registrar mudança de role', async () => {
      const permissionData = {
        userId: 'admin-123',
        userCpf: '11111111111',
        targetUserId: 'user-456',
        targetUserCpf: '22222222222',
        action: 'ROLE_CHANGED' as const,
        oldRole: 'RECEPTOR',
        newRole: 'EMISSOR',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-8',
      })

      await logPermissionEvent(permissionData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ROLE_CHANGED',
          origin: 'PORTAL_LOGADO',
          receiverCpf: '11111111111',
          patientId: 'admin-123',
          status: 'SUCCESS',
          documentType: 'permission',
          metadata: expect.objectContaining({
            targetUserId: 'user-456',
            targetUserCpf: '22222222222',
            oldRole: 'RECEPTOR',
            newRole: 'EMISSOR',
          }),
        }),
      })
    })

    it('deve registrar concessão de permissão', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-9',
      })

      await logPermissionEvent({
        userId: 'admin-123',
        userCpf: '11111111111',
        targetUserId: 'user-456',
        action: 'PERMISSION_GRANTED',
        ip: '192.168.1.1',
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PERMISSION_GRANTED',
        }),
      })
    })

    it('deve registrar revogação de permissão', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-10',
      })

      await logPermissionEvent({
        userId: 'admin-123',
        userCpf: '11111111111',
        targetUserId: 'user-456',
        action: 'PERMISSION_REVOKED',
        ip: '192.168.1.1',
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PERMISSION_REVOKED',
        }),
      })
    })

    it('não deve lançar erro se auditoria falhar', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'))

      await expect(
        logPermissionEvent({
          userId: 'admin-123',
          userCpf: '11111111111',
          action: 'ROLE_CHANGED',
          ip: '192.168.1.1',
        })
      ).resolves.not.toThrow()
    })
  })
})
