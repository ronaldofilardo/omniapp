import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/admin/audit-documents/route'
import { NextRequest } from 'next/server'

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
    },
    report: {
      findMany: vi.fn(),
    },
    files: {
      findMany: vi.fn(),
    },
    emissorInfo: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/admin/audit-documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = () => {
    return {
      url: 'http://localhost:3000/api/admin/audit-documents'
    } as NextRequest
  }

  describe('Autenticação e autorização', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled()
    })

    it('should return 401 if user is not ADMIN or EMISSOR', async () => {
      mockAuth.mockResolvedValue({
        id: 'user-1',
        email: 'receptor@example.com',
        role: 'RECEPTOR',
      })

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled()
    })

    it('should allow access for EMISSOR users', async () => {
      mockAuth.mockResolvedValue({
        id: 'emissor-1',
        email: 'emissor@omni.com',
        role: 'EMISSOR',
      })
      mockPrisma.emissorInfo.findUnique.mockResolvedValue({
        cnpj: '12.345.678/0001-99',
        user: { name: 'Emissor Teste', email: 'emissor@omni.com' }
      })
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.report.findMany.mockResolvedValue([])
      mockPrisma.files.findMany.mockResolvedValue([])
      mockPrisma.emissorInfo.findMany.mockResolvedValue([])

      const req = createMockRequest()
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(mockPrisma.emissorInfo.findUnique).toHaveBeenCalledWith({
        where: { userId: 'emissor-1' },
        select: { cnpj: true }
      })
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { emitterCnpj: '12.345.678/0001-99' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    })

    it('should allow access for ADMIN users', async () => {
      mockAuth.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@omni.com',
        role: 'ADMIN',
      })
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.report.findMany.mockResolvedValue([])
      mockPrisma.files.findMany.mockResolvedValue([])
      mockPrisma.emissorInfo.findMany.mockResolvedValue([])

      const req = createMockRequest()
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalled()
    })
  })

  describe('Busca de audit logs', () => {
    beforeEach(() => {
      mockPrisma.report.findMany.mockResolvedValue([])
      mockPrisma.files.findMany.mockResolvedValue([])
      mockPrisma.emissorInfo.findMany.mockResolvedValue([])
    })

    it('should fetch audit logs ordered by createdAt desc', async () => {
      mockAuth.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@omni.com',
        role: 'ADMIN',
      })
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      const req = createMockRequest()
      await GET(req)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
        where: {},
      })
      expect(mockPrisma.report.findMany).toHaveBeenCalled()
      expect(mockPrisma.files.findMany).toHaveBeenCalled()
      expect(mockPrisma.emissorInfo.findMany).toHaveBeenCalled()
    })

    it('should return documents array with emitter name from reports', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          protocol: 'LAB-001',
          patientName: 'João Silva',
          emitterCnpj: null,
          createdAt: new Date('2024-11-24T10:00:00'),
          fileName: 'laudo.pdf',
          fileHash: 'hash123',
          documentType: 'result',
          status: 'SUCCESS', // Report status 'VIEWED' mapeado para 'SUCCESS'
          receiverCpf: '11122233344',
          receivedAt: new Date('2024-11-24T10:05:00'),
          origin: 'API_EXTERNA',
        },
      ]

      const mockReports = [
        {
          id: 'report-1',
          protocol: 'LAB-001',
          title: 'Laudo Resultado',
          fileName: 'laudo.pdf',
          fileUrl: '/files/laudo.pdf',
          status: 'VIEWED',
          sentAt: new Date('2024-11-24T10:00:00'),
          receivedAt: new Date('2024-11-24T10:05:00'),
          sender: {
            name: 'Laboratório Omni',
            email: 'labor@omni.com',
            emissorInfo: {
              cnpj: '12.345.678/0001-99',
              clinicName: 'Laboratório Omni',
            },
          },
          receiver: {
            name: 'João Silva',
            cpf: '11122233344',
          },
        },
      ]

      mockAuth.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@omni.com',
        role: 'ADMIN',
      })
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)
      mockPrisma.report.findMany.mockResolvedValue(mockReports)
      mockPrisma.files.findMany.mockResolvedValue([])
      mockPrisma.emissorInfo.findMany.mockResolvedValue([])

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.documents).toHaveLength(1)
      expect(data.total).toBe(1)
      expect(data.documents[0]).toMatchObject({
        protocol: 'LAB-001',
        patientName: 'João Silva',
        emitterName: 'Laboratório Omni',
        emitterCnpj: '12.345.678/0001-99',
        fileName: 'laudo.pdf',
        fileHash: 'hash123',
        status: 'SUCCESS',
        receiverCpf: '11122233344',
        origin: 'PORTAL_EMISSOR',
      })
      expect(data.documents[0].createdAt).toBeDefined()
      expect(data.documents[0].receivedAt).toBeDefined()
    })

    it('should map all report status values correctly', async () => {
      const mockReports = [
        { id: 'r1', protocol: 'P001', status: 'SENT', sender: { name: 'Lab1' }, receiver: { name: 'Pat1', cpf: '111' }, sentAt: new Date(), fileName: 'f1.pdf' },
        { id: 'r2', protocol: 'P002', status: 'DELIVERED', sender: { name: 'Lab2' }, receiver: { name: 'Pat2', cpf: '222' }, sentAt: new Date(), fileName: 'f2.pdf' },
        { id: 'r3', protocol: 'P003', status: 'RECEIVED', sender: { name: 'Lab3' }, receiver: { name: 'Pat3', cpf: '333' }, sentAt: new Date(), fileName: 'f3.pdf' },
        { id: 'r4', protocol: 'P004', status: 'VIEWED', sender: { name: 'Lab4' }, receiver: { name: 'Pat4', cpf: '444' }, sentAt: new Date(), fileName: 'f4.pdf' },
      ]

      mockAuth.mockResolvedValue({ id: 'admin-1', email: 'admin@omni.com', role: 'ADMIN' })
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.report.findMany.mockResolvedValue(mockReports)
      mockPrisma.files.findMany.mockResolvedValue([])
      mockPrisma.emissorInfo.findMany.mockResolvedValue([])

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.documents).toHaveLength(4)

      const statusMap = data.documents.reduce((acc: any, doc: any) => {
        acc[doc.protocol] = doc.status
        return acc
      }, {})

      expect(statusMap['P001']).toBe('PROCESSING') // SENT
      expect(statusMap['P002']).toBe('DELIVERED')   // DELIVERED
      expect(statusMap['P003']).toBe('RECEIVED')    // RECEIVED
      expect(statusMap['P004']).toBe('SUCCESS')     // VIEWED
    })

    it('should prioritize report status over audit log status', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          protocol: 'LAB-001',
          status: 'SUCCESS', // AuditLog status (não deve ser usado)
          createdAt: new Date(),
          fileName: 'laudo.pdf',
          fileHash: 'hash123',
          documentType: 'result',
          receiverCpf: '11122233344',
          origin: 'API_EXTERNA',
        },
      ]

      const mockReports = [
        {
          id: 'report-1',
          protocol: 'LAB-001',
          status: 'SENT', // Report status (deve ser usado)
          sender: { name: 'Laboratório Omni' },
          receiver: { name: 'João Silva', cpf: '11122233344' },
          sentAt: new Date(),
          fileName: 'laudo.pdf',
        },
      ]

      mockAuth.mockResolvedValue({ id: 'admin-1', email: 'admin@omni.com', role: 'ADMIN' })
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)
      mockPrisma.report.findMany.mockResolvedValue(mockReports)
      mockPrisma.files.findMany.mockResolvedValue([])
      mockPrisma.emissorInfo.findMany.mockResolvedValue([])

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.documents[0].status).toBe('PROCESSING') // Deve usar status do Report, não do AuditLog
      expect(data.documents[0].fileHash).toBe('hash123') // Mas deve enriquecer com dados do AuditLog
    })
  })

  describe('Agrupamento por protocolo', () => {
    beforeEach(() => {
      mockPrisma.report.findMany.mockResolvedValue([])
      mockPrisma.files.findMany.mockResolvedValue([])
      mockPrisma.emissorInfo.findMany.mockResolvedValue([])
    })

    it('should group logs by protocol and keep only the first occurrence', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          protocol: 'LAB-001',
          patientName: 'João Silva',
          emitterCnpj: '12345678000199',
          createdAt: new Date('2024-11-24T10:00:00'),
          fileName: 'laudo.pdf',
          fileHash: 'hash123',
          documentType: 'result',
          status: 'SUCCESS',
          receiverCpf: '11122233344',
          receivedAt: new Date('2024-11-24T10:05:00'),
          origin: 'API_EXTERNA',
        },
        {
          id: 'log-2',
          protocol: 'LAB-001', // Mesmo protocolo
          patientName: 'João Silva Updated',
          emitterCnpj: '12345678000199',
          createdAt: new Date('2024-11-24T10:10:00'),
          fileName: 'laudo-updated.pdf',
          fileHash: 'hash789',
          documentType: 'result',
          status: 'SUCCESS',
          receiverCpf: '11122233344',
          receivedAt: new Date('2024-11-24T10:15:00'),
          origin: 'API_EXTERNA',
        },
      ]

      mockAuth.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@omni.com',
        role: 'ADMIN',
      })
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.documents).toHaveLength(1) // Agrupado por protocolo
      expect(data.documents[0].protocol).toBe('LAB-001')
      expect(data.documents[0].fileName).toBe('laudo.pdf') // Primeira ocorrência
    })

    it('should handle logs without protocol using unique keys', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          protocol: null,
          patientName: 'João Silva',
          emitterCnpj: null,
          createdAt: new Date('2024-11-24T10:00:00'),
          fileName: 'file1.pdf',
          fileHash: 'hash1',
          documentType: 'result',
          status: 'SUCCESS',
          receiverCpf: '11122233344',
          receivedAt: new Date('2024-11-24T10:05:00'),
          origin: 'PORTAL_LOGADO',
        },
        {
          id: 'log-2',
          protocol: null,
          patientName: 'Maria Santos',
          emitterCnpj: null,
          createdAt: new Date('2024-11-24T11:00:00'),
          fileName: 'file2.pdf',
          fileHash: 'hash2',
          documentType: 'result',
          status: 'SUCCESS',
          receiverCpf: '55566677788',
          receivedAt: new Date('2024-11-24T11:05:00'),
          origin: 'PORTAL_LOGADO',
        },
      ]

      mockAuth.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@omni.com',
        role: 'ADMIN',
      })
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.documents).toHaveLength(2) // Não agrupa sem protocolo
      expect(data.documents[0].protocol).toBeNull()
      expect(data.documents[1].protocol).toBeNull()
    })
  })

  describe('Tratamento de erros', () => {
    beforeEach(() => {
      mockPrisma.report.findMany.mockResolvedValue([])
      mockPrisma.files.findMany.mockResolvedValue([])
      mockPrisma.emissorInfo.findMany.mockResolvedValue([])
    })

    it('should return 500 if database error occurs', async () => {
      mockAuth.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@omni.com',
        role: 'ADMIN',
      })
      mockPrisma.auditLog.findMany.mockRejectedValue(
        new Error('Database error')
      )

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro ao buscar documentos de auditoria')
    })
  })
})

