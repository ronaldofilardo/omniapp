import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InstructionsCheckbox } from '@/components/edit-event/InstructionsCheckbox';

describe('InstructionsCheckbox', () => {
  const defaultProps = {
    hasInstructions: false,
    instructions: '',
    onHasInstructionsChange: vi.fn(),
    onInstructionsChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o checkbox desmarcado inicialmente', () => {
    render(<InstructionsCheckbox {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /instruções/i });
    expect(checkbox).not.toBeChecked();
  });

  it('deve renderizar o label correto', () => {
    render(<InstructionsCheckbox {...defaultProps} />);
    expect(screen.getByText('Instruções')).toBeInTheDocument();
  });

  it('deve renderizar o checkbox marcado quando hasInstructions é true', () => {
    render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} />);
    const checkbox = screen.getByRole('checkbox', { name: /instruções/i });
    expect(checkbox).toBeChecked();
  });

  it('deve mostrar campo de input quando checkbox está marcado', () => {
    render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} />);
    expect(screen.getByPlaceholderText('Digite as instruções (máx 50 caracteres)')).toBeInTheDocument();
  });

  it('não deve mostrar campo de input quando checkbox está desmarcado', () => {
    render(<InstructionsCheckbox {...defaultProps} />);
    expect(screen.queryByPlaceholderText('Digite as instruções (máx 50 caracteres)')).not.toBeInTheDocument();
  });

  it('deve mostrar contador de caracteres', () => {
    render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} instructions="teste" />);
    expect(screen.getByText('5/50 caracteres')).toBeInTheDocument();
  });

  it('deve chamar onHasInstructionsChange quando checkbox é clicado', () => {
    render(<InstructionsCheckbox {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /instruções/i });

    fireEvent.click(checkbox);

    expect(defaultProps.onHasInstructionsChange).toHaveBeenCalledWith(true);
  });

  it('deve chamar onInstructionsChange quando texto é digitado', () => {
    render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} />);
    const input = screen.getByPlaceholderText('Digite as instruções (máx 50 caracteres)');

    fireEvent.change(input, { target: { value: 'nova instrução' } });

    expect(defaultProps.onInstructionsChange).toHaveBeenCalledWith('nova instrução');
  });

  it('deve limitar texto a 50 caracteres', () => {
    const longText = 'a'.repeat(60);
    render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} />);
    const input = screen.getByPlaceholderText('Digite as instruções (máx 50 caracteres)');

    fireEvent.change(input, { target: { value: longText } });

    // O componente limita a 50 caracteres internamente
    expect(defaultProps.onInstructionsChange).not.toHaveBeenCalledWith(longText);
  });

  it('deve mostrar contador correto com texto existente', () => {
    const existingText = 'instrução existente';
    render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} instructions={existingText} />);

    expect(screen.getByText('19/50 caracteres')).toBeInTheDocument();
  });

  it('deve ter maxLength definido no input', () => {
    render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} />);
    const input = screen.getByPlaceholderText('Digite as instruções (máx 50 caracteres)');

    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('deve ter atributo required no input', () => {
    render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} />);
    const input = screen.getByPlaceholderText('Digite as instruções (máx 50 caracteres)');

    expect(input).toHaveAttribute('required');
  });

  it('deve atualizar contador quando texto muda', () => {
    const { rerender } = render(<InstructionsCheckbox {...defaultProps} hasInstructions={true} instructions="" />);

    expect(screen.getByText('0/50 caracteres')).toBeInTheDocument();

    rerender(<InstructionsCheckbox {...defaultProps} hasInstructions={true} instructions="teste" />);

    expect(screen.getByText('5/50 caracteres')).toBeInTheDocument();
  });
});

