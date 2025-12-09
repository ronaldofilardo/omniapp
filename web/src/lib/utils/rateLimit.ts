/**
 * Utilitário de rate limiting para endpoints de upload
 *
 * Implementa controle de frequência baseado em IP para prevenir abuso
 * nos endpoints de upload de arquivos.
 */

interface RateLimitEntry {
  count: number;
  last: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private map = new Map<string, RateLimitEntry>();
  private readonly limit: number;
  private readonly window: number;
  private readonly blockDuration: number;
  private readonly disabled: boolean;

  constructor(
    limit = 10,
    windowMs = 60 * 60 * 1000, // 1 hora
    blockDurationMs = 15 * 60 * 1000 // 15 minutos
  ) {
    this.limit = limit;
    this.window = windowMs;
    this.blockDuration = blockDurationMs;
    this.disabled = process.env.RATE_LIMIT_DISABLED === '1';
  }

  check(ip: string): { allowed: boolean; retryAfter?: number } {
    if (this.disabled) {
      return { allowed: true };
    }

    const now = Date.now();
    const entry = this.map.get(ip) || { count: 0, last: now };

    // Verificar se IP está bloqueado
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
      };
    }

    // Reset contador se janela expirou
    if (now - entry.last > this.window) {
      entry.count = 0;
      entry.last = now;
      delete entry.blockedUntil;
    }

    entry.count++;

    // Bloquear se excedeu limite
    if (entry.count > this.limit) {
      entry.blockedUntil = now + this.blockDuration;
      this.map.set(ip, entry);
      return {
        allowed: false,
        retryAfter: Math.ceil(this.blockDuration / 1000)
      };
    }

    this.map.set(ip, entry);
    return { allowed: true };
  }
}

// Instância global para uploads
export const uploadRateLimiter = new RateLimiter(
  parseInt(process.env.UPLOAD_RATE_LIMIT || '20'), // 20 uploads por hora por IP
  60 * 60 * 1000, // 1 hora
  15 * 60 * 1000 // 15 minutos de bloqueio
);

/**
 * Middleware de rate limiting para requests HTTP
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  rateLimiter: RateLimiter = uploadRateLimiter
) {
  return async (req: Request): Promise<Response> => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') ||
               'unknown';

    const result = rateLimiter.check(ip);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Limite de requisições excedido. Tente novamente mais tarde.',
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': result.retryAfter?.toString() || '900'
          }
        }
      );
    }

    return handler(req);
  };
}