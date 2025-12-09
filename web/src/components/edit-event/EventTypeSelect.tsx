import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

interface EventTypeSelectProps {
  value: string
  onValueChange: (value: string) => void
}

const eventTypeOptions = [
  { value: 'CONSULTATION', label: 'Consulta' },
  { value: 'EXAM', label: 'Exame' },
  { value: 'PROCEDURE', label: 'Procedimento' },
  { value: 'MEDICATION', label: 'Medicação' },
  { value: 'OTHER', label: 'Outro' },
]

export function EventTypeSelect({
  value,
  onValueChange,
}: EventTypeSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-[#374151] text-sm block">Tipo de Evento</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#6B7280] focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder="Selecione o tipo..." />
        </SelectTrigger>
        <SelectContent>
          <div className="bg-white border border-[#D1D5DB] rounded shadow-md">
            {eventTypeOptions.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="hover:bg-[#F3F4F6] focus:bg-[#E5E7EB] px-4 py-2 text-[#374151]"
              >
                {opt.label}
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  )
}
