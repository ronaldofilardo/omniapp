import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth, isEmissor, isReceptor, isAdmin } from '@/lib/auth';
import { cookies } from 'next/headers';

// Mock do módulo next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth()', () => {
    it('deve retornar null quando não há cookie de sessão', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue(undefined),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const result = await auth();

      expect(result).toBeNull();
      expect(mockCookies.get).toHaveBeenCalledWith('kairos_imob_session');
    });

    it('deve retornar null quando cookie tem formato inválido', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'invalid-format' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const result = await auth();

      expect(result).toBeNull();
    });

    it('deve retornar null quando cookie não tem ID', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: ':EMISSOR' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const result = await auth();

      expect(result).toBeNull();
    });

    it('deve retornar null quando cookie não tem role', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'user123:' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const result = await auth();

      expect(result).toBeNull();
    });

    it('deve retornar usuário EMISSOR válido', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'user123:email@example.com:EMISSOR' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const result = await auth();

      expect(result).toEqual({
        id: 'user123',
        email: 'email@example.com',
        role: 'EMISSOR',
      });
    });

    it('deve retornar usuário RECEPTOR válido', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'user456:email2@example.com:RECEPTOR' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const result = await auth();

      expect(result).toEqual({
        id: 'user456',
        email: 'email2@example.com',
        role: 'RECEPTOR',
      });
    });

    it('deve retornar usuário ADMIN válido', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'admin789:admin@example.com:ADMIN' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const result = await auth();

      expect(result).toEqual({
        id: 'admin789',
        email: 'admin@example.com',
        role: 'ADMIN',
      });
    });

    it('deve lidar com IDs complexos contendo caracteres especiais', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'user-123-abc:special@email.com:EMISSOR' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const result = await auth();

      expect(result).toEqual({
        id: 'user-123-abc',
        email: 'special@email.com',
        role: 'EMISSOR',
      });
    });
  });

  describe('isEmissor()', () => {
    it('deve retornar false quando usuário é null', async () => {
      const result = await isEmissor(null);
      expect(result).toBe(false);
    });

    it('deve retornar true quando usuário é EMISSOR', async () => {
      const user = { id: '1', role: 'EMISSOR' as const };
      const result = await isEmissor(user);
      expect(result).toBe(true);
    });

    it('deve retornar false quando usuário é RECEPTOR', async () => {
      const user = { id: '1', role: 'RECEPTOR' as const };
      const result = await isEmissor(user);
      expect(result).toBe(false);
    });

    it('deve retornar false quando usuário é ADMIN', async () => {
      const user = { id: '1', role: 'ADMIN' as const };
      const result = await isEmissor(user);
      expect(result).toBe(false);
    });
  });

  describe('isReceptor()', () => {
    it('deve retornar false quando usuário é null', async () => {
      const result = await isReceptor(null);
      expect(result).toBe(false);
    });

    it('deve retornar true quando usuário é RECEPTOR', async () => {
      const user = { id: '1', role: 'RECEPTOR' as const };
      const result = await isReceptor(user);
      expect(result).toBe(true);
    });

    it('deve retornar false quando usuário é EMISSOR', async () => {
      const user = { id: '1', role: 'EMISSOR' as const };
      const result = await isReceptor(user);
      expect(result).toBe(false);
    });

    it('deve retornar false quando usuário é ADMIN', async () => {
      const user = { id: '1', role: 'ADMIN' as const };
      const result = await isReceptor(user);
      expect(result).toBe(false);
    });
  });

  describe('isAdmin()', () => {
    it('deve retornar false quando usuário é null', async () => {
      const result = await isAdmin(null);
      expect(result).toBe(false);
    });

    it('deve retornar true quando usuário é ADMIN', async () => {
      const user = { id: '1', role: 'ADMIN' as const };
      const result = await isAdmin(user);
      expect(result).toBe(true);
    });

    it('deve retornar false quando usuário é EMISSOR', async () => {
      const user = { id: '1', role: 'EMISSOR' as const };
      const result = await isAdmin(user);
      expect(result).toBe(false);
    });

    it('deve retornar false quando usuário é RECEPTOR', async () => {
      const user = { id: '1', role: 'RECEPTOR' as const };
      const result = await isAdmin(user);
      expect(result).toBe(false);
    });
  });

  describe('Integração entre auth() e funções de verificação', () => {
    it('deve verificar fluxo completo para EMISSOR', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'user123:emissor@example.com:EMISSOR' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const user = await auth();
      expect(user).not.toBeNull();
      
      expect(await isEmissor(user)).toBe(true);
      expect(await isReceptor(user)).toBe(false);
      expect(await isAdmin(user)).toBe(false);
    });

    it('deve verificar fluxo completo para RECEPTOR', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'user456:receptor@example.com:RECEPTOR' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const user = await auth();
      expect(user).not.toBeNull();
      
      expect(await isEmissor(user)).toBe(false);
      expect(await isReceptor(user)).toBe(true);
      expect(await isAdmin(user)).toBe(false);
    });

    it('deve verificar fluxo completo para ADMIN', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'admin789:admin@example.com:ADMIN' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const user = await auth();
      expect(user).not.toBeNull();
      
      expect(await isEmissor(user)).toBe(false);
      expect(await isReceptor(user)).toBe(false);
      expect(await isAdmin(user)).toBe(true);
    });

    it('deve lidar com sessão inexistente', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue(undefined),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      const user = await auth();
      expect(user).toBeNull();
      
      expect(await isEmissor(user)).toBe(false);
      expect(await isReceptor(user)).toBe(false);
      expect(await isAdmin(user)).toBe(false);
    });
  });
});

