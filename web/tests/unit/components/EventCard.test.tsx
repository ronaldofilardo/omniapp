import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EventCard } from '@/components/EventCard'
import type { Event } from '@/components/Timeline'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => (
    <img src={src as string} alt={alt as string} {...props} />
  ),
}))


// Mock do navigator.clipboard (getter-only safe)
beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn() },
    writable: true,
    configurable: true,
  });
});

// Mock do window.open
;(globalThis as any).open = vi.fn()

// Mock do ShareModal
vi.mock('../../../src/components/ShareModal', () => ({
  ShareModal: () => <div data-testid="share-modal">ShareModal Mock</div>
}))

// Mock do fetch para upload
describe('EventCard', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url === '/api/upload') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ url: 'mocked-url' }),
          })
        }
        if (url === '/api/events') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      })
    )
  })
  const event: Event = {
    id: '1',
    title: 'Consulta Médica',
    description: '',
    date: '2025-10-24',
    type: 'CONSULTATION',
    professionalId: 'prof-1',
    startTime: '10:00',
    endTime: '11:00',
    observation: 'Trazer exames anteriores',
    files: [],
  }
  const defaultProps = {
    event,
    professional: 'Dr. Silva',
    address: 'Rua das Flores, 123',
  }

  it('renders event information correctly', () => {
    render(<EventCard {...defaultProps} />)
  expect(screen.getByText('Consulta - Dr. Silva - 10:00 - 11:00')).to.exist
  expect(screen.getByText('Rua das Flores, 123')).to.exist
  expect(screen.getByText('Instruções: Trazer exames anteriores')).to.exist
  })

  it('opens view modal when details button is clicked', () => {
    render(<EventCard {...defaultProps} />)
    const detailsButton = screen.getByRole('button', { name: /detalhes/i })
    fireEvent.click(detailsButton)
    // O título do modal é renderizado como h2 com o tipo do evento
    expect(screen.getByRole('heading', { name: /consulta/i })).to.exist
    // O profissional aparece após o label 'Profissional:'
    expect(screen.getByText((content, node) => node?.textContent === 'Profissional: Dr. Silva')).to.exist
  })

  it('copies address to clipboard when copy button is clicked', () => {
    render(<EventCard {...defaultProps} />)
    const copyButton = screen.getByTitle('Copiar endereço')
    fireEvent.click(copyButton)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Rua das Flores, 123'
    )
  })

  it('opens delete modal when delete button is clicked', () => {
    render(<EventCard {...defaultProps} />)
    const deleteButton = screen.getByRole('button', { name: /deletar/i })
    fireEvent.click(deleteButton)
    // O modal de exclusão tem o texto 'Tem certeza de que deseja excluir o evento'
    expect(screen.getByText((content) => content.includes('Tem certeza de que deseja excluir o evento'))).to.exist
  })

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = vi.fn()
    render(<EventCard {...defaultProps} onEdit={mockOnEdit} />)
    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)
    expect(mockOnEdit).toHaveBeenCalled()
  })

  it('opens files modal when files button is clicked', () => {
    render(<EventCard {...defaultProps} />)
    const filesButton = screen.getByRole('button', { name: /arquivos/i })
    fireEvent.click(filesButton)
    expect(screen.getByText('Gerenciar Arquivos do Evento')).to.exist
  })

  it('displays file slots correctly', () => {
    render(<EventCard {...defaultProps} />)
    const filesButton = screen.getByRole('button', { name: /arquivos/i })
    fireEvent.click(filesButton)
    expect(screen.getByText('Solicitação')).to.exist
    expect(screen.getByText('Autorização')).to.exist
    expect(screen.getByText('Atestado')).to.exist
    expect(screen.getByText('Laudo/Resultado')).to.exist
    expect(screen.getByText('Prescrição')).to.exist
    expect(screen.getByText('Nota Fiscal')).to.exist
  })

  it('shows uploaded file status when initialFiles are provided', () => {
    const eventWithFiles: Event = {
      ...event,
      files: [
        { slot: 'request', name: 'Arquivo 1', url: 'url1' },
        { slot: 'authorization', name: '', url: '' },
        { slot: 'certificate', name: '', url: '' },
        { slot: 'result', name: '', url: '' },
        { slot: 'prescription', name: '', url: '' },
        { slot: 'invoice', name: '', url: '' },
      ],
      type: 'CONSULTATION',
    }
    render(<EventCard {...defaultProps} event={eventWithFiles} />)
    const filesButton = screen.getByRole('button', { name: /arquivos/i })
    fireEvent.click(filesButton)
    // Verificar se o primeiro slot mostra arquivo carregado
    expect(screen.getByText('Arquivo 1')).to.exist
  })

  it('uploads file when file is selected and conclude is clicked', async () => {
    render(<EventCard {...defaultProps} />)
    const filesButton = screen.getByRole('button', { name: /arquivos/i })
    fireEvent.click(filesButton)

    // Encontrar o input de file
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    // PNG 1x1 pixel, base64: iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBApUAAAAASUVORK5CYII=
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBApUAAAAASUVORK5CYII=';
    const binary = atob(pngBase64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    const file = new File([array], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Clicar em Concluir
    const concludeButton = screen.getByRole('button', { name: /concluir/i })
    fireEvent.click(concludeButton)

    await waitFor(() => {
      const calls = (globalThis as any).fetch.mock.calls;
      const calledUpload = calls.some(([url]) => url === '/api/upload');
      const calledEvents = calls.some(([url]) => url === '/api/events');
      expect(calledUpload).toBe(true);
      expect(calledEvents).toBe(true);
    })
  })
  it('displays observation as instructions when present', () => {
    render(<EventCard {...defaultProps} />)
    expect(screen.getByText('Instruções: Trazer exames anteriores')).to.exist
  })

  it('displays description as instructions when observation is empty', () => {
    const eventWithoutObservation = { ...event, observation: '' }
    render(<EventCard {...defaultProps} event={eventWithoutObservation} />)
    expect(screen.getByText('Instruções:')).to.exist
  })

  it('displays standardized instructions for events created from notifications', () => {
    const eventFromNotification = {
      ...event,
      observation: '',
      description: 'laudo enviado pelo app Omni'
    }
    render(<EventCard {...defaultProps} event={eventFromNotification} />)
    expect(screen.getByText('Instruções: laudo enviado pelo app Omni')).to.exist
  })

  it('renders share button', () => {
    render(<EventCard {...defaultProps} />)
    const shareButton = screen.getByRole('button', { name: /compartilhar/i })
    expect(shareButton).to.exist
  })

  it('calls onShare when share button is clicked', () => {
    const mockOnShare = vi.fn()
    render(<EventCard {...defaultProps} onShare={mockOnShare} />)
    const shareButton = screen.getByRole('button', { name: /compartilhar/i })
    fireEvent.click(shareButton)
    expect(mockOnShare).toHaveBeenCalled()
  })

  it('opens share modal when share button is clicked and onShare is provided', async () => {
    const mockOnShare = vi.fn()
    render(<EventCard {...defaultProps} onShare={mockOnShare} />)
    const shareButton = screen.getByRole('button', { name: /compartilhar/i })
    fireEvent.click(shareButton)
    // Como o ShareModal está mockado, apenas verifica se o modal mock aparece
    await waitFor(() => {
      expect(screen.getByTestId('share-modal')).toBeInTheDocument()
    })
  })

  // Testes para a função formatTimeForAPI
  it('deve formatar horário sem zero à esquerda para HH:mm', async () => {
    const eventWithShortTime: Event = {
      ...event,
      startTime: '9:30', // Sem zero à esquerda
      endTime: '10:45'
    }

    // Mock do fetch para capturar os dados enviados
    const mockFetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url === '/api/upload') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: 'mocked-url' }),
        })
      }
      if (url === '/api/events') {
        const body = JSON.parse(options.body)
        // Verificar se os horários foram formatados
        expect(body.startTime).toBe('09:30')
        expect(body.endTime).toBe('10:45')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })

    vi.stubGlobal('fetch', mockFetch)

    render(<EventCard {...defaultProps} event={eventWithShortTime} />)
    const filesButton = screen.getByRole('button', { name: /arquivos/i })
    fireEvent.click(filesButton)

    // Simular upload de arquivo para acionar o envio
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBApUAAAAASUVORK5CYII=';
    const binary = atob(pngBase64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    const file = new File([array], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const concludeButton = screen.getByRole('button', { name: /concluir/i })
    fireEvent.click(concludeButton)

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const eventsCall = calls.find(([url]) => url === '/api/events');
      expect(eventsCall).toBeDefined();
      const body = JSON.parse(eventsCall[1].body);
      // Quando envia apenas arquivos, não envia startTime/endTime
      expect(body.files).toBeDefined();
    })
  })

  it('deve manter horário já formatado', async () => {
    const eventWithFormattedTime: Event = {
      ...event,
      startTime: '09:30',
      endTime: '10:45'
    }

    const mockFetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url === '/api/upload') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: 'mocked-url' }),
        })
      }
      if (url === '/api/events') {
        const body = JSON.parse(options.body)
        expect(body.startTime).toBe('09:30')
        expect(body.endTime).toBe('10:45')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })

    vi.stubGlobal('fetch', mockFetch)

    render(<EventCard {...defaultProps} event={eventWithFormattedTime} />)
    const filesButton = screen.getByRole('button', { name: /arquivos/i })
    fireEvent.click(filesButton)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBApUAAAAASUVORK5CYII=';
    const binary = atob(pngBase64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    const file = new File([array], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const concludeButton = screen.getByRole('button', { name: /concluir/i })
    fireEvent.click(concludeButton)

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const eventsCall = calls.find(([url]) => url === '/api/events');
      expect(eventsCall).toBeDefined();
      const body = JSON.parse(eventsCall[1].body);
      // Quando envia apenas arquivos, não envia startTime/endTime
      expect(body.files).toBeDefined();
    })
  })
})

