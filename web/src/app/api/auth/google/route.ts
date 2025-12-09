import { NextRequest, NextResponse } from 'next/server'
import {
  initiateOAuthFlow,
  exchangeCodeForToken,
  getUserInfo,
  isOAuthProviderConfigured
} from '@/lib/auth-providers'

// Iniciar fluxo OAuth
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/auth/callback`

    if (!isOAuthProviderConfigured('google')) {
      return NextResponse.json({
        error: 'Google OAuth não está configurado no servidor'
      }, { status: 503 })
    }

    const authUrl = await initiateOAuthFlow('google', redirectUri)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Erro ao iniciar OAuth:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

// Callback do OAuth (POST com código de autorização)
export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json()

    if (!code) {
      return NextResponse.json({
        error: 'Código de autorização é obrigatório'
      }, { status: 400 })
    }

    // TODO: Implementar quando Google OAuth for ativado
    // Por enquanto, retorna erro indicando que não está implementado
    return NextResponse.json({
      error: 'Google OAuth será implementado em breve. Use login por email.',
      implemented: false
    }, { status: 501 })

    // Código futuro (quando implementado):
    /*
    const tokens = await exchangeCodeForToken('google', code, redirectUri)
    const userInfo = await getUserInfo('google', tokens.access_token)

    // Verificar se usuário existe ou criar novo
    // Gerar sessão
    // Retornar dados do usuário
    */

  } catch (error) {
    console.error('Erro no callback OAuth:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
