'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { globalCache } from '../lib/globalCache'

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

export interface HealthEvent {
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
  files?: { id?: string; slot: string; name: string; url: string; physicalPath?: string; uploadDate?: string | null }[]
  doctorName?: string // Nome do médico solicitante externo
  professionalName?: string // Nome do profissional externo (outro sistema)
}

interface EventsContextType {
  events: HealthEvent[]
  professionals: Professional[]
  loading: boolean
  error: string | null
  fetchEvents: (force?: boolean) => Promise<void>
  fetchProfessionals: (force?: boolean) => Promise<void>
  createEventOptimistic: (eventData: Omit<HealthEvent, 'id'>) => Promise<void>
  updateEventOptimistic: (id: string, updates: Partial<HealthEvent>) => Promise<void>
  deleteEventOptimistic: (id: string, deleteFiles?: boolean) => Promise<void>
  refreshData: (force?: boolean) => Promise<void>
}

const EventsContext = createContext<EventsContextType | undefined>(undefined)

export const useEvents = () => {
  const context = useContext(EventsContext)
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider')
  }
  return context
}

interface EventsProviderProps {
  children: React.ReactNode
  userId: string
}

export const EventsProvider: React.FC<EventsProviderProps> = ({ children, userId }) => {
  const [events, setEvents] = useState<HealthEvent[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isFetching = useRef(false)
  const lastFetch = useRef<{ events: number, professionals: number }>({ events: 0, professionals: 0 })

  // Função de fetch com retry e cache inteligente
  const fetchWithRetry = useCallback(async (url: string, options?: RequestInit, retryCount = 0): Promise<any> => {
    try {
      const response = await fetch(url, { cache: 'no-store', ...options })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err) {
      console.error(`Fetch error for ${url}:`, err)
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchWithRetry(url, options, retryCount + 1)
      }
      throw err
    }
  }, [])

  // Fetch events with global cache and deduplication
  const fetchEvents = useCallback(async (force = false) => {
    if (!userId) return
    
    const cacheKey = `events_${userId}`
    
    try {
      setLoading(true)
      setError(null)
      
      const data = await globalCache.fetchWithDeduplication<HealthEvent[]>(
        cacheKey,
        async () => {
          console.log('[EventsContext] Fetching events from API')
          const response = await fetchWithRetry(`/api/events?userId=${encodeURIComponent(userId)}&limit=1000`)
          if (!response || !Array.isArray(response.events)) {
            throw new Error('Invalid events data')
          }
          return response.events
        },
        {
          staleTime: 2 * 60 * 1000, // 2 minutes
          cacheTime: 5 * 60 * 1000, // 5 minutes
          force
        }
      )
      
      console.log('[EventsContext] Eventos recebidos da API:', data.length, 'IDs:', data.map(e => e.id))
      setEvents(data)
      lastFetch.current.events = Date.now()
      
      // Legacy cache for multi-tab sync (temporary)
      try {
        localStorage.setItem('events', JSON.stringify(data))
      } catch (storageErr) {
        if (storageErr instanceof DOMException && storageErr.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded, skipping events cache')
        } else {
          console.error('Error storing events in localStorage:', storageErr)
        }
      }
    } catch (err) {
      setError('Erro ao buscar eventos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [userId, fetchWithRetry])

  // Fetch professionals with global cache and deduplication
  const fetchProfessionals = useCallback(async (force = false) => {
    if (!userId) return
    
    const cacheKey = `professionals_${userId}`
    
    try {
      const data = await globalCache.fetchWithDeduplication<Professional[]>(
        cacheKey,
        async () => {
          console.log('[EventsContext] Fetching professionals from API')
          const response = await fetchWithRetry(`/api/professionals?userId=${encodeURIComponent(userId)}`)
          if (!Array.isArray(response)) {
            throw new Error('Invalid professionals data')
          }
          return response
        },
        {
          staleTime: 5 * 60 * 1000, // 5 minutes
          cacheTime: 15 * 60 * 1000, // 15 minutes
          force
        }
      )
      
      setProfessionals(data)
      lastFetch.current.professionals = Date.now()
      
      // Legacy cache for multi-tab sync (temporary)
      localStorage.setItem('professionals', JSON.stringify(data))
    } catch (err) {
      console.error('Erro ao buscar profissionais:', err)
    }
  }, [userId, fetchWithRetry])

  // Refresh both with force option
  const refreshData = useCallback(async (force = false) => {
    await Promise.all([fetchEvents(force), fetchProfessionals(force)])
  }, [fetchEvents, fetchProfessionals])

  // Optimistic create with global cache
  const createEventOptimistic = useCallback(async (eventData: Omit<HealthEvent, 'id'>) => {
    const tempId = `temp-${Date.now()}`
    const optimisticEvent: HealthEvent = { ...eventData, id: tempId }
    setEvents(prev => [...prev, optimisticEvent])
    try {
      const response = await fetchWithRetry(`/api/events?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      // Replace temp with real and update cache
      setEvents(prev => {
        const updated = prev.map(e => e.id === tempId ? response : e)
        globalCache.set(`events_${userId}`, updated)
        return updated
      })
      lastFetch.current.events = Date.now()
    } catch (err) {
      setEvents(prev => prev.filter(e => e.id !== tempId)) // Revert
      setError('Erro ao criar evento')
      throw err
    }
  }, [fetchWithRetry, userId])

  // Optimistic update with global cache
  const updateEventOptimistic = useCallback(async (id: string, updates: Partial<HealthEvent>) => {
    const original = events.find(e => e.id === id)
    if (!original) return
    
    // Optimistic update
    setEvents(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e)
      globalCache.set(`events_${userId}`, updated)
      return updated
    })
    
    try {
      await fetchWithRetry(`/api/events/${id}?userId=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      lastFetch.current.events = Date.now()
    } catch (err) {
      // Revert optimistic update
      setEvents(prev => {
        const reverted = prev.map(e => e.id === id ? original : e)
        globalCache.set(`events_${userId}`, reverted)
        return reverted
      })
      setError('Erro ao atualizar evento')
      throw err
    }
  }, [events, fetchWithRetry, userId])

  // Optimistic delete with global cache
  const deleteEventOptimistic = useCallback(async (id: string, deleteFiles = false) => {
    const original = events.find(e => e.id === id)
    if (!original) return
    
    // Optimistic delete
    setEvents(prev => {
      const updated = prev.filter(e => e.id !== id)
      globalCache.set(`events_${userId}`, updated)
      return updated
    })
    
    try {
      await fetchWithRetry(`/api/events?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, deleteFiles })
      })
      lastFetch.current.events = Date.now()
    } catch (err) {
      // Revert optimistic delete
      setEvents(prev => {
        const reverted = [...prev, original]
        globalCache.set(`events_${userId}`, reverted)
        return reverted
      })
      setError('Erro ao deletar evento')
      throw err
    }
  }, [events, fetchWithRetry, userId])

  // Load from global cache on mount
  useEffect(() => {
    if (!userId) return
    
    // Load from global cache first
    const cachedEvents = globalCache.get<HealthEvent[]>(`events_${userId}`)
    const cachedProfessionals = globalCache.get<Professional[]>(`professionals_${userId}`)
    
    if (cachedEvents) {
      console.log('[EventsContext] Loading events from global cache')
      setEvents(cachedEvents)
    } else {
      // Fallback to legacy cache
      const legacyEvents = localStorage.getItem('events')
      if (legacyEvents) {
        try {
          const parsed = JSON.parse(legacyEvents)
          setEvents(parsed)
        } catch (err) {
          console.error('Error parsing legacy events cache:', err)
        }
      }
    }
    
    if (cachedProfessionals) {
      console.log('[EventsContext] Loading professionals from global cache')
      setProfessionals(cachedProfessionals)
    } else {
      // Fallback to legacy cache
      const legacyProfessionals = localStorage.getItem('professionals')
      if (legacyProfessionals) {
        try {
          const parsed = JSON.parse(legacyProfessionals)
          setProfessionals(parsed)
        } catch (err) {
          console.error('Error parsing legacy professionals cache:', err)
        }
      }
    }
  }, [userId])

  // Storage event listener for multi-tab sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'events' && e.newValue) {
        setEvents(JSON.parse(e.newValue))
      } else if (e.key === 'professionals' && e.newValue) {
        setProfessionals(JSON.parse(e.newValue))
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Window focus listener with global cache stale checking
  useEffect(() => {
    const handleFocus = () => {
      if (!userId) return
      
      // Only refetch if data is stale
      const shouldRefetchEvents = globalCache.isStale(`events_${userId}`)
      const shouldRefetchProfessionals = globalCache.isStale(`professionals_${userId}`)
      
      if (shouldRefetchEvents || shouldRefetchProfessionals) {
        console.log('[EventsContext] Refetching on window focus - data is stale')
        refreshData(false) // Don't force, let cache logic decide
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshData, userId])

  // Initial fetch - only if no cached data or cache is stale
  useEffect(() => {
    if (!userId) return
    
    // Only fetch if no cache or cache is stale
    const needsEventsRefresh = globalCache.isStale(`events_${userId}`)
    const needsProfessionalsRefresh = globalCache.isStale(`professionals_${userId}`)
    
    if (needsEventsRefresh || needsProfessionalsRefresh) {
      console.log('[EventsContext] Initial fetch - no cache or cache is stale')
      refreshData(false)
    } else {
      console.log('[EventsContext] Using cached data - no fetch needed')
    }
  }, [userId, refreshData])

  const value: EventsContextType = {
    events,
    professionals,
    loading,
    error,
    fetchEvents,
    fetchProfessionals,
    createEventOptimistic,
    updateEventOptimistic,
    deleteEventOptimistic,
    refreshData
  }

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}