import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Só permitir execução em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
  console.error('❌ ERRO: Este script só pode ser executado em ambiente de teste (NODE_ENV=test)')
  console.error('Para resetar o banco de desenvolvimento, use o script reset-dev-db.ts com confirmação explícita.')
  process.exit(1)
}

// Carregar variáveis de ambiente do teste (sobrescrever qualquer valor existente)
config({ path: '.env.test', override: true })

// Forçar NODE_ENV=test para garantir
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
  enumerable: true,
  configurable: true
})

// Verificar se estamos no banco de teste
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl || (!databaseUrl.includes('omni_mvp_test') && !databaseUrl.includes('omnib2_test'))) {
  console.error('❌ ERRO DE SEGURANÇA: Tentativa de executar reset no banco errado!')
  console.error('DATABASE_URL deve conter "omni_mvp_test" ou "omnib2_test" para este script.')
  console.error('DATABASE_URL atual:', databaseUrl)
  process.exit(1)
}

const prisma = new PrismaClient()

async function resetDatabase() {
  // Ordem importa por causa das FKs
  await prisma.files.deleteMany({})
  await prisma.healthEvent.deleteMany({})
  await prisma.professional.deleteMany({})
  await prisma.report.updateMany({ data: { notificationId: null } })
  await prisma.notification.deleteMany({})
  await prisma.report.deleteMany({})
  await prisma.emissorInfo.deleteMany({})
  await prisma.user.deleteMany({})
}

resetDatabase()
  .then(() => {
    console.log('🧹 Banco de teste limpo com sucesso!')
    process.exit(0)
  })
  .catch((e) => {
    console.error('Erro ao limpar banco de teste:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
