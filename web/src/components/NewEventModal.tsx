import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { AddProfessionalModal } from './AddProfessionalModal'
import { useEventForm } from '@/hooks/useEventForm'
import { EventForm } from '@/components/EventForm'
import { useEvents } from '../contexts/EventsContext'

// Tipos
interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

interface NewEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export default function NewEventModal({
  open,
  onOpenChange,
  userId,
}: NewEventModalProps) {
  const [isAddProfessionalOpen, setIsAddProfessionalOpen] = useState(false)
  const { events, professionals, createEventOptimistic, fetchProfessionals } = useEvents()

  const {
    formState,
    errors,
    setErrors,
    professionalOptions,
    handleFieldChange,
    handleSubmit,
    setFormState,
    refreshEvents,
  } = useEventForm({
    professionals,
    userId,
    events,
    createEventOptimistic,
    onFormSubmitSuccess: () => {
      onOpenChange(false)
    },
  })

  const handleAddProfessional = async (data: {
    name: string
    specialty: string
    address: string
    contact: string
  }) => {
    try {
      const response = await fetch('/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId }),
      })
      if (!response.ok) throw new Error('Erro ao salvar profissional')

      const savedProfessional: Professional = await response.json()
      await fetchProfessionals() // Refresh professionals
      setFormState((prev) => ({
        ...prev,
        selectedProfessional: savedProfessional.id,
      }))
      setIsAddProfessionalOpen(false)
      // Atualizar eventos após adicionar profissional
      refreshEvents()
    } catch {
      alert('Erro ao salvar profissional. Tente novamente.')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    console.log('NewEventModal: handleOpenChange called with', newOpen)
    onOpenChange(newOpen)
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          console.log('Dialog onOpenChange called with', newOpen)
          handleOpenChange(newOpen)
        }}
      >
        <DialogContent className="max-w-[500px] p-0 gap-0 bg-gray-50 border-0 shadow-lg">
          <DialogHeader className="bg-gray-200 py-4 px-6 text-center rounded-t-lg">
            <DialogTitle className="sr-only">Novo Evento</DialogTitle>
            <DialogDescription className="sr-only">Crie um novo evento de saúde.</DialogDescription>
          </DialogHeader>
          <div className="text-gray-800 m-0 text-lg font-semibold mb-4">Novo Evento</div>

          <form onSubmit={handleSubmit}>
            <div className="bg-white m-6 p-6 rounded-lg shadow-sm">
              <EventForm
                formState={formState}
                errors={errors}
                professionalOptions={professionalOptions}
                handleFieldChange={handleFieldChange}
                onAddNewProfessional={() => setIsAddProfessionalOpen(true)}
              />
            </div>

            <DialogFooter className="px-6 pb-6">
              <Button
                type="submit"
                className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white"
              >
                Criar Evento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddProfessionalModal
        open={isAddProfessionalOpen}
        onOpenChange={setIsAddProfessionalOpen}
        onSave={handleAddProfessional}
      />
    </>
  )
}
