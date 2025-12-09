/**
 * Utilitários para gerenciamento de mocks em testes
 * Facilita o uso e configuração de mocks específicos
 */

import { mockPrisma, resetAllMocks } from '../__mocks__/global'
import { vi } from 'vitest'

/**
 * Configuração padrão para testes de API
 */
export const setupApiMocks = () => {
  resetAllMocks()
  
  // Configurar mocks básicos para user
  mockPrisma.user.findUnique.mockResolvedValue({
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'RECEPTOR',
    password: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    cpf: null,
    telefone: null,
    acceptedPrivacyPolicy: true,
    acceptedTermsOfUse: true,
    emailVerified: null,
  })
  
  // Configurar fetch mock para APIs externas
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
}

/**
 * Configuração para testes de componentes React
 */
export const setupComponentMocks = () => {
  resetAllMocks()
  
  // Mock específicos para componentes
  // Pode ser expandido conforme necessário
}

/**
 * Configuração para testes de arquivos órfãos
 */
export const setupOrphanFilesMocks = () => {
  resetAllMocks()
  
  mockPrisma.user.findUnique.mockResolvedValue({ 
    id: 'user-1', 
    email: 'user@email.com',
    name: 'Test User',
    role: 'RECEPTOR',
    password: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    cpf: null,
    telefone: null,
    acceptedPrivacyPolicy: true,
    acceptedTermsOfUse: true,
    emailVerified: null,
  })
  
  mockPrisma.files.findMany.mockResolvedValue([
    {
      id: 'file-1',
      name: 'arquivo-orfao.pdf',
      url: 'http://example.com/file.pdf',
      fileHash: null,
      professionalId: 'user-1',
      eventId: null,
      slot: 'document',
      physicalPath: '/path/to/file.pdf',
      uploadDate: new Date(),
      expiryDate: null,
      isOrphaned: true,
      orphanedReason: 'Teste',
    }
  ])
}

/**
 * Configuração para testes de eventos de saúde
 */
export const setupHealthEventMocks = () => {
  resetAllMocks()
  
  mockPrisma.healthEvent.findMany.mockResolvedValue([
    {
      id: 'event-1',
      title: 'Evento de Teste',
      description: 'Descrição do evento',
      date: new Date('2025-01-15'),
      type: 'CONSULTA',
      userId: 'user-1',
      endTime: new Date('2025-01-15T10:00:00'),
      professionalId: 'prof-1',
      startTime: new Date('2025-01-15T09:00:00'),
      observation: null,
    }
  ])
}

/**
 * Configuração para testes de notificações
 */
export const setupNotificationMocks = () => {
  resetAllMocks()
  
  mockPrisma.notification.findMany.mockResolvedValue([
    {
      id: 'notification-1',
      type: 'LAB_RESULT',
      payload: {
        reportId: 'report-1',
        doctorName: 'Dr. Silva',
        examDate: '2024-01-15',
        report: {
          fileName: 'laudo.pdf',
          fileContent: 'base64content',
        },
        title: 'Laudo de Exame',
        protocol: '12345'
      },
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      status: 'UNREAD',
      userId: 'user-1',
      documento: null,
    }
  ])
}

/**
 * Utilitário para criar mocks personalizados de resposta HTTP
 */
export const createMockResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Utilitário para criar mock request do Next.js
 */
export const createMockRequest = (url: string, options: RequestInit = {}) => {
  return new Request(url, options)
}

// Re-exportar para facilitar importações
export { mockPrisma, resetAllMocks }
