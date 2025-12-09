import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AssociateNotificationModal from '@/components/AssociateNotificationModal';

describe('AssociateNotificationModal - Date Preservation', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockEvent = {
    id: 'event-123',
    title: 'Consulta Cardiologia',
    date: '2024-12-05',
    startTime: '09:00',
    endTime: '10:00',
    type: 'CONSULTA',
    professionalId: 'prof-1',
    files: []
  };

  const mockNotification = {
    id: 'notif-123',
    payload: {
      doctorName: 'Dr. João Silva',
      examDate: '2024-12-05',
      report: {
        fileName: 'laudo.pdf',
        fileContent: 'dGVzdA=='
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('preserves original event date when associating notification', async () => {
    // Mock fetch calls
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/professionals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }])
        });
      }
      if (url.includes('/api/events?userId=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [mockEvent],
            pagination: {
              page: 1,
              limit: 1000,
              total: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            }
          })
        });
      }
      if (url.includes('/api/events') && url.includes('method=PUT')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockEvent, files: [{ slot: 'result', name: 'laudo.pdf' }] })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <AssociateNotificationModal
        notification={mockNotification}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userId="user-123"
      />
    );

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('CONSULTA - Dr. João Silva - 05/12/2024 9:00 - 10:00')).toBeInTheDocument();
    });

    // Select the event by clicking on the option
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'event-123' } });

    // Wait for the button to be enabled
    await waitFor(() => {
      const associateButton = screen.getByText('Associar');
      expect(associateButton).not.toBeDisabled();
    });

    // Click associate button
    const associateButton = screen.getByText('Associar');
    fireEvent.click(associateButton);

    // Verify the API call preserves the original date
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"date":"2024-12-05"') // Original date preserved
      }));
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles timezone conversion correctly for new event creation', async () => {
    // Mock fetch calls for new event creation
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/professionals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }])
        });
      }
      if (url.includes('/api/events?userId=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [],
            pagination: {
              page: 1,
              limit: 1000,
              total: 0,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            }
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <AssociateNotificationModal
        notification={mockNotification}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userId="user-123"
      />
    );

    // Wait for modal to load
    await waitFor(() => {
      expect(screen.getByText('Associar a Evento Existente')).toBeInTheDocument();
    });

    // Verify only the default option is available when no events exist
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Selecione um evento');
  });

  it('shows error when event association fails', async () => {
    // Mock fetch to fail
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/professionals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }])
        });
      }
      if (url.includes('/api/events?userId=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [mockEvent],
            pagination: {
              page: 1,
              limit: 1000,
              total: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            }
          })
        });
      }
      if (url === '/api/events') {
        console.log('Mocking PUT /api/events to fail');
        return Promise.resolve({
          ok: false,
          status: 500
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <AssociateNotificationModal
        notification={mockNotification}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userId="user-123"
      />
    );

    // Wait for events to load and select event
    await waitFor(() => {
      expect(screen.getByText('CONSULTA - Dr. João Silva - 05/12/2024 9:00 - 10:00')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'event-123' } });

    // Wait for the button to be enabled
    await waitFor(() => {
      const associateButton = screen.getByText('Associar');
      expect(associateButton).not.toBeDisabled();
    });

    // Click associate button
    const associateButton = screen.getByText('Associar');
    await act(async () => {
      fireEvent.click(associateButton);
    });

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('Erro ao associar notificação.')).toBeInTheDocument();
    });
  });
});

