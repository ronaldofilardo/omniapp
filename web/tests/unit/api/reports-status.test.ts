import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock do prisma - deve ser definido dentro do vi.mock para evitar hoisting issues
vi.mock('@/lib/prisma', () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      update: vi.fn(),
    },
  },
}));

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock do NextRequest e NextResponse
vi.mock('next/server', async () => {
  return {
    NextResponse: {
      json: vi.fn((data: any, init?: any) => ({
        status: init?.status || 200,
        json: async () => data,
      })),
    },
    NextRequest: class NextRequest {
      url: string;
      method: string;
      body: any;
      
      constructor(url: string, options: any = {}) {
        this.url = url;
        this.method = options.method || 'GET';
        this.body = options.body;
      }
      
      async json() {
        return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
      }
    },
  };
});

// Import da função após os mocks
import { PATCH } from '@/app/api/reports/[id]/status/route';
import { NextResponse, NextRequest } from 'next/server';

describe('/api/reports/[id]/status', () => {
  let mockPrisma: any;
  let mockAuth: any;

  beforeEach(async () => {
    // Importar os mocks após eles terem sido configurados
    const { prisma } = await import('@/lib/prisma');
    const { auth } = await import('@/lib/auth');
    
    mockPrisma = prisma;
    mockAuth = auth;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('PATCH', () => {
    it('deve atualizar status do laudo para VIEWED com sucesso', async () => {
      const mockReport = {
        id: 'report-123',
        receiverId: 'user-123',
        senderId: 'sender-123',
        notification: { id: 'notification-123' },
      };

      const mockUpdatedReport = {
        ...mockReport,
        status: 'VIEWED',
        viewedAt: new Date(),
      };

      vi.mocked(mockAuth).mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' } as any);
      vi.mocked(mockPrisma.report.findUnique).mockResolvedValue(mockReport as any);
      vi.mocked(mockPrisma.report.update).mockResolvedValue(mockUpdatedReport as any);
      vi.mocked(mockPrisma.notification.update).mockResolvedValue({ id: 'notification-123', status: 'READ' } as any);

      const request = new NextRequest('http://localhost/api/reports/report-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'VIEWED' }),
      });

      const params = Promise.resolve({ id: 'report-123' });
      const response = await PATCH(request, { params });

      expect(mockAuth).toHaveBeenCalled();
      expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        include: { notification: true },
      });
      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          status: 'VIEWED',
          viewedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notification-123' },
        data: { status: 'READ' },
      });
      expect(NextResponse.json).toHaveBeenCalledWith(mockUpdatedReport);
    });

    it('deve retornar 401 se usuário não estiver autenticado', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/reports/report-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'VIEWED' }),
      });

      const params = Promise.resolve({ id: 'report-123' });
      const response = await PATCH(request, { params });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    });

    it('deve retornar 404 se laudo não for encontrado', async () => {
      mockAuth.mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' });
      mockPrisma.report.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/reports/report-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'VIEWED' }),
      });

      const params = Promise.resolve({ id: 'report-123' });
      const response = await PATCH(request, { params });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Laudo não encontrado' },
        { status: 404 }
      );
    });

    it('deve retornar 403 se usuário não tiver acesso ao laudo', async () => {
      const mockReport = {
        id: 'report-123',
        receiverId: 'other-user',
        senderId: 'other-sender',
      };

      mockAuth.mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' });
      mockPrisma.report.findUnique.mockResolvedValue(mockReport);

      const request = new NextRequest('http://localhost/api/reports/report-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'VIEWED' }),
      });

      const params = Promise.resolve({ id: 'report-123' });
      const response = await PATCH(request, { params });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    });

    it('deve atualizar receivedAt quando status é RECEIVED', async () => {
      const mockReport = {
        id: 'report-123',
        receiverId: 'user-123',
        senderId: 'sender-123',
      };

      mockAuth.mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' });
      mockPrisma.report.findUnique.mockResolvedValue(mockReport);
      mockPrisma.report.update.mockResolvedValue({
        ...mockReport,
        status: 'RECEIVED',
        receivedAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/reports/report-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RECEIVED' }),
      });

      const params = Promise.resolve({ id: 'report-123' });
      const response = await PATCH(request, { params });

      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          status: 'RECEIVED',
          receivedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockAuth.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/reports/report-123/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'VIEWED' }),
      });

      const params = Promise.resolve({ id: 'report-123' });
      const response = await PATCH(request, { params });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Erro ao atualizar status do laudo' },
        { status: 500 }
      );
    });
  });
});
