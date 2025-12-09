/**
 * Script para REABILITAR RLS após correções
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function enableRLS() {
  console.log('='.repeat(60))
  console.log('REABILITANDO RLS')
  console.log('='.repeat(60))
  console.log()

  try {
    const tables = ['health_events', 'files', 'professionals', 'users', 'notifications', 'reports', 'emissor_info']
    
    for (const table of tables) {
      console.log(`Habilitando RLS em ${table}...`)
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)
      console.log(`✅ ${table} - RLS habilitado`)
    }
    
    console.log()
    console.log('='.repeat(60))
    console.log('✅ RLS HABILITADO EM TODAS AS TABELAS')
    console.log('='.repeat(60))
    console.log()

  } catch (error) {
    console.error('❌ Erro ao habilitar RLS:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

enableRLS()
  .then(() => {
    console.log('✅ Script concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
