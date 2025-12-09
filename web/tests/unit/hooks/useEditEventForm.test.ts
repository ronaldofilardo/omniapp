import { renderHook, act } from '@testing-library/react'
import { useEditEventForm } from '@/hooks/useEditEventForm'
import * as React from 'react'

const INITIAL_STATE = {
  eventType: '',
  selectedProfessional: '',
  date: '',
  startTime: '',
  endTime: '',
  observation: '',
  hasInstructions: false,
  instructions: '',
}

// Vitest globals
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Helper para criar um Response mock
function createResponse(data: any, requestUrl: string, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: requestUrl,
    clone() { return this },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

describe('useEditEventForm', () => {
  const mockEvent = {
    id: '1',
    title: 'Consulta',
    description: 'Descrição',
    date: '2025-10-27',
    type: 'consulta',
    professionalId: 'p1',
    startTime: '09:00',
    endTime: '10:00',
    observation: 'Obs',
    instructions: false,
  }
  const professionals = [
    { id: 'p1', name: 'Dr. A', specialty: 'Cardio' },
    { id: 'p2', name: 'Dr. B', specialty: 'Clínico' },
  ]
  const onSave = vi.fn()
  const onClose = vi.fn()

  // CORREÇÃO APLICADA AQUI
  beforeEach(() => {
    // Limpa o histórico de chamadas e instâncias de todos os mocks
    vi.clearAllMocks()

    // Helper para criar um Response mock
    function createResponse(data: any, requestUrl: string, ok = true, status = 200) {
      return Promise.resolve({
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        headers: new Headers(),
        redirected: false,
        type: 'basic' as ResponseType,
        url: requestUrl,
        clone() { return this },
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
      } as Response)
    }

    // Usa vi.spyOn para interceptar o fetch de forma segura
    vi.spyOn(global, 'fetch').mockImplementation((requestUrl: string | URL | Request, opts: RequestInit = {}) => {
      const url = requestUrl instanceof URL || requestUrl instanceof Request ? requestUrl.toString() : requestUrl
      // Lógica do mock para GET /api/events (evita loop)
      if (url.includes('/api/events') && (!opts || opts.method === 'GET')) {
        return createResponse([], url)
      }
      // Lógica para PUT
      if (opts && opts.method === 'PUT') {
        const body = opts.body ? JSON.parse(opts.body as string) : {}
        return createResponse({ ...mockEvent, ...body }, url)
      }
      // Fallback para outras chamadas
      return createResponse({}, url)
    })
  })

  afterEach(() => {
    // vi.restoreAllMocks() restaura todos os spies criados com vi.spyOn
    // Isso garante que `global.fetch` volte ao seu estado original após cada teste.
    vi.restoreAllMocks()
  })

  // ... (seus testes 'it' continuam aqui, sem alterações)

  // ATENÇÃO: Para os testes específicos que precisam de um mock de fetch diferente,
  // faça o mock dentro do próprio teste. Ele será limpo pelo afterEach.
  it('deve validar sobreposição de eventos', async () => {
    // Mock específico para este teste
    // O spy criado no beforeEach será sobrescrito por este.
    vi.spyOn(global, 'fetch').mockImplementation((requestUrl: string | URL | Request, opts: RequestInit = {}) => {
      const url = requestUrl instanceof URL || requestUrl instanceof Request ? requestUrl.toString() : requestUrl
      if (url.includes('/api/events')) {
        return createResponse([
          { ...mockEvent, id: '2', startTime: '09:30', endTime: '10:30', date: '2025-10-27' },
        ], url)
      }
      return createResponse({}, url)
    })

    let result: any
    // ... resto do teste
  })

  it('deve lidar com erro de API ao submeter', async () => {
    // Mock específico para este teste
    vi.spyOn(global, 'fetch').mockImplementation((requestUrl: string | URL | Request, opts: RequestInit = {}) => {
      const url = requestUrl instanceof URL || requestUrl instanceof Request ? requestUrl.toString() : requestUrl
      if (opts && opts.method === 'PUT') {
        return createResponse({ error: 'Erro ao editar evento' }, url, false, 400)
      }
      return createResponse([], url)
    })

    let result: any
    // ... resto do teste
  })
})
