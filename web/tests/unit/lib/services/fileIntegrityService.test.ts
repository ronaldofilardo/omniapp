import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    files: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock do fileHashServer
vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBuffer: vi.fn(),
}))

// Mock do fs promises - usar vi.hoisted para criar mocks reutilizáveis
const { mockAccessFn, mockReadFileFn } = vi.hoisted(() => ({
  mockAccessFn: vi.fn(),
  mockReadFileFn: vi.fn(),
}))

vi.mock('fs', () => ({
  default: {
    promises: {
      access: mockAccessFn,
      readFile: mockReadFileFn,
    },
  },
  promises: {
    access: mockAccessFn,
    readFile: mockReadFileFn,
  },
}))

import {
  verifyFileIntegrity,
  verifyMultipleFileIntegrity,
  auditUserFilesIntegrity,
  verifyFileIntegrityForDownload,
} from '@/lib/services/fileIntegrityService'

import { prisma } from '@/lib/prisma'
import { calculateFileHashFromBuffer } from '@/lib/utils/fileHashServer'

const mockPrisma = prisma as any
const mockFsAccess = mockAccessFn
const mockFsReadFile = mockReadFileFn
const mockHashFn = calculateFileHashFromBuffer as any

describe('fileIntegrityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyFileIntegrity', () => {
    it('deve validar arquivo íntegro com sucesso', async () => {
      const fileId = 'file-123'
      
      mockPrisma.files.findUnique.mockResolvedValue({
        id: fileId,
        fileHash: 'abc123hash',
        physicalPath: '/path/to/file.pdf',
        name: 'documento.pdf',
      })

      mockFsAccess.mockResolvedValue(undefined) // Arquivo existe
      mockFsReadFile.mockResolvedValue(Buffer.from('valid-content'))
      mockHashFn.mockReturnValue('abc123hash')

      const result = await verifyFileIntegrity(fileId)

      expect(result.isValid).toBe(true)
      expect(result.storedHash).toBe('abc123hash')
      expect(result.calculatedHash).toBe('abc123hash')
      expect(result.error).toBeUndefined()
    })

    it('deve detectar arquivo modificado', async () => {
      const fileId = 'file-456'
      
      mockPrisma.files.findUnique.mockResolvedValue({
        id: fileId,
        fileHash: 'abc123hash',
        physicalPath: '/path/to/file.pdf',
        name: 'documento.pdf',
      })

      mockFsAccess.mockResolvedValue(undefined)
      mockFsReadFile.mockResolvedValue(Buffer.from('modified-content'))
      mockHashFn.mockReturnValue('modified-hash')

      const result = await verifyFileIntegrity(fileId)

      expect(result.isValid).toBe(false)
      expect(result.storedHash).toBe('abc123hash')
      expect(result.calculatedHash).toBe('modified-hash')
      expect(result.error).toContain('Hash não confere')
    })

    it('deve retornar erro para arquivo não encontrado no banco', async () => {
      mockPrisma.files.findUnique.mockResolvedValue(null)

      const result = await verifyFileIntegrity('file-999')

      expect(result.isValid).toBe(false)
      expect(result.storedHash).toBeNull()
      expect(result.error).toContain('Arquivo não encontrado no banco')
    })

    it('deve retornar erro para arquivo sem hash', async () => {
      mockPrisma.files.findUnique.mockResolvedValue({
        id: 'file-789',
        fileHash: null,
        physicalPath: '/path/to/file.pdf',
      })

      const result = await verifyFileIntegrity('file-789')

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Hash não foi calculado')
    })

    it('deve retornar erro para arquivo físico ausente', async () => {
      mockPrisma.files.findUnique.mockResolvedValue({
        id: 'file-111',
        fileHash: 'abc123hash',
        physicalPath: '/path/to/missing.pdf',
      })

      mockFsAccess.mockRejectedValue(new Error('ENOENT'))
      mockFsReadFile.mockRejectedValue(new Error('ENOENT')) // Arquivo também não pode ser lido
      // Não configurar mockHashFn pois o arquivo não existe e não deve calcular hash

      const result = await verifyFileIntegrity('file-111')

      expect(mockFsAccess).toHaveBeenCalledWith('/path/to/missing.pdf')
      expect(result.isValid).toBe(false)
      expect(result.storedHash).toBe('abc123hash')
      expect(result.error).toBe('Arquivo físico não encontrado no storage')
    })
  })

  describe('verifyMultipleFileIntegrity', () => {
    it('deve verificar múltiplos arquivos em lote', async () => {
      const fileIds = ['file-1', 'file-2', 'file-3']

      // Configurar mocks para cada arquivo
      mockPrisma.files.findUnique
        .mockResolvedValueOnce({
          id: 'file-1',
          fileHash: 'hash1',
          physicalPath: '/path/file1.pdf',
        })
        .mockResolvedValueOnce({
          id: 'file-2',
          fileHash: 'hash2',
          physicalPath: '/path/file2.pdf',
        })
        .mockResolvedValueOnce({
          id: 'file-3',
          fileHash: 'hash3',
          physicalPath: '/path/file3.pdf',
        })

      mockFsAccess.mockResolvedValue(undefined)
      mockFsReadFile.mockResolvedValue(Buffer.from('valid-content'))

      const results = await verifyMultipleFileIntegrity(fileIds)

      expect(Object.keys(results)).toHaveLength(3)
      expect(results['file-1']).toBeDefined()
      expect(results['file-2']).toBeDefined()
      expect(results['file-3']).toBeDefined()
    })

    it('deve processar arquivos em lotes', async () => {
      // Testar com mais de 5 arquivos (tamanho do lote)
      const fileIds = Array.from({ length: 10 }, (_, i) => `file-${i}`)

      mockPrisma.files.findUnique.mockResolvedValue({
        id: 'file-x',
        fileHash: 'hashx',
        physicalPath: '/path/filex.pdf',
      })

      mockFsAccess.mockResolvedValue(undefined)
      mockFsReadFile.mockResolvedValue(Buffer.from('valid-content'))

      const results = await verifyMultipleFileIntegrity(fileIds)

      expect(Object.keys(results)).toHaveLength(10)
    })
  })

  describe('auditUserFilesIntegrity', () => {
    it('deve auditar todos os arquivos de um usuário', async () => {
      const userId = 'user-123'

      mockPrisma.files.findMany.mockResolvedValue([
        { id: 'file-1' },
        { id: 'file-2' },
        { id: 'file-3' },
      ])

      // Mock para verificações individuais
      mockPrisma.files.findUnique
        .mockResolvedValueOnce({
          id: 'file-1',
          fileHash: 'hash1',
          physicalPath: '/path/file1.pdf',
        })
        .mockResolvedValueOnce({
          id: 'file-2',
          fileHash: 'hash2',
          physicalPath: '/path/file2.pdf',
        })
        .mockResolvedValueOnce({
          id: 'file-3',
          fileHash: null, // Arquivo sem hash
          physicalPath: '/path/file3.pdf',
        })

      mockFsAccess.mockResolvedValue(undefined)
      mockFsReadFile.mockResolvedValue(Buffer.from('valid-content'))
      mockHashFn.mockReturnValueOnce('hash1')
        .mockReturnValueOnce('hash2')

      const audit = await auditUserFilesIntegrity(userId)

      expect(audit.totalFiles).toBe(3)
      expect(audit.validFiles).toBe(2)
      expect(audit.invalidFiles).toBe(0)
      expect(audit.errorFiles).toBe(1) // file-3 sem hash
      expect(Object.keys(audit.details)).toHaveLength(3)
    })

    it('deve retornar auditoria vazia para usuário sem arquivos', async () => {
      mockPrisma.files.findMany.mockResolvedValue([])

      const audit = await auditUserFilesIntegrity('user-999')

      expect(audit.totalFiles).toBe(0)
      expect(audit.validFiles).toBe(0)
      expect(audit.invalidFiles).toBe(0)
      expect(audit.errorFiles).toBe(0)
    })
  })

  describe('verifyFileIntegrityForDownload', () => {
    it('deve autorizar download de arquivo íntegro', async () => {
      mockPrisma.files.findUnique.mockResolvedValue({
        id: 'file-123',
        fileHash: 'abc123hash',
        physicalPath: '/path/to/file.pdf',
      })

      mockFsAccess.mockResolvedValue(undefined)
      mockFsReadFile.mockResolvedValue(Buffer.from('valid-content'))
      mockHashFn.mockReturnValue('abc123hash')

      const result = await verifyFileIntegrityForDownload('file-123')

      expect(result.isValid).toBe(true)
      expect(result.shouldProceed).toBe(true)
      expect(result.message).toContain('íntegro')
    })

    it('deve bloquear download de arquivo modificado', async () => {
      mockPrisma.files.findUnique.mockResolvedValue({
        id: 'file-456',
        fileHash: 'abc123hash',
        physicalPath: '/path/to/file.pdf',
      })

      mockFsAccess.mockResolvedValue(undefined)
      mockFsReadFile.mockResolvedValue(Buffer.from('modified-content'))
      mockHashFn.mockReturnValue('modified-hash') // Hash diferente indica arquivo modificado

      const result = await verifyFileIntegrityForDownload('file-456')

      expect(result.isValid).toBe(false)
      expect(result.shouldProceed).toBe(false)
      expect(result.message).toContain('modificado')
    })

    it('deve bloquear download quando houver erro', async () => {
      mockPrisma.files.findUnique.mockResolvedValue(null)

      const result = await verifyFileIntegrityForDownload('file-999')

      expect(result.isValid).toBe(false)
      expect(result.shouldProceed).toBe(false)
      expect(result.message).toContain('Erro')
    })
  })
})


