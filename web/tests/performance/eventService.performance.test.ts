import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventType } from '@prisma/client'
import { prisma } from '../../src/lib/prisma'

// Mock do Prisma para testes de performance
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    healthEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('eventService - Performance Tests', () => {
  let eventService: typeof import('../../src/lib/services/eventService')

  beforeEach(async () => {
    vi.clearAllMocks()
    eventService = await import('../../src/lib/services/eventService')
  })

  describe('createEvent performance', () => {
    it('should create event within acceptable time limits', async () => {
      // Setup mock data
      const mockEvents = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        description: `Description ${i}`,
        date: '2025-10-27',
        startTime: '09:00',
        endTime: '10:00',
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: 'prof-1',
        files: []
      }))

      vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents.slice(0, 10)) // Simula alguns eventos existentes
      vi.mocked(prisma.healthEvent.create).mockResolvedValue({
        id: 'new-event',
        title: 'New Event',
        description: 'New Description',
        date: '2025-10-27',
        startTime: '11:00',
        endTime: '12:00',
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: 'prof-1',
        files: []
      })

      const startTime = performance.now()

      await eventService.createEvent({
        title: 'New Event',
        description: 'New Description',
        date: '2025-10-27',
        startTime: '11:00',
        endTime: '12:00',
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: 'prof-1',
        files: []
      })

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Assert performance: should complete within 100ms
      expect(executionTime).toBeLessThan(100)
    })

    it('should handle high concurrency without performance degradation', async () => {
      vi.mocked(prisma.healthEvent.findMany).mockResolvedValue([])
      vi.mocked(prisma.healthEvent.create).mockImplementation(async (data) => ({
        id: `event-${Math.random()}`,
        ...data,
        files: []
      }))

      const startTime = performance.now()

      // Simulate 50 concurrent event creations
      const promises = Array.from({ length: 50 }, (_, i) =>
        eventService.createEvent({
          title: `Concurrent Event ${i}`,
          description: `Description ${i}`,
          date: '2025-10-27',
          startTime: `${String(9 + i % 8).padStart(2, '0')}:00`,
          endTime: `${String(10 + i % 8).padStart(2, '0')}:00`,
          type: EventType.CONSULTA,
          userId: 'user-1',
          professionalId: `prof-${i % 5}`,
          files: []
        })
      )

      await Promise.all(promises)

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Assert performance: should complete within 500ms for 50 concurrent operations
      expect(executionTime).toBeLessThan(500)
    })
  })

  describe('getEvents performance', () => {
    it('should retrieve events efficiently with large datasets', async () => {
      // Create mock data with 1000 events
      const mockEvents = Array.from({ length: 1000 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        description: `Description ${i}`,
        date: `2025-10-${String((i % 28) + 1).padStart(2, '0')}`,
        startTime: `${String(9 + (i % 8)).padStart(2, '0')}:00`,
        endTime: `${String(10 + (i % 8)).padStart(2, '0')}:00`,
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: `prof-${i % 10}`,
        files: [],
        professional: {
          id: `prof-${i % 10}`,
          name: `Dr. Professional ${i % 10}`,
          specialty: 'Cardiology',
          userId: 'user-1',
          contact: { email: `prof${i % 10}@example.com`, phone: '11999999999' }
        }
      }))

      vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents)

      const startTime = performance.now()

      const result = await eventService.getEvents('user-1')

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(result).toHaveLength(1000)
      // Assert performance: should complete within 200ms for 1000 records
      expect(executionTime).toBeLessThan(200)
    })

    it('should filter events with files efficiently', async () => {
      const mockEvents = Array.from({ length: 500 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        description: `Description ${i}`,
        date: '2025-10-27',
        startTime: '09:00',
        endTime: '10:00',
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: 'prof-1',
        files: i % 2 === 0 ? [{ url: `/uploads/file-${i}.pdf`, name: `file-${i}.pdf` }] : [], // Half have files
        professional: {
          id: 'prof-1',
          name: 'Dr. Test',
          specialty: 'Cardiology',
          userId: 'user-1',
          contact: { email: 'test@example.com', phone: '11999999999' }
        }
      }))

      vi.mocked(prisma.healthEvent.findMany).mockResolvedValue(mockEvents)

      const startTime = performance.now()

      const result = await eventService.getEvents('user-1', { hasFiles: true })

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(result.length).toBeGreaterThan(0)
      expect(result.every(event => Array.isArray(event.files) && event.files.length > 0)).toBe(true)
      // Assert performance: should complete within 150ms for filtering
      expect(executionTime).toBeLessThan(150)
    })
  })

  describe('updateEvent performance', () => {
    it('should update event within acceptable time limits', async () => {
      vi.mocked(prisma.healthEvent.findUnique).mockResolvedValue({
        id: 'event-1',
        title: 'Original Event',
        description: 'Original Description',
        date: '2025-10-27',
        startTime: '09:00',
        endTime: '10:00',
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: 'prof-1',
        files: []
      })

      vi.mocked(prisma.healthEvent.findMany).mockResolvedValue([])
      vi.mocked(prisma.healthEvent.update).mockResolvedValue({
        id: 'event-1',
        title: 'Updated Event',
        description: 'Updated Description',
        date: '2025-10-27',
        startTime: '09:00',
        endTime: '10:00',
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: 'prof-1',
        files: []
      })

      const startTime = performance.now()

      await eventService.updateEvent('event-1', { title: 'Updated Event', description: 'Updated Description' })

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Assert performance: should complete within 100ms
      expect(executionTime).toBeLessThan(100)
    })
  })

  describe('deleteEvent performance', () => {
    it('should delete event with file cleanup efficiently', async () => {
      vi.mocked(prisma.healthEvent.findUnique).mockResolvedValue({
        id: 'event-1',
        title: 'Event with Files',
        description: 'Description',
        date: '2025-10-27',
        startTime: '09:00',
        endTime: '10:00',
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: 'prof-1',
        files: [
          { url: '/uploads/file1.pdf', name: 'file1.pdf' },
          { url: '/uploads/file2.pdf', name: 'file2.pdf' }
        ]
      })

      vi.mocked(prisma.healthEvent.delete).mockResolvedValue({
        id: 'event-1',
        title: 'Event with Files',
        description: 'Description',
        date: '2025-10-27',
        startTime: '09:00',
        endTime: '10:00',
        type: EventType.CONSULTA,
        userId: 'user-1',
        professionalId: 'prof-1',
        files: []
      })

      const startTime = performance.now()

      await eventService.deleteEvent('event-1', true)

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Assert performance: should complete within 150ms including file operations
      expect(executionTime).toBeLessThan(150)
    })
  })
})
