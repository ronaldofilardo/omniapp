import { useCallback } from 'react'
import useQuery from './useQuery'

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

interface HealthEvent {
  id: string
  title: string
  description?: string
  date: string
  type: string
  professionalId: string
  startTime?: string
  endTime?: string
  observation?: string
  instructions?: boolean
  status?: 'past' | 'current' | 'future'
}

/**
 * Hook for fetching and caching user events
 * Uses intelligent caching to reduce API calls
 */
export function useUserEvents(userId: string | null) {
  const fetcher = useCallback(async (): Promise<HealthEvent[]> => {
    if (!userId) throw new Error('User ID is required')
    
    const response = await fetch(`/api/events?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`)
    }
    
    const data = await response.json()
    const eventsData = Array.isArray(data) ? data : data.events || [];
    if (!Array.isArray(eventsData)) {
      throw new Error('Invalid events data format')
    }
    
    return eventsData
  }, [userId])

  return useQuery<HealthEvent[]>(
    `events_${userId}`,
    fetcher,
    {
      enabled: !!userId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true
    }
  )
}

/**
 * Hook for fetching and caching user professionals
 * Uses intelligent caching to reduce API calls
 */
export function useUserProfessionals(userId: string | null) {
  const fetcher = useCallback(async (): Promise<Professional[]> => {
    if (!userId) throw new Error('User ID is required')
    
    const response = await fetch(`/api/professionals?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch professionals: ${response.status}`)
    }
    
    const data = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('Invalid professionals data format')
    }
    
    return data
  }, [userId])

  return useQuery<Professional[]>(
    `professionals_${userId}`,
    fetcher,
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes (professionals change less frequently)
      cacheTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: true
    }
  )
}

/**
 * Hook for fetching repository data
 * Uses longer cache times since repository data changes less frequently
 */
export function useRepositoryData(userId: string | null) {
  const fetcher = useCallback(async (): Promise<any> => {
    if (!userId) throw new Error('User ID is required')
    
    const response = await fetch(`/api/repository?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch repository data: ${response.status}`)
    }
    
    return response.json()
  }, [userId])

  return useQuery(
    `repository_${userId}`,
    fetcher,
    {
      enabled: !!userId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false // Repository data doesn't need immediate refresh
    }
  )
}
