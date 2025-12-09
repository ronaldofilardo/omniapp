
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import ShareAccess from '@/app/shared/[token]/page'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock do React use hook
vi.mock('react', async () => {
  const actual = await vi.importActual('react') as any
  return {
    ...actual,
    use: vi.fn()
  }
})

const { use: mockUse } = await import('react')

describe('ShareAccess Page', () => {
  const mockParams = { token: 'abc123' }
  let mockFetch: any

  beforeEach(() => {
    // Criar nova instância do mock fetch para cada teste
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    vi.clearAllMocks()
    // Mock do hook use para retornar os params
    vi.mocked(mockUse).mockReturnValue(mockParams)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders access form initially', async () => {
    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    expect(screen.getByText('Acesso a Documentos')).toBeInTheDocument()
    expect(screen.getByText('Por favor, insira o código de acesso fornecido pelo paciente.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('388910')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /acessar arquivos/i })).toBeInTheDocument()
  })

  it('validates code input (only numbers, max 6 digits)', async () => {
    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')

    // Digitar letras (deve ser filtrado)
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(input).toHaveValue('')

    // Digitar números
    fireEvent.change(input, { target: { value: '123456' } })
    expect(input).toHaveValue('123456')

    // Digitar mais de 6 dígitos (deve truncar)
    fireEvent.change(input, { target: { value: '123456789' } })
    expect(input).toHaveValue('123456')
  })

  it('disables submit button when code is incomplete', async () => {
    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    // Código incompleto
    fireEvent.change(input, { target: { value: '12345' } })
    expect(button).toBeDisabled()

    // Código completo
    fireEvent.change(input, { target: { value: '123456' } })
    expect(button).not.toBeDisabled()
  })

  it('submits code and displays files on success', async () => {
    // Primeiro renderizar e verificar estado inicial
    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    // Deve mostrar o form inicialmente
    expect(screen.getByText('Acesso a Documentos')).toBeInTheDocument()
    expect(screen.queryByText('Arquivos Compartilhados')).not.toBeInTheDocument()

    // Agora configurar o mock e fazer a ação
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        files: [
          { id: '1', name: 'exame.pdf', type: 'application/pdf', url: '/downloads/exame.pdf' },
          { id: '2', name: 'receita.jpg', type: 'image/jpeg', url: '/downloads/receita.jpg' }
        ]
      })
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/share/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'abc123', code: '123456' })
      })
    })

    // Aguardar a atualização do estado após a resposta da API
    await waitFor(() => {
      expect(screen.getByText('Arquivos Compartilhados')).toBeInTheDocument()
    })
    expect(screen.getByText('exame.pdf')).toBeInTheDocument()
    expect(screen.getByText('receita.jpg')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /baixar/i })).toHaveLength(2)
  })

  it('displays error message on invalid code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Código de acesso incorreto' })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Código de acesso incorreto')).toBeInTheDocument()
    })

    // Form ainda deve estar visível
    expect(screen.getByPlaceholderText('388910')).toBeInTheDocument()
  })

  it('displays error message on expired link', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Link expirado ou inválido' })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Link expirado ou inválido')).toBeInTheDocument()
    })
  })

  it('displays error message on already used link', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Este link já foi utilizado' })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Este link já foi utilizado')).toBeInTheDocument()
    })
  })

  it('shows loading state during validation', async () => {
    let resolveFetch!: (value: any) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })

    mockFetch.mockReturnValueOnce(fetchPromise)

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    // Verificar estado de loading
    expect(screen.getByText('Validando...')).to.exist
    expect(button).toBeDisabled()

    // Resolver a promise
    resolveFetch({
      ok: true,
      json: () => Promise.resolve({ files: [{ id: '1', name: 'test.pdf', type: 'pdf', url: 'url' }] })
    })

    await waitFor(() => {
      expect(screen.getByText('Arquivos Compartilhados')).to.exist
    })
  })

  it('handles network errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Erro de rede' })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(screen.getByText('Erro de rede')).toBeInTheDocument()
    })
  })

  it('opens file links in new tab when clicked', async () => {
    const mockFiles = [
      { id: 'file-0', name: 'exame.pdf', type: 'pdf', url: 'https://example.com/exame.pdf' }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: mockFiles })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('exame.pdf')).toBeInTheDocument()
    })

    // Verificar se o link tem target="_blank"
    const fileLink = screen.getByText('exame.pdf')
    expect(fileLink.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('provides download buttons for files', async () => {
    const mockFiles = [
      { id: 'file-0', name: 'exame.pdf', type: 'pdf', url: '/downloads/exame.pdf' }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: mockFiles })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      const downloadLinks = screen.getAllByRole('link', { name: /baixar/i })
      expect(downloadLinks.length).toBeGreaterThan(0)
      expect(downloadLinks[0]).toHaveAttribute('href', '/downloads/exame.pdf')
      expect(downloadLinks[0]).toHaveAttribute('download')
    })
  })
})
