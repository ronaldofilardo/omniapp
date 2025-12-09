"use client";
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { AddSpecialtyModal } from './AddSpecialtyModal'
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
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface AddProfessionalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (professional: {
    name: string
    specialty: string
    address: string
    contact: string
  }) => void
}

export function AddProfessionalModal({
  open,
  onOpenChange,
  onSave,
}: AddProfessionalModalProps) {
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [isAddSpecialtyModalOpen, setIsAddSpecialtyModalOpen] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  // Lista de especialidades do banco de dados
  const [specialties, setSpecialties] = useState<string[]>([])

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const { globalCache } = await import('../lib/globalCache')
        
        const data = await globalCache.fetchWithDeduplication<string[]>(
          'professionals_specialties',
          async () => {
            const response = await fetch('/api/professionals?type=specialties')
            if (!response.ok) throw new Error('Failed to fetch specialties')
            const result = await response.json()
            return Array.isArray(result) ? result : []
          },
          {
            staleTime: 10 * 60 * 1000, // 10 minutes - specialties don't change often
            cacheTime: 30 * 60 * 1000  // 30 minutes
          }
        )
        
        setSpecialties(data)
      } catch (error) {
        console.error('Erro ao buscar especialidades:', error)
        setSpecialties([])
      }
    }
    fetchSpecialties()
  }, [])

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Por favor, preencha o nome do profissional.')
      return
    }
    if (!specialty) {
      alert('Por favor, selecione uma especialidade.')
      return
    }
    onSave({
      name: name.trim(),
      specialty: specialty,
      address: address.trim(),
      contact: contact.trim(),
    })
    // Reset form
    setName('')
    setSpecialty('')
    setAddress('')
    setContact('')
    onOpenChange(false)
  }

  const handleAddSpecialty = (newSpecialty: string) => {
    setSpecialties([...specialties, newSpecialty])
    setSpecialty(newSpecialty)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowConfirmClose(true)
    } else {
      // Limpar estado quando abrir
      setName('')
      setSpecialty('')
      setAddress('')
      setContact('')
      onOpenChange(newOpen)
    }
  }

  const confirmClose = () => {
    setShowConfirmClose(false)
    // Limpar estado do formulário
    setName('')
    setSpecialty('')
    setAddress('')
    setContact('')
    onOpenChange(false)
  }

  const cancelClose = () => {
    setShowConfirmClose(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[480px] p-0 gap-0 bg-white border-0 shadow-xl" data-testid="add-professional-modal">
          <DialogHeader>
            <DialogTitle className="sr-only">Adicionar Novo Profissional</DialogTitle>
            <DialogDescription className="sr-only">Formulário para adicionar um novo profissional</DialogDescription>
          </DialogHeader>
          {/* Header visual */}
          <div className="pt-8 px-10">
            <h2 className="text-[#1F2937] text-center m-0">
              Adicionar Novo Profissional
            </h2>
          </div>
          {/* Form */}
          <div className="px-10 pt-6 pb-8">
            <div className="flex flex-col gap-5">
              {/* Nome */}
              <div className="space-y-2">
                <label htmlFor="add-professional-name" className="text-[#111827] text-sm block">Nome</label>
                <Input
                  id="add-professional-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#374151] placeholder:text-[#9CA3AF] focus:ring-0 focus:ring-offset-0"
                />
              </div>
              {/* Especialidade */}
              <div className="space-y-2">
                <label className="text-[#111827] text-sm block">
                  Especialidade
                </label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#374151] focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Selecione uma especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(specialties) ? specialties : []).map((spec, idx) => (
                      <SelectItem
                        key={spec + '-' + idx}
                        value={spec}
                        className="hover:bg-[#F3F4F6] focus:bg-[#E5E7EB] px-4 py-2 text-[#374151]"
                      >
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[#10B981] text-xs px-0"
                  onClick={() => setIsAddSpecialtyModalOpen(true)}
                >
                  + Adicionar nova especialidade
                </Button>
              </div>
              {/* Endereço */}
              <div className="space-y-2">
                <label htmlFor="add-professional-address" className="text-[#111827] text-sm block">Endereço</label>
                <Textarea
                  id="add-professional-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-20 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#374151] placeholder:text-[#9CA3AF] focus:ring-0 focus:ring-offset-0"
                  placeholder="Digite o endereço..."
                  maxLength={500}
                />
              </div>
              {/* Contato */}
              <div className="space-y-2">
                <label htmlFor="add-professional-contact" className="text-[#111827] text-sm block">Contato</label>
                <Input
                  id="add-professional-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#374151] placeholder:text-[#9CA3AF] focus:ring-0 focus:ring-offset-0"
                  placeholder="Digite o contato..."
                  maxLength={100}
                />
              </div>
              <Button
                className="bg-[#10B981] hover:bg-[#059669] text-white h-10 px-6 rounded-lg mt-4"
                onClick={handleSubmit}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal para adicionar especialidade */}
      <AddSpecialtyModal
        open={isAddSpecialtyModalOpen}
        onOpenChange={setIsAddSpecialtyModalOpen}
        onSave={handleAddSpecialty}
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
