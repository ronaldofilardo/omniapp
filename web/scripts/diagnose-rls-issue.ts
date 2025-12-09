/**
 * Script de diagnóstico para problema de RLS
 * 
 * Problema: Eventos desaparecem da timeline após upload de arquivos
 * Causa raiz: RLS policies bloqueando acesso aos eventos
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnoseRLSIssue() {
  console.log('='.repeat(60))
  console.log('DIAGNÓSTICO DO PROBLEMA DE RLS')
  console.log('='.repeat(60))
  console.log()

  try {
    // 1. Verificar se RLS está habilitado
    console.log('1. Verificando status do RLS...')
    const rlsStatus = await prisma.$queryRaw<Array<{ 
      tablename: string
      rowsecurity: boolean 
    }>>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('health_events', 'files', 'professionals')
    `
    
    console.table(rlsStatus)
    console.log()

    // 2. Verificar políticas RLS ativas
    console.log('2. Verificando políticas RLS ativas...')
    const policies = await prisma.$queryRaw<Array<{
      tablename: string
      policyname: string
      cmd: string
    }>>`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE tablename IN ('health_events', 'files', 'professionals')
      ORDER BY tablename, policyname
    `
    
    console.table(policies)
    console.log()

    // 3. Verificar contexto RLS atual
    console.log('3. Verificando contexto RLS atual...')
    try {
      const context = await prisma.$queryRaw<Array<{
        user_id: string
        role: string
        system: string
      }>>`
        SELECT 
          current_setting('app.user_id', true) as user_id,
          current_setting('app.role', true) as role,
          current_setting('app.system', true) as system
      `
      console.log('Contexto atual:', context[0])
    } catch (error) {
      console.log('❌ Erro ao buscar contexto:', error)
    }
    console.log()

    // 4. Contar eventos com e sem RLS
    console.log('4. Contando eventos...')
    
    // Sem RLS (admin bypass)
    const totalEvents = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM health_events
    `
    console.log(`Total de eventos (sem RLS): ${totalEvents[0].count}`)
    
    // Com RLS (como usuário normal)
    const visibleEvents = await prisma.healthEvent.count()
    console.log(`Eventos visíveis (com RLS): ${visibleEvents}`)
    console.log()

    // 5. Listar eventos "invisíveis"
    if (Number(totalEvents[0].count) > visibleEvents) {
      console.log('5. ⚠️  EVENTOS INVISÍVEIS DETECTADOS!')
      console.log(`   ${Number(totalEvents[0].count) - visibleEvents} eventos estão sendo bloqueados por RLS`)
      console.log()
      
      // Mostrar amostra de eventos invisíveis
      const invisibleEvents = await prisma.$queryRaw<Array<{
        id: string
        title: string
        date: Date
        userId: string
        createdAt: Date
      }>>`
        SELECT id, title, date, "userId", "createdAt"
        FROM health_events
        ORDER BY "createdAt" DESC
        LIMIT 10
      `
      
      console.log('   Últimos 10 eventos no banco (sem RLS):')
      console.table(invisibleEvents)
    } else {
      console.log('5. ✅ Todos os eventos estão visíveis')
    }
    console.log()

    // 6. Verificar arquivos órfãos
    console.log('6. Verificando arquivos órfãos...')
    const orphanedFiles = await prisma.$queryRaw<Array<{
      count: bigint
    }>>`
      SELECT COUNT(*) as count 
      FROM files 
      WHERE "is_orphan" = true
    `
    console.log(`Arquivos órfãos: ${orphanedFiles[0].count}`)
    console.log()

    // 7. Recomendações
    console.log('='.repeat(60))
    console.log('RECOMENDAÇÕES')
    console.log('='.repeat(60))
    
    const hasRLS = rlsStatus.some(t => t.rowsecurity)
    const hasInvisibleEvents = Number(totalEvents[0].count) > visibleEvents
    
    if (hasRLS && hasInvisibleEvents) {
      console.log('❌ PROBLEMA CONFIRMADO: RLS está bloqueando eventos')
      console.log()
      console.log('Soluções possíveis:')
      console.log('1. TEMPORÁRIA: Desabilitar RLS até corrigir o middleware')
      console.log('   → Executar: node scripts/disable-rls-temp.ts')
      console.log()
      console.log('2. PERMANENTE: Corrigir configuração do contexto RLS')
      console.log('   → Verificar se withRLS está sendo chamado em TODAS as rotas')
      console.log('   → Garantir que setRLSContext não está falhando silenciosamente')
      console.log()
    } else if (hasRLS && !hasInvisibleEvents) {
      console.log('✅ RLS está configurado e funcionando corretamente')
    } else {
      console.log('⚠️  RLS não está habilitado')
    }

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseRLSIssue()
  .then(() => {
    console.log('\n✅ Diagnóstico concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
