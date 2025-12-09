import { NextRequest, NextResponse } from 'next/server';
import { NotificationStatus, ReportStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { withRLS } from '@/lib/middleware/rls';
import { prisma } from '@/lib/prisma';
import { withPerformanceTracking } from '@/lib/middleware/performanceMiddleware';
import { cacheGetOrSet, getCacheKeyForUserNotifications, CACHE_TTL } from '@/lib/cache/redisCache';
import { withErrorHandler, UnauthorizedError } from '@/lib/errors';

export const GET = withPerformanceTracking(async (req: NextRequest) => {
  return withRLS(req, withErrorHandler(async (req) => {
    // Fallback de autenticação: tentar auth() com tratamento de erro
    const user = await auth();

    if (!user) {
      throw new UnauthorizedError('Não autorizado');
    }
      const userId = user.id;

      // Cache key
      const cacheKey = getCacheKeyForUserNotifications(userId);

      // Buscar com cache
      const { data: notifications, fromCache } = await cacheGetOrSet(
        cacheKey,
        async () => {
          return await prisma.notification.findMany({
            where: {
              userId,
              status: { in: [NotificationStatus.UNREAD, NotificationStatus.ARCHIVED] }
            },
            orderBy: { createdAt: 'desc' }
          });
        },
        { ttl: CACHE_TTL.NOTIFICATIONS }
      );

    console.log(`[GET /api/notifications] Encontradas ${notifications.length} notificações UNREAD para userId: ${userId}`);
    if (notifications.length > 0) {
      console.log('[GET /api/notifications] Primeira notificação:', JSON.stringify(notifications[0], null, 2));
    }

    // Marcar laudos associados como DELIVERED quando notificações são buscadas
    const reportIds = notifications
      .map(n => (n.payload as any)?.reportId)
      .filter(id => id);

    if (reportIds.length > 0) {
      await prisma.report.updateMany({
        where: {
          id: { in: reportIds },
          status: ReportStatus.SENT // Só atualizar se ainda estiver SENT
        },
        data: {
          status: ReportStatus.DELIVERED
        }
      });
      console.log(`[GET /api/notifications] Marcados ${reportIds.length} laudos como DELIVERED`);
    }

    const response = NextResponse.json(notifications, { status: 200 });
    response.headers.set('X-Cache-Hit', fromCache ? 'true' : 'false');
    return response;
  }));
});

