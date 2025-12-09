import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../setup/prisma-mock'

vi.mock('../../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { notificationRepository } from '../../../src/repositories/notification.repository'
import { Notification } from '@prisma/client'

describe('NotificationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findById', () => {
    it('should return notification when found', async () => {
      const mockNotification: Notification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'LAB_RESULT',
        payload: { message: 'Test notification' },
        status: 'UNREAD',
        documento: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockPrisma.notification.findUnique).mockResolvedValue(mockNotification)

      const result = await notificationRepository.findById('notif-1')

      expect(mockPrisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      })
      expect(result).toEqual(mockNotification)
    })

    it('should return null when notification not found', async () => {
      vi.mocked(mockPrisma.notification.findUnique).mockResolvedValue(null)

      const result = await notificationRepository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findMany', () => {
    it('should return notifications with filters ordered by createdAt desc', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'LAB_RESULT',
          payload: { message: 'Test notification' },
          status: 'UNREAD',
          documento: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationRepository.findMany({ userId: 'user-1' })

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockNotifications)
    })

    it('should return all notifications when no filters', async () => {
      const mockNotifications: Notification[] = []

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationRepository.findMany()

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockNotifications)
    })
  })

  describe('findByUserId', () => {
    it('should return notifications for user ordered by createdAt desc', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'LAB_RESULT',
          payload: { message: 'Test notification' },
          status: 'UNREAD',
          documento: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationRepository.findByUserId('user-1')

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockNotifications)
    })
  })

  describe('findUnreadByUserId', () => {
    it('should return unread notifications for user ordered by createdAt desc', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'LAB_RESULT',
          payload: { message: 'Test notification' },
          status: 'UNREAD',
          documento: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationRepository.findUnreadByUserId('user-1')

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'UNREAD',
        },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockNotifications)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification: Notification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'LAB_RESULT',
        payload: { message: 'Test notification' },
        status: 'READ',
        documento: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockPrisma.notification.update).mockResolvedValue(mockNotification)

      const result = await notificationRepository.markAsRead('notif-1')

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { status: 'READ' },
      })
      expect(result).toEqual(mockNotification)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for user', async () => {
      vi.mocked(mockPrisma.notification.updateMany).mockResolvedValue({ count: 5 })

      await notificationRepository.markAllAsRead('user-1')

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'UNREAD',
        },
        data: { status: 'READ' },
      })
    })
  })

  describe('create', () => {
    it('should create new notification', async () => {
      const createData = {
        userId: 'user-1',
        type: 'LAB_RESULT' as const,
        payload: { message: 'New notification' },
        status: 'UNREAD' as const,
      }

      const mockNotification: Notification = {
        id: 'notif-new',
        ...createData,
        documento: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockPrisma.notification.create).mockResolvedValue(mockNotification)

      const result = await notificationRepository.create(createData)

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: createData,
      })
      expect(result).toEqual(mockNotification)
    })
  })

  describe('update', () => {
    it('should update notification', async () => {
      const updateData = {
        status: 'READ' as const,
      }

      const mockNotification: Notification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'LAB_RESULT',
        payload: { message: 'Test notification' },
        status: 'READ',
        documento: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockPrisma.notification.update).mockResolvedValue(mockNotification)

      const result = await notificationRepository.update('notif-1', updateData)

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: updateData,
      })
      expect(result).toEqual(mockNotification)
    })
  })

  describe('delete', () => {
    it('should delete notification', async () => {
      vi.mocked(mockPrisma.notification.delete).mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        type: 'LAB_RESULT',
        payload: { message: 'Test notification' },
        status: 'UNREAD',
        documento: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await notificationRepository.delete('notif-1')

      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      })
    })
  })

  describe('count', () => {
    it('should count notifications with filters', async () => {
      vi.mocked(mockPrisma.notification.count).mockResolvedValue(7)

      const result = await notificationRepository.count({ userId: 'user-1', status: 'UNREAD' })

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'UNREAD' },
      })
      expect(result).toBe(7)
    })

    it('should count all notifications when no filters', async () => {
      vi.mocked(mockPrisma.notification.count).mockResolvedValue(15)

      const result = await notificationRepository.count()

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: undefined,
      })
      expect(result).toBe(15)
    })
  })
})