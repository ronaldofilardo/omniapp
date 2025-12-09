"use client";
import React, { useEffect, useState } from 'react';
import AssociateNotificationModal from './AssociateNotificationModal';
import CreateEventFromNotificationModal from './CreateEventFromNotificationModal';
import { Bell } from 'lucide-react';

export interface NotificationPayload {
  doctorName: string;
  examDate: string;
  report: {
    fileName: string;
    fileContent: string;
  };
  reportId?: string;
  documentType?: string;
}

export interface Notification {
  id: string;
  type: string;
  payload: NotificationPayload;
  createdAt: string;
  status: string;
}

export interface DirectNotification {
  id: string;
  protocol: string;
  title: string;
  fileName: string;
  fileUrl: string;
  status: string;
  notificationId: string;
  sender: { name: string; emissorInfo?: any };
  receiver: { name: string; cpf: string };
  sentAt: string;
  receivedAt: string;
  viewedAt: string;
}

interface Professional {
  id: string;
  name: string;
}

interface NotificationCenterProps {
   userId: string
   onProfessionalCreated?: () => Promise<void>
 }

export default function NotificationCenter({ userId, onProfessionalCreated }: NotificationCenterProps) {
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [associateModal, setAssociateModal] = useState<{ open: boolean; notification: Notification | null }>({ open: false, notification: null });
   const [createModal, setCreateModal] = useState<{ open: boolean; notification: Notification | null }>({ open: false, notification: null });
   const [professionalId, setProfessionalId] = useState<string>('');
   const [professionals, setProfessionals] = useState<Professional[]>([]);
   const [mounted, setMounted] = useState(false);

  // Buscar profissionais (salva todos)
  useEffect(() => {
    setMounted(true);
    // Compatível com testes unitários e integração
    const url = userId ? `/api/professionals?userId=${encodeURIComponent(userId)}` : '/api/professionals';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProfessionals(data);
      });
  }, [userId]);

  const registerAccess = async (notifications: Notification[]) => {
    const accessTimestamp = new Date().toISOString();
    console.log(`[NotificationCenter] ${notifications.length} notificações carregadas em ${accessTimestamp}`);

    for (const notification of notifications) {
      const reportId = (notification.payload as any).reportId;
      if (reportId) {
        try {
          console.log(`[RECEIVED] Registrando acesso ao laudo ${reportId} em ${accessTimestamp}`);
          const response = await fetch(`/api/reports/${reportId}/access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessTimestamp })
          });
          if (response.ok) {
            console.log(`[RECEIVED] Acesso ao laudo ${reportId} registrado com sucesso em ${accessTimestamp}`);
          } else {
            console.error(`[RECEIVED] Erro ao registrar acesso ao laudo ${reportId}:`, response.status, response.statusText);
          }
        } catch (error) {
          console.error(`[RECEIVED] Erro ao registrar acesso ao laudo ${reportId}:`, error);
        }
      }
    }
  };

  const fetchNotifications = async () => {
    console.log('[NotificationCenter] Starting fetchNotifications');
    setLoading(true);
    if (!userId) {
      console.log('[NotificationCenter] No userId, returning early');
      return;
    }

    try {
      console.log('[NotificationCenter] Fetching notifications for userId:', userId);
      // Buscar notificações
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      console.log('[NotificationCenter] Fetch response status:', res.status);
      if (!res.ok) {
        throw new Error('Erro ao carregar notificações.');
      }
      const data = await res.json();
      console.log('[NotificationCenter] Raw data received:', data);
      const notificationsData = Array.isArray(data) ? data : data.notifications || [];
      console.log('[NotificationCenter] Processed notificationsData:', notificationsData);

      setNotifications(notificationsData);
      setLoading(false);
      console.log('[NotificationCenter] Loading set to false, notifications set');

      // Registrar acesso aos laudos após carregar com sucesso
      if (notificationsData.length > 0) {
        console.log('[NotificationCenter] Registering access for notifications');
        await registerAccess(notificationsData);
      } else {
        console.log('[NotificationCenter] No notifications to register access for');
      }
    } catch (error) {
      console.log('[NotificationCenter] Error in fetchNotifications:', error);
  setError('Erro ao carregar notificações.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchNotifications();
    }
  }, [userId, mounted]);

  // Evita mismatch de hidratação: só renderiza conteúdo após mounted ser true
  if (!mounted) return null;

  if (loading) return (
    <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
      <div className="flex items-center justify-center h-full text-gray-400 text-lg">Carregando notificações...</div>
    </div>
  );
  if (error) return (
    <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
      <div className="flex items-center justify-center h-full text-red-500 text-lg">{error}</div>
    </div>
  );
  if (notifications.length === 0) return (
    <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
      <div className="flex items-center justify-center h-full text-gray-400 text-lg">Sem notificações pendentes.</div>
    </div>
  );

  // Substituir setCreateModal para buscar o profissional correto
  const handleCreateModal = (notification: Notification) => {
    const doctorName = notification.payload.doctorName?.trim().toLowerCase();
    const found = professionals.find(p => p.name.trim().toLowerCase() === doctorName);
    setProfessionalId(found ? found.id : (professionals[0]?.id || ''));
    setCreateModal({ open: true, notification });
  };

  // Atualizar profissionais após criar evento
  const handleSuccess = async () => {
    await fetchNotifications();
    // Atualiza profissionais localmente também
    const url = userId ? `/api/professionals?userId=${encodeURIComponent(userId)}` : '/api/professionals';
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) setProfessionals(data);
    if (onProfessionalCreated) await onProfessionalCreated();
  }

  return (
    <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-2">
        <h2 className="text-2xl font-bold mb-6 text-[#1E40AF]">Central de Notificações</h2>
        <ul className="space-y-6">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col gap-2"
            >
              <div className="text-base font-semibold text-[#10B981] mb-1 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#F59E42]" aria-label="Notificação de documento" />
                <span>{(() => {
                  const documentTypeLabels = {
                    request: 'Solicitação',
                    authorization: 'Autorização',
                    certificate: 'Atestado',
                    result: 'Laudo/Resultado',
                    prescription: 'Prescrição',
                    invoice: 'Nota Fiscal'
                  };
                  const type = n.payload.documentType || 'result';
                  return `${documentTypeLabels[type as keyof typeof documentTypeLabels] || 'Documento'} recebido:`;
                })()}</span>
                <span className="text-gray-700 font-normal">{n.payload.report.fileName}</span>
              </div>
              {(() => {
                const type = n.payload.documentType || 'result';
                const isMedical = type === 'result' || type === 'certificate' || type === 'prescription';
                return isMedical ? (
                  <>
                    <div className="text-sm text-gray-700"><strong>Médico:</strong> {n.payload.doctorName}</div>
                  </>
                ) : null;
              })()}
              <div className="text-sm text-gray-500"><strong>Recebido em:</strong> {new Date(n.createdAt).toLocaleString()}</div>
              <div className="text-sm text-gray-500"><strong>Origem:</strong> {n.payload.documentType ? 'Enviado por página pública' : 'Enviado por API'}</div>
              <div className="flex gap-3 mt-3">
                <button
                  className="bg-[#1E40AF] hover:bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => setAssociateModal({ open: true, notification: n })}
                >
                  Associar a evento existente
                </button>
                <button
                  className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => handleCreateModal(n)}
                >
                  Criar novo evento
                </button>
              </div>
            </li>
          ))}
        </ul>
        {/* Modal de associação */}
        <AssociateNotificationModal
          notification={associateModal.notification}
          open={associateModal.open}
          onClose={() => setAssociateModal({ open: false, notification: null })}
          onSuccess={handleSuccess}
          userId={userId}
        />
        {/* Modal de criação */}
        {createModal.notification && (
          <CreateEventFromNotificationModal
            open={createModal.open}
            onClose={() => setCreateModal({ open: false, notification: null })}
            onSuccess={handleSuccess}
            notification={createModal.notification}
            professionalId={professionalId}
            userId={userId}
            refreshProfessionals={onProfessionalCreated}
          />
        )}
      </div>
    </div>
  );
}
