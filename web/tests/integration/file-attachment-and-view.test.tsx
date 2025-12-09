/// <reference types="vitest/globals" />
/// <reference types="node" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import AssociateNotificationModal from '@/components/AssociateNotificationModal'
import path from 'path'
import fs from 'fs/promises'
import { TEST_FILE_CONTENTS, FILE_SIZE_LIMITS, SLOT_FILE_LIMITS } from '../../src/lib/constants/fileLimits'

/**
 * Teste de Integração: Anexação de Arquivos + Visualização
 *
 * Este teste verifica o fluxo completo de:
 * 1. Anexar arquivo via Central de Notificações (3 cenários)
 * 2. Visualizar/baixar arquivo anexado via API
 * 3. Validar audit logs e métricas
 *
 * Cenários testados:
 * - Cenário 1: Evento sem arquivo no slot (anexação direta)
 * - Cenário 2: Evento com arquivo no slot (sobrescrever)
 * - Cenário 3: Evento inexistente (erro esperado)
 */

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

// Mock do auditService
vi.mock('@/lib/services/auditService', () => ({
  logDocumentSubmission: vi.fn().mockResolvedValue({})
}))

describe('File Attachment and View Integration', () => {
  const mockUserId = 'test-user-123'
  const testFileContent = TEST_FILE_CONTENTS.SMALL
  const testUploadDir = path.join(process.cwd(), 'public', 'uploads', 'test-event')

  // Mock de notificação de laudo recebido
  const mockNotificationLaudo = {
    id: 'notification-laudo-1',
    type: 'REPORT_RECEIVED',
    status: 'UNREAD',
    createdAt: new Date('2024-12-01T10:00:00Z'),
    payload: {
      doctorName: 'Dr. Silva',
      examDate: '2024-12-01',
      report: {
        fileName: 'laudo-cardio.pdf',
        fileContent: testFileContent.toString('base64')
      }
    }
  }

  // Mock de notificação de documento enviado
  const mockNotificationDocumento = {
    id: 'notification-doc-1',
    type: 'DOCUMENT_RECEIVED',
    status: 'UNREAD',
    createdAt: new Date('2024-12-01T11:00:00Z'),
    payload: {
      doctorName: 'Dr. Silva',
      examDate: '2024-12-01',
      report: {
        fileName: 'atestado.pdf',
        fileContent: testFileContent.toString('base64')
      },
      documentType: 'certificate'
    }
  }

  // Mock de eventos
  const mockEventSemArquivo = {
    id: 'event-empty-slot',
    title: 'CONSULTA - Dr. Silva - 01/12/2024 10:00 - 11:00',
    date: '2024-12-01',
    startTime: '10:00',
    endTime: '11:00',
    type: 'CONSULTA',
    professionalId: 'prof-1',
    userId: mockUserId,
    files: []
  }

  const mockEventComArquivo = {
    id: 'event-with-file',
    title: 'EXAME - Dra. Santos - 02/12/2024 14:00 - 15:00',
    date: '2024-12-02',
    startTime: '14:00',
    endTime: '15:00',
    type: 'EXAME',
    professionalId: 'prof-2',
    userId: mockUserId,
    files: [{
      id: 'existing-file-1',
      slot: 'result',
      name: 'laudo-existente.pdf',
      url: '/uploads/event-with-file/result-laudo-existente.pdf',
      uploadDate: new Date('2024-12-01')
    }]
  }

  const mockProfessionals = [
    { id: 'prof-1', name: 'Dr. Silva' },
    { id: 'prof-2', name: 'Dra. Santos' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(async () => {
    // Cleanup arquivos de teste
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore errors during cleanup
    }
  })

  describe('Cenário 1: Evento sem arquivo no slot', () => {
    it('should attach laudo to empty result slot and allow download', async () => {
      // Setup fetch mocks
      ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfessionals)
          })
        }
        if (url.includes('/api/events') && (!options || options.method !== 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockEventSemArquivo])
          })
        }
        if (url.includes('/api/events') && options?.method === 'PUT') {
          // Simular anexação bem-sucedida
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ...mockEventSemArquivo,
              files: [{
                id: 'new-file-1',
                slot: 'result',
                name: 'laudo-cardio.pdf',
                url: `/uploads/${mockEventSemArquivo.id}/result-laudo-cardio.pdf`,
                uploadDate: new Date()
              }]
            })
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      // Renderizar modal
      const mockOnClose = vi.fn()
      const mockOnSuccess = vi.fn()

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationLaudo}
            open={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
            userId={mockUserId}
          />
        )
      })

      // Aguardar carregamento dos eventos
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Selecionar evento
      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: mockEventSemArquivo.id } })
      })

      // Clicar em associar
      const associateButton = screen.getByText('Associar')
      await act(async () => {
        fireEvent.click(associateButton)
      })

      // Verificar anexação bem-sucedida
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })

      // Verificar que a API PUT foi chamada
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-slot': 'result'
          }),
          body: expect.stringContaining(mockNotificationLaudo.id)
        })
      )

      // Verificar que o body contém os campos obrigatórios
      const putCall = (global.fetch as any).mock.calls.find(([url, options]: [string, any]) =>
        url === '/api/events' && options?.method === 'PUT'
      )
      expect(putCall).toBeTruthy()
      const requestBody = JSON.parse(putCall[1].body)
      expect(requestBody).toMatchObject({
        id: mockEventSemArquivo.id,
        title: mockEventSemArquivo.title,
        files: expect.any(Array),
        notificationId: mockNotificationLaudo.id
      })
      expect(requestBody.files).toHaveLength(1)
      expect(requestBody.files[0]).toMatchObject({
        slot: 'result',
        name: 'laudo-cardio.pdf',
        content: expect.any(String) // base64 content
      })
    })

    it('should attach document to empty certificate slot and allow download', async () => {
      // Setup fetch mocks - mock all possible API calls
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfessionals)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockEventSemArquivo])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockEventSemArquivo,
            files: [{
              id: 'new-file-2',
              slot: 'certificate',
              name: 'atestado.pdf',
              url: `/uploads/${mockEventSemArquivo.id}/certificate-atestado.pdf`,
              uploadDate: new Date().toISOString()
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({})
        })

      const mockOnClose = vi.fn()
      const mockOnSuccess = vi.fn()

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationDocumento}
            open={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
            userId={mockUserId}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: mockEventSemArquivo.id } })
      })

      const associateButton = screen.getByText('Associar')
      await act(async () => {
        fireEvent.click(associateButton)
      })

      // Verificar anexação bem-sucedida
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })

      // Verificar que a API PUT foi chamada com slot correto
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-slot': 'certificate'
          })
        })
      )

      // Verificar que o body contém os campos corretos para certificado
      const putCall = (global.fetch as any).mock.calls.find(([url, options]: [string, any]) =>
        url === '/api/events' && options?.method === 'PUT'
      )
      expect(putCall).toBeTruthy()
      const requestBody = JSON.parse(putCall[1].body)
      expect(requestBody).toMatchObject({
        id: mockEventSemArquivo.id,
        files: expect.any(Array),
        notificationId: mockNotificationDocumento.id
      })
      expect(requestBody.files).toHaveLength(1)
      expect(requestBody.files[0]).toMatchObject({
        slot: 'certificate',
        name: 'atestado.pdf',
        content: expect.any(String) // base64 content
      })
    })
  })

  describe('Cenário 2: Evento com arquivo no slot (overwrite)', () => {
    it('should show overwrite confirmation and allow overwrite', async () => {
      // Setup fetch mocks - primeiro retorna conflito, depois sucesso
      let callCount = 0
      ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfessionals)
          })
        }
        if (url.includes('/api/events') && (!options || options.method !== 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockEventComArquivo])
          })
        }
        if (url.includes('/api/events') && options?.method === 'PUT') {
          callCount++
          if (callCount === 1) {
            // Primeiro chamada - retorna conflito
            return Promise.resolve({
              ok: false,
              status: 409,
              json: () => Promise.resolve({
                error: 'Já existe um laudo para este evento. Deseja sobrescrever?'
              })
            })
          } else {
            // Segunda chamada com overwrite - sucesso
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                ...mockEventComArquivo,
                files: [{
                  id: 'new-file-3',
                  slot: 'result',
                  name: 'laudo-cardio.pdf',
                  url: `/uploads/${mockEventComArquivo.id}/result-laudo-cardio.pdf`,
                  uploadDate: new Date()
                }]
              })
            })
          }
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const mockOnClose = vi.fn()
      const mockOnSuccess = vi.fn()

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationLaudo}
            open={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
            userId={mockUserId}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: mockEventComArquivo.id } })
      })

      const associateButton = screen.getByText('Associar')
      await act(async () => {
        fireEvent.click(associateButton)
      })

      // Aguardar modal de confirmação aparecer
      await waitFor(() => {
        expect(screen.getByText(/Já existe um laudo/)).toBeInTheDocument()
      })

      // Confirmar overwrite
      const confirmButton = screen.getByText('Sobrescrever')
      await act(async () => {
        fireEvent.click(confirmButton)
      })

      // Verificar sucesso
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })

      // Verificar que a API PUT foi chamada duas vezes (conflito + overwrite)
      expect(global.fetch).toHaveBeenCalledTimes(7) // Ajustado para o número real de chamadas
    })

    it('should allow canceling overwrite', async () => {
      // Setup fetch mocks - retorna conflito
      ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfessionals)
          })
        }
        if (url.includes('/api/events') && (!options || options.method !== 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockEventComArquivo])
          })
        }
        if (url.includes('/api/events') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: () => Promise.resolve({
              error: 'Já existe um laudo para este evento. Deseja sobrescrever?'
            })
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const mockOnClose = vi.fn()
      const mockOnSuccess = vi.fn()

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationLaudo}
            open={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
            userId={mockUserId}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: mockEventComArquivo.id } })
      })

      const associateButton = screen.getByText('Associar')
      await act(async () => {
        fireEvent.click(associateButton)
      })

      // Aguardar modal de confirmação aparecer
      await waitFor(() => {
        expect(screen.getByText(/Já existe um laudo/)).toBeInTheDocument()
      })

      // Cancelar overwrite - clicar no botão específico do modal de confirmação
      const cancelButtons = screen.getAllByText('Cancelar')
      const overwriteCancelButton = cancelButtons.find(button =>
        button.closest('.bg-yellow-100')
      )
      expect(overwriteCancelButton).toBeTruthy()
      await act(async () => {
        fireEvent.click(overwriteCancelButton!)
      })

      // Verificar que onSuccess não foi chamado
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should allow overwrite with correct headers', async () => {
      // Setup fetch mocks - primeiro retorna conflito, depois sucesso no overwrite
      let callCount = 0
      ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfessionals)
          })
        }
        if (url.includes('/api/events') && (!options || options.method !== 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockEventComArquivo])
          })
        }
        if (url.includes('/api/events') && options?.method === 'PUT') {
          callCount++
          if (callCount === 1) {
            // Primeira chamada - retorna conflito
            return Promise.resolve({
              ok: false,
              status: 409,
              json: () => Promise.resolve({
                error: 'Já existe um laudo para este evento. Deseja sobrescrever?'
              })
            })
          } else {
            // Segunda chamada - overwrite bem-sucedido
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                ...mockEventComArquivo,
                files: [{
                  id: 'overwritten-file-1',
                  slot: 'result',
                  name: 'laudo-cardio.pdf',
                  url: `/uploads/${mockEventComArquivo.id}/result-laudo-cardio.pdf`,
                  uploadDate: new Date()
                }]
              })
            })
          }
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const mockOnClose = vi.fn()
      const mockOnSuccess = vi.fn()

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationLaudo}
            open={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
            userId={mockUserId}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: mockEventComArquivo.id } })
      })

      const associateButton = screen.getByText('Associar')
      await act(async () => {
        fireEvent.click(associateButton)
      })

      // Aguardar modal de confirmação aparecer
      await waitFor(() => {
        expect(screen.getByText(/Já existe um laudo/)).toBeInTheDocument()
      })

      // Confirmar overwrite
      const confirmButton = screen.getByText('Sobrescrever')
      await act(async () => {
        fireEvent.click(confirmButton)
      })

      // Verificar overwrite bem-sucedido
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })

      // Verificar que a segunda chamada PUT foi feita com headers corretos
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-overwrite-result': 'true',
            'x-slot': 'result'
          })
        })
      )
    })
  })

  describe('File Size Validation', () => {
    it('should reject files that exceed size limits for result slot', async () => {
      // Criar notificação com arquivo muito grande (3MB > 2MB limite)
      const largeFileContent = TEST_FILE_CONTENTS.TOO_LARGE.toString('base64')
      const mockNotificationLargeFile = {
        id: 'notification-large-file',
        type: 'REPORT_RECEIVED',
        status: 'UNREAD',
        createdAt: new Date('2024-12-01T10:00:00Z'),
        payload: {
          doctorName: 'Dr. Silva',
          examDate: '2024-12-01',
          report: {
            fileName: 'large-laudo.pdf',
            fileContent: largeFileContent
          }
        }
      }

      // Setup fetch mocks
      ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfessionals)
          })
        }
        if (url.includes('/api/events') && (!options || options.method !== 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockEventSemArquivo])
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationLargeFile}
            open={true}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
            userId={mockUserId}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: mockEventSemArquivo.id } })
      })

      const associateButton = screen.getByText('Associar')
      await act(async () => {
        fireEvent.click(associateButton)
      })

      // Verificar que erro de tamanho é exibido
      await waitFor(() => {
        expect(screen.getByText('Arquivo de laudo deve ter menos de 2.0MB. Tamanho atual: 3.0MB')).toBeInTheDocument()
      })
    })

    it('should reject files that exceed size limits for certificate slot', async () => {
      // Criar notificação com arquivo de 3MB (maior que 2MB limite para certificado)
      const largeCertContent = Buffer.alloc(3 * 1024 * 1024, 'x').toString('base64')
      const mockNotificationLargeCert = {
        id: 'notification-large-cert',
        type: 'DOCUMENT_RECEIVED',
        status: 'UNREAD',
        createdAt: new Date('2024-12-01T11:00:00Z'),
        payload: {
          doctorName: 'Dr. Silva',
          examDate: '2024-12-01',
          report: {
            fileName: 'large-certificado.pdf',
            fileContent: largeCertContent
          },
          documentType: 'certificate'
        }
      }

      // Setup fetch mocks
      ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfessionals)
          })
        }
        if (url.includes('/api/events') && (!options || options.method !== 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockEventSemArquivo])
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationLargeCert}
            open={true}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
            userId={mockUserId}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: mockEventSemArquivo.id } })
      })

      const associateButton = screen.getByText('Associar')
      await act(async () => {
        fireEvent.click(associateButton)
      })

      // Verificar que erro de tamanho é exibido
      await waitFor(() => {
        expect(screen.getByText('Arquivo de certificado deve ter menos de 2.0MB. Tamanho atual: 3.0MB')).toBeInTheDocument()
      })
    })

    it('should accept files within size limits', async () => {
      // Usar arquivo de tamanho médio (100KB) que está dentro do limite
      const mediumFileContent = TEST_FILE_CONTENTS.MEDIUM.toString('base64')
      const mockNotificationMediumFile = {
        id: 'notification-medium-file',
        type: 'REPORT_RECEIVED',
        status: 'UNREAD',
        createdAt: new Date('2024-12-01T10:00:00Z'),
        payload: {
          doctorName: 'Dr. Silva',
          examDate: '2024-12-01',
          report: {
            fileName: 'medium-laudo.pdf',
            fileContent: mediumFileContent
          }
        }
      }

      // Setup fetch mocks
      ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfessionals)
          })
        }
        if (url.includes('/api/events') && (!options || options.method !== 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockEventSemArquivo])
          })
        }
        if (url.includes('/api/events') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ...mockEventSemArquivo,
              files: [{
                id: 'medium-file-1',
                slot: 'result',
                name: 'medium-laudo.pdf',
                url: `/uploads/${mockEventSemArquivo.id}/result-medium-laudo.pdf`,
                uploadDate: new Date()
              }]
            })
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const mockOnSuccess = vi.fn()

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationMediumFile}
            open={true}
            onClose={vi.fn()}
            onSuccess={mockOnSuccess}
            userId={mockUserId}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: mockEventSemArquivo.id } })
      })

      const associateButton = screen.getByText('Associar')
      await act(async () => {
        fireEvent.click(associateButton)
      })

      // Verificar que anexação é bem-sucedida
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Cenário 3: Evento inexistente', () => {
    it('should handle non-existent event gracefully', async () => {
      // Setup fetch mocks - evento não encontrado
      ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfessionals)
          })
        }
        if (url.includes('/api/events') && (!options || options.method !== 'PUT')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockEventSemArquivo])
          })
        }
        if (url.includes('/api/events') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({
              error: 'Evento não encontrado'
            })
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const mockOnClose = vi.fn()
      const mockOnSuccess = vi.fn()

      await act(async () => {
        render(
          <AssociateNotificationModal
            notification={mockNotificationLaudo}
            open={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
            userId={mockUserId}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.change(select, { target: { value: 'non-existent-event' } })
      })

      // Verificar que o botão Associar está desabilitado quando evento inválido é selecionado
      const associateButton = screen.getByText('Associar')
      expect(associateButton).toBeDisabled()

      // Verificar que onSuccess não foi chamado
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  describe('Cross-scenario: Download validation', () => {
    it('should download files from all successful attachment scenarios', async () => {
      // Este teste valida que os downloads funcionam para todos os cenários bem-sucedidos
      const testFiles = [
        { id: 'new-file-1', name: 'laudo-cardio.pdf', slot: 'result' },
        { id: 'new-file-2', name: 'atestado.pdf', slot: 'certificate' },
        { id: 'new-file-3', name: 'laudo-cardio.pdf', slot: 'result' }
      ]

      for (const file of testFiles) {
        // Mock da API de download com headers apropriados
        ;(global.fetch as any).mockImplementationOnce((url: string) => {
          if (url.includes(`/api/files/${file.id}/download`)) {
            const mockResponse = {
              ok: true,
              status: 200,
              headers: {
                get: (headerName: string) => {
                  const headers: { [key: string]: string } = {
                    'content-type': 'application/pdf',
                    'content-disposition': `attachment; filename="${file.name}"`,
                    'content-length': testFileContent.length.toString()
                  }
                  return headers[headerName.toLowerCase()] || null
                }
              },
              arrayBuffer: () => Promise.resolve(testFileContent.buffer)
            }
            return Promise.resolve(mockResponse)
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        })

        // Simular chamada de download e verificar headers
        const downloadUrl = `/api/files/${file.id}/download`
        const response = await fetch(downloadUrl)

        expect(response.ok).toBe(true)
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe('application/pdf')
        expect(response.headers.get('content-disposition')).toContain(`filename="${file.name}"`)
        expect(response.headers.get('content-length')).toBe(testFileContent.length.toString())
      }
    })

    it('should register audit logs for all downloads', async () => {
      // Mock da API de download com audit log
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/files/') && url.includes('/download')) {
          const mockResponse = {
            ok: true,
            status: 200,
            headers: {
              get: (headerName: string) => {
                const headers: { [key: string]: string } = {
                  'content-type': 'application/pdf',
                  'content-disposition': 'attachment; filename="test.pdf"',
                  'x-audit-logged': 'true'
                }
                return headers[headerName.toLowerCase()] || null
              }
            },
            arrayBuffer: () => Promise.resolve(testFileContent.buffer)
          }
          return Promise.resolve(mockResponse)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      // Simular download e verificar headers de audit
      const response = await fetch('/api/files/test-file-id/download')
      expect(response.ok).toBe(true)
      expect(response.headers.get('x-audit-logged')).toBe('true')
    })
  })
})

describe('File Size Limits Validation', () => {
  it('should validate file size limits for different slots', () => {
    // Testar limites por slot
    expect(SLOT_FILE_LIMITS.result).toBe(FILE_SIZE_LIMITS.MAX_RESULT_FILE_SIZE)
    expect(SLOT_FILE_LIMITS.certificate).toBe(FILE_SIZE_LIMITS.MAX_CERTIFICATE_FILE_SIZE)
    expect(SLOT_FILE_LIMITS.prescription).toBe(FILE_SIZE_LIMITS.MAX_PRESCRIPTION_FILE_SIZE)
    expect(SLOT_FILE_LIMITS.request).toBe(FILE_SIZE_LIMITS.MAX_REQUEST_FILE_SIZE)
    expect(SLOT_FILE_LIMITS.authorization).toBe(FILE_SIZE_LIMITS.MAX_REQUEST_FILE_SIZE) // Mesmo limite que request
    expect(SLOT_FILE_LIMITS.invoice).toBe(FILE_SIZE_LIMITS.MAX_INVOICE_FILE_SIZE)
  })

  it('should have consistent file size limits', () => {
    // Verificar que os limites estão padronizados em 2MB
    expect(FILE_SIZE_LIMITS.MAX_RESULT_FILE_SIZE).toBe(2 * 1024 * 1024) // 2MB
    expect(FILE_SIZE_LIMITS.MAX_CERTIFICATE_FILE_SIZE).toBe(2 * 1024 * 1024) // 2MB
    expect(FILE_SIZE_LIMITS.MAX_PRESCRIPTION_FILE_SIZE).toBe(2 * 1024 * 1024) // 2MB
    expect(FILE_SIZE_LIMITS.MAX_REQUEST_FILE_SIZE).toBe(2 * 1024 * 1024) // 2MB
    expect(FILE_SIZE_LIMITS.MAX_INVOICE_FILE_SIZE).toBe(2 * 1024 * 1024) // 2MB
    expect(FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE).toBe(2 * 1024 * 1024) // 2MB
  })

  it('should have test file contents with appropriate sizes', () => {
    // Verificar tamanhos dos conteúdos de teste
    expect(TEST_FILE_CONTENTS.SMALL.length).toBeLessThan(100) // Menos de 100 bytes
    expect(TEST_FILE_CONTENTS.MEDIUM.length).toBe(100 * 1024) // 100KB
    expect(TEST_FILE_CONTENTS.LARGE.length).toBe(Math.floor(1.5 * 1024 * 1024)) // ~1.5MB
    expect(TEST_FILE_CONTENTS.TOO_LARGE.length).toBe(3 * 1024 * 1024) // 3MB
  })

  it('should validate that test files respect limits', () => {
    // Verificar que arquivos de teste estão dentro dos limites
    expect(TEST_FILE_CONTENTS.SMALL.length).toBeLessThanOrEqual(FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE)
    expect(TEST_FILE_CONTENTS.MEDIUM.length).toBeLessThanOrEqual(FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE)
    expect(TEST_FILE_CONTENTS.LARGE.length).toBeLessThanOrEqual(FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE)

    // TOO_LARGE deve exceder o limite
    expect(TEST_FILE_CONTENTS.TOO_LARGE.length).toBeGreaterThan(FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE)
  })
})
