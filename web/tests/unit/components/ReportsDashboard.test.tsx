import '@testing-library/jest-dom'
import { render, screen, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ReportsDashboard } from '@/components/ReportsDashboard'

describe('ReportsDashboard', () => {
  beforeEach(() => {
    // Mock fetch global
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/reports')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            reports: [
              {
                protocol: 'LAB-001',
                receiver: { name: 'João Silva', cpf: '11122233344' },
                sender: { 
                  name: 'Laboratório Omni',
                  emissorInfo: { cnpj: '12.345.678/0001-99' }
                },
                sentAt: new Date('2024-11-24T10:00:00').toISOString(),
                fileName: 'laudo.pdf',
                fileHash: 'abc123def456',
                status: 'VIEWED',
              },
              {
                protocol: 'LAB-002',
                receiver: { name: 'Maria Santos', cpf: '55566677788' },
                sender: null,
                sentAt: new Date('2024-11-24T11:00:00').toISOString(),
                fileName: 'exame.pdf',
                fileHash: null,
                status: 'SENT',
              },
              {
                protocol: 'LAB-003',
                receiver: { name: 'Pedro Costa', cpf: '99988877766' },
                sender: { name: 'Laboratório XYZ' },
                sentAt: new Date('2024-11-24T12:00:00').toISOString(),
                fileName: 'resultado.pdf',
                fileHash: 'xyz789abc123',
                status: 'DELIVERED',
              },
              {
                protocol: 'LAB-004',
                receiver: { name: 'Ana Lima', cpf: '44433322211' },
                sender: { name: 'Clínica ABC' },
                sentAt: new Date('2024-11-24T13:00:00').toISOString(),
                fileName: 'laudo-final.pdf',
                fileHash: 'def456ghi789',
                status: 'RECEIVED',
              },
            ],
            total: 2,
          }),
        }) as any
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as any
    }) as any
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render loading state initially', () => {
    act(() => {
      render(<ReportsDashboard />)
    })
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('should fetch and display documents', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('LAB-001')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('laudo.pdf')).toBeInTheDocument()
    expect(screen.getByText('LAB-002')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
  })

  it('should display emitter CNPJ when available', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('12.345.678/0001-99')).toBeInTheDocument()
  })

  it('should display dash when emitter name is not available', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    const cells = screen.getAllByText('—')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('should display status badges correctly', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Visualizado')).toBeInTheDocument()
    expect(screen.getByText('Enviado')).toBeInTheDocument()
    expect(screen.getByText('Entregue')).toBeInTheDocument()
    expect(screen.getByText('Recebido')).toBeInTheDocument()
  })

  it('should format dates correctly', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    // Verificar se as datas estão formatadas (formato brasileiro)
    const dateElements = screen.getAllByText(/24\/11\/2024/i)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    // Deve renderizar sem documentos em caso de erro
    expect(screen.queryByText('LAB-001')).not.toBeInTheDocument()
  })

  it('should call API with correct endpoint', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/reports?page=1&limit=100')
    })
  })

  it('should display table headers correctly', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Protocolo')).toBeInTheDocument()
    expect(screen.getByText('Arquivo')).toBeInTheDocument()
    expect(screen.getByText('Hash')).toBeInTheDocument()
    expect(screen.getByText('Paciente ID')).toBeInTheDocument()
    expect(screen.getByText('Destinatário')).toBeInTheDocument()
    expect(screen.getByText('Emissor (CNPJ)')).toBeInTheDocument()
    expect(screen.getByText('Data de Envio')).toBeInTheDocument()
    expect(screen.getByText('Data de Recebimento')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('should display file hash when available', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('abc123def456')).toBeInTheDocument()
    expect(screen.getByText('xyz789abc123')).toBeInTheDocument()
    expect(screen.getByText('def456ghi789')).toBeInTheDocument()
    // For null hash, should display '-'
    expect(screen.getAllByText('-')).toBeTruthy()
  })
})

