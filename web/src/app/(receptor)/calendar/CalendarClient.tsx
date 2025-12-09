'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarTab } from '@/components/CalendarTab';
import { SkeletonCard, SkeletonList } from '@/components/ui/loading-states';

interface CalendarClientProps {
  userId: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: string;
  professionalId: string;
  startTime?: string;
  endTime?: string;
  observation?: string;
  instructions?: boolean;
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
  address?: string;
  contact?: string;
}

export default function CalendarClient({ userId }: CalendarClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar profissionais
  useEffect(() => {
    if (!userId) return;

    const fetchProfessionals = async () => {
      try {
        const response = await fetch(`/api/professionals?userId=${encodeURIComponent(userId)}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (!response.ok) throw new Error('Erro ao buscar profissionais');

        const data = await response.json();
        if (Array.isArray(data)) {
          setProfessionals(data);
        }
      } catch (err) {
        console.error('Erro ao buscar profissionais:', err);
        setError('Erro ao carregar profissionais');
      }
    };

    fetchProfessionals();
  }, [userId]);

  // Buscar eventos
  const fetchEvents = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000) // 15s timeout para eventos
      });

      if (!response.ok) throw new Error('Erro ao buscar eventos');

      const data = await response.json();

      // Verificar se resposta tem paginação (nova estrutura)
      if (data.events && Array.isArray(data.events)) {
        setEvents(data.events);
      } else if (Array.isArray(data)) {
        // Fallback para resposta antiga
        setEvents(data);
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar eventos:', err);
      setError(`Erro ao carregar eventos: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[400px] bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Calendar View Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Calendar */}
            <div className="lg:col-span-2">
              <SkeletonCard className="h-96" />
            </div>
            
            {/* Events List */}
            <div className="space-y-4">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
              <SkeletonList items={5} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Erro ao carregar dados</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchEvents}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <CalendarTab events={events} professionals={professionals} onBackToTimeline={() => router.push('/timeline')} />;
}
