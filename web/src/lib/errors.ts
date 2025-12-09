/**
 * Utilitários para tratamento padronizado de erros de API
 * Baseado em RFC 7807 - Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 */

import { NextResponse } from 'next/server';
import { captureError } from './monitoring';

/**
 * Interface padronizada para detalhes de problemas (RFC 7807)
 */
export interface ProblemDetails {
  /** URI de referência que identifica o tipo de problema */
  type?: string;
  /** Título curto e legível do problema */
  title: string;
  /** Código de status HTTP */
  status: number;
  /** Explicação detalhada do problema */
  detail?: string;
  /** URI de referência que identifica a ocorrência específica */
  instance?: string;
  /** Propriedades adicionais específicas do problema */
  [key: string]: unknown;
}

/**
 * Classe de erro base para erros da aplicação
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erros específicos da aplicação
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado', details?: Record<string, unknown>) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor', details?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details, false);
  }
}

/**
 * Converte um erro em ProblemDetails
 */
export function errorToProblemDetails(error: unknown, instance?: string): ProblemDetails {
  // Se já é um AppError
  if (error instanceof AppError) {
    return {
      type: `https://api.omni.com/problems/${error.code.toLowerCase()}`,
      title: getErrorTitle(error.statusCode),
      status: error.statusCode,
      detail: error.message,
      instance,
      code: error.code,
      ...error.details,
    };
  }

  // Se é um Error genérico
  if (error instanceof Error) {
    return {
      type: 'https://api.omni.com/problems/internal-error',
      title: 'Erro Interno',
      status: 500,
      detail: process.env.NODE_ENV === 'production' 
        ? 'Ocorreu um erro inesperado' 
        : error.message,
      instance,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    };
  }

  // Erro desconhecido
  return {
    type: 'https://api.omni.com/problems/unknown-error',
    title: 'Erro Desconhecido',
    status: 500,
    detail: 'Ocorreu um erro inesperado',
    instance,
  };
}

/**
 * Cria uma NextResponse com ProblemDetails
 */
export function createErrorResponse(error: unknown, instance?: string): NextResponse {
  const problemDetails = errorToProblemDetails(error, instance);
  
  // Log do erro para monitoramento
  if (problemDetails.status >= 500) {
    console.error('Erro interno:', {
      ...problemDetails,
      timestamp: new Date().toISOString(),
    });
    
    // TODO: Integrar com serviço de monitoramento (Sentry, LogRocket, etc)
  }

  return NextResponse.json(problemDetails, {
    status: problemDetails.status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  });
}

/**
 * Obtém o título padrão baseado no status code
 */
function getErrorTitle(statusCode: number): string {
  const titles: Record<number, string> = {
    400: 'Requisição Inválida',
    401: 'Não Autorizado',
    403: 'Acesso Negado',
    404: 'Não Encontrado',
    409: 'Conflito',
    422: 'Entidade Não Processável',
    429: 'Muitas Requisições',
    500: 'Erro Interno do Servidor',
    502: 'Gateway Inválido',
    503: 'Serviço Indisponível',
    504: 'Timeout do Gateway',
  };

  return titles[statusCode] || 'Erro';
}

/**
 * Wrapper para tratamento de erros em route handlers
 */
export function withErrorHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Capturar erro no serviço de monitoramento
      captureError(error as Error, {
        handler: 'api-route',
        args: args.length,
        timestamp: new Date().toISOString(),
      });

      return createErrorResponse(error);
    }
  };
}

/**
 * Valida se um erro é operacional (esperado) ou não
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Extrai mensagem de erro segura para o cliente
 */
export function getClientSafeErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    return error.message;
  }
  
  return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
}

/**
 * Formata erros de validação do Zod
 */
export function formatZodError(error: unknown): ValidationError {
  if (typeof error === 'object' && error !== null && 'issues' in error) {
    const issues = error.issues as Array<{
      path: (string | number)[];
      message: string;
    }>;
    
    const details = issues.reduce((acc, issue) => {
      const path = issue.path.join('.');
      acc[path] = issue.message;
      return acc;
    }, {} as Record<string, string>);

    return new ValidationError('Erro de validação', { fields: details });
  }

  return new ValidationError('Erro de validação');
}
