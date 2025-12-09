import { useState, useEffect, useCallback } from 'react'
import {
  validateDate,
  validateStartTime,
  validateEndTime,
  ValidationResult,
} from '@/lib/validators/eventValidators'
import { EventType } from '../components/EventForm'
import { HealthEvent } from '../contexts/EventsContext'

// Interfaces
interface Professional {
  id: string
  name: string
  specialty: string
}

type Event = HealthEvent

interface UseEventFormProps {
  professionals: Professional[]
  onFormSubmitSuccess: () => void
  userId: string
  events?: Event[]
  createEventOptimistic?: (eventData: Omit<Event, 'id'>) => Promise<void>
}

interface FormState {
  eventType: EventType | ''
  selectedProfessional: string
  date: string
  startTime: string
  endTime: string
  observation: string
}

interface FormErrors {
  eventType?: string
  selectedProfessional?: string
  date?: string
  startTime?: string
  endTime?: string
  overlap?: string
}

// Constantes
const INITIAL_STATE: FormState = {
  eventType: '',
  selectedProfessional: '',
  date: '',
  startTime: '',
  endTime: '',
  observation: '',
}

// Hook principal
export function useEventForm(props: UseEventFormProps) {
  const { professionals, onFormSubmitSuccess, userId, events: externalEvents, createEventOptimistic } = props
  const [state, setState] = useState<FormState>(INITIAL_STATE)
  const [errors, setErrors] = useState<FormErrors>({})
  const [events, setEvents] = useState<Event[]>([])

  // Busca eventos existentes para validação de sobreposição
  const fetchEvents = useCallback(() => {
    if (externalEvents) {
      setEvents(externalEvents)
    } else {
      fetch(`/api/events?userId=${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then((data) => {
          const eventsData = Array.isArray(data) ? data : data.events || [];
          setEvents(eventsData);
        })
        .catch(() => setEvents([]))
    }
  }, [userId, externalEvents])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const validateField = useCallback(
    (name: keyof FormState, value: string) => {
      let validation: ValidationResult = { isValid: true }
      if (name === 'date') {
        validation = validateDate(value)
      } else if (name === 'startTime') {
        validation = validateStartTime(value)
      } else if (name === 'endTime') {
        validation = validateEndTime(value, state.startTime)
      }
      return validation
    },
    [state.startTime]
  )

  const checkOverlap = useCallback(
    (
      date: string,
      startTime: string,
      endTime: string,
      professionalId: string
    ) => {
      if (!date || !startTime || !endTime || !professionalId) return null
      const newEventStartStr = `${date}T${startTime}:00`
      const newEventEndStr = `${date}T${endTime}:00`
      const overlappingEvent = events.find((e) => {
        if (e.professionalId !== professionalId) return false
        const eventDate = e.date.split('T')[0]
        if (eventDate !== date) return false
        const existingStartStr = `${eventDate}T${e.startTime}:00`
        const existingEndStr = `${eventDate}T${e.endTime}:00`
        return (
          newEventStartStr < existingEndStr && newEventEndStr > existingStartStr
        )
      })
      if (overlappingEvent) {
        return `Conflito: Este profissional já possui um evento das ${overlappingEvent.startTime} às ${overlappingEvent.endTime}.`
      }
      return null
    },
    [events]
  )

  const handleFieldChange = <T extends keyof FormState>(
    field: T,
    value: FormState[T]
  ) => {
    setState((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field as keyof FormErrors]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: FormErrors = {}

    // Validações
    if (!state.eventType) newErrors.eventType = 'Selecione um tipo de evento.'
    if (!state.selectedProfessional)
      newErrors.selectedProfessional = 'Selecione um profissional.'

    const dateValidation = validateDate(state.date)
    if (!dateValidation.isValid) newErrors.date = dateValidation.error

    const startTimeValidation = validateStartTime(state.startTime)
    if (!startTimeValidation.isValid) newErrors.startTime = startTimeValidation.error

    const endTimeValidation = validateEndTime(state.endTime, state.startTime)
    if (!endTimeValidation.isValid) newErrors.endTime = endTimeValidation.error

    // Validação de sobreposição
    if (
      dateValidation.isValid &&
      startTimeValidation.isValid &&
      endTimeValidation.isValid &&
      state.selectedProfessional
    ) {
      const overlapMsg = checkOverlap(
        state.date,
        state.startTime,
        state.endTime,
        state.selectedProfessional
      )
      if (overlapMsg) newErrors.overlap = overlapMsg
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      return
    }

    // Submissão para a API
    try {
      const eventData = {
        title: state.eventType,
        description: state.observation,
        date: state.date,
        type: state.eventType,
        startTime: state.startTime,
        endTime: state.endTime,
        professionalId: state.selectedProfessional,
        observation: state.observation,
        instructions: false,
      }

      if (createEventOptimistic) {
        await createEventOptimistic(eventData)
      } else {
        const response = await fetch(`/api/events?userId=${encodeURIComponent(userId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...eventData,
            files: [],
          }),
        })

        if (!response.ok) {
          let errorMsg = 'Falha na comunicação com o servidor. Tente novamente.'
          try {
            const errorData = await response.json()
            if (errorData && errorData.error) {
              errorMsg = errorData.error
            }
          } catch {}
          setErrors({ overlap: errorMsg })
          return
        }
      }

      // Sucesso
      setState(INITIAL_STATE)
      onFormSubmitSuccess()
    } catch (error) {
      setErrors({
        overlap: 'Falha na comunicação com o servidor. Tente novamente.',
      })
    }
  }

  return {
    formState: state,
    errors,
    setErrors,
    professionalOptions: professionals,
    handleFieldChange,
    handleSubmit,
    setFormState: setState,
    refreshEvents: fetchEvents,
  }
}
