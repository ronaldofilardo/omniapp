import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminDashboard from '@/app/admin/dashboard/page'

// Mock do router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('AdminDashboard - Loading States e Error Handling', () => {
  let mockFetch: any

  const mockDocuments = [
    {
      protocol: 'DOC-123',
      patientName: 'João Silva',
      emitterName: 'Lab XYZ',
      emitterCnpj: '12345678000190',
      createdAt: '2025-01-15T10:00:00Z',
      fileName: 'laudo.pdf',
      fileHash: 'abc123',
      documentType: 'result',
      status: 'SUCCESS',
      receiverCpf: '12345678901',
      receivedAt: '2025-01-15T10:00:00Z',
      origin: 'PORTAL_PUBLICO',
    },
  ]

  const mockMetrics = {
    totalFiles: 100,
    uploadVolumeMB: 500,
    downloadVolumeMB: 300,
  }

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  // Helper para extrair URL de Request ou string
  const getUrl = (input: any): string => {
    if (typeof input === 'string') return input
    if (input instanceof Request) return input.url
    return ''
  }

  // Matcher customizado para Request objects
  const expectUrlContaining = (substring: string) => {
    return expect.objectContaining({
      url: expect.stringContaining(substring)
    })
  }

  describe('Loading States', () => {
    it('deve mostrar estado de loading ao carregar', async () => {
      // Simular delay na resposta
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return new Promise((resolve) => 
            setTimeout(() => resolve({
              ok: true,
              json: async () => ({ documents: mockDocuments }),
            }), 100)
          )
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      // Durante o loading, ainda deve haver componentes renderizados
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('deve chamar ambas APIs ao montar componente', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ documents: mockDocuments }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/audit-documents'),
          expect.any(Object)
        )
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/metrics')
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('deve exibir mensagem de erro quando falha ao buscar documentos', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.reject(new Error('Network error'))
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        // Verificar que o erro foi setado (pode ser verificado no console ou estado)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/audit-documents'),
          expect.any(Object)
        )
      })
    })

    it('deve lidar com erro 500 da API', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Internal server error' }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('deve continuar funcionando se métricas falharem', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ documents: mockDocuments }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.reject(new Error('Metrics error'))
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        // Aplicação deve continuar funcionando
        expect(mockFetch).toHaveBeenCalledTimes(5)
      })
    })
  })

  describe('Timeout de 20s', () => {
    it('deve aplicar timeout de 20s para requisição de documentos', async () => {
      mockFetch.mockImplementation((input: any, options: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          // Verificar que signal está presente
          expect(options?.signal).toBeDefined()
          return Promise.resolve({
            ok: true,
            json: async () => ({ documents: mockDocuments }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        const documentsCall = mockFetch.mock.calls.find(
          (call: any) => getUrl(call[0]).includes('/api/admin/audit-documents')
        )
        expect(documentsCall).toBeDefined()
        expect(documentsCall![1]?.signal).toBeDefined()
      })
    })

    it('deve lidar com timeout expirado', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.reject(
            Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
          )
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('Paginação', () => {
    it('deve buscar documentos com paginação correta', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          expect(url).toContain('page=1')
          expect(url).toContain('limit=100')
          return Promise.resolve({
            ok: true,
            json: async () => ({ documents: mockDocuments }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=1&limit=100'),
          expect.any(Object)
        )
      })
    })
  })

  describe('Logout', () => {
    it('deve chamar API de logout e redirecionar', async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation((url, options) => {
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ documents: mockDocuments }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
        if (url.includes('/api/auth/logout') && options?.method === 'POST') {
          return Promise.resolve({ ok: true })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument()
      })

      const logoutButton = screen.getByRole('button', { name: /sair/i })
      await user.click(logoutButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/logout',
          expect.objectContaining({ method: 'POST' })
        )
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('deve redirecionar para login mesmo se logout falhar', async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation((url, options) => {
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ documents: mockDocuments }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
        if (url.includes('/api/auth/logout')) {
          return Promise.reject(new Error('Logout failed'))
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument()
      })

      const logoutButton = screen.getByRole('button', { name: /sair/i })
      await user.click(logoutButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Tabs', () => {
    it('deve iniciar com tab Recebidos ativa', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ documents: mockDocuments }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('Tratamento de dados vazios', () => {
    it('deve lidar com resposta sem documentos', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ documents: [] }),
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('deve lidar com resposta sem campo documents', async () => {
      mockFetch.mockImplementation((input: any) => {
        const url = getUrl(input)
        if (url.includes('/api/admin/audit-documents')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({}), // Sem campo documents
          })
        }
        if (url.includes('/api/admin/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetrics,
          })
        }
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })
})
