import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de dados de teste...')

  // Criar usuário padrão de teste
  const hashedPassword = await bcrypt.hash('1234', 10)
  const user = await prisma.user.upsert({
    where: { email: 'user@email.com' },
    update: {},
    create: {
      email: 'user@email.com',
      password: hashedPassword,
      name: 'Usuário Padrão',
      cpf: '12345678901', // CPF obrigatório
      emailVerified: new Date(), // Email verificado para testes
    },
  })
  console.log('✅ Usuário criado:', user.email)

  // Criar usuários adicionais para testes E2E
  const testPassword = await bcrypt.hash('password123', 10)
  
  const receptorUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: testPassword,
      name: 'Usuário Teste Receptor',
      cpf: '11111111111',
      role: 'RECEPTOR',
      emailVerified: new Date(),
      acceptedPrivacyPolicy: true,
      acceptedTermsOfUse: true,
    },
  })
  console.log('✅ Usuário receptor criado:', receptorUser.email)

  const receptorUser2 = await prisma.user.upsert({
    where: { email: 'receptor@test.com' },
    update: {},
    create: {
      email: 'receptor@test.com',
      password: testPassword,
      name: 'Receptor Alternativo',
      cpf: '22222222222',
      role: 'RECEPTOR',
      emailVerified: new Date(),
      acceptedPrivacyPolicy: true,
      acceptedTermsOfUse: true,
    },
  })
  console.log('✅ Usuário receptor 2 criado:', receptorUser2.email)

  const emissorPassword = await bcrypt.hash('123456', 10)
  const emissorUser = await prisma.user.upsert({
    where: { email: 'labor@omni.com' },
    update: {},
    create: {
      email: 'labor@omni.com',
      password: emissorPassword,
      name: 'Laboratório Omni',
      cpf: '33333333333',
      role: 'EMISSOR',
      emailVerified: new Date(),
      acceptedPrivacyPolicy: true,
      acceptedTermsOfUse: true,
    },
  })
  console.log('✅ Usuário emissor criado:', emissorUser.email)

  const emissorUser2 = await prisma.user.upsert({
    where: { email: 'emissor@test.com' },
    update: {},
    create: {
      email: 'emissor@test.com',
      password: testPassword,
      name: 'Emissor Teste',
      cpf: '44444444444',
      role: 'EMISSOR',
      emailVerified: new Date(),
      acceptedPrivacyPolicy: true,
      acceptedTermsOfUse: true,
    },
  })
  console.log('✅ Usuário emissor 2 criado:', emissorUser2.email)

  // Criar EmissorInfo para os usuários emissores
  await prisma.emissorInfo.upsert({
    where: { userId: emissorUser.id },
    update: {},
    create: {
      userId: emissorUser.id,
      clinicName: 'Laboratório Omni',
      cnpj: '11111111000111',
      address: 'Rua Teste, 123 - São Paulo/SP',
      contact: '(11) 99999-9999',
    },
  })
  console.log('✅ EmissorInfo criado para labor@omni.com')

  await prisma.emissorInfo.upsert({
    where: { userId: emissorUser2.id },
    update: {},
    create: {
      userId: emissorUser2.id,
      clinicName: 'Emissor Teste',
      cnpj: '22222222000122',
      address: 'Av. Teste, 456 - Rio de Janeiro/RJ',
      contact: '(21) 88888-8888',
    },
  })
  console.log('✅ EmissorInfo criado para emissor@test.com')

  // Criar profissionais de exemplo
  const professionals = [
    {
      name: 'Dr. João Silva',
      specialty: 'Cardiologia',
      address: 'Av. Paulista, 1000 - São Paulo/SP',
      contact: '(11) 99999-0001',
    },
    {
      name: 'Dra. Maria Santos',
      specialty: 'Dermatologia',
      address: 'Rua Augusta, 500 - São Paulo/SP',
      contact: '(11) 99999-0002',
    },
    {
      name: 'Dr. Pedro Oliveira',
      specialty: 'Ortopedia',
      address: 'Av. Brigadeiro Faria Lima, 2000 - São Paulo/SP',
      contact: '(11) 99999-0003',
    },
  ]

  for (const prof of professionals) {
    const professional = await prisma.professional.create({
      data: {
        ...prof,
        userId: user.id,
      },
    })
    console.log('✅ Profissional criado:', professional.name)
  }

  // Criar eventos de exemplo
  const events = [
    {
      title: 'Consulta de Rotina',
      description: 'Check-up anual de saúde cardiovascular',
      date: '2024-12-20',
      startTime: '09:00',
      endTime: '10:00',
      type: 'CONSULTA' as const,
      professionalId: (await prisma.professional.findFirst({
        where: { name: 'Dr. João Silva' },
      }))!.id,
    },
    {
      title: 'Exame Dermatológico',
      description: 'Avaliação de pele e possíveis alergias',
      date: '2024-12-22',
      startTime: '14:00',
      endTime: '15:00',
      type: 'EXAME' as const,
      professionalId: (await prisma.professional.findFirst({
        where: { name: 'Dra. Maria Santos' },
      }))!.id,
    },
  ]

  for (const event of events) {
    const healthEvent = await prisma.healthEvent.create({
      data: {
        ...event,
        userId: user.id,
      },
    })
    console.log('✅ Evento criado:', healthEvent.title)
  }

  console.log('🎉 Seed de dados de teste concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
