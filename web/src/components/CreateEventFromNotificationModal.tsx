
"use client";
// Função auxiliar para decodificar base64 em Node e browser (removida, não necessária)
import React, { useState } from 'react';
import { updateAuditLogStatus } from '@/lib/services/auditService';

const getSlotForDocumentType = (documentType: string) => {
  const slotMap = {
    request: 'request',
    authorization: 'authorization',
    certificate: 'certificate',
    result: 'result',
    prescription: 'prescription',
    invoice: 'invoice'
  };
  return slotMap[documentType as keyof typeof slotMap] || 'result';
};

// Função para detectar MIME type a partir do conteúdo base64
function detectMimeType(base64Content: string): string {
  if (base64Content.startsWith('/9j/4AAQSkZJRgABAQAAAQABAAD/')) {
    return 'image/jpeg';
  }
  if (base64Content.startsWith('iVBORw0KGgo')) {
    return 'image/png';
  }
  if (base64Content.startsWith('R0lGOD')) {
    return 'image/gif';
  }
  if (base64Content.startsWith('UklGR')) {
    return 'image/webp';
  }
  // Fallback para PDF se não reconhecer
  return 'application/pdf';
}

interface Professional {
  id: string;
  name: string;
  specialty?: string;
}

interface NotificationPayloadLab {
  doctorName: string;
  examDate: string;
  report: {
    fileName: string;
    fileContent: string;
  };
  documentType?: string;
}

interface NotificationPayloadReport {
  reportId: string;
  title: string;
  protocol: string;
  documentType?: string;
}

type NotificationUnion =
  | { id: string; payload: NotificationPayloadLab }
  | { id: string; payload: NotificationPayloadReport };

interface CreateEventFromNotificationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notification: NotificationUnion;
  professionalId: string;
  userId: string;
  refreshProfessionals?: () => void;
}

