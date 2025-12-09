/**
 * MSW (Mock Service Worker) Setup
 * Configuração para mockar APIs HTTP de forma realista
 */

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { beforeAll, afterEach, afterAll } from 'vitest'

/**
 * Handlers padrão para APIs externas
 */
const handlers = [
  // Mock de upload para Cloudinary
  http.post('*/cloudinary/*/image/upload', () => {
    return HttpResponse.json({
      secure_url: 'https://res.cloudinary.com/test/image/upload/v1234567890/test.jpg',
      public_id: 'test_image_123',
      format: 'jpg',
      width: 1920,
      height: 1080,
      bytes: 204800,
    })
  }),

  // Mock de API de laboratório externo
  http.post('*/api/laboratorio/*', () => {
    return HttpResponse.json({
      success: true,
      protocolo: 'LAB-2025-001',
      status: 'RECEBIDO',
    })
  }),

  // Mock de envio de email (caso tenha webhook)
  http.post('*/api/email/send', () => {
    return HttpResponse.json({
      success: true,
      messageId: 'mock-email-123',
    })
  }),

  // Mock da API de validação de share
  http.post('/api/share/validate', () => {
    return HttpResponse.json({
      files: [
        { id: '1', name: 'exame.pdf', type: 'application/pdf', url: '/downloads/exame.pdf' },
        { id: '2', name: 'receita.jpg', type: 'image/jpeg', url: '/downloads/receita.jpg' }
      ]
    })
  }),
]

/**
 * Servidor MSW para testes
 */
export const mswServer = setupServer(...handlers)

/**
 * Setup automático do MSW para testes
 * Chamar no arquivo de setup global
 */
export function setupMSW() {
  // Inicia o servidor antes de todos os testes
  beforeAll(() => {
    mswServer.listen({
      onUnhandledRequest: 'bypass', // Ignora requisições não mockadas
    })
  })

  // Reseta handlers após cada teste
  afterEach(() => {
    mswServer.resetHandlers()
  })

  // Para o servidor após todos os testes
  afterAll(() => {
    mswServer.close()
  })
}

/**
 * Helper para adicionar handlers temporários em testes específicos
 * Exemplo:
 * addMSWHandler(
 *   http.get('/api/user/:id', () => {
 *     return HttpResponse.json({ id: '1', name: 'Test' })
 *   })
 * )
 */
export function addMSWHandler(...newHandlers: Parameters<typeof mswServer.use>) {
  mswServer.use(...newHandlers)
}

/**
 * Helper para mockar erro de API
 */
export function mockAPIError(url: string, status = 500, message = 'Internal Server Error') {
  return http.all(url, () => {
    return new HttpResponse(message, { status })
  })
}

/**
 * Helper para mockar delay de rede
 */
export function mockAPIWithDelay(url: string, data: any, delayMs = 100) {
  return http.all(url, async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return HttpResponse.json(data)
  })
}
