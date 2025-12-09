import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { ReportStatus } from '@prisma/client'

// POST /api/reports/:id/access - Registrar acesso à Central de Notificações
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { accessTimestamp } = body

    // Verificar se o usuário tem acesso ao laudo
    const report = await prisma.report.findUnique({
      where: { id }
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

    // Registrar o acesso (timestamp de quando o usuário viu a notificação)
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        receivedAt: new Date(accessTimestamp),
        status: ReportStatus.RECEIVED
      },
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

    console.log(`[POST] /api/reports/${id}/access: Acesso registrado em ${accessTimestamp}`)

    return NextResponse.json(updatedReport)
  } catch (error) {
    console.error('[POST] /api/reports/:id/access:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar acesso' },
      { status: 500 }
    )
  }
}