import { render, screen } from '@testing-library/react';
import EventDetail from '@/components/EventDetail';
import { vi } from 'vitest';

describe('EventDetail', () => {
  const mockEvent = {
    id: 'event-1',
    title: 'Consulta Médica',
    description: 'Consulta de rotina',
    date: '2024-10-25',
    type: 'consulta',
    startTime: '10:00',
    endTime: '11:00',
    observation: 'Paciente apresenta sintomas leves',
    instructions: true,
    professional: {
      id: 'prof-1',
      name: 'Dr. João Silva',
      specialty: 'Cardiologia',
    },
    files: [
      {
        name: 'laudo.pdf',
        url: '/uploads/laudo.pdf',
        uploadDate: '2024-10-25',
      },
    ],
    userId: 'user-1',
    professionalId: 'prof-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders event title and date', () => {
    render(<EventDetail event={mockEvent} />);
    expect(screen.getByText('Consulta Médica')).toBeInTheDocument();
    // Permite encontrar a data mesmo que esteja junto de outros elementos (ex: SVG)
    expect(
      screen.getByText((content, node) => {
        const hasText = (text: string) => text.includes('24 de outubro de 2024');
        const nodeHasText = hasText(node?.textContent || '');
        const childrenDontHaveText = Array.from(node?.children || []).every(
          (child) => !hasText(child.textContent || '')
        );
        return nodeHasText && childrenDontHaveText;
      })
    ).toBeInTheDocument();
  });

  it('renders event type badge', () => {
    render(<EventDetail event={mockEvent} />);
    const badge = screen.getByText('consulta');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('renders event description when present', () => {
    render(<EventDetail event={mockEvent} />);
    expect(screen.getByText('Descrição')).toBeInTheDocument();
    expect(screen.getByText('Consulta de rotina')).toBeInTheDocument();
  });

  it('renders time information', () => {
    render(<EventDetail event={mockEvent} />);
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
  });

  it('renders observations when present', () => {
    render(<EventDetail event={mockEvent} />);
    expect(screen.getByText('Observações')).toBeInTheDocument();
    expect(screen.getByText('Paciente apresenta sintomas leves')).toBeInTheDocument();
  });

  it('renders special instructions badge when instructions is true', () => {
    render(<EventDetail event={mockEvent} />);
    expect(screen.getByText('Instruções especiais necessárias')).toBeInTheDocument();
  });

  it('does not render special instructions badge when instructions is false', () => {
    const eventWithoutInstructions = { ...mockEvent, instructions: false };
    render(<EventDetail event={eventWithoutInstructions} />);
    expect(screen.queryByText('Instruções especiais necessárias')).not.toBeInTheDocument();
  });

  it('renders professional information', () => {
    render(<EventDetail event={mockEvent} />);
    expect(screen.getByText('Dr. João Silva')).toBeInTheDocument();
    expect(screen.getByText('Cardiologia')).toBeInTheDocument();
    expect(screen.getByText('Ver Perfil Completo')).toBeInTheDocument();
  });

  it('renders files section when files are present', () => {
    render(<EventDetail event={mockEvent} />);
    expect(screen.getByText('Anexos')).toBeInTheDocument();
    expect(screen.getByText('laudo.pdf')).toBeInTheDocument();
    expect(screen.getByText('Visualizar')).toBeInTheDocument();
  });

  it('does not render files section when no files', () => {
    const eventWithoutFiles = { ...mockEvent, files: [] };
    render(<EventDetail event={eventWithoutFiles} />);
    expect(screen.queryByText('Anexos')).not.toBeInTheDocument();
  });

  it('renders edit and delete buttons', () => {
    render(<EventDetail event={mockEvent} />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Excluir')).toBeInTheDocument();
  });

  it('handles different event types', () => {
    const examEvent = { ...mockEvent, type: 'exame' };
    render(<EventDetail event={examEvent} />);
    const badge = screen.getByText('exame');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('handles event without description', () => {
    const eventWithoutDescription = { ...mockEvent, description: null };
    render(<EventDetail event={eventWithoutDescription} />);
    expect(screen.queryByText('Descrição')).not.toBeInTheDocument();
  });

  it('handles event without observations', () => {
    const eventWithoutObservations = { ...mockEvent, observation: undefined };
    render(<EventDetail event={eventWithoutObservations} />);
    expect(screen.queryByText('Observações')).not.toBeInTheDocument();
  });

  it('handles event without time information', () => {
    const eventWithoutTime = { ...mockEvent, startTime: undefined, endTime: undefined };
    render(<EventDetail event={eventWithoutTime} />);
    expect(screen.queryByText('10:00 - 11:00')).not.toBeInTheDocument();
  });
});

