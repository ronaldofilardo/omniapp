import React from 'react';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import CreateEventFromNotificationModal from '@/components/CreateEventFromNotificationModal';
import AssociateNotificationModal from '@/components/AssociateNotificationModal';

interface Notification {
  id: string;
  type: 'LAB_RESULT';
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  createdAt: string;
  payload: {
    reportId: string;
    title: string;
    protocol: string;
  };
  report?: {
    senderId: string;
    sender: {
      name: string;
      emissorInfo?: {
        clinicName: string;
      };
    };
  };
}

export function NotificationsTab() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Erro ao carregar notificações');
      const data = await response.json();
      setNotifications(data.notifications);
    } catch (err) {
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const [associateModalOpen, setAssociateModalOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedNotification, setSelectedNotification] = React.useState<Notification | null>(null);

  const handleCreateEvent = async (notification: Notification) => {
    setSelectedNotification(notification);
    setCreateModalOpen(true);
  };

  const handleAssociateEvent = async (notification: Notification) => {
    setSelectedNotification(notification);
    setAssociateModalOpen(true);
  };

  const handleCreateSuccess = async () => {
    setCreateModalOpen(false);
    setSelectedNotification(null);
    await fetchNotifications(); // Recarrega as notificações
  };

  const handleAssociateSuccess = async () => {
    setAssociateModalOpen(false);
    setSelectedNotification(null);
    await fetchNotifications(); // Recarrega as notificações
  };

  if (loading) return <div className="p-4">Carregando...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Notificações</h2>
      
      {/* Versão Desktop/Tablet */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Recebimento</th>
              <th>Origem</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <tr 
                key={notification.id}
                className={notification.status === 'UNREAD' ? 'bg-blue-50' : ''}
              >
                <td>{notification.payload.protocol}</td>
                <td>{formatDate(notification.createdAt)}</td>
                <td>
                  {notification.report?.sender.emissorInfo?.clinicName || 
                   notification.report?.sender.name}
                </td>
                <td className="space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCreateEvent(notification)}
                  >
                    Criar novo evento
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssociateEvent(notification)}
                  >
                    Associar a evento
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Versão Mobile */}
      <div className="md:hidden space-y-4">
        {notifications.map((notification) => (
          <Card 
            key={notification.id}
            className={`p-4 ${notification.status === 'UNREAD' ? 'bg-blue-50' : ''}`}
          >
            <div className="space-y-2">
              <div>
                <div className="font-semibold">
                  Protocolo: {notification.payload.protocol}
                </div>
                <div className="text-sm text-gray-600">
                  Recebido em: {formatDate(notification.createdAt)}
                </div>
              </div>
              
              <div className="text-sm">
                Origem: {notification.report?.sender.emissorInfo?.clinicName || 
                        notification.report?.sender.name}
              </div>

              <div className="flex flex-col space-y-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleCreateEvent(notification)}
                >
                  Criar novo evento
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAssociateEvent(notification)}
                >
                  Associar a evento existente
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal de Criar Evento */}
      {selectedNotification && (
        <CreateEventFromNotificationModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
          notification={selectedNotification}
          professionalId=""
          userId=""
        />
      )}

      {/* Modal de Associar Evento */}
      {selectedNotification && (
        <AssociateNotificationModal
          open={associateModalOpen}
          onClose={() => setAssociateModalOpen(false)}
          onSuccess={handleAssociateSuccess}
          notification={selectedNotification}
          userId=""
        />
      )}
    </div>
  );
}