export default function CreateEventFromNotificationModal({ open, onClose, onSuccess, notification, professionalId, userId, refreshProfessionals }: CreateEventFromNotificationModalProps) {
  // Detecta o tipo de payload
  const isLabPayload = (payload: any): payload is NotificationPayloadLab =>
    payload && typeof payload.doctorName === 'string' && typeof payload.examDate === 'string' && !!payload.report;

  const initialTitle = isLabPayload(notification.payload)
    ? 'Laudo: ' + notification.payload.report.fileName
    : 'Novo Evento';
  const initialDate = isLabPayload(notification.payload)
    ? notification.payload.examDate
    : '';

  // Definir horários baseados no horário atual para notificações de laudo
  const getCurrentTimeBasedTimes = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Hora de início: horário atual
    const startHour = currentHour.toString().padStart(2, '0');
    const startMinute = currentMinute.toString().padStart(2, '0');
    const startTimeStr = `${startHour}:${startMinute}`;
    
    // Hora de fim: horário atual + 1 minuto
    const endDate = new Date(now.getTime() + 60 * 1000); // +1 minuto
    const endHour = endDate.getHours().toString().padStart(2, '0');
    const endMinute = endDate.getMinutes().toString().padStart(2, '0');
    const endTimeStr = `${endHour}:${endMinute}`;
    
    return { startTime: startTimeStr, endTime: endTimeStr };
  };

  const currentTimes = getCurrentTimeBasedTimes();

  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(isLabPayload(notification.payload) ? currentTimes.startTime : '09:00');
  const [endTime, setEndTime] = useState(isLabPayload(notification.payload) ? currentTimes.endTime : '09:30');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [eventType, setEventType] = useState<'CONSULTA' | 'EXAME'>('EXAME');

  // Carregar profissionais ao abrir o modal
  React.useEffect(() => {
    if (open) {
      fetch(`/api/professionals?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => {
          const arr = Array.isArray(data) ? data : [];
          setProfessionals(arr);
        })
        .catch(() => setError('Erro ao buscar profissionais.'));
    }
  }, [open, userId, isLabPayload(notification.payload) ? notification.payload.doctorName : undefined]);

  const handleCreate = async () => {

    setLoading(true);
    setError(null);
    const isLab = isLabPayload(notification.payload);
    console.log('[handleCreate] Starting...');
    console.log('[handleCreate] selectedProfessional:', selectedProfessional);
    console.log('[handleCreate] isLabPayload result:', isLab);
    console.log('[handleCreate] notification.payload:', notification.payload);
    try {
      // Validação de campos obrigatórios
      if (!title || !date || !startTime || !endTime) {
        setError('Preencha todos os campos obrigatórios.');
        setLoading(false);
        return;
      }

      let finalProfessionalId = selectedProfessional;
      // Sempre cria novo profissional se selectedProfessional for string vazia e for laudo
      if (selectedProfessional === '' && isLab) {
        console.log('[handleCreate] Creating professional...');
        const doctorName = (notification.payload as NotificationPayloadLab).doctorName;
        
        console.log('[handleCreate] About to fetch /api/professionals with doctorName:', doctorName);
        const createRes = await fetch('/api/professionals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: doctorName,
            specialty: 'A ser definido',
            userId: userId
          })
        });
        console.log('[handleCreate] fetch completed, createRes.ok:', createRes.ok);
        
        if (!createRes.ok) {
          setError('Erro ao criar profissional.');
          setLoading(false);
          if (refreshProfessionals) await refreshProfessionals();
          return;
        }
        
        const createdProf = await createRes.json();
        console.log('[handleCreate] createdProf:', createdProf);
        finalProfessionalId = createdProf?.id || createdProf?.insertedId;
        
        if (!finalProfessionalId) {
          setError('Erro ao criar profissional.');
          setLoading(false);
          if (refreshProfessionals) await refreshProfessionals();
          return;
        }
        
        if (refreshProfessionals) await refreshProfessionals();
      }
      // Se ainda estiver vazio, tenta usar o professionalId prop
      if (!finalProfessionalId) {
        finalProfessionalId = professionalId;
      }


      // 2. Criar evento com o arquivo base64 diretamente
      const files = [];
      if (isLabPayload(notification.payload)) {
        const mimeType = detectMimeType(notification.payload.report.fileContent);
        const slot = getSlotForDocumentType(notification.payload.documentType || 'result');
        files.push({
          slot: slot,
          name: notification.payload.report.fileName,
          url: `data:${mimeType};base64,${notification.payload.report.fileContent}`,
          physicalPath: `data:${mimeType};base64,${notification.payload.report.fileContent}`,
          uploadDate: new Date().toISOString()
        });
      }

      // Definir observação baseada no tipo de documento
      let finalObservation = observation;
      if (notification.payload.documentType) {
        const documentTypeLabels = {
          request: 'Solicitação enviada pelo app Omni',
          authorization: 'Autorização enviada pelo app Omni',
          certificate: 'Atestado enviada pelo app Omni',
          result: 'Laudo enviado pelo app Omni',
          prescription: 'Prescrição enviada pelo app Omni',
          invoice: 'Nota Fiscal enviada pelo app Omni'
        };
        finalObservation = documentTypeLabels[notification.payload.documentType as keyof typeof documentTypeLabels] || 'Documento enviado pelo app Omni';
      } else {
        finalObservation = 'Laudo enviado pelo app Omni';
      }

      const res = await fetch(`/api/events?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: 'laudo enviado pelo app Omni',
          observation: finalObservation,
          date,
          startTime,
          endTime,
          type: eventType,
          professionalId: finalProfessionalId,
          files,
          notificationId: notification.id
        })
      });
      if (!res.ok) {
        setError('Erro ao criar evento.');
        setLoading(false);
        return;
      }
      const createdEvent = await res.json();

      // Atualizar status do laudo para VIEWED
      // Para notificações de laudo, o reportId está no payload
      const reportId = (notification.payload as any).reportId;
      if (reportId) {
        try {
          const viewedTimestamp = new Date().toISOString();
          // eslint-disable-next-line no-console
          console.log(`[VIEWED] Registrando visualização do laudo ${reportId} em ${viewedTimestamp}`);
          const response = await fetch(`/api/reports/${reportId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'VIEWED' })
          });
          if (response.ok) {
            // eslint-disable-next-line no-console
            console.log(`[VIEWED] Visualização do laudo ${reportId} registrada com sucesso em ${viewedTimestamp}`);
          } else {
            // eslint-disable-next-line no-console
            console.error(`[VIEWED] Erro ao registrar visualização do laudo ${reportId}:`, response.status, response.statusText);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`[VIEWED] Erro ao registrar visualização do laudo ${reportId}:`, error);
        }
      }

      // Atualizar AuditLog para marcar como recebido
      let protocol: string | null = null;
      if ('protocol' in notification.payload) {
        protocol = notification.payload.protocol;
      }
      if (protocol) {
        await updateAuditLogStatus(protocol, 'SUCCESS');
      }

      // Marcar notificação como READ quando o evento é criado
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READ' })
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Erro ao marcar notificação como READ:', error);
      }
      onSuccess();
      onClose();
    } catch (e) {
  // Erros gerais não tratados
  console.error('[handleCreate] Caught error:', e);
  setError('Erro inesperado.');
  setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 min-w-[360px] max-w-full p-8 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#1E40AF] mb-2">Criar Novo Evento a partir do Laudo</h3>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        
        {/* Dropdown de tipo de evento - apenas para documentos públicos */}
        {notification.payload.documentType && (
          <div className="flex flex-col gap-2 mb-2">
            <label className="text-sm text-gray-700 font-medium">Tipo de Evento</label>
            <select
              value={eventType}
              onChange={e => setEventType(e.target.value as 'CONSULTA' | 'EXAME')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            >
              <option value="CONSULTA">Consulta</option>
              <option value="EXAME">Exame</option>
            </select>
          </div>
        )}
        
        <div className="flex flex-col gap-2 mb-2">
          <label className="text-sm text-gray-700 font-medium">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
        </div>
        <div className="flex flex-col gap-2 mb-2">
          <label htmlFor="professional" className="block text-sm font-medium text-gray-700">Médico Solicitante</label>
          <select 
            id="professional"
            value={selectedProfessional}
            onChange={(e) => setSelectedProfessional(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#10B981] focus:ring-[#10B981] sm:text-sm text-gray-900 bg-white"
          >
            <option value="">
              {isLabPayload(notification.payload)
                ? notification.payload.doctorName + ' (Novo)'
                : 'Novo'}
            </option>
            {professionals.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.name}{prof.specialty ? ` - ${prof.specialty}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 mb-2">
          <label className="text-sm text-gray-700 font-medium">Data do exame</label>
          <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
        </div>
        <div className="flex gap-4 mb-2">
          <div className="flex flex-col flex-1">
            <label className="text-sm text-gray-700 font-medium">Início</label>
            <input value={startTime} onChange={e => setStartTime(e.target.value)} type="time" className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
          </div>
          <div className="flex flex-col flex-1">
            <label className="text-sm text-gray-700 font-medium">Fim</label>
            <input value={endTime} onChange={e => setEndTime(e.target.value)} type="time" className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
          </div>
        </div>
        <div className="flex flex-col gap-2 mb-2">
          <label className="text-sm text-gray-700 font-medium">Observação</label>
          <textarea
            value={observation}
            onChange={e => setObservation(e.target.value)}
            placeholder="Digite uma observação (opcional)"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button
            onClick={handleCreate}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#10B981] hover:bg-[#059669]'}`}
          >
            Criar Evento
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
