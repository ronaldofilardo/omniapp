import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logAuthEvent } from '@/lib/services/auditService'

// Função para capturar IP do cliente
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  
  return forwardedFor || realIP || remoteAddr || '127.0.0.1'
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      include: { emissorInfo: true },
    })

    // 1. Usuário não existe
    if (!user) {
      // Log de auditoria para falha de login
      await logAuthEvent({
        userEmail: normalizedEmail,
        action: 'LOGIN_FAILURE',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          reason: 'user_not_found',
          attemptedEmail: normalizedEmail
        }
      })
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // 2. BLOQUEIA LOGIN SE E-MAIL NÃO FOI VERIFICADO (exceto para e-mails de teste)
    if (!user.emailVerified && !['labor@omni.com', 'admin@omni.com'].includes(normalizedEmail)) {
      // Log de auditoria para falha por email não verificado
      await logAuthEvent({
        userId: user.id,
        userEmail: user.email,
        userCpf: user.cpf?.replace(/\D/g, ''),
        userName: user.name,
        action: 'LOGIN_FAILURE',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          reason: 'email_not_verified'
        }
      })
      return NextResponse.json(
        {
          error: 'Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada (e spam).',
        },
        { status: 403 } // 403 = Proibido (melhor que 401 aqui)
      )
    }

    // 3. Senha incorreta
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      // Log de auditoria para senha incorreta
      await logAuthEvent({
        userId: user.id,
        userEmail: user.email,
        userCpf: user.cpf?.replace(/\D/g, ''),
        userName: user.name,
        action: 'LOGIN_FAILURE',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          reason: 'invalid_password'
        }
      })
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // 4. Role não permitido
    const allowedRoles = ['RECEPTOR', 'EMISSOR', 'ADMIN'] as const
    if (!allowedRoles.includes(user.role as any)) {
      // Log de auditoria para role não permitido
      await logAuthEvent({
        userId: user.id,
        userEmail: user.email,
        userCpf: user.cpf?.replace(/\D/g, ''),
        userName: user.name,
        action: 'LOGIN_FAILURE',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          reason: 'unauthorized_role',
          userRole: user.role
        }
      })
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    // Tudo certo → cria sessão
    const { password: _, ...userWithoutPassword } = user
    const sessionValue = `${user.id}:${user.email}:${user.role}`
    const response = NextResponse.json({ user: userWithoutPassword }, { status: 200 })

    response.headers.set(
      'Set-Cookie',
      `kairos_imob_session=${sessionValue}; Path=/; HttpOnly; SameSite=Lax; Secure=${process.env.NODE_ENV === 'production'}`
    )

    // Log de auditoria para login bem-sucedido
    await logAuthEvent({
      userId: user.id,
      userEmail: user.email,
      userCpf: user.cpf?.replace(/\D/g, ''),
      userName: user.name,
      action: 'LOGIN_SUCCESS',
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        userRole: user.role,
        sessionCreated: true
      }
    })

    return response
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
