"use client";
import React, { useEffect, useState } from 'react';
import { formatTime } from '../lib/utils'
import { format, toZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale/pt-BR'
import { updateAuditLogStatus } from '@/lib/services/auditService'
import { SLOT_FILE_LIMITS, getFileTooLargeError } from '../lib/constants/fileLimits'

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
}

interface NotificationDirect {
  id: string;
  protocol: string;
  title: string;
  fileName: string;
  fileUrl: string;
  status: string;
  notificationId: string;
}

type NotificationUnion =
  | { id: string; payload: NotificationPayloadLab }
  | { id: string; payload: NotificationPayloadReport }
  | NotificationDirect;

interface Professional {
  id: string;
  name: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  professionalId: string;
  files?: { slot: string; name: string; url: string }[];
}


interface AssociateNotificationModalProps {
   notification: NotificationUnion | null;
   open: boolean;
   onClose: () => void;
   onSuccess: () => Promise<void>;
   userId: string;
 }

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

export default function AssociateNotificationModal({ notification, open, onClose, onSuccess, userId }: AssociateNotificationModalProps) {

  useEffect(() => {
    if (open) {
      fetch('/api/professionals')
        .then(res => res.json())
        .then(data => setProfessionals(Array.isArray(data) ? data : []));
    }
  }, [open]);

  useEffect(() => {
    if (open && userId) {
      const fetchAllEvents = async () => {
        const allEvents: Event[] = [];
        let page = 1;
        const limit = 1000;
        let hasNext = true;

        while (hasNext) {
          try {
            const res = await fetch(`/api/events?userId=${encodeURIComponent(userId)}&limit=${limit}&page=${page}`);
            if (!res.ok) {
              throw new Error(`Erro ao buscar eventos: ${res.status}`);
            }
            const data = await res.json();
            const eventsData = Array.isArray(data) ? data : data.events || [];
            const pagination = data.pagination;

            allEvents.push(...eventsData);

            // Verificar se há mais páginas
            hasNext = pagination ? pagination.hasNext : false;
            page++;
          } catch (error) {
            console.error('Erro ao buscar página de eventos:', error);
            setError('Erro ao buscar eventos.');
            break;
          }
        }

        setEvents(allEvents);
      };

      fetchAllEvents();
    }
  }, [open, userId]);

  // ...restante do componente...

  // Detecta o tipo de payload
  const isLabPayload = (payload: any): payload is NotificationPayloadLab =>
    payload && typeof payload.doctorName === 'string' && typeof payload.examDate === 'string' && payload.report;

  const isDirectNotification = (notification: NotificationUnion): notification is NotificationDirect =>
    'fileUrl' in notification && 'fileName' in notification;
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetch('/api/professionals')
        .then(res => res.json())
        .then(data => setProfessionals(Array.isArray(data) ? data : []));
    }
  }, [open]);

  const handleAssociate = async (overwrite = false) => {
    if (!selectedEvent || !notification) return;
    setLoading(true);
    setError(null);
    try {
      const event = events.find(ev => ev.id === selectedEvent);
      if (!event) throw new Error('Evento não encontrado.');

      let slot: string;
      let fileName: string;
      let fileContent: string;
      let documentType: string;

      if ('payload' in notification && isLabPayload(notification.payload)) {
        // Payload de laudo
        slot = getSlotForDocumentType(notification.payload.documentType || 'result');
        fileName = notification.payload.report.fileName;
        fileContent = notification.payload.report.fileContent;
        documentType = notification.payload.documentType || 'result';
      } else if (isDirectNotification(notification)) {
            // Notificação direta
            slot = 'result'; // Default para notificações diretas
            fileName = notification.fileName;
            // Extrair base64 do fileUrl. Se for um data url, pega direto, senão tenta baixar o conteúdo e converter em base64
            const base64Match = notification.fileUrl.match(/^data:[^;]+;base64,(.+)$/);
            if (base64Match) {
              fileContent = base64Match[1];
            } else {
              // Tentativa de baixar o arquivo remoto para garantir que enviamos o content (base64) para o backend
              try {
                const r = await fetch(notification.fileUrl);
                if (r && r.ok && typeof r.arrayBuffer === 'function') {
                  const buffer = await r.arrayBuffer();
                  // Converte ArrayBuffer para base64 compatível com browser e node
                  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
                    // Node environment
                    if (typeof Buffer !== 'undefined') {
                      try { return Buffer.from(buffer).toString('base64') } catch { /* fallback */ }
                    }
                    // Browser environment
                    try {
                      let binary = '';
                      const bytes = new Uint8Array(buffer);
                      const chunkSize = 0x8000;
                      for (let i = 0; i < bytes.length; i += chunkSize) {
                        binary += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes.subarray(i, i + chunkSize)) as any);
                      }
                      return btoa(binary);
                    } catch (err) {
                      console.error('Erro ao converter ArrayBuffer para base64', err);
                      return '';
                    }
                  }
                  fileContent = arrayBufferToBase64(buffer);
                } else {
                  fileContent = '';
                }
              } catch (e) {
                console.error('Erro ao baixar arquivo remoto para associar:', e);
                fileContent = '';
              }
            }
        documentType = 'result';
      } else {
        throw new Error('Tipo de notificação não suportado.');
      }

      // Validar tamanho do arquivo
      const fileSizeBytes = Buffer.byteLength(fileContent, 'base64');
      const maxFileSize = SLOT_FILE_LIMITS[slot as keyof typeof SLOT_FILE_LIMITS] || SLOT_FILE_LIMITS.result;

      if (fileSizeBytes > maxFileSize) {
        throw new Error(getFileTooLargeError(fileSizeBytes, slot as keyof typeof SLOT_FILE_LIMITS));
      }

      const newFile = {
        slot: slot,
        name: fileName,
        url: `/uploads/${event.id}/${slot}-${fileName}`,
        physicalPath: `/uploads/${event.id}/${slot}-${fileName}`,
        uploadDate: new Date().toISOString(),
        content: fileContent // base64
      };

      // Remove duplicatas do mesmo slot
      const files = [
        ...(event.files?.filter(f => f.slot !== slot) || []),
        newFile
      ];

      // Função auxiliar para converter data/hora para os formatos esperados pela API
      const formatDateForAPI = (dateValue: string | Date) => {
        if (!dateValue) return '';
        try {
          // Se já é uma string no formato YYYY-MM-DD, retorna direto
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
          }
          // Se é um Date, converte para YYYY-MM-DD sem problema de timezone
          const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
          if (isNaN(date.getTime())) return '';
          // Usar toISOString garante formato correto mas pode ter problema de timezone
          // Melhor usar getFullYear, getMonth, getDate
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (e) {
          return '';
        }
      };

      const formatTimeForAPI = (timeValue: string | Date) => {
        if (!timeValue) return '';
        try {
          // Se já é uma string no formato HH:mm, retorna direto
          if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue)) {
            const [h, m] = timeValue.split(':');
            return `${h.padStart(2, '0')}:${m}`;
          }
          // Se é uma string ISO ou Date, extrai apenas as horas
          const time = timeValue instanceof Date ? timeValue : new Date(timeValue);
          if (isNaN(time.getTime())) return '';
          // Retorna sempre no formato HH:mm
          const hours = time.getHours().toString().padStart(2, '0');
          const minutes = time.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        } catch (e) {
          return '';
        }
      };

      const payload = {
        id: event.id,
        title: event.title,
        date: formatDateForAPI(event.date),
        type: event.type,
        professionalId: event.professionalId,
        files,
        notificationId: notification.id
        // Não incluir startTime e endTime para evitar validação desnecessária
        // quando apenas associando notificação a evento existente
      };

      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-slot': slot
        },
        body: JSON.stringify(payload),
      });

      console.log(`[AssociateModal] Response status: ${res.status}`)
      if (res.ok) {
        const updatedEvent = await res.json();
        console.log(`[AssociateModal] Evento atualizado:`, updatedEvent);
        console.log(`[AssociateModal] Arquivos do evento:`, updatedEvent.files);
      }
      if (res.status === 409) {
        // Backend retornou conflito, perguntar ao usuário
        setShowOverwritePrompt(true);
        setPendingPayload(payload);
        setLoading(false);
        return;
      }

      // Atualizar status do laudo para VIEWED se for lab payload
      if ('payload' in notification && isLabPayload(notification.payload)) {
        const reportId = (notification.payload as any).reportId;
        if (reportId) {
          try {
            console.log('Atualizando status do laudo para VIEWED (associação):', reportId);
            const response = await fetch(`/api/reports/${reportId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'VIEWED' })
            });
            if (response.ok) {
              console.log('Status do laudo atualizado com sucesso para VIEWED (associação)');
            } else {
              console.error('Erro na resposta da API:', response.status, response.statusText);
            }
          } catch (error) {
            console.error('Erro ao atualizar status do laudo:', error);
          }
        }
      }

      // Atualizar AuditLog para marcar como recebido
      let protocol: string | null = null;
      if ('payload' in notification && 'protocol' in notification.payload) {
        protocol = notification.payload.protocol;
      } else if (isDirectNotification(notification)) {
        protocol = notification.protocol;
      }
      if (protocol) {
        await updateAuditLogStatus(protocol, 'SUCCESS');
      }

      // Marcar notificação como READ
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READ' })
        });
      } catch (error) {
        console.error('Erro ao marcar notificação como READ:', error);
      }

      if (!res.ok) throw new Error('Erro ao associar notificação.');
      await onSuccess();
      onClose();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro ao associar notificação.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const reloadEvents = async () => {
    try {
      // Recarrega eventos - buscar todas as páginas
      const allEvents: Event[] = [];
      let page = 1;
      const limit = 1000;
      let hasNext = true;

      while (hasNext) {
        const resEvents = await fetch(`/api/events?userId=${encodeURIComponent(userId)}&limit=${limit}&page=${page}`);
        if (!resEvents.ok) break;
        const dataEvents = await resEvents.json();
        const eventsData = Array.isArray(dataEvents) ? dataEvents : dataEvents.events || [];
        const pagination = dataEvents.pagination;

        allEvents.push(...eventsData);

        hasNext = pagination ? pagination.hasNext : false;
        page++;
      }

      setEvents(allEvents);

      // Recarrega profissionais
      const resProfs = await fetch('/api/professionals');
      const dataProfs = await resProfs.json();
      setProfessionals(Array.isArray(dataProfs) ? dataProfs : []);
    } catch {
      setEvents([]);
      setProfessionals([]);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!pendingPayload || !notification) return;
    setShowOverwritePrompt(false);
    setLoading(true);
    setError(null);
    try {
      // Determinar o slot baseado no tipo de notificação
      let slot: string;
      if (isDirectNotification(notification)) {
        slot = 'result';
      } else if (isLabPayload(notification.payload)) {
        slot = getSlotForDocumentType(notification.payload.documentType || 'result');
      } else {
        slot = 'result';
      }

      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-overwrite-result': 'true',
          'x-slot': slot,
        },
        body: JSON.stringify(pendingPayload),
      });

      // Atualizar status do laudo para VIEWED se for lab payload
      if (!isDirectNotification(notification) && isLabPayload(notification.payload)) {
        const reportId = (notification.payload as any).reportId;
        if (reportId) {
          try {
            const viewedTimestamp = new Date().toISOString();
            console.log(`[VIEWED] Registrando visualização do laudo ${reportId} em ${viewedTimestamp}`);
            const response = await fetch(`/api/reports/${reportId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'VIEWED' })
            });
            if (response.ok) {
              console.log(`[VIEWED] Visualização do laudo ${reportId} registrada com sucesso em ${viewedTimestamp}`);
            } else {
              console.error(`[VIEWED] Erro ao registrar visualização do laudo ${reportId}:`, response.status, response.statusText);
            }
          } catch (error) {
            console.error(`[VIEWED] Erro ao registrar visualização do laudo ${reportId}:`, error);
          }
        }
      }

      if (!res.ok) throw new Error('Erro ao sobrescrever laudo.');
      await reloadEvents();
      await onSuccess();
      onClose();
    } catch (e) {
      setError('Erro ao sobrescrever laudo.');
      await reloadEvents();
    } finally {
      setLoading(false);
      setPendingPayload(null);
    }
  };

  const handleCancelOverwrite = async () => {
    setShowOverwritePrompt(false);
    setPendingPayload(null);
    await reloadEvents();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 min-w-[340px] max-w-full p-8 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#1E40AF] mb-2">Associar a Evento Existente</h3>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {showOverwritePrompt && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-900">
            Já existe um laudo para este evento.<br />Deseja sobrescrever o arquivo existente?
            <div className="flex gap-2 mt-3 justify-end">
              <button
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 rounded-lg bg-[#1E40AF] text-white font-medium hover:bg-[#2563EB]"
                disabled={loading}
              >
                Sobrescrever
              </button>
              <button
                onClick={handleCancelOverwrite}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        <select
          value={selectedEvent}
          onChange={e => setSelectedEvent(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        >
          <option value="">Selecione um evento</option>
          {events.map(ev => {
            // Formatar data usando a mesma lógica da Timeline para consistência
            let dataFormatada = ev.date;
            
            // Extrair apenas a parte da data se vier em formato ISO completo
            let dateOnly = ev.date;
            if (typeof ev.date === 'string') {
              // Se contém 'T', é formato ISO completo - extrair apenas YYYY-MM-DD
              if (ev.date.includes('T')) {
                dateOnly = ev.date.split('T')[0];
              }
              
              try {
                // Parsing manual para evitar problemas de timezone
                const [year, month, day] = dateOnly.split('-').map(Number);
                if (year && month && day) {
                  const date = new Date(year, month - 1, day);
                  dataFormatada = format(toZonedTime(date, 'America/Sao_Paulo'), 'dd/MM/yyyy', {
                    locale: ptBR,
                  });
                }
              } catch (e) {
                // Fallback: manter como está
                dataFormatada = dateOnly;
              }
            }
            
            // Tipo amigável
            let tipo = ev.type === 'CONSULTATION' ? 'CONSULTA' : ev.type === 'EXAM' ? 'EXAME' : ev.type === 'PROCEDURE' ? 'PROCEDIMENTO' : ev.type === 'MEDICATION' ? 'MEDICAÇÃO' : ev.type;
            
            // Nome do profissional
            const prof = professionals.find(p => p.id === ev.professionalId);
            const profName = prof ? prof.name : '';
            
            // Formatar horários - extrair apenas HH:mm sem conversão de timezone
            let horarioFormatado = '';
            if (ev.startTime && ev.endTime) {
              // Função para normalizar horário para HH:mm SEM conversão de timezone
              const normalizeTime = (time: string | Date): string => {
                if (!time) return '';
                
                // Se já está no formato HH:mm simples, retorna direto
                if (typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time)) {
                  const [h, m] = time.split(':');
                  return `${h.padStart(2, '0')}:${m}`;
                }
                
                // Se é string ISO (ex: "2024-12-03T09:00:00.000Z"), extrair apenas HH:mm
                if (typeof time === 'string' && time.includes('T')) {
                  // Extrair a parte do horário da string ISO e converter para local
                  try {
                    const date = new Date(time);
                    if (!isNaN(date.getTime())) {
                      // getHours() já retorna a hora local
                      const hours = date.getHours().toString().padStart(2, '0');
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      return `${hours}:${minutes}`;
                    }
                  } catch (e) {
                    // Se falhar, tenta extrair diretamente do padrão ISO
                  }
                }
                
                // Se é string com outros caracteres, tentar extrair HH:mm
                if (typeof time === 'string') {
                  // Tentar extrair HH:mm de qualquer formato
                  const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
                  if (timeMatch) {
                    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
                  }
                }
                
                // Se é Date object
                if (time instanceof Date && !isNaN(time.getTime())) {
                  const hours = time.getHours().toString().padStart(2, '0');
                  const minutes = time.getMinutes().toString().padStart(2, '0');
                  return `${hours}:${minutes}`;
                }
                
                return String(time);
              };
              
              const startNormalized = normalizeTime(ev.startTime);
              const endNormalized = normalizeTime(ev.endTime);
              
              // Formatar para exibição sem segundos
              const formatForDisplay = (time: string): string => {
                if (!time) return '';
                const [h, m] = time.split(':');
                // Remove zero à esquerda da hora se for menor que 10
                const hour = parseInt(h, 10);
                return `${hour}:${m}`;
              };
              
              horarioFormatado = `${formatForDisplay(startNormalized)} - ${formatForDisplay(endNormalized)}`;
            }
            
            // Formato igual à Timeline: TIPO - PROFISSIONAL - DD/MM/YYYY HH:MM - HH:MM
            const displayText = `${tipo}${profName ? ` - ${profName}` : ''} - ${dataFormatada}${horarioFormatado ? ` ${horarioFormatado}` : ''}`;
            
            return (
              <option key={ev.id} value={ev.id}>
                {displayText}
              </option>
            );
          })}
        </select>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleAssociate(false)}
            disabled={loading || !selectedEvent}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${loading || !selectedEvent ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1E40AF] hover:bg-[#2563EB]'}`}
          >
            Associar
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
