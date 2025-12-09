import { Button } from './ui/button'
import { Pencil, Trash2 } from 'lucide-react'

interface ProfessionalCardProps {
  id: string
  name: string
  specialty: string
  address?: string
  contact?: string
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function ProfessionalCard({
  id,
  name,
  specialty,
  address,
  contact,
  onEdit,
  onDelete,
}: ProfessionalCardProps) {
  const isActive = specialty !== 'A ser definido'
  console.log('[ProfessionalCard] Specialty:', specialty, 'Name:', name)

  return (
    <div className="w-full max-w-sm bg-white rounded-xl border border-[#E5E7EB] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
      {/* Card Content */}
      <div className="p-4 md:p-6 flex flex-col min-h-[140px] md:min-h-[164px]">
        <h3 className="text-gray-900 text-lg md:text-xl mb-2 m-0 line-clamp-2">{name}</h3>
        <p
          className={`${
            isActive ? 'text-[#10B981]' : 'text-[#9CA3AF]'
          } mb-3 m-0 text-sm md:text-base`}
        >
          {specialty}
        </p>
        {address && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <p className="text-[#6B7280] text-sm md:text-[14px] leading-relaxed m-0 flex-1 line-clamp-2">
              {address}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-xs text-[#10B981] border border-[#D1D5DB] rounded hover:bg-[#F3F4F6] self-start sm:self-auto"
              onClick={() => navigator.clipboard.writeText(address)}
            >
              Copiar
            </Button>
          </div>
        )}
        {contact && (
          <p className="text-[#374151] text-sm md:text-[14px] leading-relaxed m-0">
            <span className="font-medium">Contato:</span> {contact}
          </p>
        )}
      </div>

      {/* Card Actions */}
      <div className="border-t border-[#E5E7EB] p-4 md:px-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          onClick={() => onEdit(id)}
          variant="outline"
          className="flex-1 h-8 px-3 md:px-4 bg-transparent border border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white rounded-md text-xs transition-colors"
        >
          <Pencil className="w-3 h-3 mr-1 md:mr-2" />
          Editar
        </Button>
        <Button
          onClick={() => onDelete(id)}
          variant="outline"
          className="flex-1 h-8 px-3 md:px-4 bg-transparent border border-[#10B981] text-[#10B981] hover:bg-[#EF4444] hover:border-[#EF4444] hover:text-white rounded-md text-xs transition-colors"
        >
          <Trash2 className="w-3 h-3 mr-1 md:mr-2" />
          Excluir
        </Button>
      </div>
    </div>
  )
}
