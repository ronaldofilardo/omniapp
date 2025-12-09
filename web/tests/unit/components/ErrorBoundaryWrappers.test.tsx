import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  PageErrorBoundary,
  FormErrorBoundary,
  UploadErrorBoundary,
  ListErrorBoundary,
} from '@/components/ErrorBoundaryWrappers';
import React from 'react';

// Componente que lança erro
function ThrowError() {
  throw new Error('Erro de teste');
}

describe('PageErrorBoundary', () => {
  it('deve capturar erro e exibir UI de erro de página', () => {
    // Silenciar erros do console
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PageErrorBoundary pageName="Teste">
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/Não foi possível carregar a página Teste/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recarregar página/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('deve usar mensagem genérica quando pageName não é fornecido', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByText(/Não foi possível carregar esta página/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('deve voltar na história quando botão Voltar é clicado', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    const backButton = screen.getByRole('button', { name: /voltar/i });
    await user.click(backButton);

    expect(historyBackSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    historyBackSpy.mockRestore();
  });
});

describe('FormErrorBoundary', () => {
  it('deve capturar erro e exibir mensagem específica de formulário', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <FormErrorBoundary>
        <ThrowError />
      </FormErrorBoundary>
    );

    expect(screen.getByText(/Erro ao carregar formulário/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('deve renderizar children normalmente quando não há erro', () => {
    render(
      <FormErrorBoundary>
        <div>Formulário OK</div>
      </FormErrorBoundary>
    );

    expect(screen.getByText('Formulário OK')).toBeInTheDocument();
  });
});

describe('UploadErrorBoundary', () => {
  it('deve capturar erro e exibir mensagem específica de upload', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <UploadErrorBoundary>
        <ThrowError />
      </UploadErrorBoundary>
    );

    expect(screen.getByText(/Erro no componente de upload/i)).toBeInTheDocument();
    expect(screen.getByText(/recarregue a página e tente novamente/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('deve renderizar children normalmente quando não há erro', () => {
    render(
      <UploadErrorBoundary>
        <div>Upload OK</div>
      </UploadErrorBoundary>
    );

    expect(screen.getByText('Upload OK')).toBeInTheDocument();
  });
});

describe('ListErrorBoundary', () => {
  it('deve capturar erro e exibir mensagem específica de lista', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ListErrorBoundary>
        <ThrowError />
      </ListErrorBoundary>
    );

    expect(screen.getByText(/Erro ao carregar lista/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recarregar/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('deve recarregar quando botão é clicado', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ListErrorBoundary>
        <ThrowError />
      </ListErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /recarregar/i });
    await user.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('deve renderizar children normalmente quando não há erro', () => {
    render(
      <ListErrorBoundary>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </ListErrorBoundary>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});

describe('ErrorBoundaryWrappers - Integração', () => {
  it('deve isolar erros entre diferentes boundaries', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <div>
        <FormErrorBoundary>
          <ThrowError />
        </FormErrorBoundary>
        <ListErrorBoundary>
          <div>Lista OK</div>
        </ListErrorBoundary>
      </div>
    );

    expect(screen.getByText(/Erro ao carregar formulário/i)).toBeInTheDocument();
    expect(screen.getByText('Lista OK')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

