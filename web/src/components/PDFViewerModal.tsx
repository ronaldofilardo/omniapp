'use client'

import React, { useState, useEffect } from 'react'
import { X, Download, Loader2, AlertCircle } from 'lucide-react'

interface PDFViewerModalProps {
  isOpen: boolean
  onClose: () => void
  fileId: string
  fileName: string
  fileUrl: string
}

/**
 * Visualizador de PDF Definitivo v2.0
 * 
 * Abordagem: Baixar PDF como blob e criar Object URL
 * Benefícios:
 * - Sem problemas de CORS/iframe
 * - Sem bloqueio do navegador
 * - Funciona com qualquer fonte (Cloudinary, local, etc)
 * - Performance: cache automático do navegador
 */
export function PDFViewerModal({ isOpen, onClose, fileId, fileName, fileUrl }: PDFViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      // Limpar quando fechar
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        setBlobUrl(null)
      }
      return
    }

    const loadPDF = async () => {
      console.log('[PDFViewer] Iniciando carregamento do PDF, fileId:', fileId)
      setLoading(true)
      setError(null)
      
      try {
        // Baixar PDF via proxy
        console.log('[PDFViewer] Fazendo fetch do proxy...')
        const response = await fetch(`/api/files/${fileId}/proxy`)
        console.log('[PDFViewer] Resposta recebida, status:', response.status)
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar PDF: ${response.status}`)
        }

        // Converter para blob
        console.log('[PDFViewer] Convertendo para blob...')
        const blob = await response.blob()
        console.log('[PDFViewer] Blob criado, size:', blob.size, 'type:', blob.type)
        
        // Criar Object URL
        const url = URL.createObjectURL(blob)
        console.log('[PDFViewer] Object URL criado:', url)
        setBlobUrl(url)
        setLoading(false)
        console.log('[PDFViewer] Carregamento concluído com sucesso!')
      } catch (err) {
        console.error('[PDFViewer] Erro ao carregar PDF:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setLoading(false)
      }
    }

    loadPDF()
  }, [isOpen, fileId])

  if (!isOpen) return null

  const handleDownload = async () => {
    if (blobUrl) {
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      a.click()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-7xl max-h-screen p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-t-lg px-6 py-4 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 truncate max-w-md">
            {fileName}
          </h2>
          <div className="flex items-center gap-3">
            {blobUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-lg shadow-lg" style={{ height: 'calc(100vh - 120px)' }}>
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" data-testid="loading-spinner" />
              <p className="text-gray-600">Carregando PDF...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-600 font-medium mb-2">Erro ao carregar PDF</p>
              <p className="text-gray-600 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Fechar
              </button>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full rounded-b-lg"
              title={fileName}
            />
          )}
        </div>
      </div>
    </div>
  )
}
