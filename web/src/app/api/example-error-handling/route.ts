/**
 * EXEMPLO DE USO: API Route com tratamento de erros padronizado
 * 
 * Este arquivo demonstra como usar os utilitários de erro em uma API route.
 * Copie este padrão para suas próprias rotas.
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  createErrorResponse,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from '@/lib/errors';

/**
 * Tipos para o exemplo
 */
type Session = {
  userId: string;
  role: 'USER' | 'ADMIN';
};

type Item = {
  id: string;
  ownerId: string;
  name?: string;
};

/**
 * EXEMPLO 1: Usando withErrorHandler wrapper
 * O wrapper captura automaticamente erros e retorna resposta padronizada
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Validação de entrada
  if (!id) {
    throw new ValidationError('ID é obrigatório', {
      field: 'id',
      received: null,
    });
  }

  // Simulação de busca no banco
  const item = await findItemById(id);

  if (!item) {
    throw new NotFoundError(`Item com ID ${id} não encontrado`, {
      id,
    });
  }

  return Response.json({ data: item });
});

/**
 * EXEMPLO 2: Tratamento manual com createErrorResponse
 * Mais controle sobre o fluxo de erro
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validação
    if (!body.name || !body.email) {
      throw new ValidationError('Campos obrigatórios faltando', {
        fields: {
          name: !body.name ? 'Nome é obrigatório' : undefined,
          email: !body.email ? 'Email é obrigatório' : undefined,
        },
      });
    }

    // Verificação de autorização
    const session = await getSession(request);
    if (!session) {
      throw new UnauthorizedError('Você precisa estar autenticado');
    }

    // Lógica de negócio
    const result = await createItem(body);

    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    // Retorna resposta padronizada (RFC 7807)
    return createErrorResponse(error, request.url);
  }
}

/**
 * EXEMPLO 3: Múltiplos tipos de erro
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      throw new UnauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('ID é obrigatório');
    }

    const item = await findItemById(id);
    if (!item) {
      throw new NotFoundError('Item não encontrado');
    }

    // Verificar permissão
    if (item.ownerId !== session.userId && session.role !== 'ADMIN') {
      throw new ForbiddenError('Você não tem permissão para editar este item');
    }

    const body = await request.json();
    const updated = await updateItem(id, body);

    return Response.json({ data: updated });
  } catch (error) {
    return createErrorResponse(error, request.url);
  }
}

// Funções auxiliares mock (substitua pelas suas reais)
async function findItemById(id: string): Promise<Item | null> {
  // Mock implementation - simulate found item
  return { id, ownerId: 'user-123', name: 'Example Item' };
}

async function getSession(request: NextRequest): Promise<Session | null> {
  // Mock implementation
  return { userId: 'user-123', role: 'USER' };
}

async function createItem(data: any) {
  // Implementação real aqui
  return data;
}

async function updateItem(id: string, data: any) {
  // Implementação real aqui
  return { id, ...data };
}

// Importar para usar no exemplo 3
import { ForbiddenError } from '@/lib/errors';
