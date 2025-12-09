import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { EventsProvider, useEvents } from '@/contexts/EventsContext'
import { globalCache } from '@/lib/globalCache'

// Mock globalCache - using manual mock
vi.mock('@/lib/globalCache', () => ({
  globalCache: {
    fetchWithDeduplication: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    clear: vi.fn(),
    isStale: vi.fn()
  }
}))

// Componente de teste simples
function TestComponent() {
  const { events, professionals, loading, error } = useEvents()

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="events-count">{events.length}</div>
      <div data-testid="professionals-count">{professionals.length}</div>
    </div>
  )
}

describe('EventsContext', () => {
  let mockFetch: any

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()
    localStorage.clear()
    
    // Setup default mock returns
    vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue([])
    vi.mocked(globalCache.set).mockReturnValue(undefined)
    vi.mocked(globalCache.get).mockReturnValue(null)
  })

  it('deve fornecer estado inicial', () => {
    render(
      <EventsProvider userId="test-user">
        <TestComponent />
      </EventsProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    expect(screen.getByTestId('error')).toHaveTextContent('no-error')
    expect(screen.getByTestId('events-count')).toHaveTextContent('0')
    expect(screen.getByTestId('professionals-count')).toHaveTextContent('0')
  })

  it('deve atualizar cache durante operações otimistas', async () => {
    function TestOptimistic() {
      const { createEventOptimistic } = useEvents()

      return (
        <button onClick={() => createEventOptimistic({
          title: 'New Event',
          date: '2025-01-01',
          type: 'CONSULTATION',
          professionalId: '1',
          startTime: '10:00',
          endTime: '11:00',
          observation: '',
          instructions: false
        })}>
          Create
        </button>
      )
    }

    // Mock fetch para createEvent
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'new-1', title: 'New Event' })
    })

    render(
      <EventsProvider userId="test-user">
        <TestOptimistic />
      </EventsProvider>
    )

    const button = screen.getByText('Create')
    await act(async () => {
      button.click()
    })

    await waitFor(() => {
      expect(vi.mocked(globalCache.set)).toHaveBeenCalled()
    })
  })

  it('deve lidar com sincronização entre abas', () => {
    render(
      <EventsProvider userId="test-user">
        <TestComponent />
      </EventsProvider>
    )

    // Simular storage event - deve não quebrar
    const storageEvent = new StorageEvent('storage', {
      key: 'events',
      newValue: JSON.stringify([{ id: '2', title: 'Synced Event' }])
    })
    
    act(() => {
      window.dispatchEvent(storageEvent)
    })

    // Teste que não quebra
    expect(screen.getByTestId('events-count')).toHaveTextContent('1')
  })
})
