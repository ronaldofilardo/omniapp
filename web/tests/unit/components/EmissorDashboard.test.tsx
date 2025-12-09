import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EmissorDashboard } from '@/components/EmissorDashboard';

// Mock do fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EmissorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estado de carregamento', () => {
    it('deve exibir mensagem de carregamento inicialmente', () => {
      mockFetch.mockImplementation(() => 
        new Promise(() => {}) // Promise que nunca resolve
      );

      render(<EmissorDashboard />);
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });
  });

  describe('Estado de erro', () => {
    it('deve exibir mensagem de erro quando fetch falha', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<EmissorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar dados. Tente novamente.')).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de erro quando resposta não é ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<EmissorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar dados. Tente novamente.')).toBeInTheDocument();
      });
    });
  });

  describe('Renderização de dados', () => {
    const mockReports = [
      {
        id: '1',
        protocol: 'PROTO-001',
        title: 'Laudo 1',
        status: 'SENT',
        sentAt: '2024-01-15T10:00:00Z',
        receiver: {
          name: 'João Silva',
          cpf: '123.456.789-00',
        },
      },
      {
        id: '2',
        protocol: 'PROTO-002',
        title: 'Laudo 2',
        status: 'VIEWED',
        sentAt: '2024-01-16T10:00:00Z',
        receivedAt: '2024-01-16T12:00:00Z',
        viewedAt: '2024-01-16T14:00:00Z',
        receiver: {
          name: 'Maria Santos',
        },
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ reports: mockReports }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('deve renderizar título do dashboard', async () => {
      render(<EmissorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Laudos Enviados')).toBeInTheDocument();
      });
    });

    it('deve renderizar lista de laudos', async () => {
      render(<EmissorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('PROTO-001')).toBeInTheDocument();
        expect(screen.getByText('PROTO-002')).toBeInTheDocument();
      });
    });

    it('deve renderizar nomes dos destinatários', async () => {
      render(<EmissorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument();
        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      });
    });

    it('deve renderizar CPF quando disponível', async () => {
      render(<EmissorDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/123\.456\.789-00/)).toBeInTheDocument();
      });
    });
  });

  describe('Status dos laudos', () => {
    it('deve exibir status SENT corretamente', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          reports: [{
            id: '1',
            protocol: 'PROTO-001',
            status: 'SENT',
            sentAt: '2024-01-15T10:00:00Z',
            receiver: { name: 'João' },
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        const elements = screen.getAllByText('Enviado');
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('deve exibir status RECEIVED corretamente', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          reports: [{
            id: '1',
            protocol: 'PROTO-001',
            status: 'RECEIVED',
            sentAt: '2024-01-15T10:00:00Z',
            receiver: { name: 'João' },
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        const elements = screen.getAllByText('Recebido');
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('deve exibir status VIEWED corretamente', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          reports: [{
            id: '1',
            protocol: 'PROTO-001',
            status: 'VIEWED',
            sentAt: '2024-01-15T10:00:00Z',
            receiver: { name: 'João' },
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        const elements = screen.getAllByText('Visualizado');
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('deve exibir status ARCHIVED corretamente', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          reports: [{
            id: '1',
            protocol: 'PROTO-001',
            status: 'ARCHIVED',
            sentAt: '2024-01-15T10:00:00Z',
            receiver: { name: 'João' },
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        const elements = screen.getAllByText('Arquivado');
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Datas', () => {
    it('deve exibir traço quando receivedAt não existe', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          reports: [{
            id: '1',
            protocol: 'PROTO-001',
            status: 'SENT',
            sentAt: '2024-01-15T10:00:00Z',
            receiver: { name: 'João' },
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        const cells = screen.getAllByText('-');
        expect(cells.length).toBeGreaterThan(0);
      });
    });

    it('deve exibir traço quando viewedAt não existe', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          reports: [{
            id: '1',
            protocol: 'PROTO-001',
            status: 'RECEIVED',
            sentAt: '2024-01-15T10:00:00Z',
            receivedAt: '2024-01-15T12:00:00Z',
            receiver: { name: 'João' },
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        const cells = screen.getAllByText('-');
        expect(cells.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Botão Reavisar', () => {
    it('deve renderizar botão desabilitado', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          reports: [{
            id: '1',
            protocol: 'PROTO-001',
            status: 'SENT',
            sentAt: '2024-01-15T10:00:00Z',
            receiver: { name: 'João' },
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /reavisar/i });
        buttons.forEach(button => {
          expect(button).toBeDisabled();
        });
      });
    });

    it('deve ter tooltip de funcionalidade futura', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          reports: [{
            id: '1',
            protocol: 'PROTO-001',
            status: 'SENT',
            sentAt: '2024-01-15T10:00:00Z',
            receiver: { name: 'João' },
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /reavisar/i });
        buttons.forEach(button => {
          expect(button).toHaveAttribute('title', 'Funcionalidade disponível em breve');
        });
      });
    });
  });

  describe('Chamada de API', () => {
    it('deve fazer fetch para /api/reports', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ reports: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const call = mockFetch.mock.calls[0][0];
        expect(call).toBeInstanceOf(Request);
        expect(call.url).toMatch(/\/api\/reports$/);
      });
    });

    it('deve chamar fetch apenas uma vez no mount', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ reports: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<EmissorDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});

