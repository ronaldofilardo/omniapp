/**
 * Funções utilitárias compartilhadas para testes
 */
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { createWrapper } from './TestWrapper'

/**
 * Renderiza um componente com todos os providers necessários
 */
export const renderWithProviders = (
  component: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(component, { wrapper: createWrapper(), ...options })
}

/**
 * Cria um evento mockado com valores padrão
 */
export const createMockEvent = (overrides = {}) => ({
  id: 'mock-event-id',
  title: 'Mock Event',
  description: 'Mock Description',
  date: '2024-01-01',
  type: 'CONSULTA',
  startTime: '10:00',
  endTime: '11:00',
  professionalId: 'prof-1',
  userId: 'user-1',
  files: [],
  ...overrides,
})

/**
 * Cria um profissional mockado com valores padrão
 */
export const createMockProfessional = (overrides = {}) => ({
  id: 'mock-prof-id',
  name: 'Dr. Mock',
  specialty: 'Cardiologia',
  userId: 'user-1',
  contact: {
    email: 'mock@example.com',
    phone: '11999999999'
  },
  ...overrides,
})

/**
 * Cria um usuário mockado com valores padrão
 */
export const createMockUser = (overrides = {}) => ({
  id: 'mock-user-id',
  name: 'Mock User',
  email: 'user@example.com',
  role: 'USER',
  ...overrides,
})

/**
 * Cria uma notificação mockada com valores padrão
 */
export const createMockNotification = (overrides = {}) => ({
  id: 'mock-notif-id',
  title: 'Mock Notification',
  message: 'Mock message',
  type: 'RESULT',
  userId: 'user-1',
  createdAt: '2025-10-28T10:00:00Z',
  read: false,
  ...overrides,
})

/**
 * Utilitário para esperar por atualizações assíncronas
 */
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Utilitário para simular um erro de API
 */
export const createApiError = (status = 500, message = 'Erro interno do servidor') => {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
