import { NextRequest, NextResponse } from 'next/server';
import { NotificationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logNotificationAction } from '@/lib/services/auditService';

// PATCH /api/notifications/:id - Atualizar status da notificação
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Buscar notificação antes de atualizar para logging
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            cpf: true
          }
        }
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    // Verificar se usuário tem permissão
    if (notification.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { status: status as NotificationStatus }
    });

    // Registrar ação no audit log
    let action: 'VIEWED' | 'ARCHIVED' = 'VIEWED';
    if (status === NotificationStatus.ARCHIVED) {
      action = 'ARCHIVED';
    }

    await logNotificationAction({
      userId: user.id,
      userCpf: notification.user?.cpf?.replace(/\D/g, '') || 'desconhecido',
      notificationId: id,
      action,
      notificationType: notification.type,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'portal-interno',
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        previousStatus: notification.status,
        newStatus: status,
      }
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('[PATCH] /api/notifications/:id:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar notificação' },
      { status: 500 }
    );
  }
}