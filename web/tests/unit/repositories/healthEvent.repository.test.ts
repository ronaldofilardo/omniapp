import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../setup/prisma-mock'

vi.mock('../../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { healthEventRepository } from '../../../src/repositories/healthEvent.repository'
import { HealthEvent } from '@prisma/client'

describe('HealthEventRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findById', () => {
    it('should return event when found', async () => {
      const mockEvent: HealthEvent = {
        id: 'event-1',
        title: 'Consulta Médica',
        description: 'Consulta de rotina',
        date: new Date('2025-01-15'),
        startTime: new Date('2025-01-15T09:00:00Z'),
        endTime: new Date('2025-01-15T10:00:00Z'),
        type: 'CONSULTA',
        userId: 'user-1',
        professionalId: 'prof-1',
        observation: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockPrisma.healthEvent.findUnique).mockResolvedValue(mockEvent)

      const result = await healthEventRepository.findById('event-1')

      expect(mockPrisma.healthEvent.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      })
      expect(result).toEqual(mockEvent)
    })

    it('should return null when event not found', async () => {
      vi.mocked(mockPrisma.healthEvent.findUnique).mockResolvedValue(null)

      const result = await healthEventRepository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findMany', () => {
    it('should return events with filters', async () => {
      const mockEvents: HealthEvent[] = [
        {
          id: 'event-1',
          title: 'Consulta',
          description: null,
          date: new Date('2025-01-15'),
          startTime: new Date('2025-01-15T09:00:00Z'),
          endTime: new Date('2025-01-15T10:00:00Z'),
          type: 'CONSULTA',
          userId: 'user-1',
          professionalId: 'prof-1',
          observation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockPrisma.healthEvent.findMany).mockResolvedValue(mockEvents)

      const result = await healthEventRepository.findMany({ userId: 'user-1' })

      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { date: 'desc' },
      })
      expect(result).toEqual(mockEvents)
    })

    it('should return all events when no filters', async () => {
      const mockEvents: HealthEvent[] = []

      vi.mocked(mockPrisma.healthEvent.findMany).mockResolvedValue(mockEvents)

      const result = await healthEventRepository.findMany()

      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { date: 'desc' },
      })
      expect(result).toEqual(mockEvents)
    })
  })

  describe('findByUserId', () => {
    it('should return events for user ordered by date desc', async () => {
      const mockEvents: HealthEvent[] = [
        {
          id: 'event-1',
          title: 'Consulta',
          description: null,
          date: new Date('2025-01-15'),
          startTime: new Date('2025-01-15T09:00:00Z'),
          endTime: new Date('2025-01-15T10:00:00Z'),
          type: 'CONSULTA',
          userId: 'user-1',
          professionalId: 'prof-1',
          observation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockPrisma.healthEvent.findMany).mockResolvedValue(mockEvents)

      const result = await healthEventRepository.findByUserId('user-1')

      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { date: 'desc' },
      })
      expect(result).toEqual(mockEvents)
    })
  })

  describe('findByProfessionalId', () => {
    it('should return events for professional ordered by date desc', async () => {
      const mockEvents: HealthEvent[] = [
        {
          id: 'event-1',
          title: 'Consulta',
          description: null,
          date: new Date('2025-01-15'),
          startTime: new Date('2025-01-15T09:00:00Z'),
          endTime: new Date('2025-01-15T10:00:00Z'),
          type: 'CONSULTA',
          userId: 'user-1',
          professionalId: 'prof-1',
          observation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockPrisma.healthEvent.findMany).mockResolvedValue(mockEvents)

      const result = await healthEventRepository.findByProfessionalId('prof-1')

      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1' },
        orderBy: { date: 'desc' },
      })
      expect(result).toEqual(mockEvents)
    })
  })

  describe('findOverlapping', () => {
    it('should find overlapping events', async () => {
      const mockEvents: HealthEvent[] = [
        {
          id: 'event-1',
          title: 'Consulta',
          description: null,
          date: new Date('2025-01-15'),
          startTime: new Date('2025-01-15T09:00:00Z'),
          endTime: new Date('2025-01-15T10:00:00Z'),
          type: 'CONSULTA',
          userId: 'user-1',
          professionalId: 'prof-1',
          observation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockPrisma.healthEvent.findMany).mockResolvedValue(mockEvents)

      const params = {
        professionalId: 'prof-1',
        startTime: new Date('2025-01-15T09:30:00Z'),
        endTime: new Date('2025-01-15T10:30:00Z'),
      }

      const result = await healthEventRepository.findOverlapping(params)

      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          professionalId: 'prof-1',
          id: undefined,
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
      expect(result).toEqual(mockEvents)
    })

    it('should exclude event with given id', async () => {
      vi.mocked(mockPrisma.healthEvent.findMany).mockResolvedValue([])

      const params = {
        professionalId: 'prof-1',
        startTime: new Date('2025-01-15T09:30:00Z'),
        endTime: new Date('2025-01-15T10:30:00Z'),
        excludeId: 'event-1',
      }

      await healthEventRepository.findOverlapping(params)

      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          professionalId: 'prof-1',
          id: { not: 'event-1' },
          OR: expect.any(Array),
        },
      })
    })
  })

  describe('create', () => {
    it('should create new event', async () => {
      const createData = {
        title: 'Nova Consulta',
        date: new Date('2025-01-15'),
        startTime: new Date('2025-01-15T09:00:00Z'),
        endTime: new Date('2025-01-15T10:00:00Z'),
        type: 'CONSULTA' as const,
        userId: 'user-1',
        professionalId: 'prof-1',
      }

      const mockEvent: HealthEvent = {
        id: 'event-new',
        ...createData,
        description: null,
        observation: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockPrisma.healthEvent.create).mockResolvedValue(mockEvent)

      const result = await healthEventRepository.create(createData)

      expect(mockPrisma.healthEvent.create).toHaveBeenCalledWith({
        data: createData,
      })
      expect(result).toEqual(mockEvent)
    })
  })

  describe('update', () => {
    it('should update event', async () => {
      const updateData = {
        title: 'Consulta Atualizada',
      }

      const mockEvent: HealthEvent = {
        id: 'event-1',
        title: 'Consulta Atualizada',
        description: null,
        date: new Date('2025-01-15'),
        startTime: new Date('2025-01-15T09:00:00Z'),
        endTime: new Date('2025-01-15T10:00:00Z'),
        type: 'CONSULTA',
        userId: 'user-1',
        professionalId: 'prof-1',
        observation: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockPrisma.healthEvent.update).mockResolvedValue(mockEvent)

      const result = await healthEventRepository.update('event-1', updateData)

      expect(mockPrisma.healthEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: updateData,
      })
      expect(result).toEqual(mockEvent)
    })
  })

  describe('delete', () => {
    it('should delete event', async () => {
      vi.mocked(mockPrisma.healthEvent.delete).mockResolvedValue({
        id: 'event-1',
        title: 'Consulta',
        description: null,
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        type: 'CONSULTA',
        userId: 'user-1',
        professionalId: 'prof-1',
        observation: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await healthEventRepository.delete('event-1')

      expect(mockPrisma.healthEvent.delete).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      })
    })
  })

  describe('count', () => {
    it('should count events with filters', async () => {
      vi.mocked(mockPrisma.healthEvent.count).mockResolvedValue(5)

      const result = await healthEventRepository.count({ userId: 'user-1' })

      expect(mockPrisma.healthEvent.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(result).toBe(5)
    })

    it('should count all events when no filters', async () => {
      vi.mocked(mockPrisma.healthEvent.count).mockResolvedValue(10)

      const result = await healthEventRepository.count()

      expect(mockPrisma.healthEvent.count).toHaveBeenCalledWith({
        where: undefined,
      })
      expect(result).toBe(10)
    })
  })
})