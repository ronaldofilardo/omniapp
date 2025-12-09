'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowLeft, Download } from 'lucide-react'
import { Button } from './ui/button'

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
  instructions?: boolean
}

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

interface CalendarTabProps {
  events: Event[]
  professionals: Professional[]
  onBackToTimeline: () => void
}

export function CalendarTab({
  events,
  professionals,
  onBackToTimeline,
}: CalendarTabProps) {
  console.log('[CalendarTab] Componente montado com:', {
    eventsCount: events?.length || 0,
    professionalsCount: professionals?.length || 0
  })

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month')

  // Get month name in Portuguese
  const getMonthName = (date: Date) => {
    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]
    return months[date.getMonth()]
  }

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    )
  }

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    )
  }

  // Get days for calendar grid
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: Array<{
      day: number
      isCurrentMonth: boolean
      isToday: boolean
    }> = []

    // Add previous month's days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: false,
      })
    }

    // Add current month's days
    const today = new Date()
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday =
        i === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      days.push({ day: i, isCurrentMonth: true, isToday })
    }

    // Add next month's days to complete the grid
    const remainingDays = 35 - days.length // 5 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, isToday: false })
    }

    return days
  }

  const days = getDaysInMonth()
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Funções auxiliares para comparar datas
  const isSameDay = (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // segunda como início
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date: Date) => {
    const start = getStartOfWeek(date);
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  };

  // Filtro de eventos conforme viewMode
  let filteredEvents: Event[] = [];
  if (viewMode === 'month') {
    filteredEvents = events.filter((event) => {
      if (!event?.date || typeof event.date !== 'string') return false;
      const [year, month] = event.date.split('-').map(Number);
      return (
        year === currentDate.getFullYear() && month === currentDate.getMonth() + 1
      );
    });
  } else if (viewMode === 'week') {
    const startOfWeek = getStartOfWeek(currentDate);
    const endOfWeek = getEndOfWeek(currentDate);
    filteredEvents = events.filter((event) => {
      if (!event?.date || typeof event.date !== 'string') return false;
      const [year, month, day] = event.date.split('-').map(Number);
      const eventDate = new Date(year, month - 1, day);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  } else if (viewMode === 'day') {
    filteredEvents = events.filter((event) => {
      const [year, month, day] = event.date.split('-').map(Number);
      const eventDate = new Date(year, month - 1, day);
      return isSameDay(eventDate, currentDate);
    });
  }

  // Format event for display
  const formatEventForDisplay = (event: Event) => {
    const professional = professionals.find(
      (p) => p.id === event.professionalId
    )
    
    // Formatar data: dd/mmm (ex: 15/dez)
    const [year, month, day] = event.date.split('-').map(Number);
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const formattedDate = `${String(day).padStart(2, '0')}/${monthNames[month - 1]}`;
    
    // Formatar horário: hh:mm - hh:mm
    const formatTime = (time: string) => {
      if (!time) return '';
      // Se já estiver no formato correto, retornar
      if (/^\d{2}:\d{2}$/.test(time)) return time;
      // Caso contrário, tentar extrair
      const match = time.match(/(\d{2}):(\d{2})/);
      return match ? `${match[1]}:${match[2]}` : time;
    };
    
    const formattedTime = event.startTime && event.endTime
      ? `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
      : '';

    return {
      id: event.id,
      title: `${event.type === 'CONSULTATION' ? 'Consulta' : event.type === 'EXAM' ? 'Exame' : event.type} - ${professional?.name || 'Profissional'}`,
      location: professional?.address || 'Endereço não informado',
      date: formattedDate,
      time: formattedTime,
      observation: event.description || '',
    }
  }

  return (
    <div className="flex-1 w-[1160px] relative bg-[#EDEFF1] h-screen overflow-auto" data-testid="calendar-tab">
      {/* Header */}
      <div className="px-8 pt-6 relative">
        {/* Back to Timeline */}
        <button
          onClick={onBackToTimeline}
          className="flex items-center gap-2 text-[#2D3748] text-[12px] mb-4 hover:text-[#1A202C]"
        >
          <ArrowLeft className="w-4 h-4 text-[#4A5568]" />
          <span>Voltar para a Timeline</span>
        </button>

        {/* Title - Centered */}
        <h1 className="text-[#1A202C] text-[20px] text-center absolute left-1/2 -translate-x-1/2 top-6 m-0">
          Calendário
        </h1>
      </div>

      {/* Main Content */}
      <div className="px-8 pt-12 flex gap-6">
        {/* Calendar Section - 70% */}
        <div className="flex-1 bg-white rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.1)] p-6">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={previousMonth}
              variant="ghost"
              size="icon"
              className="w-8 h-8 p-0"
            >
              <ChevronLeft className="w-4 h-4 text-[#4A5568]" />
            </Button>

            <h2 className="text-[#1A202C] text-[16px] m-0">
              {getMonthName(currentDate)} De {currentDate.getFullYear()}
            </h2>

            <Button
              onClick={nextMonth}
              variant="ghost"
              size="icon"
              className="w-8 h-8 p-0"
            >
              <ChevronRight className="w-4 h-4 text-[#4A5568]" />
            </Button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-[#2D3748] text-[12px] py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((dayObj, index) => {
              const isSelected =
                dayObj.isCurrentMonth &&
                currentDate.getDate() === dayObj.day &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();
              return (
                <div
                  key={index}
                  className={`
                    h-[60px] flex items-center justify-center text-[14px] rounded cursor-pointer
                    ${
                      isSelected
                        ? 'bg-[#3182CE] text-white'
                        : dayObj.isCurrentMonth
                          ? 'text-[#2D3748] hover:bg-gray-50'
                          : 'text-[#A0AEC0]'
                    }
                  `}
                  onClick={() => {
                    if (dayObj.isCurrentMonth) {
                      setCurrentDate(
                        new Date(currentDate.getFullYear(), currentDate.getMonth(), dayObj.day)
                      );
                    }
                  }}
                  style={{ userSelect: 'none' }}
                >
                  {dayObj.day}
                </div>
              );
            })}
          </div>

          {/* View Controls */}
          <div className="flex gap-2 justify-end mt-6">
            <Button
              onClick={() => setViewMode('day')}
              variant="outline"
              className={`
                w-20 h-8 text-[12px]
                ${
                  viewMode === 'day'
                    ? 'bg-[#38A169] text-white border-[#38A169] hover:bg-[#2F855A] hover:text-white'
                    : 'bg-white text-[#2D3748] border-[#E2E8F0] hover:bg-gray-50'
                }
              `}
            >
              Dia
            </Button>
            <Button
              onClick={() => setViewMode('week')}
              variant="outline"
              className={`
                w-20 h-8 text-[12px]
                ${
                  viewMode === 'week'
                    ? 'bg-[#38A169] text-white border-[#38A169] hover:bg-[#2F855A] hover:text-white'
                    : 'bg-white text-[#2D3748] border-[#E2E8F0] hover:bg-gray-50'
                }
              `}
            >
              Semana
            </Button>
            <Button
              onClick={() => setViewMode('month')}
              variant="outline"
              className={`
                w-20 h-8 text-[12px]
                ${
                  viewMode === 'month'
                    ? 'bg-[#38A169] text-white border-[#38A169] hover:bg-[#2F855A] hover:text-white'
                    : 'bg-white text-[#2D3748] border-[#E2E8F0] hover:bg-gray-50'
                }
              `}
            >
              Mês
            </Button>
          </div>
        </div>

        {/* Events Section - 25% */}
        <div className="w-64 bg-white rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.1)] p-4">
          {/* Events Header */}
          <div className="mb-4">
            <h3 className="text-[#1A202C] text-[16px] m-0 mb-3">
              Eventos - {getMonthName(currentDate)} De{' '}
              {currentDate.getFullYear()}
            </h3>
            <Button
              disabled
              className="w-full h-8 bg-[#38A169] hover:bg-[#2F855A] text-white text-[12px] rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>

          {/* Events List */}
          <div className="space-y-2">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const displayEvent = formatEventForDisplay(event)
                return (
                  <div
                    key={displayEvent.id}
                    className="bg-white border-t-2 border-[#38A169] p-3 rounded shadow-sm"
                  >
                    <h4 className="text-[#2D3748] text-[14px] m-0 mb-2">
                      {displayEvent.title}
                    </h4>
                    <div className="text-[#718096] text-[12px] space-y-1">
                      <p className="m-0">{displayEvent.location}</p>
                      <p className="m-0">
                        Data: {displayEvent.date}{displayEvent.time ? ` – ${displayEvent.time}` : ''}
                      </p>
                      <p className="m-0">
                        Observação: {displayEvent.observation || '—'}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center text-[#718096] py-10">
                <p className="m-0 text-[12px]">Nenhum evento neste período.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-10 pb-6">
        <p className="text-xs text-[#9CA3AF] m-0">© 2025 OmniSaúde</p>
      </div>
    </div>
  )
}
