import { useState, useEffect, useCallback, useMemo } from 'react'
import { validateDate } from '@/lib/validators/eventValidators'

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

interface Event {
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
}

interface UseEditEventFormProps {
  event: Event | null
  professionals: Professional[]
  onSave: (updatedEvent: Event) => void
  onClose: () => void
}

interface FormState {
  eventType: string
  selectedProfessional: string
  date: string
  startTime: string
  endTime: string
  observation: string
  hasInstructions: boolean
  instructions: string
}

interface FormErrors {
  startTime?: string
  endTime?: string
  date?: string
  overlap?: string
}

const INITIAL_STATE: FormState = {
  eventType: '',
  selectedProfessional: '',
  date: '',
  startTime: '',
  endTime: '',
  observation: '',
  hasInstructions: false,
  instructions: '',
}

export function useEditEventForm({
  event,
  professionals,
  onSave,
  onClose,
}: UseEditEventFormProps) {
  const [state, setState] = useState<FormState>(INITIAL_STATE)
  const [errors, setErrors] = useState<FormErrors>({})
  const [events, setEvents] = useState<Event[]>([])

  // Busca eventos para validação de sobreposição - com memoização do resultado
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    } catch {
      setEvents([])
    }
  }, [])

  // Carregar dados do evento - com memoização dos valores
  const initialState = useMemo(() => event ? {
    eventType: event.type,
    selectedProfessional: event.professionalId,
    date: event.date.split('T')[0],
    startTime: event.startTime || '',
    endTime: event.endTime || '',
    observation: event.observation || '',
    hasInstructions: event.instructions || false,
    instructions: '',
  } : INITIAL_STATE, [event])

  useEffect(() => {
    if (event) {
      setState(initialState)
      setErrors({})
      fetchEvents()
    }
  }, [event, fetchEvents, initialState])

  const handleFieldChange = <T extends keyof FormState>(
    field: T,
    value: FormState[T]
  ) => {
    setState((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field as keyof FormErrors]: undefined }))
    }
  }

  const validateForm = useCallback(() => {
    const newErrors: FormErrors = {}

    // Validações básicas
    if (!state.startTime) {
      newErrors.startTime = 'Horário de início obrigatório.'
      return newErrors
    }
    if (!/^\d{2}:\d{2}$/.test(state.startTime)) {
      newErrors.startTime = 'Formato inválido. Use HH:mm.'
      return newErrors
    }
    const [startH, startM] = state.startTime.split(':').map(Number)
    if (startH < 0 || startH > 23 || startM < 0 || startM > 59) {
      newErrors.startTime = 'Horário fora do intervalo permitido.'
      return newErrors
    }

    if (!state.endTime) {
      newErrors.endTime = 'Horário de fim obrigatório.'
      return newErrors
    }
    if (!/^\d{2}:\d{2}$/.test(state.endTime)) {
      newErrors.endTime = 'Formato inválido. Use HH:mm.'
      return newErrors
    }
    const [endH, endM] = state.endTime.split(':').map(Number)
    if (endH < 0 || endH > 23 || endM < 0 || endM > 59) {
      newErrors.endTime = 'Horário fora do intervalo permitido.'
      return newErrors
    }

    const startTotal = startH * 60 + startM
    const endTotal = endH * 60 + endM
    if (endTotal <= startTotal) {
      newErrors.endTime = 'Horário de fim deve ser maior que o de início.'
      return newErrors
    }

    // Validação de data
    if (state.date) {
      const dateValidation = validateDate(state.date)
      if (!dateValidation.isValid) {
        newErrors.date = dateValidation.error || 'Data inválida.'
        return newErrors
      }
    }

    // Validação de sobreposição
    if (
      event &&
      state.selectedProfessional &&
      state.date &&
      state.startTime &&
      state.endTime
    ) {
      const newEventStart = new Date(`${state.date}T${state.startTime}:00`)
      const newEventEnd = new Date(`${state.date}T${state.endTime}:00`)
      const overlappingEvent = events.find((e) => {
        if (
          e.id === event.id ||
          e.professionalId !== state.selectedProfessional ||
          e.date !== state.date
        )
          return false
        const existingStart = new Date(`${e.date}T${e.startTime}:00`)
        const existingEnd = new Date(`${e.date}T${e.endTime}:00`)
        return newEventStart < existingEnd && newEventEnd > existingStart
      })
      if (overlappingEvent) {
        newErrors.overlap = 'Já existe um evento agendado neste horário.'
        return newErrors
      }
    }

    return newErrors
  }, [state, event, events])

  const handleSubmit = async () => {
    if (!event) return

    const validationErrors = validateForm()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    const payload = {
      id: event.id,
      title: state.eventType,
      description: state.observation,
      date: state.date,
      type: state.eventType.toUpperCase(),
      startTime: state.startTime,
      endTime: state.endTime,
      professionalId: state.selectedProfessional,
    }

    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updatedEvent = await res.json()
        onSave(updatedEvent)
        onClose()
      } else {
        const err = await res.json()
        setErrors({ overlap: err.error || 'Erro ao editar evento' })
      }
    } catch {
      setErrors({ overlap: 'Erro ao editar evento' })
    }
  }

  const resetForm = useCallback(() => {
    setState(INITIAL_STATE)
    setErrors({})
  }, [])

  return {
    formState: state,
    errors,
    professionalOptions: professionals,
    handleFieldChange,
    handleSubmit,
    resetForm,
  }
}
