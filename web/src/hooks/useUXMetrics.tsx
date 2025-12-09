'use client';

import { useCallback, useEffect, useState } from 'react';
import { captureMetric, captureEvent } from '@/lib/monitoring';

// Tipos de métricas de UX
export type UXMetricType =
  | 'page_load_time'
  | 'error_recovery_time'
  | 'user_satisfaction'
  | 'feature_usage'
  | 'loading_wait_time'
  | 'error_frequency';

// Interface para métricas de UX
export interface UXMetric {
  type: UXMetricType;
  value: number;
  context?: {
    page?: string;
    action?: string;
    errorType?: string;
    userId?: string;
    timestamp: string;
  };
  metadata?: Record<string, unknown>;
}

// Interface para feedback do usuário
export interface UserFeedback {
  rating: number; // 1-5
  comment?: string;
  category: 'usability' | 'performance' | 'reliability' | 'features';
  page?: string;
  userId?: string;
  userAgent?: string;
  timestamp: string;
}

// Hook para coletar métricas de UX
export function useUXMetrics() {
  const [metrics, setMetrics] = useState<UXMetric[]>([]);

  // Registrar uma métrica
  const trackMetric = useCallback(async (metric: Omit<UXMetric, 'context'> & { context?: Omit<UXMetric['context'], 'timestamp'> }) => {
    const fullMetric: UXMetric = {
      ...metric,
      context: {
        ...metric.context,
        timestamp: new Date().toISOString(),
      },
    };

    // Adicionar à lista local
    setMetrics(prev => [...prev, fullMetric]);

    // Enviar para API
    try {
      await fetch('/api/metrics/ux', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullMetric),
      });
    } catch (error) {
      console.error('Erro ao enviar métrica para API:', error);
    }

    // Enviar para monitoramento
    captureMetric(`${metric.type}`, metric.value, {
      page: fullMetric.context?.page || '',
      action: fullMetric.context?.action || '',
      errorType: fullMetric.context?.errorType || '',
    });

    // Log detalhado para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('[UX Metric]', fullMetric);
    }
  }, []);

  // Registrar feedback do usuário
  const trackFeedback = useCallback(async (feedback: Omit<UserFeedback, 'timestamp'>) => {
    const fullFeedback: UserFeedback = {
      ...feedback,
      timestamp: new Date().toISOString(),
    };

    // Enviar para API
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullFeedback),
      });
    } catch (error) {
      console.error('Erro ao enviar feedback para API:', error);
    }

    // Enviar evento para monitoramento
    captureEvent({
      level: 'info',
      message: `User feedback: ${feedback.rating}/5 - ${feedback.category}`,
      context: {
        feedback: fullFeedback,
      },
      tags: {
        type: 'user_feedback',
        category: feedback.category,
        rating: feedback.rating.toString(),
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[User Feedback]', fullFeedback);
    }
  }, []);

  // Registrar tempo de carregamento de página
  const trackPageLoad = useCallback((page: string, loadTime: number) => {
    trackMetric({
      type: 'page_load_time',
      value: loadTime,
      context: { page },
    });
  }, [trackMetric]);

  // Registrar tempo de recuperação de erro
  const trackErrorRecovery = useCallback((page: string, recoveryTime: number, errorType?: string) => {
    trackMetric({
      type: 'error_recovery_time',
      value: recoveryTime,
      context: { page, errorType },
    });
  }, [trackMetric]);

  // Registrar satisfação do usuário
  const trackSatisfaction = useCallback((rating: number, page?: string) => {
    trackMetric({
      type: 'user_satisfaction',
      value: rating,
      context: { page },
    });
  }, [trackMetric]);

  // Registrar uso de funcionalidade
  const trackFeatureUsage = useCallback((feature: string, page?: string) => {
    trackMetric({
      type: 'feature_usage',
      value: 1, // Contador simples
      context: { page, action: feature },
    });
  }, [trackMetric]);

  // Registrar tempo de espera de loading
  const trackLoadingWait = useCallback((waitTime: number, context?: string) => {
    trackMetric({
      type: 'loading_wait_time',
      value: waitTime,
      context: { action: context },
    });
  }, [trackMetric]);

  // Registrar frequência de erros
  const trackErrorFrequency = useCallback((errorType: string, page?: string) => {
    trackMetric({
      type: 'error_frequency',
      value: 1, // Contador de ocorrências
      context: { page, errorType },
    });
  }, [trackMetric]);

  return {
    metrics,
    trackMetric,
    trackFeedback,
    trackPageLoad,
    trackErrorRecovery,
    trackSatisfaction,
    trackFeatureUsage,
    trackLoadingWait,
    trackErrorFrequency,
  };
}

// Hook para medir tempo de carregamento de página
export function usePageLoadTracking(pageName?: string) {
  const { trackPageLoad } = useUXMetrics();
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    const loadTime = Date.now() - startTime;
    trackPageLoad(pageName || window.location.pathname, loadTime);
  }, [pageName, startTime, trackPageLoad]);
}

// Hook para medir tempo de operações assíncronas
export function useOperationTiming(operationName?: string) {
  const { trackLoadingWait } = useUXMetrics();
  const [startTime, setStartTime] = useState<number | null>(null);

  const startTiming = useCallback(() => {
    setStartTime(Date.now());
  }, []);

  const endTiming = useCallback(() => {
    if (startTime) {
      const duration = Date.now() - startTime;
      trackLoadingWait(duration, operationName || 'unknown_operation');
      setStartTime(null);
    }
  }, [startTime, operationName, trackLoadingWait]);

  return { startTiming, endTiming };
}

// Componente para coletar feedback do usuário
export function UserFeedbackCollector({
  onSubmit,
  className = '',
}: {
  onSubmit?: (feedback: UserFeedback) => void;
  className?: string;
}) {
  const { trackFeedback } = useUXMetrics();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState<UserFeedback['category']>('usability');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) return;

    const feedback: Omit<UserFeedback, 'timestamp'> = {
      rating,
      comment: comment.trim() || undefined,
      category,
      page: window.location.pathname,
    };

    trackFeedback(feedback);

    if (onSubmit) {
      onSubmit({
        ...feedback,
        timestamp: new Date().toISOString(),
      });
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <p className="text-green-600 font-medium">Obrigado pelo seu feedback!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Como você avalia sua experiência?
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              } hover:text-yellow-400 transition-colors`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categoria
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as UserFeedback['category'])}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="usability">Usabilidade</option>
          <option value="performance">Performance</option>
          <option value="reliability">Confiabilidade</option>
          <option value="features">Funcionalidades</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comentários (opcional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte-nos mais sobre sua experiência..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={rating === 0}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Enviar Feedback
      </button>
    </form>
  );
}