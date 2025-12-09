import { Input } from '../ui/input'

interface TimeInputsProps {
  startTime: string
  endTime: string
  startTimeError?: string
  endTimeError?: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
}

export function TimeInputs({
  startTime,
  endTime,
  startTimeError,
  endTimeError,
  onStartTimeChange,
  onEndTimeChange,
}: TimeInputsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[#374151] text-sm block">Hora de Início</label>
        <Input
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className={`w-full h-10 bg-[#F3F4F6] border ${startTimeError ? 'border-red-500' : 'border-[#D1D5DB]'} rounded text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0`}
        />
        {startTimeError && (
          <p className="text-xs text-red-500 mt-1">{startTimeError}</p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-[#374151] text-sm block">Hora de Fim</label>
        <Input
          type="time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          className={`w-full h-10 bg-[#F3F4F6] border ${endTimeError ? 'border-red-500' : 'border-[#D1D5DB]'} rounded text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0`}
        />
        {endTimeError && (
          <p className="text-xs text-red-500 mt-1">{endTimeError}</p>
        )}
      </div>
    </div>
  )
}
