import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Dashboard } from '@/components/Dashboard'

// Mock do contexto
vi.mock('../../../src/contexts/EventsContext', () => ({
  EventsProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="events-provider">{children}</div>,
  useEvents: () => ({
    events: [],
    professionals: [],
    loading: false,
    error: null,
    deleteEventOptimistic: vi.fn(),
    refreshData: vi.fn(),
  }),
}))

// Mock de componentes
vi.mock('../../../src/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}))

vi.mock('../../../src/components/Timeline', () => ({
  Timeline: () => <div data-testid="timeline">Timeline</div>
}))

vi.mock('../../../src/components/NewEventModal', () => ({
  default: () => <div data-testid="new-event-modal">NewEventModal</div>
}))

vi.mock('../../../src/components/ShareModal', () => ({
  ShareModal: () => <div data-testid="share-modal">ShareModal</div>
}))

describe('Dashboard', () => {
  const mockProps = {
    onLogout: vi.fn(),
    userId: 'test-user',
    userRole: 'RECEPTOR' as const,
    user: { name: 'Test User' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar com EventsProvider', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByTestId('events-provider')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('new-event-modal')).toBeInTheDocument()
    expect(screen.getByText('Minha Timeline')).toBeInTheDocument()
  })

  it('deve sempre mostrar timeline por padrão para RECEPTOR', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByText('Minha Timeline')).toBeInTheDocument()
  })

  it('deve mostrar portal de laudos para EMISSOR', () => {
    render(<Dashboard {...mockProps} userRole="EMISSOR" />)

    expect(screen.getByText((content) => content.includes('Portal de Envio'))).toBeInTheDocument()
  })

  it('deve respeitar localStorage para EMISSOR', () => {
    // Simular localStorage com aba específica salva
    const mockLocalStorage = {
      getItem: vi.fn(() => 'relatorios'), // Simula que estava na aba relatórios
      setItem: vi.fn(),
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    render(<Dashboard {...mockProps} userRole="EMISSOR" />)

    // Para EMISSOR, deve respeitar o localStorage, então não deve mostrar portal de laudos
    expect(screen.queryByText((content) => content.includes('Portal de Envio'))).not.toBeInTheDocument()
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('activeMenu')
  })

  it('deve sempre mostrar timeline para RECEPTOR independente do localStorage', () => {
    // Simular localStorage com aba diferente salva
    const mockLocalStorage = {
      getItem: vi.fn(() => 'professionals'), // Simula que estava na aba profissionais
      setItem: vi.fn(),
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    render(<Dashboard {...mockProps} />)

    expect(screen.getByText('Minha Timeline')).toBeInTheDocument()
    // Verificar que localStorage.getItem NÃO foi chamado para RECEPTOR
    expect(mockLocalStorage.getItem).not.toHaveBeenCalled()
  })
})

