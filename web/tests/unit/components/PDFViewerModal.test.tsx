import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PDFViewerModal } from '@/components/PDFViewerModal'

// Mock global fetch
global.fetch = vi.fn()

describe('PDFViewerModal - Visualização de PDF', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    fileId: 'test-file-id',
    fileName: 'documento-teste.pdf',
    fileUrl: 'https://example.com/test.pdf'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL.createObjectURL e revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Renderização e Estados', () => {
    it('não deve renderizar quando isOpen é false', () => {
      render(<PDFViewerModal {...mockProps} isOpen={false} />)
      expect(screen.queryByText('documento-teste.pdf')).not.toBeInTheDocument()
    })

    it('deve mostrar indicador de carregamento inicialmente', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      )

      render(<PDFViewerModal {...mockProps} />)
      
      expect(screen.getByText('Carregando PDF...')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('deve renderizar o nome do arquivo corretamente', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
        status: 200
      } as Response)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('documento-teste.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('Carregamento de PDF', () => {
    it('deve carregar PDF com sucesso via proxy', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
        status: 200
      } as Response)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/files/test-file-id/proxy')
      })

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
      })

      const iframe = screen.getByTitle('documento-teste.pdf')
      expect(iframe).toBeInTheDocument()
      expect(iframe).toHaveAttribute('src', 'blob:mock-url')
    })

    it('deve usar fileId correto na requisição do proxy', async () => {
      const customProps = { ...mockProps, fileId: 'custom-file-123' }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      render(<PDFViewerModal {...customProps} />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/files/custom-file-123/proxy')
      })
    })

    it('deve recarregar PDF quando fileId muda', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      const { rerender } = render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/files/test-file-id/proxy')
      })

      // Mudar fileId
      rerender(<PDFViewerModal {...mockProps} fileId="new-file-id" />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/files/new-file-id/proxy')
      })

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve exibir erro quando a requisição falhar', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404
      } as Response)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar PDF')).toBeInTheDocument()
        expect(screen.getByText(/Erro ao carregar PDF: 404/)).toBeInTheDocument()
      })
    })

    it('deve exibir erro quando fetch lançar exceção', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar PDF')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('deve mostrar erro genérico para erros desconhecidos', async () => {
      vi.mocked(fetch).mockRejectedValue('Unknown error')

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Erro desconhecido')).toBeInTheDocument()
      })
    })

    it('deve permitir fechar modal quando houver erro', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500
      } as Response)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar PDF')).toBeInTheDocument()
      })

      const closeButton = screen.getByText('Fechar')
      fireEvent.click(closeButton)

      expect(mockProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Interações do Usuário', () => {
    it('deve chamar onClose ao clicar no botão X', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('Fechar')).toBeInTheDocument()
      })

      const closeButton = screen.getByTitle('Fechar')
      fireEvent.click(closeButton)

      expect(mockProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('deve permitir download do PDF', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
        status: 200
      } as Response)

      // Mock createElement e click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Baixar')).toBeInTheDocument()
      })

      const downloadButton = screen.getByText('Baixar')
      fireEvent.click(downloadButton)

      expect(mockLink.href).toBe('blob:mock-url')
      expect(mockLink.download).toBe('documento-teste.pdf')
      expect(mockLink.click).toHaveBeenCalledTimes(1)
    })

    it('não deve mostrar botão de download durante carregamento', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

      render(<PDFViewerModal {...mockProps} />)

      expect(screen.queryByText('Baixar')).not.toBeInTheDocument()
    })

    it('não deve mostrar botão de download em caso de erro', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404
      } as Response)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar PDF')).toBeInTheDocument()
      })

      expect(screen.queryByText('Baixar')).not.toBeInTheDocument()
    })
  })

  describe('Gerenciamento de Memória', () => {
    it('deve limpar blobUrl ao fechar o modal', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      const { rerender } = render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled()
      })

      // Fechar modal
      rerender(<PDFViewerModal {...mockProps} isOpen={false} />)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('deve criar novo blobUrl ao reabrir modal', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      const { rerender } = render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1)
      })

      // Fechar
      rerender(<PDFViewerModal {...mockProps} isOpen={false} />)
      
      // Reabrir
      rerender(<PDFViewerModal {...mockProps} isOpen={true} />)

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Acessibilidade', () => {
    it('deve ter título adequado no iframe', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        const iframe = screen.getByTitle('documento-teste.pdf')
        expect(iframe).toBeInTheDocument()
      })
    })

    it('deve truncar nomes de arquivo muito longos no header', async () => {
      const longFileName = 'arquivo-com-nome-muito-muito-muito-muito-muito-longo.pdf'
      const propsWithLongName = { ...mockProps, fileName: longFileName }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      render(<PDFViewerModal {...propsWithLongName} />)

      await waitFor(() => {
        const header = screen.getByText(longFileName)
        expect(header).toHaveClass('truncate')
      })
    })
  })

  describe('Integração com EventCard', () => {
    it('deve funcionar com diferentes tipos de arquivo', async () => {
      const pdfProps = { ...mockProps, fileName: 'exame.pdf' }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      render(<PDFViewerModal {...pdfProps} />)

      await waitFor(() => {
        expect(screen.getByText('exame.pdf')).toBeInTheDocument()
      })
    })

    it('deve suportar PDFs de diferentes slots (prescription, report, etc)', async () => {
      const scenarios = [
        { fileId: 'prescription-1', fileName: 'receita.pdf' },
        { fileId: 'report-1', fileName: 'laudo.pdf' },
        { fileId: 'exam-1', fileName: 'exame.pdf' }
      ]

      for (const scenario of scenarios) {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          blob: async () => new Blob(['test'], { type: 'application/pdf' }),
          status: 200
        } as Response)

        const { unmount } = render(
          <PDFViewerModal {...mockProps} fileId={scenario.fileId} fileName={scenario.fileName} />
        )

        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(`/api/files/${scenario.fileId}/proxy`)
          expect(screen.getByText(scenario.fileName)).toBeInTheDocument()
        })

        unmount()
        vi.clearAllMocks()
      }
    })
  })

  describe('Logging e Debugging', () => {
    it('deve logar informações de carregamento', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['test'], { type: 'application/pdf' }),
        status: 200
      } as Response)

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[PDFViewer] Iniciando carregamento do PDF'),
          expect.anything()
        )
      })
    })

    it('deve logar erros quando ocorrerem', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      
      vi.mocked(fetch).mockRejectedValue(new Error('Test error'))

      render(<PDFViewerModal {...mockProps} />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[PDFViewer] Erro ao carregar PDF:'),
          expect.any(Error)
        )
      })
    })
  })
})
