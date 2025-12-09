/**
 * Serviço de Cache Distribuído Redis
 * 
 * Implementa cache para queries frequentes usando Redis
 * Reduz latência e carga no banco de dados
 */

import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const CACHE_ENABLED = process.env.REDIS_CACHE_ENABLED !== '0';
const CACHE_KEY_PREFIX = 'cache:';

// TTLs padrão por tipo de dado (em segundos)
export const CACHE_TTL = {
  EVENTS_LIST: 300, // 5 minutos
  EVENT_DETAIL: 600, // 10 minutos
  PROFESSIONALS: 900, // 15 minutos
  USER_PROFILE: 1800, // 30 minutos
  NOTIFICATIONS: 60, // 1 minuto
  REPORTS: 300, // 5 minutos
} as const;

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
}

/**
 * Buscar valor do cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!CACHE_ENABLED || !redis) {
    return null;
  }

  try {
    const fullKey = `${CACHE_KEY_PREFIX}${key}`;
    const value = await redis.get(fullKey);

    if (value === null) {
      await incrementCacheStats('misses');
      return null;
    }

    await incrementCacheStats('hits');
    return JSON.parse(value as string) as T;
  } catch (error) {
    console.error('[CACHE] Erro ao buscar do cache:', error);
    return null;
  }
}

/**
 * Armazenar valor no cache
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  if (!CACHE_ENABLED || !redis) {
    return false;
  }

  try {
    const fullKey = `${CACHE_KEY_PREFIX}${key}`;
    const ttl = options.ttl || CACHE_TTL.EVENTS_LIST;

    await redis.setex(fullKey, ttl, JSON.stringify(value));

    // Armazenar tags para invalidação em grupo
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        const tagKey = `${CACHE_KEY_PREFIX}tag:${tag}`;
        await redis.sadd(tagKey, fullKey);
        await redis.expire(tagKey, ttl);
      }
    }

    return true;
  } catch (error) {
    console.error('[CACHE] Erro ao armazenar no cache:', error);
    return false;
  }
}

/**
 * Deletar valor do cache
 */
export async function cacheDel(key: string): Promise<boolean> {
  if (!redis) return false;

  try {
    const fullKey = `${CACHE_KEY_PREFIX}${key}`;
    await redis.del(fullKey);
    return true;
  } catch (error) {
    console.error('[CACHE] Erro ao deletar do cache:', error);
    return false;
  }
}

/**
 * Invalidar cache por tag
 */
export async function cacheInvalidateByTag(tag: string): Promise<number> {
  if (!redis) return 0;

  try {
    const tagKey = `${CACHE_KEY_PREFIX}tag:${tag}`;
    const keys = await redis.smembers(tagKey);

    if (keys.length === 0) return 0;

    // Deletar todas as chaves associadas à tag
    await Promise.all(keys.map(key => redis.del(key as string)));
    await redis.del(tagKey);

    console.log(`[CACHE] Invalidados ${keys.length} itens da tag: ${tag}`);
    return keys.length;
  } catch (error) {
    console.error('[CACHE] Erro ao invalidar por tag:', error);
    return 0;
  }
}

/**
 * Limpar todo o cache (usar com cuidado!)
 */
export async function cacheClear(): Promise<number> {
  if (!redis) return 0;

  try {
    const pattern = `${CACHE_KEY_PREFIX}*`;
    const keys = await redis.keys(pattern);

    if (keys.length === 0) return 0;

    await Promise.all(keys.map(key => redis.del(key)));

    console.log(`[CACHE] Cache limpo: ${keys.length} chaves removidas`);
    return keys.length;
  } catch (error) {
    console.error('[CACHE] Erro ao limpar cache:', error);
    return 0;
  }
}

/**
 * Obter estatísticas do cache
 */
export async function getCacheStats(): Promise<CacheStats> {
  if (!redis) {
    return { hits: 0, misses: 0, hitRate: 0, totalKeys: 0 };
  }

  try {
    const hits = parseInt(await redis.get('cache:stats:hits') as string || '0');
    const misses = parseInt(await redis.get('cache:stats:misses') as string || '0');
    const total = hits + misses;
    const hitRate = total > 0 ? Math.round((hits / total) * 100 * 100) / 100 : 0;

    const pattern = `${CACHE_KEY_PREFIX}*`;
    const keys = await redis.keys(pattern);
    const totalKeys = keys.filter(k => !k.includes(':stats:')).length;

    return {
      hits,
      misses,
      hitRate,
      totalKeys,
    };
  } catch (error) {
    console.error('[CACHE] Erro ao obter estatísticas:', error);
    return { hits: 0, misses: 0, hitRate: 0, totalKeys: 0 };
  }
}

/**
 * Incrementar contador de estatísticas
 */
async function incrementCacheStats(type: 'hits' | 'misses'): Promise<void> {
  if (!redis) return;

  try {
    const key = `cache:stats:${type}`;
    await redis.incr(key);
    await redis.expire(key, 86400); // 24 horas
  } catch (error) {
    // Silencioso - estatísticas não devem afetar funcionalidade
  }
}

/**
 * Helper: Gerar chave de cache para lista de eventos de um usuário
 */
export function getCacheKeyForUserEvents(userId: string, page: number, limit: number): string {
  return `events:user:${userId}:page:${page}:limit:${limit}`;
}

/**
 * Helper: Gerar chave de cache para detalhes de um evento
 */
export function getCacheKeyForEvent(eventId: string): string {
  return `event:${eventId}`;
}

/**
 * Helper: Gerar chave de cache para profissionais de um usuário
 */
export function getCacheKeyForUserProfessionals(userId: string): string {
  return `professionals:user:${userId}`;
}

/**
 * Helper: Gerar chave de cache para notificações de um usuário
 */
export function getCacheKeyForUserNotifications(userId: string): string {
  return `notifications:user:${userId}`;
}

/**
 * Helper: Buscar ou executar query com cache
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{ data: T; fromCache: boolean }> {
  // Tentar buscar do cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return { data: cached, fromCache: true };
  }

  // Cache miss - executar query
  const data = await fetcher();

  // Armazenar no cache (não bloquear resposta)
  cacheSet(key, data, options).catch(err =>
    console.error('[CACHE] Erro ao armazenar resultado:', err)
  );

  return { data, fromCache: false };
}
