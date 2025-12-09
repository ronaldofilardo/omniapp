import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Proxy para servir PDFs do Cloudinary
 * 
 * Solução definitiva para problemas de 401/ACL do Cloudinary:
 * - Baixa o PDF do Cloudinary no servidor
 * - Serve para o cliente com headers corretos
 * - Funciona mesmo com arquivos privados no Cloudinary
 * - Garante autenticação do usuário
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Proxy] Iniciando requisição')
    
    // Verificar autenticação
    const user = await auth()
    console.log('[Proxy] Auth result:', user ? `User ${user.id} (${user.role})` : 'No user')
    
    if (!user) {
      console.error('[Proxy] Usuário não autenticado')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    console.log('[Proxy] Buscando arquivo ID:', id, 'para usuário:', user.id)

    // Buscar arquivo no banco
    const file = await prisma.files.findUnique({
      where: { id },
      include: {
        health_events: {
          select: { userId: true }
        }
      }
    })

    if (!file) {
      console.error('[Proxy] Arquivo não encontrado:', id)
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    console.log('[Proxy] Arquivo encontrado:', file.name, 'eventId:', file.eventId, 'userId do evento:', file.health_events?.userId)

    // Verificar permissão (usuário dono ou admin)
    const hasAccess = user.role === 'ADMIN' || file.health_events?.userId === user.id
    if (!hasAccess) {
      console.error('[Proxy] Acesso negado. User role:', user.role, 'Event userId:', file.health_events?.userId, 'User id:', user.id)
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    console.log('[Proxy] Acesso permitido. Baixando de:', file.url)

    // Se a URL é relativa (arquivo local), servir do sistema de arquivos
    if (!file.url.startsWith('http')) {
      try {
        const fs = await import('fs/promises')
        const path = await import('path')
        
        // Construir caminho físico (relativo a public/)
        const filePath = path.join(process.cwd(), 'public', file.url)
        console.log('[Proxy] Lendo arquivo local de:', filePath)
        
        const fileBuffer = await fs.readFile(filePath)
        console.log('[Proxy] Arquivo local lido com sucesso. Size:', fileBuffer.byteLength, 'bytes')
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
            'Content-Disposition': `inline; filename="${file.name}"`,
            'Cache-Control': 'public, max-age=3600',
          }
        })
      } catch (fsError) {
        console.error('[Proxy] Erro ao ler arquivo local:', fsError)
        return NextResponse.json(
          { error: 'Arquivo local não encontrado' },
          { status: 404 }
        )
      }
    }

    // Se a URL não é do Cloudinary, redirecionar
    if (!file.url.includes('cloudinary.com')) {
      console.log('[Proxy] URL externa (não-Cloudinary). Redirecionando para:', file.url)
      return NextResponse.redirect(file.url)
    }

    try {
      // Baixar o arquivo do Cloudinary
      const cloudinaryResponse = await fetch(file.url, {
        headers: {
          'User-Agent': 'OmniApp-Server/1.0'
        }
      })

      if (!cloudinaryResponse.ok) {
        console.error('Erro ao baixar do Cloudinary:', cloudinaryResponse.status, cloudinaryResponse.statusText)
        
        // Se der 401, tentar URL alternativa sem autenticação
        // Cloudinary às vezes aceita URLs diferentes
        const alternativeUrl = file.url
          .replace('/raw/upload/', '/image/upload/')
          .replace('/image/upload/', '/raw/upload/')
        
        const retryResponse = await fetch(alternativeUrl)
        if (!retryResponse.ok) {
          throw new Error(`Falha ao baixar arquivo: ${cloudinaryResponse.status}`)
        }
        
        // Se alternativa funcionou, usar ela
        const buffer = await retryResponse.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
            'Content-Disposition': `inline; filename="${file.name}"`,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      // Baixar o arquivo
      const buffer = await cloudinaryResponse.arrayBuffer()

      console.log('[Proxy] Arquivo baixado com sucesso. Size:', buffer.byteLength, 'bytes')

      // Retornar com headers corretos
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          'Content-Disposition': `inline; filename="${file.name}"`,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        }
      })
    } catch (fetchError) {
      console.error('[Proxy] Erro ao fazer proxy do arquivo:', fetchError)
      return NextResponse.json(
        { error: 'Erro ao carregar arquivo do storage' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Proxy] Erro geral:', error)
    console.error('Erro no proxy de PDF:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
