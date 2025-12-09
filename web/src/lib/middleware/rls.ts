/**
 * Middleware RLS (Row-Level Security)
 * 
 * Configura automaticamente o contexto RLS do PostgreSQL para cada requisição,
 * garantindo isolamento de dados entre usuários conforme LGPD/GDPR.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Configura o contexto RLS no PostgreSQL
 * @param userId - ID do usuário autenticado
 * @param role - Role do usuário (RECEPTOR, EMISSOR, ADMIN)
 * @param isSystem - Se true, permite operações do sistema (bypass parcial)
 */
export async function setRLSContext(
  userId: string,
  role: string,
  isSystem: boolean = false
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `SELECT set_rls_context('${userId}', '${role}', ${isSystem})`
    );
  } catch (error) {
    console.error('[RLS] Erro ao configurar contexto:', error);
    throw new Error('Falha ao configurar contexto de segurança');
  }
}

/**
 * Limpa o contexto RLS no PostgreSQL
 */
export async function clearRLSContext(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe('SELECT clear_rls_context()');
  } catch (error) {
    console.error('[RLS] Erro ao limpar contexto:', error);
  }
}

/**
 * Middleware para configurar RLS automaticamente
 * 
 * Deve ser usado em rotas de API que precisam de isolamento de dados
 */
export async function withRLS(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: { isSystem?: boolean }
): Promise<NextResponse> {
  try {
    // Tentar obter usuário autenticado
    const user = await auth();

    if (user && user.id && user.role) {
      // Usuário autenticado - configurar contexto RLS
      await setRLSContext(
        user.id,
        user.role,
        options?.isSystem || false
      );
    } else if (options?.isSystem) {
      // Operação do sistema (API pública, etc)
      await setRLSContext('system', 'EMISSOR', true);
    } else {
      // Não autenticado e não é sistema - bloquear
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }

    // Executar handler da rota
    const response = await handler(req);

    // Limpar contexto após execução
    await clearRLSContext();

    return response;
  } catch (error) {
    // Garantir limpeza do contexto em caso de erro
    await clearRLSContext();
    throw error;
  }
}

/**
 * Helper para operações do sistema (sem autenticação)
 * 
 * Deve ser usado APENAS em rotas públicas específicas que precisam
 * criar dados para usuários (ex: API de submissão de documentos)
 */
export async function withSystemRLS<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    await setRLSContext('system', 'EMISSOR', true);
    const result = await operation();
    await clearRLSContext();
    return result;
  } catch (error) {
    await clearRLSContext();
    throw error;
  }
}

/**
 * Helper para executar queries como admin (bypass completo de RLS)
 * 
 * CUIDADO: Deve ser usado APENAS em operações administrativas
 * devidamente autorizadas. Não expor em APIs públicas.
 */
export async function withAdminRLS<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    await setRLSContext(userId, 'ADMIN', false);
    const result = await operation();
    await clearRLSContext();
    return result;
  } catch (error) {
    await clearRLSContext();
    throw error;
  }
}
