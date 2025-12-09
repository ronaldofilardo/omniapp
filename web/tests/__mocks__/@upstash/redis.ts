import { vi } from 'vitest'

// =============================================================================
// MOCK GLOBAL DO @upstash/redis
// =============================================================================

export const mockRedisInstance = {
  get: vi.fn(),
  set: vi.fn(),
  incr: vi.fn(),
  decr: vi.fn(),
  expire: vi.fn(),
  lpush: vi.fn(),
  rpush: vi.fn(),
  lpop: vi.fn(),
  rpop: vi.fn(),
  lrange: vi.fn(),
  llen: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn(),
  hget: vi.fn(),
  hset: vi.fn(),
  hdel: vi.fn(),
  hgetall: vi.fn(),
  zadd: vi.fn(),
  zrange: vi.fn(),
  zrem: vi.fn(),
  zcard: vi.fn(),
}

// Classe Redis mockada que retorna a instância com os métodos
export class Redis {
  constructor(config?: any) {
    return mockRedisInstance as any
  }
}

// Export default para compatibilidade
export default {
  Redis,
  mockRedisInstance,
}
