import { useCallback, useEffect, useState } from 'react'

interface CacheOptions {
  staleTime?: number // Time before data is considered stale (default: 2 minutes)
  cacheTime?: number // Time to keep data in cache (default: 5 minutes)
  refetchOnWindowFocus?: boolean // Refetch when window gains focus (default: true)
  enabled?: boolean // Whether to automatically fetch data (default: true)
}

interface UseQueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isStale: boolean
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

const DEFAULT_STALE_TIME = 2 * 60 * 1000 // 2 minutes
const DEFAULT_CACHE_TIME = 5 * 60 * 1000 // 5 minutes

/**
 * Custom hook that implements SWR-like patterns for data fetching
 * with intelligent caching and stale-while-revalidate strategy
 */
export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): UseQueryResult<T> {
  const {
    staleTime = DEFAULT_STALE_TIME,
    cacheTime = DEFAULT_CACHE_TIME,
    refetchOnWindowFocus = true,
    enabled = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)

  // Cache utilities
  const getCachedData = useCallback((): CacheEntry<T> | null => {
    try {
      const cached = localStorage.getItem(`query_${key}`)
      if (!cached) return null
      const entry: CacheEntry<T> = JSON.parse(cached)
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(`query_${key}`)
        return null
      }
      return entry
    } catch {
      return null
    }
  }, [key])

  const setCachedData = useCallback((newData: T) => {
    const entry: CacheEntry<T> = {
      data: newData,
      timestamp: Date.now(),
      expiry: Date.now() + cacheTime
    }
    localStorage.setItem(`query_${key}`, JSON.stringify(entry))
  }, [key, cacheTime])

  const isStale = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp > staleTime
  }, [staleTime])

  // Fetch function
  const fetch = useCallback(async (force = false) => {
    if (!enabled) return

    const cached = getCachedData()
    
    // Return cached data if available and not stale, unless forced
    if (!force && cached && !isStale(cached.timestamp)) {
      if (!data) setData(cached.data)
      return
    }

    // Prevent concurrent fetches
    if (loading) return
    
    // Check if we fetched recently (within 30 seconds) and not forcing
    if (!force && Date.now() - lastFetch < 30000) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await fetcher()
      setData(result)
      setCachedData(result)
      setLastFetch(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error(`Query error for ${key}:`, err)
    } finally {
      setLoading(false)
    }
  }, [enabled, getCachedData, isStale, data, loading, lastFetch, fetcher, setCachedData, key])

  // Load from cache on mount
  useEffect(() => {
    const cached = getCachedData()
    if (cached) {
      setData(cached.data)
      // If data is stale, refetch in background
      if (isStale(cached.timestamp)) {
        fetch(false)
      }
    } else if (enabled) {
      // No cached data, fetch immediately
      fetch(false)
    }
  }, []) // Only run on mount

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      const cached = getCachedData()
      if (!cached || isStale(cached.timestamp)) {
        fetch(false)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnWindowFocus, fetch, getCachedData, isStale])

  const refetch = useCallback(() => fetch(true), [fetch])

  const isCurrentlyStale = data ? isStale(lastFetch) : false

  return {
    data,
    loading,
    error,
    refetch,
    isStale: isCurrentlyStale
  }
}

export default useQuery
