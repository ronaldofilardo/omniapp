/**
 * Serviço de Monitoramento de Performance
 * 
 * Coleta métricas de latência, throughput e cache para todas as requisições
 * Objetivo: Garantir SLA de < 500ms para operações críticas
 */

import { Redis } from '@upstash/redis';

// Cliente Redis para métricas (reutilizar configuração existente)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const METRICS_ENABLED = process.env.PERFORMANCE_METRICS_ENABLED !== '0';
const METRICS_KEY_PREFIX = 'metrics:api:';
const METRICS_RETENTION_SECONDS = 3600; // 1 hora

export interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  duration: number; // milissegundos
  timestamp: number;
  userId?: string;
  cacheHit?: boolean;
}

export interface PerformanceStats {
  totalRequests: number;
  averageLatency: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
  cacheHitRate: number;
  slowRequests: number; // > 500ms
}

/**
 * Registra métrica de uma requisição
 */
export async function recordRequestMetric(metric: RequestMetrics): Promise<void> {
  if (!METRICS_ENABLED || !redis) {
    return; // Silenciosamente não faz nada se desabilitado
  }

  try {
    const key = `${METRICS_KEY_PREFIX}${Date.now()}`;
    await redis.setex(key, METRICS_RETENTION_SECONDS, JSON.stringify(metric));

    // Log para requests lentas (> 500ms)
    if (metric.duration > 500) {
      console.warn(`[PERFORMANCE] Request lenta: ${metric.method} ${metric.path} - ${metric.duration}ms`);
    }
  } catch (error) {
    console.error('[PERFORMANCE] Erro ao registrar métrica:', error);
    // Não propagar erro para não afetar a requisição
  }
}

/**
 * Calcula estatísticas de performance para um período
 */
export async function getPerformanceStats(
  lastMinutes: number = 60
): Promise<PerformanceStats> {
  if (!redis) {
    return getEmptyStats();
  }

  try {
    const now = Date.now();
    const startTime = now - lastMinutes * 60 * 1000;

    // Buscar todas as chaves de métricas
    const pattern = `${METRICS_KEY_PREFIX}*`;
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return getEmptyStats();
    }

    // Buscar todas as métricas
    const metricsPromises = keys.map(key => redis.get(key));
    const metricsRaw = await Promise.all(metricsPromises);

    // Filtrar e parsear métricas do período
    const metrics: RequestMetrics[] = metricsRaw
      .filter((raw): raw is string => typeof raw === 'string')
      .map(raw => {
        try {
          return JSON.parse(raw) as RequestMetrics;
        } catch {
          return null;
        }
      })
      .filter((m): m is RequestMetrics => m !== null && m.timestamp >= startTime);

    if (metrics.length === 0) {
      return getEmptyStats();
    }

    // Calcular estatísticas
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.statusCode >= 200 && m.statusCode < 400).length;
    const cacheHits = metrics.filter(m => m.cacheHit === true).length;
    const slowRequests = metrics.filter(m => m.duration > 500).length;

    return {
      totalRequests: metrics.length,
      averageLatency: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p50: calculatePercentile(durations, 50),
      p95: calculatePercentile(durations, 95),
      p99: calculatePercentile(durations, 99),
      successRate: Math.round((successCount / metrics.length) * 100 * 100) / 100,
      cacheHitRate: metrics.length > 0 ? Math.round((cacheHits / metrics.length) * 100 * 100) / 100 : 0,
      slowRequests,
    };
  } catch (error) {
    console.error('[PERFORMANCE] Erro ao calcular estatísticas:', error);
    return getEmptyStats();
  }
}

/**
 * Calcula percentil de uma lista de valores ordenados
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;

  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return Math.round(sortedValues[Math.max(0, index)]);
}

/**
 * Retorna estatísticas vazias
 */
function getEmptyStats(): PerformanceStats {
  return {
    totalRequests: 0,
    averageLatency: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    successRate: 100,
    cacheHitRate: 0,
    slowRequests: 0,
  };
}

/**
 * Helper para medir duração de uma operação
 */
export function createTimer() {
  const start = Date.now();
  return {
    stop: () => Date.now() - start,
  };
}

/**
 * Limpar métricas antigas (manutenção)
 */
export async function cleanupOldMetrics(): Promise<number> {
  if (!redis) return 0;

  try {
    const pattern = `${METRICS_KEY_PREFIX}*`;
    const keys = await redis.keys(pattern);
    
    let deleted = 0;
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        deleted++;
      }
    }

    return deleted;
  } catch (error) {
    console.error('[PERFORMANCE] Erro ao limpar métricas antigas:', error);
    return 0;
  }
}
