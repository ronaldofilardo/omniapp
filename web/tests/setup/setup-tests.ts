import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

async function resetTestDatabase() {
  try {
    // Reset do banco de dados de teste
    await execAsync('npx prisma migrate reset --force --skip-seed --schema=./prisma/schema.prisma')
    
    // Criar usuários de teste com emailVerified
    const hashedPassword = await bcrypt.hash('password123', 10)
    const hashedEmissorPassword = await bcrypt.hash('123456', 10)
    
    // Usuário receptor padrão
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Teste da Silva',
        cpf: '123.456.789-00',
        telefone: '(41) 99999-9999',
        role: 'RECEPTOR',
        emailVerified: new Date(),
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      },
    })

    // Usuário receptor alternativo
    await prisma.user.create({
      data: {
        email: 'receptor@test.com',
        password: hashedPassword,
        name: 'Receptor Alternativo',
        cpf: '22222222222',
        role: 'RECEPTOR',
        emailVerified: new Date(),
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      },
    })

    // Usuário emissor 1
    const emissor1 = await prisma.user.create({
      data: {
        email: 'labor@omni.com',
        password: hashedEmissorPassword,
        name: 'Laboratório Omni',
        cpf: '33333333333',
        role: 'EMISSOR',
        emailVerified: new Date(),
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      },
    })

    // Criar EmissorInfo para emissor1
    await prisma.emissorInfo.create({
      data: {
        userId: emissor1.id,
        clinicName: 'Laboratório Omni',
        cnpj: '11111111000111',
        address: 'Rua Teste, 123 - São Paulo/SP',
        contact: '(11) 99999-9999',
      },
    })

    // Usuário emissor 2
    const emissor2 = await prisma.user.create({
      data: {
        email: 'emissor@test.com',
        password: hashedPassword,
        name: 'Emissor Teste',
        cpf: '44444444444',
        role: 'EMISSOR',
        emailVerified: new Date(),
        acceptedPrivacyPolicy: true,
        acceptedTermsOfUse: true,
      },
    })

    // Criar EmissorInfo para emissor2
    await prisma.emissorInfo.create({
      data: {
        userId: emissor2.id,
        clinicName: 'Emissor Teste',
        cnpj: '22222222000122',
        address: 'Av. Teste, 456 - Rio de Janeiro/RJ',
        contact: '(21) 88888-8888',
      },
    })

    console.log('✅ Ambiente de teste configurado com sucesso')
  } catch (error) {
    console.error('❌ Erro ao configurar ambiente de teste:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

export default async function () {
  await resetTestDatabase();
}
