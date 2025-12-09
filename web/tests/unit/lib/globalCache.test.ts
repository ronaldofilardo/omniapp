import { describe, it, expect, vi, beforeEach } from 'vitest'
import { globalCache } from '@/lib/globalCache'

// Mock fetch para testes
;(globalThis as any).fetch = vi.fn()

describe('GlobalCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalCache.clear()
    localStorage.clear()
  })

  describe('get/set operations', () => {
    it('should store and retrieve data', () => {
      const testData = { id: '1', name: 'Test' }
      
      globalCache.set('test-key', testData)
      const retrieved = globalCache.get('test-key')
      
      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', () => {
      const result = globalCache.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should return null for expired data', () => {
      const testData = { id: '1', name: 'Test' }
      
      // Set data with very short cache time (1ms)
      globalCache.set('test-key', testData, 1)
      
      // Wait for expiration
      return new Promise(resolve => {
        setTimeout(() => {
          const result = globalCache.get('test-key')
          expect(result).toBeNull()
          resolve(undefined)
        }, 10)
      })
    })
  })

  describe('isStale', () => {
    it('should return true for non-existent data', () => {
      const isStale = globalCache.isStale('non-existent-key')
      expect(isStale).toBe(true)
    })

    it('should return false for fresh data', () => {
      const testData = { id: '1', name: 'Test' }
      globalCache.set('test-key', testData)
      
      const isStale = globalCache.isStale('test-key', 60000) // 1 minute stale time
      expect(isStale).toBe(false)
    })

    it('should return true for stale data', async () => {
      const testData = { id: '1', name: 'Test' }
      globalCache.set('test-key', testData)
      // Aguarda 10ms para garantir expiração
      await new Promise(resolve => setTimeout(resolve, 10))
      const isStale = globalCache.isStale('test-key', 0) // 0ms stale time
      expect(isStale).toBe(true)
    })
  })

  describe('fetchWithDeduplication', () => {
    it('should fetch data when cache is empty', async () => {
      const mockData = { id: '1', name: 'Test' }
      const fetcher = vi.fn().mockResolvedValue(mockData)
      
      const result = await globalCache.fetchWithDeduplication('test-key', fetcher)
      
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockData)
      expect(globalCache.get('test-key')).toEqual(mockData)
    })

    it('should return cached data when not stale', async () => {
      const mockData = { id: '1', name: 'Test' }
      const fetcher = vi.fn().mockResolvedValue({ id: '2', name: 'Different' })
      
      // Pre-populate cache
      globalCache.set('test-key', mockData)
      
      const result = await globalCache.fetchWithDeduplication(
        'test-key', 
        fetcher,
        { staleTime: 60000 } // 1 minute
      )
      
      expect(fetcher).not.toHaveBeenCalled()
      expect(result).toEqual(mockData)
    })

    it('should deduplicate concurrent requests', async () => {
      const mockData = { id: '1', name: 'Test' }
      const fetcher = vi.fn().mockResolvedValue(mockData)
      
      // Start multiple requests simultaneously
      const promises = [
        globalCache.fetchWithDeduplication('test-key', fetcher),
        globalCache.fetchWithDeduplication('test-key', fetcher),
        globalCache.fetchWithDeduplication('test-key', fetcher)
      ]
      
      const results = await Promise.all(promises)
      
      // All should return the same data
      results.forEach(result => {
        expect(result).toEqual(mockData)
      })
      
      // But fetcher should only be called once
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    it('should force fetch when force option is true', async () => {
      const cachedData = { id: '1', name: 'Cached' }
      const freshData = { id: '2', name: 'Fresh' }
      const fetcher = vi.fn().mockResolvedValue(freshData)
      
      // Pre-populate cache
      globalCache.set('test-key', cachedData)
      
      const result = await globalCache.fetchWithDeduplication(
        'test-key',
        fetcher,
        { force: true }
      )
      
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(result).toEqual(freshData)
    })
  })

  describe('invalidate', () => {
    it('should invalidate specific key', () => {
      globalCache.set('test-key-1', { data: '1' })
      globalCache.set('test-key-2', { data: '2' })
      
      globalCache.invalidate('test-key-1')
      
      expect(globalCache.get('test-key-1')).toBeNull()
      expect(globalCache.get('test-key-2')).toEqual({ data: '2' })
    })

    it('should invalidate by pattern', () => {
      globalCache.set('user_123_events', { data: 'events' })
      globalCache.set('user_123_professionals', { data: 'professionals' })
      globalCache.set('user_456_events', { data: 'other-events' })
      
      globalCache.invalidate('user_123_*')
      
      expect(globalCache.get('user_123_events')).toBeNull()
      expect(globalCache.get('user_123_professionals')).toBeNull()
      expect(globalCache.get('user_456_events')).toEqual({ data: 'other-events' })
    })
  })

  describe('clear', () => {
    it('should clear all cache', () => {
      globalCache.set('key1', { data: '1' })
      globalCache.set('key2', { data: '2' })
      
      globalCache.clear()
      
      expect(globalCache.get('key1')).toBeNull()
      expect(globalCache.get('key2')).toBeNull()
    })
  })

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      // Add data with short expiration
      globalCache.set('short-lived', { data: 'test' }, 1) // 1ms
      globalCache.set('long-lived', { data: 'test' }, 60000) // 1 minute
      
      return new Promise(resolve => {
        setTimeout(() => {
          globalCache.cleanup()
          
          expect(globalCache.get('short-lived')).toBeNull()
          expect(globalCache.get('long-lived')).toEqual({ data: 'test' })
          resolve(undefined)
        }, 10)
      })
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', () => {
      globalCache.set('key1', { data: '1' })
      globalCache.set('key2', { data: '2' })
      
      const stats = globalCache.getStats()
      
      expect(stats.cacheSize).toBe(2)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })
  })
})

