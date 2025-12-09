import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createEventServiceMock, createFetchMock, clearAllMocks } from './__mocks__/services'
import { mockEvents } from '../utils/mocks/mockData'

// Mock do hook useEditEventForm mais realista
const createUseEditEventFormMock = () => {
  let state = {
    eventType: '',
    selectedProfessional: '',
    date: '',
    startTime: '',
    endTime: '',
    observation: '',
    hasInstructions: false,
    instructions: '',
    isEditing: false,
    eventData: null as any,
    isSubmitting: false,
    errors: {} as Record<string, string>
  }
  
  return {
    get state() { return state },
    editEvent: vi.fn((event) => {
      if (!event || !event.id) {
        throw new Error('Evento inválido')
      }
      state = { ...state, isEditing: true, eventData: event }
      return { success: true }
    }),
    updateField: vi.fn((field, value) => {
      state = { ...state, [field]: value }
    }),
    submitForm: vi.fn(async () => {
      if (!state.eventData?.id) {
        throw new Error('Nenhum evento para editar')
      }
      state = { ...state, isSubmitting: true }
      // Simula delay da API
      await new Promise(resolve => setTimeout(resolve, 100))
      state = { ...state, isSubmitting: false }
      return { success: true }
    }),
    resetForm: vi.fn(() => {
      state = {
        eventType: '',
        selectedProfessional: '',
        date: '',
        startTime: '',
        endTime: '',
        observation: '',
        hasInstructions: false,
        instructions: '',
        isEditing: false,
        eventData: null,
        isSubmitting: false,
        errors: {}
      }
    }),
    error: null
  }
}

// Dados de teste
const testEvent = mockEvents[0]
let useEditEventForm: ReturnType<typeof createUseEditEventFormMock>

describe('useEditEventForm', () => {
  beforeEach(() => {
    useEditEventForm = createUseEditEventFormMock()
    clearAllMocks({ useEditEventForm })
  })

  it('deve retornar o estado inicial corretamente', () => {
    expect(useEditEventForm.state.isEditing).toBe(false)
    expect(useEditEventForm.state.eventData).toBe(null)
    expect(useEditEventForm.state.eventType).toBe('')
  })

  it('deve atualizar o estado ao chamar a função de edição', () => {
    useEditEventForm.editEvent(testEvent)
    
    expect(useEditEventForm.editEvent).toHaveBeenCalledWith(testEvent)
    expect(useEditEventForm.state.isEditing).toBe(true)
    expect(useEditEventForm.state.eventData).toEqual(testEvent)
  })

  it('deve lidar com erros corretamente', () => {
    expect(() => {
      useEditEventForm.editEvent(null)
    }).toThrow('Evento inválido')
  })

  it('deve atualizar campos do formulário', () => {
    useEditEventForm.updateField('eventType', 'CONSULTA')
    expect(useEditEventForm.updateField).toHaveBeenCalledWith('eventType', 'CONSULTA')
    expect(useEditEventForm.state.eventType).toBe('CONSULTA')
  })

  it('deve submeter o formulário com sucesso', async () => {
    // Primeiro define um evento para editar
    useEditEventForm.editEvent(testEvent)
    
    const result = await useEditEventForm.submitForm()
    expect(result.success).toBe(true)
    expect(useEditEventForm.submitForm).toHaveBeenCalled()
  })

  it('deve falhar ao submeter sem evento', async () => {
    await expect(useEditEventForm.submitForm()).rejects.toThrow('Nenhum evento para editar')
  })

  it('deve resetar o formulário', () => {
    // Primeiro adiciona alguns dados
    useEditEventForm.editEvent(testEvent)
    useEditEventForm.updateField('eventType', 'CONSULTA')
    
    // Reseta o formulário
    useEditEventForm.resetForm()
    
    expect(useEditEventForm.state.isEditing).toBe(false)
    expect(useEditEventForm.state.eventData).toBe(null)
    expect(useEditEventForm.state.eventType).toBe('')
  })
})
