/**
 * Cache global centralizado para prevenir requisições simultâneas
 * Implementa padrão Singleton com deduplicação automática
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

class GlobalCache {
  private static instance: GlobalCache
  private cache = new Map<string, CacheEntry<any>>()
  private pendingRequests = new Map<string, PendingRequest<any>>()
  
  // Cache configuration
  private readonly DEFAULT_STALE_TIME = 2 * 60 * 1000 // 2 minutes
  private readonly DEFAULT_CACHE_TIME = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CONCURRENT_TIME = 30 * 1000 // 30 seconds to prevent concurrent requests

  public static getInstance(): GlobalCache {
    if (!GlobalCache.instance) {
      GlobalCache.instance = new GlobalCache()
    }
    return GlobalCache.instance
  }

  /**
   * Get cached data if available and not expired
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  /**
   * Check if cached data is stale (but still valid)
   */
  public isStale(key: string, staleTime = this.DEFAULT_STALE_TIME): boolean {
    const entry = this.cache.get(key)
    if (!entry) return true
    
    return Date.now() - entry.timestamp > staleTime
  }

  /**
   * Set data in cache
   */
  public set<T>(key: string, data: T, cacheTime = this.DEFAULT_CACHE_TIME): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + cacheTime
    }
    this.cache.set(key, entry)
    console.log(`[GlobalCache] Cached data for key: ${key}`)
  }

  /**
   * Execute fetch with automatic deduplication
   * If same request is already pending, return the existing promise
   */
  public async fetchWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      staleTime?: number
      cacheTime?: number
      force?: boolean
    } = {}
  ): Promise<T> {
    const { staleTime = this.DEFAULT_STALE_TIME, cacheTime = this.DEFAULT_CACHE_TIME, force = false } = options

    // Return cached data if available and not stale (unless forced)
    if (!force) {
      const cached = this.get<T>(key)
      if (cached && !this.isStale(key, staleTime)) {
        console.log(`[GlobalCache] Returning cached data for key: ${key}`)
        return cached
      }
    }

    // Check if same request is already pending
    const pending = this.pendingRequests.get(key)
    if (pending && Date.now() - pending.timestamp < this.MAX_CONCURRENT_TIME) {
      console.log(`[GlobalCache] Deduplicating request for key: ${key}`)
      return pending.promise
    }

    // Create new request
    console.log(`[GlobalCache] Making new request for key: ${key}`)
    const promise = fetcher()
      .then(data => {
        this.set(key, data, cacheTime)
        this.pendingRequests.delete(key)
        return data
      })
      .catch(error => {
        this.pendingRequests.delete(key)
        throw error
      })

    this.pendingRequests.set(key, { promise, timestamp: Date.now() })
    return promise
  }

  /**
   * Invalidate cache for specific key or pattern
   */
  public invalidate(keyOrPattern: string): void {
    if (keyOrPattern.includes('*')) {
      // Pattern-based invalidation
      const pattern = keyOrPattern.replace(/\*/g, '.*')
      const regex = new RegExp(pattern)
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key)
          console.log(`[GlobalCache] Invalidated cache for key: ${key}`)
        }
      }
    } else {
      // Exact key invalidation
      this.cache.delete(keyOrPattern)
      this.pendingRequests.delete(keyOrPattern)
      console.log(`[GlobalCache] Invalidated cache for key: ${keyOrPattern}`)
    }
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
    console.log('[GlobalCache] Cleared all cache')
  }

  /**
   * Get cache statistics for debugging
   */
  public getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Cleanup expired entries
   */
  public cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    // Cleanup old pending requests
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > this.MAX_CONCURRENT_TIME) {
        this.pendingRequests.delete(key)
      }
    }
    
    if (cleaned > 0) {
      console.log(`[GlobalCache] Cleaned up ${cleaned} expired entries`)
    }
  }
}

// Export singleton instance
export const globalCache = GlobalCache.getInstance()

// Auto cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup()
  }, 5 * 60 * 1000)
}

// Clear cache on page reload (in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.addEventListener('beforeunload', () => {
    globalCache.clear()
  })
}
