/**
 * Middleware de Performance
 * 
 * Captura latência e métricas de todas as requisições
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordRequestMetric, createTimer } from '../monitoring/performanceMetrics';

/**
 * Wrapper para handlers de rota que captura métricas de performance
 */
export function withPerformanceTracking<T extends NextResponse>(
  handler: (req: NextRequest) => Promise<T>
) {
  return async (req: NextRequest): Promise<T> => {
    const timer = createTimer();
    const path = new URL(req.url).pathname;
    const method = req.method;

    try {
      const response = await handler(req);
      const duration = timer.stop();

      // Registrar métrica (não bloquear resposta)
      recordRequestMetric({
        path,
        method,
        statusCode: response.status,
        duration,
        timestamp: Date.now(),
        cacheHit: response.headers.get('X-Cache-Hit') === 'true',
      }).catch(err => console.error('[PERF] Erro ao registrar métrica:', err));

      // Adicionar header de timing
      response.headers.set('X-Response-Time', `${duration}ms`);

      return response;
    } catch (error) {
      const duration = timer.stop();

      // Registrar métrica de erro
      recordRequestMetric({
        path,
        method,
        statusCode: 500,
        duration,
        timestamp: Date.now(),
      }).catch(err => console.error('[PERF] Erro ao registrar métrica:', err));

      throw error;
    }
  };
}

/**
 * Decorator para classes de handler
 */
export function PerformanceTracked() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const timer = createTimer();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = timer.stop();

        console.log(`[PERF] ${propertyKey} completed in ${duration}ms`);

        return result;
      } catch (error) {
        const duration = timer.stop();
        console.error(`[PERF] ${propertyKey} failed after ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
