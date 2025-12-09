import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import {
  getLogsForArchival,
  getAuditLogStatistics,
  cleanupExpiredLogs,
  generateComplianceReport,
  performScheduledMaintenance,
} from '@/lib/services/auditRetentionService'

import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as any

describe('auditRetentionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLogsForArchival', () => {
    it('deve identificar logs elegíveis para arquivamento', async () => {
      const mockLogs = [
        { id: 'log-1', createdAt: new Date('2023-01-01') },
        { id: 'log-2', createdAt: new Date('2023-06-01') },
        { id: 'log-3', createdAt: new Date('2023-12-01') },
      ]

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs)

      const result = await getLogsForArchival()

      expect(result.count).toBe(3)
      expect(result.logs).toHaveLength(3)
      expect(result.archivalCutoffDate).toBeInstanceOf(Date)
      expect(result.retentionCutoffDate).toBeInstanceOf(Date)
    })

    it('deve respeitar configuração customizada', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      const customConfig = {
        activeDays: 180,
        retentionDays: 3650, // 10 anos
        enableColdStorage: true,
      }

      const result = await getLogsForArchival(customConfig)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        })
      )
    })

    it('deve retornar logs vazios se não houver logs para arquivar', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      const result = await getLogsForArchival()

      expect(result.count).toBe(0)
      expect(result.logs).toHaveLength(0)
    })
  })

  describe('getAuditLogStatistics', () => {
    it('deve calcular estatísticas de logs corretamente', async () => {
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(300)  // < 1 ano
        .mockResolvedValueOnce(500)  // 1-5 anos
        .mockResolvedValueOnce(200)  // > 5 anos

      const stats = await getAuditLogStatistics()

      expect(stats.totalLogs).toBe(1000)
      expect(stats.logsLastYear).toBe(300)
      expect(stats.logsOlderThan1Year).toBe(500)
      expect(stats.logsOlderThan5Years).toBe(200)
      expect(stats.breakdown).toEqual({
        active: 300,
        archivable: 500,
        expired: 200,
      })
    })

    it('deve lidar com banco vazio', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0)

      const stats = await getAuditLogStatistics()

      expect(stats.totalLogs).toBe(0)
      expect(stats.logsLastYear).toBe(0)
      expect(stats.breakdown.active).toBe(0)
    })
  })

  describe('cleanupExpiredLogs', () => {
    it('deve executar em dry-run por padrão', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(50)

      const result = await cleanupExpiredLogs(true)

      expect(result.wouldDelete).toBe(50)
      expect(result.deleted).toBe(0)
      expect(mockPrisma.auditLog.deleteMany).not.toHaveBeenCalled()
    })

    it('deve deletar logs quando não em dry-run', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(50)
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 50 })

      const result = await cleanupExpiredLogs(false)

      expect(result.wouldDelete).toBe(50)
      expect(result.deleted).toBe(50)
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalled()
    })

    it('deve respeitar data de corte baseada na configuração', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(10)
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 10 })

      const customConfig = {
        activeDays: 365,
        retentionDays: 3650, // 10 anos
        enableColdStorage: true,
      }

      await cleanupExpiredLogs(false, customConfig)

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        })
      )
    })
  })

  describe('generateComplianceReport', () => {
    beforeEach(() => {
      // Setup básico para stats
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(500)  // total
        .mockResolvedValueOnce(200)  // < 1 ano
        .mockResolvedValueOnce(250)  // 1-5 anos
        .mockResolvedValueOnce(50)   // > 5 anos
    })

    it('deve gerar relatório de conformidade completo', async () => {
      const report = await generateComplianceReport()

      expect(report.reportDate).toBeDefined()
      expect(report.retentionPolicy).toBeDefined()
      expect(report.statistics).toBeDefined()
      expect(report.compliance).toBeDefined()
      expect(report.recommendations).toBeInstanceOf(Array)
    })

    it('deve identificar necessidade de arquivamento', async () => {
      const report = await generateComplianceReport()

      expect(report.compliance.needsArchival).toBe(true) // 250 logs > 1 ano
      expect(report.compliance.hasExpiredLogs).toBe(true) // 50 logs > 5 anos
    })

    it('deve incluir recomendações apropriadas', async () => {
      const report = await generateComplianceReport()

      expect(report.recommendations.length).toBeGreaterThan(0)
      expect(report.recommendations.some(r => r.includes('5 anos'))).toBe(true)
    })
  })

  describe('performScheduledMaintenance', () => {
    beforeEach(() => {
      // Setup para stats
      mockPrisma.auditLog.count
        .mockResolvedValue(100)
      
      // Setup para archival
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'log-1' },
        { id: 'log-2' },
      ])
    })

    it('deve executar manutenção completa em dry-run', async () => {
      const result = await performScheduledMaintenance(true)

      expect(result.success).toBe(true)
      expect(result.report).toBeDefined()
      expect(result.archivableCount).toBe(2)
      expect(result.cleanup).toBeDefined()
      expect(result.message).toContain('dry-run')
    })

    it('deve executar manutenção em modo produção', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 10 })

      const result = await performScheduledMaintenance(false)

      expect(result.success).toBe(true)
      expect(result.message).not.toContain('dry-run')
    })

    it('deve lidar com erros gracefully', async () => {
      mockPrisma.auditLog.count.mockRejectedValue(new Error('Database error'))

      const result = await performScheduledMaintenance(true)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

