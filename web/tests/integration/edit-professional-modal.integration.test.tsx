import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditProfessionalModal } from '../../src/components/EditProfessionalModal'
import { vi, describe, it, expect } from 'vitest'
import React from 'react'

// Mock fetch global
const specialtiesMock = ['Orto', 'Neurologia']

global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
  const urlStr = url.toString()
  
  if (urlStr.includes('type=specialties')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(specialtiesMock)
    } as Response)
  }
  
  if (urlStr.includes('/api/professionals')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'prof1',
        name: 'Teste Editado',
        specialty: 'Orto',
        address: '',
        contact: '',
        userId: 'user-1',
      })
    } as Response)
  }
  
  return Promise.reject(new Error('not implemented'))
})

describe('EditProfessionalModal - Integração', () => {
  it('deve atualizar a lista de especialidades ao renderizar com novas especialidades', async () => {
    const { rerender } = render(
      <EditProfessionalModal
        open={true}
        onOpenChange={() => {}}
        professional={{ id: 'prof1', name: 'Teste', specialty: '', address: '', contact: '' }}
        specialties={['Orto']}
        onSave={() => Promise.resolve()}
      />
    )

    // Localiza o combobox de especialidades e abre ele
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)

    // Aguarda o dropdown abrir e verifica se a especialidade inicial está disponível
    await waitFor(() => {
      expect(screen.getByText('Orto')).toBeInTheDocument()
    })

    // Re-renderiza com uma nova lista de especialidades
    rerender(
      <EditProfessionalModal
        open={true}
        onOpenChange={() => {}}
        professional={{ id: 'prof1', name: 'Teste', specialty: '', address: '', contact: '' }}
        specialties={['Nova Especialidade', 'Orto']}
        onSave={() => Promise.resolve()}
      />
    )

    // Abre o combobox novamente após a re-renderização
    fireEvent.click(selectTrigger)

    // Verifica se a nova especialidade foi adicionada à lista
    await waitFor(() => {
      expect(screen.getByText('Nova Especialidade')).toBeInTheDocument()
      expect(screen.getByText('Orto')).toBeInTheDocument()
    })
  })

  it('deve enviar userId no body ao salvar edição', async () => {
    const onSave = vi.fn().mockImplementation(() => Promise.resolve())
    render(
      <EditProfessionalModal
        open={true}
        onOpenChange={() => {}}
        professional={{ id: 'prof1', name: 'Teste', specialty: '', address: '', contact: '' }}
        specialties={specialtiesMock}
        onSave={onSave}
      />
    )
    // Preenche nome
    fireEvent.change(screen.getByPlaceholderText('Digite o nome...'), { target: { value: 'Teste Editado' } })
    // Seleciona especialidade
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
    })
    const option = await screen.findByText('Orto', {}, { container: document.body })
    fireEvent.click(option)
    // Salva
    fireEvent.click(screen.getByText('Salvar'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prof1',
          name: 'Teste Editado',
          specialty: 'Orto',
        })
      )
    })
  })

  it('deve permitir acesso ao combobox após adicionar especialidade via modal', async () => {
    render(
      <EditProfessionalModal
        open={true}
        onOpenChange={() => {}}
        professional={{ id: 'prof1', name: 'Teste', specialty: '', address: '', contact: '' }}
        specialties={['Orto']}
        onSave={() => Promise.resolve()}
      />
    )

    // Verifica que o combobox está acessível inicialmente
    const combobox = screen.getByRole('combobox')
    expect(combobox).toBeInTheDocument()

    // Clica no botão para adicionar nova especialidade
    fireEvent.click(screen.getByText('+ Adicionar nova especialidade'))

    // Aguarda o modal de adicionar especialidade abrir
    await waitFor(() => {
      expect(screen.getAllByText('Nome')).toHaveLength(2)
    })

    // Preenche o nome da especialidade
    const specialtyInputs = screen.getAllByPlaceholderText('Digite o nome...')
    const specialtyInput = specialtyInputs[1] // O segundo é do modal de adicionar especialidade
    fireEvent.change(specialtyInput, { target: { value: 'Cardiologia' } })

    // Clica em adicionar
    fireEvent.click(screen.getByText('Adicionar'))

    // Aguarda o modal de especialidade fechar
    await waitFor(() => {
      expect(screen.getAllByText('Nome')).toHaveLength(1)
    })

    // Verifica que o combobox ainda está acessível após fechar o modal
    expect(combobox).toBeInTheDocument()

    // Tenta abrir o combobox novamente
    fireEvent.click(combobox)

    // Verifica que o dropdown abre e contém a nova especialidade
    await waitFor(() => {
      expect(screen.getAllByText('Cardiologia')).toHaveLength(2) // Um no select trigger e outro no dropdown
      expect(screen.getByText('Orto')).toBeInTheDocument()
    })
  })
})
