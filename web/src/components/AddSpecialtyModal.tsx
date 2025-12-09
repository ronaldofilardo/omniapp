"use client";
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Input } from './ui/input'
import { Button } from './ui/button'
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

interface AddSpecialtyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (specialty: string) => void
}

export function AddSpecialtyModal({
  open,
  onOpenChange,
  onSave,
}: AddSpecialtyModalProps) {
  const [specialtyName, setSpecialtyName] = useState('')
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  const handleSubmit = () => {
    if (!specialtyName.trim()) {
      alert('Por favor, digite o nome da especialidade.')
      return
    }
    onSave(specialtyName.trim())
    setSpecialtyName('')
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (specialtyName.trim()) {
        setShowConfirmClose(true)
      } else {
        onOpenChange(false)
      }
    } else {
      onOpenChange(newOpen)
    }
  }

  const confirmClose = () => {
    setShowConfirmClose(false)
    onOpenChange(false)
  }

  const cancelClose = () => {
    setShowConfirmClose(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[400px] p-0 gap-0 bg-white border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Adicionar Nova Especialidade</DialogTitle>
            <DialogDescription className="sr-only">Formulário para adicionar uma nova especialidade</DialogDescription>
          </DialogHeader>
          {/* Form */}
          <div className="px-10 pt-6 pb-8">
            <div className="space-y-2 mb-8">
              <label className="text-[#111827] text-sm block">Nome</label>
              <Input
                type="text"
                value={specialtyName}
                onChange={(e) => setSpecialtyName(e.target.value)}
                placeholder="Digite o nome..."
                className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#374151] placeholder:text-[#9CA3AF] focus:ring-0 focus:ring-offset-0"
                autoFocus={true}
              />
            </div>
            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleOpenChange(false)}
                variant="outline"
                className="flex-1 h-12 bg-white border border-[#D1D5DB] text-[#6B7280] hover:bg-gray-50 rounded"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="w-full h-10 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg mt-4"
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
