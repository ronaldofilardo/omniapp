'use client';

import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';

interface Laudo {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'error';
}

export function PortalLaudos() {
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pacienteId, setPacienteId] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('paciente_id', pacienteId);

      const response = await fetch('/api/laudos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar arquivo');
      }

      const data = await response.json();
      setLaudos((prev) => [...prev, data]);
    } catch (error) {
      console.error('Erro ao enviar laudo:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-2 sm:p-4 w-full max-w-2xl mx-auto">
      {/* Paciente ID Input */}
      <div className="mb-4">
        <label htmlFor="paciente-id" className="block text-sm font-medium text-gray-700 mb-2">
          Código do Paciente
        </label>
        <input
          id="paciente-id"
          type="text"
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Digite o código do paciente"
        />
      </div>
      {/* Upload Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center w-full">
          <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 sm:h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-4 pb-4 sm:pt-5 sm:pb-6">
              <Upload className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 text-gray-400" />
              <p className="mb-2 text-xs sm:text-sm text-gray-500">
                <span className="font-semibold">Clique para enviar</span> ou arraste e solte
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">PDF, DOC, DOCX (MAX. 10MB)</p>
            </div>
            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={isUploading}
              data-testid="file-input"
            />
          </label>
        </div>
      </div>

      {/* Files List */}
      <div className="mt-6 sm:mt-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Laudos Enviados</h3>
        <div className="space-y-3 sm:space-y-4">
          {laudos.map((laudo) => (
            <div
              key={laudo.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 break-all">{laudo.fileName}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    Enviado em {new Date(laudo.uploadedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-[10px] sm:text-xs rounded ${
                  laudo.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : laudo.status === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {laudo.status === 'completed'
                  ? 'Concluído'
                  : laudo.status === 'error'
                  ? 'Erro'
                  : 'Processando'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}