import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  InternalServerError,
  errorToProblemDetails,
  createErrorResponse,
  isOperationalError,
  getClientSafeErrorMessage,
  formatZodError,
  withErrorHandler,
} from '@/lib/errors';

describe('AppError', () => {
  it('deve criar erro com propriedades corretas', () => {
    const error = new AppError('Erro de teste', 400, 'TEST_ERROR', { detail: 'info' });

    expect(error.message).toBe('Erro de teste');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({ detail: 'info' });
    expect(error.isOperational).toBe(true);
  });

  it('deve ter valores padrão corretos', () => {
    const error = new AppError('Erro');

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.isOperational).toBe(true);
  });
});

describe('Erros específicos', () => {
  it('ValidationError deve ter status 400', () => {
    const error = new ValidationError('Campo inválido');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('NotFoundError deve ter status 404', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Recurso não encontrado');
  });

  it('UnauthorizedError deve ter status 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Não autorizado');
  });

  it('ForbiddenError deve ter status 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Acesso negado');
  });

  it('ConflictError deve ter status 409', () => {
    const error = new ConflictError('Recurso já existe');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  it('BadRequestError deve ter status 400', () => {
    const error = new BadRequestError('Requisição inválida');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('InternalServerError deve ter status 500 e isOperational false', () => {
    const error = new InternalServerError();
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(error.isOperational).toBe(false);
  });
});

describe('errorToProblemDetails', () => {
  it('deve converter AppError em ProblemDetails', () => {
    const error = new ValidationError('Campo obrigatório', { field: 'email' });
    const problemDetails = errorToProblemDetails(error, '/api/users');

    expect(problemDetails).toMatchObject({
      type: 'https://api.omni.com/problems/validation_error',
      title: 'Requisição Inválida',
      status: 400,
      detail: 'Campo obrigatório',
      instance: '/api/users',
      code: 'VALIDATION_ERROR',
      field: 'email',
    });
  });

  it('deve converter Error genérico em ProblemDetails', () => {
    const error = new Error('Erro genérico');
    const problemDetails = errorToProblemDetails(error);

    expect(problemDetails).toMatchObject({
      type: 'https://api.omni.com/problems/internal-error',
      title: 'Erro Interno',
      status: 500,
    });
  });

  it('deve converter erro desconhecido em ProblemDetails', () => {
    const problemDetails = errorToProblemDetails('string de erro');

    expect(problemDetails).toMatchObject({
      type: 'https://api.omni.com/problems/unknown-error',
      title: 'Erro Desconhecido',
      status: 500,
      detail: 'Ocorreu um erro inesperado',
    });
  });

  it('deve ocultar detalhes em produção', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Erro sensível');
    const problemDetails = errorToProblemDetails(error);

    expect(problemDetails.detail).toBe('Ocorreu um erro inesperado');
    expect(problemDetails.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('deve incluir stack em desenvolvimento', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Erro de dev');
    const problemDetails = errorToProblemDetails(error);

    expect(problemDetails.detail).toBe('Erro de dev');
    expect(problemDetails.stack).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('createErrorResponse', () => {
  it('deve criar NextResponse com ProblemDetails', () => {
    const error = new NotFoundError('Usuário não encontrado');
    const response = createErrorResponse(error, '/api/users/123');

    expect(response.status).toBe(404);
  });

  it('deve incluir Content-Type application/problem+json', async () => {
    const error = new BadRequestError('Dados inválidos');
    const response = createErrorResponse(error);

    expect(response.headers.get('Content-Type')).toBe('application/problem+json');
  });

  it('deve logar erros 500+', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new InternalServerError('Erro crítico');
    
    createErrorResponse(error);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('não deve logar erros 4xx', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new ValidationError('Dado inválido');
    
    createErrorResponse(error);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('isOperationalError', () => {
  it('deve retornar true para erros operacionais', () => {
    const error = new ValidationError('Erro esperado');
    expect(isOperationalError(error)).toBe(true);
  });

  it('deve retornar false para erros não operacionais', () => {
    const error = new InternalServerError('Erro crítico');
    expect(isOperationalError(error)).toBe(false);
  });

  it('deve retornar false para erros não-AppError', () => {
    const error = new Error('Erro genérico');
    expect(isOperationalError(error)).toBe(false);
  });
});

describe('getClientSafeErrorMessage', () => {
  it('deve retornar mensagem de AppError', () => {
    const error = new ValidationError('Campo obrigatório');
    expect(getClientSafeErrorMessage(error)).toBe('Campo obrigatório');
  });

  it('deve retornar mensagem genérica em produção para Error', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Erro interno sensível');
    expect(getClientSafeErrorMessage(error)).toBe(
      'Ocorreu um erro inesperado. Por favor, tente novamente.'
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('deve retornar mensagem real em desenvolvimento para Error', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Erro de desenvolvimento');
    expect(getClientSafeErrorMessage(error)).toBe('Erro de desenvolvimento');

    process.env.NODE_ENV = originalEnv;
  });
});

describe('formatZodError', () => {
  it('deve formatar erros do Zod corretamente', () => {
    const zodError = {
      issues: [
        { path: ['email'], message: 'Email inválido' },
        { path: ['password'], message: 'Senha muito curta' },
      ],
    };

    const error = formatZodError(zodError);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual({
      fields: {
        email: 'Email inválido',
        password: 'Senha muito curta',
      },
    });
  });

  it('deve retornar ValidationError genérico para erro não-Zod', () => {
    const error = formatZodError({});

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Erro de validação');
  });
});

describe('withErrorHandler', () => {
  it('deve executar handler normalmente se não houver erro', async () => {
    const handler = vi.fn().mockResolvedValue('sucesso');
    const wrappedHandler = withErrorHandler(handler);

    const result = await wrappedHandler('arg1', 'arg2');

    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result).toBe('sucesso');
  });

  it('deve capturar erro e retornar NextResponse', async () => {
    const handler = vi.fn().mockRejectedValue(new ValidationError('Erro'));
    const wrappedHandler = withErrorHandler(handler);

    const result = await wrappedHandler();

    expect(result).toBeDefined();
    // NextResponse não pode ser facilmente testado aqui, mas verificamos que não lançou
  });
});

