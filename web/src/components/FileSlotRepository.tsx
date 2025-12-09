'use client'
import React from 'react'
import { Eye, Trash2, UploadCloud } from 'lucide-react'
import { Button } from './ui/button'
import { storageManager } from '@/lib/storage'
import { isMimeTypeAllowed } from '@/lib/storage'

interface FileInfo {
  slot: string
  name: string
  url: string
  uploadDate?: string
  size?: number
  mimeType?: string
}

interface FileSlotRepositoryProps {
  label: string
  file?: FileInfo
  onUpload: (file: File) => Promise<void>
  onView: () => void
  onDelete: () => Promise<void>
  formatFileDate?: (date: string) => string
  disabled?: boolean
}

export function FileSlotRepository({
  label,
  file,
  onUpload,
  onView,
  onDelete,
  formatFileDate,
  disabled = false
}: FileSlotRepositoryProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const hasFile = !!file

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Usar validações do storage manager
    const maxSize = storageManager.getMaxFileSize()
    if (selectedFile.size > maxSize) {
      const maxSizeKB = Math.round(maxSize / 1024)
      const maxSizeMB = maxSize >= 1024 * 1024 ? Math.round(maxSize / (1024 * 1024)) : null
      const sizeText = maxSizeMB ? `${maxSizeMB}MB` : `${maxSizeKB}KB`
      alert(`O arquivo deve ter no máximo ${sizeText}`)
      return
    }

    // Validar tipo MIME usando configuração do storage
    if (!isMimeTypeAllowed(selectedFile.type)) {
      alert('Somente arquivos de imagem são permitidos (JPEG, PNG, GIF, WEBP)')
      return
    }

    try {
      await onUpload(selectedFile)
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload do arquivo')
    }
  }

  // Handler para deleção com tratamento de erro
  const handleDelete = async () => {
    try {
      await onDelete();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao deletar arquivo:', error);
      alert('Erro ao deletar arquivo');
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border 
        ${hasFile ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className={`font-medium ${hasFile ? 'text-emerald-800' : 'text-gray-500'}`}>
          {label}
        </span>
        {hasFile && (
          <div className="flex flex-col">
            <span className="text-sm text-emerald-700 truncate">{file.name}</span>
            {file.uploadDate && formatFileDate && (
              <span className="text-xs text-emerald-600">
                Upload: {formatFileDate(file.uploadDate)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {hasFile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onView}
              className="text-gray-500 hover:text-blue-600"
              title="Visualizar"
              disabled={disabled}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-600"
              title="Deletar"
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <label className={`cursor-pointer ${disabled ? 'cursor-not-allowed' : ''}`}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-600">
              <UploadCloud className="h-4 w-4" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={disabled}
            />
          </label>
        )}
      </div>
    </div>
  )
}