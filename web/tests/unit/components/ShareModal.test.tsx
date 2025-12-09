import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareModal } from '@/components/ShareModal'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

// Mock do QRCodeSVG
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qrcode" data-value={value} />
}))

// Mock do Checkbox
vi.mock('../../../src/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      role="checkbox"
    />
  )
}))


// Mock do navigator.clipboard (getter-only safe)
beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn() },
    writable: true,
    configurable: true,
  });
});

describe('ShareModal', () => {
  const mockEvent = {
    id: 'event-1',
    title: 'Consulta Médica',
    files: [
      { id: 'file-1', name: 'exame.pdf', url: 'https://example.com/exame.pdf', slot: 'result' },
      { id: 'file-2', name: 'receita.jpg', url: 'https://example.com/receita.jpg', slot: 'prescription' },
      { id: 'file-3', name: 'atestado.pdf', url: 'https://example.com/atestado.pdf', slot: 'certificate' }
    ]
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    event: mockEvent
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders file selection modal when open and not showing link', () => {
    render(<ShareModal {...defaultProps} />)

    expect(screen.getByText('Selecionar Arquivos para Compartilhar')).to.exist
    expect(screen.getByText('Selecione os arquivos do evento "Consulta Médica" que deseja compartilhar.')).to.exist
    expect(screen.getByText('exame.pdf')).to.exist
    expect(screen.getByText('receita.jpg')).to.exist
    expect(screen.getByText('atestado.pdf')).to.exist
  })

  it('displays file information correctly', () => {
    render(<ShareModal {...defaultProps} />)

    // Verificar se os tipos de arquivo são extraídos corretamente
    expect(screen.getAllByText('pdf • 0 Bytes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('jpg • 0 Bytes').length).toBeGreaterThan(0)
  })

  it('allows selecting and deselecting files', () => {
    render(<ShareModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')

    // Selecionar primeiro arquivo
    fireEvent.click(checkboxes[0])
    expect(checkboxes[0]).toBeChecked()

    // Selecionar segundo arquivo
    fireEvent.click(checkboxes[1])
    expect(checkboxes[1]).toBeChecked()

    // Desselecionar primeiro arquivo
    fireEvent.click(checkboxes[0])
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('disables generate button when no files are selected', () => {
    render(<ShareModal {...defaultProps} />)

    const generateButton = screen.getByRole('button', { name: /gerar link/i })
    expect(generateButton).toBeDisabled()
  })

  it('enables generate button when files are selected', () => {
    render(<ShareModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    const generateButton = screen.getByRole('button', { name: /gerar link/i })
    expect(generateButton).not.toBeDisabled()
  })

  it('generates share link successfully', async () => {
    const mockResponse = {
      shareLink: 'http://localhost:3000/share/abc123',
      accessCode: '123456'
    }

    ;(globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    render(<ShareModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // Selecionar exame.pdf
    fireEvent.click(checkboxes[2]) // Selecionar atestado.pdf

    const generateButton = screen.getByRole('button', { name: /gerar link/i })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/share/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'event-1',
          fileUrls: ['https://example.com/exame.pdf', 'https://example.com/atestado.pdf']
        })
      })
    })

    // Verificar se o modal de compartilhamento é exibido
    // Seleciona o elemento visível (não sr-only)
    const visibleCompartilhamento = screen.getAllByText(/compartilhamento seguro/i).find(
      el => !el.className?.includes('sr-only')
    )
    expect(visibleCompartilhamento).toBeInTheDocument()
    // Seleciona o elemento visível (não sr-only)
    const visibleUsoUnico = screen.getAllByText(/este link.*uso único/i).find(
      el => !el.className?.includes('sr-only')
    )
    expect(visibleUsoUnico).toBeInTheDocument()
  })

  it('displays share link and QR code in sharing modal', async () => {
    const mockResponse = {
      shareLink: 'http://localhost:3000/share/abc123',
      accessCode: '123456'
    }

    ;(globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    render(<ShareModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    const generateButton = screen.getByRole('button', { name: /gerar link/i })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/share/abc123')).to.exist
      expect(screen.getByText('123456')).to.exist
      expect(screen.getByTestId('qrcode')).to.exist
    })
  })

  it('copies link to clipboard when copy button is clicked', async () => {
    const mockResponse = {
      shareLink: 'http://localhost:3000/share/abc123',
      accessCode: '123456'
    }

    ;(globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    render(<ShareModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    const generateButton = screen.getByRole('button', { name: /gerar link/i })
    fireEvent.click(generateButton)

    await waitFor(() => {
      const copyButton = screen.getByTestId('copy-link-btn')
      fireEvent.click(copyButton)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/share/abc123')
    })
  })

  it('resets modal state when closed', async () => {
    const mockOnOpenChange = vi.fn()
    const mockResponse = {
      shareLink: 'http://localhost:3000/share/abc123',
      accessCode: '123456'
    }

    ;(globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    render(<ShareModal {...defaultProps} onOpenChange={mockOnOpenChange} />)

    // Selecionar arquivo e gerar link
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    const generateButton = screen.getByRole('button', { name: /gerar link/i })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getAllByText('Compartilhamento Seguro')[0]).toBeInTheDocument()
    })

    // Fechar modal de compartilhamento seguro
    const closeButton = screen.getByTestId('close-modal-btn')
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('handles API errors gracefully', async () => {
    ;(globalThis as any).fetch.mockRejectedValueOnce(new Error('Network error'))

    // Mock console.error to avoid console output during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ShareModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    const generateButton = screen.getByRole('button', { name: /gerar link/i })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao gerar link:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('shows loading state during link generation', async () => {
    let resolveFetch: (value: any) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })

    ;(globalThis as any).fetch.mockReturnValueOnce(fetchPromise)

    render(<ShareModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    const generateButton = screen.getByRole('button', { name: /gerar link/i })
    fireEvent.click(generateButton)

    // Verificar estado de loading
    expect(screen.getByText((content) => content.includes('Gerando'))).toBeInTheDocument()
    expect(generateButton).toBeDisabled()

    // Resolver a promise
    resolveFetch!({
      ok: true,
      json: () => Promise.resolve({
        shareLink: 'http://localhost:3000/share/abc123',
        accessCode: '123456'
      })
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/share/abc123')).toBeInTheDocument()
    })
  })

  it('does not render when open is false', () => {
    render(<ShareModal {...defaultProps} open={false} />)

    expect(screen.queryByText('Selecionar Arquivos para Compartilhar')).not.toBeInTheDocument()
  })
})

