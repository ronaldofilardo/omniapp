/**
 * Testes de Integração - Performance API Routes
 * NOTA: Estes testes requerem um servidor rodando e são skip por padrão
 * Para executá-los, remova o .skip e inicie o servidor de desenvolvimento
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { performanceMetricsTest } from './helpers';

describe.skip('Performance - API Routes (< 500ms SLA)', () => {
  describe('GET /api/events', () => {
    it('deve responder em < 500ms (primeira requisição - cache miss)', async () => {
      const { duration, response } = await performanceMetricsTest('GET', '/api/events');

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    }, 10000);

    it('deve responder em < 100ms com cache hit', async () => {
      // Primeira requisição para popular cache
      await performanceMetricsTest('GET', '/api/events');

      // Segunda requisição deve usar cache
      const { duration, response, cacheHit } = await performanceMetricsTest('GET', '/api/events');

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
      expect(cacheHit).toBe(true);
    }, 10000);

    it('deve incluir header X-Response-Time', async () => {
      const { response } = await performanceMetricsTest('GET', '/api/events');

      expect(response.headers.get('X-Response-Time')).toBeDefined();
      const responseTime = parseFloat(response.headers.get('X-Response-Time') || '0');
      expect(responseTime).toBeGreaterThan(0);
    }, 10000);

    it('deve incluir header X-Cache-Hit quando usar cache', async () => {
      // Popular cache
      await performanceMetricsTest('GET', '/api/events');

      // Verificar cache hit
      const { response } = await performanceMetricsTest('GET', '/api/events');

      expect(response.headers.get('X-Cache-Hit')).toBe('true');
    }, 10000);
  });

  describe('GET /api/notifications', () => {
    it('deve responder em < 500ms', async () => {
      const { duration, response } = await performanceMetricsTest('GET', '/api/notifications');

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    }, 10000);

    it('deve usar cache em requisições subsequentes', async () => {
      // Primeira requisição
      const { duration: firstDuration } = await performanceMetricsTest('GET', '/api/notifications');

      // Segunda requisição (com cache)
      const { duration: secondDuration, cacheHit } = await performanceMetricsTest('GET', '/api/notifications');

      expect(secondDuration).toBeLessThan(firstDuration);
      expect(cacheHit).toBe(true);
    }, 10000);
  });

  describe('GET /api/reports', () => {
    it('deve responder em < 500ms', async () => {
      const { duration, response } = await performanceMetricsTest('GET', '/api/reports');

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    }, 10000);

    it('deve cachear resultados filtrados', async () => {
      // Com filtro específico
      const { duration, cacheHit } = await performanceMetricsTest('GET', '/api/reports?status=approved');

      expect(duration).toBeLessThan(500);
      
      // Segunda requisição com mesmo filtro
      const { cacheHit: secondCacheHit } = await performanceMetricsTest('GET', '/api/reports?status=approved');
      expect(secondCacheHit).toBe(true);
    }, 10000);
  });

  describe('GET /api/professionals', () => {
    it('deve responder em < 500ms', async () => {
      const { duration, response } = await performanceMetricsTest('GET', '/api/professionals');

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    }, 10000);
  });

  describe('GET /api/admin/performance-metrics', () => {
    it('deve retornar métricas de performance (admin)', async () => {
      const { response } = await performanceMetricsTest('GET', '/api/admin/performance-metrics', {
        role: 'ADMIN',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('latency');
      expect(data).toHaveProperty('cache');
      expect(data).toHaveProperty('sla');

      // Verificar estrutura de latência
      expect(data.latency).toHaveProperty('average');
      expect(data.latency).toHaveProperty('p50');
      expect(data.latency).toHaveProperty('p95');
      expect(data.latency).toHaveProperty('p99');

      // Verificar estrutura de cache
      expect(data.cache).toHaveProperty('hitRate');
      expect(data.cache).toHaveProperty('hits');
      expect(data.cache).toHaveProperty('misses');

      // Verificar estrutura de SLA
      expect(data.sla).toHaveProperty('target');
      expect(data.sla).toHaveProperty('compliance');
      expect(data.sla.target).toBe(500);
    }, 10000);

    it('deve negar acesso a não-admins', async () => {
      const { response } = await performanceMetricsTest('GET', '/api/admin/performance-metrics', {
        role: 'ORGANIZADOR',
      });

      expect(response.status).toBe(403);
    }, 10000);
  });

  describe('Performance SLA Compliance', () => {
    it('P95 deve estar abaixo de 500ms em 10 requisições', async () => {
      const durations: number[] = [];

      // Executar 10 requisições
      for (let i = 0; i < 10; i++) {
        const { duration } = await performanceMetricsTest('GET', '/api/events');
        durations.push(duration);
      }

      // Calcular P95
      durations.sort((a, b) => a - b);
      const p95Index = Math.ceil(durations.length * 0.95) - 1;
      const p95 = durations[p95Index];

      expect(p95).toBeLessThan(500);
    }, 60000);

    it('Cache hit rate deve ser > 50% após warm-up', async () => {
      let hits = 0;
      let misses = 0;

      // Warm-up: 5 requisições iniciais
      for (let i = 0; i < 5; i++) {
        await performanceMetricsTest('GET', '/api/events');
      }

      // Medir cache hit rate em 10 requisições
      for (let i = 0; i < 10; i++) {
        const { cacheHit } = await performanceMetricsTest('GET', '/api/events');
        if (cacheHit) {
          hits++;
        } else {
          misses++;
        }
      }

      const hitRate = (hits / (hits + misses)) * 100;
      expect(hitRate).toBeGreaterThan(50);
    }, 60000);

    it('Requisições lentas (> 500ms) devem ser < 5%', async () => {
      const total = 20;
      let slowRequests = 0;

      for (let i = 0; i < total; i++) {
        const { duration } = await performanceMetricsTest('GET', '/api/events');
        if (duration > 500) {
          slowRequests++;
        }
      }

      const slowPercentage = (slowRequests / total) * 100;
      expect(slowPercentage).toBeLessThan(5);
    }, 120000);
  });

  describe('Cache Invalidation', () => {
    it('deve invalidar cache após POST', async () => {
      // Popular cache
      const { cacheHit: firstHit } = await performanceMetricsTest('GET', '/api/events');
      expect(firstHit).toBeDefined();

      // Criar novo evento (deve invalidar cache)
      await performanceMetricsTest('POST', '/api/events', {
        body: {
          name: 'Test Event',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        },
      });

      // Próxima requisição GET deve ser cache miss
      const { cacheHit: afterPost } = await performanceMetricsTest('GET', '/api/events');
      expect(afterPost).toBe(false);
    }, 15000);

    it('deve invalidar cache após PUT', async () => {
      // Popular cache com evento específico
      await performanceMetricsTest('GET', '/api/events/event-id-123');

      // Atualizar evento
      await performanceMetricsTest('PUT', '/api/events/event-id-123', {
        body: { name: 'Updated Event' },
      });

      // Cache deve estar invalidado
      const { cacheHit } = await performanceMetricsTest('GET', '/api/events/event-id-123');
      expect(cacheHit).toBe(false);
    }, 15000);

    it('deve invalidar cache após DELETE', async () => {
      // Popular cache
      await performanceMetricsTest('GET', '/api/events');

      // Deletar evento
      await performanceMetricsTest('DELETE', '/api/events/event-id-123');

      // Cache deve estar invalidado
      const { cacheHit } = await performanceMetricsTest('GET', '/api/events');
      expect(cacheHit).toBe(false);
    }, 15000);
  });
});
