
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { withRLS } from '@/lib/middleware/rls';
import { withPerformanceTracking } from '@/lib/middleware/performanceMiddleware';

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  return withPerformanceTracking(async (request) => {
    return withRLS(request, async (request) => {
      try {
        console.log('[API Repository] Iniciando busca...')
        const user = await auth();
        if (!user) {
          return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        const userId = user.id;
        console.log('[API Repository] userId da sessão:', userId)

        // Busca todos os eventos do usuário, incluindo arquivos reais
        const events = await prisma.healthEvent.findMany({
          where: { userId },
          include: { professional: true, files: true },
          orderBy: { date: 'desc' },
        });
        console.log('[API Repository] Eventos retornados:', events.length)
        console.log('[API Repository] IDs dos eventos:', events.map(e => e.id))
        return NextResponse.json(events);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('[API Repository] Erro ao buscar eventos com arquivos:', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
        return NextResponse.json({ error: 'Erro interno ao buscar dados do repositório.' }, { status: 500 });
      }
    });
  });
}

