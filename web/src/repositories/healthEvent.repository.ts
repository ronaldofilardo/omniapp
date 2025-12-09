import { Prisma, HealthEvent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { IBaseRepository } from './base.repository'

export interface IHealthEventRepository extends IBaseRepository<
  HealthEvent,
  Prisma.HealthEventCreateInput,
  Prisma.HealthEventUpdateInput
> {
  findByUserId(userId: string): Promise<HealthEvent[]>
  findByProfessionalId(professionalId: string): Promise<HealthEvent[]>
  findOverlapping(params: {
    professionalId: string
    startTime: Date
    endTime: Date
    excludeId?: string
  }): Promise<HealthEvent[]>
}

export class HealthEventRepository implements IHealthEventRepository {
  async findById(id: string): Promise<HealthEvent | null> {
    return prisma.healthEvent.findUnique({
      where: { id },
    })
  }

  async findMany(filters?: Record<string, any>): Promise<HealthEvent[]> {
    return prisma.healthEvent.findMany({
      where: filters,
      orderBy: { date: 'desc' },
    })
  }

  async findByUserId(userId: string): Promise<HealthEvent[]> {
    return prisma.healthEvent.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    })
  }

  async findByProfessionalId(professionalId: string): Promise<HealthEvent[]> {
    return prisma.healthEvent.findMany({
      where: { professionalId },
      orderBy: { date: 'desc' },
    })
  }

  async findOverlapping(params: {
    professionalId: string
    startTime: Date
    endTime: Date
    excludeId?: string
  }): Promise<HealthEvent[]> {
    return prisma.healthEvent.findMany({
      where: {
        professionalId: params.professionalId,
        id: params.excludeId ? { not: params.excludeId } : undefined,
        OR: [
          {
            AND: [
              { startTime: { lte: params.startTime } },
              { endTime: { gt: params.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: params.endTime } },
              { endTime: { gte: params.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: params.startTime } },
              { endTime: { lte: params.endTime } },
            ],
          },
        ],
      },
    })
  }

  async create(data: Prisma.HealthEventCreateInput): Promise<HealthEvent> {
    return prisma.healthEvent.create({
      data,
    })
  }

  async update(id: string, data: Prisma.HealthEventUpdateInput): Promise<HealthEvent> {
    return prisma.healthEvent.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.healthEvent.delete({
      where: { id },
    })
  }

  async count(filters?: Record<string, any>): Promise<number> {
    return prisma.healthEvent.count({
      where: filters,
    })
  }
}

// Singleton instance
export const healthEventRepository = new HealthEventRepository()
