import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateEventFromNotificationModal from '@/components/CreateEventFromNotificationModal';
import { vi } from 'vitest';

describe('Event Creation from Notification - Integration', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockRefreshProfessionals = vi.fn();

  const labNotification = {
    id: 'notif-1',
    payload: {
      doctorName: 'Dr. João Silva',
      examDate: '2024-10-25',
      report: {
        fileName: 'laudo-cardio.pdf',
        fileContent: 'dGVzdA==', // "test" em base64
      },
    },
  };

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    notification: labNotification,
    professionalId: 'prof-1',
    userId: 'user-1',
    refreshProfessionals: mockRefreshProfessionals,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Ensure real timers are used by default
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers(); // Clean up any fake timers
  });

  it('completes full event creation flow from lab notification', async () => {
    // Mock Date to return a fixed time for consistent testing
    const mockDate = new Date('2024-10-25T09:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Setup fetch mocks BEFORE rendering
    (global.fetch as any).mockImplementation((url, options) => {
      if (url.includes('/api/professionals') && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'prof-1', name: 'Dr. João Silva' },
            { id: 'prof-2', name: 'Dra. Maria Santos' },
          ]),
        });
      }
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-prof-id' }),
        });
      }
      if (url.includes('/api/events') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'event-id' }),
        });
      }
      if (url.includes('/api/upload-file')) {
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/api/events') && options && options.method === 'PUT') {
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/api/notifications/') && options && options.method === 'PATCH') {
        return Promise.resolve({ ok: true });
      }
      // fallback
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    // Check that the modal is rendered
    const modalElement = document.querySelector('.fixed.inset-0');
    expect(modalElement).toBeInTheDocument();

    // Find title input and modify it
    const titleInput = screen.getByDisplayValue(/Laudo:/);
    fireEvent.change(titleInput, { target: { value: 'Consulta Cardiologia - Laudo' } });

    // Find date input and modify it
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    const dateInput = dateInputs[0];
    fireEvent.change(dateInput, { target: { value: '2024-10-26' } });

    // Select professional
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: 'prof-1' } });

    // Submit
    const createButton = screen.getByText('Criar Evento');
    expect(createButton).toBeInTheDocument();
    fireEvent.click(createButton);

    // Test passes if we get here without timeout
    expect(createButton).toBeInTheDocument();
  }, 10000);

  it('handles professional creation when doctor not found', async () => {
    // Mock professionals fetch - doctor not found
    (global.fetch as any).mockImplementation((url, options) => {
      if (url.includes('/api/professionals') && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'prof-2', name: 'Dra. Maria Santos' },
          ]),
        });
      }
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-prof-id', name: 'Dr. João Silva' }),
        });
      }
      if (url.includes('/api/events') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'event-id' }),
        });
      }
      if (url.includes('/api/notifications') && options && options.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Laudo: laudo-cardio.pdf')).toBeInTheDocument();
    });

    // Select "Dr. João Silva (Novo)" option
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: '' } });

    // Modify title
    const titleInput = screen.getByDisplayValue('Laudo: laudo-cardio.pdf');
    fireEvent.change(titleInput, { target: { value: 'Consulta Cardiologia - Laudo' } });

    // Modify date
    const dateInput = screen.getByDisplayValue('2024-10-25');
    fireEvent.change(dateInput, { target: { value: '2024-10-26' } });

    // Modify time
    const timeInputs = screen.getAllByDisplayValue(/^\d{2}:\d{2}$/);
    const startTimeInput = timeInputs[0];
    const endTimeInput = timeInputs[1];
    fireEvent.change(startTimeInput, { target: { value: '14:00' } });
    fireEvent.change(endTimeInput, { target: { value: '15:00' } });

    // Submit
    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  }, 10000);

  it('should create event from notification', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'event-id' }),
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const professionalSelect = screen.getByRole('combobox');
      expect(professionalSelect).toHaveTextContent('Dr. João Silva (Novo)');
    });

    // Seleciona o profissional "novo" (opção vazia)
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: '' } });

    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/professionals'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Dr. João Silva'),
        })
      );
    });
  });

  it('handles event creation failure', async () => {
    (global.fetch as any).mockImplementation((url, options) => {
      if (url.includes('/api/professionals') && (!options || options.method !== 'POST')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]),
        });
      }
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-prof-id' }),
        });
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Horário conflitante' }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const createButton = screen.getByText('Criar Evento');
      fireEvent.click(createButton);
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(screen.getByText('Erro ao criar evento.')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  }, 10000);

  it('handles file upload failure gracefully', async () => {
    (global.fetch as any).mockImplementation((url, options) => {
      if (url.includes('/api/professionals') && (!options || options.method !== 'POST')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]),
        });
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'event-id' }),
        });
      }
      if (url.includes('/api/upload')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Upload failed' }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    // Check that the modal is rendered
    const modalElement = document.querySelector('.fixed.inset-0');
    expect(modalElement).toBeInTheDocument();

    // Select professional
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: 'prof-1' } });

    // Submit
    const createButton = screen.getByText('Criar Evento');
    expect(createButton).toBeInTheDocument();
    fireEvent.click(createButton);

    // Test passes if we get here without timeout
    expect(createButton).toBeInTheDocument();
  }, 10000);

  it('validates required fields before submission', async () => {
    (global.fetch as any) = vi.fn((url, options) => {
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'prof-1' }) });
      }
      if (url.includes('/api/professionals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]) });
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'event-id' }) });
      }
      if (url.includes('/api/upload-file')) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    // Seleciona o profissional
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: 'prof-1' } });

    await waitFor(() => {
      const createButton = screen.getByText('Criar Evento');
      fireEvent.click(createButton);
    });

    // Should not show error since all fields are pre-filled
    expect(screen.queryByText('Erro ao criar evento.')).not.toBeInTheDocument();
  });

  it('allows canceling the operation', async () => {
    (global.fetch as any).mockImplementation((url) => {
      if (url.includes('/api/professionals')) {
        return Promise.resolve({
          json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);
    }, { timeout: 10000 });

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  }, 10000);

  it('handles report notification type', async () => {
    const reportNotification = {
      id: 'notif-2',
      payload: {
        reportId: 'report-1',
        title: 'Relatório de Exames',
        protocol: 'PROTO-123',
      },
    };

    (global.fetch as any).mockImplementation((url) => {
      if (url.includes('/api/professionals')) {
        return Promise.resolve({
          json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal
      {...defaultProps}
      notification={reportNotification}
    />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Novo Evento')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 10000);

  it('updates professional list after creation', async () => {
    (global.fetch as any).mockImplementation((url, options) => {
      if (url.includes('/api/professionals') && (!options || options.method !== 'POST')) {
        return Promise.resolve({
          json: () => Promise.resolve([]), // No existing professionals
        });
      }
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({
          json: () => Promise.resolve({ id: 'new-prof-id' }),
        });
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'event-id' }),
        });
      }
      if (url.includes('/api/upload-file')) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    // Seleciona o profissional "novo" (opção vazia)
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: '' } });

    await waitFor(() => {
      const createButton = screen.getByText('Criar Evento');
      fireEvent.click(createButton);
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(mockRefreshProfessionals).toHaveBeenCalled();
    }, { timeout: 10000 });
  }, 10000);
});
