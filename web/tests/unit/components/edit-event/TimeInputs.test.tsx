import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TimeInputs } from '@/components/edit-event/TimeInputs';

describe('TimeInputs', () => {
  const defaultProps = {
    startTime: '09:00',
    endTime: '10:00',
    onStartTimeChange: vi.fn(),
    onEndTimeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar labels corretos', () => {
    render(<TimeInputs {...defaultProps} />);
    expect(screen.getByText('Hora de Início')).toBeInTheDocument();
    expect(screen.getByText('Hora de Fim')).toBeInTheDocument();
  });

  it('deve renderizar inputs com valores corretos', () => {
    render(<TimeInputs {...defaultProps} />);
    const startInput = screen.getByDisplayValue('09:00');
    const endInput = screen.getByDisplayValue('10:00');

    expect(startInput).toBeInTheDocument();
    expect(endInput).toBeInTheDocument();
    expect(startInput).toHaveAttribute('type', 'time');
    expect(endInput).toHaveAttribute('type', 'time');
  });

  it('deve chamar onStartTimeChange quando hora de início muda', () => {
    render(<TimeInputs {...defaultProps} />);
    const startInput = screen.getByDisplayValue('09:00');

    fireEvent.change(startInput, { target: { value: '08:30' } });

    expect(defaultProps.onStartTimeChange).toHaveBeenCalledWith('08:30');
  });

  it('deve chamar onEndTimeChange quando hora de fim muda', () => {
    render(<TimeInputs {...defaultProps} />);
    const endInput = screen.getByDisplayValue('10:00');

    fireEvent.change(endInput, { target: { value: '11:30' } });

    expect(defaultProps.onEndTimeChange).toHaveBeenCalledWith('11:30');
  });

  it('deve mostrar erro de hora de início quando fornecido', () => {
    render(<TimeInputs {...defaultProps} startTimeError="Hora inválida" />);
    expect(screen.getByText('Hora inválida')).toBeInTheDocument();
  });

  it('deve mostrar erro de hora de fim quando fornecido', () => {
    render(<TimeInputs {...defaultProps} endTimeError="Hora inválida" />);
    expect(screen.getByText('Hora inválida')).toBeInTheDocument();
  });

  it('deve aplicar classe de erro no input de início quando há erro', () => {
    render(<TimeInputs {...defaultProps} startTimeError="Erro" />);
    const startInput = screen.getByDisplayValue('09:00');
    expect(startInput).toHaveClass('border-red-500');
  });

  it('deve aplicar classe de erro no input de fim quando há erro', () => {
    render(<TimeInputs {...defaultProps} endTimeError="Erro" />);
    const endInput = screen.getByDisplayValue('10:00');
    expect(endInput).toHaveClass('border-red-500');
  });

  it('deve aplicar classe normal quando não há erro', () => {
    render(<TimeInputs {...defaultProps} />);
    const startInput = screen.getByDisplayValue('09:00');
    const endInput = screen.getByDisplayValue('10:00');

    expect(startInput).toHaveClass('border-[#D1D5DB]');
    expect(endInput).toHaveClass('border-[#D1D5DB]');
    expect(startInput).not.toHaveClass('border-red-500');
    expect(endInput).not.toHaveClass('border-red-500');
  });

  it('deve renderizar em grid de 2 colunas', () => {
    render(<TimeInputs {...defaultProps} />);
    const container = screen.getByText('Hora de Início').parentElement?.parentElement;
    expect(container).toHaveClass('grid', 'grid-cols-2', 'gap-4');
  });

  it('deve lidar com valores vazios', () => {
    render(<TimeInputs {...defaultProps} startTime="" endTime="" />);
    const inputs = screen.getAllByDisplayValue('');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveAttribute('type', 'time');
    expect(inputs[1]).toHaveAttribute('type', 'time');
  });

  it('deve aceitar diferentes formatos de hora', () => {
    render(<TimeInputs {...defaultProps} startTime="14:30" endTime="16:45" />);
    expect(screen.getByDisplayValue('14:30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('16:45')).toBeInTheDocument();
  });

  it('deve mostrar múltiplos erros simultaneamente', () => {
    render(<TimeInputs
      {...defaultProps}
      startTimeError="Hora de início inválida"
      endTimeError="Hora de fim inválida"
    />);

    expect(screen.getByText('Hora de início inválida')).toBeInTheDocument();
    expect(screen.getByText('Hora de fim inválida')).toBeInTheDocument();
  });
});

