import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { shareStore } from '@/lib/shareStore'
import os from 'os'

export async function POST(request: NextRequest) {
  try {
    const { eventId, fileUrls } = await request.json()

    if (!eventId || !fileUrls || !Array.isArray(fileUrls)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Gerar token único para o link
    const token = crypto.randomBytes(16).toString('hex')

    // Gerar código de acesso de 6 dígitos
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Armazenar temporariamente (expira em 24 horas)
    shareStore.set(token, {
      files: fileUrls,
      accessCode,
      used: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })


    // Obter o host dinamicamente da requisição
    let host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.nextUrl.protocol || 'http'

    // Para desenvolvimento, sempre usar IP da rede local para compatibilidade com mobile
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      // IP da rede local - pode ser configurado via variável de ambiente
      host = process.env.NEXT_PUBLIC_LOCAL_IP || ''
      if (!host) {
        // Detecta o IP local automaticamente
        const interfaces = os.networkInterfaces();
        let localIp = '';
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
              localIp = iface.address;
              break;
            }
          }
          if (localIp) break;
        }
        host = localIp ? `${localIp}:3000` : 'localhost:3000';
      }
    }

    // Link de compartilhamento usando host otimizado para mobile
    const shareLink = `${protocol}//${host}/shared/${token}`

    return NextResponse.json({
      shareLink,
      accessCode,
      token
    })

  } catch (error) {
    console.error('Erro ao gerar link de compartilhamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
