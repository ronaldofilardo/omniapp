import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'

// Mock do hook useEvents para evitar erro de provider
vi.mock('@/contexts/EventsContext', () => ({
  useEvents: () => ({
    events: [],
    setEvents: vi.fn(),
    professionals: [],
    setProfessionals: vi.fn(),
    refreshEvents: vi.fn(),
    refreshProfessionals: vi.fn(),
  }),
  EventsProvider: ({ children }: { children: React.ReactNode }) => children
}))
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EventsProvider } from '@/contexts/EventsContext'
import '@testing-library/jest-dom'
import CreateEventFromNotificationModal from '@/components/CreateEventFromNotificationModal'
import { ProfessionalsTab } from '@/components/ProfessionalsTab'
import { Timeline } from '@/components/Timeline'
import { EventCard } from '@/components/EventCard'

// Mock do fetch global
const mockFetch = vi.fn()

// Forçar o mock de fetch global e window
beforeAll(() => {
  // @ts-ignore
  global.fetch = mockFetch;
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.fetch = mockFetch;
  }
});

// Forçar o mock de fetch global e window
beforeAll(() => {
  global.fetch = mockFetch;
  if (typeof window !== 'undefined') {
    window.fetch = mockFetch;
  }
});

describe('Fluxo de Criação de Evento via Laudo (Integração)', () => {
  const mockUserId = 'test-user-id'
  const mockDoctorName = 'Dr. Teste Integração'
  const mockProfessionalId = 'test-prof-id'
  const mockEventId = 'test-event-id'

  const mockNotification = {
    id: 'notification-1',
    payload: {
      doctorName: mockDoctorName,
      examDate: '2025-11-01',
      report: {
        fileName: 'laudo.jpg',
        fileContent: 'aGVsbG8=' // base64 válido para 'hello'
      },
      observation: 'Observação de teste para o laudo'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url, options) => {
      console.log('Mock fetch called:', url, options?.method || 'GET');
      if (typeof url === 'string' && url.includes('/api/professionals')) {
        // Criação do profissional (POST)
        if (options && options.method === 'POST') {
          console.log('Mock: Creating professional');
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              id: mockProfessionalId,
              name: mockDoctorName,
              specialty: 'A ser definido'
            })
          });
        }
        // Busca de profissionais (GET)
        console.log('Mock: Fetching professionals');
        return Promise.resolve({
          ok: true,
          json: async () => ([])
        });
      }
      if (typeof url === 'string' && url.includes('/api/events')) {
        // Criação do evento (POST)
        if (options && options.method === 'POST') {
          console.log('Mock: Creating event');
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              id: mockEventId,
              title: 'Laudo: laudo.jpg',
              observation: 'Observação de teste para o laudo',
              professionalId: mockProfessionalId
            })
          });
        }
        // Atualização do evento (PUT)

        if (options && options.method === 'PUT') {
          console.log('Mock PUT called');
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({})
          });
        }
      }
      if (typeof url === 'string' && url.includes('/api/upload-file')) {
        console.log('Mock: Uploading file');
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (typeof url === 'string' && url.includes('/api/reports/') && url.includes('/status')) {
        // Atualizar status do laudo
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (typeof url === 'string' && url.includes('/api/notifications/')) {
        // Marcar notificação como lida
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      // Default
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it('cria profissional automaticamente via laudo e exibe corretamente', async () => {
    const onSuccess = vi.fn()
    const refreshProfessionals = vi.fn()

    // 1. Renderizar e interagir com o modal
    const { rerender } = render(
      <EventsProvider userId={mockUserId}>
        <CreateEventFromNotificationModal
          open={true}
          onClose={() => {}}
          onSuccess={onSuccess}
          notification={mockNotification}
          userId={mockUserId}
          refreshProfessionals={refreshProfessionals}
          professionalId=""
        />
      </EventsProvider>
    )

    // Clicar no botão de criar
    const createButton = screen.getByText('Criar Evento')
    fireEvent.click(createButton)

    // Verificar se as chamadas à API foram feitas corretamente
    await waitFor(() => {
      const calls = mockFetch.mock.calls.map(call => call[0])
      console.log('All fetch calls:', calls);
      console.log('Professionals POST calls:', calls.filter(url => url.includes('/api/professionals') && mockFetch.mock.calls.find(c => c[0] === url)?.[1]?.method === 'POST'));
      console.log('Events POST calls:', calls.filter(url => url.includes('/api/events')));
      expect(calls.some(url => url.includes('/api/professionals'))).toBe(true)
      expect(calls.some(url => url.includes('/api/events'))).toBe(true)
    })

    // 2. Verificar se o profissional aparece na aba Profissionais
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{
        id: mockProfessionalId,
        name: mockDoctorName,
        specialty: 'A ser definido'
      }])
    })

    render(
      <EventsProvider userId={mockUserId}>
        <ProfessionalsTab
          professionals={[{
            id: mockProfessionalId,
            name: mockDoctorName,
            specialty: 'A ser definido'
          }]}
          setProfessionals={() => {}}
          userId={mockUserId}
        />
      </EventsProvider>
    )

    // Buscar o nome do profissional em qualquer lugar do DOM (incluindo <option>)
    const found = screen.queryAllByText((content, element) => {
      return content.includes(mockDoctorName)
    })
    expect(found.length).toBeGreaterThan(0)

    // 3. Verificar se o nome aparece no card da timeline
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{
        id: mockEventId,
        title: 'Laudo: laudo.jpg',
        type: 'EXAME',
        professionalId: mockProfessionalId,
        date: '2025-11-01',
        startTime: '09:00',
        endTime: '09:30',
        observation: 'Observação de teste para o laudo'
      }])
    })

    render(
      <Timeline
        events={[{
          id: mockEventId,
          title: 'Laudo: laudo.jpg',
          type: 'EXAME',
          professionalId: mockProfessionalId,
          date: '2025-11-01',
          startTime: '09:00',
          endTime: '09:30',
          observation: 'Observação de teste para o laudo'
        }]}
        professionals={[{
          id: mockProfessionalId,
          name: mockDoctorName,
          specialty: 'A ser definido'
        }]}
      />
    )

    // Verificar se o nome do profissional aparece em algum elemento do card
    const allMatches = screen.getAllByText(new RegExp(mockDoctorName));
    expect(allMatches.length).toBeGreaterThan(0);
  // Verificar se a observação aparece no card do evento
  expect(screen.getByText('Instruções: Observação de teste para o laudo')).toBeInTheDocument()
  })

  it('exibe erro quando falha na criação do profissional', async () => {
    const onSuccess = vi.fn()
    const refreshProfessionals = vi.fn()

    // Mock para falhar na criação do profissional
    mockFetch.mockImplementation((url, options) => {
      if (typeof url === 'string' && url.includes('/api/professionals') && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Erro ao criar profissional' })
        })
      }
      if (typeof url === 'string' && url.includes('/api/professionals')) {
        // Busca de profissionais - nenhum encontrado
        return Promise.resolve({
          ok: true,
          json: async () => ([])
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      })
    })

    render(
      <CreateEventFromNotificationModal
        open={true}
        onClose={() => {}}
        onSuccess={onSuccess}
        notification={mockNotification}
        userId={mockUserId}
        refreshProfessionals={refreshProfessionals}
        professionalId=""
      />
    )

    // Clicar no botão de criar
    const createButton = screen.getByText('Criar Evento')
    fireEvent.click(createButton)

    // Verificar se o erro é exibido
    await waitFor(() => {
      expect(screen.getByText('Erro ao criar profissional.')).toBeInTheDocument()
    })

    // Verificar que onSuccess não foi chamado
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('exibe card do evento corretamente após criação via laudo', async () => {
    const onSuccess = vi.fn()
    const refreshProfessionals = vi.fn()

    // 1. Renderizar e interagir com o modal para criar evento
    render(
      <CreateEventFromNotificationModal
        open={true}
        onClose={() => {}}
        onSuccess={onSuccess}
        notification={mockNotification}
        userId={mockUserId}
        refreshProfessionals={refreshProfessionals}
        professionalId=""
      />
    )

    // Preencher observação
    const observationTextarea = screen.getByPlaceholderText('Digite uma observação (opcional)')
    fireEvent.change(observationTextarea, { target: { value: 'Observação de teste para o laudo' } })

    // Clicar no botão de criar
    const createButton = screen.getByText('Criar Evento')
    fireEvent.click(createButton)

    // Aguardar criação do evento
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })

    // 2. Renderizar o EventCard com o evento criado
    const createdEvent = {
      id: mockEventId,
      title: 'Laudo: laudo.jpg',
      type: 'EXAME',
      professionalId: mockProfessionalId,
      date: '2025-11-01',
      startTime: '09:00',
      endTime: '09:30',
      observation: 'Observação de teste para o laudo',
      description: 'laudo enviado pelo app Omni',
      files: [{
        slot: 'result',
        name: 'laudo.jpg',
        url: `/uploads/${mockEventId}/result-laudo.jpg`
      }]
    }

    render(
      <EventCard
        event={createdEvent}
        professional={mockDoctorName}
        address="Clínica Teste, Rua Principal, 123"
        status="future"
      />
    )

  // Verificar exibição do título com profissional e horário
  expect(screen.getByText('EXAME - Dr. Teste Integração - 09:00 - 09:30')).toBeInTheDocument()

    // Verificar exibição do endereço
    expect(screen.getByText('Clínica Teste, Rua Principal, 123')).toBeInTheDocument()

    // Verificar exibição da observação como instruções (prioridade sobre description)
    expect(screen.getByText('Instruções: Observação de teste para o laudo')).toBeInTheDocument()

    // Verificar que não mostra a description padrão quando há observation
    expect(screen.queryByText('Instruções: laudo enviado pelo app Omni')).not.toBeInTheDocument()

    // Verificar botão de arquivos (deve estar destacado pois há arquivo)
    const filesButton = screen.getByText('Arquivos')
    expect(filesButton).toHaveClass('text-[#10B981]') // Verde pois há arquivo
    expect(filesButton).toHaveClass('font-bold')
  })

  it('exibe card com description padrão quando não há observation', async () => {
    const onSuccess = vi.fn()
    const refreshProfessionals = vi.fn()

    // Notificação sem observation
    const notificationWithoutObservation = {
      ...mockNotification,
      payload: {
        ...mockNotification.payload,
        observation: undefined
      }
    }

    // 1. Renderizar e interagir com o modal
    render(
      <CreateEventFromNotificationModal
        open={true}
        onClose={() => {}}
        onSuccess={onSuccess}
        notification={notificationWithoutObservation}
        userId={mockUserId}
        refreshProfessionals={refreshProfessionals}
        professionalId=""
      />
    )

    // Clicar no botão de criar (sem preencher observation)
    const createButton = screen.getByText('Criar Evento')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })

    // 2. Renderizar o EventCard
    const createdEvent = {
      id: mockEventId,
      title: 'Laudo: laudo.jpg',
      type: 'EXAME',
      professionalId: mockProfessionalId,
      date: '2025-11-01',
      startTime: '09:00',
      endTime: '09:30',
      observation: '', // Vazio
      description: 'laudo enviado pelo app Omni',
      files: [{
        slot: 'result',
        name: 'laudo.jpg',
        url: `/uploads/${mockEventId}/result-laudo.jpg`
      }]
    }

    render(
      <EventCard
        event={createdEvent}
        professional={mockDoctorName}
        address="Clínica Teste, Rua Principal, 123"
        status="future"
      />
    )

    // Verificar exibição da description como instruções quando observation está vazia
    expect(screen.getByText('Instruções: laudo enviado pelo app Omni')).toBeInTheDocument()
  })
})
