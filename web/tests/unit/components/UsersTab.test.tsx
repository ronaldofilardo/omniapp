import { render, screen, waitFor } from '@testing-library/react'
import { UsersTab } from '@/components/UsersTab'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('UsersTab', () => {
  let mockFetch: any

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()
  })

  it('deve mostrar loading inicialmente', () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    render(<UsersTab />)

    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('deve mostrar erro quando a requisição falha', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Erro de rede'))

    render(<UsersTab />)

    await waitFor(() => {
      expect(screen.getByText('Erro: Erro de rede')).toBeInTheDocument()
    })
  })

  it('deve renderizar a lista de usuários corretamente', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'admin@example.com',
        cpf: null,
        name: 'Admin User',
        role: 'ADMIN' as const,
        createdAt: '2023-01-01T00:00:00Z',
        emissorInfo: null
      },
      {
        id: '2',
        email: 'emissor@example.com',
        cpf: null,
        name: 'Emissor User',
        role: 'EMISSOR' as const,
        createdAt: '2023-01-02T00:00:00Z',
        emissorInfo: { cnpj: '12345678000123' }
      },
      {
        id: '3',
        email: 'receptor@example.com',
        cpf: '12345678901',
        name: 'Receptor User',
        role: 'RECEPTOR' as const,
        createdAt: '2023-01-03T00:00:00Z',
        emissorInfo: null
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ users: mockUsers })
    })

    render(<UsersTab />)

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('Emissor User')).toBeInTheDocument()
      expect(screen.getByText('Receptor User')).toBeInTheDocument()
    })

    // Verificar emails
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('emissor@example.com')).toBeInTheDocument()
    expect(screen.getByText('receptor@example.com')).toBeInTheDocument()

    // Verificar registros (CPF/CNPJ)
    expect(screen.getByText('12345678000123')).toBeInTheDocument() // CNPJ do emissor
    expect(screen.getByText('12345678901')).toBeInTheDocument() // CPF do receptor

    // Verificar tipos
    expect(screen.getAllByText('Admin')).toHaveLength(1)
    expect(screen.getAllByText('Emissor')).toHaveLength(1)
    expect(screen.getAllByText('Receptor')).toHaveLength(1)

    // Verificar que os usuários estão renderizados (datas serão testadas separadamente)
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('Emissor User')).toBeInTheDocument()
    expect(screen.getByText('Receptor User')).toBeInTheDocument()
  })

  it('deve mostrar mensagem quando não há usuários', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ users: [] })
    })

    render(<UsersTab />)

    await waitFor(() => {
      expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
    })
  })

  it('deve mostrar traço quando nome é null', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'user@example.com',
        cpf: '12345678901',
        name: null,
        role: 'RECEPTOR' as const,
        createdAt: '2023-01-01T00:00:00Z',
        emissorInfo: null
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ users: mockUsers })
    })

    render(<UsersTab />)

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  it('deve mostrar traço quando CPF ou CNPJ é null', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'user@example.com',
        cpf: null,
        name: 'User',
        role: 'RECEPTOR' as const,
        createdAt: '2023-01-01T00:00:00Z',
        emissorInfo: null
      },
      {
        id: '2',
        email: 'emissor@example.com',
        cpf: null,
        name: 'Emissor',
        role: 'EMISSOR' as const,
        createdAt: '2023-01-02T00:00:00Z',
        emissorInfo: { cnpj: null }
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ users: mockUsers })
    })

    render(<UsersTab />)

    await waitFor(() => {
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThanOrEqual(2) // Pelo menos para os registros vazios
    })
  })

  it('deve fazer a requisição para /api/admin/users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ users: [] })
    })

    render(<UsersTab />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users')
    })
  })
})

