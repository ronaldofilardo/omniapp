import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockPrisma } from '../../setup/prisma-mock'

vi.mock('../../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { prisma } from '@/lib/prisma'

describe('eventService', () => {
  let eventService: typeof import('../../../src/lib/services/eventService')
  beforeEach(async () => {
    vi.clearAllMocks()
    eventService = await import('../../../src/lib/services/eventService')
  })

  it('cria evento sem sobreposição', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue([])
    vi.mocked(prisma.healthEvent.create).mockResolvedValue({ id: '1', title: 'Evento', description: null, date: new Date('2025-10-27'), startTime: new Date('2025-10-27T09:00:00Z'), endTime: new Date('2025-10-27T10:00:00Z'), type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] })
    const result = await eventService.createEvent({ date: '2025-10-27', professionalId: 'p1', startTime: '09:00', endTime: '10:00' })
    expect(result).toEqual({ id: '1', title: 'Evento', description: null, date: new Date('2025-10-27'), startTime: new Date('2025-10-27T09:00:00Z'), endTime: new Date('2025-10-27T10:00:00Z'), type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] })
  })

  it('lança erro se houver sobreposição', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue([
      { id: '2', title: 'Evento2', description: null, date: new Date('2025-10-27'), startTime: new Date('2025-10-27T09:30:00Z'), endTime: new Date('2025-10-27T10:30:00Z'), type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] },
    ])
    await expect(eventService.createEvent({ date: '2025-10-27', professionalId: 'p1', startTime: '09:00', endTime: '10:00' }))
      .rejects.toThrow('sobreposição')
  })

  it('busca eventos de um usuário', async () => {
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue([{ id: '1', title: 'Evento', description: null, date: '2025-10-27', startTime: '09:00', endTime: '10:00', type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] }])
    const result = await eventService.getEvents('u1')
    expect(result).toHaveLength(1)
  })

  it('atualiza evento sem sobreposição', async () => {
    vi.mocked(prisma.healthEvent.findUnique).mockResolvedValue({ id: '1', title: 'Evento', description: null, date: '2025-10-27', startTime: '09:00', endTime: '10:00', type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] })
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue([])
    vi.mocked(prisma.healthEvent.update).mockResolvedValue({ id: '1', title: 'Atualizado', description: null, date: '2025-10-27', startTime: '09:00', endTime: '10:00', type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] })
    const result = await eventService.updateEvent('1', { title: 'Atualizado' })
    expect(result).toEqual({ id: '1', title: 'Atualizado', description: null, date: '2025-10-27', startTime: '09:00', endTime: '10:00', type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] })
  })

  it('lança erro ao atualizar evento com sobreposição', async () => {
    vi.mocked(prisma.healthEvent.findUnique).mockResolvedValue({ id: '1', title: 'Evento', description: null, date: new Date('2025-10-27'), startTime: new Date('2025-10-27T09:00:00Z'), endTime: new Date('2025-10-27T10:00:00Z'), type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] })
    vi.mocked(prisma.healthEvent.findMany).mockResolvedValue([
      { id: '2', title: 'Evento2', description: null, date: new Date('2025-10-27'), startTime: new Date('2025-10-27T09:30:00Z'), endTime: new Date('2025-10-27T10:30:00Z'), type: 'CONSULTA', userId: 'u1', professionalId: 'p1', files: [] },
    ])
    await expect(eventService.updateEvent('1', { startTime: '09:00', endTime: '10:00' }))
      .rejects.toThrow('sobreposição')
  })
})
