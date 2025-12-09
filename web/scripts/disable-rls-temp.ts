/**
 * Script para TEMPORARIAMENTE desabilitar RLS
 * 
 * ATENÇÃO: Este script deve ser usado APENAS como solução temporária
 * para restaurar o acesso aos eventos enquanto o middleware RLS é corrigido
 * 
 * Em produção, o RLS é importante para segurança LGPD/GDPR
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function disableRLSTemporarily() {
  console.log('='.repeat(60))
  console.log('DESABILITANDO RLS TEMPORARIAMENTE')
  console.log('='.repeat(60))
  console.log()
  console.log('⚠️  AVISO: Esta é uma solução TEMPORÁRIA')
  console.log('   O RLS deve ser reabilitado após corrigir o middleware')
  console.log()

  try {
    // Desabilitar RLS em todas as tabelas
    const tables = ['health_events', 'files', 'professionals', 'users', 'notifications', 'reports', 'emissor_info']
    
    for (const table of tables) {
      console.log(`Desabilitando RLS em ${table}...`)
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`)
      console.log(`✅ ${table} - RLS desabilitado`)
    }
    
    console.log()
    console.log('='.repeat(60))
    console.log('✅ RLS DESABILITADO EM TODAS AS TABELAS')
    console.log('='.repeat(60))
    console.log()
    console.log('⚠️  LEMBRE-SE:')
    console.log('1. Esta é uma solução TEMPORÁRIA')
    console.log('2. Corrija o middleware RLS o mais rápido possível')
    console.log('3. Reabilite RLS executando: node scripts/enable-rls.ts')
    console.log()

  } catch (error) {
    console.error('❌ Erro ao desabilitar RLS:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

disableRLSTemporarily()
  .then(() => {
    console.log('✅ Script concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
