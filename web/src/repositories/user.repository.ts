import { Prisma, User } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { IBaseRepository } from './base.repository'

export interface IUserRepository extends IBaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput
> {
  findByEmail(email: string): Promise<User | null>
  findByRole(role: string): Promise<User[]>
}

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  async findMany(filters?: Record<string, any>): Promise<User[]> {
    return prisma.user.findMany({
      where: filters,
      orderBy: { name: 'asc' },
    })
  }

  async findByRole(role: 'RECEPTOR' | 'EMISSOR' | 'ADMIN'): Promise<User[]> {
    return prisma.user.findMany({
      where: { role },
      orderBy: { name: 'asc' },
    })
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    })
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    })
  }

  async count(filters?: Record<string, any>): Promise<number> {
    return prisma.user.count({
      where: filters,
    })
  }
}

// Singleton instance
export const userRepository = new UserRepository()
