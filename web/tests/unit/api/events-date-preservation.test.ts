import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '@/app/api/events/route';
import { prisma } from '@/lib/prisma';

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    healthEvent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    files: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    notification: {
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock das funções de validação de arquivo
vi.mock('@/lib/utils/filePath', () => ({
  validateBase64Content: vi.fn(() => ({ isValid: true, detectedMimeType: 'application/pdf' }))
}));

// Mock do fileHashServer
vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBase64: vi.fn(() => 'mock-hash-123'),
}));

// Mock do fs
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock do path
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
  },
  join: vi.fn((...args) => args.join('/')),
}));

describe('PUT /api/events - Date Preservation', () => {
  const mockUser = { id: 'user-123' };
  const mockExistingEvent = {
    id: 'event-123',
    userId: 'user-123',
    date: new Date('2024-12-05T00:00:00.000Z'), // Data original no banco
    title: 'Consulta Original',
    type: 'CONSULTA',
    professionalId: 'prof-1',
    files: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves original event date when notificationId is provided', async () => {
    const { auth } = await import('@/lib/auth');
    const mockAuth = vi.mocked(auth);
    mockAuth.mockResolvedValue(mockUser);

    const { prisma } = await import('@/lib/prisma');
    const mockPrisma = vi.mocked(prisma);

    // Mock findUnique para retornar evento existente
    mockPrisma.healthEvent.findUnique.mockResolvedValue(mockExistingEvent);

    // Mock transaction
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback({
        healthEvent: {
          findUnique: vi.fn().mockResolvedValue(mockExistingEvent),
          update: vi.fn().mockResolvedValue({
            ...mockExistingEvent,
            title: 'Evento Atualizado',
            files: []
          })
        },
        files: {
          deleteMany: vi.fn(),
          createMany: vi.fn()
        },
        notification: {
          update: vi.fn()
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'user-123', cpf: '12345678901' })
        }
      });
    });

    const requestBody = {
      id: 'event-123',
      title: 'Evento Atualizado',
      date: '2024-12-05', // Data enviada do frontend
      type: 'CONSULTA',
      professionalId: 'prof-1',
      notificationId: 'notif-123', // Indica associação de notificação
      files: [{
        slot: 'result',
        name: 'laudo.pdf',
        url: '/uploads/event-123/result-laudo.pdf',
        physicalPath: '/uploads/event-123/result-laudo.pdf',
        uploadDate: new Date().toISOString(),
        content: 'dGVzdA=='
      }]
    };

    const request = new Request('http://localhost:3000/api/events', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-slot': 'result'
      },
      body: JSON.stringify(requestBody)
    });

    const response = await PUT(request);
    const result = await response.json();

    // Verificar que a data original foi preservada
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];

    // Simular execução da transação
    const tx = {
      healthEvent: { 
        findUnique: vi.fn().mockResolvedValue(mockExistingEvent),
        update: vi.fn().mockResolvedValue({
          ...mockExistingEvent,
          title: 'Evento Atualizado',
          files: []
        })
      },
      files: { deleteMany: vi.fn(), createMany: vi.fn() },
      notification: { update: vi.fn() },
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'user-123', cpf: '12345678901' }) }
    };

    await transactionCallback(tx);

    // Verificar que update foi chamado com date: existing.date (preservada)
    expect(tx.healthEvent.findUnique).toHaveBeenCalledWith({
      where: { id: 'event-123', userId: 'user-123' },
      include: { files: true }
    });

    expect(tx.healthEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-123', userId: 'user-123' },
      data: expect.objectContaining({
        date: mockExistingEvent.date // Data original preservada
      })
    });
  });

  it('applies timezone conversion for regular event updates without notificationId', async () => {
    const { auth } = await import('@/lib/auth');
    const mockAuth = vi.mocked(auth);
    mockAuth.mockResolvedValue(mockUser);

    const { prisma } = await import('@/lib/prisma');
    const mockPrisma = vi.mocked(prisma);

    // Mock para update regular (sem notificationId)
    mockPrisma.healthEvent.findMany.mockResolvedValue([]); // Sem sobreposições
    mockPrisma.files.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.healthEvent.update.mockResolvedValue({
      id: 'event-123',
      title: 'Evento Atualizado',
      date: new Date('2024-12-05T00:00:00.000Z'),
      type: 'CONSULTA',
      professionalId: 'prof-1'
    });
    mockPrisma.files.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.healthEvent.findUnique.mockResolvedValue({
      id: 'event-123',
      title: 'Evento Atualizado',
      date: new Date('2024-12-05T00:00:00.000Z'),
      type: 'CONSULTA',
      professionalId: 'prof-1',
      files: []
    });

    const requestBody = {
      id: 'event-123',
      title: 'Evento Atualizado',
      date: '2024-12-05',
      type: 'CONSULTA',
      professionalId: 'prof-1',
      startTime: '09:00',
      endTime: '10:00'
      // Sem notificationId - deve aplicar conversão de timezone
    };

    const request = new Request('http://localhost:3000/api/events', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const response = await PUT(request);
    const result = await response.json();

    // Verificar que timezone conversion foi aplicada
    expect(mockPrisma.healthEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-123', userId: 'user-123' },
      data: expect.objectContaining({
        date: expect.any(Date), // Deve ser um Date object (convertido)
        startTime: expect.any(Date),
        endTime: expect.any(Date)
      })
    });

    expect(result).toBeDefined();
  });

  it('handles missing event gracefully', async () => {
    const { auth } = await import('@/lib/auth');
    const mockAuth = vi.mocked(auth);
    mockAuth.mockResolvedValue(mockUser);

    const { prisma } = await import('@/lib/prisma');
    const mockPrisma = vi.mocked(prisma);

    // Mock transaction que falha porque evento não existe
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        healthEvent: {
          findUnique: vi.fn().mockResolvedValue(null), // Evento não encontrado
          update: vi.fn()
        },
        files: {
          deleteMany: vi.fn(),
          createMany: vi.fn()
        },
        notification: {
          update: vi.fn()
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'user-123', cpf: '12345678901' })
        }
      };
      return await callback(tx);
    });

    const requestBody = {
      id: 'non-existent-event',
      title: 'Evento Atualizado',
      date: '2024-12-05',
      type: 'CONSULTA',
      professionalId: 'prof-1',
      notificationId: 'notif-123',
      files: []
    };

    const request = new Request('http://localhost:3000/api/events', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const response = await PUT(request);
    const result = await response.json();

    expect(response.status).toBe(500); // Erro interno do servidor
    expect(result.error).toBe('Erro interno do servidor ao atualizar evento');
  });
});
