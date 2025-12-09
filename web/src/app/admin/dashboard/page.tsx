'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { UsersTab } from '@/components/UsersTab'
import { SkeletonMetricsCard, SkeletonTable } from '@/components/ui/loading-states'

interface AuditDocument {
  protocol: string | null
  patientName: string | null
  emitterName: string | null
  emitterCnpj: string | null
  createdAt: string
  fileName: string
  fileHash: string | null
  documentType: string | null
  status: string
  receiverCpf: string
  receivedAt: string
  dataVisualizacao?: string | null
  origin: string
}

interface Metrics {
  totalFiles: number
  uploadVolumeMB: number
  downloadVolumeMB: number
}

export default function AdminDashboard() {
  const [documents, setDocuments] = useState<AuditDocument[]>([])
  const [accessLogs, setAccessLogs] = useState<any[]>([])
  const [sharedFiles, setSharedFiles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'acessos' | 'recebidos' | 'compartilhados' | 'usuarios'>('recebidos')
  const router = useRouter()

  useEffect(() => {
    fetchDocuments()
    fetchAccessLogs()
    fetchSharedFiles()
    fetchUsers()
    fetchMetrics()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/audit-documents?filter=received&page=1&limit=100', {
        signal: AbortSignal.timeout(20000) // 20s timeout para admin
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar documentos')
      }

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao buscar documentos:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccessLogs = async () => {
    try {
      const response = await fetch('/api/admin/access-logs?page=1&limit=100', {
        signal: AbortSignal.timeout(20000)
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar logs de acesso')
      }

      const data = await response.json()
      setAccessLogs(data.logs || [])
    } catch (err) {
      console.error('Erro ao buscar logs de acesso:', err)
    }
  }

  const fetchSharedFiles = async () => {
    try {
      const response = await fetch('/api/admin/shared-files?page=1&limit=100', {
        signal: AbortSignal.timeout(20000)
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar arquivos compartilhados')
      }

      const data = await response.json()
      setSharedFiles(data.files || [])
    } catch (err) {
      console.error('Erro ao buscar arquivos compartilhados:', err)
    }
  }

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics')
      if (!response.ok) {
        throw new Error('Erro ao buscar métricas')
      }
      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      console.error('Erro ao buscar métricas:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?page=1&limit=100', {
        signal: AbortSignal.timeout(20000)
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar usuários')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Erro ao buscar usuários:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6]">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-2">
          <div className="max-w-[95%] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Logo Omni Saúde" className="h-8 w-auto" />
              <div>
                <h1 className="text-lg font-bold text-[#111827]">Dashboard do Administrador</h1>
                <p className="text-xs text-[#6B7280]">Gerenciamento do Sistema</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation Skeleton */}
        <div className="bg-white border-b border-[#E5E7EB]">
          <div className="max-w-[95%] mx-auto px-4">
            <div className="flex gap-1">
              <div className="h-12 w-24 bg-gray-200 rounded-t animate-pulse"></div>
              <div className="h-12 w-24 bg-gray-200 rounded-t animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Metrics Skeleton */}
        <div className="max-w-[95%] mx-auto px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SkeletonMetricsCard />
            <SkeletonMetricsCard />
            <SkeletonMetricsCard />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="max-w-[95%] mx-auto px-4 pb-3">
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="border-b border-[#E5E7EB] bg-white py-2 px-3">
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="bg-white p-0">
              <SkeletonTable rows={10} columns={10} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F3F4F6]">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Erro ao carregar dados</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDocuments}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header com identidade visual Timeline */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-2">
        <div className="max-w-[95%] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo Omni Saúde" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-[#111827]">Dashboard do Administrador</h1>
              <p className="text-xs text-[#6B7280]">Gerenciamento do Sistema</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] rounded-md bg-white text-[#111827] text-sm font-medium shadow-sm hover:bg-[#F9FAFB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
            type="button"
            aria-label="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[95%] mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('acessos')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'acessos'
                  ? 'text-[#10B981] border-b-2 border-[#10B981]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Acessos
            </button>
            <button
              onClick={() => setActiveTab('recebidos')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'recebidos'
                  ? 'text-[#10B981] border-b-2 border-[#10B981]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Recebidos
            </button>
            <button
              onClick={() => setActiveTab('compartilhados')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'compartilhados'
                  ? 'text-[#10B981] border-b-2 border-[#10B981]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Compartilhados
            </button>
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'usuarios'
                  ? 'text-[#10B981] border-b-2 border-[#10B981]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Usuários
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'acessos' && (
        <>
          {/* Conteúdo da aba Acessos */}
          <div className="max-w-[95%] mx-auto px-4 pb-3">
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="border-b border-[#E5E7EB] bg-white py-2 px-3">
                <CardTitle className="text-base font-semibold text-[#111827]">
                  Logs de Acesso dos Usuários
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Usuário</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Email</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Data/Hora</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">IP</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log, index) => (
                        <TableRow 
                          key={`${log.id || index}`}
                          className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                          }`}
                        >
                          <TableCell className="text-[#111827] font-medium text-xs py-1.5 px-2">
                            {log.userName || '—'}
                          </TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">{log.email || '—'}</TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}<br/>
                            {new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">{log.ip || '—'}</TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full
                              ${log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'failure' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'}`}>
                              {log.action === 'LOGIN_SUCCESS' ? 'Login' :
                               log.action === 'LOGIN_FAILURE' ? 'Falha' :
                               log.action === 'LOGOUT' ? 'Logout' :
                               log.action}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {accessLogs.length === 0 && (
                    <div className="text-center py-8 text-[#6B7280] text-sm">
                      Nenhum log de acesso encontrado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'recebidos' && (
        <>
          {/* Métricas */}
          <div className="max-w-[95%] mx-auto px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-[#E5E7EB] shadow-sm">
                <CardHeader className="border-b border-[#E5E7EB] bg-white py-2 px-3">
                  <CardTitle className="text-sm font-semibold text-[#111827]">
                    Total de Arquivos
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-white p-3">
                  <div className="text-2xl font-bold text-[#10B981]">
                    {metrics ? metrics.totalFiles : '...'}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E5E7EB] shadow-sm">
                <CardHeader className="border-b border-[#E5E7EB] bg-white py-2 px-3">
                  <CardTitle className="text-sm font-semibold text-[#111827]">
                    Volume de Upload (MB)
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-white p-3">
                  <div className="text-2xl font-bold text-[#3B82F6]">
                    {metrics ? metrics.uploadVolumeMB.toFixed(2) : '...'}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E5E7EB] shadow-sm">
                <CardHeader className="border-b border-[#E5E7EB] bg-white py-2 px-3">
                  <CardTitle className="text-sm font-semibold text-[#111827]">
                    Volume de Download (MB)
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-white p-3">
                  <div className="text-2xl font-bold text-[#F59E0B]">
                    {metrics ? metrics.downloadVolumeMB.toFixed(2) : '...'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="max-w-[95%] mx-auto px-4 pb-3">
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="border-b border-[#E5E7EB] bg-white py-2 px-3">
                <CardTitle className="text-base font-semibold text-[#111827]">
                  Arquivos Recebidos
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Protocolo/<br/>Documento</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Paciente</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Emissor</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Data<br/>Envio</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">tipo de<br/>documento</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">nome do<br/>arquivo</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">hash</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">receptor</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Data<br/>Recebimento</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Status de<br/>Entrega</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents
                        .filter(doc => doc.protocol && doc.protocol !== '—')
                        .map((doc, index) => (
                          <TableRow 
                            key={`${doc.protocol || 'no-protocol'}-${index}`}
                            className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                            }`}
                          >
                            <TableCell className="text-[#111827] font-medium text-xs py-1.5 px-2">
                              {doc.protocol || '—'}
                            </TableCell>
                            <TableCell className="text-[#374151] text-xs py-1.5 px-2">{doc.patientName || '—'}</TableCell>
                            <TableCell className="text-[#374151] text-xs py-1.5 px-2">{doc.emitterName || '—'}</TableCell>
                            <TableCell className="text-[#374151] text-xs py-1.5 px-2 whitespace-nowrap">
                              {new Date(doc.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}<br/>
                              {new Date(doc.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </TableCell>
                            <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                              {(() => {
                                const typeLabels: Record<string, string> = {
                                  request: 'Solicitação',
                                  authorization: 'Autorização',
                                  certificate: 'Atestado',
                                  result: 'Laudo/Resultado',
                                  prescription: 'Prescrição',
                                  invoice: 'Nota Fiscal'
                                };
                                return typeLabels[doc.documentType || 'result'] || 'Laudo/Resultado';
                              })()}
                            </TableCell>
                            <TableCell className="text-[#374151] text-xs py-1.5 px-2 max-w-[120px] truncate" title={doc.fileName}>
                              {doc.fileName}
                            </TableCell>
                            <TableCell className="text-[#374151] text-xs font-mono py-1.5 px-2 break-all" title={doc.fileHash || ''}>
                              {doc.fileHash || '—'}
                            </TableCell>
                            <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                              {doc.receiverCpf || '—'}
                            </TableCell>
                            <TableCell className="text-[#374151] text-xs py-1.5 px-2 whitespace-nowrap">
                              {doc.receivedAt
                                ? (<>
                                    {new Date(doc.receivedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}<br/>
                                    {new Date(doc.receivedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </>)
                                : '—'}
                            </TableCell>
                            <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full
                                ${doc.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                doc.status === 'DELIVERED' ? 'bg-yellow-100 text-yellow-800' :
                                doc.status === 'RECEIVED' ? 'bg-orange-100 text-orange-800' :
                                doc.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'}`}>
                                {doc.status === 'PROCESSING' ? 'Enviado' :
                                 doc.status === 'DELIVERED' ? 'Entregue' :
                                 doc.status === 'RECEIVED' ? 'Recebido' :
                                 doc.status === 'SUCCESS' ? 'Visualizado' :
                                 doc.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {documents.length === 0 && (
                    <div className="text-center py-8 text-[#6B7280] text-sm">
                      Nenhum documento encontrado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'compartilhados' && (
        <>
          {/* Conteúdo da aba Compartilhados */}
          <div className="max-w-[95%] mx-auto px-4 pb-3">
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="border-b border-[#E5E7EB] bg-white py-2 px-3">
                <CardTitle className="text-base font-semibold text-[#111827]">
                  Arquivos Compartilhados
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Timestamp</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Usuário</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Tipo de Arquivo</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Nome do Arquivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sharedFiles.map((file, index) => (
                        <TableRow 
                          key={`${file.id || index}`}
                          className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                          }`}
                        >
                          <TableCell className="text-[#111827] font-medium text-xs py-1.5 px-2 whitespace-nowrap">
                            {new Date(file.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}<br/>
                            {new Date(file.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">{file.userName || '—'}</TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">{file.fileType || '—'}</TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2 max-w-[200px] truncate" title={file.fileName}>
                            {file.fileName}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {sharedFiles.length === 0 && (
                    <div className="text-center py-8 text-[#6B7280] text-sm">
                      Nenhum arquivo compartilhado encontrado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'usuarios' && (
        <>
          {/* Conteúdo da aba Usuários */}
          <div className="max-w-[95%] mx-auto px-4 pb-3">
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="border-b border-[#E5E7EB] bg-white py-2 px-3">
                <CardTitle className="text-base font-semibold text-[#111827]">
                  Usuários do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Nome</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Email</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Documento</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Telefone</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Tipo</TableHead>
                        <TableHead className="text-[#111827] font-semibold text-xs py-2 px-2">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user, index) => (
                        <TableRow
                          key={user.id || index}
                          className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                          }`}
                        >
                          <TableCell className="text-[#111827] font-medium text-xs py-1.5 px-2">
                            {user.name || '—'}
                          </TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                            {user.cpf || '—'}
                          </TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                            {user.telefone || '—'}
                          </TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                            <Badge variant={user.role === 'ADMIN' ? 'default' : user.role === 'EMISSOR' ? 'secondary' : 'outline'} className="text-xs">
                              {user.role === 'ADMIN' ? 'Admin' : user.role === 'EMISSOR' ? 'Emissor' : 'Receptor'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#374151] text-xs py-1.5 px-2">
                            <Badge variant={user.emailVerified ? 'default' : 'destructive'} className="text-xs">
                              {user.emailVerified ? 'Verificado' : 'Pendente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {users.length === 0 && (
                    <div className="text-center py-8 text-[#6B7280] text-sm">
                      Nenhum usuário encontrado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}