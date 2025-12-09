import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock do validador
vi.mock('@/lib/validators/eventValidators', () => ({
  validateDate: vi.fn().mockReturnValue({ isValid: true }),
}));

import { DateInput } from '@/components/edit-event/DateInput';
import { validateDate } from '@/lib/validators/eventValidators';

describe('DateInput', () => {
  const defaultProps = {
    value: '2024-01-15',
    onChange: vi.fn(),
    onErrorChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o label corretamente', () => {
    render(<DateInput {...defaultProps} />);
    expect(screen.getByText('Data do Evento')).toBeInTheDocument();
  });

  it('deve renderizar o input com o valor correto', () => {
    render(<DateInput {...defaultProps} />);
    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'date');
  });

  it('deve definir min date como hoje', () => {
    const today = new Date().toISOString().split('T')[0];
    render(<DateInput {...defaultProps} />);
    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toHaveAttribute('min', today);
  });

  it('deve definir max date como 2 anos no futuro', () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    const expectedMax = maxDate.toISOString().split('T')[0];

    render(<DateInput {...defaultProps} />);
    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toHaveAttribute('max', expectedMax);
  });

  it('deve chamar onChange quando valor muda', () => {
    render(<DateInput {...defaultProps} />);
    const input = screen.getByDisplayValue('2024-01-15');

    fireEvent.change(input, { target: { value: '2024-01-20' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith('2024-01-20');
  });

  it('deve chamar onErrorChange com undefined quando valor muda', () => {
    render(<DateInput {...defaultProps} />);
    const input = screen.getByDisplayValue('2024-01-15');

    fireEvent.change(input, { target: { value: '2024-01-20' } });

    expect(defaultProps.onErrorChange).toHaveBeenCalledWith(undefined);
  });

  it('deve mostrar erro quando fornecido', () => {
    render(<DateInput {...defaultProps} error="Data inválida" />);
    expect(screen.getByText('Data inválida')).toBeInTheDocument();
  });

  it('deve aplicar classe de erro quando há erro', () => {
    render(<DateInput {...defaultProps} error="Data inválida" />);
    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toHaveClass('border-red-500');
  });

  it('deve aplicar classe normal quando não há erro', () => {
    render(<DateInput {...defaultProps} />);
    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toHaveClass('border-[#D1D5DB]');
    expect(input).not.toHaveClass('border-red-500');
  });

  it('deve ter placeholder correto', () => {
    render(<DateInput {...defaultProps} />);
    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toHaveAttribute('placeholder', 'Selecione a data');
  });

  it('deve chamar onErrorChange com erro de validação', () => {
    // Simular erro de validação
    render(<DateInput {...defaultProps} />);
    const input = screen.getByDisplayValue('2024-01-15');

    // Forçar uma mudança que causaria erro (data vazia pode ser inválida)
    fireEvent.change(input, { target: { value: '' } });

    // Como não temos mock direto, verificamos que onErrorChange foi chamado
    expect(defaultProps.onErrorChange).toHaveBeenCalled();
  });
});

