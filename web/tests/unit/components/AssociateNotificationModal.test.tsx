import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AssociateNotificationModal from '@/components/AssociateNotificationModal'

describe('AssociateNotificationModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockUserId = 'test-user-id'

  const mockNotification = {
    id: 'notification-1',
    type: 'REPORT_RECEIVED',
    createdAt: '2024-10-25T10:00:00Z',
    payload: {
      doctorName: 'Dr. Silva',
      examDate: '2024-10-25',
      report: {
        fileName: 'laudo.pdf',
        fileContent: 'base64content'
      }
    }
  }

  const mockEvents = [
    {
      id: 'event-1',
      title: 'Consulta Cardiologia',
      date: '2024-10-25',
      startTime: '10:00',
      endTime: '11:00',
      type: 'CONSULTATION',
      professionalId: 'prof-1',
      files: []
    },
    {
      id: 'event-2',
      title: 'Exame Dermatologia',
      date: '2024-10-26',
      startTime: '14:00',
      endTime: '15:00',
      type: 'EXAM',
      professionalId: 'prof-2',
      files: [
        {
          slot: 'result',
          name: 'existing-laudo.pdf',
          url: 'http://example.com/existing-laudo.pdf'
        }
      ]
    },
    {
      id: 'event-3',
      title: 'Consulta Oftalmologia',
      date: '2025-12-05',
      startTime: '09:00',
      endTime: '09:30',
      type: 'CONSULTATION',
      professionalId: 'prof-1',
      files: []
    }
  ]

  const mockProfessionals = [
    { id: 'prof-1', name: 'Dr. Silva' },
    { id: 'prof-2', name: 'Dra. Santos' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch global para sempre retornar os dados corretos
    global.fetch = vi.fn((url: string, options?: any) => {
      if (url.includes('/api/professionals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProfessionals)
        } as Response)
      }
      // PUT /api/events com __force409 simula conflito
      if (url.includes('/api/events') && options && options.method === 'PUT' && (global as any).__force409) {
        return Promise.resolve({
          status: 409,
          ok: false,
          json: () => Promise.resolve({ error: 'File already exists' })
        } as Response)
      }
      // GET /api/events retorna eventos
      if (url.includes('/api/events') && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: mockEvents,
            pagination: {
              page: 1,
              limit: 1000,
              total: mockEvents.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            }
          })
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)
    }) as any
  })

  it('renders modal when open is true', () => {
    render(
      <AssociateNotificationModal
        notification={mockNotification}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userId={mockUserId}
      />
    )

    expect(screen.getByText('Associar a Evento Existente')).toBeInTheDocument()
    expect(screen.getByText('Selecione um evento')).toBeInTheDocument()
  })

  it('does not render modal when open is false', () => {
    render(
      <AssociateNotificationModal
        notification={mockNotification}
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userId={mockUserId}
      />
    )

    expect(screen.queryByText('Associar a Evento Existente')).not.toBeInTheDocument()
  })

  it('loads events and professionals on open', async () => {
    await act(async () => {
      render(
        <AssociateNotificationModal
          notification={mockNotification}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          userId={mockUserId}
        />
      )
    })

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const optionConsulta = options.find(opt => opt.getAttribute('value') === 'event-1');
      const optionExame = options.find(opt => opt.getAttribute('value') === 'event-2');
      const optionConsulta2 = options.find(opt => opt.getAttribute('value') === 'event-3');
      expect(optionConsulta).toBeDefined();
      expect(optionExame).toBeDefined();
      expect(optionConsulta2).toBeDefined();
      expect(optionConsulta?.textContent).toMatch(/CONSULTA.*Dr\. Silva.*25\/10\/2024.*10:00 - 11:00/);
      expect(optionExame?.textContent).toMatch(/EXAME.*Dra\. Santos.*26\/10\/2024.*14:00 - 15:00/);
      expect(optionConsulta2?.textContent).toMatch(/CONSULTA.*Dr\. Silva.*05\/12\/2025.*9:00 - 9:30/);
    });
  })

  it('associates notification to event successfully', async () => {
    await act(async () => {
      render(
        <AssociateNotificationModal
          notification={mockNotification}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          userId={mockUserId}
        />
      )
    })

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const option = options.find(opt => opt.getAttribute('value') === 'event-1');
      expect(option).toBeDefined();
      expect(option?.textContent).toMatch(/CONSULTA.*Dr\. Silva.*25\/10\/2024.*10:00 - 11:00/);
    });

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'event-1' } })

    const associateButton = screen.getByText('Associar')
    fireEvent.click(associateButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('shows overwrite prompt when event already has result file', async () => {
    await act(async () => {
      render(
        <AssociateNotificationModal
          notification={mockNotification}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          userId={mockUserId}
        />
      )
    })

    // Espera o carregamento inicial dos dados
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      if (!options.find(opt => opt.getAttribute('value') === 'event-2')) {
        // Exibe o DOM para depuração
        // eslint-disable-next-line no-console
        console.log('DOM atual:', document.body.innerHTML);
      }
      expect(options.length).toBeGreaterThan(0);
      const option = options.find(opt => opt.getAttribute('value') === 'event-2');
      expect(option).toBeDefined();
      expect(option?.textContent).toMatch(/EXAME.*Dra\. Santos.*26\/10\/2024.*14:00 - 15:00/);
    });

    // Seleciona o evento
    const select = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(select, { target: { value: 'event-2' } });
    });

    // Ativa o 409 para a próxima chamada
    (global as any).__force409 = true;
    // Clica no botão de associar
    const associateButton = screen.getByText('Associar');
    await act(async () => {
      fireEvent.click(associateButton);
    });
    delete (global as any).__force409;

    // Verifica se a mensagem de confirmação aparece
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Já existe um laudo para este evento'))).toBeInTheDocument();
    });
  })

  it('overwrites file when confirmed', async () => {
    await act(async () => {
      render(
        <AssociateNotificationModal
          notification={mockNotification}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          userId={mockUserId}
        />
      )
    })

    // Espera o carregamento inicial dos dados
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      const option = options.find(opt => opt.getAttribute('value') === 'event-2');
      expect(option).toBeDefined();
      expect(option?.textContent).toMatch(/EXAME.*Dra\. Santos.*26\/10\/2024.*14:00 - 15:00/);
    });

    // Seleciona o evento
    const select = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(select, { target: { value: 'event-2' } });
    });

    // Ativa o 409 para a próxima chamada
    (global as any).__force409 = true;
    // Clica no botão de associar
    const associateButton = screen.getByText('Associar');
    await act(async () => {
      fireEvent.click(associateButton);
    });
    delete (global as any).__force409;

    // Espera a mensagem de confirmação
    await waitFor(() => {
      expect(screen.getByText(/Já existe um laudo para este evento/)).toBeInTheDocument();
    });

    // Clica no botão de sobrescrever
    const overwriteButton = screen.getByText('Sobrescrever');
    await act(async () => {
      fireEvent.click(overwriteButton);
    });

    // Aguarda o recarregamento dos eventos
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    // Pequeno delay para garantir que o React processe o novo estado
    await act(async () => {
      await Promise.resolve();
    });

    // Seleciona novamente o evento após reload
    const selectReload = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(selectReload, { target: { value: 'event-2' } });
    });

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const option = options.find(opt => opt.getAttribute('value') === 'event-2');
      expect(option).toBeDefined();
      expect(option?.textContent).toMatch(/EXAME.*Dra\. Santos.*26\/10\/2024.*14:00 - 15:00/);
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  })

  it('cancels overwrite when user chooses cancel', async () => {
    await act(async () => {
      render(
        <AssociateNotificationModal
          notification={mockNotification}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          userId={mockUserId}
        />
      )
    })

    // Espera o carregamento inicial dos dados
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      const option = options.find(opt => opt.getAttribute('value') === 'event-2');
      expect(option).toBeDefined();
      expect(option?.textContent).toMatch(/EXAME.*Dra\. Santos.*26\/10\/2024.*14:00 - 15:00/);
    });

    // Seleciona o evento
    const select = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(select, { target: { value: 'event-2' } });
    });

    // Ativa o 409 para a próxima chamada
    (global as any).__force409 = true;
    // Clica no botão de associar
    const associateButton = screen.getByText('Associar');
    await act(async () => {
      fireEvent.click(associateButton);
    });
    delete (global as any).__force409;

    // Espera a mensagem de confirmação
    await waitFor(() => {
      expect(screen.getByText(/Já existe um laudo para este evento/)).toBeInTheDocument();
    });

    // Clica no botão de cancelar do prompt de sobrescrita
    const cancelButtons = screen.getAllByText('Cancelar');
    const overwriteCancelButton = cancelButtons.find(button =>
      button.parentElement?.parentElement?.classList.contains('bg-yellow-100')
    );
    await act(async () => {
      fireEvent.click(overwriteCancelButton!);
    });

    // Aguarda o recarregamento dos eventos
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    // Pequeno delay para garantir que o React processe o novo estado
    await act(async () => {
      await Promise.resolve();
    });

    // Seleciona novamente o evento após reload
    const selectReload = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(selectReload, { target: { value: 'event-2' } });
    });

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const option = options.find(opt => opt.getAttribute('value') === 'event-2');
      expect(option).toBeDefined();
      expect(option?.textContent).toMatch(/EXAME.*Dra\. Santos.*26\/10\/2024.*14:00 - 15:00/);
    });

    expect(screen.queryByText('Já existe um laudo para este evento.')).not.toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  })

  it('handles association error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      render(
        <AssociateNotificationModal
          notification={mockNotification}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          userId={mockUserId}
        />
      )
    })

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      const option = options.find(opt => opt.getAttribute('value') === 'event-1');
      expect(option).toBeDefined();
      expect(option?.textContent).toMatch(/CONSULTA.*Dr\. Silva.*25\/10\/2024.*10:00 - 11:00/);
    });

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'event-1' } })

    // Simula erro 500 na próxima chamada
  global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/professionals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProfessionals)
        } as Response)
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' })
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)
    }) as any;

    const associateButton = screen.getByText('Associar')
    fireEvent.click(associateButton)

    await waitFor(() => {
      expect(screen.getByText('Erro ao associar notificação.')).toBeInTheDocument()
    })

    // Aguarda o recarregamento dos eventos
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    // Pequeno delay para garantir que o React processe o novo estado
    await act(async () => {
      await Promise.resolve();
    });

    // Seleciona novamente o evento após reload
    const selectReload = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(selectReload, { target: { value: 'event-1' } });
    });

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const option = options.find(opt => opt.getAttribute('value') === 'event-1');
      expect(option).toBeDefined();
      expect(option?.textContent).toMatch(/CONSULTA.*Dr\. Silva.*25\/10\/2024.*10:00 - 11:00/);
    });

    consoleSpy.mockRestore()
  })

  it('closes modal when cancel is clicked', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProfessionals)
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents)
    })

    render(
      <AssociateNotificationModal
        notification={mockNotification}
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userId={mockUserId}
      />
    )

    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('handles direct notification (without payload)', async () => {
    const mockDirectNotification = {
      id: 'direct-notification-1',
      protocol: 'L02',
      title: 'Laudo - ko02',
      fileName: 'Laudo-Resultado.jpg',
      fileUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/',
      status: 'VIEWED',
      notificationId: 'notif-123',
      sentAt: '2025-11-21T22:33:49.123Z',
      receivedAt: '2025-11-21T22:44:57.773Z',
      viewedAt: '2025-11-21T22:45:02.696Z'
    }

    await act(async () => {
      render(
        <AssociateNotificationModal
          notification={mockDirectNotification}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          userId={mockUserId}
        />
      )
    })

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const option = options.find(opt => opt.getAttribute('value') === 'event-1');
      expect(option).toBeDefined();
    });

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'event-1' } })

    const associateButton = screen.getByText('Associar')
    fireEvent.click(associateButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('fetches external fileUrl for direct notification and associates it', async () => {
    const externalFileUrl = 'http://fileserver.example/test-file.jpg'
    const mockExternalNotification = {
      id: 'direct-external-1',
      protocol: 'L99',
      title: 'Laudo externo',
      fileName: 'externo.jpg',
      fileUrl: externalFileUrl,
      status: 'VIEWED',
      notificationId: 'notif-ext-1'
    }

    // Mock fetch to handle file download + APIs
    global.fetch = vi.fn((url: string, options?: any) => {
      if (url === externalFileUrl) {
        // retorna ArrayBuffer representando alguns bytes do arquivo
        const buf = Uint8Array.from([0xFF, 0xD8, 0xFF]).buffer
        return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(buf) } as any)
      }
      if (url.includes('/api/professionals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProfessionals) } as Response)
      }
      if (url.includes('/api/events') && options && options.method === 'PUT') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 'event-1', files: [{ slot: 'result', name: 'externo.jpg', url: '/uploads/event-1/result-externo.jpg' }] }) } as Response)
      }
      if (url.includes('/api/events') && (!options || options.method === 'GET')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEvents) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    }) as any

    await act(async () => {
      render(
        <AssociateNotificationModal
          notification={mockExternalNotification as any}
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          userId={mockUserId}
        />
      )
    })

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const option = options.find(opt => opt.getAttribute('value') === 'event-1');
      expect(option).toBeDefined();
    });

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'event-1' } })

    const associateButton = screen.getByText('Associar')
    fireEvent.click(associateButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})

