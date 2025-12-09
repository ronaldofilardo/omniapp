/**
 * Test Data Factories
 * Factories para criar dados de teste realistas e consistentes
 */

import { User, Professional, HealthEvent, Notification, UserRole, EventType, NotificationStatus } from '@prisma/client'

/**
 * Factory para criar usuários de teste
 */
export const userFactory = {
  build: (overrides?: Partial<User>): User => ({
    id: `user-${Math.random().toString(36).substring(7)}`,
    name: 'Test User',
    email: `test-${Math.random().toString(36).substring(7)}@example.com`,
    emailVerified: null,
    role: 'RECEPTOR' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
    password: 'hashed_password_test',
    cpf: null,
    telefone: null,
    acceptedPrivacyPolicy: false,
    acceptedTermsOfUse: false,
    ...overrides,
  }),

  buildMany: (count: number, overrides?: Partial<User>): User[] => {
    return Array.from({ length: count }, () => userFactory.build(overrides))
  },

  admin: (overrides?: Partial<User>): User => {
    return userFactory.build({
      role: 'ADMIN' as UserRole,
      name: 'Admin User',
      ...overrides,
    })
  },

  receptor: (overrides?: Partial<User>): User => {
    return userFactory.build({
      role: 'RECEPTOR' as UserRole,
      name: 'Receptor Test',
      ...overrides,
    })
  },

  emissor: (overrides?: Partial<User>): User => {
    return userFactory.build({
      role: 'EMISSOR' as UserRole,
      name: 'Emissor Test',
      ...overrides,
    })
  },
}

/**
 * Factory para criar profissionais de teste
 */
export const professionalFactory = {
  build: (overrides?: Partial<Professional>): Professional => ({
    id: `prof-${Math.random().toString(36).substring(7)}`,
    name: 'Dr. Test Professional',
    specialty: 'Cardiologia',
    address: null,
    contact: '11999999999',
    userId: 'user-123',
    ...overrides,
  }),

  buildMany: (count: number, overrides?: Partial<Professional>): Professional[] => {
    return Array.from({ length: count }, () => professionalFactory.build(overrides))
  },

  cardiologista: (overrides?: Partial<Professional>): Professional => {
    return professionalFactory.build({
      specialty: 'Cardiologia',
      name: 'Dr. Cardio',
      ...overrides,
    })
  },

  clinico: (overrides?: Partial<Professional>): Professional => {
    return professionalFactory.build({
      specialty: 'Clínica Geral',
      name: 'Dr. Clínico',
      ...overrides,
    })
  },
}

/**
 * Factory para criar eventos de saúde de teste
 */
export const healthEventFactory = {
  build: (overrides?: Partial<HealthEvent>): HealthEvent => ({
    id: `event-${Math.random().toString(36).substring(7)}`,
    title: 'Consulta Test',
    description: 'Consulta de teste',
    date: new Date(),
    startTime: new Date(new Date().setHours(9, 0, 0, 0)),
    endTime: new Date(new Date().setHours(10, 0, 0, 0)),
    type: 'CONSULTA' as EventType,
    userId: 'user-123',
    professionalId: 'prof-123',
    observation: null,
    ...overrides,
  }),

  buildMany: (count: number, overrides?: Partial<HealthEvent>): HealthEvent[] => {
    return Array.from({ length: count }, (_, i) => {
      const baseDate = new Date()
      return healthEventFactory.build({
        startTime: new Date(baseDate.setHours(9 + i, 0, 0, 0)),
        endTime: new Date(baseDate.setHours(10 + i, 0, 0, 0)),
        ...overrides,
      })
    })
  },

  consulta: (overrides?: Partial<HealthEvent>): HealthEvent => {
    return healthEventFactory.build({
      type: 'CONSULTA' as EventType,
      title: 'Consulta Médica',
      ...overrides,
    })
  },

  exame: (overrides?: Partial<HealthEvent>): HealthEvent => {
    return healthEventFactory.build({
      type: 'EXAME' as EventType,
      title: 'Exame de Sangue',
      ...overrides,
    })
  },
}

/**
 * Factory para criar notificações de teste
 */
export const notificationFactory = {
  build: (overrides?: Partial<Notification>): Notification => ({
    id: `notif-${Math.random().toString(36).substring(7)}`,
    userId: 'user-123',
    type: 'LAB_RESULT',
    payload: { message: 'Test notification' },
    status: 'UNREAD' as NotificationStatus,
    documento: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  buildMany: (count: number, overrides?: Partial<Notification>): Notification[] => {
    return Array.from({ length: count }, () => notificationFactory.build(overrides))
  },

  unread: (overrides?: Partial<Notification>): Notification => {
    return notificationFactory.build({
      status: 'UNREAD' as NotificationStatus,
      ...overrides,
    })
  },

  read: (overrides?: Partial<Notification>): Notification => {
    return notificationFactory.build({
      status: 'READ' as NotificationStatus,
      ...overrides,
    })
  },
}

/**
 * Factory principal que exporta todos os factories
 */
export const testDataFactory = {
  user: userFactory,
  professional: professionalFactory,
  healthEvent: healthEventFactory,
  notification: notificationFactory,
}
