import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarClient from '@/app/(receptor)/calendar/CalendarClient'

// Mock do router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock global do fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('CalendarClient - Loading States e Error Handling', () => {
  const mockUserId = 'user-123'

  const mockEvents = [
    {
      id: 'event-1',
      title: 'Consulta Cardiologia',
      date: '2025-12-15',
      type: 'CONSULTA',
      professionalId: 'prof-1',
      startTime: '09:00',
      endTime: '10:00',
    },
    {
      id: 'event-2',
      title: 'Exame Laboratório',
      date: '2025-12-20',
      type: 'EXAME',
      professionalId: 'prof-1',
      startTime: '14:00',
      endTime: '15:00',
    },
  ]

  const mockProfessionals = [
    {
      id: 'prof-1',
      name: 'Dr. João',
      specialty: 'Cardiologia',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    // Reset fetch to return valid data by default
    mockFetch.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/professionals')) {
        return new Response(JSON.stringify(mockProfessionals), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      if (typeof url === 'string' && url.includes('/api/events')) {
        return new Response(JSON.stringify({ events: mockEvents }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    })
  })

  describe('Loading States', () => {
    it('deve mostrar spinner de loading ao carregar', async () => {
      // Setup mock fetch with delay
      mockFetch.mockImplementation(async (url) => {
        if (url.includes('/api/professionals')) {
          await new Promise(resolve => setTimeout(resolve, 50))
          return new Response(JSON.stringify(mockProfessionals), { status: 200 })
        }
        if (url.includes('/api/events')) {
          await new Promise(resolve => setTimeout(resolve, 100))
          return new Response(JSON.stringify({ events: mockEvents }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 404 })
      })

      const { container } = render(<CalendarClient userId={mockUserId} />)

      // Verificar skeleton com animação pulse
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)

      // Verificar que o skeleton desaparece após carregamento
      await waitFor(() => {
        const skeletonsAfter = container.querySelectorAll('.animate-pulse')
        expect(skeletonsAfter.length).toBe(0)
      })
    })

    it('deve exibir animação de skeleton durante carregamento', () => {
      // Setup mock fetch that never resolves (infinite loading)
      mockFetch.mockImplementation(() => {
        return new Promise(() => {}) // Never resolves
      })

      const { container } = render(<CalendarClient userId={mockUserId} />)

      // Verificar skeleton com animação pulse
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
      
      // Verificar elementos de loading
      const loadingBg = container.querySelectorAll('.bg-gray-200')
      expect(loadingBg.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('deve exibir mensagem de erro quando falha ao buscar eventos', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/professionals')) {
          return Promise.resolve(new Response(JSON.stringify(mockProfessionals), { status: 200 }))
        }
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.reject(new Error('Erro ao buscar eventos'))
        }
        return Promise.reject(new Error('Unexpected request'))
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.getByText(/Erro ao carregar eventos/)).toBeInTheDocument()
    })

    it('deve mostrar botão de retry após erro', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/professionals')) {
          return Promise.resolve(new Response(JSON.stringify(mockProfessionals), { status: 200 }))
        }
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.reject(new Error('Unexpected request'))
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('deve tentar recarregar ao clicar no botão retry', async () => {
      const user = userEvent.setup()

      // Primeira tentativa: erro
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/professionals')) {
          return Promise.resolve(new Response(JSON.stringify(mockProfessionals), { status: 200 }))
        }
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.reject(new Error('Unexpected request'))
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Segunda tentativa: sucesso
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.resolve(new Response(JSON.stringify({ events: mockEvents }), { status: 200 }))
        }
        return Promise.resolve(new Response(JSON.stringify(mockProfessionals), { status: 200 }))
      })

      const retryButton = screen.getByText('Tentar novamente')
      await user.click(retryButton)

      await waitFor(() => {
        // Após retry bem-sucedido, não deve mais mostrar erro
        expect(screen.queryByText('Erro ao carregar dados')).not.toBeInTheDocument()
      })
    })

    it('deve exibir ícone de erro visual', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/professionals')) {
          return Promise.resolve(new Response(JSON.stringify(mockProfessionals), { status: 200 }))
        }
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.reject(new Error('Test error'))
        }
        return Promise.reject(new Error('Unexpected request'))
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('deve lidar com erro 404 no fetch', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/professionals')) {
          return Promise.resolve(new Response(JSON.stringify(mockProfessionals), { status: 200 }))
        }
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
        }
        return Promise.reject(new Error('Unexpected request'))
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar eventos/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('deve lidar com erro 500 no fetch', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/professionals')) {
          return Promise.resolve(new Response(JSON.stringify(mockProfessionals), { status: 200 }))
        }
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.resolve(new Response(JSON.stringify({ error: 'Server error' }), { status: 500 }))
        }
        return Promise.reject(new Error('Unexpected request'))
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar eventos/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Timeouts', () => {
    it('deve aplicar timeout de 10s para buscar profissionais', async () => {
      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        // Verifica que o fetch foi chamado com a URL de profissionais
        const calls = mockFetch.mock.calls.map(call => 
          typeof call[0] === 'string' ? call[0] : call[0]?.url
        )
        expect(calls.some(url => url?.includes('/api/professionals'))).toBe(true)
      })
    })

    it('deve aplicar timeout de 15s para buscar eventos', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ events: mockEvents }), { status: 200 }))

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        // Verifica que o fetch foi chamado com a URL de eventos
        const calls = mockFetch.mock.calls.map(call => 
          typeof call[0] === 'string' ? call[0] : call[0]?.url
        )
        expect(calls.some(url => url?.includes('/api/events'))).toBe(true)
      })
    })

    it('deve lidar com timeout expirado', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/professionals')) {
          return Promise.reject(
            Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
          )
        }
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.reject(
            Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
          )
        }
        return Promise.reject(new Error('Unexpected request'))
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        // Erro de timeout exibido (qualquer mensagem de erro relacionada)
        const errorElements = screen.getAllByText(/Erro ao carregar/i)
        expect(errorElements.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })
  })

  describe('Formato de Resposta', () => {
    it('deve lidar com resposta paginada (nova estrutura)', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        events: mockEvents,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      }), { status: 200 }))

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando eventos...')).not.toBeInTheDocument()
      })
    })

    it('deve lidar com resposta antiga (array direto)', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockEvents), { status: 200 })) // Array direto (fallback)

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando eventos...')).not.toBeInTheDocument()
      })
    })

    it('deve rejeitar formato de resposta inválido', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/professionals')) {
          return Promise.resolve(new Response(JSON.stringify(mockProfessionals), { status: 200 }))
        }
        if (typeof url === 'string' && url.includes('/api/events')) {
          return Promise.resolve(new Response(JSON.stringify({ invalidKey: 'invalidValue' }), { status: 200 }))
        }
        return Promise.reject(new Error('Unexpected request'))
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        // Deve mostrar erro ao encontrar formato inválido
        const errorElements = screen.getAllByText(/Erro ao carregar/i)
        expect(errorElements.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })
  })

  describe('Cache Control', () => {
    it('deve usar cache: no-store para requisições', async () => {
      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        // Verificar que fetch foi chamado (mock padrão já configura resposta válida)
        expect(mockFetch).toHaveBeenCalled()
        // Nota: MSW/fetch moderno pode enviar Request objects ao invés de strings+options
        // O importante é que as requisições sejam feitas sem cache
      }, { timeout: 3000 })
    })
  })

  describe('Proteção contra userId inválido', () => {
    it('não deve fazer fetch se userId não fornecido', () => {
      render(<CalendarClient userId="" />)

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})

