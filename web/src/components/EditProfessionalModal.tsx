"use client";
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
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

interface EditProfessionalModalProps {
   open: boolean
   onOpenChange: (open: boolean) => void
   professional: {
     id: string
     name: string
     specialty: string
     address?: string
     contact?: string
   }
   specialties: string[]
   onSave: (updated: {
     id: string
     name: string
     specialty: string
     address: string
     contact: string
   }) => Promise<void>
 }

export function EditProfessionalModal({
  open,
  onOpenChange,
  professional,
  specialties,
  onSave,
}: EditProfessionalModalProps) {
  const [name, setName] = useState(professional.name)
  const [specialty, setSpecialty] = useState(professional.specialty)
  const [address, setAddress] = useState(professional.address || '')
  const [contact, setContact] = useState(professional.contact || '')
  const [isAddSpecialtyModalOpen, setIsAddSpecialtyModalOpen] = useState(false)
  const [localSpecialties, setLocalSpecialties] =
    useState<string[]>(Array.isArray(specialties) ? specialties : [])
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  useEffect(() => {
    // Busca especialidades do usuário atual, se possível
    const fetchSpecialties = async () => {
      try {
        // Tenta obter userId do profissional atual
        let userId = undefined;
        if (professional && professional.id) {
          // Busca o profissional para pegar o userId (caso precise)
          // Mas normalmente, o backend já filtra por userId do contexto
          // Então, se specialties vierem vazias, faz fetch
        }
        // Se já veio specialties do props, prioriza elas
        if (Array.isArray(specialties) && specialties.length > 0) {
          setLocalSpecialties(specialties)
        } else {
          // Busca do backend com cache global
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
              staleTime: 10 * 60 * 1000, // 10 minutes
              cacheTime: 30 * 60 * 1000  // 30 minutes
            }
          )
          
          setLocalSpecialties(data)
        }
      } catch (error) {
        console.error('Erro ao buscar especialidades:', error)
        setLocalSpecialties([])
      }
    }
    fetchSpecialties()
  }, [professional?.id, specialties])

  useEffect(() => {
    if (professional) {
      setName(professional.name ?? '')
      setSpecialty(professional.specialty ?? '')
      setAddress(professional.address ?? '')
      setContact(professional.contact ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professional?.id])

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Por favor, preencha o nome do profissional.')
      return
    }
    if (!specialty) {
      alert('Por favor, selecione uma especialidade.')
      return
    }

    try {
      await onSave({
        id: professional.id,
        name: name.trim(),
        specialty,
        address: address.trim(),
        contact: contact.trim(),
      })

      // Fechar o modal após salvar
      onOpenChange(false)
    } catch (error) {
      // Não fechar o modal se houve erro
      console.error('Erro ao salvar profissional:', error)
    }
  }

  const handleAddSpecialty = (newSpecialty: string) => {
    setLocalSpecialties([...localSpecialties, newSpecialty])
    setSpecialty(newSpecialty)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowConfirmClose(true)
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
        <DialogContent className="max-w-[480px] p-0 gap-0 bg-white border-0 shadow-xl">
          <DialogHeader className="pt-8 px-10">
            <DialogTitle className="sr-only">Editar Profissional</DialogTitle>
            <DialogDescription className="sr-only">Editar informações do profissional</DialogDescription>
          </DialogHeader>
          <div className="text-[#1F2937] text-center m-0 text-lg leading-none font-semibold mb-4">Editar Profissional</div>
          <div className="px-10 pt-6 pb-8">
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-[#111827] text-sm block">Nome</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#374151] placeholder:text-[#9CA3AF] focus:ring-0 focus:ring-offset-0"
                  placeholder="Digite o nome..."
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[#111827] text-sm block">
                  Especialidade
                </label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#374151] focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Selecione uma especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(localSpecialties) ? localSpecialties : []).map((spec) => (
                      <SelectItem
                        key={spec}
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
              <div className="space-y-2">
                <label className="text-[#111827] text-sm block">Endereço</label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-20 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#374151] placeholder:text-[#9CA3AF] focus:ring-0 focus:ring-offset-0"
                  placeholder="Digite o endereço..."
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[#111827] text-sm block">Contato</label>
                <Input
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
