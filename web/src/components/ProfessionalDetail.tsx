'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { User, MapPin, Phone, Calendar, Edit, Trash2, Star } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatTime } from '../lib/utils'

interface HealthEvent {
  id: string
  title: string
  date: string
  type: string
  startTime: string
  endTime: string
}

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string | null
  contact?: string | null
  events: HealthEvent[]
  userId: string
}

interface ProfessionalDetailProps {
  professional: Professional
}

export default function ProfessionalDetail({ professional }: ProfessionalDetailProps) {
  const [isEditing, setIsEditing] = useState(false)

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR })
  }

  const getEventTypeColor = (type: string) => {
    const colors = {
      'CONSULTATION': 'bg-blue-100 text-blue-800',
      'EXAM': 'bg-green-100 text-green-800',
      'PROCEDURE': 'bg-red-100 text-red-800',
      'MEDICATION': 'bg-yellow-100 text-yellow-800',
      'OTHER': 'bg-gray-100 text-gray-800',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatEventType = (type: string) => {
    const types = {
      'CONSULTATION': 'Consulta',
      'EXAM': 'Exame',
      'PROCEDURE': 'Procedimento',
      'MEDICATION': 'Medicação',
      'OTHER': 'Outro',
    }
    return types[type as keyof typeof types] || type
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#111827]">{professional.name}</h1>
              <p className="text-[#6B7280] text-lg">{professional.specialty}</p>
            </div>
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
          {/* Informações do Profissional */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {professional.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#6B7280] mt-0.5" />
                    <div>
                      <p className="font-medium">Endereço</p>
                      <p className="text-[#6B7280] text-sm">{professional.address}</p>
                    </div>
                  </div>
                )}

                {professional.contact && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#6B7280]" />
                    <div>
                      <p className="font-medium">Contato</p>
                      <p className="text-[#6B7280] text-sm">{professional.contact}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">Avaliação</span>
                  </div>
                  <p className="text-[#6B7280] text-sm">4.8/5.0 (127 avaliações)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Eventos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Últimos Eventos ({professional.events.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {professional.events.length > 0 ? (
                  <div className="space-y-4">
                    {professional.events.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{event.title}</h4>
                            <Badge className={getEventTypeColor(event.type)}>
                              {formatEventType(event.type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#6B7280]">
                            <span>{formatDate(event.date)}</span>
                            <span>{event.startTime && event.endTime ? `${formatTime(event.startTime)} - ${formatTime(event.endTime)}` : 'Horário não definido'}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Ver Detalhes
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#6B7280]">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum evento registrado ainda.</p>
                  </div>
                )}

                {professional.events.length >= 10 && (
                  <div className="mt-6 text-center">
                    <Button variant="outline">
                      Ver Todos os Eventos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}