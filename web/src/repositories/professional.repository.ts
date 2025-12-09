import { Prisma, Professional } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { IBaseRepository } from './base.repository'

export interface IProfessionalRepository extends IBaseRepository<
  Professional,
  Prisma.ProfessionalCreateInput,
  Prisma.ProfessionalUpdateInput
> {
  findByUserId(userId: string): Promise<Professional[]>
  findBySpecialty(specialty: string): Promise<Professional[]>
}

export class ProfessionalRepository implements IProfessionalRepository {
  async findById(id: string): Promise<Professional | null> {
    return prisma.professional.findUnique({
      where: { id },
    })
  }

  async findMany(filters?: Record<string, any>): Promise<Professional[]> {
    return prisma.professional.findMany({
      where: filters,
      orderBy: { name: 'asc' },
    })
  }

  async findByUserId(userId: string): Promise<Professional[]> {
    return prisma.professional.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })
  }

  async findBySpecialty(specialty: string): Promise<Professional[]> {
    return prisma.professional.findMany({
      where: { specialty },
      orderBy: { name: 'asc' },
    })
  }

  async create(data: Prisma.ProfessionalCreateInput): Promise<Professional> {
    return prisma.professional.create({
      data,
    })
  }

  async update(id: string, data: Prisma.ProfessionalUpdateInput): Promise<Professional> {
    return prisma.professional.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.professional.delete({
      where: { id },
    })
  }

  async count(filters?: Record<string, any>): Promise<number> {
    return prisma.professional.count({
      where: filters,
    })
  }
}

// Singleton instance
export const professionalRepository = new ProfessionalRepository()
