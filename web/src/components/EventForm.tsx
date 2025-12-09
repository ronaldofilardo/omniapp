import React from 'react'
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

// Definição local do enum EventType para uso no client
export enum EventType {
  CONSULTA = 'CONSULTA',
  EXAME = 'EXAME',
}

// Tipos
interface Professional {
  id: string
  name: string
  specialty: string
}

interface FormState {
  eventType: EventType | ''
  selectedProfessional: string
  date: string
  startTime: string
  endTime: string
  observation: string
}

interface FormErrors {
  eventType?: string
  selectedProfessional?: string
  date?: string
  startTime?: string
  endTime?: string
  overlap?: string
}

interface EventFormProps {
  formState: FormState
  errors: FormErrors
  professionalOptions: Professional[]
  handleFieldChange: <T extends keyof FormState>(
    field: T,
    value: FormState[T]
  ) => void
  onAddNewProfessional: () => void
}

const eventTypeOptions = [
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'EXAME', label: 'Exame' },
]

export function EventForm({
  formState,
  errors,
  professionalOptions,
  handleFieldChange,
  onAddNewProfessional,
}: EventFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Tipo de Evento */}
      <div className="space-y-2">
        <label className="text-[#374151] text-sm block">Tipo de Evento</label>
        <Select
          value={formState.eventType}
          onValueChange={(value: EventType) =>
            handleFieldChange('eventType', value)
          }
        >
          <SelectTrigger className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#6B7280] focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Selecione o tipo..." />
          </SelectTrigger>
          <SelectContent>
            {eventTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.eventType && (
          <p className="text-xs text-red-500 mt-1">{errors.eventType}</p>
        )}
      </div>

      {/* Profissional */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[#374151] text-sm block">Profissional</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddNewProfessional}
          >
            Novo
          </Button>
        </div>
        <Select
          value={formState.selectedProfessional}
          onValueChange={(value) =>
            handleFieldChange('selectedProfessional', value)
          }
        >
          <SelectTrigger className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#6B7280] focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Selecione o profissional..." />
          </SelectTrigger>
          <SelectContent>
            {professionalOptions.map((prof) => (
              <SelectItem key={prof.id} value={prof.id}>
                {prof.name} - {prof.specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.selectedProfessional && (
          <p className="text-xs text-red-500 mt-1">
            {errors.selectedProfessional}
          </p>
        )}
      </div>

      {/* Data do Evento */}
      <div className="space-y-2">
        <label className="text-[#374151] text-sm block">Data do Evento</label>
        <Input
          type="date"
          value={formState.date}
          onChange={(e) => handleFieldChange('date', e.target.value)}
          className={`w-full h-10 bg-[#F3F4F6] border rounded text-sm text-[#6B7280] ${errors.date ? 'border-red-500' : 'border-[#D1D5DB]'}`}
        />
        {errors.date && (
          <p className="text-xs text-red-500 mt-1">{errors.date}</p>
        )}
      </div>

      {/* Hora de Início e Fim */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[#374151] text-sm block">Hora de Início</label>
          <Input
            type="time"
            value={formState.startTime}
            onChange={(e) => handleFieldChange('startTime', e.target.value)}
            className={`w-full h-10 bg-[#F3F4F6] border rounded text-sm text-[#6B7280] ${errors.startTime ? 'border-red-500' : 'border-[#D1D5DB]'}`}
          />
          {errors.startTime && (
            <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-[#374151] text-sm block">Hora de Fim</label>
          <Input
            type="time"
            value={formState.endTime}
            onChange={(e) => handleFieldChange('endTime', e.target.value)}
            className={`w-full h-10 bg-[#F3F4F6] border rounded text-sm text-[#6B7280] ${errors.endTime ? 'border-red-500' : 'border-[#D1D5DB]'}`}
          />
          {errors.endTime && (
            <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>
          )}
        </div>
      </div>

      {/* Erro de Sobreposição */}
      {errors.overlap && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <p className="text-sm">{errors.overlap}</p>
        </div>
      )}

      {/* Observação */}
      <div className="space-y-2">
        <label className="text-[#374151] text-sm block">Observação</label>
        <Textarea
          placeholder="Digite observações sobre o evento..."
          value={formState.observation ?? ''}
          onChange={(e) => handleFieldChange('observation', e.target.value)}
          maxLength={500}
          className="h-24 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#374151]"
          disabled={false}
          readOnly={false}
        />
        <p className="text-xs text-[#9CA3AF] text-right m-0">
          {(formState.observation ?? '').length}/500 caracteres
        </p>
      </div>
    </div>
  )
}
