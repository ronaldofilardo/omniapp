import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '../../../../src/app/api/repository/orphan-files/route';

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    files: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock do fs e path
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn(),
  },
  join: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// Usar vi.mocked para os módulos mockados
const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('/api/repository/orphan-files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET - Buscar arquivos órfãos', () => {
    it('deve retornar arquivos órfãos com sucesso', async () => {
      const mockUser = { id: 'user-123' };
      const mockOrphanFiles = [
        {
          id: 'file-1',
          isOrphaned: true,
          health_events: { id: 'event-1' },
          professionals: { userId: 'user-123' },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.files.findMany as any).mockResolvedValue(mockOrphanFiles);

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockOrphanFiles);
    });

    it('deve usar userId do parâmetro de query', async () => {
      const mockOrphanFiles = [];
      (prisma.files.findMany as any).mockResolvedValue(mockOrphanFiles);

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files?userId=custom-user');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.files.findMany).toHaveBeenCalledWith({
        where: {
          isOrphaned: true,
          professionals: {
            userId: 'custom-user',
          },
        },
        include: {
          health_events: true,
          professionals: true,
        },
      });
    });

    it('deve retornar erro 500 quando usuário padrão não encontrado', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Usuário padrão não encontrado.');
    });

    it('deve retornar erro 500 em caso de erro no banco', async () => {
      (prisma.user.findUnique as any).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database error');
    });
  });

  describe('DELETE - Deletar arquivo órfão', () => {
    it('deve deletar arquivo órfão com sucesso', async () => {
      const mockUser = { id: 'user-123' };
      const mockFile = {
        id: 'file-1',
        url: 'http://localhost:3000/uploads/test.pdf',
        professionals: {
          user: { id: 'user-123' },
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.files.findFirst as any).mockResolvedValue(mockFile);
      mockFs.existsSync.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files?fileId=file-1');
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ success: true });
      expect(prisma.files.delete).toHaveBeenCalledWith({ where: { id: 'file-1' } });
    });

    it('deve retornar erro 400 quando fileId não fornecido', async () => {
      const mockUser = { id: 'user-123' };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files');
      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('fileId é obrigatório');
    });

    it('deve retornar erro 404 quando arquivo não encontrado', async () => {
      const mockUser = { id: 'user-123' };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.files.findFirst as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files?fileId=file-1');
      const response = await DELETE(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Arquivo órfão não encontrado');
    });

    it('deve retornar erro 403 quando arquivo não pertence ao usuário', async () => {
      const mockUser = { id: 'user-123' };
      const mockFile = {
        id: 'file-1',
        professionals: {
          user: { id: 'different-user' },
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.files.findFirst as any).mockResolvedValue(mockFile);

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files?fileId=file-1');
      const response = await DELETE(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Não autorizado a deletar este arquivo');
    });

    it('deve deletar arquivo físico quando URL existe', async () => {
      const mockUser = { id: 'user-123' };
      const mockFile = {
        id: 'file-1',
        url: 'http://localhost:3000/uploads/test.pdf',
        professionals: {
          user: { id: 'user-123' },
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.files.findFirst as any).mockResolvedValue(mockFile);
      mockFs.existsSync.mockReturnValue(true);
      mockPath.join.mockImplementation((...args: string[]) => {
        // Simular o comportamento real: path.join(process.cwd(), 'public/uploads/test.pdf')
        if (args[1] === 'public/uploads/test.pdf') {
          return '/app/public/uploads/test.pdf';
        }
        return args.join('/');
      });

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files?fileId=file-1');
      await DELETE(request);

      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/app/public/uploads/test.pdf');
    });

    it('deve continuar sem arquivo físico quando deleção falha', async () => {
      const mockUser = { id: 'user-123' };
      const mockFile = {
        id: 'file-1',
        url: 'http://localhost:3000/uploads/test.pdf',
        professionals: {
          user: { id: 'user-123' },
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.files.findFirst as any).mockResolvedValue(mockFile);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files?fileId=file-1');
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(prisma.files.delete).toHaveBeenCalledWith({ where: { id: 'file-1' } });
    });

    it('deve retornar erro 500 em caso de erro no banco', async () => {
      const mockUser = { id: 'user-123' };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.files.findFirst as any).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/repository/orphan-files?fileId=file-1');
      const response = await DELETE(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database error');
    });
  });
});
