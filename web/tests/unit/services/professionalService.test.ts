import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../setup/prisma-mock'

vi.mock('../../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { prisma } from '@/lib/prisma'

describe('professionalService', () => {
  let professionalService: typeof import('../../../src/lib/services/professionalService')
  beforeEach(async () => {
    vi.clearAllMocks()
    professionalService = await import('../../../src/lib/services/professionalService')
  })

  it('cria profissional', async () => {
    (prisma.professional.create as any).mockResolvedValue({ id: 'p1', name: 'Dr. A' })
    const result = await professionalService.createProfessional({ name: 'Dr. A' })
    expect(result).toEqual({ id: 'p1', name: 'Dr. A' })
  })

  it('busca profissionais', async () => {
    (prisma.professional.findMany as any).mockResolvedValue([
      { id: 'p1', name: 'Dr. A' },
      { id: 'p2', name: 'Dr. B' },
    ])
    const result = await professionalService.getProfessionals()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Dr. A')
  })
})
