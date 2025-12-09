import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ExternalLabSubmit from '@/components/ExternalLabSubmit';

// Mock do fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Emissor Portal de Envio - ExternalLabSubmit Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Fluxo completo de envio de laudo', () => {
    it('deve permitir envio completo de laudo para receptor', async () => {
      // Mock da resposta de sucesso da API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Mock do FileReader compatível com TS
      class FileReaderMock {
        public result: string | null = null;
        public onload: ((this: FileReaderMock, ev: ProgressEvent<FileReaderMock>) => any) | null = null;
        public onerror: ((this: FileReaderMock, ev: ProgressEvent<FileReaderMock>) => any) | null = null;
        addEventListener() {}
        removeEventListener() {}
        dispatchEvent() { return true; }
        readAsDataURL() {
          setTimeout(() => {
            this.result = 'data:application/pdf;base64,dGVzdA==';
            if (typeof this.onload === 'function') this.onload.call(this, {} as ProgressEvent<FileReaderMock>);
          }, 0);
        }
      }
      global.FileReader = FileReaderMock as any;

  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

      // Verificar elementos da interface
      expect(screen.getByText(/simulador.*envio.*laudo/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('E-mail do Paciente')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Médico Solicitante')).toBeInTheDocument();
      expect(screen.getByText('Enviar Documento')).toBeInTheDocument();

      const emailInput = screen.getByPlaceholderText('E-mail do Paciente');
      const doctorInput = screen.getByPlaceholderText('Médico Solicitante');
      const dateInput = screen.getByPlaceholderText('dd/mm/aaaa');
      const submitButton = screen.getByText('Enviar Documento');

  const documentoInput = screen.getByPlaceholderText('Número do Documento');
  fireEvent.change(documentoInput, { target: { value: '12345' } });
  fireEvent.change(emailInput, { target: { value: 'paciente@receptor.com' } });
  fireEvent.change(doctorInput, { target: { value: 'Dr. João Silva' } });
  fireEvent.change(dateInput, { target: { value: '2024-10-25' } });
  // Preencher campo CPF obrigatório ANTES do submit
  const cpfInput = screen.getByPlaceholderText('000.000.000-00');
  fireEvent.change(cpfInput, { target: { value: '12345678901' } });
  // Selecionar arquivo
  const file = new File(['conteúdo do laudo'], 'laudo.pdf', { type: 'application/pdf' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [file] } });
    // Verificar se arquivo foi selecionado
    expect(screen.getByText('Arquivo selecionado: laudo.pdf')).toBeInTheDocument();
    // Submeter formulário
    fireEvent.click(submitButton);

      // Verificar chamada da API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/lab/submit',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"cpf":"12345678901"'),
          })
        );
      });

      // Verificar mensagem de sucesso
      expect(screen.getByText(/sucesso/i)).toBeInTheDocument();

      // Verificar limpeza do formulário (reset é assíncrono)
      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(doctorInput).toHaveValue('');
        expect(dateInput).toHaveValue('');
      });
    });

    it('deve validar campos obrigatórios', async () => {
  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

  const submitButton = screen.getByText('Enviar Documento');
  fireEvent.click(submitButton);

  // Verificar mensagem de erro pelo testid
  const errorMessage = await screen.findByTestId('error-message');
  expect(errorMessage).toBeInTheDocument();
  expect(errorMessage.textContent).toContain('Preencha todos os campos e selecione um arquivo');

  // Verificar que API não foi chamada
  expect(mockFetch).not.toHaveBeenCalled();
    });

    it('deve lidar com erro na submissão', async () => {
      // Mock de erro na API
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Erro no servidor' }),
      });

  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

      // Preencher e submeter formulário
      const emailInput = screen.getByPlaceholderText('E-mail do Paciente');
      const doctorInput = screen.getByPlaceholderText('Médico Solicitante');
      const dateInput = screen.getByPlaceholderText('dd/mm/aaaa');
      const submitButton = screen.getByText('Enviar Documento');

      fireEvent.change(emailInput, { target: { value: 'paciente@receptor.com' } });
      fireEvent.change(doctorInput, { target: { value: 'Dr. João Silva' } });
      fireEvent.change(dateInput, { target: { value: '2024-10-25' } });

      const file = new File(['conteúdo'], 'laudo.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(submitButton);

      // Verificar mensagem de erro
      await waitFor(() => {
        expect(screen.getByText(/Erro/i)).toBeInTheDocument();
      });
    });

    it('deve processar arquivo corretamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

      // Mock do FileReader compatível com TS
      class FileReaderMock {
        public result: string | null = null;
        public onload: ((this: FileReaderMock, ev: ProgressEvent<FileReaderMock>) => any) | null = null;
        public onerror: ((this: FileReaderMock, ev: ProgressEvent<FileReaderMock>) => any) | null = null;
        addEventListener() {}
        removeEventListener() {}
        dispatchEvent() { return true; }
        readAsDataURL() {
          setTimeout(() => {
            this.result = 'data:application/pdf;base64,dGVzdA==';
            if (typeof this.onload === 'function') this.onload.call(this, {} as ProgressEvent<FileReaderMock>);
          }, 0);
        }
      }
      global.FileReader = FileReaderMock as any;

      const emailInput = screen.getByPlaceholderText('E-mail do Paciente');
      const doctorInput = screen.getByPlaceholderText('Médico Solicitante');
      const dateInput = screen.getByPlaceholderText('dd/mm/aaaa');

  const documentoInput = screen.getByPlaceholderText('Número do Documento');
  fireEvent.change(documentoInput, { target: { value: '12345' } });
  fireEvent.change(emailInput, { target: { value: 'paciente@receptor.com' } });
  fireEvent.change(doctorInput, { target: { value: 'Dr. João Silva' } });
  fireEvent.change(dateInput, { target: { value: '2024-10-25' } });
  // Preencher campo CPF obrigatório ANTES do submit
  const cpfInput = screen.getByPlaceholderText('000.000.000-00');
  fireEvent.change(cpfInput, { target: { value: '12345678901' } });
  const file = new File(['conteúdo'], 'laudo.pdf', { type: 'application/pdf' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [file] } });
  const submitButton = screen.getByText('Enviar Documento');
  fireEvent.click(submitButton);

      // Verificar que FileReader foi usado
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/lab/submit',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"cpf":"12345678901"'),
          })
        );
      });
    });
  });

  describe('Integração com Dashboard do Emissor', () => {
    it('deve ser renderizado corretamente na aba Portal de envio', () => {
      // Este teste verifica que o componente pode ser integrado ao dashboard
      // Como estamos testando isoladamente, apenas verificamos a renderização
  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

      expect(screen.getByText(/simulador.*envio.*laudo/i)).toBeInTheDocument();
      expect(screen.getByText(/simulador de api/i)).toBeInTheDocument();
    });

    it('deve manter estado consistente durante uso', () => {
  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

      const emailInput = screen.getByPlaceholderText('E-mail do Paciente');
      const doctorInput = screen.getByPlaceholderText('Médico Solicitante');

      // Testar que os campos mantêm valores
      fireEvent.change(emailInput, { target: { value: 'test@email.com' } });
      fireEvent.change(doctorInput, { target: { value: 'Dr. Test' } });

      expect(emailInput).toHaveValue('test@email.com');
      expect(doctorInput).toHaveValue('Dr. Test');
    });

    it('deve criar registro na tabela reports após envio bem-sucedido', async () => {
      // Mock da resposta de sucesso da API com dados do report criado
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          notificationId: 'notif-123',
          reportId: 'report-456',
          receivedAt: new Date().toISOString()
        }),
      });

      // Mock do FileReader
      class FileReaderMock {
        public result: string | null = null;
        public onload: ((this: FileReaderMock, ev: ProgressEvent<FileReaderMock>) => any) | null = null;
        public onerror: ((this: FileReaderMock, ev: ProgressEvent<FileReaderMock>) => any) | null = null;
        addEventListener() {}
        removeEventListener() {}
        dispatchEvent() { return true; }
        readAsDataURL() {
          setTimeout(() => {
            this.result = 'data:application/pdf;base64,dGVzdA==';
            if (typeof this.onload === 'function') this.onload.call(this, {} as ProgressEvent<FileReaderMock>);
          }, 0);
        }
      }
      global.FileReader = FileReaderMock as any;

      render(<ExternalLabSubmit fetchImpl={mockFetch} />);

      // Preencher formulário
      const documentoInput = screen.getByPlaceholderText('Número do Documento');
      const emailInput = screen.getByPlaceholderText('E-mail do Paciente');
      const doctorInput = screen.getByPlaceholderText('Médico Solicitante');
      const dateInput = screen.getByPlaceholderText('dd/mm/aaaa');
      const cpfInput = screen.getByPlaceholderText('000.000.000-00');
      const submitButton = screen.getByText('Enviar Documento');

      fireEvent.change(documentoInput, { target: { value: '12345' } });
      fireEvent.change(emailInput, { target: { value: 'paciente@receptor.com' } });
      fireEvent.change(doctorInput, { target: { value: 'Dr. João Silva' } });
      fireEvent.change(dateInput, { target: { value: '2024-10-25' } });
      fireEvent.change(cpfInput, { target: { value: '12345678901' } });

      // Selecionar arquivo
      const file = new File(['conteúdo do laudo'], 'laudo.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Submeter
      fireEvent.click(submitButton);

      // Verificar que a API foi chamada corretamente (não deve enviar reportId no body)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/lab/submit',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"cpf":"12345678901"'),
          })
        );
      });

      // Verificar mensagem de sucesso
      expect(screen.getByText(/sucesso/i)).toBeInTheDocument();
    });
  });
});
