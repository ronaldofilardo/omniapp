'use client';

import { useState, useEffect } from 'react';
import { UXMetric, UserFeedback } from '@/hooks/useUXMetrics';

// Tipos para agregação de métricas
interface MetricSummary {
  type: string;
  count: number;
  average: number;
  min: number;
  max: number;
  latest: number;
}

interface FeedbackSummary {
  total: number;
  averageRating: number;
  categories: Record<string, number>;
  recentFeedback: UserFeedback[];
}

// Componente de dashboard de métricas UX
export function UXMetricsDashboard() {
  const [metrics, setMetrics] = useState<UXMetric[]>([]);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simular carregamento de dados (em produção, viria de uma API)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Em produção, buscar dados reais da API
        // const metricsResponse = await fetch('/api/metrics/ux');
        // const feedbackResponse = await fetch('/api/feedback');

        // Dados simulados para demonstração
        const mockMetrics: UXMetric[] = [
          {
            type: 'page_load_time',
            value: 1250,
            context: { page: '/dashboard', timestamp: new Date().toISOString() },
          },
          {
            type: 'error_recovery_time',
            value: 850,
            context: { page: '/admin', errorType: 'network', timestamp: new Date().toISOString() },
          },
          {
            type: 'user_satisfaction',
            value: 4.2,
            context: { page: '/dashboard', timestamp: new Date().toISOString() },
          },
        ];

        const mockFeedback: UserFeedback[] = [
          {
            rating: 5,
            comment: 'Excelente experiência!',
            category: 'usability',
            page: '/dashboard',
            timestamp: new Date().toISOString(),
          },
          {
            rating: 4,
            comment: 'Carregamento um pouco lento',
            category: 'performance',
            page: '/reports',
            timestamp: new Date().toISOString(),
          },
        ];

        setMetrics(mockMetrics);
        setFeedback(mockFeedback);
      } catch (error) {
        console.error('Erro ao carregar métricas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Agregar métricas
  const metricSummary = metrics.reduce((acc, metric) => {
    if (!acc[metric.type]) {
      acc[metric.type] = {
        type: metric.type,
        count: 0,
        average: 0,
        min: Infinity,
        max: -Infinity,
        latest: 0,
        values: [],
      };
    }

    const summary = acc[metric.type];
    summary.count++;
    summary.values.push(metric.value);
    summary.min = Math.min(summary.min, metric.value);
    summary.max = Math.max(summary.max, metric.value);
    summary.latest = metric.value;
    summary.average = summary.values.reduce((a, b) => a + b, 0) / summary.values.length;

    return acc;
  }, {} as Record<string, MetricSummary & { values: number[] }>);

  // Agregar feedback
  const feedbackSummary: FeedbackSummary = {
    total: feedback.length,
    averageRating: feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0,
    categories: feedback.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentFeedback: feedback.slice(-5), // Últimos 5 feedbacks
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard de Métricas UX
        </h1>
        <p className="text-gray-600">
          Monitoramento de experiência do usuário e feedback
        </p>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Tempo Médio de Carregamento"
          value={`${Math.round(Object.values(metricSummary).find(m => m.type === 'page_load_time')?.average || 0)}ms`}
          trend="down"
          icon="⚡"
        />
        <MetricCard
          title="Satisfação do Usuário"
          value={`${(Object.values(metricSummary).find(m => m.type === 'user_satisfaction')?.average || 0).toFixed(1)}/5`}
          trend="up"
          icon="😊"
        />
        <MetricCard
          title="Tempo de Recuperação de Erro"
          value={`${Math.round(Object.values(metricSummary).find(m => m.type === 'error_recovery_time')?.average || 0)}ms`}
          trend="down"
          icon="🔧"
        />
        <MetricCard
          title="Total de Feedbacks"
          value={feedbackSummary.total.toString()}
          trend="up"
          icon="💬"
        />
      </div>

      {/* Detalhes das métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tabela de métricas detalhadas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Métricas Detalhadas</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Tipo</th>
                  <th className="text-right py-2">Contagem</th>
                  <th className="text-right py-2">Média</th>
                  <th className="text-right py-2">Mín/Máx</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(metricSummary).map((summary) => (
                  <tr key={summary.type} className="border-b">
                    <td className="py-2 capitalize">
                      {summary.type.replace('_', ' ')}
                    </td>
                    <td className="text-right py-2">{summary.count}</td>
                    <td className="text-right py-2">
                      {summary.type.includes('time') ? `${Math.round(summary.average)}ms` : summary.average.toFixed(1)}
                    </td>
                    <td className="text-right py-2">
                      {summary.type.includes('time') ?
                        `${Math.round(summary.min)}/${Math.round(summary.max)}ms` :
                        `${summary.min.toFixed(1)}/${summary.max.toFixed(1)}`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feedback por categoria */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Feedback por Categoria</h2>
          <div className="space-y-3">
            {Object.entries(feedbackSummary.categories).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="capitalize">{category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / feedbackSummary.total) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feedbacks recentes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Feedbacks Recentes</h2>
        <div className="space-y-4">
          {feedbackSummary.recentFeedback.map((item, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">
                    {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                  </span>
                  <span className="text-sm text-gray-500 capitalize">
                    {item.category}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {item.comment && (
                <p className="text-gray-700">{item.comment}</p>
              )}
              {item.page && (
                <p className="text-sm text-gray-500">Página: {item.page}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para cards de métricas
function MetricCard({
  title,
  value,
  trend,
  icon
}: {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}) {
  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`text-3xl ${trendColor[trend]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}