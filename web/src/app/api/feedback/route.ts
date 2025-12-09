import { NextRequest, NextResponse } from 'next/server';
import { UserFeedback } from '@/hooks/useUXMetrics';

// Em produção, isso seria armazenado em um banco de dados
// Para demonstração, usaremos um armazenamento em memória
let feedbackStore: UserFeedback[] = [];

// POST /api/feedback - Coletar feedback dos usuários
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados recebidos
    if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Avaliação deve ser um número entre 1 e 5' },
        { status: 400 }
      );
    }

    if (!body.category || typeof body.category !== 'string') {
      return NextResponse.json(
        { error: 'Categoria é obrigatória' },
        { status: 400 }
      );
    }

    const feedback: UserFeedback = {
      rating: body.rating,
      comment: body.comment || '',
      category: body.category,
      page: body.page || '',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || '',
      userId: body.userId || null, // Em produção, obter do contexto de autenticação
    };

    // Em produção, salvar no banco de dados
    // Para demonstração, armazenar em memória
    feedbackStore.push(feedback);

    // Manter apenas os últimos 1000 feedbacks
    if (feedbackStore.length > 1000) {
      feedbackStore = feedbackStore.slice(-1000);
    }

    return NextResponse.json({
      success: true,
      feedbackId: feedbackStore.length - 1,
    });
  } catch (error) {
    console.error('Erro ao salvar feedback:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET /api/feedback - Obter feedbacks (para admin/analistas)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    let filteredFeedback = feedbackStore;

    // Filtrar por categoria se especificado
    if (category) {
      filteredFeedback = feedbackStore.filter(f => f.category === category);
    }

    // Limitar resultados (mais recentes primeiro)
    const limitedFeedback = filteredFeedback.slice(-limit).reverse();

    // Calcular estatísticas
    const stats = {
      total: feedbackStore.length,
      averageRating: feedbackStore.length > 0
        ? feedbackStore.reduce((sum, f) => sum + f.rating, 0) / feedbackStore.length
        : 0,
      categories: feedbackStore.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      ratingDistribution: [1, 2, 3, 4, 5].map(rating =>
        feedbackStore.filter(f => f.rating === rating).length
      ),
    };

    return NextResponse.json({
      feedback: limitedFeedback,
      stats,
    });
  } catch (error) {
    console.error('Erro ao obter feedbacks:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}