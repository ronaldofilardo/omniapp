"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calculateFileHash, formatHashForDisplay } from '@/lib/utils/fileHash';
import { UploadProgressIndicator } from '@/components/ui/loading-states';
import { SLOT_FILE_LIMITS, getFileTooLargeError } from '@/lib/constants/fileLimits';

type EnviarDocumentoProps = {
  fetchImpl?: typeof fetch;
  FileReaderImpl?: typeof FileReader;
};

export default function EnviarDocumento({ fetchImpl, FileReaderImpl }: EnviarDocumentoProps = {}) {
  const router = useRouter();
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [documento, setDocumento] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [cpf, setCpf] = useState('');
  const [documentType, setDocumentType] = useState('result');
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'processing' | 'success' | 'error'>('uploading');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => router.push('/login'));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validação de tipo de arquivo (imagens e PDFs)
      if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
        setError('Apenas arquivos de imagem ou PDFs são aceitos.');
        setSuccess(null);
        return;
      }
      
      // Validação de tamanho usando constantes centralizadas (2MB para todos os tipos)
      const maxSize = SLOT_FILE_LIMITS[documentType as keyof typeof SLOT_FILE_LIMITS] || SLOT_FILE_LIMITS.result;
      if (selectedFile.size > maxSize) {
        setError(getFileTooLargeError(selectedFile.size, documentType as keyof typeof SLOT_FILE_LIMITS));
        setSuccess(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null); // Limpa erro anterior se houver
      
      // Calcular hash SHA-256 do arquivo
      try {
        const hash = await calculateFileHash(selectedFile);
        setFileHash(hash);
      } catch (error) {
        console.error('Erro ao calcular hash:', error);
        setFileHash('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetPending(false);
    setUploadProgress(0);
    setUploadStatus('uploading');

    // Validação de CPF (se preenchido)
    if (cpf && !/^\d{11}$/.test(cpf.replace(/\D/g, ''))) {
      setError('Erro: CPF inválido. Deve conter 11 dígitos numéricos.');
      setSuccess(null);
      setLoading(false);
      return;
    }

    // Validação de campos obrigatórios
    if (!patientEmail || !doctorName || !examDate || !documento || !file) {
      setError('Erro: Preencha todos os campos e selecione um arquivo.');
      setSuccess(null);
      setLoading(false);
      return;
    }

    try {
      // Simular progresso durante upload (0-90%)
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev;
          if (current >= 90) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            return 90;
          }
          return current + 10;
        });
      }, 200);

      const Reader = FileReaderImpl || FileReader;
      const reader = new Reader();
      reader.onload = async () => {
        try {
          setUploadStatus('processing');
          setUploadProgress(95);

          const base64 = (reader.result as string).split(',')[1];
          const payload = {
            patientEmail,
            doctorName,
            examDate,
            documento,
            pacienteId,
            cpf: cpf.replace(/\D/g, ''), // Enviar apenas dígitos
            documentType,
            report: {
              fileName: file ? file.name : '',
              fileContent: base64,
            },
          };
          // Garante que o fetch global mockado seja usado nos testes
          const fetchToUse = fetchImpl || (typeof global !== 'undefined' && typeof global.fetch === 'function' ? global.fetch : fetch);
          const res = await fetchToUse('/api/document/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          
          if (res.ok) {
            setUploadProgress(100);
            setUploadStatus('success');
            setError(null);
            setSuccess('Sucesso: Documento enviado com sucesso!');
            timeoutRef.current = setTimeout(() => {
              setResetPending(true);
              setUploadProgress(0);
            }, 50);
          } else {
            setUploadStatus('error');
            const data = await res.json();
            setSuccess(null);
            // Mensagens amigáveis
            if (data.error?.includes('CPF')) {
              setError('Erro: Não encontramos nenhum usuário com o CPF informado. Verifique se o CPF está correto ou cadastrado no sistema.');
            } else if (data.error?.includes('exame')) {
              setError('Erro: Já existe um documento cadastrado com este número de exame. Por favor, utilize outro número.');
            } else {
              setError(data.error ? `Erro: ${data.error}` : 'Erro ao enviar documento.');
            }
          }
        } catch (e) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          setUploadStatus('error');
          setSuccess(null);
          setError('Erro: Erro ao processar arquivo');
        }
        setLoading(false);
      };
      reader.onerror = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setUploadStatus('error');
        setSuccess(null);
        setError('Erro: Erro ao processar arquivo');
        setLoading(false);
      };
      if (file) {
        reader.readAsDataURL(file);
      }
    } catch (e) {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setUploadStatus('error');
    setSuccess(null);
    setError('Erro: Erro ao processar arquivo');
    setLoading(false);
    }
  };

  // Limpa o formulário imediatamente após exibir a mensagem de sucesso, mas mantém a mensagem
  React.useEffect(() => {
    if (success && resetPending) {
  setPatientEmail('');
  setDoctorName('');
  setExamDate('');
  setDocumento('');
  setPacienteId('');
  setCpf('');
  setFile(null);
  setFileHash('');
  setResetPending(false);
  // Não limpar success aqui, para manter a mensagem visível
    }
  }, [success, resetPending]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 flex flex-col gap-4"
      >
      <h2 className="text-xl font-bold text-center text-[#10B981] mb-1">Envio Automatizado de Documentos Gerais</h2>
      <p className="text-center text-black mb-4">Envio Público de Documentos</p>
      {error && (
        <div className="text-red-600 mt-2 text-center font-medium" data-testid="error-message">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4">
        {/* Campo n. exame */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 font-medium text-right">n. exame</label>
          <input
            type="text"
            placeholder="Número do Documento"
            value={documento}
            onChange={e => setDocumento(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>

        {/* Campo paciente ID */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 font-medium text-right">paciente ID</label>
          <input
            type="text"
            placeholder="Código do Paciente"
            value={pacienteId}
            onChange={e => setPacienteId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>

        {/* Campo médico solicitante */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 font-medium text-right">médico solicitante</label>
          <input
            type="text"
            placeholder="Médico Solicitante"
            value={doctorName}
            onChange={e => setDoctorName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>

        {/* Campo data */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 font-medium text-right">data</label>
          <input
            type="date"
            placeholder="dd/mm/aaaa"
            value={examDate}
            onChange={e => setExamDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>

        {/* Campo email */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 font-medium text-right">email</label>
          <input
            type="email"
            placeholder="E-mail do Paciente"
            value={patientEmail}
            onChange={e => setPatientEmail(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            data-testid="email-input"
          />
        </div>

        {/* Campo cpf */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 font-medium text-right">cpf</label>
          <input
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={e => {
              const value = e.target.value.replace(/\D/g, ''); // Apenas dígitos
              if (value.length <= 11) {
                setCpf(value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
              } else {
                setCpf(value.substring(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>

        {/* Campo tipo de documento */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 font-medium text-right">tipo de documento</label>
          <select
            value={documentType}
            onChange={e => setDocumentType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          >
            <option value="request">Solicitação</option>
            <option value="authorization">Autorização</option>
            <option value="certificate">Atestado</option>
            <option value="result">Laudo/Resultado</option>
            <option value="prescription">Prescrição</option>
            <option value="invoice">Nota Fiscal</option>
          </select>
        </div>

        {/* Campo arquivo */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 font-medium text-right">arquivo</label>
          <div className="border border-dashed border-[#10B981] rounded-lg p-4 text-center bg-gray-50">
            <label htmlFor="file-upload" className="cursor-pointer text-[#10B981] font-semibold block whitespace-pre-line">
              {file ? `Arquivo selecionado: ${file.name}` : 'Clique para\nselecionar Documento/\nArquivo'}
            </label>
            <input
              id="file-upload"
              data-testid="file-upload"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {fileHash && (
            <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded border border-gray-200">
              <span className="font-semibold">Hash SHA-256:</span>
              <br />
              <span className="font-mono break-all">{fileHash}</span>
            </div>
          )}
        </div>

        {/* Indicador de Progresso do Upload */}
        {loading && file && (
          <UploadProgressIndicator
            fileName={file.name}
            progress={uploadProgress}
            status={uploadStatus}
            className="mt-2"
          />
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`w-full mt-6 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg py-3 font-semibold text-base transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Enviando...' : 'Enviar Documento'}
      </button>
      {success && (
        <div className="text-green-600 mt-2 text-center font-medium" data-testid="success-message">
          {success}
        </div>
      )}

    </form>
      <button
        onClick={handleLogout}
        className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 font-semibold text-base transition-colors"
      >
        Sair
      </button>
    </div>
  );
}