import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const DEFAULT_USER_EMAIL = 'user@email.com'

async function getDefaultUserId() {
  const user = await prisma.user.findUnique({
    where: { email: DEFAULT_USER_EMAIL },
  })
  if (!user) throw new Error('Usuário padrão não encontrado.')
  return user.id
}

export async function GET(req: Request) {
  try {
    const url = req.url.startsWith('http') ? new URL(req.url) : new URL(req.url, 'http://localhost')
    const userId = url.searchParams.get('userId') || await getDefaultUserId()

    // Buscar arquivos órfãos apenas dos profissionais do usuário
    const orphanFiles = await prisma.files.findMany({
      where: {
        isOrphaned: true,
        professionals: {
          userId: userId
        }
      },
      include: {
        health_events: true,
        professionals: true
      }
    })

    return NextResponse.json(orphanFiles)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Erro ao buscar arquivos órfãos:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = req.url.startsWith('http') ? new URL(req.url) : new URL(req.url, 'http://localhost')
    const fileId = url.searchParams.get('fileId')
    const userId = url.searchParams.get('userId') || await getDefaultUserId()

    if (!fileId) {
      return NextResponse.json({ error: 'fileId é obrigatório' }, { status: 400 })
    }

    // Verificar se o arquivo órfão existe e pertence ao profissional do usuário
    const file = await prisma.files.findFirst({
      where: {
        id: fileId,
        isOrphaned: true
      },
      include: {
        professionals: {
          include: {
            user: true
          }
        }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'Arquivo órfão não encontrado' }, { status: 404 })
    }

    // Verificar se o profissional pertence ao usuário
    if (file.professionals?.user?.id !== userId) {
      return NextResponse.json({ error: 'Não autorizado a deletar este arquivo' }, { status: 403 })
    }

    // Deletar arquivo físico se existir
    if (file.url) {
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

    // Deletar registro do arquivo
    await prisma.files.delete({
      where: { id: fileId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Erro ao deletar arquivo órfão:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
