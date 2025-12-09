import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de path
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/').replace(/\/+/g, '/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/') || '.'),
  default: {
    join: vi.fn((...args) => args.join('/').replace(/\/+/g, '/')),
    dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/') || '.')
  }
}))

// Mock de fs/promises
vi.mock('fs/promises', () => {
  const actual = require('fs/promises')
  return {
    ...actual,
    default: actual,
    access: vi.fn(),
    readFile: vi.fn()
  }
})

// Mock do prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    files: {
      findUnique: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    },
    adminMetrics: {
      upsert: vi.fn().mockResolvedValue({})
    }
  }
}))

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

// Mock do auditService
vi.mock('@/lib/services/auditService', () => ({
  logDocumentSubmission: vi.fn().mockResolvedValue({})
}))

// Importar dependências DEPOIS dos mocks
import path from 'path'
import { GET } from '@/app/api/files/[id]/download/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logDocumentSubmission } from '@/lib/services/auditService'
import fs from 'fs'
import { access, readFile } from 'fs/promises'

describe('/api/files/[id]/download', () => {
  const testFileContent = Buffer.from('fake image content < 2KB')
  const testFiles = [
    'public/uploads/test.jpg',
    'public/uploads/document.pdf',
    'public/uploads/image.png',
    'public/uploads/unknown.xyz'
  ]

  beforeEach(async () => {
    vi.clearAllMocks()
    // Criar arquivos físicos temporários para os testes
    for (const filePath of testFiles) {
      const fullPath = path.join(process.cwd(), filePath)
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.promises.writeFile(fullPath, testFileContent)
    }
  })

  afterEach(async () => {
    // Limpar arquivos temporários
    for (const filePath of testFiles) {
      try {
        const fullPath = path.join(process.cwd(), filePath)
        await fs.promises.unlink(fullPath)
      } catch (error) {
        // Ignorar se arquivo não existir
      }
    }
  })

  describe('GET', () => {
    it('should download file successfully and update metrics', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN'
      })

      access.mockResolvedValue(undefined)
      readFile.mockResolvedValue(testFileContent)

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-1',
        name: 'test.jpg',
        url: '/api/files/file-1/download',
        physicalPath: 'uploads/test.jpg',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: null
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        cpf: '12345678901',
        name: 'Test User'
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download')
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const buffer = await response.arrayBuffer()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/jpeg')
      expect(response.headers.get('Content-Disposition')).toBe('inline; filename="test.jpg"')
      expect(Buffer.from(buffer)).toEqual(testFileContent)

      expect(prisma.adminMetrics.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: { totalDownloadBytes: { increment: BigInt(testFileContent.length) } },
        create: { id: 'singleton', totalDownloadBytes: BigInt(testFileContent.length) }
      })
    })

    it('should return 404 for non-existent file', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN'
      })

      vi.mocked(prisma.files.findUnique).mockResolvedValue(null)

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download')
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Arquivo não encontrado')
    })

    it('should return correct Content-Type for PDF files', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN'
      })

      access.mockResolvedValue(undefined)
      readFile.mockResolvedValue(testFileContent)

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-2',
        name: 'document.pdf',
        url: '/api/files/file-2/download',
        physicalPath: 'uploads/document.pdf',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: null
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        cpf: '12345678901',
        name: 'Test User'
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-2/download')
      const mockParams = { id: 'file-2' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const buffer = await response.arrayBuffer()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('Content-Disposition')).toBe('inline; filename="document.pdf"')
      expect(Buffer.from(buffer)).toEqual(testFileContent)
    })

    it('should return correct Content-Type for PNG files', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN'
      })

      access.mockResolvedValue(undefined)
      readFile.mockResolvedValue(testFileContent)

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-3',
        name: 'image.png',
        url: '/api/files/file-3/download',
        physicalPath: 'uploads/image.png',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: null
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        cpf: '12345678901',
        name: 'Test User'
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-3/download')
      const mockParams = { id: 'file-3' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const buffer = await response.arrayBuffer()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/png')
      expect(response.headers.get('Content-Disposition')).toBe('inline; filename="image.png"')
      expect(Buffer.from(buffer)).toEqual(testFileContent)
    })

    it('should return application/octet-stream for unknown file types', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN'
      })

      access.mockResolvedValue(undefined)
      readFile.mockResolvedValue(testFileContent)

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-4',
        name: 'unknown.xyz',
        url: '/api/files/file-4/download',
        physicalPath: 'uploads/unknown.xyz',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: null
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        cpf: '12345678901',
        name: 'Test User'
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-4/download')
      const mockParams = { id: 'file-4' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const buffer = await response.arrayBuffer()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="unknown.xyz"')
      expect(Buffer.from(buffer)).toEqual(testFileContent)
    })

    it('should return 404 for file not found on disk', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN'
      })

      // Remove um arquivo específico para simular arquivo não encontrado no disco
      const missingFilePath = 'public/uploads/missing.jpg'
      const fullPath = path.join(process.cwd(), missingFilePath)

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-missing',
        name: 'missing.jpg',
        url: '/api/files/file-missing/download',
        physicalPath: 'uploads/missing.jpg',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: null
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-missing/download')
      const mockParams = { id: 'file-missing' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Arquivo não encontrado no sistema')
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download')
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Não autorizado')
    })

    it('should return 403 for authenticated user without access to file', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'RECEPTOR'
      })

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-1',
        name: 'test.jpg',
        url: '/api/files/file-1/download',
        physicalPath: 'uploads/test.jpg',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: null
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download')
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Acesso negado ao arquivo')
    })

    it('should allow access for ADMIN user', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN'
      })

      access.mockResolvedValue(undefined)
      readFile.mockResolvedValue(testFileContent)

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-1',
        name: 'test.jpg',
        url: '/api/files/file-1/download',
        physicalPath: 'uploads/test.jpg',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: null
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        cpf: '12345678901',
        name: 'Admin User'
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Browser'
        }
      })
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)

      expect(response.status).toBe(200)
      expect(logDocumentSubmission).toHaveBeenCalledWith({
        origin: 'PORTAL_LOGADO',
        receiverCpf: '12345678901',
        patientId: 'admin-1',
        patientName: 'Admin User',
        fileName: 'test.jpg',
        fileHash: null,
        protocol: null,
        ip: '192.168.1.1',
        userAgent: 'Test Browser',
        status: 'SUCCESS'
      })
    })

    it('should allow access for user owning the health event', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'RECEPTOR'
      })

      access.mockResolvedValue(undefined)
      readFile.mockResolvedValue(testFileContent)

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-1',
        name: 'test.jpg',
        url: '/api/files/file-1/download',
        physicalPath: 'uploads/test.jpg',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: {
          id: 'event-1',
          userId: 'user-1',
          title: 'Test Event',
          type: 'CONSULTA'
        },
        professionals: null
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        cpf: '12345678901',
        name: 'Test User'
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download')
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)

      expect(response.status).toBe(200)
      expect(logDocumentSubmission).toHaveBeenCalled()
    })

    it('should allow access for user owning the professional', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'EMISSOR'
      })

      access.mockResolvedValue(undefined)
      readFile.mockResolvedValue(testFileContent)

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-1',
        name: 'test.jpg',
        url: '/api/files/file-1/download',
        physicalPath: 'uploads/test.jpg',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: {
          id: 'prof-1',
          userId: 'user-1',
          name: 'Dr. Test'
        }
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        cpf: '12345678901',
        name: 'Test User'
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download')
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)

      expect(response.status).toBe(200)
      expect(logDocumentSubmission).toHaveBeenCalled()
    })

    it('should deny access for user not owning the file', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'RECEPTOR'
      })

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-1',
        name: 'test.jpg',
        url: '/api/files/file-1/download',
        physicalPath: 'uploads/test.jpg',
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: {
          id: 'event-1',
          userId: 'user-2', // Different user
          title: 'Test Event',
          type: 'CONSULTA'
        },
        professionals: null
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download')
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Acesso negado ao arquivo')
    })

    it('should prevent access to files with invalid physicalPath', async () => {
      vi.mocked(auth).mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN'
      })

      vi.mocked(prisma.files.findUnique).mockResolvedValue({
        id: 'file-1',
        name: 'test.jpg',
        url: '/api/files/file-1/download',
        physicalPath: '/share/test.jpg', // Invalid path
        eventId: null,
        professionalId: null,
        slot: 'slot1',
        uploadDate: '2023-01-01',
        expiryDate: null,
        isOrphaned: false,
        orphanedReason: null,
        health_events: null,
        professionals: null
      })

      const mockRequest = new Request('http://localhost:3000/api/files/file-1/download')
      const mockParams = { id: 'file-1' }
      const mockContext = { params: Promise.resolve(mockParams) }

      const response = await GET(mockRequest, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Arquivo não encontrado')
    })
  })
})
