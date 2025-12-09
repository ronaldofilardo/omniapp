import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de cookies do Next.js
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'admin-user:ADMIN' })),
    set: vi.fn()
  }))
}))

// Desabilitar mock global do auth se existir
vi.unmock('../../../src/lib/auth')

// Mock de auth ANTES de importar as rotas
vi.mock('../../../src/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock prisma
vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    healthEvent: {
      count: vi.fn()
    },
    files: {
      count: vi.fn(),
      aggregate: vi.fn()
    },
    user: {
      count: vi.fn()
    },
    professional: {
      count: vi.fn()
    },
    adminMetrics: {
      findUnique: vi.fn()
    }
  }
}))

import { GET } from '@/app/api/admin/metrics/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('/api/admin/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Sobrescrever a função auth diretamente
    vi.mocked(auth).mockResolvedValue(null)
  })

  describe('GET', () => {
    it('should return metrics for admin user', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'admin-user', role: 'ADMIN' })

      // Mock das chamadas Prisma
      vi.mocked(prisma.files.count).mockResolvedValue(25)
      vi.mocked(prisma.adminMetrics.findUnique).mockResolvedValue({
        id: 'singleton',
        totalFiles: 25, // Adicionando a propriedade que faltava
        totalUploadBytes: BigInt(50000),
        totalDownloadBytes: BigInt(10000),
        updatedAt: new Date()
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        totalFiles: 25,
        uploadVolumeMB: 50000 / (1024 * 1024),
        downloadVolumeMB: 10000 / (1024 * 1024)
      })
    })

    it('should return 403 for non-admin user', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'non-admin-user', role: 'RECEPTOR' })
      const response = await GET()
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Acesso não autorizado')
    })

    it('should return 403 for unauthenticated user', async () => {
      vi.mocked(auth).mockResolvedValue(null)
      const response = await GET()
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Acesso não autorizado')
    })

    it('should handle metrics not found', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'admin-user', role: 'ADMIN' })
      vi.mocked(prisma.files.count).mockResolvedValue(0)
      vi.mocked(prisma.adminMetrics.findUnique).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        totalFiles: 0,
        uploadVolumeMB: 0,
        downloadVolumeMB: 0
      })
    })

    it('should return 500 on database error', async () => {
      vi.mocked(auth).mockResolvedValue({ id: 'admin-user', role: 'ADMIN' } as any)
      vi.mocked(prisma.adminMetrics.findUnique).mockRejectedValue(new Error('DB Error'))

      const response = await GET()
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Erro interno do servidor')
    })
  })
})
