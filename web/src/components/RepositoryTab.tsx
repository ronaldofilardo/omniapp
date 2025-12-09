'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Eye, Trash2, UploadCloud, Info, Search } from 'lucide-react'
import { Input } from './ui/input'
import { format, toZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale/pt-BR'
import { FileSlotRepository } from './FileSlotRepository'
import { formatTime } from '../lib/utils'
import { SLOT_FILE_LIMITS, getFileTooLargeError } from '@/lib/constants/fileLimits'

// Tipos de dados
interface FileInfo {
  id: string
  slot: string
  name: string
  url?: string
  uploadDate?: string
  expiryDate?: string
}

interface Professional {
  id: string
  name: string
  specialty: string
}
interface EventWithFiles {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  files: FileInfo[]
  professional: Professional
}

// Componente para um único slot de arquivo
interface FileSlotProps {
  label: string;
  file?: FileInfo;
  eventId?: string;
  onUpload: (file: File) => void;
  onView: () => void;
  onDelete: () => void;
  formatFileDate: (dateString: string) => string;
}

function FileSlot({ label, file, eventId, onUpload, onView, onDelete, formatFileDate }: FileSlotProps) {
  const hasFile = !!file
  const inputRef = useRef<HTMLInputElement>(null)

  const handleIconClick = () => {
    if (inputRef.current) inputRef.current.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0])
      e.target.value = '' // permite novo upload do mesmo arquivo
    }
  }

  return (
    <div
      className={`grow flex items-center justify-between p-3 rounded-lg border ${hasFile ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span
          className={`font-medium ${hasFile ? 'text-emerald-800' : 'text-gray-500'}`}
        >
          {label}
        </span>
        {hasFile && (
          <div className="flex flex-col">
            <span className="text-sm text-emerald-700 truncate">
              ({file.name})
            </span>
            {file.uploadDate && (
              <span className="text-xs text-emerald-600">
                Upload: {formatFileDate(file.uploadDate)}
              </span>
            )}
            {file.expiryDate && (
              <span className="text-xs text-emerald-600">
                Validade: {formatFileDate(file.expiryDate)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {hasFile ? (
          <>
            <button
              onClick={onView}
              className="text-gray-500 hover:text-blue-600"
              title="Visualizar"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={async () => {
                if (!file || !file.id) return;
                if (!window.confirm(`Deseja realmente deletar permanentemente o arquivo '${file.name}'? Esta ação não pode ser desfeita.`)) return;
                try {
                  console.log(`[RepositoryTab FileSlot] Deletando arquivo ID: ${file.id}`);
                  // Usar API correta de hard delete
                  const res = await fetch(`/api/files/${file.id}`, {
                    method: 'DELETE',
                  });

                  if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Falha ao deletar arquivo');
                  }
                  
                  console.log(`[RepositoryTab FileSlot] Arquivo deletado com sucesso: ${file.name}`);
                  alert('Arquivo deletado com sucesso!');
                  onDelete();
                } catch (err) {
                  console.error('[RepositoryTab FileSlot] Erro ao deletar arquivo:', err);
                  alert(`Erro ao deletar arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}. Por favor, tente novamente.`);
                }
              }}
              className="text-gray-500 hover:text-red-600"
              title="Deletar"
            >
              <Trash2 size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleIconClick}
              className="text-gray-400 hover:text-blue-600"
              title="Upload"
              type="button"
            >
              <UploadCloud size={16} />
            </button>
            <input
              ref={inputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept="image/*,.pdf"
            />
          </>
        )}
      </div>
    </div>
  )
}

interface RepositoryTabProps {
  userId: string
}

export function RepositoryTab({ userId }: RepositoryTabProps) {
  console.log('[RepositoryTab] Componente montado com userId:', userId)
  console.log('[RepositoryTab] Props recebidas:', { userId })

  const [events, setEvents] = useState<EventWithFiles[]>([])
  const [orphanFiles, setOrphanFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentDateStr, setCurrentDateStr] = useState('')
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
  } | null>(null)
  useEffect(() => {
    setCurrentDateStr(format(new Date(), 'dd/MM/yyyy - EEEE', { locale: ptBR }))
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('[RepositoryTab] Iniciando fetch para userId:', userId)
        setLoading(true)
        
        const { globalCache } = await import('../lib/globalCache')
        
        // Fetch repository data with cache
        const repositoryData = await globalCache.fetchWithDeduplication(
          `repository_${userId}`,
          async () => {
            console.log('[RepositoryTab] Fetching repository from API')
            const response = await fetch(`/api/repository?userId=${encodeURIComponent(userId)}`)
            if (!response.ok) {
              throw new Error('Falha ao buscar dados do repositório')
            }
            return response.json()
          },
          {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000 // 10 minutes
          }
        )
        
        console.log('[RepositoryTab] Dados recebidos:', repositoryData)
        setEvents(Array.isArray(repositoryData) ? repositoryData : [])

        // Fetch orphan files with cache
        const orphanData = await globalCache.fetchWithDeduplication(
          `repository_orphan_${userId}`,
          async () => {
            console.log('[RepositoryTab] Fetching orphan files from API')
            const response = await fetch(`/api/repository/orphan-files?userId=${encodeURIComponent(userId)}`)
            if (!response.ok) {
              throw new Error('Falha ao buscar arquivos órfãos')
            }
            return response.json()
          },
          {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000 // 10 minutes
          }
        )
        
        setOrphanFiles(Array.isArray(orphanData) ? orphanData : [])
      } catch (error) {
        console.error('[RepositoryTab] Erro ao carregar repositório:', error)
        setEvents([])
        setOrphanFiles([])
      } finally {
        setLoading(false)
      }
    }
    if (userId) {
      fetchData()
    } else {
      console.warn('[RepositoryTab] userId não fornecido')
      setLoading(false)
    }
  }, [userId])

  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) return events
    const lowerCaseSearchTerm = searchTerm.toLowerCase()
    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        event.professional.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        event.files.some((file) =>
          file.name.toLowerCase().includes(lowerCaseSearchTerm)
        )
    )
  }, [events, searchTerm])

  const groupedEvents = useMemo(() => {
    const grouped = filteredEvents.reduce(
      (acc, event) => {
        const dateKey = event.date.split('T')[0]
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(event)
        return acc
      },
      {} as Record<string, EventWithFiles[]>
    )
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredEvents])

  const fileSummary = useMemo(() => {
    const counts: Record<string, number> = {}
    let total = 0
    events.forEach((event) => {
      event.files.forEach((file) => {
        total++
        const type = file.slot.charAt(0).toUpperCase() + file.slot.slice(1)
        counts[type] = (counts[type] || 0) + 1
      })
    })
    const summaryString = Object.entries(counts)
      .map(([type, count]) => `${count} ${type}(s)`)
      .join(' • ')
    return `Total: ${total} documento(s) (${summaryString})`
  }, [events])

  const formatDate = (dateString: string) => {
    const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone
    const date = toZonedTime(new Date(dateString + 'T12:00:00'), userTZ)
    return format(date, 'dd/MM/yyyy - EEEE', { locale: ptBR })
  }

  const formatFileDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  console.log('[RepositoryTab] Renderizando - Estado:', {
    userId,
    loading,
    eventsCount: events.length,
    filteredEventsCount: filteredEvents.length,
    searchTerm
  })

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-50" data-testid="repository-tab">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            Repositório de Arquivos
          </h1>
          <span className="text-gray-500">
            {currentDateStr}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <div className="grow bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-r-lg flex items-center gap-3">
            <Info size={20} className="text-blue-500" />
            <p className="font-medium">{fileSummary}</p>
          </div>
          <div className="relative w-72">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Buscar por evento, profissional ou arquivo..."
              className="pl-10 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main>
        {loading ? (
          <p className="text-center text-gray-500 mt-10">
            Carregando repositório...
          </p>
        ) : groupedEvents.length === 0 && orphanFiles.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">
            {searchTerm
              ? 'Nenhum resultado encontrado para sua busca.'
              : 'Nenhum arquivo encontrado no seu repositório.'}
          </p>
        ) : (
          <div className="space-y-8">
            {groupedEvents.map(([date, dayEvents]) => (
              <div key={date}>
                <h2 className="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b">
                  {formatDate(date)}
                </h2>
                <div className="space-y-6">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm p-6"
                    >
                      <h3 className="font-bold text-lg text-gray-800 mb-4">
                        {event.title} - {event.professional.name} [{event.professional.specialty}] - {event.startTime && event.endTime ? `${formatTime(event.startTime)}-${formatTime(event.endTime)}h` : 'Horário não definido'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['request','authorization','certificate','result','prescription','invoice'].map((slotType) => {
                          const file = event.files?.find((f) => f.slot === slotType)
                          const labels: Record<string, string> = {
                            request: 'Solicitação',
                            authorization: 'Autorização',
                            certificate: 'Atestado',
                            result: 'Laudo/Resultado',
                            prescription: 'Prescrição',
                            invoice: 'Nota Fiscal',
                          }
                          const hasFile = !!file
                          // Função de upload real
                          const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                            if (e.target.files && e.target.files[0]) {
                              try {
                                const selectedFile = e.target.files[0]
                                // Validação de tipo de arquivo (deve ser imagem ou PDF)
                                if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
                                  alert('Apenas arquivos de imagem ou PDFs são aceitos (PNG, JPG, JPEG, GIF, PDF, etc.)')
                                  return
                                }
                                // Validação de tamanho usando constantes centralizadas (2MB para todos os slots)
                                const maxSize = SLOT_FILE_LIMITS[slotType as keyof typeof SLOT_FILE_LIMITS]
                                if (selectedFile.size > maxSize) {
                                  alert(getFileTooLargeError(selectedFile.size, slotType as keyof typeof SLOT_FILE_LIMITS))
                                  return
                                }
                                const formData = new FormData()
                                formData.append('file', selectedFile)
                                formData.append('eventId', event.id)
                                formData.append('slot', slotType)
                                const res = await fetch('/api/upload-file', {
                                  method: 'POST',
                                  body: formData,
                                })
                                if (!res.ok) {
                                  const errorData = await res.json()
                                  throw new Error(errorData.error || 'Falha no upload')
                                }
                                const data = await res.json()
                                // Recarregar dados após upload
                                const response = await fetch(`/api/repository?userId=${encodeURIComponent(userId)}`);
                                if (response.ok) {
                                  const data = await response.json();
                                  setEvents(Array.isArray(data) ? data : []);
                                }
                              } catch (err) {
                                alert('Erro ao fazer upload: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
                              }
                              // Resetar input
                              e.target.value = ''
                            }
                          }
                          // Visualizar
                          const handleView = () => {
                            if (file && file.url) {
                              if (file.url.startsWith('data:')) {
                                setPreviewFile({ url: file.url, name: file.name })
                              } else {
                                window.open(file.url, '_blank')
                              }
                            }
                          }
                          // Deletar permanentemente (hard delete)
                          const handleDelete = async () => {
                            if (!file) return;
                            if (!window.confirm(`Deseja realmente deletar permanentemente o arquivo '${file.name}'? Esta ação não pode ser desfeita.`)) return;
                            try {
                              // Hard delete do arquivo
                              const res = await fetch(`/api/files/${file.id}`, {
                                method: 'DELETE',
                              });
                              if (!res.ok) {
                                const errorData = await res.json();
                                throw new Error(errorData.error || 'Falha ao deletar arquivo');
                              }
                              // Atualiza lista local removendo o arquivo do evento
                              const updatedFiles = event.files.filter((f) => f.id !== file.id);
                              setEvents((prev) => prev.map(ev =>
                                ev.id === event.id
                                  ? { ...ev, files: updatedFiles }
                                  : ev
                              ));
                            } catch (err) {
                              alert('Erro ao deletar arquivo: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
                            }
                          }
                          return (
                            <div
                              key={slotType}
                              className={`grow flex items-center justify-between p-3 rounded-lg border ${
                                hasFile ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className={`font-medium ${hasFile ? 'text-emerald-800' : 'text-gray-500'}`}> 
                                  {labels[slotType]}
                                </span>
                                {hasFile && (
                                  <span className="text-sm text-emerald-700 truncate">
                                    ({file.name})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {hasFile && (
                                  <>
                                    <button
                                      onClick={handleView}
                                      className="text-gray-500 hover:text-blue-600"
                                      title="Visualizar"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      onClick={handleDelete}
                                      className="text-gray-500 hover:text-red-600"
                                      title="Deletar"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                                <label title="Upload" className="text-gray-400 hover:text-blue-600 cursor-pointer">
                                  <UploadCloud size={16} />
                                  <input type="file" style={{ display: 'none' }} onChange={handleUpload} accept="image/*,.pdf" />
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Seção de Arquivos Órfãos */}
            {orphanFiles.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-orange-700 mb-4 pb-2 border-b border-orange-200">
                  Arquivos Órfãos ({orphanFiles.length})
                </h2>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <p className="text-orange-800 mb-4">
                    Estes arquivos foram preservados após a exclusão de profissionais ou eventos associados.
                    Você pode visualizá-los ou removê-los permanentemente.
                  </p>
                  <div className="space-y-3">
                    {orphanFiles.map((orphanFile) => (
                      <div
                        key={orphanFile.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-300"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-gray-800">
                            {orphanFile.name}
                          </span>
                          <span className="text-sm text-orange-600">
                            {orphanFile.orphanedReason || `Arquivo órfão - origem não identificada`}
                          </span>
                          {orphanFile.uploadDate && (
                            <span className="text-xs text-gray-500">
                              Upload: {formatFileDate(orphanFile.uploadDate)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (orphanFile.url) {
                                if (orphanFile.url.startsWith('data:')) {
                                  setPreviewFile({ url: orphanFile.url, name: orphanFile.name })
                                } else {
                                  window.open(orphanFile.url, '_blank')
                                }
                              }
                            }}
                            className="text-gray-500 hover:text-blue-600"
                            title="Visualizar"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Deseja realmente deletar permanentemente o arquivo órfão '${orphanFile.name}'?`)) return;
                              try {
                                const res = await fetch(`/api/repository/orphan-files?fileId=${encodeURIComponent(orphanFile.id)}&userId=${encodeURIComponent(userId)}`, {
                                  method: 'DELETE',
                                });
                                if (!res.ok) throw new Error('Falha ao deletar arquivo órfão');
                                setOrphanFiles(prev => prev.filter(f => f.id !== orphanFile.id));
                              } catch (err) {
                                alert('Erro ao deletar arquivo órfão: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
                              }
                            }}
                            className="text-gray-500 hover:text-red-600"
                            title="Deletar Permanentemente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Preview de Arquivo */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{previewFile.name}</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setPreviewFile(null)}
              >
                ×
              </button>
            </div>
            {previewFile.url.startsWith('data:image/') ? (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-h-[600px] object-contain"
              />
            ) : (
              <div className="text-center py-8">
                <Info className="w-16 h-16 mx-auto text-gray-400" />
                <p className="mt-2">Arquivo: {previewFile.name}</p>
                <a
                  href={previewFile.url}
                  download
                  className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Baixar Arquivo
                </a>
              </div>
            )}
            <div className="mt-4 text-center">
              <button
                className="px-6 py-2 bg-gray-500 text-white rounded-md font-semibold hover:bg-gray-600 transition-colors"
                onClick={() => setPreviewFile(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
