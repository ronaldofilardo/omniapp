import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação e autorização
    const user = await auth()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMISSOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Para emissores, buscar o CNPJ para filtrar dados
    let emitterCnpjFilter: string | null = null
    if (user.role === 'EMISSOR') {
      const emissorInfo = await prisma.emissorInfo.findUnique({
        where: { userId: user.id },
        select: { cnpj: true }
      })
      if (!emissorInfo?.cnpj) {
        return NextResponse.json({ error: 'Emissor info not found' }, { status: 404 })
      }
      emitterCnpjFilter = emissorInfo.cnpj
    }

    // Extrair parâmetros de query
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') // 'received' para filtrar apenas recebidos via API externa

    // Buscar todos os logs de auditoria, agrupados por protocolo
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        ...(emitterCnpjFilter ? { emitterCnpj: emitterCnpjFilter } : {}),
        ...(filter === 'received' ? { origin: 'API_EXTERNA' } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limitar a 100 registros mais recentes
    })

    // Buscar também da tabela Report (para documentos antigos sem auditoria)
    const reports = await prisma.report.findMany({
      where: emitterCnpjFilter ? { sender: { emissorInfo: { cnpj: emitterCnpjFilter } } } : {},
      orderBy: {
        sentAt: 'desc',
      },
      take: 100,
      include: {
        sender: {
          include: {
            emissorInfo: true
          }
        },
        receiver: true
      }
    })

    // Buscar todos os arquivos enviados para tentar obter o hash
    const files = await prisma.files.findMany({
      select: {
        name: true,
        fileHash: true
      }
    })

    // Buscar todos os emissores para mapear CNPJ -> Nome
    const emissores = await prisma.emissorInfo.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    const cnpjToNameMap = new Map<string, string>()
    emissores.forEach(emissor => {
      if (emissor.cnpj) {
        cnpjToNameMap.set(emissor.cnpj, emissor.user.name || emissor.clinicName || emissor.user.email)
      }
    })

    // Criar mapa Protocolo -> Nome do Emissor a partir dos Reports
    const protocolToEmitterMap = new Map<string, { name: string, cnpj: string | null }>()
    reports.forEach(report => {
      if (report.protocol) {
        const emitterName = report.sender.name || report.sender.emissorInfo?.clinicName || report.sender.email
        const emitterCnpj = report.sender.emissorInfo?.cnpj || null
        protocolToEmitterMap.set(report.protocol, { name: emitterName, cnpj: emitterCnpj })
      }
    })

    // Agrupar por protocolo e pegar o mais recente de cada grupo
    const documentsMap = new Map<string, any>()

    // Primeiro processar os reports (prioridade para status operacional)
    reports.forEach(report => {
      const key = report.protocol || `no-protocol-${report.id}`
      if (!documentsMap.has(key)) {
        // Inferir tipo de documento do título
        let documentType = 'result' // padrão laudo
        if (report.title) {
          if (report.title.toLowerCase().includes('nota fiscal')) documentType = 'invoice'
          else if (report.title.toLowerCase().includes('autorização')) documentType = 'authorization'
          else if (report.title.toLowerCase().includes('atestado')) documentType = 'certificate'
          else if (report.title.toLowerCase().includes('prescrição')) documentType = 'prescription'
          else if (report.title.toLowerCase().includes('solicitação')) documentType = 'request'
        }

        // Procurar hash do arquivo pelo nome
        const fileMatch = files.find(f => f.name === report.fileName)
        const fileHash = fileMatch?.fileHash || null

        documentsMap.set(key, {
          protocol: report.protocol,
          patientName: report.receiver.name,
          emitterName: report.sender.name || report.sender.emissorInfo?.clinicName || null,
          emitterCnpj: report.sender.emissorInfo?.cnpj || null,
          createdAt: report.sentAt.toISOString(),
          fileName: report.fileName,
          fileHash: fileHash,
          documentType: documentType,
          status: report.status === 'VIEWED' ? 'SUCCESS' :
                  report.status === 'RECEIVED' ? 'RECEIVED' :
                  report.status === 'DELIVERED' ? 'DELIVERED' :
                  report.status === 'SENT' ? 'PROCESSING' :
                  report.status,
          receiverCpf: report.receiver.cpf,
          receivedAt: report.receivedAt?.toISOString(),
          dataVisualizacao: null,
          origin: 'PORTAL_EMISSOR', // Reports são do portal do emissor
        })
      }
    })

    // Depois adicionar/enriquecer com dados do audit log (para auditoria, não sobrescrever status)
    auditLogs.forEach(log => {
      const key = log.protocol || `no-protocol-${log.id}`
      const existing = documentsMap.get(key)

      if (existing) {
        // Se já existe um report, apenas enriquecer com dados do audit log (não sobrescrever status)
        if (!existing.fileHash && log.fileHash) {
          existing.fileHash = log.fileHash
        }
        if (!existing.dataVisualizacao && log.receivedAt) {
          existing.dataVisualizacao = log.receivedAt.toISOString()
        }
      } else if (log.protocol && !documentsMap.has(key)) {
        // Só criar entrada se não existir report
        // Tentar buscar emissor pelo protocolo primeiro
        let emitterName = null
        let emitterCnpj = log.emitterCnpj
        if (log.protocol && protocolToEmitterMap.has(log.protocol)) {
          const emitter = protocolToEmitterMap.get(log.protocol)!
          emitterName = emitter.name
          emitterCnpj = emitter.cnpj || emitterCnpj
        } else if (log.emitterCnpj) {
          emitterName = cnpjToNameMap.get(log.emitterCnpj) || null
        }

        documentsMap.set(key, {
          protocol: log.protocol,
          patientName: log.patientName,
          emitterName: emitterName,
          emitterCnpj: emitterCnpj,
          createdAt: log.createdAt.toISOString(),
          fileName: log.fileName,
          fileHash: log.fileHash,
          documentType: log.documentType || 'result',
          status: log.status, // Para logs sem report, usar status do audit
          receiverCpf: log.receiverCpf,
          receivedAt: log.createdAt.toISOString(),
          dataVisualizacao: null,
          origin: log.origin,
        })
      } else if (!log.protocol && !documentsMap.has(key)) {
        // Logs sem protocolo são tratados como documentos separados
        documentsMap.set(key, {
          protocol: null,
          patientName: log.patientName,
          emitterName: null,
          emitterCnpj: log.emitterCnpj,
          createdAt: log.createdAt.toISOString(),
          fileName: log.fileName,
          fileHash: log.fileHash,
          documentType: log.documentType || 'result',
          status: log.status,
          receiverCpf: log.receiverCpf,
          receivedAt: log.createdAt.toISOString(),
          dataVisualizacao: null,
          origin: log.origin,
        })
      }
    })


    const documents = Array.from(documentsMap.values())

    return NextResponse.json({
      documents,
      total: documents.length,
    })
  } catch (error) {
    console.error('Erro ao buscar documentos de auditoria:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar documentos de auditoria' },
      { status: 500 }
    )
  }
}
