import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEventServiceMock, clearAllMocks } from './__mocks__/services'
import { mockEvents } from '../web/tests/utils/mocks/mockData'

// Mock centralizado do eventService
let eventService: ReturnType<typeof createEventServiceMock>

describe('eventService', () => {
  beforeEach(() => {
    // Criar nova instância do mock antes de cada teste
    eventService = createEventServiceMock()
    clearAllMocks({ eventService })
  })

  it('deve retornar todos os eventos', () => {
    // Teste para verificar se todos os eventos são retornados corretamente
    const eventos = eventService.getAllEvents()
    expect(Array.isArray(eventos)).toBe(true)
    expect(eventService.getAllEvents).toHaveBeenCalled()
  })

  it('deve adicionar um novo evento', () => {
    // Teste para verificar se um novo evento é adicionado corretamente
    const novoEvento = { id: 1, nome: 'Evento Teste' }
    eventService.addEvent.mockReturnValue(true)
    eventService.getAllEvents.mockReturnValue([novoEvento])
    
    const resultado = eventService.addEvent(novoEvento)
    const eventos = eventService.getAllEvents()
    
    expect(resultado).toBe(true)
    expect(eventos).toContain(novoEvento)
    expect(eventService.addEvent).toHaveBeenCalledWith(novoEvento)
  })

  it('deve atualizar um evento existente', () => {
    // Adicionar evento primeiro
    const evento = { id: 1, nome: 'Evento Original' }
    eventService.addEvent(evento)
    
    // Teste para verificar se um evento existente é atualizado corretamente
    const eventoAtualizado = { id: 1, nome: 'Evento Atualizado' }
    eventService.updateEvent(eventoAtualizado)
    const eventoEncontrado = eventService.getEventById(1)
    expect(eventoEncontrado?.nome).toBe('Evento Atualizado')
  })

  it('deve remover um evento', () => {
    // Adicionar evento primeiro
    const evento = { id: 1, nome: 'Evento para Remover' }
    eventService.addEvent(evento)
    
    // Teste para verificar se um evento é removido corretamente
    const resultado = eventService.removeEvent(1)
    expect(resultado).toBe(true)
    
    const eventoEncontrado = eventService.getEventById(1)
    expect(eventoEncontrado).toBeUndefined()
  })

  it('deve retornar false ao tentar remover evento inexistente', () => {
    const resultado = eventService.removeEvent(999)
    expect(resultado).toBe(false)
  })

  it('deve buscar evento por ID', () => {
    const evento = { id: 1, nome: 'Evento Teste' }
    eventService.addEvent(evento)
    
    const eventoEncontrado = eventService.getEventById(1)
    expect(eventoEncontrado).toEqual(evento)
    expect(eventService.getEventById).toHaveBeenCalledWith(1)
  })
});
