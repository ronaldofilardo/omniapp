import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../setup/prisma-mock'

vi.mock('../../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { userRepository } from '../../../src/repositories/user.repository'
import { User } from '@prisma/client'

describe('UserRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: 'user-1',
        name: 'João Silva',
        email: 'joao@example.com',
        emailVerified: null,
        role: 'RECEPTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed_password',
        cpf: '12345678901',
        telefone: '11999999999',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      const result = await userRepository.findById('user-1')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      })
      expect(result).toEqual(mockUser)
    })

    it('should return null when user not found', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null)

      const result = await userRepository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser: User = {
        id: 'user-1',
        name: 'João Silva',
        email: 'joao@example.com',
        emailVerified: null,
        role: 'RECEPTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed_password',
        cpf: '12345678901',
        telefone: '11999999999',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser)

      const result = await userRepository.findByEmail('joao@example.com')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'joao@example.com' },
      })
      expect(result).toEqual(mockUser)
    })

    it('should return null when email not found', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null)

      const result = await userRepository.findByEmail('notfound@example.com')

      expect(result).toBeNull()
    })
  })

  describe('findMany', () => {
    it('should return users with filters ordered by name', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@example.com',
          emailVerified: null,
          role: 'RECEPTOR',
          createdAt: new Date(),
          updatedAt: new Date(),
          password: 'hashed_password',
          cpf: '12345678901',
          telefone: '11999999999',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        },
      ]

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers)

      const result = await userRepository.findMany({ role: 'RECEPTOR' })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'RECEPTOR' },
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockUsers)
    })

    it('should return all users when no filters', async () => {
      const mockUsers: User[] = []

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers)

      const result = await userRepository.findMany()

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockUsers)
    })
  })

  describe('findByRole', () => {
    it('should return users by role ordered by name', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@example.com',
          emailVerified: null,
          role: 'RECEPTOR',
          createdAt: new Date(),
          updatedAt: new Date(),
          password: 'hashed_password',
          cpf: '12345678901',
          telefone: '11999999999',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        },
      ]

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers)

      const result = await userRepository.findByRole('RECEPTOR')

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'RECEPTOR' },
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockUsers)
    })
  })

  describe('create', () => {
    it('should create new user', async () => {
      const createData = {
        name: 'Novo Usuário',
        email: 'novo@example.com',
        password: 'hashed_password',
        role: 'RECEPTOR' as const,
        cpf: '12345678901',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      const mockUser: User = {
        id: 'user-new',
        ...createData,
        emailVerified: null,
        telefone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockPrisma.user.create).mockResolvedValue(mockUser)

      const result = await userRepository.create(createData)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: createData,
      })
      expect(result).toEqual(mockUser)
    })
  })

  describe('update', () => {
    it('should update user', async () => {
      const updateData = {
        name: 'Nome Atualizado',
      }

      const mockUser: User = {
        id: 'user-1',
        name: 'Nome Atualizado',
        email: 'joao@example.com',
        emailVerified: null,
        role: 'RECEPTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed_password',
        cpf: '12345678901',
        telefone: '11999999999',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      }

      vi.mocked(mockPrisma.user.update).mockResolvedValue(mockUser)

      const result = await userRepository.update('user-1', updateData)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateData,
      })
      expect(result).toEqual(mockUser)
    })
  })

  describe('delete', () => {
    it('should delete user', async () => {
      vi.mocked(mockPrisma.user.delete).mockResolvedValue({
        id: 'user-1',
        name: 'João Silva',
        email: 'joao@example.com',
        emailVerified: null,
        role: 'RECEPTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed_password',
        cpf: '12345678901',
        telefone: '11999999999',
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      })

      await userRepository.delete('user-1')

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      })
    })
  })

  describe('count', () => {
    it('should count users with filters', async () => {
      vi.mocked(mockPrisma.user.count).mockResolvedValue(5)

      const result = await userRepository.count({ role: 'RECEPTOR' })

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { role: 'RECEPTOR' },
      })
      expect(result).toBe(5)
    })

    it('should count all users when no filters', async () => {
      vi.mocked(mockPrisma.user.count).mockResolvedValue(10)

      const result = await userRepository.count()

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: undefined,
      })
      expect(result).toBe(10)
    })
  })
})