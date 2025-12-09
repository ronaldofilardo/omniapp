import { describe, it, expect } from 'vitest'
import { 
  FILE_SIZE_LIMITS, 
  SLOT_FILE_LIMITS, 
  formatFileSize, 
  getFileTooLargeError 
} from '@/lib/constants/fileLimits'

describe('File Size Limits - 2MB Padronização', () => {
  describe('FILE_SIZE_LIMITS', () => {
    it('deve ter todos os limites padronizados em 2MB', () => {
      const expectedSize = 2 * 1024 * 1024 // 2MB
      
      expect(FILE_SIZE_LIMITS.MAX_RESULT_FILE_SIZE).toBe(expectedSize)
      expect(FILE_SIZE_LIMITS.MAX_CERTIFICATE_FILE_SIZE).toBe(expectedSize)
      expect(FILE_SIZE_LIMITS.MAX_PRESCRIPTION_FILE_SIZE).toBe(expectedSize)
      expect(FILE_SIZE_LIMITS.MAX_REQUEST_FILE_SIZE).toBe(expectedSize)
      expect(FILE_SIZE_LIMITS.MAX_INVOICE_FILE_SIZE).toBe(expectedSize)
      expect(FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE).toBe(expectedSize)
    })

    it('deve ter todos os limites iguais entre si', () => {
      const limits = Object.values(FILE_SIZE_LIMITS)
      const firstLimit = limits[0]
      
      // Verificar que todos os limites são iguais
      limits.forEach(limit => {
        expect(limit).toBe(firstLimit)
      })
    })
  })

  describe('SLOT_FILE_LIMITS', () => {
    it('deve ter todos os slots com limite de 2MB', () => {
      const expectedSize = 2 * 1024 * 1024 // 2MB
      
      expect(SLOT_FILE_LIMITS.result).toBe(expectedSize)
      expect(SLOT_FILE_LIMITS.certificate).toBe(expectedSize)
      expect(SLOT_FILE_LIMITS.prescription).toBe(expectedSize)
      expect(SLOT_FILE_LIMITS.request).toBe(expectedSize)
      expect(SLOT_FILE_LIMITS.authorization).toBe(expectedSize)
      expect(SLOT_FILE_LIMITS.invoice).toBe(expectedSize)
    })

    it('deve ter consistência entre SLOT_FILE_LIMITS e FILE_SIZE_LIMITS', () => {
      expect(SLOT_FILE_LIMITS.result).toBe(FILE_SIZE_LIMITS.MAX_RESULT_FILE_SIZE)
      expect(SLOT_FILE_LIMITS.certificate).toBe(FILE_SIZE_LIMITS.MAX_CERTIFICATE_FILE_SIZE)
      expect(SLOT_FILE_LIMITS.prescription).toBe(FILE_SIZE_LIMITS.MAX_PRESCRIPTION_FILE_SIZE)
      expect(SLOT_FILE_LIMITS.request).toBe(FILE_SIZE_LIMITS.MAX_REQUEST_FILE_SIZE)
      expect(SLOT_FILE_LIMITS.authorization).toBe(FILE_SIZE_LIMITS.MAX_REQUEST_FILE_SIZE)
      expect(SLOT_FILE_LIMITS.invoice).toBe(FILE_SIZE_LIMITS.MAX_INVOICE_FILE_SIZE)
    })
  })

  describe('formatFileSize', () => {
    it('deve formatar corretamente 2MB', () => {
      const twoMB = 2 * 1024 * 1024
      expect(formatFileSize(twoMB)).toBe('2.0MB')
    })

    it('deve formatar corretamente valores em KB', () => {
      expect(formatFileSize(1024)).toBe('1KB')
      expect(formatFileSize(512 * 1024)).toBe('512KB')
    })

    it('deve formatar corretamente valores em MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0MB')
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5MB')
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5MB')
    })
  })

  describe('getFileTooLargeError', () => {
    it('deve gerar mensagem correta para arquivo de laudo acima de 2MB', () => {
      const fileSize = 2.5 * 1024 * 1024 // 2.5MB
      const error = getFileTooLargeError(fileSize, 'result')
      
      expect(error).toContain('laudo')
      expect(error).toContain('2.0MB')
      expect(error).toContain('2.5MB')
    })

    it('deve gerar mensagem correta para arquivo de certificado acima de 2MB', () => {
      const fileSize = 3 * 1024 * 1024 // 3MB
      const error = getFileTooLargeError(fileSize, 'certificate')
      
      expect(error).toContain('certificado')
      expect(error).toContain('2.0MB')
      expect(error).toContain('3.0MB')
    })

    it('deve gerar mensagem correta para arquivo de nota fiscal acima de 2MB', () => {
      const fileSize = 2.2 * 1024 * 1024 // 2.2MB
      const error = getFileTooLargeError(fileSize, 'invoice')
      
      expect(error).toContain('nota fiscal')
      expect(error).toContain('2.0MB')
      expect(error).toContain('2.2MB')
    })

    it('deve gerar mensagens corretas para todos os tipos de slot', () => {
      const fileSize = 2.5 * 1024 * 1024 // 2.5MB
      
      const slots = [
        'result', 
        'certificate', 
        'prescription', 
        'request', 
        'authorization', 
        'invoice'
      ] as const
      
      slots.forEach(slot => {
        const error = getFileTooLargeError(fileSize, slot)
        expect(error).toContain('2.0MB') // Limite máximo
        expect(error).toContain('2.5MB') // Tamanho atual
      })
    })
  })

  describe('Validação de arquivos com 2MB', () => {
    it('deve aceitar arquivo exatamente de 2MB', () => {
      const exactlyTwoMB = 2 * 1024 * 1024
      const slots = Object.keys(SLOT_FILE_LIMITS) as Array<keyof typeof SLOT_FILE_LIMITS>
      
      slots.forEach(slot => {
        // Arquivo exatamente de 2MB deve ser aceito
        expect(exactlyTwoMB).toBeLessThanOrEqual(SLOT_FILE_LIMITS[slot])
      })
    })

    it('deve rejeitar arquivo de 2MB + 1 byte', () => {
      const slightlyOverTwoMB = 2 * 1024 * 1024 + 1
      const slots = Object.keys(SLOT_FILE_LIMITS) as Array<keyof typeof SLOT_FILE_LIMITS>
      
      slots.forEach(slot => {
        // Arquivo de 2MB + 1 byte deve ser rejeitado
        expect(slightlyOverTwoMB).toBeGreaterThan(SLOT_FILE_LIMITS[slot])
      })
    })

    it('deve aceitar arquivo de 1.9MB', () => {
      const onePointNineMB = 1.9 * 1024 * 1024
      const slots = Object.keys(SLOT_FILE_LIMITS) as Array<keyof typeof SLOT_FILE_LIMITS>
      
      slots.forEach(slot => {
        expect(onePointNineMB).toBeLessThan(SLOT_FILE_LIMITS[slot])
      })
    })

    it('deve rejeitar arquivo de 3MB', () => {
      const threeMB = 3 * 1024 * 1024
      const slots = Object.keys(SLOT_FILE_LIMITS) as Array<keyof typeof SLOT_FILE_LIMITS>
      
      slots.forEach(slot => {
        expect(threeMB).toBeGreaterThan(SLOT_FILE_LIMITS[slot])
      })
    })
  })

  describe('Compatibilidade com uploads anteriores', () => {
    it('deve permitir arquivos que foram enviados com sucesso em /laudos e /enviar-documento', () => {
      // Se um arquivo foi enviado com sucesso em /laudos ou /enviar-documento,
      // ele deve ter no máximo 2MB e portanto deve ser válido para todos os slots
      const uploadedFileSize = 1.9 * 1024 * 1024 // 1.9MB (enviado com sucesso)
      
      const slots = Object.keys(SLOT_FILE_LIMITS) as Array<keyof typeof SLOT_FILE_LIMITS>
      
      slots.forEach(slot => {
        const maxSize = SLOT_FILE_LIMITS[slot]
        expect(uploadedFileSize).toBeLessThanOrEqual(maxSize)
      })
    })

    it('deve garantir que limite geral de upload seja igual aos limites de slots', () => {
      // O limite geral deve ser o mesmo que os limites de slots
      expect(FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE).toBe(2 * 1024 * 1024)
      
      const slots = Object.keys(SLOT_FILE_LIMITS) as Array<keyof typeof SLOT_FILE_LIMITS>
      
      slots.forEach(slot => {
        expect(SLOT_FILE_LIMITS[slot]).toBe(FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE)
      })
    })
  })
})

