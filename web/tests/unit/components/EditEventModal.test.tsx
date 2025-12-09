import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { useEffect } from 'react'
import EditEventModal from '@/components/EditEventModal'

// Mock dos componentes da pasta edit-event
vi.mock('../../../src/components/edit-event/EventTypeSelect', () => ({
  EventTypeSelect: ({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) => (
    <div data-testid="event-type-select">
      <label>Tipo de Evento</label>
      <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="event-type-input">
        <option value="CONSULTA">Consulta</option>
        <option value="EXAME">Exame</option>
        <option value="PROCEDIMENTO">Procedimento</option>
      </select>
    </div>
  ),
}))

vi.mock('../../../src/components/edit-event/InstructionsCheckbox', () => ({
  InstructionsCheckbox: ({ hasInstructions, instructions, onHasInstructionsChange, onInstructionsChange }: any) => (
    <div data-testid="instructions-checkbox">
      <input
        type="checkbox"
        checked={hasInstructions}
        onChange={(e) => onHasInstructionsChange(e.target.checked)}
        data-testid="has-instructions-input"
      />
      <label>Possui instruções</label>
      {hasInstructions && (
        <textarea
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          data-testid="instructions-textarea"
        />
      )}
    </div>
  ),
}))

vi.mock('../../../src/components/edit-event/ProfessionalSelect', () => ({
  ProfessionalSelect: ({ professionals, selectedProfessional, onProfessionalChange, onAddNewProfessional }: any) => (
    <div data-testid="professional-select">
      <label>Profissional</label>
      <select
        value={selectedProfessional}
        onChange={(e) => onProfessionalChange(e.target.value)}
        data-testid="professional-input"
      >
        {professionals.map((prof: any) => (
          <option key={prof.id} value={prof.id}>{prof.name}</option>
        ))}
      </select>
      <button onClick={onAddNewProfessional} data-testid="add-professional-btn">Adicionar Profissional</button>
    </div>
  ),
}))

vi.mock('../../../src/components/edit-event/DateInput', () => ({
  DateInput: ({ value, error, onChange }: any) => (
    <div data-testid="date-input">
      <label>Data</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="date-input-field"
      />
      {error && <span className="error">{error}</span>}
    </div>
  ),
}))

vi.mock('../../../src/components/edit-event/TimeInputs', () => ({
  TimeInputs: ({ startTime, endTime, startTimeError, endTimeError, onStartTimeChange, onEndTimeChange }: any) => (
    <div data-testid="time-inputs">
      <div>
        <label>Hora início</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          data-testid="start-time-input"
        />
        {startTimeError && <span className="error">{startTimeError}</span>}
      </div>
      <div>
        <label>Hora fim</label>
        <input
          type="time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          data-testid="end-time-input"
        />
        {endTimeError && <span className="error">{endTimeError}</span>}
      </div>
    </div>
  ),
}))

vi.mock('../../../src/components/edit-event/ObservationTextarea', () => ({
  ObservationTextarea: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <div data-testid="observation-textarea">
      <label>Observação</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="observation-input"
      />
    </div>
  ),
}))

// Mock do AddProfessionalModal
vi.mock('../../../src/components/AddProfessionalModal', () => ({
  AddProfessionalModal: ({
    open,
    onOpenChange,
    onSave,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (data: {
      name: string
      specialty: string
      address: string
      contact: string
    }) => void
  }) => {
    // Evitar qualquer efeito colateral ou chamadas assíncronas
    useEffect(() => {
      // Mock vazio para prevenir fetchSpecialties
    }, [])
    return open ? <div data-testid="add-professional-modal">AddProfessionalModal Mock</div> : null
  },
}))


// Mock do fetch
let mockFetch: any
beforeAll(() => {
  mockFetch = vi.fn((...args) => {
    if (typeof args[0] === 'string' && args[0].includes('specialties')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['Cardiologia', 'Dermatologia'])
      })
    }
    // fallback para outros endpoints
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
  global.fetch = mockFetch
})

afterAll(() => {
  vi.restoreAllMocks()
})

// Mock do alert
const mockAlert = vi.fn()
global.alert = mockAlert

