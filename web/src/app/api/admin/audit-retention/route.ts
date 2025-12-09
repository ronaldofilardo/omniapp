import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  generateComplianceReport,
  getAuditLogStatistics,
  getLogsForArchival,
  cleanupExpiredLogs,
  performScheduledMaintenance,
} from '@/lib/services/auditRetentionService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/audit-retention
 * 
 * Retorna relatório de conformidade e estatísticas de retenção
 * Requer: ADMIN role
 */
export async function GET(req: NextRequest) {
  try {
    const user = await auth()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso não autorizado - apenas administradores' },
        { status: 403 }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'report'

    switch (action) {
      case 'report':
        const report = await generateComplianceReport()
        return NextResponse.json(report, { status: 200 })

      case 'statistics':
        const stats = await getAuditLogStatistics()
        return NextResponse.json(stats, { status: 200 })

      case 'archivable':
        const archivable = await getLogsForArchival()
        return NextResponse.json({
          count: archivable.count,
          archivalCutoffDate: archivable.archivalCutoffDate,
          retentionCutoffDate: archivable.retentionCutoffDate,
          // Não retornar logs completos por padrão (pode ser muito grande)
          logsCount: archivable.logs.length,
        }, { status: 200 })

      default:
        return NextResponse.json(
          { error: 'Ação inválida. Use: report, statistics, ou archivable' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[AUDIT RETENTION API] Erro:', error)
    return NextResponse.json(
      {
        error: 'Erro ao processar requisição',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/audit-retention
 * 
 * Executa operações de manutenção
 * Requer: ADMIN role
 */
export async function POST(req: NextRequest) {
  try {
    const user = await auth()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso não autorizado - apenas administradores' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { action, dryRun = true } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Ação é obrigatória' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'maintenance':
        // Executar manutenção agendada
        const maintenanceResult = await performScheduledMaintenance(dryRun)
        return NextResponse.json(maintenanceResult, { status: 200 })

      case 'cleanup':
        // ATENÇÃO: Esta operação pode deletar dados!
        // Sempre usa dry-run por padrão
        if (!dryRun) {
          // Verificação adicional de segurança
          const confirmToken = body.confirmToken
          if (confirmToken !== `DELETE-AUDIT-LOGS-${new Date().toISOString().split('T')[0]}`) {
            return NextResponse.json(
              {
                error: 'Token de confirmação inválido',
                hint: `Use: DELETE-AUDIT-LOGS-${new Date().toISOString().split('T')[0]}`,
              },
              { status: 400 }
            )
          }
        }

        const cleanupResult = await cleanupExpiredLogs(dryRun)
        return NextResponse.json({
          ...cleanupResult,
          warning: dryRun
            ? 'Executado em modo dry-run - nenhum dado foi deletado'
            : 'ATENÇÃO: Logs foram permanentemente deletados',
        }, { status: 200 })

      default:
        return NextResponse.json(
          { error: 'Ação inválida. Use: maintenance ou cleanup' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[AUDIT RETENTION API] Erro:', error)
    return NextResponse.json(
      {
        error: 'Erro ao executar operação',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}