import { describe, it, expect, vi, beforeEach } from 'vitest';

// Configurar variável de ambiente para o Resend
process.env.RESEND_API_KEY = 'test-api-key';

// Mock do Resend - deve ser o primeiro mock
vi.mock('resend', () => {
  class MockResend {
    constructor() {
      this.emails = {
        send: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
      };
    }
  }

  return {
    Resend: MockResend,
  };
});

// Mock do bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

// @ts-ignore - prisma is mocked
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/auth/register/route';

// Criar referência tipada para o mock
const mockPrisma = prisma as any;

describe('/api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should create user successfully with valid data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        cpf: '12345678901',
        telefone: '(11) 99999-9999',
        role: 'RECEPTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          name: 'John Doe',
          cpf: '12345678901',
          telefone: '(11) 99999-9999',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toEqual({
        id: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        cpf: '12345678901',
        telefone: '(11) 99999-9999',
        role: 'RECEPTOR',
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
      expect(data.user.password).toBeUndefined();
    });

    it('should return 400 when email is missing', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          password: 'password123',
          cpf: '12345678901',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('E-mail, senha e CPF são obrigatórios');
    });

    it('should return 400 when password is missing', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          cpf: '12345678901',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('E-mail, senha e CPF são obrigatórios');
    });

    it('should return 400 when CPF is missing', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('E-mail, senha e CPF são obrigatórios');
    });

    it('should return 400 when CPF has less than 11 digits', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '123456789', // 9 digits
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('CPF deve ter 11 dígitos');
    });

    it('should return 400 when CPF has more than 11 digits', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '123456789012', // 12 digits
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('CPF deve ter 11 dígitos');
    });

    it('should return 400 when privacy policy is not accepted', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
          acceptedPrivacyPolicy: false,
          acceptedTermsOfUse: true,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Você deve aceitar a Política de Privacidade e os Termos de Uso');
    });

    it('should return 400 when terms of use is not accepted', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: false,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Você deve aceitar a Política de Privacidade e os Termos de Uso');
    });

    it('should accept CPF in different formats during registration', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        cpf: '12345678901', // CPF normalizado no banco (apenas dígitos)
        telefone: '(11) 99999-9999',
        role: 'RECEPTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          name: 'John Doe',
          cpf: '123.456.789-01', // CPF com formação (será normalizado)
          telefone: '(11) 99999-9999',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.cpf).toBe('12345678901'); // Retorna CPF normalizado
    });

    it('should detect duplicate CPF in different formats', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // Email não existe
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        cpf: '12345678901', // CPF normalizado no banco (apenas dígitos)
      }); // CPF já existe

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '123.456.789-01', // CPF com formação (será normalizado)
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('CPF já cadastrado');
    });

    it('should return 400 when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'john@example.com',
      }); // E-mail já existe
      mockPrisma.user.findFirst.mockResolvedValue(null); // CPF não existe

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('E-mail já cadastrado');
    });

    it('should return 400 when CPF already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // Email não existe
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        cpf: '12345678901',
      }); // CPF já existe

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('CPF já cadastrado');
    });

    it('should return 403 when trying to register as EMISSOR', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
          role: 'EMISSOR',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Registro de emissores não disponível');
    });

    it('should return 500 on database error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });
});
