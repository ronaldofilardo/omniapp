import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { withRLS } from '@/lib/middleware/rls'
import { NextResponse, NextRequest } from 'next/server'
import { withPerformanceTracking } from '@/lib/middleware/performanceMiddleware'
import { cacheGetOrSet, cacheInvalidateByTag, CACHE_TTL } from '@/lib/cache/redisCache'

// GET /api/reports - Listar laudos (enviados ou recebidos, dependendo do tipo de usuário)
export async function GET(request: NextRequest) {
  return withPerformanceTracking(async (request) => {
    return withRLS(request, async (request) => {
    try {
      const user = await auth()
      if (!user) {
        console.log('[GET /api/reports] Usuário não autenticado')
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }

      const url = request.url.startsWith('http') ? new URL(request.url) : new URL(request.url, 'http://localhost')
      const searchParams = url.searchParams
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '10')
      const skip = (page - 1) * limit

      const where = user.role === 'EMISSOR'
        ? { senderId: user.id }
        : { receiverId: user.id }

      console.log('[GET /api/reports] user:', user)
      console.log('[GET /api/reports] where:', where)
      console.log('[GET /api/reports] page:', page, 'limit:', limit, 'skip:', skip)

      // Cache key baseado em userId, role e paginação
      const cacheKey = `reports:user:${user.id}:role:${user.role}:page:${page}:limit:${limit}`;

      const { data: cachedData, fromCache } = await cacheGetOrSet(
        cacheKey,
        async () => {
          const reports = await prisma.report.findMany({
            where,
            include: {
              sender: {
                select: {
                  name: true,
                  emissorInfo: true
                }
              },
              receiver: {
                select: {
                  name: true,
                  cpf: true
                }
              },
              notification: {
                select: {
                  id: true,
                  status: true
                }
              }
            },
            orderBy: {
              sentAt: 'desc'
            },
            skip,
            take: limit
          });

          const total = await prisma.report.count({ where });

          return {
            reports,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit)
            }
          };
        },
        { ttl: CACHE_TTL.REPORTS }
      );

      const { reports: rawReports, pagination } = cachedData;

      // Buscar fileHash do audit log para cada report
      const reports = await Promise.all(
        rawReports.map(async (report) => {
          const auditEntry = await prisma.auditLog.findFirst({
            where: {
              protocol: report.protocol
            },
            select: {
              fileHash: true
            }
          });
          return {
            ...report,
            fileHash: auditEntry?.fileHash || null
          };
        })
      );

      console.log('[GET /api/reports] reports encontrados:', reports.length)
      if (reports.length > 0) {
        console.log('[GET /api/reports] Primeiro report:', JSON.stringify(reports[0], null, 2))
      }

      console.log('[GET /api/reports] total:', pagination.total)

      const response = NextResponse.json({
        reports,
        pagination
      });
      response.headers.set('X-Cache-Hit', fromCache ? 'true' : 'false');
      return response;
    } catch (error) {
      console.error('[GET] /api/reports:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar laudos' },
        { status: 500 }
      )
    }
    });
  })(request);
}

// POST /api/reports - Criar novo laudo (apenas para emissores)
export async function POST(request: Request) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é um emissor
    if (user.role !== 'EMISSOR') {
      return NextResponse.json(
        { error: 'Apenas emissores podem enviar laudos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, fileName, fileUrl, receiverId } = body

    // Gerar número de protocolo único (ANO + sequencial)
    const currentYear = new Date().getFullYear()
    const lastReport = await prisma.report.findFirst({
      where: {
        protocol: {
          startsWith: currentYear.toString()
        }
      },
      orderBy: {
        protocol: 'desc'
      }
    })

    let sequence = 1
    if (lastReport) {
      sequence = parseInt(lastReport.protocol.split('-')[1]) + 1
    }
    const protocol = `${currentYear}-${sequence.toString().padStart(5, '0')}`

    // Criar o laudo
    const report = await prisma.report.create({
      data: {
        protocol,
        title,
        fileName,
        fileUrl,
        senderId: user.id,
        receiverId,
        status: 'SENT'
      },
      include: {
        sender: {
          select: {
            name: true,
            emissorInfo: true
          }
        },
        receiver: {
          select: {
            name: true,
            cpf: true
          }
        }
      }
    })

    // Criar notificação para o receptor
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'LAB_RESULT',
        payload: {
          reportId: report.id,
          title: report.title,
          protocol: report.protocol
        },
        status: 'UNREAD'
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('[POST] /api/reports:', error)
    return NextResponse.json(
      { error: 'Erro ao criar laudo' },
      { status: 500 }
    )
  }
}

