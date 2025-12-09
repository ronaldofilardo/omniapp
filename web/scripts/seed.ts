import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Criar usuário padrão
  const hashedPassword = await bcrypt.hash('1234', 10)
  const result = await prisma.user.upsert({
    where: { email: 'user@email.com' },
    update: {},
    create: {
      email: 'user@email.com',
      password: hashedPassword,
      name: 'Usuário Padrão',
      cpf: '12345678901', // CPF fictício para seed
    },
  })
  console.log('Resultado do upsert:', result)
  console.log('Seed concluído com sucesso')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
