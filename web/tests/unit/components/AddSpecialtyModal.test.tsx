import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddSpecialtyModal } from '@/components/AddSpecialtyModal';
import { vi } from 'vitest';

describe('AddSpecialtyModal', () => {
  const mockOnSave = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open is true', () => {
    render(<AddSpecialtyModal {...defaultProps} />);
    expect(screen.getByText('Adicionar Nova Especialidade')).toBeInTheDocument();
  });

  it('does not render modal when open is false', () => {
    render(<AddSpecialtyModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Adicionar Nova Especialidade')).not.toBeInTheDocument();
  });

  it('allows typing in the specialty name input', () => {
    render(<AddSpecialtyModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite o nome...');
    fireEvent.change(input, { target: { value: 'Cardiologia' } });
    expect(input).toHaveValue('Cardiologia');
  });

  it('shows alert when trying to submit empty specialty name', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<AddSpecialtyModal {...defaultProps} />);
    const submitButton = screen.getByText('Adicionar');
    fireEvent.click(submitButton);
    expect(alertSpy).toHaveBeenCalledWith('Por favor, digite o nome da especialidade.');
    alertSpy.mockRestore();
  });

  it('calls onSave with trimmed specialty name when submitting valid input', () => {
    render(<AddSpecialtyModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite o nome...');
    const submitButton = screen.getByText('Adicionar');

    fireEvent.change(input, { target: { value: '  Cardiologia  ' } });
    fireEvent.click(submitButton);

    expect(mockOnSave).toHaveBeenCalledWith('Cardiologia');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes modal when cancel button is clicked', () => {
    render(<AddSpecialtyModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite o nome...');
    // Preenche o campo para simular edição
    fireEvent.change(input, { target: { value: 'Cardiologia' } });
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    // Espera o diálogo de confirmação
    return import('@testing-library/react').then(({ within }) =>
      within(document.body).findByText((content) => content.includes('Sair sem salvar'))
    ).then((exitButton) => {
      fireEvent.click(exitButton);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows confirmation dialog when closing with filled data', () => {
    render(<AddSpecialtyModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite o nome...');
    fireEvent.change(input, { target: { value: 'Cardiologia' } });

    // Try to close by clicking outside or cancel
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

  // Deve mostrar o diálogo de confirmação (debug)
    return import('@testing-library/react').then(({ within }) =>
      within(document.body).findByText((content) => content.includes('Confirmar saída'))
    );
  });

  it('closes modal without confirmation when input is empty', () => {
  render(<AddSpecialtyModal {...defaultProps} />);
  const cancelButton = screen.getByText('Cancelar');
  fireEvent.click(cancelButton);
  expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles confirmation dialog - continue editing', () => {
    render(<AddSpecialtyModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite o nome...');
    fireEvent.change(input, { target: { value: 'Cardiologia' } });

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    return import('@testing-library/react').then(({ within }) =>
      within(document.body).findByText((content) => content.includes('Continuar editando'))
    ).then((continueButton) => {
      fireEvent.click(continueButton);
      expect(mockOnOpenChange).not.toHaveBeenCalled();
      expect(screen.getByText('Adicionar Nova Especialidade')).toBeInTheDocument();
    });
  });

  it('handles confirmation dialog - exit without saving', () => {
    render(<AddSpecialtyModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite o nome...');
    fireEvent.change(input, { target: { value: 'Cardiologia' } });

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    return import('@testing-library/react').then(({ within }) =>
      within(document.body).findByText((content) => content.includes('Sair sem salvar'))
    ).then((exitButton) => {
      fireEvent.click(exitButton);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('focuses input on mount', () => {
    render(<AddSpecialtyModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite o nome...');
    expect(input).toHaveFocus();
  });
});

