import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, config } from '../../../web/middleware';

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exportações básicas', () => {
    it('deve exportar função middleware', () => {
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('deve exportar config com matcher', () => {
      expect(config).toBeDefined();
      expect(config.matcher).toBe('/');
    });
  });

  describe('Bloqueio de rotas /share/', () => {
    it('deve bloquear acesso a /share/ com 404', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/share/test'));
      const response = await middleware(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: 'Not found' });
    });

    it('deve bloquear acesso a /share/subpath com 404', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/share/subfolder/file'));
      const response = await middleware(request);

      expect(response.status).toBe(404);
    });

    it('deve bloquear acesso a /share/arquivo.pdf', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/share/arquivo.pdf'));
      const response = await middleware(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: 'Not found' });
    });
  });

  describe('Bypass de rotas de arquivos', () => {
    it('deve permitir acesso a /api/files/download', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/files/download/123'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /api/upload', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/upload'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /uploads/', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/uploads/file.pdf'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /uploads/subpasta/arquivo.pdf', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/uploads/subpasta/arquivo.pdf'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /api/laudos/upload', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/laudos/upload'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /api/upload-file', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/upload-file'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Outras rotas', () => {
    it('deve permitir acesso a rotas normais', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a API routes normais', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/users'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a home', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a páginas de autenticação', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/login'));
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });
  });
});
