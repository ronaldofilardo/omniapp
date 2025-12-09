import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AuditLogPage({ searchParams }: { searchParams: any }) {
  const user = await auth()
  if (!user || user.role !== 'ADMIN') {
    redirect('/login')
  }

  const page = Number(searchParams.page) || 1
  const take = 25
  const skip = (page - 1) * take

  const where: any = {}
  if (searchParams.origin) where.origin = searchParams.origin
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.cpf) where.receiverCpf = { contains: searchParams.cpf.replace(/\D/g, '') }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ])

  const origins = ['API_EXTERNA', 'PORTAL_PUBLICO', 'PORTAL_LOGADO']
  const statuses = ['SUCCESS', 'USER_NOT_FOUND', 'VALIDATION_ERROR', 'SERVER_ERROR', 'PROCESSING']
  const totalPages = Math.ceil(total / take)

  return (
    <div className="p-8 max-w-[1800px] mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Audit Log Completo</h1>
      <p className="text-gray-600 mb-6">
        Registro de todas as entradas de documentos no sistema: API externa, portal público e uploads de pacientes logados.
      </p>

      <div className="bg-white rounded-lg shadow-lg">
        {/* Filtros */}
        <div className="p-4 border-b flex flex-wrap gap-4 items-center bg-gray-50">
          <form method="get" className="flex flex-wrap gap-4 items-center w-full">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">CPF Receptor</label>
              <input 
                type="text" 
                name="cpf"
                placeholder="000.000.000-00" 
                defaultValue={searchParams.cpf || ''} 
                className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Origem</label>
              <select name="origin" className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" defaultValue={searchParams.origin || ''}>
                <option value="">Todas</option>
                {origins.map(o => (
                  <option key={o} value={o}>
                    {o.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Status</label>
              <select name="status" className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" defaultValue={searchParams.status || ''}>
                <option value="">Todos</option>
                {statuses.map(s => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
              >
                Filtrar
              </button>
            </div>

            {(searchParams.cpf || searchParams.origin || searchParams.status) && (
              <div className="flex items-end">
                <a 
                  href="/admin/audit-log"
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors font-medium"
                >
                  Limpar
                </a>
              </div>
            )}
          </form>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700">CNPJ Emissor</th>
                <th className="px-4 py-3 font-semibold text-gray-700">CPF Receptor</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Origem</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Protocolo</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Arquivo</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Hash SHA-256</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Paciente</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Envio</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Processamento</th>
                <th className="px-4 py-3 font-semibold text-gray-700">IP</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800">{log.emitterCnpj || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">{log.receiverCpf}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.origin === 'PORTAL_PUBLICO' ? 'bg-orange-100 text-orange-800' :
                        log.origin === 'API_EXTERNA' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {log.origin.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{log.protocol || '—'}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-[200px] truncate" title={log.fileName}>
                      {log.fileName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[150px] truncate" title={log.fileHash || ''}>
                      {log.fileHash ? `${log.fileHash.substring(0, 8)}...${log.fileHash.substring(log.fileHash.length - 8)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{log.patientName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(log.createdAt.toISOString())}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(log.receivedAt.toISOString())}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{log.ipAddress}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 
                        log.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {log.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-between items-center bg-gray-50">
            <div className="text-sm text-gray-600">
              Mostrando {skip + 1} a {Math.min(skip + take, total)} de {total} registros
            </div>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/admin/audit-log?page=${page - 1}${searchParams.origin ? `&origin=${searchParams.origin}` : ''}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.cpf ? `&cpf=${searchParams.cpf}` : ''}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Anterior
                </a>
              )}
              <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`/admin/audit-log?page=${page + 1}${searchParams.origin ? `&origin=${searchParams.origin}` : ''}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.cpf ? `&cpf=${searchParams.cpf}` : ''}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Próxima
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
