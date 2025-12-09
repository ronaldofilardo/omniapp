import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/user/[userId]/route';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock do prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Criar referência tipada para o mock
const mockPrisma = prisma as any;

describe('/api/user/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user data without password', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        cpf: '123.456.789-00',
        telefone: '(41) 99999-9999',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await GET(
        new Request('http://localhost:3000/api/user/user-1'),
        { params: { userId: 'user-1' } }
      );
      
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        cpf: '123.456.789-00',
        telefone: '(41) 99999-9999',
      });
      expect(data.password).toBeUndefined();
    });

    it('should return 404 when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost:3000/api/user/non-existent'),
        { params: { userId: 'non-existent' } }
      );
      
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Usuário não encontrado');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await GET(
        new Request('http://localhost:3000/api/user/'),
        { params: {} }
      );
      
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('userId é obrigatório');
    });

    it('should return 500 on database error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await GET(
        new Request('http://localhost:3000/api/user/user-1'),
        { params: { userId: 'user-1' } }
      );
      
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro ao buscar usuário');
    });
  });
});
