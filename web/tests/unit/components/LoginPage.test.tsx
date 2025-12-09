import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import LoginPage from '@/app/login/page';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: mockSearchParams,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.mockReturnValue(null);
  });

  it('should display success message and pre-fill email when success=true and email provided', () => {
    mockSearchParams.mockImplementation((key: string) => {
      if (key === 'success') return 'true';
      if (key === 'email') return 'test@example.com';
      return null;
    });

    render(<LoginPage />);

    expect(screen.getByText('Cadastro realizado com sucesso! Faça o login para continuar.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('should not display success message when success is not true', () => {
    render(<LoginPage />);

    expect(screen.queryByText('Cadastro realizado com sucesso! Faça o login para continuar.')).not.toBeInTheDocument();
  });

  it('should handle login form submission', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: 'user-1', role: 'RECEPTOR' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Digite seu e-mail');
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const submitButton = screen.getByText('Entrar');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/\/api\/auth\/login$/),
          method: 'POST'
        })
      );
      const request = mockFetch.mock.calls[0][0];
      expect(request.headers.get('Content-Type')).toBe('application/json');
      // Note: body verification would require reading the stream, which is complex in tests
    });

    expect(mockPush).toHaveBeenCalledWith('/timeline');
  });

  it('should show error message on login failure', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Credenciais inválidas' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Digite seu e-mail');
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const submitButton = screen.getByText('Entrar');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });
  });

});

