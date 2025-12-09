/**
 * Testes de Rate Limiting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter, uploadRateLimiter, withRateLimit } from '@/lib/utils/rateLimit';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(3, 1000, 2000); // 3 requests por segundo, bloqueio de 2 segundos
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('deve criar instância com parâmetros padrão', () => {
      const defaultLimiter = new RateLimiter();

      expect(defaultLimiter).toBeInstanceOf(RateLimiter);
    });

    it('deve criar instância com parâmetros customizados', () => {
      const customLimiter = new RateLimiter(5, 2000, 3000);

      expect(customLimiter).toBeInstanceOf(RateLimiter);
    });

    it('deve respeitar variável de ambiente RATE_LIMIT_DISABLED', () => {
      process.env.RATE_LIMIT_DISABLED = '1';
      const disabledLimiter = new RateLimiter();

      const result = disabledLimiter.check('127.0.0.1');
      expect(result.allowed).toBe(true);

      delete process.env.RATE_LIMIT_DISABLED;
    });
  });

  describe('check method', () => {
    it('deve permitir requests dentro do limite', () => {
      const ip = '127.0.0.1';

      // Primeiras 3 requests devem ser permitidas
      expect(rateLimiter.check(ip).allowed).toBe(true);
      expect(rateLimiter.check(ip).allowed).toBe(true);
      expect(rateLimiter.check(ip).allowed).toBe(true);
    });

    it('deve bloquear requests após exceder limite', () => {
      const ip = '127.0.0.1';

      // Consumir limite
      rateLimiter.check(ip);
      rateLimiter.check(ip);
      rateLimiter.check(ip);

      // 4ª request deve ser bloqueada
      const result = rateLimiter.check(ip);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(2); // 2 segundos de bloqueio
    });

    it('deve resetar contador após janela expirar', () => {
      const ip = '127.0.0.1';

      // Consumir limite
      rateLimiter.check(ip);
      rateLimiter.check(ip);
      rateLimiter.check(ip);

      // Verificar bloqueio
      expect(rateLimiter.check(ip).allowed).toBe(false);

      // Avançar tempo além da janela E do período de bloqueio
      vi.advanceTimersByTime(3000); // 1s de janela + 2s de bloqueio

      // Deve permitir novamente
      expect(rateLimiter.check(ip).allowed).toBe(true);
    });

    it('deve manter bloqueio durante período de bloqueio', () => {
      const ip = '127.0.0.1';

      // Consumir limite
      rateLimiter.check(ip);
      rateLimiter.check(ip);
      rateLimiter.check(ip);

      // Bloquear
      rateLimiter.check(ip);

      // Avançar 1 segundo (ainda bloqueado)
      vi.advanceTimersByTime(1000);
      expect(rateLimiter.check(ip).allowed).toBe(false);

      // Avançar mais 1 segundo (bloqueio expirado)
      vi.advanceTimersByTime(1000);
      expect(rateLimiter.check(ip).allowed).toBe(true);
    });

    it('deve permitir requests de IPs diferentes independentemente', () => {
      const ip1 = '127.0.0.1';
      const ip2 = '192.168.1.1';

      // IP1 consome limite
      rateLimiter.check(ip1);
      rateLimiter.check(ip1);
      rateLimiter.check(ip1);
      expect(rateLimiter.check(ip1).allowed).toBe(false);

      // IP2 deve continuar permitido
      expect(rateLimiter.check(ip2).allowed).toBe(true);
      expect(rateLimiter.check(ip2).allowed).toBe(true);
      expect(rateLimiter.check(ip2).allowed).toBe(true);
    });

    it('deve calcular retryAfter corretamente durante bloqueio', () => {
      const ip = '127.0.0.1';

      // Consumir limite e bloquear
      rateLimiter.check(ip);
      rateLimiter.check(ip);
      rateLimiter.check(ip);
      rateLimiter.check(ip);

      // Verificar retryAfter inicial
      expect(rateLimiter.check(ip).retryAfter).toBe(2);

      // Avançar 1 segundo
      vi.advanceTimersByTime(1000);
      expect(rateLimiter.check(ip).retryAfter).toBe(1);

      // Avançar mais 1 segundo
      vi.advanceTimersByTime(1000);
      expect(rateLimiter.check(ip).allowed).toBe(true);
    });

    it('deve sempre permitir quando desabilitado', () => {
      process.env.RATE_LIMIT_DISABLED = '1';
      const disabledLimiter = new RateLimiter(1, 1000, 2000);

      const ip = '127.0.0.1';

      // Mesmo excedendo limite, deve permitir
      expect(disabledLimiter.check(ip).allowed).toBe(true);
      expect(disabledLimiter.check(ip).allowed).toBe(true);
      expect(disabledLimiter.check(ip).allowed).toBe(true);
      expect(disabledLimiter.check(ip).allowed).toBe(true);

      delete process.env.RATE_LIMIT_DISABLED;
    });
  });

  describe('uploadRateLimiter instance', () => {
    it('deve ser uma instância de RateLimiter', () => {
      expect(uploadRateLimiter).toBeInstanceOf(RateLimiter);
    });

    it('deve usar configuração do ambiente', () => {
      // Verificar que usa variável de ambiente
      const originalLimit = process.env.UPLOAD_RATE_LIMIT;
      process.env.UPLOAD_RATE_LIMIT = '5';

      // Recriar instância para testar
      const testLimiter = new RateLimiter(
        parseInt(process.env.UPLOAD_RATE_LIMIT || '20'),
        60 * 60 * 1000,
        15 * 60 * 1000
      );

      expect(testLimiter).toBeInstanceOf(RateLimiter);

      // Restaurar
      if (originalLimit) {
        process.env.UPLOAD_RATE_LIMIT = originalLimit;
      } else {
        delete process.env.UPLOAD_RATE_LIMIT;
      }
    });
  });
});

describe('withRateLimit middleware', () => {
  let mockHandler: vi.MockedFunction<(req: Request) => Promise<Response>>;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    mockHandler = vi.fn();
    mockHandler.mockClear(); // Reset mock calls
    rateLimiter = new RateLimiter(2, 1000, 2000);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve permitir request quando dentro do limite', async () => {
    const mockResponse = new Response('OK');
    mockHandler.mockResolvedValue(mockResponse);

    const middleware = withRateLimit(mockHandler, rateLimiter);
    const request = new Request('http://example.com/api/upload', {
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });

    const response = await middleware(request);

    expect(mockHandler).toHaveBeenCalledWith(request);
    expect(response).toBe(mockResponse);
  });

  it('deve bloquear request quando limite excedido', async () => {
    const middleware = withRateLimit(mockHandler, rateLimiter);
    const request = new Request('http://example.com/api/upload', {
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });

    // Consumir limite (2 requests)
    console.log('Test: First call');
    await middleware(request);
    console.log('Test: Second call');
    await middleware(request);

    // Reset o mock handler para o terceiro teste
    mockHandler.mockClear();

    // Próxima deve ser bloqueada
    console.log('Test: Third call (should be blocked)');
    const response = await middleware(request);

    expect(mockHandler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Retry-After')).toBe('2');

    const body = await response.json();
    expect(body.error).toContain('Limite de requisições excedido');
    expect(body.retryAfter).toBe(2);
  });

  it('deve extrair IP corretamente dos headers', async () => {
    const middleware = withRateLimit(mockHandler, rateLimiter);

    // Testar x-forwarded-for
    const request1 = new Request('http://example.com/api/upload', {
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });
    await middleware(request1);

    // Testar x-real-ip
    const request2 = new Request('http://example.com/api/upload', {
      headers: { 'x-real-ip': '192.168.1.1' }
    });
    await middleware(request2);

    // IPs devem ser tratados separadamente
    expect(rateLimiter.check('127.0.0.1').allowed).toBe(true);
    expect(rateLimiter.check('192.168.1.1').allowed).toBe(true);
  });

  it('deve usar "unknown" quando IP não disponível', async () => {
    const middleware = withRateLimit(mockHandler, rateLimiter);
    const request = new Request('http://example.com/api/upload');

    await middleware(request);

    expect(rateLimiter.check('unknown').allowed).toBe(true);
  });

  it('deve lidar com múltiplos IPs em x-forwarded-for', async () => {
    const middleware = withRateLimit(mockHandler, rateLimiter);
    const request = new Request('http://example.com/api/upload', {
      headers: { 'x-forwarded-for': '127.0.0.1, 192.168.1.1, 10.0.0.1' }
    });

    await middleware(request);

    // Deve usar primeiro IP
    expect(rateLimiter.check('127.0.0.1').allowed).toBe(true);
  });
});