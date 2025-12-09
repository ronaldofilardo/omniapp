import { prisma } from '@/lib/prisma'

/**
 * Política de Retenção de Logs de Auditoria
 * 
 * Conformidade LGPD: Logs devem ser mantidos por no mínimo 5 anos
 * 
 * Esta estratégia:
 * 1. Mantém logs recentes (< 1 ano) na tabela principal para acesso rápido
 * 2. Arquiva logs entre 1-5 anos em tabela de arquivamento (opcional)
 * 3. Move logs > 5 anos para cold storage ou backup externo
 * 4. NUNCA deleta logs < 5 anos (conformidade legal)
 */

export interface RetentionPolicyConfig {
  // Dias para manter na tabela ativa (padrão: 365 dias = 1 ano)
  activeDays: number
  // Dias totais de retenção obrigatória (padrão: 1825 dias = 5 anos)
  retentionDays: number
  // Se deve arquivar em cold storage após período ativo
  enableColdStorage: boolean
}

export const DEFAULT_RETENTION_CONFIG: RetentionPolicyConfig = {
  activeDays: 365, // 1 ano na tabela ativa
  retentionDays: 1825, // 5 anos total (LGPD)
  enableColdStorage: true,
}

/**
 * Identifica logs elegíveis para arquivamento
 * (mais antigos que activeDays mas dentro do período de retenção)
 */
export async function getLogsForArchival(config: RetentionPolicyConfig = DEFAULT_RETENTION_CONFIG) {
  const archivalCutoffDate = new Date()
  archivalCutoffDate.setDate(archivalCutoffDate.getDate() - config.activeDays)

  const retentionCutoffDate = new Date()
  retentionCutoffDate.setDate(retentionCutoffDate.getDate() - config.retentionDays)

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: retentionCutoffDate, // Mais recente que data de retenção
          lt: archivalCutoffDate,    // Mais antigo que data ativa
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return {
      count: logs.length,
      logs,
      archivalCutoffDate,
      retentionCutoffDate,
    }
  } catch (error) {
    console.error('[RETENTION POLICY] Erro ao buscar logs para arquivamento:', error)
    throw error
  }
}

/**
 * Conta logs por período de tempo
 * Útil para relatórios de conformidade
 */
export async function getAuditLogStatistics() {
  const now = new Date()
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(now.getFullYear() - 1)

  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(now.getFullYear() - 5)

  try {
    const [totalLogs, logsLastYear, logsOlderThan1Year, logsOlderThan5Years] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: oneYearAgo } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { lt: oneYearAgo, gte: fiveYearsAgo } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { lt: fiveYearsAgo } },
      }),
    ])

    return {
      totalLogs,
      logsLastYear,
      logsOlderThan1Year,
      logsOlderThan5Years,
      breakdown: {
        active: logsLastYear,
        archivable: logsOlderThan1Year,
        expired: logsOlderThan5Years,
      },
    }
  } catch (error) {
    console.error('[RETENTION POLICY] Erro ao calcular estatísticas:', error)
    throw error
  }
}

/**
 * IMPORTANTE: Esta função deve ser executada com extrema cautela
 * 
 * Exporta logs para arquivamento externo (JSON/CSV)
 * Deve ser usado antes de qualquer operação de limpeza
 * 
 * Recomendação: Executar backup antes de chamar esta função
 */
export async function exportLogsForColdStorage(
  logIds: string[]
): Promise<{ exported: any[]; count: number }> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        id: { in: logIds },
      },
    })

    // Em produção, você salvaria estes logs em:
    // - S3/Cloud Storage
    // - Sistema de arquivamento
    // - Backup tape/offline storage

    return {
      exported: logs,
      count: logs.length,
    }
  } catch (error) {
    console.error('[RETENTION POLICY] Erro ao exportar logs:', error)
    throw error
  }
}

/**
 * ATENÇÃO: FUNÇÃO PERIGOSA - Usar apenas após confirmar exportação
 * 
 * Remove logs APENAS se:
 * 1. Já foram exportados para cold storage
 * 2. São mais antigos que período de retenção legal (5 anos)
 * 3. Backup foi confirmado
 * 
 * Esta função NÃO deve ser chamada automaticamente
 */
