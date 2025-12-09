import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: eventId, fileId } = await context.params
    const body = await req.json()
    // Verificar se o arquivo existe e pertence ao evento
    const file = await prisma.files.findFirst({
      where: {
        id: fileId,
        eventId,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    // Deletar permanentemente
    if (file.url) {
      const fs = require('fs')
      const path = require('path')
      try {
        const rawUrl = String(file.url)
        const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'http://localhost')
        const filePath = url.pathname.replace('/uploads/', 'public/uploads/')
        const fullPath = path.join(process.cwd(), filePath)
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
        }
      } catch (fileError) {
        console.error('Erro ao deletar arquivo físico:', fileError)
      }
    }
    await prisma.files.delete({
      where: { id: fileId },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Erro ao deletar arquivo:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}