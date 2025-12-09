import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Bloquear acesso a /share/ para prevenir conflito com arquivos estáticos
  if (pathname.startsWith('/share/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Bypass total para qualquer rota que sirva arquivos ou downloads
  if (
    pathname.startsWith('/api/files/download') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/api/laudos/upload') ||
    pathname.startsWith('/api/upload-file')
  ) {
    // Deixa passar direto, sem tocar em cookies/sessão/autenticação
    return NextResponse.next()
  }

  const user = await auth()

  const adminPaths = ['/admin']
  const emissorPaths = ['/laudos', '/relatorios']
  const receptorPaths = ['/calendar', '/dadospessoais', '/notifications', '/professionals', '/repository', '/timeline']

  if (adminPaths.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else if (emissorPaths.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (user.role !== 'EMISSOR') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else if (receptorPaths.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (user.email === 'labor@omni.com' || user.role === 'EMISSOR') {
      return NextResponse.redirect(new URL('/laudos', request.url))
    }
    if (user.role !== 'RECEPTOR') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Qualquer outra rota continua com a lógica normal
  return NextResponse.next()
}

export const config = {
  matcher: '/',
}