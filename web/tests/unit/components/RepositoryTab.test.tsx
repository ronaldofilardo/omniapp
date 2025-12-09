import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryTab } from '@/components/RepositoryTab'

// Mock globalCache
vi.mock('../../../src/lib/globalCache', () => ({
  globalCache: {
    fetchWithDeduplication: vi.fn()
  }
}))

describe('RepositoryTab - Simplified Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    global.alert = vi.fn()
  })

  it('renders repository tab with title and current date', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepositoryTab userId="user-1" />)

    expect(screen.getByText('Repositório de Arquivos')).toBeInTheDocument()
    // Date will be current date, so we just check it exists
    expect(screen.getByText(/^\d{2}\/\d{2}\/\d{4} - /)).toBeInTheDocument()
  })

  it('shows loading state initially and then shows empty state', async () => {
    const { globalCache } = await import('../../../src/lib/globalCache')
    
    // Mock do cache para retornar array vazio
    globalCache.fetchWithDeduplication = vi.fn().mockResolvedValue([])

    render(<RepositoryTab userId="user-1" />)

    // Aguardar que não esteja mais carregando
    await waitFor(() => {
      expect(screen.queryByText('Carregando repositório...')).not.toBeInTheDocument()
    })

    // Deve mostrar mensagem de vazio
    expect(screen.getByText('Nenhum arquivo encontrado no seu repositório.')).toBeInTheDocument()
    
    // Verificar que o cache foi usado
    expect(globalCache.fetchWithDeduplication).toHaveBeenCalledWith(
      'repository_user-1',
      expect.any(Function),
      expect.objectContaining({
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000
      })
    )
  })

  it('renders basic structure correctly', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepositoryTab userId="user-1" />)

    // Verificar elementos básicos da interface
    expect(screen.getByPlaceholderText('Buscar por evento, profissional ou arquivo...')).toBeInTheDocument()
    expect(screen.getByText('Total: 0 documento(s) ()')).toBeInTheDocument()
  })

  it('handles fetch errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

    render(<RepositoryTab userId="user-1" />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando repositório...')).not.toBeInTheDocument()
    })

    // Deve mostrar mensagem de vazio mesmo com erro
    expect(screen.getByText('Nenhum arquivo encontrado no seu repositório.')).toBeInTheDocument()
  })

  it('makes correct API calls on mount', async () => {
    const { globalCache } = await import('../../../src/lib/globalCache')
    
    // Mock do cache para capturar a função de fetch
    let capturedFetchFn: any
    globalCache.fetchWithDeduplication = vi.fn().mockImplementation((key, fetchFn) => {
      capturedFetchFn = fetchFn
      return Promise.resolve([])
    })

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepositoryTab userId="user-123" />)

    await waitFor(() => {
      expect(globalCache.fetchWithDeduplication).toHaveBeenCalledWith(
        'repository_user-123',
        expect.any(Function),
        expect.any(Object)
      )
    })

    // Verificar que a função interna faria a chamada correta
    if (capturedFetchFn) {
      await capturedFetchFn()
      expect(global.fetch).toHaveBeenCalledWith('/api/repository/orphan-files?userId=user-123')
    }
  })
})

