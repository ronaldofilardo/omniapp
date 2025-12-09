import { NextRequest, NextResponse } from 'next/server';
import { UXMetric } from '@/hooks/useUXMetrics';

// Em produção, isso seria armazenado em um banco de dados
// Para demonstração, usaremos um armazenamento em memória
let metricsStore: UXMetric[] = [];

// POST /api/metrics/ux - Coletar métricas UX
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados recebidos
    if (!body.type || typeof body.value !== 'number') {
      return NextResponse.json(
        { error: 'Dados inválidos. Campos obrigatórios: type, value' },
        { status: 400 }
      );
    }

    const metric: UXMetric = {
      type: body.type,
      value: body.value,
      context: body.context || {},
    };

    // Armazenar métrica (em produção, salvar no banco)
    metricsStore.push(metric);

    // Manter apenas as últimas 1000 métricas para evitar vazamento de memória
    if (metricsStore.length > 1000) {
      metricsStore = metricsStore.slice(-1000);
    }

    return NextResponse.json({
      success: true,
      metricId: metricsStore.length - 1,
    });
  } catch (error) {
    console.error('Erro ao salvar métrica UX:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET /api/metrics/ux - Obter métricas UX
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');

    let filteredMetrics = metricsStore;

    // Filtrar por tipo se especificado
    if (type) {
      filteredMetrics = metricsStore.filter(m => m.type === type);
    }

    // Limitar resultados
    const limitedMetrics = filteredMetrics.slice(-limit);

    // Calcular estatísticas básicas
    const stats = limitedMetrics.reduce((acc, metric) => {
      if (!acc[metric.type]) {
        acc[metric.type] = {
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          values: [],
          average: 0,
        };
      }

      const stat = acc[metric.type];
      stat.count++;
      stat.sum += metric.value;
      stat.min = Math.min(stat.min, metric.value);
      stat.max = Math.max(stat.max, metric.value);
      stat.values.push(metric.value);

      return acc;
    }, {} as Record<string, { count: number; sum: number; min: number; max: number; values: number[]; average: number }>);

    // Calcular médias
    Object.keys(stats).forEach(type => {
      stats[type].average = stats[type].sum / stats[type].count;
    });

    return NextResponse.json({
      metrics: limitedMetrics,
      stats,
      total: metricsStore.length,
    });
  } catch (error) {
    console.error('Erro ao obter métricas UX:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}