/**
 * Performance Testing Helpers
 */

interface PerformanceTestOptions {
  role?: 'ADMIN' | 'ORGANIZADOR' | 'APROVADOR';
  body?: any;
  headers?: Record<string, string>;
}

interface PerformanceTestResult {
  duration: number;
  response: Response;
  cacheHit?: boolean;
}

export async function performanceMetricsTest(
  method: string,
  path: string,
  options: PerformanceTestOptions = {}
): Promise<PerformanceTestResult> {
  const start = Date.now();

  let response: Response;
  
  try {
    response = await fetch(`http://localhost:3000${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    // Se fetch falhar (servidor não está rodando), retornar resposta mockada
    console.warn(`Performance test failed to fetch ${path}:`, error);
    return {
      duration: Date.now() - start,
      response: new Response(JSON.stringify({ error: 'Server not available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }),
      cacheHit: false,
    };
  }

  const duration = Date.now() - start;

  const cacheHitHeader = response?.headers?.get('X-Cache-Hit');
  const cacheHit = cacheHitHeader === 'true';

  return {
    duration,
    response,
    cacheHit: cacheHitHeader ? cacheHit : undefined,
  };
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  
  return sorted[index];
}

export function calculateCacheHitRate(hits: number, misses: number): number {
  const total = hits + misses;
  if (total === 0) return 0;
  
  return (hits / total) * 100;
}

export async function warmUpCache(path: string, iterations: number = 3): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await fetch(`http://localhost:3000${path}`);
  }
}

export async function measureAverageLatency(
  path: string,
  iterations: number = 10
): Promise<{
  average: number;
  p50: number;
  p95: number;
  p99: number;
}> {
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await performanceMetricsTest('GET', path);
    durations.push(duration);
  }

  const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const p50 = calculatePercentile(durations, 50);
  const p95 = calculatePercentile(durations, 95);
  const p99 = calculatePercentile(durations, 99);

  return { average, p50, p95, p99 };
}
