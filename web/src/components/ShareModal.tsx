'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { Copy, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface FileItem {
  id: string
  name: string
  type: string
  size: number
  url: string
}

interface FileItem {
  id: string
  name: string
  type: string
  size: number
  url: string
}

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: any // Event from Timeline
}

export function ShareModal({ open, onOpenChange, event }: ShareModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [accessCode, setAccessCode] = useState('')

  const eventId = event.id
  const eventTitle = event.title

  // Extrair arquivos do evento - apenas os 6 slots únicos (um por slot)
  const files: FileItem[] = Array.isArray(event.files)
    ? event.files
        .filter((file: any, index: number, self: any[]) => 
          // Manter apenas o último arquivo de cada slot (remove duplicatas)
          index === self.findIndex((f: any) => f.slot === file.slot)
        )
        .map((file: any, index: number) => ({
          id: file.id || `file-${index}`,
          name: file.name,
          type: file.name.split('.').pop() || 'file',
          size: 0,
          url: file.url
        }))
    : []

  const toggleFile = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const generateLink = async () => {
    if (selectedFiles.length === 0) return

    setLoading(true)
    try {
      const selectedFileUrls = selectedFiles.map(fileId =>
        files.find(f => f.id === fileId)?.url
      ).filter(Boolean)

      const response = await fetch('/api/share/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          fileUrls: selectedFileUrls
        })
      })

      const data = await response.json()
      if (data.shareLink && data.accessCode) {
        setShareLink(data.shareLink)
        setAccessCode(data.accessCode)
        setShowLink(true)
      }
    } catch (error) {
      console.error('Erro ao gerar link:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const resetModal = () => {
    setSelectedFiles([])
    setShowLink(false)
    setShareLink('')
    setAccessCode('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetModal()
    }
    onOpenChange(newOpen)
  }

  return (
    <>
      {/* Modal de Seleção de Arquivos */}
      <Dialog open={open && !showLink} onOpenChange={handleOpenChange} data-testid="share-modal">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Arquivos para Compartilhar</DialogTitle>
            <DialogDescription>
              Selecione os arquivos do evento "{eventTitle}" que deseja compartilhar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map(file => (
              <label key={file.id} className="flex items-center gap-3 p-2 hover:bg-gray-200 rounded transition-colors cursor-pointer text-black">
                <Checkbox
                  checked={selectedFiles.includes(file.id)}
                  onCheckedChange={() => toggleFile(file.id)}
                />
                <div className="flex-1">
                  <p className="font-medium text-black">{file.name}</p>
                  <p className="text-xs text-gray-700">{file.type} • {formatBytes(file.size)}</p>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={generateLink}
              disabled={selectedFiles.length === 0 || loading}
              className="bg-green-600"
            >
              {loading ? 'Gerando...' : 'Gerar Link de Compartilhamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Compartilhamento Seguro */}
      <Dialog open={showLink} onOpenChange={setShowLink}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Compartilhamento Seguro</DialogTitle>
            <DialogDescription className="sr-only">Compartilhe este link ou código com quem precisa acessar os arquivos. Este link é de uso único.</DialogDescription>
          </DialogHeader>
          <div className="font-semibold text-lg mb-2">Compartilhamento Seguro</div>
          <div className="text-sm text-gray-600 mb-4">Compartilhe este link ou código com quem precisa acessar os arquivos.<strong> Este link é de uso único.</strong></div>

          <div className="space-y-4">
            {/* Link */}
            <div>
              <label className="text-sm font-medium">Link de Compartilhamento</label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={shareLink} readOnly />
                <Button size="sm" onClick={copyLink} data-testid="copy-link-btn">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <QRCodeSVG value={shareLink} size={180} />
            </div>

            {/* Código Numérico */}
            <div className="text-center">
              <p className="text-sm text-gray-600">Código de Acesso</p>
              <p className="text-3xl font-bold text-green-600">{accessCode}</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => { setShowLink(false); onOpenChange(false); }} data-testid="close-modal-btn">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}