import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timeline } from '@/components/Timeline'

describe('Timeline', () => {
  const mockProfessionals = [
    {
      id: 'prof1',
      name: 'Dr. Test',
      specialty: 'Especialidade Test',
      address: 'Endereço Test',
      contact: 'Contato Test'
    }
  ]


  it('deve renderizar a timeline vazia', () => {
    render(<Timeline events={[]} professionals={mockProfessionals} />)
    // Não deve renderizar nenhum card de evento
    expect(screen.queryByTestId('timeline-event-card')).not.toBeInTheDocument()
  })


  it('deve renderizar eventos corretamente', () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Consulta Test',
        date: '2025-10-26',
        startTime: '10:00',
        endTime: '11:00',
        type: 'CONSULTATION',
        professionalId: 'prof1',
        files: []
      }
    ]

    render(<Timeline 
      events={mockEvents} 
      professionals={mockProfessionals}
      onView={() => {}}
      onFiles={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
      onUpdate={() => {}}
    />)
    // O título renderizado é 'Consulta - Dr. Test - 10:00 - 11:00'
    expect(screen.getByText('Consulta - Dr. Test - 10:00 - 11:00')).toBeInTheDocument()
  })
})