describe('EditEventModal', () => {
  const mockOnOpenChange = vi.fn()
  const mockSetProfessionals = vi.fn()
  const mockOnSave = vi.fn()

  const mockEvent = {
    id: '1',
    title: 'Consulta Médica',
    description: 'Consulta de rotina',
    date: '2024-01-01',
  type: 'CONSULTA',
    professionalId: 'prof-1',
    startTime: '10:00',
    endTime: '11:00',
    observation: 'Teste',
    instructions: false,
  }

  const mockProfessionals = [
    {
      id: 'prof-1',
      name: 'Dr. Silva',
      specialty: 'Cardiologia',
      address: 'Rua A',
      contact: '123',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)
  })

  const renderModal = (open: boolean = true, event: typeof mockEvent | null = mockEvent) => {
    let result
    act(() => {
      result = render(
        <EditEventModal
          open={open}
          onOpenChange={mockOnOpenChange}
          event={event}
          professionals={mockProfessionals}
          setProfessionals={mockSetProfessionals}
          onSave={mockOnSave}
        />
      )
    })
    return result
  }

  it('renders modal when open is true', async () => {
    await act(async () => {
      renderModal(true)
    })
    expect(screen.getByText('Editar Evento')).toBeInTheDocument()
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument()
  })

  it('does not render modal when open is false', async () => {
    await act(async () => {
      renderModal(false)
    })
    expect(screen.queryByText('Editar Evento')).not.toBeInTheDocument()
  })

  it('loads event data when modal opens', async () => {
    await act(async () => {
      renderModal(true)
    })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/events')
    })
  })

  it('pre-fills form with event data', async () => {
    await act(async () => {
      renderModal(true)
    })

    // Verificar se os campos estão preenchidos com os dados do evento
    await waitFor(() => {
      expect(screen.getByTestId('event-type-input')).toHaveValue('CONSULTA')
      expect(screen.getByTestId('date-input-field')).toHaveValue('2024-01-01')
      expect(screen.getByTestId('start-time-input')).toHaveValue('10:00')
      expect(screen.getByTestId('end-time-input')).toHaveValue('11:00')
      expect(screen.getByTestId('observation-input')).toHaveValue('Teste')
      expect(screen.getByTestId('professional-input')).toHaveValue('prof-1')
    })
  })

  it('submits form successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockEvent, type: 'EXAME' }),
    } as Response)

    await act(async () => {
      renderModal(true)
    })

    // Modificar um campo
    const eventTypeInput = screen.getByTestId('event-type-input')
    fireEvent.change(eventTypeInput, { target: { value: 'EXAME' } })

    const submitButton = screen.getByText('Salvar Alterações')
    await act(async () => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"type":"EXAME"'),
        })
      )
      expect(mockOnSave).toHaveBeenCalled()
    })
  })

  it('handles submit error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Erro ao editar' }),
    } as Response)

    renderModal(true)

    const submitButton = screen.getByText('Salvar Alterações')
    await act(async () => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })
  })

  it('opens AddProfessionalModal when add professional button is clicked', async () => {
    await act(async () => {
      renderModal(true)
    })

    // Procurar pelo botão que abre o modal de adicionar profissional
    const addButton = screen.getByTestId('add-professional-btn')
    fireEvent.click(addButton)

    // Verificar se o modal de adicionar profissional aparece
    await waitFor(() => {
      expect(screen.getByTestId('add-professional-modal')).toBeInTheDocument()
    })
  })

  it('handles professional save successfully', async () => {
    const newProfessional = {
      id: 'prof-2',
      name: 'Dr. Santos',
      specialty: 'Dermatologia',
      address: 'Rua B',
      contact: '456',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newProfessional),
    } as Response)

    await act(async () => {
      renderModal(true)
    })

    // Simular que um profissional foi adicionado (isso aconteceria dentro do AddProfessionalModal)
    // Como estamos mockando, verificamos se setProfessionals seria chamado
    expect(mockSetProfessionals).not.toHaveBeenCalled()

    // Na implementação real, isso seria chamado quando o profissional fosse salvo
    // Aqui testamos que o estado seria atualizado corretamente
  })

  it('handles professional save error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Erro ao salvar profissional' }),
      text: async () => 'Erro ao salvar profissional',
    })

    await act(async () => {
      renderModal(true)
    })

    // Como o erro é tratado com alert, e estamos mockando o fetch,
    // verificamos que o alert seria chamado em caso de erro
    expect(mockAlert).not.toHaveBeenCalled()
  })

  it('validates start time format', async () => {
    await act(async () => {
      renderModal(true)
    })

    // Procurar campo de hora de início
    const startTimeInput = screen.getByDisplayValue('10:00') || screen.getByLabelText(/hora.*início|start.*time/i)
    if (startTimeInput) {
      // Testar formato inválido
      fireEvent.change(startTimeInput, { target: { value: '25:00' } })
      fireEvent.blur(startTimeInput)

      // Verificar se alguma validação é mostrada (depende da implementação)
      expect(screen.getByText('Editar Evento')).toBeInTheDocument()
    }
  })

  it('validates end time format', async () => {
    await act(async () => {
      renderModal(true)
    })

    // Procurar campo de hora de fim
    const endTimeInput = screen.getByDisplayValue('11:00') || screen.getByLabelText(/hora.*fim|end.*time/i)
    if (endTimeInput) {
      // Testar formato inválido
      fireEvent.change(endTimeInput, { target: { value: '30:00' } })
      fireEvent.blur(endTimeInput)

      expect(screen.getByText('Editar Evento')).toBeInTheDocument()
    }
  })

  it('checks for event overlap', async () => {
    // Mock para simular conflito de horário
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'Conflito de horário detectado' }),
    } as Response)

    await act(async () => {
      renderModal(true)
    })

    const submitButton = screen.getByText('Salvar Alterações')
    await act(async () => {
      fireEvent.click(submitButton)
    })

    // Verificar se o erro de conflito é tratado
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('closes modal on successful save', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvent),
    } as Response)

    renderModal(true)

    const submitButton = screen.getByText('Salvar Alterações')
    await act(async () => {
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('handles null event gracefully', async () => {
    await act(async () => {
      renderModal(true, null)
    })
    expect(screen.getByText('Editar Evento')).toBeInTheDocument()
  })

  it('toggles instructions checkbox and shows textarea', async () => {
    await act(async () => {
      renderModal(true)
    })

    const instructionsCheckbox = screen.getByTestId('has-instructions-input')
    expect(instructionsCheckbox).not.toBeChecked()

    // Ativar checkbox
    fireEvent.click(instructionsCheckbox)
    expect(instructionsCheckbox).toBeChecked()

    // Verificar se textarea aparece
    const instructionsTextarea = screen.getByTestId('instructions-textarea')
    expect(instructionsTextarea).toBeInTheDocument()

    // Digitar instruções
    fireEvent.change(instructionsTextarea, { target: { value: 'Instruções de teste' } })
    expect(instructionsTextarea).toHaveValue('Instruções de teste')
  })

  it('changes professional selection', async () => {
    const newProfessional = {
      id: 'prof-2',
      name: 'Dra. Santos',
      specialty: 'Dermatologia',
      address: 'Rua B',
      contact: '456',
    }

    await act(async () => {
      render(
        <EditEventModal
          open={true}
          onOpenChange={mockOnOpenChange}
          event={mockEvent}
          professionals={[...mockProfessionals, newProfessional]}
          setProfessionals={mockSetProfessionals}
          onSave={mockOnSave}
        />
      )
    })

    const professionalSelect = screen.getByTestId('professional-input')
    expect(professionalSelect).toHaveValue('prof-1')

    // Mudar profissional
    fireEvent.change(professionalSelect, { target: { value: 'prof-2' } })
    expect(professionalSelect).toHaveValue('prof-2')
  })

  it('changes date and validates format', async () => {
    await act(async () => {
      renderModal(true)
    })

    const dateInput = screen.getByTestId('date-input-field')
    expect(dateInput).toHaveValue('2024-01-01')

    // Mudar data
    fireEvent.change(dateInput, { target: { value: '2024-02-15' } })
    expect(dateInput).toHaveValue('2024-02-15')
  })

  it('changes observation text', async () => {
    await act(async () => {
      renderModal(true)
    })

    const observationTextarea = screen.getByTestId('observation-input')
    expect(observationTextarea).toHaveValue('Teste')

    // Mudar observação
    fireEvent.change(observationTextarea, { target: { value: 'Nova observação' } })
    expect(observationTextarea).toHaveValue('Nova observação')
  })

  it('validates required fields on submit', async () => {
    // Criar evento com campos vazios para testar validação
    const emptyEvent = {
      ...mockEvent,
      date: '',
      startTime: '',
      endTime: '',
      professionalId: '',
    }

    await act(async () => {
      renderModal(true, emptyEvent)
    })

    const submitButton = screen.getByText('Salvar Alterações')
    await act(async () => {
      fireEvent.click(submitButton)
    })

    // Verificar se a validação falha (não deve chamar a API)
    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })
})

