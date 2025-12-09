import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from './ui/button'
import { formatTime } from '../lib/utils'

interface Event {
  id: string
  title: string
  description?: string
  date: string
  type: string
  professionalId: string
  startTime?: string
  endTime?: string
  observation?: string
}

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

interface ViewEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event | null
  professional: Professional | null
}

export function ViewEventModal({
  open,
  onOpenChange,
  event,
  professional,
}: ViewEventModalProps) {
  if (!event || !professional) {
    return null
  }

  // Forçar desmontagem completa quando event ou professional são null
  // Usando uma key única baseada nos IDs para garantir que o componente seja completamente desmontado
  const key = event?.id && professional?.id ? `${event.id}-${professional.id}` : null

  if (!key) {
    return null
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      CONSULTATION: 'Consulta',
      EXAM: 'Exame',
      PROCEDURE: 'Procedimento',
      MEDICATION: 'Medicação',
      OTHER: 'Outro',
    }
    return types[type] || type
  }

  return (
    <Dialog key={key} open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[500px] p-0 gap-0 bg-[#F5F5F5] border-0 shadow-lg overflow-hidden"
        aria-describedby="view-event-description"
      >
        {/* Descrição oculta para acessibilidade */}
        <VisuallyHidden>
          <DialogDescription />
        </VisuallyHidden>
        <VisuallyHidden>
          <DialogTitle>Detalhes do Evento</DialogTitle>
        </VisuallyHidden>
        <DialogDescription id="view-event-description" className="sr-only">
          Detalhes do Evento
        </DialogDescription>
        <div className="bg-[#E5E7EB] py-4 px-6 text-center">
          <span className="sr-only">
            <DialogTitle id="view-event-title">Detalhes do Evento</DialogTitle>
          </span>
          <h2 className="text-[#1F2937] m-0">Detalhes do Evento</h2>
        </div>
        <div className="bg-white mx-6 my-6 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-[#374151] text-sm font-semibold block">
                Tipo de Evento
              </label>
              <p className="text-[#6B7280]">{getEventTypeLabel(event.type)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[#374151] text-sm font-semibold block">
                Profissional
              </label>
              <p className="text-[#6B7280]">
                {professional.name} - {professional.specialty}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[#374151] text-sm font-semibold block">
                Data
              </label>
              <p className="text-[#6B7280]">{formatDate(event.date)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[#374151] text-sm font-semibold block">
                Horários
              </label>
              <p className="text-[#6B7280]">
                {event.startTime && event.endTime ? `${formatTime(event.startTime)} - ${formatTime(event.endTime)}` : 'Horário não definido'}
              </p>
            </div>
            {event.observation && (
              <div className="space-y-2">
                <label className="text-[#374151] text-sm font-semibold block">
                  Observação
                </label>
                <p className="text-[#6B7280]">{event.observation}</p>
              </div>
            )}
          </div>
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-[#00FF00] hover:bg-[#00DD00] text-black font-semibold px-6"
            >
              OK
            </Button>
          </div>
        </div>
        <div className="text-center pb-4 text-xs text-[#9CA3AF]">
          © 2025 Omni Saúde
        </div>
      </DialogContent>
    </Dialog>
  )
}
