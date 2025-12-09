/**
 * Setup específico para testes de performance
 * Configurações e utilitários para medição de performance
 */

import { vi, beforeAll, afterAll } from 'vitest'

// Configurações de performance
export const PERFORMANCE_CONFIG = {
  maxExecutionTime: {
    create: 100, // ms
    read: 50, // ms
    update: 100, // ms
    delete: 150, // ms
    bulkCreate: 300, // ms for 100 operations
    bulkRead: 200, // ms for 1000 records
  },
  concurrencyLevels: [1, 10, 50, 100],
  dataSizes: [10, 100, 1000, 10000]
}

// Utilitários de performance
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private measurements: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startMeasurement(name: string): () => number {
    const startTime = performance.now()
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime

      if (!this.measurements.has(name)) {
        this.measurements.set(name, [])
      }
      this.measurements.get(name)!.push(duration)

      return duration
    }
  }

  getMeasurements(name: string): number[] {
    return this.measurements.get(name) || []
  }

  getAverage(name: string): number {
    const measurements = this.getMeasurements(name)
    if (measurements.length === 0) return 0

    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length
  }

  getMin(name: string): number {
    const measurements = this.getMeasurements(name)
    return measurements.length > 0 ? Math.min(...measurements) : 0
  }

  getMax(name: string): number {
    const measurements = this.getMeasurements(name)
    return measurements.length > 0 ? Math.max(...measurements) : 0
  }

  clearMeasurements(): void {
    this.measurements.clear()
  }

  generateReport(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const report: Record<string, { avg: number; min: number; max: number; count: number }> = {}

    for (const [name, measurements] of this.measurements.entries()) {
      report[name] = {
        avg: this.getAverage(name),
        min: this.getMin(name),
        max: this.getMax(name),
        count: measurements.length
      }
    }

    return report
  }
}

// Funções auxiliares para testes de performance
export function assertPerformance(
  actualTime: number,
  maxExpectedTime: number,
  operation: string
): void {
  if (actualTime > maxExpectedTime) {
    throw new Error(
      `Performance assertion failed for ${operation}: ` +
      `expected <= ${maxExpectedTime}ms, got ${actualTime.toFixed(2)}ms`
    )
  }
}

export function createPerformanceTestData<T>(
  factory: (index: number) => T,
  size: number
): T[] {
  return Array.from({ length: size }, (_, i) => factory(i))
}

export async function runConcurrentOperations<T>(
  operations: (() => Promise<T>)[],
  concurrency: number = 10
): Promise<T[]> {
  const results: T[] = []
  const batches: (() => Promise<T>)[][] = []

  // Divide operations into batches
  for (let i = 0; i < operations.length; i += concurrency) {
    batches.push(operations.slice(i, i + concurrency))
  }

  // Execute batches sequentially
  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(op => op()))
    results.push(...batchResults)
  }

  return results
}

// Setup global para testes de performance
beforeAll(() => {
  // Configurações específicas para testes de performance
  vi.useFakeTimers()

  // Mock performance.now() se necessário
  if (typeof performance === 'undefined') {
    global.performance = {
      now: () => Date.now()
    } as any
  }
})

afterAll(() => {
  // Limpa medições após todos os testes
  PerformanceMonitor.getInstance().clearMeasurements()
  vi.useRealTimers()
})

// Exporta instância global do monitor
export const performanceMonitor = PerformanceMonitor.getInstance()
