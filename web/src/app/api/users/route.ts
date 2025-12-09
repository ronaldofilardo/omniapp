import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { withRLS, withAdminRLS } from '@/lib/middleware/rls'
import { withErrorHandler } from '@/lib/errors'
import { ForbiddenError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  return withRLS(request, withErrorHandler(async (request) => {
    const user = await auth()

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenError('Acesso não autorizado')
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const where = role ? { role: role as any } : {}

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        cpf: true,
        telefone: true,
        emissorInfo: {
          select: {
            clinicName: true,
            cnpj: true,
            address: true,
            contact: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ users })
  }));
}
