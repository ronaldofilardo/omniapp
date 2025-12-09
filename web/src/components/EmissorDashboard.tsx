import React from 'react';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

interface Report {
  id: string;
  protocol: string;
  title: string;
  status: 'SENT' | 'RECEIVED' | 'VIEWED' | 'ARCHIVED';
  sentAt: string;
  receivedAt?: string;
  viewedAt?: string;
  fileHash?: string;
  receiver: {
    name: string;
    cpf?: string;
  };
}

export function EmissorDashboard() {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Erro ao carregar laudos');
      const data = await response.json();
      setReports(data.reports);
    } catch (err) {
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: Report['status']) => {
    switch (status) {
      case 'SENT': return 'Enviado';
      case 'RECEIVED': return 'Recebido';
      case 'VIEWED': return 'Visualizado';
      case 'ARCHIVED': return 'Arquivado';
      default: return status;
    }
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'SENT': return 'text-blue-600';
      case 'RECEIVED': return 'text-yellow-600';
      case 'VIEWED': return 'text-green-600';
      case 'ARCHIVED': return 'text-gray-600';
      default: return '';
    }
  };

  if (loading) return <div className="p-4">Carregando...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-2 sm:p-4 w-full max-w-5xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-center md:text-left">Laudos Enviados</h2>

      {/* Versão Desktop/Tablet */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <th className="px-2 py-2">Protocolo</th>
              <th className="px-2 py-2">Data Envio</th>
              <th className="px-2 py-2">Destinatário</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Data Recebimento</th>
              <th className="px-2 py-2">Data Visualização</th>
              <th className="px-2 py-2">Hash do Arquivo</th>
              <th className="px-2 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="text-xs md:text-sm">
                <td className="px-2 py-2 break-all max-w-[120px]">{report.protocol}</td>
                <td className="px-2 py-2">{formatDate(report.sentAt)}</td>
                <td className="px-2 py-2">{report.receiver.name}</td>
                <td className={getStatusColor(report.status) + ' px-2 py-2'}>
                  {getStatusLabel(report.status)}
                </td>
                <td className="px-2 py-2">{report.receivedAt ? formatDate(report.receivedAt) : '-'}</td>
                <td className="px-2 py-2">{report.viewedAt ? formatDate(report.viewedAt) : '-'}</td>
                <td className="px-2 py-2 break-all max-w-[200px] font-mono text-xs">{report.fileHash || '-'}</td>
                <td className="px-2 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="Funcionalidade disponível em breve"
                  >
                    Reavisar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Versão Mobile */}
      <div className="md:hidden space-y-4">
        {reports.map((report) => (
          <Card key={report.id} className="p-3 sm:p-4">
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex flex-row justify-between items-center">
                <div className="font-semibold text-sm">Protocolo: {report.protocol}</div>
                <div className={`${getStatusColor(report.status)} font-medium text-xs`}>{getStatusLabel(report.status)}</div>
              </div>
              <div className="text-xs text-gray-600">Enviado em: {formatDate(report.sentAt)}</div>
            </div>
            <div className="text-xs space-y-1">
              <div>Destinatário: {report.receiver.name}</div>
              {report.receiver.cpf && (
                <div className="text-[10px] text-gray-500">CPF: {report.receiver.cpf}</div>
              )}
              {report.receivedAt && (
                <div>Recebido em: {formatDate(report.receivedAt)}</div>
              )}
              {report.viewedAt && (
                <div>Visualizado em: {formatDate(report.viewedAt)}</div>
              )}
              {report.fileHash && (
                <div className="font-mono text-[10px] break-all">Hash: {report.fileHash}</div>
              )}
            </div>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled
                title="Funcionalidade disponível em breve"
              >
                Reavisar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}