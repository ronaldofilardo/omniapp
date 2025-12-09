"use client";
import { Eye, FileText, Edit, Trash2, UploadCloud, Copy, Share2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { DeleteEventModal } from './DeleteEventModal'
import { ShareModal } from './ShareModal'
import { PDFViewerModal } from './PDFViewerModal'
import { formatTime } from '../lib/utils'
import { UploadProgressIndicator } from './ui/loading-states'
import { SLOT_FILE_LIMITS, getFileTooLargeError } from '@/lib/constants/fileLimits'

// Função para garantir formato YYYY-MM-DD
function formatDateForAPI(date: string | Date | undefined): string {
  if (!date) return ''

  let dateString: string

  // Se é um Date object, converte para YYYY-MM-DD
  if (date instanceof Date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    dateString = `${year}-${month}-${day}`
  }
  // Se é uma string ISO (contém T), extrai a parte da data
  else if (typeof date === 'string' && date.includes('T')) {
    dateString = date.split('T')[0]
  }
  // Se já está no formato YYYY-MM-DD, retorna como está
  else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    dateString = date
  }
  // Tenta fazer o parse como último recurso
  else {
    try {
      const parsed = new Date(date)
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear()
        const month = (parsed.getMonth() + 1).toString().padStart(2, '0')
        const day = parsed.getDate().toString().padStart(2, '0')
        dateString = `${year}-${month}-${day}`
      } else {
        return ''
      }
    } catch {
      return ''
    }
  }

  return dateString
}

// Função para garantir formato HH:mm
function formatTimeForAPI(time: string | Date | undefined): string {
  if (!time) return ''

  let timeString: string

  // Se é um Date object, extrai HH:mm
  if (time instanceof Date) {
    const hours = time.getHours().toString().padStart(2, '0')
    const minutes = time.getMinutes().toString().padStart(2, '0')
    timeString = `${hours}:${minutes}`
  }
  // Se é uma string ISO (contém T), extrai a parte do tempo
  else if (typeof time === 'string' && time.includes('T')) {
    try {
      const date = new Date(time)
      if (isNaN(date.getTime())) {
        return ''
      }
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      timeString = `${hours}:${minutes}`
    } catch {
      return ''
    }
  }
  // Se já é uma string, usa como está
  else {
    timeString = time
  }

  // Se já está no formato correto, retorna como está
  if (/^\d{2}:\d{2}$/.test(timeString)) return timeString
  // Se está no formato H:mm, adiciona zero à esquerda
  if (/^\d{1}:\d{2}$/.test(timeString)) return `0${timeString}`

  // Se não conseguiu formatar, retorna vazio (falhará na validação)
  return ''
}

const OutlineButton = ({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}) => (
  <button
    className="flex items-center gap-2 h-8 px-3 border border-[#10B981] rounded-md text-[#10B981] font-semibold text-[12px] bg-white hover:bg-[#10B981] hover:text-white transition-colors"
    style={{ minWidth: 0 }}
    onClick={(e) => {
      e.stopPropagation()
      if (onClick) onClick()
    }}
    type="button"
  >
    {icon} {children}
  </button>
)

interface FileSlot {
  type: string
  file: File | null
  status: 'empty' | 'pending' | 'uploaded'
  name: string
  url?: string // URL do arquivo persistido
}

import type { HealthEvent } from '../contexts/EventsContext'
interface EventCardProps {
  onUpdate?: (force?: boolean) => void
  event: HealthEvent
  professional: string
  address: string
  status?: 'past' | 'current' | 'future'
  onEdit?: () => void
  onDelete?: (deleteFiles: boolean) => void
  onView?: () => void
  onFiles?: () => void
  onShare?: () => void
}

// ...existing code...

interface FileSlot {
  id?: string // ID do arquivo no banco
  name: string
  type: string
  file: File | null
  status: 'empty' | 'uploaded' | 'pending'
  category: string
  url?: string // URL do arquivo persistido
}

