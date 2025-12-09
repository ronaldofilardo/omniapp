/**
 * Mock global do fetch para testes
 * Centraliza todas as respostas mockadas da API
 */

import { vi, beforeAll, afterAll } from 'vitest'
import { mockEvents, mockProfessionals, mockUsers, mockNotifications } from './mockData'

// Tipos para facilitar a manutenção das rotas
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
type MockResponse = {
  status: number
  body: any
}

// Mapeamento de rotas para respostas
const routeHandlers = new Map<string, Record<HttpMethod, (params?: any) => MockResponse>>()

// Configuração das rotas da API
routeHandlers.set('/api/events', {
  GET: () => ({ status: 200, body: mockEvents }),
  POST: (data) => ({ status: 201, body: { id: '3', ...data, message: 'Evento criado' } }),
  PUT: () => ({ status: 200, body: { message: 'Evento atualizado' } }),
  DELETE: () => ({ status: 200, body: { message: 'Evento deletado' } }),
  PATCH: () => ({ status: 200, body: { message: 'Evento atualizado parcialmente' } })
})

routeHandlers.set('/api/professionals', {
  GET: () => ({ status: 200, body: mockProfessionals }),
  POST: (data) => ({ status: 201, body: { id: 'prof-3', ...data, message: 'Profissional criado' } }),
  PUT: () => ({ status: 200, body: { message: 'Profissional atualizado' } }),
  DELETE: () => ({ status: 200, body: { message: 'Profissional deletado' } }),
  PATCH: () => ({ status: 200, body: { message: 'Profissional atualizado parcialmente' } })
})

routeHandlers.set('/api/notifications', {
  GET: () => ({ status: 200, body: mockNotifications }),
  POST: (data) => ({ status: 201, body: { id: 'notif-3', ...data, message: 'Notificação criada' } }),
  PUT: () => ({ status: 200, body: { message: 'Notificação atualizada' } }),
  DELETE: () => ({ status: 200, body: { message: 'Notificação deletada' } }),
  PATCH: () => ({ status: 200, body: { message: 'Notificação atualizada parcialmente' } })
})

// Função auxiliar para encontrar handlers dinâmicos (com parâmetros na URL)
const findDynamicHandler = (url: string): [string, Record<HttpMethod, Function>] | undefined => {
  // Matches /api/events/123, /api/professionals/456, etc
  const matches = {
    events: url.match(/^\/api\/events\/(\d+)$/),
    professionals: url.match(/^\/api\/professionals\/(\d+)$/),
    notifications: url.match(/^\/api\/notifications\/(\d+)$/)
  }

  if (matches.events) {
    const id = matches.events[1]
    const event = mockEvents.find(e => e.id === id)
    return [url, {
      GET: () => ({ status: event ? 200 : 404, body: event || { message: 'Evento não encontrado' } }),
      PUT: (data) => ({ status: 200, body: { ...event, ...data, message: 'Evento atualizado' } }),
      DELETE: () => ({ status: 200, body: { message: 'Evento deletado' } }),
      POST: () => ({ status: 405, body: { message: 'Método não permitido' } }),
      PATCH: (data) => ({ status: 200, body: { ...event, ...data, message: 'Evento atualizado parcialmente' } })
    }]
  }

  if (matches.professionals) {
    const id = matches.professionals[1]
    const professional = mockProfessionals.find(p => p.id === id)
    return [url, {
      GET: () => ({ status: professional ? 200 : 404, body: professional || { message: 'Profissional não encontrado' } }),
      PUT: (data) => ({ status: 200, body: { ...professional, ...data, message: 'Profissional atualizado' } }),
      DELETE: () => ({ status: 200, body: { message: 'Profissional deletado' } }),
      POST: () => ({ status: 405, body: { message: 'Método não permitido' } }),
      PATCH: (data) => ({ status: 200, body: { ...professional, ...data, message: 'Profissional atualizado parcialmente' } })
    }]
  }

  return undefined
}

// Setup do mock global de fetch
beforeAll(() => {
  vi.stubGlobal('fetch', async (input: string | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url
    const method = (init?.method || 'GET') as HttpMethod
    const body = init?.body ? JSON.parse(init.body.toString()) : undefined

    // Procura handler estático
    let handler = routeHandlers.get(url)?.[method]

    // Se não encontrar handler estático, procura dinâmico
    if (!handler) {
      const dynamicRoute = findDynamicHandler(url)
      if (dynamicRoute) {
        handler = dynamicRoute[1][method]
      }
    }

    // Se não encontrar nenhum handler, retorna 404
    if (!handler) {
      return new Response(
        JSON.stringify({ message: 'Rota não encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Executa o handler e retorna a resposta
    const response = handler(body)
    return new Response(
      JSON.stringify(response.body),
      { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  })
})

// Limpa o mock após os testes
afterAll(() => {
  vi.unstubAllGlobals()
})

/**
 * Adiciona uma nova rota ao mock
 * @param path Caminho da rota (ex: /api/resources)
 * @param handlers Object com handlers para cada método HTTP
 */
export const addMockRoute = (
  path: string,
  handlers: Partial<Record<HttpMethod, (params?: any) => MockResponse>>
) => {
  const existingHandlers = routeHandlers.get(path) || {} as Record<HttpMethod, Function>
  routeHandlers.set(path, { ...existingHandlers, ...handlers } as Record<HttpMethod, Function>)
}

/**
 * Remove uma rota do mock
 * @param path Caminho da rota a ser removida
 */
export const removeMockRoute = (path: string) => {
  routeHandlers.delete(path)
}