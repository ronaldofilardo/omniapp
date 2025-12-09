import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventForm } from '@/components/EventForm'
import { EventType } from '@prisma/client'
import { TestWrapper } from '../../utils/TestWrapper'

describe('EventForm', () => {
  const mockHandleFieldChange = vi.fn()
  const mockOnAddNewProfessional = vi.fn()

  const mockFormState = {
    eventType: '' as EventType | '',
    selectedProfessional: '',
    date: '',
    startTime: '',
    endTime: '',
    observation: '',
  }

  const mockErrors = {}

  const mockProfessionalOptions = [
    {
      id: '1',
      name: 'Dr. João Silva',
      specialty: 'Cardiologia',
    },
    {
      id: '2',
      name: 'Dra. Maria Santos',
      specialty: 'Dermatologia',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (
    formState = mockFormState,
    errors = mockErrors,
    professionalOptions = mockProfessionalOptions
  ) => {
    return render(
      <TestWrapper>
        <EventForm
          formState={formState}
          errors={errors}
          professionalOptions={professionalOptions}
          handleFieldChange={mockHandleFieldChange}
          onAddNewProfessional={mockOnAddNewProfessional}
        />
      </TestWrapper>
    )
  }

  it('renders all form fields', () => {
    renderComponent()

    expect(screen.getByText('Tipo de Evento')).toBeInTheDocument()
    expect(screen.getByText('Profissional')).toBeInTheDocument()
    expect(screen.getByText('Data do Evento')).toBeInTheDocument()
    expect(screen.getByText('Hora de Início')).toBeInTheDocument()
    expect(screen.getByText('Hora de Fim')).toBeInTheDocument()
    expect(screen.getByText('Observação')).toBeInTheDocument()
  })

  it('renders event type select with options', () => {
    renderComponent()

    const selectTrigger = screen.getByText('Selecione o tipo...')
    fireEvent.click(selectTrigger)

  expect(screen.getByText('Consulta')).toBeInTheDocument()
  expect(screen.getByText('Exame')).toBeInTheDocument()
  })

  it('calls handleFieldChange when event type is selected', () => {
    renderComponent()

    const selectTrigger = screen.getByText('Selecione o tipo...')
    fireEvent.click(selectTrigger)

    const consultationOption = screen.getByText('Consulta')
    fireEvent.click(consultationOption)

    expect(mockHandleFieldChange).toHaveBeenCalledWith(
      'eventType',
  'CONSULTA'
    )
  })

  it('renders professional select with options', () => {
    renderComponent()

    const selectTrigger = screen.getByText('Selecione o profissional...')
    fireEvent.click(selectTrigger)

    expect(screen.getByText('Dr. João Silva - Cardiologia')).toBeInTheDocument()
    expect(
      screen.getByText('Dra. Maria Santos - Dermatologia')
    ).toBeInTheDocument()
  })

  it('calls handleFieldChange when professional is selected', () => {
    renderComponent()

    const selectTrigger = screen.getByText('Selecione o profissional...')
    fireEvent.click(selectTrigger)

    const professionalOption = screen.getByText('Dr. João Silva - Cardiologia')
    fireEvent.click(professionalOption)

    expect(mockHandleFieldChange).toHaveBeenCalledWith(
      'selectedProfessional',
      '1'
    )
  })

  it('calls onAddNewProfessional when Novo button is clicked', () => {
    renderComponent()

    const novoButton = screen.getByText('Novo')
    fireEvent.click(novoButton)

    expect(mockOnAddNewProfessional).toHaveBeenCalled()
  })

  it('renders date input', () => {
    renderComponent()

  const dateInputs = screen.getAllByDisplayValue('')
  const dateInput = dateInputs.find((el) => el.getAttribute('type') === 'date')
  expect(dateInput).toBeDefined()
  expect(dateInput).toHaveAttribute('type', 'date')
  })

  it('calls handleFieldChange when date is changed', () => {
    renderComponent()

  const dateInputs = screen.getAllByDisplayValue('')
  const dateInput = dateInputs.find((el) => el.getAttribute('type') === 'date')
  expect(dateInput).toBeDefined()
  fireEvent.change(dateInput!, { target: { value: '2024-10-25' } })

    expect(mockHandleFieldChange).toHaveBeenCalledWith('date', '2024-10-25')
  })

  it('renders time inputs', () => {
    renderComponent()

  const timeInputs = screen.getAllByDisplayValue('').filter((el) => el.getAttribute('type') === 'time')
  expect(timeInputs).toHaveLength(2)
  expect(timeInputs[0]).toHaveAttribute('type', 'time')
  expect(timeInputs[1]).toHaveAttribute('type', 'time')
  })

  it('calls handleFieldChange when start time is changed', () => {
    renderComponent()

  const timeInputs = screen.getAllByDisplayValue('').filter((el) => el.getAttribute('type') === 'time')
  fireEvent.change(timeInputs[0], { target: { value: '10:00' } })

    expect(mockHandleFieldChange).toHaveBeenCalledWith('startTime', '10:00')
  })

  it('calls handleFieldChange when end time is changed', () => {
    renderComponent()

  const timeInputs = screen.getAllByDisplayValue('').filter((el) => el.getAttribute('type') === 'time')
  fireEvent.change(timeInputs[1], { target: { value: '11:00' } })

    expect(mockHandleFieldChange).toHaveBeenCalledWith('endTime', '11:00')
  })

  it('renders textarea for observation', () => {
    renderComponent()

    const textarea = screen.getByPlaceholderText(
      'Digite observações sobre o evento...'
    )
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('maxlength', '500')
  })

  it('calls handleFieldChange when observation is changed', () => {
    renderComponent()

    const textarea = screen.getByPlaceholderText(
      'Digite observações sobre o evento...'
    )
    fireEvent.change(textarea, { target: { value: 'Test observation' } })

    expect(mockHandleFieldChange).toHaveBeenCalledWith(
      'observation',
      'Test observation'
    )
  })

  it('displays character count for observation', () => {
    renderComponent({
      ...mockFormState,
      observation: 'Test',
    })

    expect(screen.getByText('4/500 caracteres')).toBeInTheDocument()
  })

  it('displays error messages for fields', () => {
    const errorsWithMessages = {
      eventType: 'Tipo de evento é obrigatório',
      selectedProfessional: 'Profissional é obrigatório',
      date: 'Data é obrigatória',
      startTime: 'Hora de início é obrigatória',
      endTime: 'Hora de fim é obrigatória',
    }

    renderComponent(mockFormState, errorsWithMessages)

    expect(screen.getByText('Tipo de evento é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Profissional é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Data é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Hora de início é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Hora de fim é obrigatória')).toBeInTheDocument()
  })

  it('displays overlap error message', () => {
    const errorsWithOverlap = {
      overlap: 'Este horário conflita com outro evento',
    }

    renderComponent(mockFormState, errorsWithOverlap)

    expect(
      screen.getByText('Este horário conflita com outro evento')
    ).toBeInTheDocument()
  })

  it('renders with pre-filled values correctly', () => {
    const filledFormState = {
  eventType: 'CONSULTA' as EventType,
      selectedProfessional: '1',
      date: '2024-10-25',
      startTime: '10:00',
      endTime: '11:00',
      observation: 'Consulta de rotina',
    }

    renderComponent(filledFormState)

    expect(screen.getByDisplayValue('2024-10-25')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('11:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Consulta de rotina')).toBeInTheDocument()
  })

  it('applies error styling to inputs with errors', () => {
    const errorsWithDate = {
      date: 'Data inválida',
    }

    renderComponent(mockFormState, errorsWithDate)

  const dateInputs = screen.getAllByDisplayValue('')
  const dateInput = dateInputs.find((el) => el.getAttribute('type') === 'date')
  expect(dateInput).toBeDefined()
  expect(dateInput).toHaveClass('border-red-500')
  })

  it('renders with pre-filled values', () => {
    const filledFormState = {
  eventType: 'CONSULTA' as EventType,
      selectedProfessional: '1',
      date: '2024-10-25',
      startTime: '10:00',
      endTime: '11:00',
      observation: 'Consulta de rotina',
    }

    renderComponent(filledFormState)

    expect(screen.getByDisplayValue('2024-10-25')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('11:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Consulta de rotina')).toBeInTheDocument()
  })

  it('handles empty professional options', () => {
    renderComponent(mockFormState, mockErrors, [])

    const selectTrigger = screen.getByText('Selecione o profissional...')
    fireEvent.click(selectTrigger)

    // Should not crash and should show empty dropdown
    expect(selectTrigger).toBeInTheDocument()
  })

  it('handles long observation text', () => {
    const longObservation = 'A'.repeat(500)

    renderComponent({
      ...mockFormState,
      observation: longObservation,
    })

    expect(screen.getByText('500/500 caracteres')).toBeInTheDocument()
  })
})

