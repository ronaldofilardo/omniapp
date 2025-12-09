/**
 * Script para verificar e criar funções RLS no banco de produção
 * 
 * Problema: As funções set_rls_context() e clear_rls_context() podem não existir
 * no banco de produção se as migrations não foram aplicadas corretamente.
 * 
 * Solução: Este script verifica se as funções existem e as cria se necessário.
 * 
 * USO:
 *   NODE_ENV=production DATABASE_URL="sua-url" npx tsx scripts/fix-rls-functions.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const RLS_FUNCTIONS_SQL = `
-- =====================================================
-- FUNÇÕES RLS (Row-Level Security)
-- =====================================================

-- Função para definir o contexto do usuário
CREATE OR REPLACE FUNCTION set_rls_context(user_id TEXT, user_role TEXT, is_system BOOLEAN DEFAULT false)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.user_id', user_id, false);
  PERFORM set_config('app.role', user_role, false);
  PERFORM set_config('app.system', is_system::text, false);
END;
$$ LANGUAGE plpgsql;

-- Função para limpar o contexto
CREATE OR REPLACE FUNCTION clear_rls_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.user_id', '', false);
  PERFORM set_config('app.role', '', false);
  PERFORM set_config('app.system', 'false', false);
END;
$$ LANGUAGE plpgsql;
`

async function checkFunctionExists(functionName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = '${functionName}'
      ) as exists`
    )
    return result[0]?.exists || false
  } catch (error) {
    console.error(`Erro ao verificar função ${functionName}:`, error)
    return false
  }
}

async function main() {
  console.log('🔍 Verificando funções RLS no banco de dados...\n')

  try {
    // Verificar se funções existem
    const setRlsExists = await checkFunctionExists('set_rls_context')
    const clearRlsExists = await checkFunctionExists('clear_rls_context')

    console.log('Status das funções:')
    console.log(`  ✓ set_rls_context(): ${setRlsExists ? '✅ Existe' : '❌ Não encontrada'}`)
    console.log(`  ✓ clear_rls_context(): ${clearRlsExists ? '✅ Existe' : '❌ Não encontrada'}`)
    console.log('')

    if (setRlsExists && clearRlsExists) {
      console.log('✅ Todas as funções RLS já existem! Nada a fazer.')
      return
    }

    // Criar funções se não existirem
    console.log('🔧 Criando funções RLS ausentes...')
    
    await prisma.$executeRawUnsafe(RLS_FUNCTIONS_SQL)
    
    console.log('✅ Funções RLS criadas com sucesso!')
    console.log('')

    // Verificar novamente
    const setRlsExistsAfter = await checkFunctionExists('set_rls_context')
    const clearRlsExistsAfter = await checkFunctionExists('clear_rls_context')

    console.log('Verificação pós-criação:')
    console.log(`  ✓ set_rls_context(): ${setRlsExistsAfter ? '✅ Existe' : '❌ Falha'}`)
    console.log(`  ✓ clear_rls_context(): ${clearRlsExistsAfter ? '✅ Existe' : '❌ Falha'}`)
    console.log('')

    if (setRlsExistsAfter && clearRlsExistsAfter) {
      console.log('✅ Script concluído com sucesso!')
    } else {
      console.error('❌ Falha ao criar algumas funções. Verifique os logs acima.')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Erro ao executar script:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
