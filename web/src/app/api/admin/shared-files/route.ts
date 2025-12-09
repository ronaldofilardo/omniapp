import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await auth()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit

    // Buscar compartilhamentos da tabela AuditLog
    const sharedFiles = await prisma.auditLog.findMany({
      where: {
        documentType: 'file_share',
        action: 'SHARE_CREATED'
      },
      select: {
        id: true,
        patientName: true, // userName
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit,
    })

    // Formatar os compartilhamentos para o formato esperado pelo frontend
    const formattedFiles = sharedFiles.map(share => ({
      id: share.id,
      userName: share.patientName || 'Usuário',
      fileType: 'compartilhamento',
      fileName: `Compartilhamento de ${(share.metadata && typeof share.metadata === 'object' && 'fileCount' in share.metadata) ? share.metadata.fileCount as number : 0} arquivo(s)`,
      createdAt: share.createdAt,
      eventId: (share.metadata && typeof share.metadata === 'object' && 'eventId' in share.metadata) ? share.metadata.eventId as string : null,
      fileCount: (share.metadata && typeof share.metadata === 'object' && 'fileCount' in share.metadata) ? share.metadata.fileCount as number : 0,
      shareToken: (share.metadata && typeof share.metadata === 'object' && 'shareToken' in share.metadata) ? share.metadata.shareToken as string : null,
    }))

    // Contar total de compartilhamentos
    const total = await prisma.auditLog.count({
      where: {
        documentType: 'file_share',
        action: 'SHARE_CREATED'
      }
    })

    return NextResponse.json({
      files: formattedFiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erro ao buscar arquivos compartilhados:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}