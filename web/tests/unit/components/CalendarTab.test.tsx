// Mock global Date para garantir que currentDate seja 31/10/2025 nos testes
const MOCKED_DATE = new Date('2025-10-31T12:00:00Z')
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(MOCKED_DATE)
})
afterAll(() => {
  vi.useRealTimers()
})
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { CalendarTab } from '@/components/CalendarTab'

const professionals = [
  { id: '1', name: 'Dr. Teste', specialty: 'Cardio' },
]
const events = [
  { id: '1', title: 'Consulta', date: '2025-10-31', type: 'CONSULTATION', professionalId: '1', startTime: '10:00', endTime: '11:00' },
  { id: '2', title: 'Exame', date: '2025-10-30', type: 'EXAM', professionalId: '1', startTime: '12:00', endTime: '13:00' },
]

describe('CalendarTab', () => {
  it('filtra eventos por mês', () => {
    render(<CalendarTab events={events} professionals={professionals} onBackToTimeline={() => {}} />)
    // Os eventos devem aparecer formatados como "Consulta - Dr. Teste"
    expect(
      screen.getAllByText((content, node) => {
        const text = node?.textContent || ''
        return text.includes('Consulta - Dr. Teste')
      }).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText((content, node) => {
        const text = node?.textContent || ''
        return text.includes('Exame - Dr. Teste')
      }).length
    ).toBeGreaterThan(0)
  })

  it('filtra eventos por dia', () => {
    render(<CalendarTab events={events} professionals={professionals} onBackToTimeline={() => {}} />)
    fireEvent.click(screen.getByText('Dia'))
    // Por padrão, currentDate é hoje (31/10/2025), então só mostra evento desse dia
    expect(
      screen.getAllByText((content, node) => {
        const text = node?.textContent || ''
        return text.includes('Consulta - Dr. Teste')
      }).length
    ).toBeGreaterThan(0)
    expect(
      screen.queryAllByText((content, node) => {
        const text = node?.textContent || ''
        return text.includes('Exame - Dr. Teste')
      }).length
    ).toBe(0)
  })

  it('filtra eventos por semana', () => {
    render(<CalendarTab events={events} professionals={professionals} onBackToTimeline={() => {}} />)
    fireEvent.click(screen.getByText('Semana'))
    // Ambos eventos estão na mesma semana (30 e 31 de outubro)
    expect(
      screen.getAllByText((content, node) => {
        const text = node?.textContent || ''
        return text.includes('Consulta - Dr. Teste')
      }).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText((content, node) => {
        const text = node?.textContent || ''
        return text.includes('Exame - Dr. Teste')
      }).length
    ).toBeGreaterThan(0)
  })
})

