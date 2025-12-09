import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await auth()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    // Get file count
    const totalFiles = await prisma.files.count({
      where: { isOrphaned: false }
    })

    // Get metrics
    const metrics = await prisma.adminMetrics.findUnique({
      where: { id: 'singleton' }
    })

    const totalUploadBytes = metrics?.totalUploadBytes || BigInt(0)
    const totalDownloadBytes = metrics?.totalDownloadBytes || BigInt(0)

    // Convert to MB
    const uploadMB = Number(totalUploadBytes) / (1024 * 1024)
    const downloadMB = Number(totalDownloadBytes) / (1024 * 1024)

    return NextResponse.json({
      totalFiles,
      uploadVolumeMB: uploadMB,
      downloadVolumeMB: downloadMB
    })
  } catch (error) {
    console.error('Erro ao buscar métricas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
