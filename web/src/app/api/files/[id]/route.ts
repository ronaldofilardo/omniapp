import { NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação obrigatória
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Buscar arquivo no banco com relacionamentos para autorização
    const file = await prisma.files.findUnique({
      where: { id },
      include: {
        health_events: {
          select: {
            id: true,
            userId: true,
            title: true,
            type: true
          }
        },
        professionals: {
          select: {
            id: true,
            userId: true,
            name: true
          }
        }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    // Autorização: verificar se usuário tem permissão para deletar o arquivo
    const hasAccess = user.role === 'ADMIN' ||
      (file.health_events && file.health_events.userId === user.id) ||
      (file.professionals && file.professionals.userId === user.id)

    if (!hasAccess) {
      console.warn(`[FILE DELETE] Acesso negado - User: ${user.id}, File: ${id}, Role: ${user.role}`)
      return NextResponse.json({ error: 'Acesso negado ao arquivo' }, { status: 403 })
    }

    // Deletar arquivo físico se existir
    if (file.physicalPath) {
      try {
        const filePath = path.join(process.cwd(), 'public', file.physicalPath)
        await unlink(filePath)
        console.log(`[FILE DELETE] Arquivo físico deletado: ${filePath}`)
      } catch (fileError) {
        // Arquivo físico pode não existir, continuar com deleção do banco
        console.warn(`[FILE DELETE] Arquivo físico não encontrado: ${file.physicalPath}`)
      }
    }

    // Deletar registro do banco (hard delete)
    await prisma.files.delete({
      where: { id }
    })

    console.log(`[FILE DELETE] Arquivo deletado permanentemente: ${id} (${file.name})`)

    return NextResponse.json({ success: true, message: 'Arquivo deletado com sucesso' })

  } catch (error) {
    console.error('Erro ao deletar arquivo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}