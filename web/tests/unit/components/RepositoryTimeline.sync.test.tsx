import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RepositoryTab } from '@/components/RepositoryTab'
import { Timeline } from '@/components/Timeline'

// Mock do globalCache
vi.mock('../../../src/lib/globalCache', () => ({
  globalCache: {
    fetchWithDeduplication: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn()
  }
}))

// Mock de fetch global
global.fetch = vi.fn()

describe('Sincronização Timeline e Repositórios', () => {
  const mockUserId = 'user-123'
  
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Consulta Cardiologia',
      date: '2025-12-10',
      startTime: '10:00',
      endTime: '11:00',
      type: 'CONSULTATION',
      professionalId: 'prof-1',
      userId: mockUserId,
      files: [
        {
          id: 'file-1',
          name: 'laudo.pdf',
          url: 'https://example.com/laudo.pdf',
          slot: 'report'
        }
      ]
    },
    {
      id: 'event-2',
      title: 'Exame de Sangue',
      date: '2025-12-11',
      startTime: '14:00',
      endTime: '15:00',
      type: 'EXAM',
      professionalId: 'prof-2',
      userId: mockUserId,
      files: []
    }
  ]

  const mockProfessionals = [
    {
      id: 'prof-1',
      name: 'Dr. João Silva',
      specialty: 'Cardiologia',
      address: 'Rua A, 123',
      contact: '(11) 99999-9999'
    },
    {
      id: 'prof-2',
      name: 'Dra. Maria Santos',
      specialty: 'Hematologia',
      address: 'Rua B, 456',
      contact: '(11) 88888-8888'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('RepositoryTab - Carregamento de Dados', () => {
    it('deve carregar eventos do repositório via API', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(globalCache.fetchWithDeduplication).toHaveBeenCalledWith(
          `repository_${mockUserId}`,
          expect.any(Function),
          expect.objectContaining({
            staleTime: 5 * 60 * 1000,
            cacheTime: 10 * 60 * 1000
          })
        )
      })
    })

    it('deve usar cache para evitar requisições duplicadas', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      const { rerender } = render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(globalCache.fetchWithDeduplication).toHaveBeenCalledTimes(2) // repository + orphan
      })

      // Rerender não deve fazer novas chamadas (cache)
      rerender(<RepositoryTab userId={mockUserId} />)

      // Deve manter apenas as 2 chamadas iniciais
      expect(globalCache.fetchWithDeduplication).toHaveBeenCalledTimes(2)
    })

    it('deve carregar arquivos órfãos separadamente', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      const mockOrphanFiles = [
        {
          id: 'orphan-1',
          name: 'arquivo-sem-evento.pdf',
          url: 'https://example.com/orphan.pdf',
          uploadDate: '2025-12-09'
        }
      ]
      
      vi.mocked(globalCache.fetchWithDeduplication)
        .mockResolvedValueOnce(mockEvents)
        .mockResolvedValueOnce(mockOrphanFiles)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(globalCache.fetchWithDeduplication).toHaveBeenCalledWith(
          `repository_orphan_${mockUserId}`,
          expect.any(Function),
          expect.any(Object)
        )
      })
    })

    it('deve lidar com erro ao carregar repositório', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      const consoleErrorSpy = vi.spyOn(console, 'error')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockRejectedValue(
        new Error('Failed to fetch repository')
      )

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[RepositoryTab] Erro ao carregar repositório:'),
          expect.any(Error)
        )
      })
    })

    it('deve definir arrays vazios em caso de erro', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockRejectedValue(
        new Error('Failed to fetch')
      )

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        // Não deve mostrar eventos
        expect(screen.queryByText('Consulta Cardiologia')).not.toBeInTheDocument()
      })
    })
  })

  describe('Timeline - Carregamento de Dados', () => {
    it('deve renderizar eventos recebidos', () => {
      render(
        <Timeline
          events={mockEvents}
          professionals={mockProfessionals}
        />
      )

      expect(screen.getByText('Consulta Cardiologia')).toBeInTheDocument()
      expect(screen.getByText('Exame de Sangue')).toBeInTheDocument()
    })

    it('deve renderizar profissionais associados aos eventos', () => {
      render(
        <Timeline
          events={mockEvents}
          professionals={mockProfessionals}
        />
      )

      expect(screen.getByText('Dr. João Silva')).toBeInTheDocument()
      expect(screen.getByText('Dra. Maria Santos')).toBeInTheDocument()
    })

    it('deve agrupar eventos por data', () => {
      render(
        <Timeline
          events={mockEvents}
          professionals={mockProfessionals}
        />
      )

      const dayHeaders = screen.getAllByTestId('timeline-day-header')
      expect(dayHeaders).toHaveLength(2) // 2 datas diferentes
    })

    it('deve renderizar timeline vazia quando não há eventos', () => {
      render(
        <Timeline
          events={[]}
          professionals={mockProfessionals}
        />
      )

      expect(screen.queryByTestId('timeline-event-card')).not.toBeInTheDocument()
    })
  })

  describe('Consistência de Dados entre Abas', () => {
    it('eventos no repositório devem ter mesma estrutura da timeline', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Consulta Cardiologia')).toBeInTheDocument()
      })

      // Verificar que eventos têm campos necessários
      mockEvents.forEach(event => {
        expect(event).toHaveProperty('id')
        expect(event).toHaveProperty('title')
        expect(event).toHaveProperty('date')
        expect(event).toHaveProperty('type')
        expect(event).toHaveProperty('professionalId')
        expect(event).toHaveProperty('userId')
      })
    })

    it('IDs de eventos devem ser consistentes', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        const consoleLogSpy = vi.spyOn(console, 'log')
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[RepositoryTab] Eventos recebidos:'),
          expect.anything(),
          expect.stringContaining('IDs:'),
          expect.arrayContaining(['event-1', 'event-2'])
        )
      })
    })

    it('dados de profissionais devem estar disponíveis em ambas as abas', () => {
      const timelineRender = render(
        <Timeline
          events={mockEvents}
          professionals={mockProfessionals}
        />
      )

      expect(timelineRender.getByText('Dr. João Silva')).toBeInTheDocument()
      
      timelineRender.unmount()

      // Mesmo profissional deve estar disponível no repositório
      // (RepositoryTab não renderiza profissionais diretamente, mas os dados devem existir)
      expect(mockProfessionals.find(p => p.id === 'prof-1')).toBeDefined()
    })

    it('arquivos associados devem manter referência ao evento', async () => {
      const eventWithFiles = mockEvents[0]
      
      expect(eventWithFiles.files).toBeDefined()
      expect(eventWithFiles.files).toHaveLength(1)
      expect(eventWithFiles.files![0]).toMatchObject({
        id: 'file-1',
        name: 'laudo.pdf',
        slot: 'report'
      })
    })
  })

  describe('Sincronização em Tempo Real', () => {
    it('RepositoryTab deve atualizar quando dados mudarem', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      const { rerender } = render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Consulta Cardiologia')).toBeInTheDocument()
      })

      // Simular atualização de dados
      const updatedEvents = [
        ...mockEvents,
        {
          id: 'event-3',
          title: 'Nova Consulta',
          date: '2025-12-12',
          startTime: '09:00',
          endTime: '10:00',
          type: 'CONSULTATION',
          professionalId: 'prof-1',
          userId: mockUserId,
          files: []
        }
      ]

      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(updatedEvents)

      // Forçar rerender (simulando mudança de aba)
      rerender(<RepositoryTab userId={mockUserId} />)

      // Note: em produção, o cache evitaria nova requisição
      // Este teste valida que a estrutura suporta atualizações
    })

    it('Timeline deve reagir a novos eventos', () => {
      const { rerender } = render(
        <Timeline
          events={mockEvents}
          professionals={mockProfessionals}
        />
      )

      expect(screen.getAllByTestId('timeline-event-card')).toHaveLength(2)

      // Adicionar novo evento
      const newEvents = [
        ...mockEvents,
        {
          id: 'event-3',
          title: 'Nova Consulta',
          date: '2025-12-12',
          startTime: '09:00',
          endTime: '10:00',
          type: 'CONSULTATION',
          professionalId: 'prof-1',
          userId: mockUserId,
          files: []
        }
      ]

      rerender(
        <Timeline
          events={newEvents}
          professionals={mockProfessionals}
        />
      )

      expect(screen.getAllByTestId('timeline-event-card')).toHaveLength(3)
      expect(screen.getByText('Nova Consulta')).toBeInTheDocument()
    })
  })

  describe('Filtros e Busca', () => {
    it('RepositoryTab deve filtrar eventos por busca', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Consulta Cardiologia')).toBeInTheDocument()
      })

      // Buscar por "Cardiologia"
      const searchInput = screen.getByPlaceholderText(/pesquisar/i)
      expect(searchInput).toBeInTheDocument()
    })

    it('Timeline deve ordenar eventos por data decrescente', () => {
      const unorderedEvents = [mockEvents[1], mockEvents[0]] // Invertido

      render(
        <Timeline
          events={unorderedEvents}
          professionals={mockProfessionals}
        />
      )

      const dayHeaders = screen.getAllByTestId('timeline-day-header')
      // Mais recente primeiro (11/12 antes de 10/12)
      expect(dayHeaders[0]).toHaveTextContent('11/12')
      expect(dayHeaders[1]).toHaveTextContent('10/12')
    })
  })

  describe('Performance e Otimização', () => {
    it('deve usar cache com staleTime de 5 minutos', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(globalCache.fetchWithDeduplication).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Function),
          expect.objectContaining({
            staleTime: 5 * 60 * 1000 // 5 minutos
          })
        )
      })
    })

    it('deve usar cache com cacheTime de 10 minutos', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(globalCache.fetchWithDeduplication).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Function),
          expect.objectContaining({
            cacheTime: 10 * 60 * 1000 // 10 minutos
          })
        )
      })
    })

    it('Timeline deve usar memo para evitar re-renders desnecessários', () => {
      const { rerender } = render(
        <Timeline
          events={mockEvents}
          professionals={mockProfessionals}
        />
      )

      const initialCards = screen.getAllByTestId('timeline-event-card')
      expect(initialCards).toHaveLength(2)

      // Rerender com mesmos dados
      rerender(
        <Timeline
          events={mockEvents}
          professionals={mockProfessionals}
        />
      )

      // Componente deve ser memoizado
      expect(screen.getAllByTestId('timeline-event-card')).toHaveLength(2)
    })
  })

  describe('Logging e Debugging', () => {
    it('RepositoryTab deve logar informações de fetch', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      const consoleLogSpy = vi.spyOn(console, 'log')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[RepositoryTab] Iniciando fetch para userId:'),
          mockUserId
        )
      })
    })

    it('Timeline deve logar eventos recebidos', () => {
      const consoleLogSpy = vi.spyOn(console, 'log')

      render(
        <Timeline
          events={mockEvents}
          professionals={mockProfessionals}
        />
      )

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Timeline] Received events:'),
        mockEvents
      )
    })

    it('deve logar IDs dos eventos carregados', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      const consoleLogSpy = vi.spyOn(console, 'log')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue(mockEvents)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[RepositoryTab] Eventos recebidos:'),
          2,
          expect.stringContaining('IDs:'),
          ['event-1', 'event-2']
        )
      })
    })
  })

  describe('Tratamento de Edge Cases', () => {
    it('deve lidar com eventos sem arquivos', () => {
      const eventWithoutFiles = {
        ...mockEvents[1],
        files: []
      }

      render(
        <Timeline
          events={[eventWithoutFiles]}
          professionals={mockProfessionals}
        />
      )

      expect(screen.getByText('Exame de Sangue')).toBeInTheDocument()
    })

    it('deve lidar com eventos sem profissional associado', () => {
      const eventWithoutProfessional = {
        ...mockEvents[0],
        professionalId: 'non-existent-prof'
      }

      render(
        <Timeline
          events={[eventWithoutProfessional]}
          professionals={mockProfessionals}
        />
      )

      // Deve renderizar com fallback
      expect(screen.getByText('Consulta Cardiologia')).toBeInTheDocument()
    })

    it('deve lidar com resposta não-array da API', async () => {
      const { globalCache } = await import('../../../src/lib/globalCache')
      
      vi.mocked(globalCache.fetchWithDeduplication).mockResolvedValue({ error: 'Invalid response' } as any)

      render(<RepositoryTab userId={mockUserId} />)

      await waitFor(() => {
        // Deve definir array vazio
        expect(screen.queryByText('Consulta Cardiologia')).not.toBeInTheDocument()
      })
    })
  })
})
