import { Prisma, Notification } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { IBaseRepository } from './base.repository'

export interface INotificationRepository extends IBaseRepository<
  Notification,
  Prisma.NotificationCreateInput,
  Prisma.NotificationUpdateInput
> {
  findByUserId(userId: string): Promise<Notification[]>
  findUnreadByUserId(userId: string): Promise<Notification[]>
  markAsRead(id: string): Promise<Notification>
  markAllAsRead(userId: string): Promise<void>
}

export class NotificationRepository implements INotificationRepository {
  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
    })
  }

  async findMany(filters?: Record<string, any>): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        status: 'UNREAD',
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { status: 'READ' },
    })
  }

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        status: 'UNREAD',
      },
      data: { status: 'READ' },
    })
  }

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return prisma.notification.create({
      data,
    })
  }

  async update(id: string, data: Prisma.NotificationUpdateInput): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.notification.delete({
      where: { id },
    })
  }

  async count(filters?: Record<string, any>): Promise<number> {
    return prisma.notification.count({
      where: filters,
    })
  }
}

// Singleton instance
export const notificationRepository = new NotificationRepository()
