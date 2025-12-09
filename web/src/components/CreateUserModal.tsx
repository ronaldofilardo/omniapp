'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Eye, EyeOff } from 'lucide-react'
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

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered?: (user: { email: string; name?: string }) => void
}

export function CreateUserModal({ open, onOpenChange, onRegistered }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false)
  const [acceptedTermsOfUse, setAcceptedTermsOfUse] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null) // ← NOVIDADE

  useEffect(() => {
    if (!open) {
      setFullName('')
      setCpf('')
      setPhone('')
      setEmail('')
      setPassword('')
      setShowPassword(false)
      setAcceptedPrivacyPolicy(false)
      setAcceptedTermsOfUse(false)
      setShowConfirmClose(false)
      setSubmitting(false)
      setError(null)
      setSuccessMessage(null)
    }
  }, [open])

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return cpf
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
    } else if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
    }
    return phone
  }

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => setCpf(formatCPF(e.target.value))
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => setPhone(formatPhone(e.target.value))

  const validateCPF = (cpf: string) => cpf.replace(/\D/g, '').length === 11

  const isFormValid = email && password && cpf && validateCPF(cpf) && acceptedPrivacyPolicy && acceptedTermsOfUse

  const handleSubmit = async () => {
    setError(null)
    setSuccessMessage(null)

    if (!email || !password || !cpf) return setError('E-mail, senha e CPF são obrigatórios')
    if (!validateCPF(cpf)) return setError('CPF deve ter 11 dígitos')
    if (!acceptedPrivacyPolicy || !acceptedTermsOfUse) return setError('Você deve aceitar a Política de Privacidade e os Termos de Uso')

    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          cpf,
          telefone: phone || null,
          acceptedPrivacyPolicy,
          acceptedTermsOfUse,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao criar usuário')
      }

      // SUCESSO → mostra mensagem verde e fecha
      setSuccessMessage('Cadastro realizado! Verifique seu e-mail para ativar a conta.')
      onRegistered?.({ email, name: fullName })
      setTimeout(() => onOpenChange(false), 2500) // fecha automático após 2,5s
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar usuário')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && (fullName || cpf || phone || email || password)) {
      setShowConfirmClose(true)
    } else {
      onOpenChange(newOpen)
    }
  }

  const confirmClose = () => {
    setShowConfirmClose(false)
    onOpenChange(false)
  }

  const cancelClose = () => setShowConfirmClose(false)

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[480px] p-8 bg-white rounded-lg">
          <DialogHeader>
            <DialogTitle className="sr-only">Criar Novo Usuário</DialogTitle>
            <DialogDescription className="sr-only">
              Formulário para criação de novo usuário receptor com campos obrigatórios de CPF, email e senha
            </DialogDescription>
          </DialogHeader>

          <div className="text-center text-[#1F2937] mb-6 text-lg font-semibold">Criar Novo Usuário</div>

          <div className="flex flex-col gap-4">
            {/* Todos os inputs iguais ao seu original */}
            <Input type="text" placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]" />

            <Input type="text" placeholder="CPF *" value={cpf} onChange={handleCPFChange} maxLength={14} className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]" />

            <Input type="text" placeholder="Telefone" value={phone} onChange={handlePhoneChange} maxLength={15} className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]" />

            <Input type="email" placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]" />

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 pr-12 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={acceptedPrivacyPolicy} onChange={(e) => setAcceptedPrivacyPolicy(e.target.checked)} className="w-4 h-4" />
                <span className="text-[#6B7280]">
                  Aceito a <button type="button" className="text-blue-600 underline hover:text-blue-800" onClick={() => window.open('https://www.omniapp.online/politica-de-privacidade.pdf', '_blank')}>Política de Privacidade</button>
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={acceptedTermsOfUse} onChange={(e) => setAcceptedTermsOfUse(e.target.checked)} className="w-4 h-4" />
                <span className="text-[#6B7280]">
                  Aceito os <button type="button" className="text-blue-600 underline hover:text-blue-800" onClick={() => window.open('https://www.omniapp.online/termos-de-uso.pdf', '_blank')}>Termos de Uso</button>
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}
            {successMessage && <p className="text-sm text-green-600 font-medium text-center animate-pulse">{successMessage}</p>}

            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className="w-full h-12 bg-[#10B981] hover:bg-[#059669] text-white rounded-md mt-4 shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>Você tem alterações não salvas. Deseja realmente sair sem salvar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>Sair sem salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}