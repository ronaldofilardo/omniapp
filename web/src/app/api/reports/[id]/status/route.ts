import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { NextResponse, NextRequest } from 'next/server'
import { ReportStatus } from '@prisma/client'

// PATCH /api/reports/:id/status - Atualizar status do laudo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    // Verificar se o usuário tem acesso ao laudo
    const report = await prisma.report.findUnique({
      where: { id },
      include: { notification: true }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Laudo não encontrado' },
        { status: 404 }
      )
    }

    if (report.receiverId !== user.id && report.senderId !== user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Atualizar status e timestamps
    const updateData: any = { status }
    if (status === ReportStatus.RECEIVED) {
      updateData.receivedAt = new Date()
      console.log('[PATCH] Atualizando receivedAt para:', updateData.receivedAt)
    } else if (status === ReportStatus.VIEWED) {
      updateData.viewedAt = new Date()
      console.log('[PATCH] Atualizando viewedAt para:', updateData.viewedAt)
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        sender: {
          select: {
            name: true,
            emissorInfo: true
          }
        },
        receiver: {
          select: {
            name: true,
            cpf: true
          }
        }
      }
    })

    // Se o status for VIEWED, atualizar também a notificação
    if (status === ReportStatus.VIEWED && report.notification) {
      await prisma.notification.update({
        where: { id: report.notification.id },
        data: { status: 'READ' }
      })
    }

    return NextResponse.json(updatedReport)
  } catch (error) {
    console.error('[PATCH] /api/reports/:id/status:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar status do laudo' },
      { status: 500 }
    )
  }
}