import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AuditOrigin, AuditStatus } from '@prisma/client'

// Mock do Prisma - DEVE vir antes dos imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { logDocumentSubmission, updateAuditLogStatus } from '@/lib/services/auditService'

const mockPrisma = prisma as any

describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logDocumentSubmission', () => {
    const baseAuditData = {
      origin: 'API_EXTERNA' as AuditOrigin,
      emitterCnpj: '12345678000199',
      receiverCpf: '11122233344',
      patientId: 'patient-1',
      patientName: 'João Silva',
      protocol: 'LAB-001',
      fileName: 'laudo.pdf',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      status: 'SUCCESS' as AuditStatus,
    }

    it('should create audit log with all required fields', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-1',
        ...baseAuditData,
      })

      await logDocumentSubmission(baseAuditData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          origin: 'API_EXTERNA',
          emitterCnpj: '12345678000199',
          receiverCpf: '11122233344',
          patientId: 'patient-1',
          patientName: 'João Silva',
          protocol: 'LAB-001',
          fileName: 'laudo.pdf',
          fileHash: null,
          documentType: 'result',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          status: 'SUCCESS',
          metadata: undefined,
        },
      })
    })

    it('should persist fileHash when provided', async () => {
      const auditDataWithHash = {
        ...baseAuditData,
        fileHash: 'a1b2c3d4e5f6...',
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-2',
        ...auditDataWithHash,
      })

      await logDocumentSubmission(auditDataWithHash)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileHash: 'a1b2c3d4e5f6...',
        }),
      })
    })

    it('should set fileHash to null when not provided', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-3',
        ...baseAuditData,
      })

      await logDocumentSubmission(baseAuditData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileHash: null,
        }),
      })
    })

    it('should handle null optional fields', async () => {
      const minimalAuditData = {
        origin: 'PORTAL_PUBLICO' as AuditOrigin,
        receiverCpf: '11122233344',
        fileName: 'documento.pdf',
        ip: '127.0.0.1',
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-4',
        ...minimalAuditData,
      })

      await logDocumentSubmission(minimalAuditData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          origin: 'PORTAL_PUBLICO',
          emitterCnpj: null,
          receiverCpf: '11122233344',
          patientId: null,
          patientName: null,
          protocol: null,
          fileName: 'documento.pdf',
          fileHash: null,
          documentType: 'result',
          ipAddress: '127.0.0.1',
          userAgent: null,
          status: 'PROCESSING',
          metadata: undefined,
        },
      })
    })

    it('should default status to PROCESSING if not provided', async () => {
      const auditDataWithoutStatus = {
        origin: 'API_EXTERNA' as AuditOrigin,
        receiverCpf: '11122233344',
        fileName: 'teste.pdf',
        ip: '192.168.1.1',
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-5',
        ...auditDataWithoutStatus,
      })

      await logDocumentSubmission(auditDataWithoutStatus)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PROCESSING',
        }),
      })
    })

    it('should log different origins correctly', async () => {
      const origins: AuditOrigin[] = [
        'API_EXTERNA',
        'PORTAL_PUBLICO',
        'PORTAL_LOGADO',
      ]

      for (const origin of origins) {
        const auditData = {
          ...baseAuditData,
          origin,
        }

        mockPrisma.auditLog.create.mockResolvedValue({
          id: `log-${origin}`,
          ...auditData,
        })

        await logDocumentSubmission(auditData)

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            origin,
          }),
        })
      }
    })

    it('should log different statuses correctly', async () => {
      const statuses: AuditStatus[] = [
        'SUCCESS',
        'USER_NOT_FOUND',
        'VALIDATION_ERROR',
        'SERVER_ERROR',
        'PROCESSING',
      ]

      for (const status of statuses) {
        const auditData = {
          ...baseAuditData,
          status,
        }

        mockPrisma.auditLog.create.mockResolvedValue({
          id: `log-${status}`,
          ...auditData,
        })

        await logDocumentSubmission(auditData)

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            status,
          }),
        })
      }
    })

    it('should not throw error if audit log creation fails', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(
        new Error('Database connection failed')
      )

      // Não deve lançar exceção
      await expect(logDocumentSubmission(baseAuditData)).resolves.not.toThrow()
    })

    it('should log error to console if audit log creation fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockPrisma.auditLog.create.mockRejectedValue(
        new Error('Database connection failed')
      )

      await logDocumentSubmission(baseAuditData)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT LOG FALHOU - NÃO BLOQUEIA FLUXO]',
        expect.objectContaining({
          error: expect.any(Error),
          data: expect.objectContaining({
            origin: 'API_EXTERNA',
            receiverCpf: '11122233344',
          }),
        })
      )

      consoleErrorSpy.mockRestore()
    })

    it('should include metadata when provided', async () => {
      const auditDataWithMetadata = {
        ...baseAuditData,
        metadata: {
          customField: 'customValue',
          additionalInfo: 123,
        },
      }

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-6',
        ...auditDataWithMetadata,
      })

      await logDocumentSubmission(auditDataWithMetadata)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            customField: 'customValue',
            additionalInfo: 123,
          },
        }),
      })
    })
  })

  describe('updateAuditLogStatus', () => {
    it('should update audit log status successfully', async () => {
      mockPrisma.auditLog.updateMany.mockResolvedValue({
        count: 1,
      })

      await updateAuditLogStatus('PROTO-123', 'SUCCESS')

      expect(mockPrisma.auditLog.updateMany).toHaveBeenCalledWith({
        where: {
          protocol: 'PROTO-123',
        },
        data: {
          status: 'SUCCESS',
        },
      })
    })

    it('should not throw error when update fails', async () => {
      mockPrisma.auditLog.updateMany.mockRejectedValue(new Error('Database error'))

      // Should not throw
      await expect(updateAuditLogStatus('PROTO-123', 'SUCCESS')).resolves.not.toThrow()
    })
  })
})

