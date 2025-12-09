import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from './ui/button'
import { AddProfessionalModal } from './AddProfessionalModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { useEditEventForm } from '@/hooks/useEditEventForm'
import { EventTypeSelect } from './edit-event/EventTypeSelect'
import { InstructionsCheckbox } from './edit-event/InstructionsCheckbox'
import { ProfessionalSelect } from './edit-event/ProfessionalSelect'
import { DateInput } from './edit-event/DateInput'
import { TimeInputs } from './edit-event/TimeInputs'
import { ObservationTextarea } from './edit-event/ObservationTextarea'

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

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

interface EditEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event | null
  professionals: Professional[]
  setProfessionals: React.Dispatch<React.SetStateAction<Professional[]>>
  onSave: (updatedEvent: Event) => void
}

export default function EditEventModal({
  open,
  onOpenChange,
  event,
  professionals,
  setProfessionals,
  onSave,
}: EditEventModalProps) {
  const [isAddProfessionalOpen, setIsAddProfessionalOpen] = useState(false)
  const [shouldReopenEventModal, setShouldReopenEventModal] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  const {
    formState,
    errors,
    professionalOptions,
    handleFieldChange,
    handleSubmit,
    resetForm,
  } = useEditEventForm({
    event,
    professionals,
    onSave,
    onClose: () => onOpenChange(false),
  })

  // Função para adicionar profissional e selecionar automaticamente
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
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Erro ao salvar profissional')
      const savedProfessional: Professional = await response.json()
      setProfessionals((prev) => [...prev, savedProfessional])
      handleFieldChange('selectedProfessional', savedProfessional.id)
      setIsAddProfessionalOpen(false)
      setShouldReopenEventModal(true)
    } catch {
      alert('Erro ao salvar profissional. Tente novamente.')
    }
  }

  // Efeito para reabrir o modal de evento após salvar profissional
  useEffect(() => {
    if (shouldReopenEventModal) {
      onOpenChange(true)
      setShouldReopenEventModal(false)
    }
  }, [shouldReopenEventModal, onOpenChange])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowConfirmClose(true)
    } else {
      resetForm()
      onOpenChange(newOpen)
    }
  }

  const confirmClose = () => {
    setShowConfirmClose(false)
    setShouldReopenEventModal(false)
    resetForm()
    onOpenChange(false)
  }

  const cancelClose = () => {
    setShowConfirmClose(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-[500px] p-0 gap-0 bg-[#F5F5F5] border-0 shadow-lg overflow-hidden"
        >
          <DialogHeader className="bg-[#E5E7EB] py-4 px-6">
            <DialogTitle id="edit-event-title" className="text-lg leading-none font-semibold text-[#1F2937] m-0 text-center">
              Editar Evento
            </DialogTitle>
            <DialogDescription className="sr-only">
              Editar informações do evento
            </DialogDescription>
          </DialogHeader>
          <div className="bg-white mx-6 my-6 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <EventTypeSelect
                value={formState.eventType}
                onValueChange={(value) => handleFieldChange('eventType', value)}
              />
              <InstructionsCheckbox
                hasInstructions={formState.hasInstructions}
                instructions={formState.instructions}
                onHasInstructionsChange={(checked) =>
                  handleFieldChange('hasInstructions', checked)
                }
                onInstructionsChange={(value) =>
                  handleFieldChange('instructions', value)
                }
              />
              <ProfessionalSelect
                professionals={professionalOptions}
                selectedProfessional={formState.selectedProfessional}
                onProfessionalChange={(value) =>
                  handleFieldChange('selectedProfessional', value)
                }
                onAddNewProfessional={() => {
                  onOpenChange(false)
                  setTimeout(() => setIsAddProfessionalOpen(true), 300)
                }}
              />
              <DateInput
                value={formState.date}
                error={errors.date}
                onChange={(value) => handleFieldChange('date', value)}
                onErrorChange={() => {
                  // Handle date error through form validation
                }}
              />
              <TimeInputs
                startTime={formState.startTime}
                endTime={formState.endTime}
                startTimeError={errors.startTime}
                endTimeError={errors.endTime}
                onStartTimeChange={(value) =>
                  handleFieldChange('startTime', value)
                }
                onEndTimeChange={(value) => handleFieldChange('endTime', value)}
              />
              {errors.overlap && (
                <div className="bg-orange-100 border border-orange-300 rounded p-3">
                  <p className="text-sm text-orange-800">{errors.overlap}</p>
                </div>
              )}
              <ObservationTextarea
                value={formState.observation}
                onChange={(value) => handleFieldChange('observation', value)}
              />
              <Button
                onClick={handleSubmit}
                className="w-full h-11 bg-[#10B981] hover:bg-[#059669] text-white rounded shadow-sm mt-2"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
          <div className="text-center pb-4 text-xs text-[#9CA3AF]">
            © 2025 Omni Saúde
          </div>
        </DialogContent>
      </Dialog>
      <AddProfessionalModal
        open={isAddProfessionalOpen}
        onOpenChange={setIsAddProfessionalOpen}
        onSave={handleAddProfessional}
      />
      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja realmente sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
