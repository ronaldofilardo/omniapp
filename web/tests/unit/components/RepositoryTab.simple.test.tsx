import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryTab } from '@/components/RepositoryTab'

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
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepositoryTab userId="user-1" />)

    // Aguardar que não esteja mais carregando
    await waitFor(() => {
      expect(screen.queryByText('Carregando repositório...')).not.toBeInTheDocument()
    })

    // Deve mostrar mensagem de vazio
    expect(screen.getByText('Nenhum arquivo encontrado no seu repositório.')).toBeInTheDocument()
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
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepositoryTab userId="user-123" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/repository?userId=user-123')
    })
  })
})

