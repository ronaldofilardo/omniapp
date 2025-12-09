'use client';


import { useEffect, useState } from 'react';

interface Document {
  protocol: string;
  patientName: string;
  emitterName: string | null;
  emitterCnpj: string | null;
  createdAt: string;
  fileName: string;
  fileHash: string | null;
  documentType: string;
  status: string;
  receiverCpf: string;
  receivedAt: string;
  origin: string;
}


export function ReportsDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setError(null);
        const response = await fetch('/api/reports?page=1&limit=100');
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, response.statusText, errorText);
          throw new Error(`Falha ao carregar documentos: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('API Response:', data);
        // Map reports to documents format
        const mappedDocuments = data.reports.map((report: any) => ({
          protocol: report.protocol,
          patientName: report.receiver?.name || null,
          emitterName: report.sender?.name || null,
          emitterCnpj: report.sender?.emissorInfo?.cnpj || null,
          createdAt: report.sentAt,
          fileName: report.fileName,
          fileHash: report.fileHash,
          documentType: 'result',
          status: report.status === 'VIEWED' ? 'SUCCESS' :
                  report.status === 'RECEIVED' ? 'RECEIVED' :
                  report.status === 'DELIVERED' ? 'DELIVERED' :
                  report.status === 'SENT' ? 'PROCESSING' :
                  report.status,
          receiverCpf: report.receiver?.cpf || null,
          receivedAt: report.receivedAt,
          origin: 'PORTAL_EMISSOR',
        }));
        setDocuments(mappedDocuments);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Erro ao carregar relatórios:', error);
        setError(errorMessage);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);


  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar documentos</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Laudos</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Protocolo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Arquivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hash
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paciente ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Destinatário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Emissor (CNPJ)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data de Envio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data de Recebimento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc, idx) => (
              <tr key={doc.protocol || idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.protocol}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.fileName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.fileHash || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.patientName || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.receiverCpf || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.emitterCnpj ? doc.emitterCnpj : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(doc.createdAt).toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.receivedAt ? new Date(doc.receivedAt).toLocaleString('pt-BR') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full
                    ${doc.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                    doc.status === 'DELIVERED' ? 'bg-yellow-100 text-yellow-800' :
                    doc.status === 'RECEIVED' ? 'bg-orange-100 text-orange-800' :
                    doc.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'}`}>
                    {doc.status === 'PROCESSING' ? 'Enviado' :
                     doc.status === 'DELIVERED' ? 'Entregue' :
                     doc.status === 'RECEIVED' ? 'Recebido' :
                     doc.status === 'SUCCESS' ? 'Visualizado' :
                     doc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}