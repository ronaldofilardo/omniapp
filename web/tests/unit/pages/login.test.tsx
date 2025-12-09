import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '@/app/login/page';
import { http, HttpResponse } from 'msw';
import { addMSWHandler } from '../../setup/msw-setup';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve redirecionar para /timeline para usuários RECEPTOR', async () => {
    addMSWHandler(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({ user: { role: 'RECEPTOR' } });
      })
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('Digite seu e-mail'), {
      target: { value: 'receptor@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), {
      target: { value: 'password' },
    });

    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/timeline');
    });
  });

  it('deve redirecionar para /admin/dashboard para usuários ADMIN', async () => {
    addMSWHandler(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({ user: { role: 'ADMIN' } });
      })
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('Digite seu e-mail'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), {
      target: { value: 'password' },
    });

    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('deve redirecionar para /timeline para usuários EMISSOR gerais', async () => {
    addMSWHandler(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({ user: { role: 'EMISSOR', email: 'emissor@example.com' } });
      })
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('Digite seu e-mail'), {
      target: { value: 'emissor@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), {
      target: { value: 'password' },
    });

    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/timeline');
    });
  });

  it('deve redirecionar para /laudos para labor@omni.com', async () => {
    addMSWHandler(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({ user: { role: 'EMISSOR', email: 'labor@omni.com' } });
      })
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('Digite seu e-mail'), {
      target: { value: 'labor@omni.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), {
      target: { value: 'password' },
    });

    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/laudos');
    });
  });
});