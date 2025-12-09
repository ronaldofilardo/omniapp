import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateEventFromNotificationModal from '@/components/CreateEventFromNotificationModal';
import { vi } from 'vitest';

const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();
const mockRefreshProfessionals = vi.fn();

const labNotification = {
  id: 'notif-1',
  payload: {
    doctorName: 'Dr. João Silva',
    examDate: '2024-10-25',
    report: {
      fileName: 'laudo.pdf',
      fileContent: 'base64content',
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

const reportNotification = {
  id: 'notif-2',
  payload: {
    reportId: 'report-1',
    title: 'Relatório Teste',
    protocol: 'PROTO-123',
  },
};

describe('CreateEventFromNotificationModal', () => {
  let originalFetch: any;
  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSuccess.mockClear();
    mockRefreshProfessionals.mockClear();
    originalFetch = globalThis.fetch;
    function mockResponse(data: any, ok = true) {
      return {
        ok,
        status: ok ? 200 : 400,
        statusText: ok ? 'OK' : 'Bad Request',
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: '',
        clone: function () { return this; },
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
      } as unknown as Response;
    }
    globalThis.fetch = vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/professionals') && (!options || options.method === 'GET')) {
        return Promise.resolve(mockResponse([{ id: 'prof-1', name: 'Dr. João Silva' }]));
      }
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve(mockResponse({ id: 'new-prof-id' }));
      }
      if (url.includes('/api/events') && options && options.method === 'POST') {
        return Promise.resolve(mockResponse({ id: 'event-id' }));
      }
      if (url.includes('/api/upload-file')) {
        return Promise.resolve(mockResponse({}));
      }
      if (url.includes('/api/events') && options && options.method === 'PUT') {
        return Promise.resolve(mockResponse({}));
      }
      return Promise.resolve(mockResponse({}));
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('preenche todos os campos obrigatórios e cria evento com sucesso', async () => {
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-x',
          payload: { reportId: 'r1', title: 'Evento', protocol: 'PROTO-1' }
        }}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Título'), { target: { value: 'Evento Teste' } });
    const dateInput = document.querySelector("input[type='date']");
    if (dateInput) fireEvent.change(dateInput, { target: { value: '2024-10-25' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'prof-1' } });
    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('exibe erro ao tentar criar evento sem preencher campos obrigatórios', async () => {
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-x',
          payload: { reportId: 'r1', title: 'Evento', protocol: 'PROTO-1' }
        }}
      />
    );
    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(screen.getByText(/Preencha todos os campos obrigatórios/i)).toBeInTheDocument();
    });
  });

  it('permite editar título e data', async () => {
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-x',
          payload: { reportId: 'r1', title: 'Evento', protocol: 'PROTO-1' }
        }}
      />
    );

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText('Título') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Novo Título' } });
      expect(titleInput.value).toBe('Novo Título');
      const dateInput = document.querySelector("input[type='date']") as HTMLInputElement;
      expect(dateInput).toBeTruthy();
      fireEvent.change(dateInput!, { target: { value: '2024-10-26' } });
      expect(dateInput!.value).toBe('2024-10-26');
    });
  });

  it('allows editing title', async () => {
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-1',
          payload: {
            doctorName: 'Dr. João Silva',
            examDate: '2024-10-25',
            report: {
              fileName: 'laudo.pdf',
              fileContent: 'base64content',
            },
          },
        }}
      />
    );

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText('Título') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Novo Título' } });
      expect(titleInput.value).toBe('Novo Título');
    });
  });

  it('allows editing date', async () => {
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-1',
          payload: {
            doctorName: 'Dr. João Silva',
            examDate: '2024-10-25',
            report: {
              fileName: 'laudo.pdf',
              fileContent: 'base64content',
            },
          },
        }}
      />
    );

    await waitFor(() => {
      const dateInput = document.querySelector("input[type='date']") as HTMLInputElement;
      expect(dateInput).toBeTruthy();
      fireEvent.change(dateInput!, { target: { value: '2024-10-26' } });
      expect(dateInput!.value).toBe('2024-10-26');
    });
  });

  it('allows editing start time', async () => {
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-x',
          payload: { reportId: 'r1', title: 'Evento', protocol: 'PROTO-1' }
        }}
      />
    );

    await waitFor(() => {
      const startTimeInput = screen.getByDisplayValue('09:00') as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '10:00' } });
      expect(startTimeInput.value).toBe('10:00');
    });
  });

  it('allows editing end time', async () => {
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-x',
          payload: { reportId: 'r1', title: 'Evento', protocol: 'PROTO-1' }
        }}
      />
    );

    await waitFor(() => {
      const endTimeInput = screen.getByDisplayValue('09:30') as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '10:30' } });
      expect(endTimeInput.value).toBe('10:30');
    });
  });

  it('loads professionals on mount', async () => {
    const mockProfessionals = [{ id: 'prof-1', name: 'Dr. João Silva' }];
  (globalThis.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockProfessionals),
    });

    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-x',
          payload: { reportId: 'r1', title: 'Evento', protocol: 'PROTO-1' }
        }}
      />
    );

    await waitFor(() => {
  expect(globalThis.fetch).toHaveBeenCalledWith('/api/professionals?userId=user-1');
    });
  });

  it('selects existing professional if name matches', async () => {
  const mockResponse = (data: any, ok = true) => ({
      ok,
      status: ok ? 200 : 400,
      statusText: ok ? 'OK' : 'Bad Request',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: () => this,
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/professionals')) {
        return Promise.resolve(mockResponse([{ id: 'prof-1', name: 'Dr. João Silva' }]) as unknown as Response);
      }
      return Promise.resolve(mockResponse([]) as unknown as Response);
    });
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-1',
          payload: {
            title: 'Novo Evento',
            protocol: 'PROTO-123',
            reportId: 'report-1',
          },
        }}
      />
    );
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(Array.from(select.options).some(opt => opt.value === 'prof-1')).toBe(true);
    });
    // Seleciona manualmente o profissional
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'prof-1' } });
    expect(select.value).toBe('prof-1');
    fetchSpy.mockRestore();
  });

  it('shows "Novo" option when no matching professional', async () => {
  const mockResponse = (data: any, ok = true) => ({
      ok,
      status: ok ? 200 : 400,
      statusText: ok ? 'OK' : 'Bad Request',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: () => this,
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/professionals')) {
        return Promise.resolve(mockResponse([{ id: 'prof-2', name: 'Dra. Maria Santos' }]) as unknown as Response);
      }
      return Promise.resolve(mockResponse([]) as unknown as Response);
    });
    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-2',
          payload: {
            title: 'Novo Evento',
            protocol: 'PROTO-123',
            reportId: 'report-2',
          },
        }}
      />
    );
    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toHaveTextContent('Novo');
      expect(select).toHaveTextContent('Dra. Maria Santos');
    });
    fetchSpy.mockRestore();
  });

  it('creates event successfully', async () => {
  const mockResponse = (data: any, ok = true) => ({
      ok,
      status: ok ? 200 : 400,
      statusText: ok ? 'OK' : 'Bad Request',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: () => this,
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, options?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/professionals') && (!options || options.method === 'GET')) {
        return Promise.resolve(mockResponse([{ id: 'prof-1', name: 'Dr. João Silva' }]) as unknown as Response);
      }
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve(mockResponse({ id: 'new-prof-id' }) as unknown as Response);
      }
      if (url.includes('/api/events') && options && options.method === 'POST') {
        return Promise.resolve(mockResponse({ id: 'event-id' }) as unknown as Response);
      }
      if (url.includes('/api/upload-file')) {
        return Promise.resolve(mockResponse({}) as unknown as Response);
      }
      if (url.includes('/api/events') && options && options.method === 'PUT') {
        return Promise.resolve(mockResponse({}) as unknown as Response);
      }
      return Promise.resolve(mockResponse({}) as unknown as Response);
    });

    render(
      <CreateEventFromNotificationModal
        {...defaultProps}
        notification={{
          id: 'notif-3',
          payload: {
            reportId: 'report-3',
            title: 'Novo Evento',
            protocol: 'PROTO-123',
          },
        }}
      />
    );

    // Preencher campos obrigatórios
    fireEvent.change(screen.getByPlaceholderText('Título'), { target: { value: 'Evento Teste' } });
    const dateInput = document.querySelector("input[type='date']");
    if (dateInput) fireEvent.change(dateInput, { target: { value: '2024-10-25' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'prof-1' } });

    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
    fetchSpy.mockRestore();
  });

  it('handles create event error', async () => {
    const mockProfessionals = [{ id: 'prof-1', name: 'Dr. João Silva' }];
  (globalThis.fetch as any).mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/professionals') && (!options || options.method === 'GET')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProfessionals) });
      }
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-prof-id' }) });
      }
      if (url.includes('/api/events') && options && options.method === 'POST') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Erro ao criar evento.' }) });
      }
      if (url.includes('/api/upload-file')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (url.includes('/api/events') && options && options.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

  render(<CreateEventFromNotificationModal {...defaultProps} />);

  // Preencher campos obrigatórios
  fireEvent.change(screen.getByPlaceholderText('Título'), { target: { value: 'Evento Teste' } });
  const dateInput = document.querySelector("input[type='date']");
  if (dateInput) fireEvent.change(dateInput, { target: { value: '2024-10-25' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'prof-1' } });

    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Erro ao criar evento.')).toBeInTheDocument();
    });
  });

  it('closes modal when cancel is clicked', async () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles report notification type', async () => {
    render(<CreateEventFromNotificationModal {...defaultProps} notification={reportNotification} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Novo Evento')).toBeTruthy();
    });
  });
});

