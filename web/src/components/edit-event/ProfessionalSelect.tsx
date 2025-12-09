import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

interface Professional {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
}

interface ProfessionalSelectProps {
  professionals: Professional[]
  selectedProfessional: string
  onProfessionalChange: (value: string) => void
  onAddNewProfessional: () => void
}

export function ProfessionalSelect({
  professionals,
  selectedProfessional,
  onProfessionalChange,
  onAddNewProfessional,
}: ProfessionalSelectProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
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
      <Select value={selectedProfessional} onValueChange={onProfessionalChange}>
        <SelectTrigger className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[#6B7280] focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder="Selecione o profissional..." />
        </SelectTrigger>
        <SelectContent>
          <div className="bg-white border border-[#D1D5DB] rounded shadow-md">
            {professionals.map((prof) => (
              <SelectItem
                key={prof.id}
                value={prof.id}
                className="text-gray-900"
              >
                {prof.name} - {prof.specialty}
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  )
}
