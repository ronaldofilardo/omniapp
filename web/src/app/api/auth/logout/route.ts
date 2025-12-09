import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAuthEvent } from '@/lib/services/auditService';
import { prisma } from '@/lib/prisma';

// Função para capturar IP do cliente
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  
  return forwardedFor || realIP || remoteAddr || '127.0.0.1'
}

export async function POST(request: NextRequest) {
  try {
    // Capturar informações do usuário antes de fazer logout
    const user = await auth();
    
    if (user) {
      // Buscar dados completos do usuário no banco
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, name: true, cpf: true }
      });
      
      if (fullUser) {
        // Log de auditoria para logout
        await logAuthEvent({
          userId: fullUser.id,
          userEmail: fullUser.email,
          userCpf: fullUser.cpf?.replace(/\D/g, ''),
          userName: fullUser.name,
          action: 'LOGOUT',
          ip: getClientIP(request),
          userAgent: request.headers.get('user-agent'),
          metadata: {
            sessionTerminated: true
          }
        });
      }
    }
    
    // Remove o cookie de autenticação
    return NextResponse.json({}, {
      status: 200,
      headers: {
        'Set-Cookie': 'kairos_imob_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
      },
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    // Mesmo com erro, remove o cookie
    return NextResponse.json({}, {
      status: 200,
      headers: {
        'Set-Cookie': 'kairos_imob_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
      },
    });
  }
}
