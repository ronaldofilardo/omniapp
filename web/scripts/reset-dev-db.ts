import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import * as readline from 'readline'

// Proteger contra execução em ambiente de teste
if (process.env.NODE_ENV === 'test') {
  console.error('❌ ERRO: Este script NÃO pode ser executado em ambiente de teste!')
  console.error('Para resetar o banco de teste, use o script reset-test-db.ts.')
  process.exit(1)
}

// Carregar variáveis de ambiente do desenvolvimento
config({ path: '.env' })

const prisma = new PrismaClient()

async function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(
      '⚠️  ATENÇÃO: Isso irá APAGAR TODOS os dados do banco de DESENVOLVIMENTO!\n' +
      'Esta ação não pode ser desfeita.\n\n' +
      'Digite "RESET-DEV-DB" para confirmar: ',
      (answer) => {
        rl.close()
        resolve(answer === 'RESET-DEV-DB')
      }
    )
  })
}

async function resetDevDatabase() {
  // Verificar se estamos no banco de desenvolvimento
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !databaseUrl.includes('omni_mvp') || databaseUrl.includes('omni_mvp_test')) {
    console.error('❌ ERRO: Este script só pode ser executado no banco de desenvolvimento.')
    console.error('DATABASE_URL atual:', databaseUrl)
    process.exit(1)
  }

  console.log('🔍 Verificando banco de desenvolvimento...')
  console.log('📍 DATABASE_URL:', databaseUrl.replace(/:([^:@]{4})[^:@]*@/, ':$1****@'))

  const confirmed = await confirmReset()
  if (!confirmed) {
    console.log('❌ Operação cancelada pelo usuário.')
    process.exit(0)
  }

  console.log('🧹 Resetando banco de desenvolvimento...')

  try {
    // Ordem importa por causa das FKs
    await prisma.files.deleteMany({})
    await prisma.healthEvent.deleteMany({})
    await prisma.professional.deleteMany({})
    await prisma.report.updateMany({ data: { notificationId: null } })
    await prisma.notification.deleteMany({})
    await prisma.report.deleteMany({})
    await prisma.emissorInfo.deleteMany({})
    await prisma.user.deleteMany({})

    console.log('✅ Banco de desenvolvimento resetado com sucesso!')
    console.log('💡 Execute "pnpm db:seed" para popular com dados iniciais.')
  } catch (error) {
    console.error('❌ Erro ao resetar banco de desenvolvimento:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetDevDatabase()