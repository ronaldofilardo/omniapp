import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CalendarTab } from '@/components/CalendarTab'

const professionals = [
  { id: '1', name: 'Dr. Teste', specialty: 'Cardio' },
]
const events = [
  { id: '1', title: 'Consulta', date: '2025-12-09', type: 'CONSULTATION', professionalId: '1', startTime: '10:00', endTime: '11:00' },
  { id: '2', title: 'Exame', date: '2025-12-10', type: 'EXAM', professionalId: '1', startTime: '12:00', endTime: '13:00' },
]

describe('CalendarTab', () => {
  it('renderiza o calendário', () => {
    render(<CalendarTab events={events} professionals={professionals} onBackToTimeline={() => {}} />)
    // Verifica que o componente renderiza sem erros
    expect(screen.getByText('Calendário')).toBeInTheDocument()
    expect(screen.getByTestId('calendar-tab')).toBeInTheDocument()
  })
})

