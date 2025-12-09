import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NotificationCenter from '@/components/NotificationCenter';

// Mock do console
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
console.log = mockConsoleLog;
console.error = mockConsoleError;

// Dados mockados
const mockNotifications = [
  {
    id: 'notification-1',
    type: 'LAB_RESULT',
    payload: {
      reportId: 'report-1',
      doctorName: 'Dr. Silva',
      examDate: '2024-01-15',
      report: {
        fileName: 'laudo.pdf',
        fileContent: 'base64content',
      },
      title: 'Laudo de Exame',
      protocol: '12345'
    },
    createdAt: '2024-01-15T10:00:00Z',
    status: 'PENDING'
  },
];

const mockProfessionals = [
  {
    id: 'prof-1',
    name: 'Dr. João Silva',
    specialty: 'Cardiologia',
    userId: 'user-123',
    contact: { email: 'joao@example.com', phone: '11999999999' }
  }
];

describe('NotificationCenter', () => {
  let fetchMock: any;
  const mockUserId = 'user-123';
  const mockOnProfessionalCreated = vi.fn();

  // Helper para extrair URL de Request ou string
  const getUrl = (input: any): string => {
    if (typeof input === 'string') return input
    if (input instanceof Request) return input.url
    return ''
  }

  beforeEach(() => {
    // Criar nova instância do mock fetch para cada teste
    fetchMock = vi.fn()
    global.fetch = fetchMock
    
    vi.clearAllMocks()
    mockConsoleLog.mockReset()
    mockConsoleError.mockReset()
    mockOnProfessionalCreated.mockReset()

    // Setup default mocks usando Response objects adequados
    fetchMock.mockImplementation((input: any) => {
      const url = getUrl(input)
      console.log('[TEST] Fetch called with URL:', url);

      // Parse URL to handle query parameters
      const urlObj = new URL(url, 'http://localhost');
      const pathname = urlObj.pathname;
      const searchParams = urlObj.searchParams;

      if (pathname === '/api/professionals') {
        console.log('[TEST] Returning professionals:', mockProfessionals);
        return Promise.resolve(new Response(JSON.stringify(mockProfessionals), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      if (pathname === '/api/notifications') {
        console.log('[TEST] Returning notifications:', mockNotifications);
        return Promise.resolve(new Response(JSON.stringify(mockNotifications), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      if (pathname.startsWith('/api/reports/') && pathname.endsWith('/access')) {
        console.log('[TEST] Returning access response');
        return Promise.resolve(new Response(JSON.stringify({ message: 'Acesso registrado' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      console.log('[TEST] Route not found for URL:', url);
      return Promise.reject(new Error('Route not found'));
    });
  });

  describe('Estado de hidratação', () => {
    it('deve mostrar loading enquanto não estiver montado', () => {
      render(
        <NotificationCenter
          userId={mockUserId}
          onProfessionalCreated={mockOnProfessionalCreated}
        />
      );

      expect(screen.getByText('Carregando notificações...')).toBeInTheDocument();
    });

    it('deve buscar notificações após montar', async () => {
      console.log('[TEST] Starting test: deve buscar notificações após montar');
      render(
        <NotificationCenter
          userId={mockUserId}
          onProfessionalCreated={mockOnProfessionalCreated}
        />
      );
      console.log('[TEST] Component rendered, waiting for access registration');
      await waitFor(() => {
        console.log('[TEST] Checking if console.log was called with access registration');
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('[RECEIVED] Registrando acesso ao laudo report-1')
        );
      });
     });

    it('deve registrar acesso aos laudos das notificações', async () => {
      console.log('[TEST] Starting test: deve registrar acesso aos laudos das notificações');
      render(
        <NotificationCenter
          userId={mockUserId}
          onProfessionalCreated={mockOnProfessionalCreated}
        />
      );
      console.log('[TEST] Component rendered, waiting for access registration');
      await waitFor(() => {
        console.log('[TEST] Checking if console.log was called with access registration');
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('[RECEIVED] Registrando acesso ao laudo report-1')
        );
      });
     });

    it('deve mostrar mensagem quando não há notificações', async () => {
       // Override the mock to return empty notifications
       fetchMock.mockImplementation((input: any) => {
         const url = getUrl(input)
         console.log('[TEST] Fetch called with URL:', url);
         const urlObj = new URL(url, 'http://localhost');
         const pathname = urlObj.pathname;

         if (pathname === '/api/professionals') {
           return Promise.resolve(new Response(JSON.stringify([]), {
             status: 200,
             headers: { 'Content-Type': 'application/json' }
           }));
         }
         if (pathname === '/api/notifications') {
           return Promise.resolve(new Response(JSON.stringify([]), {
             status: 200,
             headers: { 'Content-Type': 'application/json' }
           }));
         }
         return Promise.reject(new Error('Route not found'));
       });

       render(
         <NotificationCenter
           userId={mockUserId}
           onProfessionalCreated={mockOnProfessionalCreated}
         />
       );

       await waitFor(() => {
         expect(screen.getByText('Sem notificações pendentes.')).toBeInTheDocument();
       }, { timeout: 3000 });
     });

    it('deve mostrar erro quando falha ao carregar notificações', async () => {
        console.log('[TEST] Starting test: deve mostrar erro quando falha ao carregar notificações');
        // Override the mock to return an error for notifications
        fetchMock.mockImplementation((input: any) => {
          const url = getUrl(input)
          console.log('[TEST] Fetch called with URL:', url);

          // Parse URL to handle query parameters
          const urlObj = new URL(url, 'http://localhost');
          const pathname = urlObj.pathname;

          if (pathname === '/api/professionals') {
            console.log('[TEST] Returning empty professionals');
            return Promise.resolve(new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
          if (pathname === '/api/notifications') {
            console.log('[TEST] Rejecting notifications with server error');
            return Promise.resolve(new Response(JSON.stringify({ error: 'Server error' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
           console.log('[TEST] Route not found for URL:', url);
           return Promise.resolve(new Response(JSON.stringify({ error: 'Route not found' }), {
             status: 404,
             headers: { 'Content-Type': 'application/json' }
           }));
        });

        render(
          <NotificationCenter
            userId={mockUserId}
            onProfessionalCreated={mockOnProfessionalCreated}
          />
        );

        console.log('[TEST] Component rendered, waiting for error message');
        await waitFor(() => {
          console.log('[TEST] Checking for error message in DOM');
          const errorEl = screen.getByText('Erro ao carregar notificações.');
          expect(errorEl).toBeInTheDocument();
          expect(errorEl).toHaveClass('text-lg', 'text-red-500');
        }, { timeout: 3000 });
      });

    it('deve renderizar notificações corretamente', async () => {
        console.log('[TEST] Starting test: deve renderizar notificações corretamente');
        render(
          <NotificationCenter
            userId={mockUserId}
            onProfessionalCreated={mockOnProfessionalCreated}
          />
        );

        console.log('[TEST] Component rendered, waiting for notification elements');
        await waitFor(() => {
          console.log('[TEST] Checking for notification elements in DOM');
          expect(screen.getByText(/laudo.*recebido:/i)).toBeInTheDocument();
          expect(screen.getByText('laudo.pdf')).toBeInTheDocument();
          expect(screen.getByText('Médico:')).toBeInTheDocument();
          expect(screen.getByText('Dr. Silva')).toBeInTheDocument();
          expect(screen.getByText('Associar a evento existente')).toBeInTheDocument();
          expect(screen.getByText('Criar novo evento')).toBeInTheDocument();
        });
      });
  });
});

