'use client'

import { useState, use } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download } from 'lucide-react'

interface FileItem {
  id: string
  name: string
  type: string
  url: string
}

interface ShareAccessProps {
  params: Promise<{ token: string }>
}

export default function ShareAccess({ params }: ShareAccessProps) {
  const { token } = use(params)
  const [code, setCode] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitCode = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/share/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, code }),
    })

    const data = await res.json()
    if (data.files) {
      setFiles(data.files)
    } else {
      setError(data.error || 'Código inválido ou expirado')
    }
    setLoading(false)
  }

  if (files.length > 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Arquivos Compartilhados</h1>
        <div className="space-y-3">
          {files.map(file => (
            <div key={file.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {file.name}
                </a>
                <p className="text-sm text-gray-500">{file.type}</p>
              </div>
              <Button asChild size="sm">
                <a href={file.url} download>
                  <Download className="h-4 w-4 mr-1" /> Baixar
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center mb-2 text-black">Acesso a Documentos</h1>
      <p className="text-center text-sm text-black mb-6">
        Por favor, insira o código de acesso fornecido pelo paciente.
      </p>

      <div className="space-y-4">
        <Input
          placeholder="388910"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="text-center text-2xl tracking-widest text-black placeholder:text-gray-500"
          maxLength={6}
        />

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <Button
          onClick={submitCode}
          disabled={code.length !== 6 || loading}
          className="w-full bg-green-600 text-black hover:bg-green-700"
        >
          {loading ? 'Validando...' : 'Acessar Arquivos'}
        </Button>
      </div>
    </div>
  )
}