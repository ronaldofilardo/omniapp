import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { LoadingState, ErrorState } from '@/components/ui/loading-states'

describe('LoadingState', () => {
  it('renders default loading state', () => {
    render(<LoadingState />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renders skeleton loading state', () => {
    render(<LoadingState type="skeleton" />)
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveClass('animate-pulse', 'bg-muted', 'rounded')
  })

  it('renders spinner loading state', () => {
    render(<LoadingState type="spinner" />)
    const spinner = screen.getByTestId('spinner-loader')
    expect(spinner).toHaveClass('flex', 'items-center', 'justify-center', 'p-4')
    // The Loader2 icon should be present
    const loaderIcon = spinner.querySelector('svg')
    expect(loaderIcon).toBeInTheDocument()
    expect(loaderIcon).toHaveClass('animate-spin')
  })

  it('applies custom className', () => {
    render(<LoadingState className="custom-class" />)
    const element = screen.getByText('Carregando...')
    expect(element).toHaveClass('custom-class')
  })
})

describe('ErrorState', () => {
  it('renders error message for string error', () => {
    render(<ErrorState error="Erro de teste" userFriendly={false} />)
    expect(screen.getByText('Erro de teste')).toBeInTheDocument()
  })

  it('renders error message for Error object', () => {
    const error = new Error('Erro técnico')
    render(<ErrorState error={error} userFriendly={false} />)
    expect(screen.getByText('Error: Erro técnico')).toBeInTheDocument()
  })

  it('renders user-friendly message when userFriendly is true', () => {
    render(<ErrorState error="Network error" userFriendly={true} />)
    expect(screen.getByText('Erro de conexão. Verifique sua internet.')).toBeInTheDocument()
  })

  it('renders technical message when userFriendly is false', () => {
    render(<ErrorState error="Network error" userFriendly={false} />)
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('renders retry button when retry function is provided', () => {
    const mockRetry = vi.fn()
    render(<ErrorState error="Erro" retry={mockRetry} />)
    const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
    expect(retryButton).toBeInTheDocument()
    fireEvent.click(retryButton)
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button when retry function is not provided', () => {
    render(<ErrorState error="Erro" />)
    const retryButton = screen.queryByRole('button', { name: /tentar novamente/i })
    expect(retryButton).not.toBeInTheDocument()
  })

  it('renders AlertCircle icon', () => {
    render(<ErrorState error="Erro" />)
    const container = screen.getByTestId('error-state')
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('text-destructive')
  })

  it('applies custom className', () => {
    render(<ErrorState error="Erro" className="custom-error" />)
    const container = screen.getByTestId('error-state')
    expect(container).toHaveClass('custom-error')
  })

  describe('getUserFriendlyMessage', () => {
    // Since getUserFriendlyMessage is not exported, we test it through ErrorState
    it('maps "Network error" to user-friendly message', () => {
      render(<ErrorState error="Network error" userFriendly={true} />)
      expect(screen.getByText('Erro de conexão. Verifique sua internet.')).toBeInTheDocument()
    })

    it('maps "Unauthorized" to user-friendly message', () => {
      render(<ErrorState error="Unauthorized" userFriendly={true} />)
      expect(screen.getByText('Sessão expirada. Faça login novamente.')).toBeInTheDocument()
    })

    it('maps "Not found" to user-friendly message', () => {
      render(<ErrorState error="Not found" userFriendly={true} />)
      expect(screen.getByText('Recurso não encontrado.')).toBeInTheDocument()
    })

    it('returns generic message for unmapped errors', () => {
      render(<ErrorState error="Unknown error occurred" userFriendly={true} />)
      expect(screen.getByText('Ocorreu um erro inesperado. Tente novamente.')).toBeInTheDocument()
    })

    it('handles case-insensitive mapping', () => {
      render(<ErrorState error="network error" userFriendly={true} />)
      expect(screen.getByText('Erro de conexão. Verifique sua internet.')).toBeInTheDocument()
    })
  })
})