const fileSlotTypes = [
  { label: 'Solicitação', category: 'request' },
  { label: 'Autorização', category: 'authorization' },
  { label: 'Atestado', category: 'certificate' },
  { label: 'Laudo/Resultado', category: 'result' },
  { label: 'Prescrição', category: 'prescription' },
  { label: 'Nota Fiscal', category: 'invoice' },
]

export function EventCard({
  event,
  professional,
  address,
  status,
  onEdit,
  onDelete,
  onView,
  onFiles,
  onShare,
  onUpdate,
}: EventCardProps) {
  const eventId = event.id
  const initialFiles = event.files ?? [];
  const title =
    event.type === 'CONSULTATION'
      ? 'Consulta'
      : event.type === 'EXAM'
        ? 'Exame'
        : event.type === 'PROCEDURE'
          ? 'Procedimento'
          : event.type === 'MEDICATION'
            ? 'Medicação'
            : event.type
  const time =
    event.startTime && event.endTime
      ? `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`
      : ''
  console.log('[EventCard] Event type:', event.type, 'Title:', title, 'Professional:', professional)
  console.log('[EventCard] Full title string:', `${title} - ${professional} - ${time}`)
  // Regra: se houver observation, mostrar; senão, mostrar description (que será 'Laudo enviado pelo app Omni' para eventos via laudo)
  const instructions = event.observation?.trim()
    ? event.observation
    : event.description || ''
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFilesModal, setShowFilesModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, { progress: number; status: 'uploading' | 'processing' | 'success' | 'error' }>>({})
  const [isUploading, setIsUploading] = useState(false)
  const filesMap =
    initialFiles.reduce(
      (map: Record<string, { id?: string; slot: string; name: string; url: string; physicalPath?: string; uploadDate?: string | null }>, file: { id?: string; slot: string; name: string; url: string; physicalPath?: string; uploadDate?: string | null }) => {
        map[file.slot] = file
        return map
      },
      {} as Record<string, { id?: string; slot: string; name: string; url: string; physicalPath?: string; uploadDate?: string | null }>
    )
  const [fileSlots, setFileSlots] = useState<FileSlot[]>(
    fileSlotTypes.map((type) => {
      const file = filesMap[type.category]
      return {
        id: file?.id,
        name: file?.name || '',
        type: type.label,
        file: null,
        status: file ? 'uploaded' : 'empty',
        category: type.category,
        url: file?.url || undefined,
      }
    })
  )

  // Sincronizar fileSlots quando event.files mudar
  useEffect(() => {
    console.log(`[EventCard] useEffect disparado para evento ${event.id}, files:`, event.files);

    const currentFiles = event.files ?? [];

    const currentFilesMap = currentFiles.reduce(
      (map: Record<string, { id?: string; slot: string; name: string; url: string; physicalPath?: string; uploadDate?: string | null }>, file: { id?: string; slot: string; name: string; url: string; physicalPath?: string; uploadDate?: string | null }) => {
        map[file.slot] = file
        return map
      },
      {} as Record<string, { id?: string; slot: string; name: string; url: string; physicalPath?: string; uploadDate?: string | null }>
    )

    const updatedSlots: FileSlot[] = fileSlotTypes.map((type) => {
      const file = currentFilesMap[type.category]
      return {
        id: file?.id,
        name: file?.name || '',
        type: type.label,
        file: null,
        status: file ? 'uploaded' : 'empty', // garante tipo
        category: type.category,
        url: file?.url || undefined,
      } as FileSlot
    })

    console.log(`[EventCard] Atualizando fileSlots para evento ${event.id}:`, updatedSlots);
    setFileSlots(updatedSlots)
  }, [event.files, event.id]) // Reagir a mudanças nos arquivos

  const [previewFile, setPreviewFile] = useState<{
    file: File | null
    type: string
    url?: string
  } | null>(null)
  
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean
    fileId: string
    fileName: string
    fileUrl: string
  }>({
    isOpen: false,
    fileId: '',
    fileName: '',
    fileUrl: ''
  })
  
  return (
    <>
      <div
        className={`w-[360px] h-[220px] bg-white rounded-xl shadow-[0_10px_15px_rgba(0,0,0,0.1)] border border-[#E5E7EB] flex flex-col justify-between ${status === 'past' ? 'opacity-60' : status === 'current' ? 'ring-2 ring-blue-500' : ''}`}
        style={{ padding: '20px' }}
      >
        {/* Título */}
        <div>
          <div className="font-bold text-[16px] text-[#111827] mb-2">
            {title} - {professional} - {time}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center text-[14px] text-[#6B7280]">
              <span className="mr-1">✋</span>
              {address}
              <button
                className="ml-2 text-[#6B7280] hover:text-[#10B981] transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(address)
                }}
                title="Copiar endereço"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[14px] font-semibold text-[#111827] cursor-pointer">
              Instruções: {instructions}
            </div>
          </div>
        </div>
        <div className="border-t border-[#E5E7EB] my-3"></div>
        {/* Botões */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 mb-2">
            <OutlineButton
              icon={<Eye className="w-4 h-4" />}
              onClick={() => setShowViewModal(true)}
            >
              Detalhes
            </OutlineButton>
            <OutlineButton
              icon={
                <FileText
                  className={`w-4 h-4 ${fileSlots.some((slot) => slot.file || slot.url) ? 'text-[#10B981]' : ''}`}
                />
              }
              onClick={() => setShowFilesModal(true)}
            >
              <span
                className={
                  fileSlots.some((slot) => slot.file || slot.url)
                    ? 'text-[#10B981] font-bold'
                    : ''
                }
              >
                Arquivos
              </span>
            </OutlineButton>
            <OutlineButton
              icon={<Share2 className="w-4 h-4" />}
              onClick={() => {
                setShowShareModal(true)
                onShare?.()
              }}
            >
              Compartilhar
            </OutlineButton>
          </div>
          <div className="flex gap-2">
            <OutlineButton icon={<Edit className="w-4 h-4" />} onClick={onEdit}>
              Editar
            </OutlineButton>
            <OutlineButton
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowDeleteModal(true)}
            >
              Deletar
            </OutlineButton>
          </div>
        </div>
      </div>

      {/* Modal de Visualização */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[400px] shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-[#111827]">{title}</h2>
            <div className="space-y-2 text-[#111827]">
              <p>
                <span className="font-semibold">Profissional:</span>{' '}
                {professional}
              </p>
              <p>
                <span className="font-semibold">Horário:</span> {time}
              </p>
              <p>
                <span className="font-semibold">Endereço:</span> {address}
                <button
                  className="ml-2 text-[#6B7280] hover:text-[#10B981] transition-colors"
                  onClick={() => navigator.clipboard.writeText(address)}
                  title="Copiar endereço"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </p>
              <p>
                <span className="font-semibold">Instruções:</span>{' '}
                {instructions}
              </p>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                className="px-6 py-2 bg-[#00FF00] text-white rounded-md font-semibold hover:bg-[#00DD00] transition-colors"
                onClick={() => setShowViewModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Deleção */}
      <DeleteEventModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={(deleteFiles) => {
          onDelete?.(deleteFiles)
          setShowDeleteModal(false)
        }}
        eventTitle={event.title}
      />

      {/* Modal de Arquivos */}
      {showFilesModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[800px] shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">
                Gerenciar Arquivos do Evento
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowFilesModal(false)}
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {fileSlots.map((slot, index) => (
                <div
                  key={slot.type}
                  className={`border rounded-lg p-4 transition-all duration-200 ${slot.file || slot.url ? 'bg-[#F0FFF4] border-[#10B981]' : 'bg-gray-50 border-gray-200'} shadow-sm`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`font-semibold ${slot.file || slot.url ? 'text-[#10B981]' : 'text-gray-400'}`}
                    >
                      {slot.type}
                    </span>
                    <div className="flex gap-2">
                      {(slot.file || slot.url) && (
                        <>
                          <button
                            title="Visualizar"
                            onClick={() => {
                              if (slot.url) {
                                // Para URLs de dados (base64), mostrar no modal de preview
                                if (slot.url.startsWith('data:')) {
                                  setPreviewFile({
                                    file: null as any,
                                    type: slot.type,
                                    url: slot.url,
                                  })
                                } else if (slot.id && (slot.url.includes('.pdf') || slot.name.toLowerCase().endsWith('.pdf'))) {
                                  // PDFs: usar visualizador modal definitivo
                                  setPdfViewer({
                                    isOpen: true,
                                    fileId: slot.id,
                                    fileName: slot.name,
                                    fileUrl: slot.url
                                  })
                                } else if (slot.id) {
                                  // Outros arquivos: usar API de download
                                  const downloadUrl = `/api/files/${slot.id}/download`
                                  window.open(downloadUrl, '_blank')
                                } else {
                                  // Fallback para URL direta
                                  window.open(slot.url, '_blank')
                                }
                              } else if (slot.file) {
                                setPreviewFile({
                                  file: slot.file,
                                  type: slot.type,
                                })
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 bg-white border border-blue-100 rounded p-1 shadow-sm"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Deletar"
                            onClick={async () => {
                              if (!window.confirm(`Deseja realmente deletar permanentemente o arquivo '${slot.name}'? Esta ação não pode ser desfeita.`)) return;

                              if (slot.id) {
                                // Arquivo persistido com ID - fazer hard delete via API
                                try {
                                  console.log(`[EventCard] Deletando arquivo ID: ${slot.id}, slot: ${slot.category}`);
                                  const res = await fetch(`/api/files/${slot.id}`, {
                                    method: 'DELETE',
                                  });

                                  if (res.ok) {
                                    console.log(`[EventCard] Arquivo deletado com sucesso: ${slot.name}`);
                                    
                                    // Atualiza lista local removendo o arquivo
                                    const newSlots = [...fileSlots]
                                    newSlots[index] = {
                                      ...slot,
                                      id: undefined,
                                      file: null,
                                      status: 'empty',
                                      name: '',
                                      url: undefined,
                                    }
                                    setFileSlots(newSlots)
                                    
                                    // NÃO fechar modal - deixar usuário ver mudanças e clicar em Concluir
                                    // Forçar refresh será feito ao clicar em Concluir
                                    alert('Arquivo deletado com sucesso! Clique em "Concluir" para salvar as alterações.');
                                  } else {
                                    const errorData = await res.json();
                                    throw new Error(errorData.error || 'Falha ao deletar arquivo');
                                  }
                                } catch (err) {
                                  console.error('[EventCard] Erro ao deletar arquivo:', err);
                                  alert('Erro ao deletar arquivo: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
                                }
                              } else {
                                // Arquivo local/pendente - apenas remover da UI
                                const newSlots = [...fileSlots]
                                newSlots[index] = {
                                  ...slot,
                                  file: null,
                                  status: 'empty',
                                  name: '',
                                  url: undefined,
                                }
                                setFileSlots(newSlots)
                              }
                            }}
                            className="text-red-600 hover:text-red-800 bg-white border border-red-100 rounded p-1 shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <label
                        className={`cursor-pointer ${slot.file || slot.url ? 'text-green-400 hover:text-green-600' : 'text-green-600 hover:text-green-800'} bg-white border border-green-100 rounded p-1 shadow-sm`}
                      >
                        <UploadCloud className="w-4 h-4" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              // Validação de tipo de arquivo (deve ser imagem ou PDF)
                              if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                                alert('Apenas arquivos de imagem ou PDFs são aceitos.')
                                return
                              }
                              // Validação de tamanho usando constantes centralizadas (2MB para todos os slots)
                              const maxSize = SLOT_FILE_LIMITS[slot.category as keyof typeof SLOT_FILE_LIMITS]
                              if (file.size > maxSize) {
                                alert(getFileTooLargeError(file.size, slot.category as keyof typeof SLOT_FILE_LIMITS))
                                return
                              }
                              const newSlots = [...fileSlots]
                              newSlots[index] = {
                                ...slot,
                                file,
                                status: 'pending',
                                name: file.name,
                              }
                              setFileSlots(newSlots)
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {(slot.file || slot.url) && (
                    <p className="text-sm text-[#10B981] truncate font-medium flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#10B981]" />
                      {slot.name}
                    </p>
                  )}
                  {!slot.file && !slot.url && (
                    <p className="text-sm text-gray-400 italic">
                      Nenhum arquivo
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            {/* Upload Progress Indicators */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Progresso do Upload</h4>
                {Object.entries(uploadProgress).map(([category, progress]) => {
                  const slot = fileSlots.find(s => s.category === category)
                  if (!slot || progress.status === 'success') return null
                  
                  return (
                    <UploadProgressIndicator
                      key={category}
                      fileName={slot.name}
                      progress={progress.progress}
                      status={progress.status}
                    />
                  )
                })}
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <button
                className="px-6 py-2 bg-[#10B981] text-white rounded-md font-semibold hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUploading}
                onClick={async () => {
                  if (eventId) {
                    setIsUploading(true)
                    const filesObjects: {
                      slot: string
                      name: string
                      url: string
                      physicalPath?: string
                      uploadDate?: Date
                    }[] = []
                    
                    // Upload dos arquivos pendentes
                    for (const slot of fileSlots) {
                      if (slot.file && slot.status === 'pending') {
                        // Iniciar progresso
                        setUploadProgress(prev => ({
                          ...prev,
                          [slot.category]: { progress: 0, status: 'uploading' }
                        }))
                        
                        const formData = new FormData()
                        formData.append('file', slot.file)
                        
                        try {
                          // Simular progresso durante upload
                          const progressInterval = setInterval(() => {
                            setUploadProgress(prev => {
                              const current = prev[slot.category]?.progress || 0
                              if (current < 90) {
                                return {
                                  ...prev,
                                  [slot.category]: { progress: current + 10, status: 'uploading' }
                                }
                              }
                              return prev
                            })
                          }, 100)
                          
                          const uploadResponse = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          })
                          
                          clearInterval(progressInterval)
                          
                          if (uploadResponse.ok) {
                            // Processamento
                            setUploadProgress(prev => ({
                              ...prev,
                              [slot.category]: { progress: 95, status: 'processing' }
                            }))
                            
                            const { url } = await uploadResponse.json()
                            filesObjects.push({
                              slot: slot.category,
                              name: slot.name,
                              url,
                              physicalPath: url,
                              uploadDate: new Date(),
                            })
                            
                            // Sucesso
                            setUploadProgress(prev => ({
                              ...prev,
                              [slot.category]: { progress: 100, status: 'success' }
                            }))
                            
                            // Atualizar o slot com a URL
                            const newSlots = [...fileSlots]
                            const idx = newSlots.findIndex(
                              (s) => s.category === slot.category
                            )
                            if (idx !== -1) {
                              newSlots[idx] = {
                                ...slot,
                                status: 'uploaded',
                                url,
                              }
                              setFileSlots(newSlots)
                            }
                          } else {
                            console.error(
                              'Erro no upload do arquivo:',
                              slot.name
                            )
                            setUploadProgress(prev => ({
                              ...prev,
                              [slot.category]: { progress: 0, status: 'error' }
                            }))
                          }
                        } catch (error) {
                          console.error('Erro no upload:', error)
                          setUploadProgress(prev => ({
                            ...prev,
                            [slot.category]: { progress: 0, status: 'error' }
                          }))
                        }
                      } else if (slot.url) {
                        // Arquivo já persistido
                        filesObjects.push({
                          slot: slot.category, // slot correto
                          name: slot.name,
                          url: slot.url,
                          physicalPath: slot.url,
                          uploadDate: new Date(),
                        })
                      }
                    }
                    try {
                      // Para atualização de arquivos, não enviar dados do evento para preservar data/horários originais
                      console.log('[EventCard] Atualizando apenas arquivos do evento:', event.id)
                      const response = await fetch('/api/events', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          id: event.id,
                          // Não enviar title, description, date, type, startTime, endTime, professionalId
                          // Apenas os arquivos para não modificar dados existentes do evento
                          files: filesObjects,
                        }),
                      })
                      if (response.ok) {
                        const updatedEvent = await response.json()
                        console.log('Evento atualizado com arquivos:', updatedEvent)

                        // Atualizar slots locais com as informações corretas da resposta (IDs e URLs)
                        if (updatedEvent.files) {
                          const updatedSlots = fileSlotTypes.map((type) => {
                            const file = updatedEvent.files?.find((f: any) => f.slot === type.category)
                            return {
                              id: file?.id,
                              name: file?.name || '',
                              type: type.label,
                              file: null,
                              status: file ? 'uploaded' : 'empty',
                              category: type.category,
                              url: file?.url || undefined,
                            } as FileSlot
                          })
                          setFileSlots(updatedSlots)
                        }

                        // Limpar progresso
                        setUploadProgress({})
                        setIsUploading(false)
                        setShowFilesModal(false)
                        
                        // Forçar refresh imediato para sincronizar com banco
                        if (onUpdate) {
                          await onUpdate(true)
                        }
                        window.location.reload() // Força reload completo para garantir sincronização
                      } else {
                        const errorText = await response.text()
                        console.error('Erro ao salvar arquivos:', errorText)
                        alert('Erro ao salvar arquivos. Tente novamente.')
                        setIsUploading(false)
                      }
                    } catch (error) {
                      console.error('Erro ao salvar arquivos:', error)
                      alert('Erro ao salvar arquivos. Tente novamente.')
                      setIsUploading(false)
                    }
                  } else {
                    // Fechar modal e forçar refresh mesmo sem novos uploads
                    // (pode ter havido deleções que já foram persistidas)
                    setShowFilesModal(false)
                    if (onUpdate) {
                      await onUpdate(true)
                    }
                    window.location.reload() // Força reload completo
                  }
                }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview de Arquivo */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{previewFile.type}</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setPreviewFile(null)}
              >
                ×
              </button>
            </div>
            {previewFile.url ? (
              // Para URLs
              previewFile.url.startsWith('data:image/') ? (
                // Base64 image
                <img
                  src={previewFile.url}
                  alt={previewFile.type}
                  className="max-h-[600px] object-contain"
                />
              ) : previewFile.url.includes('.pdf') || previewFile.url.toLowerCase().endsWith('.pdf') ? (
                // PDF via URL - Múltiplas estratégias de visualização
                <div className="w-full space-y-4">
                  {/* Opção 1: Tentar iframe com fallback */}
                  <iframe
                    src={previewFile.url}
                    className="w-full h-[600px] border rounded"
                    title={`PDF Preview: ${previewFile.type}`}
                    onError={(e) => {
                      console.error('Erro ao carregar PDF no iframe:', e)
                      // Esconder iframe se falhar
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {/* Opção 2: Link direto sempre disponível */}
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm text-gray-600">
                      Se o PDF não carregar acima, use as opções abaixo:
                    </p>
                    <div className="flex gap-3 justify-center">
                      <a
                        href={previewFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <Eye className="w-4 h-4" />
                        Abrir em Nova Aba
                      </a>
                      <a
                        href={previewFile.url}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        <FileText className="w-4 h-4" />
                        Baixar PDF
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                // Outros arquivos
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 mx-auto text-gray-400" />
                  <p className="mt-2">Arquivo: {previewFile.type}</p>
                  <a
                    href={previewFile.url}
                    download
                    className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Baixar Arquivo
                  </a>
                </div>
              )
            ) : previewFile.file ? (
              // Para arquivos locais
              previewFile.file.type.startsWith('image/') ? (
                <Image
                  src={URL.createObjectURL(previewFile.file)}
                  alt={previewFile.file.name}
                  className="max-h-[600px] object-contain"
                  width={800}
                  height={600}
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 mx-auto text-gray-400" />
                  <p className="mt-2">Arquivo PDF: {previewFile.file.name}</p>
                </div>
              )
            ) : null}
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

      {/* Modal de Compartilhamento */}
      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        event={event}
      />

      {/* Modal de Visualização de PDF */}
      <PDFViewerModal
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer({ ...pdfViewer, isOpen: false })}
        fileId={pdfViewer.fileId}
        fileName={pdfViewer.fileName}
        fileUrl={pdfViewer.fileUrl}
      />
    </>
  )
}
