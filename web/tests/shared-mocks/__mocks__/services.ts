/**
 * Mocks centralizados para serviços
 * Este arquivo centraliza todos os mocks dos serviços para reutilização entre testes
 */
import { vi } from 'vitest'

// Mock do Event Service
export const createEventServiceMock = () => {
  const events: any[] = []
  
  return {
    events,
    getAllEvents: vi.fn(() => events),
    addEvent: vi.fn((event) => {
      const newEvent = { ...event, id: event.id || Date.now() }
      events.push(newEvent)
      return newEvent
    }),
    updateEvent: vi.fn((updatedEvent) => {
      const index = events.findIndex(e => e.id === updatedEvent.id)
      if (index !== -1) {
        events[index] = updatedEvent
      }
      return updatedEvent
    }),
    getEventById: vi.fn((id) => events.find(e => e.id === id)),
    removeEvent: vi.fn((id) => {
      const index = events.findIndex(e => e.id === id)
      if (index !== -1) {
        events.splice(index, 1)
        return true
      }
      return false
    }),
    clearEvents: () => {
      events.length = 0
    }
  }
}

// Mock do Professional Service
export const createProfessionalServiceMock = () => {
  const professionals: any[] = []
  
  return {
    professionals,
    getProfessionals: vi.fn(() => professionals),
    addProfessional: vi.fn((professional) => {
      const newProf = { 
        ...professional, 
        id: professional.id || `prof-${Date.now()}` 
      }
      professionals.push(newProf)
      return newProf
    }),
    updateProfessional: vi.fn((updatedProfessional) => {
      const index = professionals.findIndex(p => p.id === updatedProfessional.id)
      if (index !== -1) {
        professionals[index] = updatedProfessional
      }
      return updatedProfessional
    }),
    deleteProfessional: vi.fn((id) => {
      const index = professionals.findIndex(p => p.id === id)
      if (index !== -1) {
        professionals.splice(index, 1)
        return true
      }
      return false
    }),
    getProfessionalById: vi.fn((id) => professionals.find(p => p.id === id)),
    clearProfessionals: () => {
      professionals.length = 0
    }
  }
}

// Mock para fetch/API calls
export const createFetchMock = () => {
  return vi.fn((url: string | URL | Request, options?: RequestInit) => {
    const urlString = url instanceof URL || url instanceof Request ? url.toString() : url
    
    // Mock response helper
    const createResponse = (data: any, ok = true, status = 200) => {
      return Promise.resolve({
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        headers: new Headers(),
        redirected: false,
        type: 'basic' as ResponseType,
        url: urlString,
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
    
    // Default responses for common endpoints
    if (urlString.includes('/api/events')) {
      if (!options || options.method === 'GET') {
        return createResponse([])
      }
      if (options.method === 'PUT' || options.method === 'POST') {
        const body = options.body ? JSON.parse(options.body as string) : {}
        return createResponse({ id: Date.now(), ...body })
      }
      if (options.method === 'DELETE') {
        return createResponse({ success: true })
      }
    }
    
    if (urlString.includes('/api/professionals')) {
      if (!options || options.method === 'GET') {
        return createResponse([])
      }
      if (options.method === 'POST') {
        const body = options.body ? JSON.parse(options.body as string) : {}
        return createResponse({ id: `prof-${Date.now()}`, ...body })
      }
    }
    
    // Fallback
    return createResponse({})
  })
}

// Utility para limpar todos os mocks
export const clearAllMocks = (mocks: Record<string, any>) => {
  Object.values(mocks).forEach(mock => {
    if (mock && typeof mock.clearEvents === 'function') {
      mock.clearEvents()
    }
    if (mock && typeof mock.clearProfessionals === 'function') {
      mock.clearProfessionals()
    }
  })
  vi.clearAllMocks()
}