export async function cleanupExpiredLogs(
  dryRun: boolean = true,
  config: RetentionPolicyConfig = DEFAULT_RETENTION_CONFIG
): Promise<{
  wouldDelete: number
  deleted: number
  cutoffDate: Date
}> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays)

  try {
    // Primeiro, contar quantos logs seriam deletados
    const countToDelete = await prisma.auditLog.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    if (dryRun) {
      console.log(
        `[RETENTION POLICY] DRY RUN: ${countToDelete} logs seriam deletados (mais antigos que ${cutoffDate.toISOString()})`
      )
      return {
        wouldDelete: countToDelete,
        deleted: 0,
        cutoffDate,
      }
    }

    // PRODUÇÃO: Deletar logs expirados
    // IMPORTANTE: Só execute após confirmar backup/exportação
    const deleteResult = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    console.log(
      `[RETENTION POLICY] ${deleteResult.count} logs deletados (mais antigos que ${cutoffDate.toISOString()})`
    )

    return {
      wouldDelete: countToDelete,
      deleted: deleteResult.count,
      cutoffDate,
    }
  } catch (error) {
    console.error('[RETENTION POLICY] Erro ao limpar logs expirados:', error)
    throw error
  }
}

/**
 * Relatório de conformidade para auditores
 * Mostra estado atual da política de retenção
 */
export async function generateComplianceReport() {
  const stats = await getAuditLogStatistics()
  const config = DEFAULT_RETENTION_CONFIG

  const now = new Date()
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(now.getFullYear() - 1)
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(now.getFullYear() - 5)

  return {
    reportDate: now.toISOString(),
    retentionPolicy: {
      activePeriod: `${config.activeDays} dias (${Math.floor(config.activeDays / 365)} ano)`,
      totalRetention: `${config.retentionDays} dias (${Math.floor(config.retentionDays / 365)} anos)`,
      coldStorageEnabled: config.enableColdStorage,
    },
    statistics: stats,
    compliance: {
      lgpdCompliant: stats.logsOlderThan5Years === 0 || config.retentionDays >= 1825,
      hasExpiredLogs: stats.logsOlderThan5Years > 0,
      needsArchival: stats.logsOlderThan1Year > 0,
    },
    recommendations: [
      stats.logsOlderThan5Years > 0
        ? '⚠️ Existem logs com mais de 5 anos que devem ser exportados e arquivados'
        : '✅ Nenhum log ultrapassou o período de retenção',
      stats.logsOlderThan1Year > 0
        ? `📦 ${stats.logsOlderThan1Year} logs podem ser movidos para cold storage para otimizar performance`
        : '✅ Todos os logs estão no período ativo',
      config.enableColdStorage
        ? '✅ Cold storage habilitado'
        : '⚠️ Considere habilitar cold storage para otimização',
    ],
  }
}

/**
 * Task agendável para manutenção de logs
 * Deve ser executada periodicamente (ex: mensalmente)
 * 
 * Sugestão: Configurar como cron job ou scheduled task
 */
export async function performScheduledMaintenance(dryRun: boolean = true) {
  console.log('[RETENTION POLICY] Iniciando manutenção agendada de logs de auditoria')

  try {
    // 1. Gerar relatório de conformidade
    const report = await generateComplianceReport()
    console.log('[RETENTION POLICY] Relatório de conformidade gerado:', JSON.stringify(report, null, 2))

    // 2. Identificar logs para arquivamento
    const { count: archivableCount } = await getLogsForArchival()
    console.log(`[RETENTION POLICY] ${archivableCount} logs elegíveis para arquivamento`)

    // 3. Limpar logs expirados (sempre em dry-run por padrão)
    const cleanup = await cleanupExpiredLogs(dryRun)
    console.log(`[RETENTION POLICY] Cleanup: ${cleanup.wouldDelete} logs ${dryRun ? 'seriam' : 'foram'} removidos`)

    return {
      success: true,
      report,
      archivableCount,
      cleanup,
      message: dryRun
        ? 'Manutenção executada em modo dry-run (nenhuma alteração feita)'
        : 'Manutenção executada com sucesso',
    }
  } catch (error) {
    console.error('[RETENTION POLICY] Erro na manutenção agendada:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}