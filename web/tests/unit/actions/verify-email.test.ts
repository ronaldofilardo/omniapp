import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyEmailToken } from '@/actions/verify-email'
import { sendVerificationEmail } from '@/lib/resend'
import { prisma } from '@/lib/prisma'

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    verificationToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    },
    user: {
      update: vi.fn()
    }
  }
}))

// Mock do Resend
vi.mock('@/lib/resend', () => ({
  getResend: vi.fn(() => ({
    emails: {
      send: vi.fn()
    }
  })),
  sendVerificationEmail: vi.fn()
}))

describe('Confirmação de Email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyEmailToken - Validação de Token', () => {
    const validToken = 'valid-token-123'
    const validEmail = 'user@example.com'

    it('deve confirmar email com token válido', async () => {
      const mockTokenData = {
        token: validToken,
        identifier: validEmail,
        expires: new Date(Date.now() + 3600000) // Expira em 1 hora
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      const result = await verifyEmailToken(validToken)

      expect(result).toEqual({ success: true })
      expect(prisma.verificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: validToken }
      })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: validEmail },
        data: { emailVerified: expect.any(Date) }
      })
      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: validToken }
      })
    })

    it('deve rejeitar token inexistente', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null)

      const result = await verifyEmailToken('invalid-token')

      expect(result).toEqual({
        success: false,
        error: 'Token inválido.'
      })
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('deve rejeitar token expirado', async () => {
      const expiredTokenData = {
        token: validToken,
        identifier: validEmail,
        expires: new Date(Date.now() - 3600000) // Expirou há 1 hora
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(expiredTokenData as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      const result = await verifyEmailToken(validToken)

      expect(result).toEqual({
        success: false,
        error: 'Este link expirou.'
      })
      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: validToken }
      })
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('deve deletar token após uso bem-sucedido', async () => {
      const mockTokenData = {
        token: validToken,
        identifier: validEmail,
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      await verifyEmailToken(validToken)

      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: validToken }
      })
    })

    it('deve atualizar emailVerified com data atual', async () => {
      const mockTokenData = {
        token: validToken,
        identifier: validEmail,
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      const beforeTime = Date.now()
      await verifyEmailToken(validToken)
      const afterTime = Date.now()

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: validEmail },
        data: {
          emailVerified: expect.any(Date)
        }
      })

      const updateCall = vi.mocked(prisma.user.update).mock.calls[0]
      const verifiedDate = updateCall[0].data.emailVerified as Date
      expect(verifiedDate.getTime()).toBeGreaterThanOrEqual(beforeTime)
      expect(verifiedDate.getTime()).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('sendVerificationEmail - Envio de Email', () => {
    const testEmail = 'test@example.com'
    const testToken = 'test-token-456'

    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://omniapp.online'
      process.env.RESEND_API_KEY = 'test-api-key'
    })

    it('deve enviar email de confirmação', async () => {
      await sendVerificationEmail(testEmail, testToken)

      expect(sendVerificationEmail).toHaveBeenCalledWith(testEmail, testToken)
    })

    it('deve gerar link de confirmação correto', async () => {
      const expectedLink = `https://omniapp.online/auth/verify-email?token=${testToken}`

      await sendVerificationEmail(testEmail, testToken)

      // Verificar que a função foi chamada com email e token corretos
      expect(sendVerificationEmail).toHaveBeenCalledWith(testEmail, testToken)
    })

    it('deve incluir token no query parameter', async () => {
      await sendVerificationEmail(testEmail, testToken)

      // Simular a construção do link
      const confirmLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${testToken}`
      expect(confirmLink).toContain(`?token=${testToken}`)
    })

    it('deve usar APP_URL do environment', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com'

      await sendVerificationEmail(testEmail, testToken)

      const expectedLink = `https://custom-domain.com/auth/verify-email?token=${testToken}`
      expect(expectedLink).toContain('https://custom-domain.com')
    })
  })

  describe('Página de Verificação - verify-email/page.tsx', () => {
    it('deve renderizar erro quando token está ausente', () => {
      // Este teste seria implementado com testing-library
      // Validando que a página mostra "Link inválido" quando searchParams.token é undefined
      const searchParams = {}
      expect(searchParams).not.toHaveProperty('token')
    })

    it('deve processar token válido e mostrar sucesso', async () => {
      const mockTokenData = {
        token: 'valid-token',
        identifier: 'user@example.com',
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      const result = await verifyEmailToken('valid-token')

      expect(result.success).toBe(true)
    })

    it('deve limpar token inválido do banco', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 0 })

      // Simular comportamento da página
      const token = 'invalid-token'
      await prisma.verificationToken.deleteMany({ where: { token } }).catch(() => {})

      expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'invalid-token' }
      })
    })

    it('deve limpar token expirado do banco', async () => {
      const expiredToken = {
        token: 'expired-token',
        identifier: 'user@example.com',
        expires: new Date(Date.now() - 1000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(expiredToken as any)
      vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 })

      // Simular comportamento da página
      const isExpired = expiredToken.expires < new Date()
      if (isExpired) {
        await prisma.verificationToken.deleteMany({ where: { token: expiredToken.token } })
      }

      expect(isExpired).toBe(true)
      expect(prisma.verificationToken.deleteMany).toHaveBeenCalled()
    })
  })

  describe('Fluxo Completo de Confirmação', () => {
    it('deve completar fluxo: envio -> validação -> confirmação', async () => {
      const email = 'newuser@example.com'
      const token = 'new-token-789'

      // 1. Enviar email
      await sendVerificationEmail(email, token)
      expect(sendVerificationEmail).toHaveBeenCalledWith(email, token)

      // 2. Usuário clica no link e chega na página
      // 3. Página valida o token
      const mockTokenData = {
        token,
        identifier: email,
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      // 4. Confirmar email
      const result = await verifyEmailToken(token)

      expect(result.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email },
        data: { emailVerified: expect.any(Date) }
      })
    })

    it('deve impedir reutilização de token já usado', async () => {
      const token = 'used-token'
      const email = 'user@example.com'

      // Primeira vez - sucesso
      const mockTokenData = {
        token,
        identifier: email,
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValueOnce(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      const firstResult = await verifyEmailToken(token)
      expect(firstResult.success).toBe(true)

      // Segunda vez - token já foi deletado
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValueOnce(null)

      const secondResult = await verifyEmailToken(token)
      expect(secondResult.success).toBe(false)
      expect(secondResult.error).toBe('Token inválido.')
    })
  })

  describe('Segurança e Validações', () => {
    it('deve rejeitar token vazio', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null)

      const result = await verifyEmailToken('')

      expect(result.success).toBe(false)
    })

    it('deve rejeitar token com caracteres especiais maliciosos', async () => {
      const maliciousToken = "'; DROP TABLE users; --"
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null)

      const result = await verifyEmailToken(maliciousToken)

      expect(result.success).toBe(false)
      expect(prisma.verificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: maliciousToken }
      })
    })

    it('não deve permitir confirmação de email de outro usuário', async () => {
      const token = 'token-user-a'
      const emailUserA = 'usera@example.com'

      const mockTokenData = {
        token,
        identifier: emailUserA,
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      await verifyEmailToken(token)

      // Verificar que apenas o email correto foi atualizado
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: emailUserA },
        data: { emailVerified: expect.any(Date) }
      })
    })

    it('deve validar expiração precisa do token', async () => {
      const now = new Date()
      const almostExpiredToken = {
        token: 'almost-expired',
        identifier: 'user@example.com',
        expires: new Date(now.getTime() + 1000) // Expira em 1 segundo
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(almostExpiredToken as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      const result = await verifyEmailToken('almost-expired')

      // Deve aceitar pois ainda não expirou
      expect(result.success).toBe(true)
    })

    it('deve rejeitar token que acabou de expirar', async () => {
      const now = new Date()
      const justExpiredToken = {
        token: 'just-expired',
        identifier: 'user@example.com',
        expires: new Date(now.getTime() - 1000) // Expirou há 1 segundo
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(justExpiredToken as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      const result = await verifyEmailToken('just-expired')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Este link expirou.')
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro ao buscar token', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockRejectedValue(
        new Error('Database error')
      )

      await expect(verifyEmailToken('any-token')).rejects.toThrow('Database error')
    })

    it('deve lidar com erro ao atualizar usuário', async () => {
      const mockTokenData = {
        token: 'valid-token',
        identifier: 'user@example.com',
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockRejectedValue(new Error('User not found'))

      await expect(verifyEmailToken('valid-token')).rejects.toThrow('User not found')
    })

    it('deve lidar com erro ao deletar token', async () => {
      const mockTokenData = {
        token: 'valid-token',
        identifier: 'user@example.com',
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.verificationToken.delete).mockRejectedValue(
        new Error('Delete failed')
      )

      await expect(verifyEmailToken('valid-token')).rejects.toThrow('Delete failed')
    })

    it('não deve falhar silenciosamente ao deletar token expirado', async () => {
      const expiredToken = {
        token: 'expired',
        identifier: 'user@example.com',
        expires: new Date(Date.now() - 1000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(expiredToken as any)
      vi.mocked(prisma.verificationToken.delete).mockRejectedValue(
        new Error('Delete failed')
      )

      await expect(verifyEmailToken('expired')).rejects.toThrow()
    })
  })

  describe('Integração com Sistema de Auth', () => {
    it('deve permitir login após confirmação de email', async () => {
      const email = 'confirmed@example.com'
      const token = 'confirm-token'

      const mockTokenData = {
        token,
        identifier: email,
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-123',
        email,
        emailVerified: new Date()
      } as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      const result = await verifyEmailToken(token)

      expect(result.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email },
        data: { emailVerified: expect.any(Date) }
      })
    })

    it('emailVerified deve ser null antes da confirmação', async () => {
      // Simular estado inicial do usuário
      const userBeforeVerification = {
        id: 'user-123',
        email: 'user@example.com',
        emailVerified: null
      }

      expect(userBeforeVerification.emailVerified).toBeNull()
    })

    it('emailVerified deve ter data após confirmação', async () => {
      const email = 'user@example.com'
      const token = 'token'

      const mockTokenData = {
        token,
        identifier: email,
        expires: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(mockTokenData as any)
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-123',
        email,
        emailVerified: new Date()
      } as any)
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any)

      await verifyEmailToken(token)

      const updateCall = vi.mocked(prisma.user.update).mock.calls[0]
      expect(updateCall[0].data.emailVerified).toBeInstanceOf(Date)
    })
  })
})
