import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { withRLS } from '@/lib/middleware/rls'
import { v4 as uuidv4 } from 'uuid'
import { createJsonResponse } from '@/lib/json-serializer'
import { withPerformanceTracking } from '@/lib/middleware/performanceMiddleware'
import { cacheGetOrSet, cacheInvalidateByTag, getCacheKeyForUserProfessionals, CACHE_TTL } from '@/lib/cache/redisCache'

// Usuário padrão
const DEFAULT_USER_EMAIL = 'user@email.com'

async function getDefaultUserId() {
  const user = await prisma.user.findUnique({
    where: { email: DEFAULT_USER_EMAIL },
  })
  if (!user) throw new Error('Usuário padrão não encontrado.')
  return user.id
}

async function GET_SPECIALTIES() {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = user.id
    const professionals = await prisma.professional.findMany({
      where: { userId },
    })
    const specialties = Array.from(
      new Set(
        professionals
          .map((p) => p.specialty)
          .filter((s) => s && s !== 'A ser definido')
      )
    )
    return NextResponse.json(specialties)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = user.id
    const body = await req.json()
    const { id, name, specialty, address, contact } = body
    if (!id || !name || !specialty) {
      return NextResponse.json(
        { error: 'ID, nome e especialidade são obrigatórios.' },
        { status: 400 }
      )
    }
    const professional = await prisma.professional.update({
      where: {
        id,
        userId, // Garante que o profissional pertence ao usuário
      },
      data: { name, specialty, address, contact },
    })

    // Invalidar cache de professionals do usuário
    await cacheInvalidateByTag(`professionals:user:${userId}`);

    return createJsonResponse(professional, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Garante que a URL seja absoluta
  const url = request.url.startsWith('http') ? new URL(request.url) : new URL(request.url, 'http://localhost')
  const type = url.searchParams.get('type')

  if (type === 'specialties') {
    return GET_SPECIALTIES()
  }

  return withPerformanceTracking(async (request) => {
    try {
      const user = await auth()
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
      const userId = user.id

      // Cache key
      const cacheKey = getCacheKeyForUserProfessionals(userId);

      const { data: professionals, fromCache } = await cacheGetOrSet(
        cacheKey,
        async () => {
          return await prisma.professional.findMany({
            where: { userId },
          });
        },
        { ttl: CACHE_TTL.PROFESSIONALS }
      );

      const response = NextResponse.json(professionals);
      response.headers.set('X-Cache-Hit', fromCache ? 'true' : 'false');
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  })(request as NextRequest);
}

export async function POST(req: Request) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = user.id
    const body = await req.json()
    let { name, specialty, address, contact } = body
    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório.' },
        { status: 400 }
      )
    }
    if (!specialty) {
      specialty = 'A ser definido'
    }
    const professional = await prisma.professional.create({
      data: { name, specialty, address, contact, userId },
    })

    // Invalidar cache de professionals do usuário
    await cacheInvalidateByTag(`professionals:user:${userId}`);

    return createJsonResponse(professional, { status: 201 })
  } catch (error) {
    // Log detalhado para debug
    console.error('Erro ao criar profissional:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = user.id
    // Garante que a URL seja absoluta
    const url = req.url.startsWith('http') ? new URL(req.url) : new URL(req.url, 'http://localhost')
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'ID do profissional é obrigatório.' },
        { status: 400 }
      )
    }

    // Buscar o profissional para obter o nome
    const professional = await prisma.professional.findUnique({
      where: { id },
      include: { events: { include: { files: true } } }
    })
    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
    }

    // Para cada evento, mover arquivos para órfãos
    for (const event of professional.events) {
      for (const file of event.files) {
        await prisma.files.create({
          data: {
            id: uuidv4(),
            eventId: event.id,
            professionalId: null, // órfão
            slot: file.slot,
            name: file.name,
            url: file.url,
            physicalPath: file.physicalPath,
            uploadDate: file.uploadDate,
            expiryDate: file.expiryDate,
            isOrphaned: true,
            orphanedReason: `Profissional deletado: ${professional.name}`
          }
        })
      }
    }

    // Agora deletar o profissional (eventos e arquivos serão deletados, mas órfãos já foram preservados)
    await prisma.professional.delete({
      where: {
        id,
        userId,
      },
    })

    // Invalidar cache de professionals e events do usuário
    await Promise.all([
      cacheInvalidateByTag(`professionals:user:${userId}`),
      cacheInvalidateByTag(`events:user:${userId}`)
    ]);

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
