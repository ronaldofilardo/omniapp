import { v4 as uuidv4 } from 'uuid'

import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

import { prisma } from '@/lib/prisma'
import { calculateFileHashFromBuffer } from '@/lib/utils/fileHashServer'
import { generateSafeFilename } from '@/lib/utils/filePath'
import { getUploadConfig, getFileTooLargeError, isMimeTypeAllowed } from '@/lib/config/upload'
import { auth } from '@/lib/auth'
import { uploadRateLimiter } from '@/lib/utils/rateLimit'
import { logSecurityEvent } from '@/lib/services/auditService'
import { scanForViruses } from '@/lib/utils/virusScan'
import { storageManager } from '@/lib/storage'

const uploadConfig = getUploadConfig()

export const runtime = 'nodejs'

export async function POST(req: Request) {
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
      resource: '/api/upload-file',
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
      resource: '/api/upload-file',
      details: { reason: 'no_session' }
    })
    return NextResponse.json({ error: 'Autenticação obrigatória' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const slot = formData.get('slot') as string
    const eventId = formData.get('eventId') as string

    console.log('[UPLOAD-FILE] Dados recebidos:', {
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      slot,
      eventId
    })

    if (!file || !slot || !eventId) {
      console.warn('[UPLOAD-FILE] Falha: Dados incompletos', { file, slot, eventId })
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    // Verificar se o usuário é o proprietário do evento
    const event = await prisma.healthEvent.findUnique({
      where: { id: eventId },
      select: { userId: true }
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })
    }

    if (event.userId !== user.id) {
      await logSecurityEvent({
        action: 'UNAUTHORIZED_ACCESS',
        ip,
        userAgent: req.headers.get('user-agent') || undefined,
        userId: user.id,
        resource: '/api/upload-file',
        details: { eventId, eventOwner: event.userId, attemptedAction: 'upload_file_to_event' }
      })
      return NextResponse.json({ error: 'Acesso negado: você não tem permissão para fazer upload neste evento.' }, { status: 403 })
    }
    // Validação de tipo de arquivo (deve ser imagem ou PDF)
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      console.warn('[UPLOAD-FILE] Falha: Tipo inválido', { fileType: file.type })
      return NextResponse.json({ error: 'Apenas arquivos de imagem ou PDFs são aceitos (PNG, JPG, JPEG, GIF, PDF, etc.).' }, { status: 400 })
    }

    // Validação de tamanho - compatibilidade com Vercel
    if (file.size >= uploadConfig.maxFileSize) {
      console.warn('[UPLOAD-FILE] Falha: Arquivo grande demais', { fileSize: file.size, maxSize: uploadConfig.maxFileSize })
      return NextResponse.json({
        error: getFileTooLargeError(file.size, uploadConfig)
      }, { status: 400 })
    }

    // Warning em desenvolvimento se arquivo se aproxima do limite de produção
    if (process.env.NODE_ENV === 'development' && file.size > 1.5 * 1024) { // > 1.5KB
      console.warn(`[UPLOAD-FILE WARNING] Arquivo de ${file.size} bytes se aproxima do limite de produção (2KB). Considere otimizar para compatibilidade com Vercel.`)
    }

    // Salvar arquivo usando o storage manager
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const safeFilename = generateSafeFilename(file.name, file.type)
    const uploadResult = await storageManager.upload(file, {
      eventId,
      slot,
      filename: `${slot}-${safeFilename}`
    })

    if (!uploadResult.success) {
      console.error('[UPLOAD-FILE] Falha no upload:', uploadResult.error)
      return NextResponse.json({ error: uploadResult.error || 'Falha no upload' }, { status: 500 })
    }

    const fileUrl = uploadResult.url
    const fileId = uuidv4()

    // Verificar vírus/malware
    const scanResult = await scanForViruses(buffer, file.name, file.type)
    if (!scanResult.isClean) {
      await logSecurityEvent({
        action: 'INVALID_FILE_TYPE', // Reutilizando para malware
        ip,
        userAgent: req.headers.get('user-agent') || undefined,
        userId: user.id,
        resource: '/api/upload-file',
        details: {
          fileName: file.name,
          fileType: file.type,
          threatFound: scanResult.threatFound,
          scanEngine: scanResult.scanEngine
        }
      })
      return NextResponse.json({
        error: 'Arquivo contém conteúdo suspeito ou malware detectado.'
      }, { status: 400 })
    }

    // Calcula o hash do arquivo
    const fileHash = calculateFileHashFromBuffer(buffer)

    // Cria novo arquivo relacionado ao evento, incluindo o hash
    await prisma.files.create({
      data: {
        id: fileId,
        eventId,
        slot,
        name: safeFilename,
        url: fileUrl, // URL do blob
        physicalPath: uploadResult.fileId, // ID do arquivo no storage
        uploadDate: new Date().toISOString(),
        fileHash,
      }
    })

    // Atualizar métricas de upload
    await prisma.adminMetrics.upsert({
      where: { id: 'singleton' },
      update: { totalUploadBytes: { increment: BigInt(file.size) } },
      create: { id: 'singleton', totalUploadBytes: BigInt(file.size) }
    })

    return NextResponse.json({ success: true, url: fileUrl, name: safeFilename })
  } catch (error) {
    console.error('[UPLOAD-FILE] Erro no processamento:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
