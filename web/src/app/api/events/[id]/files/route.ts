import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import type { HealthEvent, FileInfo } from '@/types/events'
import { auth } from '@/lib/auth'
import { uploadRateLimiter } from '@/lib/utils/rateLimit'
import { logSecurityEvent } from '@/lib/services/auditService'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') ||
             'unknown'

  // Rate limiting
  const rateLimitResult = uploadRateLimiter.check(ip)
  if (!rateLimitResult.allowed) {
    await logSecurityEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
      resource: '/api/events/[id]/files',
      details: { retryAfter: rateLimitResult.retryAfter }
    })
    return NextResponse.json(
      {
        error: 'Limite de requisições excedido. Tente novamente mais tarde.',
        retryAfter: rateLimitResult.retryAfter
      },
      {
        status: 429,
        headers: { 'Retry-After': rateLimitResult.retryAfter?.toString() || '900' }
      }
    )
  }

  // Verificar autenticação obrigatória
  const user = await auth()
  if (!user) {
    await logSecurityEvent({
      action: 'AUTH_FAILURE',
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
      resource: '/api/events/[id]/files',
      details: { reason: 'no_session' }
    })
    return NextResponse.json(
      { error: 'Autenticação obrigatória' },
      { status: 401 }
    )
  }

  try {
    const { id } = await context.params
    const { slot } = await req.json()

    // Buscar evento para obter informações do arquivo e verificar propriedade
    const event = await prisma.healthEvent.findUnique({
      where: { id },
      select: { files: true, userId: true }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário é o proprietário do evento
    if (event.userId !== user.id) {
      await logSecurityEvent({
        action: 'UNAUTHORIZED_ACCESS',
        ip,
        userAgent: req.headers.get('user-agent') || undefined,
        userId: user.id,
        resource: '/api/events/[id]/files',
        details: { eventId: id, eventOwner: event.userId, attemptedAction: 'delete_file_from_event' }
      })
      return NextResponse.json(
        { error: 'Acesso negado: você não tem permissão para modificar este evento' },
        { status: 403 }
      )
    }
    // Garantir que files é um array
    let files: FileInfo[] = [];
    if (Array.isArray(event.files)) {
      files = event.files.map(file => ({
        ...file,
        uploadDate: file.uploadDate?.toISOString() || null,
        expiryDate: file.expiryDate?.toISOString() || null,
      }));
    } else {
      try {
        files = JSON.parse(event.files || '[]') as FileInfo[];
      } catch (err) {
        console.error('[Delete File] Erro ao fazer parse dos arquivos:', event.files, err);
        return NextResponse.json({ error: 'Erro ao processar arquivos do evento' }, { status: 500 });
      }
    }

    // Encontrar arquivo a ser deletado
    const file = files.find(f => f.slot === slot);
    if (!file) {
      console.error('[Delete File] Arquivo não encontrado para slot:', slot, 'em', files);
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      );
    }

    // Remover arquivo do sistema de arquivos
    const filePath = join(process.cwd(), 'public', file.url);
    try {
      await unlink(filePath);
    } catch (err) {
      // Se o arquivo já não existe, logar mas não falhar
      console.warn('[Delete File] Arquivo já não existe ou erro ao deletar:', filePath, err);
    }

    // Atualizar evento removendo o arquivo
    await prisma.healthEvent.update({
      where: { id },
      data: {
        files: {
          deleteMany: { slot }
        }
      }
    });

    console.log('[Delete File] Arquivo deletado com sucesso:', filePath, 'para slot:', slot);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Delete File] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar arquivo' },
      { status: 500 }
    )
  }
}