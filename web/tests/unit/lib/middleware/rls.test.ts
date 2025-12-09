import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { withRLS, setRLSContext, clearRLSContext } from '@/lib/middleware/rls'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Mock de dependências
vi.mock('@/lib/auth')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRawUnsafe: vi.fn()
  }
}))

describe('RLS Middleware - Correção de Eventos Desaparecendo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setRLSContext - Configuração de Contexto', () => {
    it('deve configurar contexto RLS corretamente para usuário RECEPTOR', async () => {
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await setRLSContext('user-123', 'RECEPTOR', false)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('user-123', 'RECEPTOR', false)")
      )
    })

    it('deve configurar contexto RLS corretamente para usuário EMISSOR', async () => {
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await setRLSContext('emissor-456', 'EMISSOR', false)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('emissor-456', 'EMISSOR', false)")
      )
    })

    it('deve configurar contexto do sistema com isSystem=true', async () => {
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await setRLSContext('system', 'EMISSOR', true)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('system', 'EMISSOR', true)")
      )
    })

    it('deve sanitizar userId para prevenir SQL injection', async () => {
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await setRLSContext("user'; DROP TABLE events; --", 'RECEPTOR', false)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("user''; DROP TABLE events; --")
      )
    })

    it('deve sanitizar role para prevenir SQL injection', async () => {
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await setRLSContext('user-123', "RECEPTOR'; DROP TABLE users; --", false)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("RECEPTOR''; DROP TABLE users; --")
      )
    })

    it('deve usar fallback quando set_rls_context falhar', async () => {
      // Primeira chamada falha, próximas três são fallback
      vi.mocked(prisma.$executeRawUnsafe)
        .mockRejectedValueOnce(new Error('Function not found'))
        .mockResolvedValueOnce(undefined) // SET LOCAL app.user_id
        .mockResolvedValueOnce(undefined) // SET LOCAL app.role
        .mockResolvedValueOnce(undefined) // SET LOCAL app.system

      await setRLSContext('user-123', 'RECEPTOR', false)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(4)
      expect(prisma.$executeRawUnsafe).toHaveBeenNthCalledWith(
        2,
        "SET LOCAL app.user_id = 'user-123'"
      )
      expect(prisma.$executeRawUnsafe).toHaveBeenNthCalledWith(
        3,
        "SET LOCAL app.role = 'RECEPTOR'"
      )
      expect(prisma.$executeRawUnsafe).toHaveBeenNthCalledWith(
        4,
        "SET LOCAL app.system = 'false'"
      )
    })

    it('deve lançar erro quando fallback também falhar', async () => {
      vi.mocked(prisma.$executeRawUnsafe).mockRejectedValue(new Error('Database error'))

      await expect(setRLSContext('user-123', 'RECEPTOR', false))
        .rejects.toThrow('Falha ao configurar contexto de segurança')
    })

    it('deve logar erro ao falhar na configuração', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      vi.mocked(prisma.$executeRawUnsafe).mockRejectedValue(new Error('Test error'))

      await expect(setRLSContext('user-123', 'RECEPTOR', false)).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RLS] ❌ Erro ao configurar contexto:'),
        expect.any(Error)
      )
    })
  })

  describe('clearRLSContext - Limpeza de Contexto', () => {
    it('deve limpar contexto RLS', async () => {
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await clearRLSContext()

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'SELECT clear_rls_context()'
      )
    })

    it('não deve lançar erro ao falhar na limpeza', async () => {
      vi.mocked(prisma.$executeRawUnsafe).mockRejectedValue(new Error('Clear failed'))

      await expect(clearRLSContext()).resolves.not.toThrow()
    })

    it('deve logar erro ao falhar na limpeza', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      vi.mocked(prisma.$executeRawUnsafe).mockRejectedValue(new Error('Clear failed'))

      await clearRLSContext()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RLS] Erro ao limpar contexto:'),
        expect.any(Error)
      )
    })
  })

  describe('withRLS - Middleware Wrapper', () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/events')
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }))

    it('deve configurar RLS para usuário autenticado', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await withRLS(mockRequest, mockHandler)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('user-123', 'RECEPTOR', false)")
      )
      expect(mockHandler).toHaveBeenCalledWith(mockRequest)
    })

    it('deve executar handler após configurar contexto', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      const result = await withRLS(mockRequest, mockHandler)

      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(NextResponse)
    })

    it('deve limpar contexto após executar handler', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await withRLS(mockRequest, mockHandler)

      // Última chamada deve ser clear_rls_context
      const calls = vi.mocked(prisma.$executeRawUnsafe).mock.calls
      expect(calls[calls.length - 1][0]).toBe('SELECT clear_rls_context()')
    })

    it('deve retornar 401 para usuário não autenticado', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const result = await withRLS(mockRequest, mockHandler)

      expect(result.status).toBe(401)
      expect(mockHandler).not.toHaveBeenCalled()
      
      const body = await result.json()
      expect(body).toEqual({ error: 'Autenticação necessária' })
    })

    it('deve permitir operação do sistema com isSystem=true', async () => {
      vi.mocked(auth).mockResolvedValue(null)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await withRLS(mockRequest, mockHandler, { isSystem: true })

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('system', 'EMISSOR', true)")
      )
      expect(mockHandler).toHaveBeenCalled()
    })

    it('deve propagar erros do handler', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)
      mockHandler.mockRejectedValue(new Error('Handler error'))

      await expect(withRLS(mockRequest, mockHandler)).rejects.toThrow('Handler error')
    })

    it('deve limpar contexto mesmo quando handler falhar', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)
      mockHandler.mockRejectedValue(new Error('Handler error'))

      try {
        await withRLS(mockRequest, mockHandler)
      } catch {
        // Esperado
      }

      // Verificar que clear foi chamado
      const calls = vi.mocked(prisma.$executeRawUnsafe).mock.calls
      expect(calls[calls.length - 1][0]).toBe('SELECT clear_rls_context()')
    })

    it('deve configurar contexto para ADMIN', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'admin-123', role: 'ADMIN' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await withRLS(mockRequest, mockHandler)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('admin-123', 'ADMIN', false)")
      )
    })
  })

  describe('Cenários de Eventos Desaparecendo', () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/events')
    const mockHandler = vi.fn(async () => NextResponse.json({ events: [] }))

    it('deve manter eventos visíveis após upload de arquivo', async () => {
      // Simular usuário fazendo upload
      vi.mocked(auth).mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      // Primeira requisição: listar eventos
      await withRLS(mockRequest, mockHandler)
      expect(mockHandler).toHaveBeenCalledTimes(1)

      // Segunda requisição: upload de arquivo
      await withRLS(mockRequest, mockHandler)
      expect(mockHandler).toHaveBeenCalledTimes(2)

      // Terceira requisição: listar eventos novamente
      await withRLS(mockRequest, mockHandler)
      expect(mockHandler).toHaveBeenCalledTimes(3)

      // Contexto deve ser configurado corretamente em todas as requisições
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('user-123', 'RECEPTOR', false)")
      )
    })

    it('não deve permitir acesso a eventos de outro usuário', async () => {
      // Usuário 1
      vi.mocked(auth).mockResolvedValue({ id: 'user-1', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await withRLS(mockRequest, mockHandler)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('user-1', 'RECEPTOR', false)")
      )

      vi.clearAllMocks()

      // Usuário 2
      vi.mocked(auth).mockResolvedValue({ id: 'user-2', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await withRLS(mockRequest, mockHandler)

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("SELECT set_rls_context('user-2', 'RECEPTOR', false)")
      )
    })

    it('deve manter contexto consistente durante múltiplas operações', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'user-123', role: 'RECEPTOR' } as any)
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      // Simular múltiplas operações sequenciais
      const operations = [
        'GET /api/events',
        'POST /api/events',
        'PUT /api/events/123',
        'GET /api/events'
      ]

      for (const op of operations) {
        await withRLS(mockRequest, mockHandler)
      }

      // Todas devem ter configurado o mesmo contexto
      const setCalls = vi.mocked(prisma.$executeRawUnsafe).mock.calls
        .filter(call => call[0].includes('set_rls_context'))

      expect(setCalls).toHaveLength(4)
      setCalls.forEach(call => {
        expect(call[0]).toContain("'user-123', 'RECEPTOR'")
      })
    })
  })

  describe('Logging e Debugging', () => {
    it('deve logar configuração de contexto', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log')
      vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined)

      await setRLSContext('user-123', 'RECEPTOR', false)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RLS] Contexto configurado: userId=user-123, role=RECEPTOR, isSystem=false')
      )
    })

    it('deve logar tentativa de fallback', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      vi.mocked(prisma.$executeRawUnsafe)
        .mockRejectedValueOnce(new Error('Function not found'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)

      await setRLSContext('user-123', 'RECEPTOR', false)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RLS] Tentando configuração de fallback...')
      )
    })

    it('deve logar sucesso do fallback', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log')
      vi.mocked(prisma.$executeRawUnsafe)
        .mockRejectedValueOnce(new Error('Function not found'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)

      await setRLSContext('user-123', 'RECEPTOR', false)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RLS] ✅ Fallback bem-sucedido')
      )
    })
  })
})
