import { Textarea } from '../ui/textarea'

interface ObservationTextareaProps {
  value: string
  onChange: (value: string) => void
}

export function ObservationTextarea({
  value,
  onChange,
}: ObservationTextareaProps) {
  return (
    <div className="space-y-2">
      <label className="text-[#374151] text-sm block">Observação</label>
      <Textarea
        placeholder="Digite observações sobre o evento..."
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          if (e.target.value.length <= 500) {
            onChange(e.target.value)
          }
        }}
        maxLength={500}
        className="h-24 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF] resize-none"
      />
      <p className="text-xs text-[#9CA3AF] text-right m-0">
        {value.length}/500 caracteres
      </p>
    </div>
  )
}
