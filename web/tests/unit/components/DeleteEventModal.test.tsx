import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteEventModal } from '@/components/DeleteEventModal';
import { vi } from 'vitest';

describe('DeleteEventModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onConfirm: mockOnConfirm,
    eventTitle: 'Consulta Médica',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open is true', () => {
    render(<DeleteEventModal {...defaultProps} />);
    // Deve haver dois títulos "Excluir Evento", garantir que ambos estão presentes
      const titles = screen.getAllByText(/excluir evento/i);
    expect(titles.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/tem certeza de que deseja excluir o evento/i)).toBeInTheDocument();
  });

  it('does not render modal when open is false', () => {
    render(<DeleteEventModal {...defaultProps} open={false} />);
    // Não deve haver nenhum título visível
    expect(screen.queryAllByText('Excluir Evento').length).toBe(0);
  });

  it('renders delete files checkbox', () => {
    render(<DeleteEventModal {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /deletar arquivos associados/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('allows toggling delete files checkbox', () => {
    render(<DeleteEventModal {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /deletar arquivos associados/i });

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('calls onConfirm with deleteFiles=false when confirm is clicked without checkbox', () => {
    render(<DeleteEventModal {...defaultProps} />);
    const confirmButton = screen.getByText('Confirmar');

    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledWith(false);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onConfirm with deleteFiles=true when confirm is clicked with checkbox checked', () => {
    render(<DeleteEventModal {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /deletar arquivos associados/i });
    const confirmButton = screen.getByText('Confirmar');

    fireEvent.click(checkbox);
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledWith(true);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange with false when cancel is clicked', () => {
    render(<DeleteEventModal {...defaultProps} />);
    const cancelButton = screen.getByText('Cancelar');

    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('resets checkbox state when modal is reopened', () => {
    const { rerender } = render(<DeleteEventModal {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /deletar arquivos associados/i });

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Close modal
    rerender(<DeleteEventModal {...defaultProps} open={false} />);

    // Reopen modal
    rerender(<DeleteEventModal {...defaultProps} open={true} />);

    const newCheckbox = screen.getByRole('checkbox', { name: /deletar arquivos associados/i });
    expect(newCheckbox).not.toBeChecked();
  });

  it('displays copyright notice', () => {
    render(<DeleteEventModal {...defaultProps} />);
    expect(screen.getByText('© 2025 Omni Saúde')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<DeleteEventModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar exclusão do evento')).toBeInTheDocument();
  });
});

