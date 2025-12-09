import { NextRequest, NextResponse } from 'next/server'
import { EventType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withRLS } from '@/lib/middleware/rls'
import {
  validateDate,
  validateStartTime,
  validateEndTime,
  validateEventDateTime,
} from '@/lib/validators/eventValidators'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRLS(req, async (req) => {
  const { id } = await params
  try {
    console.log(`[API Events] Buscando evento específico: ${id}`)

    const event = await prisma.healthEvent.findUnique({
      where: { id },
      include: {
        professional: true,
        files: true,
      },
    })

    if (!event) {
      console.warn(`[API Events] Evento não encontrado: ${id}`)
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    console.log(`[API Events] Evento encontrado: ${event.id}`)
    return NextResponse.json(event, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[API Events] Erro ao buscar evento específico:`, {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(
      {
        error: 'Erro interno do servidor ao buscar evento',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  type UpdateEventBody = {
    title?: string
    description?: string
    date?: string
    type?: EventType
    startTime?: string
    endTime?: string
    professionalId?: string
    files?: any
    notificationId?: string
  }

  let body: UpdateEventBody | undefined = undefined
  try {
    const { id } = await params
    body = await req.json()
    const {
      title,
      description,
      date,
      type,
      startTime,
      endTime,
      professionalId,
      files,
      notificationId,
    } = body as UpdateEventBody

    console.log(`[API Events] Atualizando evento específico: ${id}`, {
      title,
      date,
      type,
      files: files ? 'presente' : 'ausente',
    })

    // Buscar evento existente com arquivos
    const existing = await prisma.healthEvent.findUnique({ where: { id }, include: { files: true } })
    if (!existing) {
      console.warn(`[API Events] Evento não encontrado para atualização: ${id}`)
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Preparar dados para atualização
    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (professionalId !== undefined) updateData.professionalId = professionalId
    if (type !== undefined) updateData.type = type
    if (files !== undefined) updateData.files = files

    // Validar e converter data se fornecida
    if (date) {
      const startTimeStr = startTime || (existing.startTime ? existing.startTime.toISOString().split('T')[1].substring(0,5) : null)
      const endTimeStr = endTime || (existing.endTime ? existing.endTime.toISOString().split('T')[1].substring(0,5) : null)
      const validation = validateEventDateTime(date, startTimeStr, endTimeStr)
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(' ')
        console.warn(`[API Events] Validação falhou na atualização:`, validation.errors)
        return NextResponse.json(
          { error: errorMessages || 'Dados inválidos' },
          { status: 400 }
        )
      }
      const localDate = new Date(`${date}T12:00:00`)
      updateData.date = localDate.toISOString().split('T')[0]
    }

    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime

    // Se notificationId for fornecido, atualizar evento e arquivar notificação em transação
    if (notificationId) {
      const result = await prisma.$transaction(async (tx) => {
        // Verificar se já existe laudo no slot result (se files for fornecido)
        if (files && Array.isArray(files)) {
          const alreadyHasResult = Array.isArray(existing.files)
            ? existing.files.some((f: any) => f.slot === 'result')
            : false
          if (alreadyHasResult && !files.some((f: any) => f.slot === 'result')) {
            // Se estava removendo o result, permitir
          } else if (!alreadyHasResult && files.some((f: any) => f.slot === 'result')) {
            // Adicionando result, verificar se já existe
            const hasResultInNew = files.some((f: any) => f.slot === 'result')
            if (hasResultInNew && alreadyHasResult) {
              throw new Error('Evento já possui laudo associado no slot result')
            }
          }
        }

        const event = await tx.healthEvent.update({
          where: { id },
          data: updateData,
        })
        await tx.notification.update({
          where: { id: notificationId },
          data: { status: 'ARCHIVED' },
        })
        return event
      })
      console.log(`[API Events] Evento atualizado e notificação arquivada: ${result.id}`)
      return NextResponse.json(result, { status: 200 })
    } else {
      const event = await prisma.healthEvent.update({
        where: { id },
        data: updateData,
      })
      console.log(`[API Events] Evento atualizado com sucesso: ${event.id}`)
      return NextResponse.json(event, { status: 200 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[API Events] Erro ao atualizar evento específico:`, {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestData: body || null,
    })
    return NextResponse.json(
      {
        error: 'Erro interno do servidor ao atualizar evento',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
}