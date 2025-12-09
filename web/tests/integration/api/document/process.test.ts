import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/document/process/route'
import { NextRequest } from 'next/server'

const mockRedisInstance = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  rpop: vi.fn(),
  llen: vi.fn(),
  lrange: vi.fn(),
}))

vi.mock('@upstash/redis', () => {
  return {
    Redis: class MockRedis {
      get = mockRedisInstance.get
      set = mockRedisInstance.set
      rpop = mockRedisInstance.rpop
      llen = mockRedisInstance.llen
      lrange = mockRedisInstance.lrange
    }
  }
})

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    report: {
      create: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}))

// Mock do audit service
vi.mock('@/lib/services/auditService', () => ({
  logDocumentSubmission: vi.fn(),
}))

// Mock do fileHashServer
vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBase64: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { logDocumentSubmission } from '@/lib/services/auditService'
import { calculateFileHashFromBase64 } from '@/lib/utils/fileHashServer'

const mockPrisma = prisma as any
const mockLogDocumentSubmission = logDocumentSubmission as any
const mockCalculateFileHashFromBase64 = calculateFileHashFromBase64 as any

describe('/api/document/process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisInstance.get.mockReset()
    mockRedisInstance.set.mockReset()
    mockRedisInstance.rpop.mockReset()
    mockRedisInstance.llen.mockReset()
  })

  describe('GET /api/document/process', () => {
    it('should return queue status with jobs available', async () => {
      mockRedisInstance.llen.mockResolvedValue(5)

      const req = new Request('http://localhost/api/document/process')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.queueLength).toBe(5)
      expect(data.hasJobs).toBe(true)
      expect(mockRedisInstance.llen).toHaveBeenCalledWith('document_submit_queue')
    })

    it('should return queue status with no jobs', async () => {
      mockRedisInstance.llen.mockResolvedValue(0)

      const req = new Request('http://localhost/api/document/process')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.queueLength).toBe(0)
      expect(data.hasJobs).toBe(false)
    })

    it('should handle Redis errors in GET', async () => {
      mockRedisInstance.llen.mockRejectedValue(new Error('Redis failed'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno do servidor')
    })
  })

  describe('POST /api/document/process', () => {
    it('should process a job from the queue', async () => {
      const jobId = 'test-job-123'
      const jobData = JSON.stringify({
        status: 'pending',
        payload: {
          patientEmail: 'patient@example.com',
          doctorName: 'Dr. Test',
          examDate: '2024-01-01',
          documento: 'DOC-123',
          cpf: '12345678901',
          documentType: 'result',
          report: {
            fileName: 'test.pdf',
            fileContent: Buffer.from('test').toString('base64')
          },
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        },
        createdAt: '2024-01-01T00:00:00.000Z'
      })

      // Mock queue operations
      mockRedisInstance.rpop.mockResolvedValue(jobId)
      mockRedisInstance.get.mockResolvedValue(jobData)
      mockRedisInstance.set.mockResolvedValue('OK')

      // Mock Prisma operations
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-123',
        cpf: '12345678901',
        email: 'user@example.com'
      })
      mockCalculateFileHashFromBase64.mockReturnValue('hash123')
      mockLogDocumentSubmission.mockResolvedValue(undefined)
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-456',
        notificationId: null
      })
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-789',
        createdAt: '2024-01-01T00:05:00.000Z'
      })
      mockPrisma.report.update.mockResolvedValue({})

      const req = {} as NextRequest
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe(`Processando job ${jobId}`)
      expect(data.jobId).toBe(jobId)
      expect(mockRedisInstance.rpop).toHaveBeenCalledWith('document_submit_queue')
      expect(mockRedisInstance.get).toHaveBeenCalledWith('job:test-job-123')
    })

    it('should return message when no jobs in queue', async () => {
      mockRedisInstance.rpop.mockResolvedValue(null)

      const req = {} as NextRequest
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Nenhum job na fila')
      expect(mockRedisInstance.rpop).toHaveBeenCalledWith('document_submit_queue')
    })

    it('should handle job processing errors', async () => {
      const jobId = 'failing-job-123'
      const jobData = JSON.stringify({
        status: 'pending',
        payload: {
          patientEmail: 'patient@example.com',
          doctorName: 'Dr. Test',
          examDate: '2024-01-01',
          documento: 'DOC-123',
          cpf: '12345678901',
          documentType: 'result',
          report: {
            fileName: 'test.pdf',
            fileContent: Buffer.from('test').toString('base64')
          },
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        },
        createdAt: '2024-01-01T00:00:00.000Z'
      })

      mockRedisInstance.rpop.mockResolvedValue(jobId)
      mockRedisInstance.get.mockResolvedValue(jobData)
      mockRedisInstance.set.mockResolvedValue('OK')

      // Mock user not found error
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const req = {} as NextRequest
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe(`Processando job ${jobId}`)
      expect(data.jobId).toBe(jobId)

      // The actual error handling happens in the background processDocumentJob function
      // which runs asynchronously, so we can't test the final status here
    })

    it('should handle Redis errors in POST', async () => {
      mockRedisInstance.rpop.mockRejectedValue(new Error('Redis failed'))

      const req = {} as NextRequest
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno do servidor')
    })
  })
})
