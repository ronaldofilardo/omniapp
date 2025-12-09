import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'

interface InstructionsCheckboxProps {
  hasInstructions: boolean
  instructions: string
  onHasInstructionsChange: (checked: boolean) => void
  onInstructionsChange: (value: string) => void
}

export function InstructionsCheckbox({
  hasInstructions,
  instructions,
  onHasInstructionsChange,
  onInstructionsChange,
}: InstructionsCheckboxProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="instructions"
          checked={hasInstructions}
          onCheckedChange={(checked: boolean | 'indeterminate') =>
            onHasInstructionsChange(checked === true)
          }
          className="w-4 h-4 border-[#D1D5DB] data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6]"
        />
        <label
          htmlFor="instructions"
          className="text-[#374151] text-sm cursor-pointer"
        >
          Instruções
        </label>
      </div>
      {hasInstructions && (
        <div className="space-y-1">
          <Input
            value={instructions}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (e.target.value.length <= 50)
                onInstructionsChange(e.target.value)
            }}
            maxLength={50}
            required
            className="w-full h-10 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Digite as instruções (máx 50 caracteres)"
          />
          <p className="text-xs text-[#9CA3AF] text-right m-0">
            {instructions.length}/50 caracteres
          </p>
        </div>
      )}
    </div>
  )
}
