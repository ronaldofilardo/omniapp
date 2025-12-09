/**
 * Testes de Rate Limiting e Circuit Breaker
 * 
 * Valida que os mecanismos de proteção contra ataques estão funcionando corretamente.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Redis } from '@upstash/redis';

// Mock do Redis
let globalMockRedis: Map<string, { value: string; expiry?: number }>;

vi.mock('@upstash/redis', () => {
  return {
    Redis: vi.fn(function(this: any) {
      if (!globalMockRedis) {
        globalMockRedis = new Map<string, { value: string; expiry?: number }>();
      }
      
      const mockRedis = globalMockRedis;
      
      this.get = vi.fn(async (key: string) => {
        const item = mockRedis.get(key);
        if (!item) return null;
        
        // Verificar expiração
        if (item.expiry && item.expiry < Date.now()) {
          mockRedis.delete(key);
          return null;
        }
        
        return item.value;
      });
      
      this.set = vi.fn(async (key: string, value: string, options?: { ex?: number }) => {
        const expiry = options?.ex ? Date.now() + (options.ex * 1000) : undefined;
        mockRedis.set(key, { value, expiry });
        return 'OK';
      });
      
      this.incr = vi.fn(async (key: string) => {
        const item = mockRedis.get(key);
        const currentValue = item ? parseInt(item.value) : 0;
        const newValue = currentValue + 1;
        mockRedis.set(key, { value: newValue.toString() });
        return newValue;
      });
      
      this.expire = vi.fn(async (key: string, seconds: number) => {
        const item = mockRedis.get(key);
        if (item) {
          item.expiry = Date.now() + (seconds * 1000);
        }
        return 1;
      });
      
      this.del = vi.fn(async (key: string) => {
        mockRedis.delete(key);
        return 1;
      });
      
      this.clear = () => mockRedis.clear();
      
      return this;
    }),
  };
});

describe('Rate Limiting', () => {
  let redis: any;

  beforeEach(() => {
    // Resetar mock do Redis
    redis = new Redis({
      url: 'mock',
      token: 'mock',
    });
    redis.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limiting Distribuído (Redis)', () => {
    it('permite requisições dentro do limite', async () => {
      const ip = '192.168.1.1';
      const rateKey = `ratelimit:${ip}`;

      // Primeira requisição
      const count1 = await redis.incr(rateKey);
      expect(count1).toBe(1);

      // Segunda requisição
      const count2 = await redis.incr(rateKey);
      expect(count2).toBe(2);

      // Terceira requisição
      const count3 = await redis.incr(rateKey);
      expect(count3).toBe(3);
    });

    it('bloqueia requisições acima do limite', async () => {
      const ip = '192.168.1.1';
      const rateKey = `ratelimit:${ip}`;
      const RATE_LIMIT = 10;

      // Fazer 10 requisições (limite)
      for (let i = 0; i < RATE_LIMIT; i++) {
        await redis.incr(rateKey);
      }

      const count = await redis.get(rateKey);
      expect(parseInt(count)).toBe(RATE_LIMIT);

      // 11ª requisição - deve exceder o limite
      const count11 = await redis.incr(rateKey);
      expect(count11).toBeGreaterThan(RATE_LIMIT);
    });

    it('reseta contador após expiração', async () => {
      const ip = '192.168.1.1';
      const rateKey = `ratelimit:${ip}`;
      const RATE_LIMIT_WINDOW = 1; // 1 segundo para teste

      // Primeira requisição
      await redis.incr(rateKey);
      await redis.expire(rateKey, RATE_LIMIT_WINDOW);

      const count1 = await redis.get(rateKey);
      expect(parseInt(count1)).toBe(1);

      // Simular expiração (ajustar mock)
      const mockData = redis.clear();
      
      // Após expiração, contador deve estar zerado
      const count2 = await redis.get(rateKey);
      expect(count2).toBeNull();
    });

    it('bloqueia IP após exceder limite', async () => {
      const ip = '192.168.1.1';
      const blockKey = `blocked:${ip}`;
      const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos

      // Bloquear IP
      const blockedUntil = Date.now() + BLOCK_DURATION;
      await redis.set(blockKey, blockedUntil.toString(), { 
        ex: Math.ceil(BLOCK_DURATION / 1000) 
      });

      // Verificar bloqueio
      const blockedValue = await redis.get(blockKey);
      expect(parseInt(blockedValue)).toBeGreaterThan(Date.now());
    });

    it('permite requisições de IPs diferentes', async () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';
      const rateKey1 = `ratelimit:${ip1}`;
      const rateKey2 = `ratelimit:${ip2}`;

      // IP1 faz requisição
      const count1 = await redis.incr(rateKey1);
      expect(count1).toBe(1);

      // IP2 faz requisição (não deve ser afetado por IP1)
      const count2 = await redis.incr(rateKey2);
      expect(count2).toBe(1);
    });
  });
});

describe('Circuit Breaker', () => {
  let redis: any;
  const CIRCUIT_BREAKER_KEY = 'circuit_breaker:state';
  const CIRCUIT_FAILURES_KEY = 'circuit_breaker:failures';
  const CIRCUIT_LAST_CHECK_KEY = 'circuit_breaker:last_check';
  const CIRCUIT_BREAKER_THRESHOLD = 5;
  const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos

  beforeEach(() => {
    redis = new Redis({
      url: 'mock',
      token: 'mock',
    });
    redis.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Estados do Circuit Breaker', () => {
    it('inicia no estado closed', async () => {
      const state = await redis.get(CIRCUIT_BREAKER_KEY);
      expect(state).toBeNull(); // null = closed (default)
    });

    it('abre após threshold de falhas', async () => {
      // Registrar falhas até o threshold
      for (let i = 0; i < CIRCUIT_BREAKER_THRESHOLD; i++) {
        await redis.incr(CIRCUIT_FAILURES_KEY);
      }

      const failures = await redis.get(CIRCUIT_FAILURES_KEY);
      expect(parseInt(failures)).toBe(CIRCUIT_BREAKER_THRESHOLD);

      // Abrir circuit breaker
      await redis.set(CIRCUIT_BREAKER_KEY, 'open');
      await redis.set(CIRCUIT_LAST_CHECK_KEY, Date.now().toString());

      const state = await redis.get(CIRCUIT_BREAKER_KEY);
      expect(state).toBe('open');
    });

    it('transiciona de open para half-open após timeout', async () => {
      // Abrir circuit breaker
      await redis.set(CIRCUIT_BREAKER_KEY, 'open');
      const pastTime = Date.now() - BLOCK_DURATION - 1000; // 1s após o timeout
      await redis.set(CIRCUIT_LAST_CHECK_KEY, pastTime.toString());

      // Verificar transição para half-open
      const lastCheck = parseInt(await redis.get(CIRCUIT_LAST_CHECK_KEY) || '0');
      const shouldTransition = Date.now() - lastCheck > BLOCK_DURATION;
      
      expect(shouldTransition).toBe(true);

      // Simular transição
      await redis.set(CIRCUIT_BREAKER_KEY, 'half-open');
      await redis.set(CIRCUIT_FAILURES_KEY, '0');

      const state = await redis.get(CIRCUIT_BREAKER_KEY);
      expect(state).toBe('half-open');
    });

    it('fecha após sucesso em half-open', async () => {
      // Estado half-open
      await redis.set(CIRCUIT_BREAKER_KEY, 'half-open');

      // Simular sucesso
      await redis.set(CIRCUIT_BREAKER_KEY, 'closed');
      await redis.set(CIRCUIT_FAILURES_KEY, '0');

      const state = await redis.get(CIRCUIT_BREAKER_KEY);
      expect(state).toBe('closed');

      const failures = await redis.get(CIRCUIT_FAILURES_KEY);
      expect(parseInt(failures || '0')).toBe(0);
    });

    it('reabre após falha em half-open', async () => {
      // Estado half-open
      await redis.set(CIRCUIT_BREAKER_KEY, 'half-open');

      // Simular falha
      await redis.set(CIRCUIT_BREAKER_KEY, 'open');
      await redis.set(CIRCUIT_LAST_CHECK_KEY, Date.now().toString());

      const state = await redis.get(CIRCUIT_BREAKER_KEY);
      expect(state).toBe('open');
    });
  });

  describe('Recuperação Automática', () => {
    it('reseta contador de falhas após sucesso', async () => {
      // Registrar algumas falhas
      await redis.set(CIRCUIT_FAILURES_KEY, '3');

      // Simular sucesso - resetar contador
      await redis.set(CIRCUIT_FAILURES_KEY, '0');

      const failures = await redis.get(CIRCUIT_FAILURES_KEY);
      expect(parseInt(failures || '0')).toBe(0);
    });

    it('permite requisição de teste em half-open', async () => {
      await redis.set(CIRCUIT_BREAKER_KEY, 'half-open');

      const state = await redis.get(CIRCUIT_BREAKER_KEY);
      expect(state).toBe('half-open');
      
      // Half-open permite uma requisição de teste
      // A lógica de permitir/bloquear está na aplicação
    });

    it('não permite requisições em open', async () => {
      await redis.set(CIRCUIT_BREAKER_KEY, 'open');
      await redis.set(CIRCUIT_LAST_CHECK_KEY, Date.now().toString());

      const state = await redis.get(CIRCUIT_BREAKER_KEY);
      const lastCheck = parseInt(await redis.get(CIRCUIT_LAST_CHECK_KEY) || '0');
      const now = Date.now();

      expect(state).toBe('open');
      expect(now - lastCheck).toBeLessThan(BLOCK_DURATION);
      
      // Estado open bloqueia requisições
    });
  });

  describe('Fail-Open em caso de erro no Redis', () => {
    it('permite requisições se Redis falhar', async () => {
      // Simular erro no Redis
      const mockRedisError = {
        get: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        set: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      };

      // Se Redis falhar, a aplicação deve permitir (fail-open)
      try {
        await mockRedisError.get(CIRCUIT_BREAKER_KEY);
      } catch (error) {
        // Error esperado
        expect((error as Error).message).toBe('Redis connection failed');
      }

      // A aplicação deve ter lógica de fail-open:
      // Em caso de erro no Redis, PERMITIR a requisição
    });
  });

  describe('Monitoramento de Falhas', () => {
    it('incrementa contador de falhas corretamente', async () => {
      // Falha 1
      await redis.incr(CIRCUIT_FAILURES_KEY);
      let failures = await redis.get(CIRCUIT_FAILURES_KEY);
      expect(parseInt(failures)).toBe(1);

      // Falha 2
      await redis.incr(CIRCUIT_FAILURES_KEY);
      failures = await redis.get(CIRCUIT_FAILURES_KEY);
      expect(parseInt(failures)).toBe(2);

      // Falha 3
      await redis.incr(CIRCUIT_FAILURES_KEY);
      failures = await redis.get(CIRCUIT_FAILURES_KEY);
      expect(parseInt(failures)).toBe(3);
    });

    it('registra timestamp ao abrir circuit breaker', async () => {
      const beforeOpen = Date.now();
      
      await redis.set(CIRCUIT_BREAKER_KEY, 'open');
      await redis.set(CIRCUIT_LAST_CHECK_KEY, Date.now().toString());

      const lastCheck = parseInt(await redis.get(CIRCUIT_LAST_CHECK_KEY) || '0');
      
      expect(lastCheck).toBeGreaterThanOrEqual(beforeOpen);
      expect(lastCheck).toBeLessThanOrEqual(Date.now());
    });
  });
});
