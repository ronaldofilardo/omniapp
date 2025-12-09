import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/repository/orphan-files/route';
import { mockPrisma, setupOrphanFilesMocks } from '../../utils/test-utils';

// Mock de autenticação
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ id: 'user-1', role: 'RECEPTOR' }),
}))

// Mock de fs e path
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  unlinkSync: vi.fn()
}))

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/'))
}))

// Os mocks já são aplicados globalmente, não é necessário mock individual

describe('API Repository - Arquivos Órfãos', () => {
  beforeEach(() => {
    // Usar setup específico do arquivo de utilitários
    setupOrphanFilesMocks();
  });

  describe('GET /api/repository/orphan-files', () => {
    it('deve retornar lista de arquivos órfãos para o usuário', async () => {
      const url = `http://localhost:3000/api/repository/orphan-files?userId=user-1`;
      const request = new NextRequest(url, { method: 'GET' });
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].isOrphaned).toBe(true);
    });

    it('deve usar usuário padrão quando userId não fornecido', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'default-user' });

      const url = `http://localhost:3000/api/repository/orphan-files`;
      const request = new NextRequest(url, { method: 'GET' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@email.com' }
      });
    });

    it('deve retornar erro 500 em caso de falha', async () => {
      mockPrisma.files.findMany.mockRejectedValueOnce(new Error('Database error'));

      const url = `http://localhost:3000/api/repository/orphan-files?userId=user-1`;
      const request = new NextRequest(url, { method: 'GET' });
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Database error');
    });
  });

  describe('DELETE /api/repository/orphan-files', () => {
    it('deve deletar arquivo órfão com sucesso', async () => {
      const mockFile = {
        id: 'file-1',
        url: '/api/files/file-1/download',
        professionals: {
          user: { id: 'user-1' }
        }
      };

      mockPrisma.files.findFirst.mockResolvedValueOnce(mockFile);
      mockPrisma.files.delete.mockResolvedValueOnce({});

      const url = `http://localhost:3000/api/repository/orphan-files?fileId=file-1&userId=user-1`;
      const request = new NextRequest(url, { method: 'DELETE' });
      const response = await DELETE(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockPrisma.files.delete).toHaveBeenCalledWith({ where: { id: 'file-1' } });
    });

    it('deve retornar erro quando fileId não fornecido', async () => {
      const url = `http://localhost:3000/api/repository/orphan-files?userId=user-1`;
      const request = new NextRequest(url, { method: 'DELETE' });
      const response = await DELETE(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('fileId é obrigatório');
    });

    it('deve retornar erro quando arquivo não encontrado', async () => {
      mockPrisma.files.findFirst.mockResolvedValueOnce(null);

      const url = `http://localhost:3000/api/repository/orphan-files?fileId=file-1&userId=user-1`;
      const request = new NextRequest(url, { method: 'DELETE' });
      const response = await DELETE(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe('Arquivo órfão não encontrado');
    });

    it('deve retornar erro quando usuário não autorizado', async () => {
      const mockFile = {
        id: 'file-1',
        professionals: {
          user: { id: 'other-user' }
        }
      };

      mockPrisma.files.findFirst.mockResolvedValueOnce(mockFile);

      const url = `http://localhost:3000/api/repository/orphan-files?fileId=file-1&userId=user-1`;
      const request = new NextRequest(url, { method: 'DELETE' });
      const response = await DELETE(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe('Não autorizado a deletar este arquivo');
    });

    it('deve lidar com erro ao deletar arquivo físico', async () => {
      const mockFile = {
        id: 'file-1',
        url: 'invalid-url',
        professionals: {
          user: { id: 'user-1' }
        }
      };

      mockPrisma.files.findFirst.mockResolvedValueOnce(mockFile);
      mockPrisma.files.delete.mockResolvedValueOnce({});

      const url = `http://localhost:3000/api/repository/orphan-files?fileId=file-1&userId=user-1`;
      const request = new NextRequest(url, { method: 'DELETE' });
      const response = await DELETE(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      // Mesmo com erro no arquivo físico, deve continuar e deletar do banco
    });
  });
});
