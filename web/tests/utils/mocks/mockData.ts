/**
 * Dados mockados para testes
 * Centraliza todos os dados de exemplo para garantir consistência entre testes
 */

export const mockEvents = [
  {
    id: '1',
    title: 'Evento 1',
    description: 'Descrição do evento 1',
    date: '2025-10-01',
    type: 'CONSULTA',
    startTime: '10:00',
    endTime: '11:00',
    professionalId: 'prof-1',
    userId: 'user-1',
    files: []
  },
  {
    id: '2',
    title: 'Evento 2',
    description: 'Descrição do evento 2',
    date: '2025-10-02',
    type: 'EXAME',
    startTime: '14:00',
    endTime: '15:00',
    professionalId: 'prof-2',
    userId: 'user-1',
    files: []
  }
]

export const mockProfessionals = [
  {
    id: 'prof-1',
    name: 'Dr. João Silva',
    specialty: 'Cardiologia',
    userId: 'user-1',
    contact: { email: 'joao@example.com', phone: '11999999999' }
  },
  {
    id: 'prof-2',
    name: 'Dra. Maria Santos',
    specialty: 'Neurologia',
    userId: 'user-1',
    contact: { email: 'maria@example.com', phone: '11988888888' }
  }
]

export const mockUsers = [
  {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@example.com',
    role: 'ADMIN'
  }
]

export const mockNotifications = [
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
    createdAt: '2024-01-15T10:00:00Z',
    status: 'PENDING'
  }
]
