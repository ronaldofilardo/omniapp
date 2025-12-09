import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ViewEventModal } from '@/components/ViewEventModal'

describe('ViewEventModal mínimo', () => {
  it('não renderiza nada se event ou professional for null', () => {
    render(
      <ViewEventModal open={true} onOpenChange={() => {}} event={null} professional={null} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('não renderiza nada se event for null', () => {
    render(
      <ViewEventModal open={true} onOpenChange={() => {}} event={null} professional={{ id: '1', name: 'Teste', specialty: 'X' }} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('não renderiza nada se professional for null', () => {
    render(
      <ViewEventModal open={true} onOpenChange={() => {}} event={{ id: '1', title: 'T', date: '2025-10-28', type: 'CONSULTA', professionalId: '1' }} professional={null} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza o modal se ambos existirem', () => {
    render(
      <ViewEventModal open={true} onOpenChange={() => {}} event={{ id: '1', title: 'T', date: '2025-10-28', type: 'CONSULTA', professionalId: '1' }} professional={{ id: '1', name: 'Teste', specialty: 'X' }} />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

