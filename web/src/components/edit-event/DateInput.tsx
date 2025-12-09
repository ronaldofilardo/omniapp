import { Input } from '../ui/input'
import { validateDate } from '@/lib/validators/eventValidators'

interface DateInputProps {
  value: string
  error?: string
  onChange: (value: string) => void
  onErrorChange: (error: string | undefined) => void
}

export function DateInput({
  value,
  error,
  onChange,
  onErrorChange,
}: DateInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-[#374151] text-sm block">Data do Evento</label>
      <Input
        type="date"
        value={value}
        min={(() => {
          const today = new Date()
          return today.toISOString().split('T')[0]
        })()}
        max={(() => {
          const maxDate = new Date()
          maxDate.setFullYear(maxDate.getFullYear() + 2)
          return maxDate.toISOString().split('T')[0]
        })()}
        onChange={(e) => {
          onChange(e.target.value)
          onErrorChange(undefined)
          if (e.target.value) {
            const validation = validateDate(e.target.value)
            if (!validation.isValid) {
              onErrorChange(validation.error || 'Data inválida.')
            }
          }
        }}
        className={`w-full h-10 bg-[#F3F4F6] border ${error ? 'border-red-500' : 'border-[#D1D5DB]'} rounded text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0`}
        placeholder="Selecione a data"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
