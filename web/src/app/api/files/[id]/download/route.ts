import { NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logDocumentSubmission, logReportView } from '@/lib/services/auditService'
import { UserRole } from '@prisma/client'

// Função para verificar se usuário tem acesso ao arquivo
async function checkFileAccess(userId: string, userRole: UserRole, file: any): Promise<boolean> {
  // Admin tem acesso a todos os arquivos
  if (userRole === 'ADMIN') {
    return true
  }

  // Verificar se arquivo pertence a um evento do usuário
  if (file.health_events && file.health_events.userId === userId) {
    return true
  }

  // Verificar se arquivo pertence a um profissional do usuário
  if (file.professionals && file.professionals.userId === userId) {
    return true
  }

  // Se não encontrou relação de ownership, negar acesso
  return false
}

// Função para determinar o tipo MIME baseado na extensão
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'txt': 'text/plain',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

export async function GET(
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

    if (!file || !file.url) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    // Autorização: verificar se usuário tem permissão para acessar o arquivo
    const hasAccess = await checkFileAccess(user.id, user.role, file)
    if (!hasAccess) {
      // Log tentativa de acesso não autorizado
      console.warn(`[FILE DOWNLOAD] Acesso negado - User: ${user.id}, File: ${id}, Role: ${user.role}`)
      return NextResponse.json({ error: 'Acesso negado ao arquivo' }, { status: 403 })
    }

    // Verificar se é URL externa (Vercel Blob) ou local
    if (file.url.startsWith('http')) {
      // Redirecionar para URL externa
      return NextResponse.redirect(file.url)
    }

    // Para arquivos locais (desenvolvimento)
    const filePath = path.join(process.cwd(), 'public', file.physicalPath)

    // Prevenir acesso a arquivos com physicalPath inválido
    if (file.physicalPath.startsWith('/share/')) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    // Verificar se arquivo existe
    try {
      await access(filePath)
    } catch {
      return NextResponse.json({ error: 'Arquivo não encontrado no sistema' }, { status: 404 })
    }

    // Ler arquivo
    const fileBuffer = await readFile(filePath)
    const fileSize = fileBuffer.length

    // Registrar download no audit log
    const userFull = await prisma.user.findUnique({
      where: { id: user.id },
      select: { cpf: true, name: true }
    })

    // Registrar download genérico
    await logDocumentSubmission({
      origin: 'PORTAL_LOGADO',
      receiverCpf: userFull?.cpf?.replace(/\D/g, '') || 'desconhecido',
      patientId: user.id,
      patientName: userFull?.name || null,
      fileName: file.name,
      fileHash: file.fileHash || null,
      protocol: null,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'portal-interno',
      userAgent: req.headers.get('user-agent') || null,
      status: 'SUCCESS',
    })

    // Se for um laudo (slot === 'result'), registrar visualização específica
    if (file.slot === 'result') {
      await logReportView({
        userId: user.id,
        userCpf: userFull?.cpf?.replace(/\D/g, '') || 'desconhecido',
        userName: userFull?.name || null,
        reportId: file.id,
        reportFileName: file.name,
        eventId: file.health_events?.id || null,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'portal-interno',
        userAgent: req.headers.get('user-agent') || null,
        viewedAt: new Date(),
      })
    }

    // Atualizar métricas de download
    await prisma.adminMetrics.upsert({
      where: { id: 'singleton' },
      update: { totalDownloadBytes: { increment: BigInt(fileSize) } },
      create: { id: 'singleton', totalDownloadBytes: BigInt(fileSize) }
    })

    // Determinar tipo MIME
    const mimeType = getMimeType(file.name)

    // Retornar arquivo
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${file.name}"`,
      },
    })
  } catch (error) {
    console.error('Erro no download:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}