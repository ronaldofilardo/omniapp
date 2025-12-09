'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Calendar, Clock, User, FileText, Edit, Trash2, Share2, Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logFileShare } from '@/lib/services/auditService'

interface Professional {
  id: string
  name: string
  specialty: string
}

interface Event {
  id: string
  title: string
  description?: string | null
  date: string
  type: string
  startTime?: string
  endTime?: string
  observation?: string
  instructions?: boolean
  professional: Professional
  files?: any
  userId: string
  professionalId: string
}

interface EventDetailProps {
  event: Event
}

export default function EventDetail({ event }: EventDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [isGeneratingShare, setIsGeneratingShare] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  const generateShareLink = async () => {
    if (!event.files || !Array.isArray(event.files) || event.files.length === 0) {
      alert('Este evento não possui arquivos para compartilhar.')
      return
    }

    setIsGeneratingShare(true)
    try {
      // Extrair URLs dos arquivos
      const fileUrls = event.files.map((file: any) => file.url || file)

      const response = await fetch('/api/share/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          fileUrls,
        }),
      })

      const data = await response.json()

      if (data.shareLink) {
        setShareLink(data.shareLink)
        setShareCode(data.accessCode)

        // Registrar o compartilhamento no audit log
        await logFileShare({
          userId: event.userId,
          userCpf: '', // Será preenchido se disponível
          userName: null, // Será preenchido se disponível
          eventId: event.id,
          fileCount: fileUrls.length,
          shareToken: data.token,
          shareLink: data.shareLink,
          ip: '', // Será obtido do cliente
          userAgent: navigator.userAgent,
        })
      } else {
        alert('Erro ao gerar link de compartilhamento: ' + (data.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao gerar link:', error)
      alert('Erro ao gerar link de compartilhamento.')
    } finally {
      setIsGeneratingShare(false)
    }
  }

  const copyToClipboard = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink)
        setCopiedToClipboard(true)
        setTimeout(() => setCopiedToClipboard(false), 2000)
      } catch (error) {
        // Fallback para browsers antigos
        const textArea = document.createElement('textarea')
        textArea.value = shareLink
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopiedToClipboard(true)
        setTimeout(() => setCopiedToClipboard(false), 2000)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }

  const getEventTypeColor = (type: string) => {
    const colors = {
      'consulta': 'bg-blue-100 text-blue-800',
      'exame': 'bg-green-100 text-green-800',
      'cirurgia': 'bg-red-100 text-red-800',
      'retorno': 'bg-yellow-100 text-yellow-800',
      'emergencia': 'bg-red-100 text-red-800',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">{event.title}</h1>
            <p className="text-[#6B7280] mt-2">
              <Calendar className="inline w-4 h-4 mr-2" />
              {formatDate(event.date)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Button>
            <Button
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Detalhes do Evento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getEventTypeColor(event.type)}>
                    {event.type}
                  </Badge>
                </div>

                {event.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Descrição</h4>
                    <p className="text-[#6B7280]">{event.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {event.startTime && event.endTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#6B7280]" />
                      <span className="text-sm">
                        {event.startTime} - {event.endTime}
                      </span>
                    </div>
                  )}
                </div>

                {event.observation && (
                  <div>
                    <h4 className="font-semibold mb-2">Observações</h4>
                    <p className="text-[#6B7280]">{event.observation}</p>
                  </div>
                )}

                {event.instructions && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Instruções especiais necessárias
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Arquivos */}
            {event.files && Array.isArray(event.files) && event.files.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Anexos</CardTitle>
                    <Button
                      variant="outline"
                      onClick={generateShareLink}
                      disabled={isGeneratingShare}
                      className="flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      {isGeneratingShare ? 'Gerando...' : 'Gerar Link de Compartilhamento'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {event.files.map((file: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{file.name || `Arquivo ${index + 1}`}</span>
                        <Button variant="outline" size="sm">
                          Visualizar
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Link de Compartilhamento */}
            {shareLink && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Link de Compartilhamento Gerado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Link de Acesso:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={shareLink}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                        />
                        <Button
                          variant="outline"
                          onClick={copyToClipboard}
                          className="flex items-center gap-2"
                        >
                          {copiedToClipboard ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {shareCode && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Código de Acesso:
                        </label>
                        <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                          <span className="text-lg font-mono font-bold text-yellow-800">
                            {shareCode}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Este código é necessário para acessar os arquivos. Compartilhe-o separadamente do link.
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      O link expira em 24 horas e pode ser usado apenas uma vez.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Informações do Profissional */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profissional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold">{event.professional.name}</h4>
                    <p className="text-[#6B7280] text-sm">{event.professional.specialty}</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    Ver Perfil Completo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}