import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ObservationTextarea } from '@/components/edit-event/ObservationTextarea';

describe('ObservationTextarea', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o label corretamente', () => {
    render(<ObservationTextarea {...defaultProps} />);
    expect(screen.getByText('Observação')).toBeInTheDocument();
  });

  it('deve renderizar textarea com placeholder correto', () => {
    render(<ObservationTextarea {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Digite observações sobre o evento...');
    expect(textarea).toBeInTheDocument();
  });

  it('deve renderizar textarea com valor inicial', () => {
    render(<ObservationTextarea {...defaultProps} value="Observação inicial" />);
    const textarea = screen.getByDisplayValue('Observação inicial');
    expect(textarea).toBeInTheDocument();
  });

  it('deve mostrar contador de caracteres inicial como 0/500', () => {
    render(<ObservationTextarea {...defaultProps} />);
    expect(screen.getByText('0/500 caracteres')).toBeInTheDocument();
  });

  it('deve atualizar contador quando valor muda', () => {
    const { rerender } = render(<ObservationTextarea {...defaultProps} value="" />);
    expect(screen.getByText('0/500 caracteres')).toBeInTheDocument();

    rerender(<ObservationTextarea {...defaultProps} value="teste" />);
    expect(screen.getByText('5/500 caracteres')).toBeInTheDocument();
  });

  it('deve chamar onChange quando texto é digitado', () => {
    render(<ObservationTextarea {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Digite observações sobre o evento...');

    fireEvent.change(textarea, { target: { value: 'nova observação' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith('nova observação');
  });

  it('deve limitar texto a 500 caracteres', () => {
    const longText = 'a'.repeat(600);
    render(<ObservationTextarea {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Digite observações sobre o evento...');

    fireEvent.change(textarea, { target: { value: longText } });

    // O componente limita a 500 caracteres internamente
    expect(defaultProps.onChange).not.toHaveBeenCalledWith(longText);
  });

  it('deve ter maxLength definido no textarea', () => {
    render(<ObservationTextarea {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Digite observações sobre o evento...');

    expect(textarea).toHaveAttribute('maxLength', '500');
  });

  it('deve ter classe resize-none', () => {
    render(<ObservationTextarea {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Digite observações sobre o evento...');

    expect(textarea).toHaveClass('resize-none');
  });

  it('deve ter altura fixa de h-24', () => {
    render(<ObservationTextarea {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Digite observações sobre o evento...');

    expect(textarea).toHaveClass('h-24');
  });

  it('deve preservar quebras de linha no contador', () => {
    const textWithNewlines = 'linha 1\nlinha 2\nlinha 3';
    render(<ObservationTextarea {...defaultProps} value={textWithNewlines} />);

    expect(screen.getByText('23/500 caracteres')).toBeInTheDocument();
  });

  it('deve lidar com texto vazio', () => {
    render(<ObservationTextarea {...defaultProps} value="" />);
    expect(screen.getByText('0/500 caracteres')).toBeInTheDocument();
  });

  it('deve lidar com texto no limite de 500 caracteres', () => {
    const text500Chars = 'a'.repeat(500);
    render(<ObservationTextarea {...defaultProps} value={text500Chars} />);

    expect(screen.getByText('500/500 caracteres')).toBeInTheDocument();
  });
});

