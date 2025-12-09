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

    // Buscar logs de autenticação da tabela AuditLog
    const authLogs = await prisma.auditLog.findMany({
      where: {
        documentType: 'auth',
        action: {
          in: ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT']
        }
      },
      select: {
        id: true,
        action: true,
        patientName: true, // userName
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit,
    })

    // Formatar os logs para o formato esperado pelo frontend
    const formattedLogs = authLogs.map(log => ({
      id: log.id,
      userName: log.patientName || 'Usuário',
      email: (log.metadata && typeof log.metadata === 'object' && 'userEmail' in log.metadata) ? log.metadata.userEmail as string : 'N/A',
      action: log.action,
      ip: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      status: log.action === 'LOGIN_SUCCESS' ? 'success' :
              log.action === 'LOGIN_FAILURE' ? 'failure' : 'logout'
    }))

    // Contar total de logs
    const total = await prisma.auditLog.count({
      where: {
        documentType: 'auth_event',
        action: {
          in: ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT']
        }
      }
    })

    return NextResponse.json({
      logs: formattedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erro ao buscar logs de acesso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}