import { useMemo, useCallback, memo } from 'react'
import { format, toZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale/pt-BR'
import { EventCard } from './EventCard'
import type { HealthEvent } from '../contexts/EventsContext'

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

interface TimelineProps {
  onUpdate?: (force?: boolean) => void
  events: HealthEvent[]
  professionals: Professional[]
  onView?: (event: HealthEvent) => void
  onFiles?: (event: HealthEvent) => void
  onShare?: (event: HealthEvent) => void
  onEdit?: (event: HealthEvent) => void
  onDelete?: (event: HealthEvent, deleteFiles: boolean) => void
}

export const Timeline = memo(function Timeline({
  events,
  professionals,
  onView,
  onFiles,
  onShare,
  onEdit,
  onDelete,
  onUpdate,
}: TimelineProps) {
  console.log('[Timeline] Received events:', events)
  console.log('[Timeline] Received professionals:', professionals)

  const groupedEvents = useMemo(() => {
    console.log('[Timeline] Grouping events:', events.length, 'events')
    // Garante que a data está no formato yyyy-MM-dd para agrupamento
    const sortedEvents = [...events].sort((a, b) => {
      const aDate = a.date.length > 10 ? a.date.slice(0, 10) : a.date
      const bDate = b.date.length > 10 ? b.date.slice(0, 10) : b.date
      const [aYear, aMonth, aDay] = aDate.split('-').map(Number)
      const [bYear, bMonth, bDay] = bDate.split('-').map(Number)
      const aLocal = new Date(aYear, aMonth - 1, aDay).getTime()
      const bLocal = new Date(bYear, bMonth - 1, bDay).getTime()
      return bLocal - aLocal
    })
    const grouped = sortedEvents.reduce(
      (acc, event) => {
        const dateKey =
          event.date.length > 10 ? event.date.slice(0, 10) : event.date
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(event)
        return acc
      },
      {} as Record<string, HealthEvent[]>
    )
    const result = Object.entries(grouped)
    console.log('[Timeline] Grouped events:', result.length, 'groups')
    return result
  }, [events])

  const getEventStatus = useCallback(
    (
      eventDate: string,
      startTime?: string,
      endTime?: string
    ): 'past' | 'current' | 'future' => {
      const now = new Date()
      const [year, month, day] = eventDate.split('-').map(Number)
      const eventDateTime = new Date(year, month - 1, day)

      if (startTime && endTime) {
        const [startHour, startMinute] = startTime.split(':').map(Number)
        const [endHour, endMinute] = endTime.split(':').map(Number)

        const eventStart = new Date(
          year,
          month - 1,
          day,
          startHour,
          startMinute
        )
        const eventEnd = new Date(year, month - 1, day, endHour, endMinute)

        if (now >= eventStart && now <= eventEnd) {
          return 'current'
        } else if (now > eventEnd) {
          return 'past'
        }
      } else {
        const eventDay = new Date(year, month - 1, day)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        if (eventDay < today) {
          return 'past'
        } else if (eventDay.getTime() === today.getTime()) {
          return 'current'
        }
      }

      return 'future'
    },
    []
  )

  const formatDate = useCallback((dateString: string) => {
    // dateString: '2025-10-25' (local)
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return format(toZonedTime(date, 'America/Sao_Paulo'), 'dd/MM/yyyy - EEEE', {
      locale: ptBR,
    })
  }, [])

  return (
    <div className="relative max-w-4xl mx-auto px-4">
      {/* Vertical Line */}
      <div
        data-testid="timeline-line"
        className="absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-gray-300 h-full hidden md:block"
      ></div>

      {groupedEvents.map(([date, dayEvents], dayIndex) => (
        <div key={date} className="mb-12">
          {/* Day Header */}
          <div className="text-center mb-8">
            <h2
              data-testid="timeline-day-header"
              className="text-xl font-semibold text-[#111827]"
            >
              {formatDate(date)}
            </h2>
          </div>

          {/* Events for this day */}
          <div className="relative">
            {dayEvents.map((event, eventIndex) => {
              console.log('[Timeline] Rendering event:', event.id, event.title, 'professionalId:', event.professionalId)
              const professional = professionals.find(
                (p) => p.id === event.professionalId
              )
              let professionalName = professional ? professional.name : ''
              let professionalAddress = professional?.address || ''
              // Fallback: se não achou, tenta pegar do evento
              if (!professionalName) {
                professionalName = event.doctorName || event.professionalName || 'Profissional externo'
              }
              const status =
                event.status ||
                getEventStatus(event.date, event.startTime, event.endTime)
              const isLeft = eventIndex % 2 === 0

              return (
                <div
                  key={event.id}
                  className={`relative mb-8 ${isLeft ? 'pr-1/2' : 'pl-1/2'}`}
                >
                  {/* Timeline Dot */}
                  <div
                    data-testid="timeline-dot"
                    className={`absolute top-6 ${isLeft ? 'right-0' : 'left-0'} w-4 h-4 rounded-full bg-white border-4 border-gray-300 transform ${isLeft ? 'translate-x-1/2' : '-translate-x-1/2'} z-10 hidden md:block`}
                  ></div>

                  {/* Event Card */}
                  <div
                    className={`flex justify-center md:${isLeft ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      data-testid="timeline-event-card"
                      className={`${isLeft ? 'mr-4 md:mr-8' : 'ml-4 md:ml-8'} w-full max-w-[360px]`}
                    >
                      <EventCard
                        onUpdate={onUpdate}
                        event={event}
                        professional={professionalName}
                        address={professionalAddress}
                        status={status}
                        onView={() => onView?.(event)}
                        onFiles={() => onFiles?.(event)}
                        onShare={() => onShare?.(event)}
                        onEdit={() => onEdit?.(event)}
                        onDelete={(deleteFiles) =>
                          onDelete?.(event, deleteFiles)
                        }
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
})
