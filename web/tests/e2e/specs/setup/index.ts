import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function globalSetup() {
  // Limpa o banco de dados
  await prisma.healthEvent.deleteMany()
  await prisma.professional.deleteMany()
  await prisma.user.deleteMany()

  // Cria 4 usuários de teste: 2 receptores, 2 emissores
  const receptor1 = await prisma.user.create({
    data: {
      email: 'receptor1@example.com',
      password: '$2a$10$VBb3iRxGYh1yQb66JCzKvuoM2AZwbZk0F4f5F4f5F4f5F4f5F4f5F4', // senha123
      name: 'Receptor Um',
      cpf: '12345678901',
      emailVerified: new Date(),
      role: 'RECEPTOR'
    }
  })

  const receptor2 = await prisma.user.create({
    data: {
      email: 'receptor2@example.com',
      password: '$2a$10$VBb3iRxGYh1yQb66JCzKvuoM2AZwbZk0F4f5F4f5F4f5F4f5F4f5F4', // senha123
      name: 'Receptor Dois',
      cpf: '23456789012',
      emailVerified: new Date(),
      role: 'RECEPTOR'
    }
  })

  const emissor1 = await prisma.user.create({
    data: {
      email: 'emissor1@example.com',
      password: '$2a$10$VBb3iRxGYh1yQb66JCzKvuoM2AZwbZk0F4f5F4f5F4f5F4f5F4f5F4', // senha123
      name: 'Emissor Um',
      cpf: '34567890123',
      emailVerified: new Date(),
      role: 'EMISSOR'
    }
  })

  const emissor2 = await prisma.user.create({
    data: {
      email: 'emissor2@example.com',
      password: '$2a$10$VBb3iRxGYh1yQb66JCzKvuoM2AZwbZk0F4f5F4f5F4f5F4f5F4f5F4', // senha123
      name: 'Emissor Dois',
      cpf: '45678901234',
      emailVerified: new Date(),
      role: 'EMISSOR'
    }
  })

  // Cria profissionais de teste para receptores
  await prisma.professional.create({
    data: {
      name: 'Dr. João',
      specialty: 'Psicologia',
      contact: 'joao@example.com',
      userId: receptor1.id
    }
  })
  await prisma.professional.create({
    data: {
      name: 'Dra. Ana',
      specialty: 'Nutrição',
      contact: 'ana@example.com',
      userId: receptor2.id
    }
  })

  await prisma.$disconnect()
}
