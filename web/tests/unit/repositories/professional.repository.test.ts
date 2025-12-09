import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../setup/prisma-mock'

vi.mock('../../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { professionalRepository } from '../../../src/repositories/professional.repository'
import { Professional } from '@prisma/client'

describe('ProfessionalRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findById', () => {
    it('should return professional when found', async () => {
      const mockProfessional: Professional = {
        id: 'prof-1',
        name: 'Dr. João Silva',
        specialty: 'Cardiologia',
        address: 'Rua das Flores, 123',
        contact: '11999999999',
        userId: 'user-1',
      }

      vi.mocked(mockPrisma.professional.findUnique).mockResolvedValue(mockProfessional)

      const result = await professionalRepository.findById('prof-1')

      expect(mockPrisma.professional.findUnique).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
      })
      expect(result).toEqual(mockProfessional)
    })

    it('should return null when professional not found', async () => {
      vi.mocked(mockPrisma.professional.findUnique).mockResolvedValue(null)

      const result = await professionalRepository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findMany', () => {
    it('should return professionals with filters ordered by name', async () => {
      const mockProfessionals: Professional[] = [
        {
          id: 'prof-1',
          name: 'Dr. João Silva',
          specialty: 'Cardiologia',
          address: 'Rua das Flores, 123',
          contact: '11999999999',
          userId: 'user-1',
        },
      ]

      vi.mocked(mockPrisma.professional.findMany).mockResolvedValue(mockProfessionals)

      const result = await professionalRepository.findMany({ specialty: 'Cardiologia' })

      expect(mockPrisma.professional.findMany).toHaveBeenCalledWith({
        where: { specialty: 'Cardiologia' },
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockProfessionals)
    })

    it('should return all professionals when no filters', async () => {
      const mockProfessionals: Professional[] = []

      vi.mocked(mockPrisma.professional.findMany).mockResolvedValue(mockProfessionals)

      const result = await professionalRepository.findMany()

      expect(mockPrisma.professional.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockProfessionals)
    })
  })

  describe('findByUserId', () => {
    it('should return professionals for user ordered by name', async () => {
      const mockProfessionals: Professional[] = [
        {
          id: 'prof-1',
          name: 'Dr. João Silva',
          specialty: 'Cardiologia',
          address: 'Rua das Flores, 123',
          contact: '11999999999',
          userId: 'user-1',
        },
      ]

      vi.mocked(mockPrisma.professional.findMany).mockResolvedValue(mockProfessionals)

      const result = await professionalRepository.findByUserId('user-1')

      expect(mockPrisma.professional.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockProfessionals)
    })
  })

  describe('findBySpecialty', () => {
    it('should return professionals by specialty ordered by name', async () => {
      const mockProfessionals: Professional[] = [
        {
          id: 'prof-1',
          name: 'Dr. João Silva',
          specialty: 'Cardiologia',
          address: 'Rua das Flores, 123',
          contact: '11999999999',
          userId: 'user-1',
        },
      ]

      vi.mocked(mockPrisma.professional.findMany).mockResolvedValue(mockProfessionals)

      const result = await professionalRepository.findBySpecialty('Cardiologia')

      expect(mockPrisma.professional.findMany).toHaveBeenCalledWith({
        where: { specialty: 'Cardiologia' },
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockProfessionals)
    })
  })

  describe('create', () => {
    it('should create new professional', async () => {
      const createData = {
        name: 'Dr. Novo Profissional',
        specialty: 'Dermatologia',
        contact: '11888888888',
        userId: 'user-1',
      }

      const mockProfessional: Professional = {
        id: 'prof-new',
        ...createData,
        address: null,
      }

      vi.mocked(mockPrisma.professional.create).mockResolvedValue(mockProfessional)

      const result = await professionalRepository.create(createData)

      expect(mockPrisma.professional.create).toHaveBeenCalledWith({
        data: createData,
      })
      expect(result).toEqual(mockProfessional)
    })
  })

  describe('update', () => {
    it('should update professional', async () => {
      const updateData = {
        name: 'Dr. Nome Atualizado',
      }

      const mockProfessional: Professional = {
        id: 'prof-1',
        name: 'Dr. Nome Atualizado',
        specialty: 'Cardiologia',
        address: 'Rua das Flores, 123',
        contact: '11999999999',
        userId: 'user-1',
      }

      vi.mocked(mockPrisma.professional.update).mockResolvedValue(mockProfessional)

      const result = await professionalRepository.update('prof-1', updateData)

      expect(mockPrisma.professional.update).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
        data: updateData,
      })
      expect(result).toEqual(mockProfessional)
    })
  })

  describe('delete', () => {
    it('should delete professional', async () => {
      vi.mocked(mockPrisma.professional.delete).mockResolvedValue({
        id: 'prof-1',
        name: 'Dr. João Silva',
        specialty: 'Cardiologia',
        address: 'Rua das Flores, 123',
        contact: '11999999999',
        userId: 'user-1',
      })

      await professionalRepository.delete('prof-1')

      expect(mockPrisma.professional.delete).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
      })
    })
  })

  describe('count', () => {
    it('should count professionals with filters', async () => {
      vi.mocked(mockPrisma.professional.count).mockResolvedValue(3)

      const result = await professionalRepository.count({ specialty: 'Cardiologia' })

      expect(mockPrisma.professional.count).toHaveBeenCalledWith({
        where: { specialty: 'Cardiologia' },
      })
      expect(result).toBe(3)
    })

    it('should count all professionals when no filters', async () => {
      vi.mocked(mockPrisma.professional.count).mockResolvedValue(10)

      const result = await professionalRepository.count()

      expect(mockPrisma.professional.count).toHaveBeenCalledWith({
        where: undefined,
      })
      expect(result).toBe(10)
    })
  })
})