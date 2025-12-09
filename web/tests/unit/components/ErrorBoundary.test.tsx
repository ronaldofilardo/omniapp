import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, ErrorFallback, useErrorHandler } from '@/components/ErrorBoundary';
import React from 'react';

// Componente de teste que lança erro
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Erro de teste');
  }
  return <div>Componente OK</div>;
}

// Componente de teste com useErrorHandler
function ComponentWithErrorHandler({ shouldError = false }: { shouldError?: boolean }) {
  const setError = useErrorHandler();

  React.useEffect(() => {
    if (shouldError) {
      setError(new Error('Erro assíncrono'));
    }
  }, [shouldError, setError]);

  return <div>Componente com handler</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Silenciar erros do console durante os testes
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('deve renderizar children quando não há erro', () => {
    render(
      <ErrorBoundary>
        <div>Conteúdo normal</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Conteúdo normal')).toBeInTheDocument();
  });

  it('deve capturar e exibir erro quando child lança exceção', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/Ocorreu um erro inesperado/i)).toBeInTheDocument();
  });

  it('deve renderizar fallback customizado quando fornecido', () => {
    const customFallback = <div>Erro customizado</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Erro customizado')).toBeInTheDocument();
  });

  it('deve chamar callback onError quando erro ocorre', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('deve recarregar página quando botão de recarregar é clicado', async () => {
    const user = userEvent.setup();
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /recarregar/i });
    await user.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });

  it('deve exibir detalhes do erro em ambiente de desenvolvimento', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Detalhes do erro/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('ErrorFallback', () => {
  it('deve renderizar mensagem de erro padrão', () => {
    render(<ErrorFallback />);

    expect(screen.getByText('Erro ao carregar componente')).toBeInTheDocument();
    expect(screen.getByText('Ocorreu um erro inesperado')).toBeInTheDocument();
  });

  it('deve renderizar mensagem de erro customizada', () => {
    const error = new Error('Erro específico');
    render(<ErrorFallback error={error} />);

    expect(screen.getByText('Erro específico')).toBeInTheDocument();
  });

  it('deve chamar resetError quando botão é clicado', async () => {
    const user = userEvent.setup();
    const resetError = vi.fn();

    render(<ErrorFallback resetError={resetError} />);

    const tryAgainButton = screen.getByRole('button', { name: /tentar novamente/i });
    await user.click(tryAgainButton);

    expect(resetError).toHaveBeenCalled();
  });

  it('não deve renderizar botão se resetError não for fornecido', () => {
    render(<ErrorFallback />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('deve capturar erros assíncronos', async () => {
    render(
      <ErrorBoundary>
        <ComponentWithErrorHandler shouldError={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    });
  });

  it('não deve lançar erro se nenhum erro for definido', () => {
    render(
      <ErrorBoundary>
        <ComponentWithErrorHandler shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Componente com handler')).toBeInTheDocument();
  });
});

describe('ErrorBoundary - Integração', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('deve isolar erros e não quebrar componentes irmãos', () => {
    render(
      <div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
        <div>Componente irmão OK</div>
      </div>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Componente irmão OK')).toBeInTheDocument();
  });

  it('deve funcionar com múltiplos níveis de ErrorBoundary', () => {
    render(
      <ErrorBoundary fallback={<div>Erro externo</div>}>
        <ErrorBoundary fallback={<div>Erro interno</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // Erro deve ser capturado pelo boundary mais próximo
    expect(screen.getByText('Erro interno')).toBeInTheDocument();
    expect(screen.queryByText('Erro externo')).not.toBeInTheDocument();
  });
});

