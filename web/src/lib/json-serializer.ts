import { NextResponse } from 'next/server'

/**
 * Converte objetos do Prisma para JSON serializável
 * Remove tipos problemáticos como Date, BigInt, etc.
 */
export function serializePrismaObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (obj instanceof Date) {
    return obj.toISOString() as T
  }

  if (typeof obj === 'bigint') {
    return obj.toString() as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializePrismaObject(item)) as T
  }

  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializePrismaObject(value)
    }
    return serialized as T
  }

  return obj
}

/**
 * Cria uma resposta JSON Next.js com objeto Prisma serializado
 * Usa JSON.stringify/parse para forçar a serialização completa
 */
export function createJsonResponse<T>(
  data: T, 
  options?: { status?: number; headers?: Record<string, string> }
) {
  // Serializa completamente usando JSON.stringify/parse para remover tipos não-JSON
  const serialized = JSON.parse(JSON.stringify(data, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString()
    }
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return value
  }))
  
  return NextResponse.json(serialized, {
    status: options?.status || 200,
    headers: options?.headers,
  })
}
