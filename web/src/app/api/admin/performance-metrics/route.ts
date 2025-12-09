/**
 * API de Métricas de Performance
 * 
 * GET /api/admin/performance-metrics
 * 
 * Retorna estatísticas de performance do sistema
 * Requer autenticação de admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPerformanceStats } from '@/lib/monitoring/performanceMetrics';
import { getCacheStats } from '@/lib/cache/redisCache';

export async function GET(req: NextRequest) {
  try {
    const user = await auth();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Parâmetro de período (padrão: última hora)
    const url = new URL(req.url);
    const lastMinutes = parseInt(url.searchParams.get('lastMinutes') || '60');

    // Coletar métricas em paralelo
    const [performanceStats, cacheStats] = await Promise.all([
      getPerformanceStats(lastMinutes),
      getCacheStats(),
    ]);

    // Verificar SLA (< 500ms)
    const slaCompliance = {
      target: 500,
      p50Met: performanceStats.p50 < 500,
      p95Met: performanceStats.p95 < 500,
      p99Met: performanceStats.p99 < 500,
      overallMet: performanceStats.p95 < 500, // SLA baseado em P95
    };

    return NextResponse.json({
      period: {
        lastMinutes,
        totalRequests: performanceStats.totalRequests,
      },
      latency: {
        average: performanceStats.averageLatency,
        p50: performanceStats.p50,
        p95: performanceStats.p95,
        p99: performanceStats.p99,
        slowRequests: performanceStats.slowRequests,
        slowRequestsPercent:
          performanceStats.totalRequests > 0
            ? Math.round(
                (performanceStats.slowRequests / performanceStats.totalRequests) * 100 * 100
              ) / 100
            : 0,
      },
      reliability: {
        successRate: performanceStats.successRate,
        totalRequests: performanceStats.totalRequests,
      },
      cache: {
        hitRate: cacheStats.hitRate,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        totalKeys: cacheStats.totalKeys,
      },
      sla: slaCompliance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Erro ao buscar métricas de performance:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar métricas' },
      { status: 500 }
    );
  }
}
