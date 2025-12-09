import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/notifications/route'
import { NextRequest } from 'next/server'

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
    },
    report: {
      updateMany: vi.fn(),
    },
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = () => {
    return {
      url: 'http://localhost:3000/api/notifications',
      method: 'GET',
    } as NextRequest
  }

  describe('GET - Buscar notificações', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Autenticação necessária')
      expect(mockPrisma.notification.findMany).not.toHaveBeenCalled()
    })

    it('should fetch notifications for authenticated user', async () => {
      const createdAt = new Date()
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'LAB_RESULT',
          payload: { reportId: 'report-1', title: 'Laudo' },
          status: 'UNREAD',
          createdAt,
        },
      ]

      const expectedNotifications = [
        {
          id: 'notif-1',
          type: 'LAB_RESULT',
          payload: { reportId: 'report-1', title: 'Laudo' },
          status: 'UNREAD',
          createdAt: createdAt.toISOString(),
        },
      ]

      mockAuth.mockResolvedValue({ id: 'user-1', email: 'user@test.com', role: 'RECEPTOR' })
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications)
      mockPrisma.report.updateMany.mockResolvedValue({ count: 1 })

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(expectedNotifications)
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: ['UNREAD', 'ARCHIVED'] }
        },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should mark associated reports as DELIVERED when notifications are fetched', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'LAB_RESULT',
          payload: { reportId: 'report-1' },
          status: 'UNREAD',
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          type: 'LAB_RESULT',
          payload: { reportId: 'report-2' },
          status: 'UNREAD',
          createdAt: new Date(),
        },
      ]

      mockAuth.mockResolvedValue({ id: 'user-1', email: 'user@test.com', role: 'RECEPTOR' })
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications)
      mockPrisma.report.updateMany.mockResolvedValue({ count: 2 })

      const req = createMockRequest()
      await GET(req)

      expect(mockPrisma.report.updateMany).toHaveBeenCalled()
    })

    it('should handle notifications without reportId', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'LAB_RESULT',
          payload: { title: 'Laudo sem reportId' }, // Sem reportId
          status: 'UNREAD',
          createdAt: new Date(),
        },
      ]

      mockAuth.mockResolvedValue({ id: 'user-1', email: 'user@test.com', role: 'RECEPTOR' })
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications)
      mockPrisma.report.updateMany.mockResolvedValue({ count: 0 })

      const req = createMockRequest()
      await GET(req)

      // Não deve chamar updateMany quando não há reportIds
      expect(mockPrisma.report.updateMany).not.toHaveBeenCalled()
    })

    it('should handle empty notifications array', async () => {
      mockAuth.mockResolvedValue({ id: 'user-1', email: 'user@test.com', role: 'RECEPTOR' })
      mockPrisma.notification.findMany.mockResolvedValue([])
      mockPrisma.report.updateMany.mockResolvedValue({ count: 0 })

      const req = createMockRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
      // Não deve chamar updateMany quando não há notificações
      expect(mockPrisma.report.updateMany).not.toHaveBeenCalled()
    })
  })
})
