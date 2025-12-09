import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '@/app/admin/dashboard/page';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Definir pushMock no escopo superior para ser usado no mock
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    // Mock fetch global para simular resposta da API
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/admin/metrics')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalFiles: 10,
            uploadVolumeMB: 123.45,
            downloadVolumeMB: 67.89,
          }),
        }) as any;
      }
      // Mock para /api/admin/audit-documents
      if (typeof url === 'string' && url.includes('/api/admin/audit-documents')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            documents: [
              {
                protocol: 'LAB-001',
                patientName: 'João Silva',
                emitterName: 'Laboratório Omni',
                emitterCnpj: '12.345.678/0001-99',
                createdAt: new Date('2024-11-24T10:00:00').toISOString(),
                fileName: 'laudo.pdf',
                fileHash: 'abc123def456',
                documentType: 'result',
                status: 'PROCESSING', // Agora usa status do Report, não do AuditLog
                receiverCpf: '11122233344',
                receivedAt: new Date('2024-11-24T10:05:00').toISOString(),
                dataVisualizacao: new Date('2024-11-24T10:10:00').toISOString(),
                origin: 'PORTAL_EMISSOR',
              },
              {
                protocol: 'LAB-002',
                patientName: 'Maria Santos',
                emitterName: 'Envio Público',
                emitterCnpj: null,
                createdAt: new Date('2024-11-24T11:00:00').toISOString(),
                fileName: 'exame.pdf',
                fileHash: 'xyz789ghi012',
                documentType: 'result',
                status: 'SUCCESS',
                receiverCpf: '55566677788',
                receivedAt: new Date('2024-11-24T11:05:00').toISOString(),
                dataVisualizacao: null,
                origin: 'PORTAL_PUBLICO',
              },
              {
                protocol: 'LAB-003',
                patientName: 'Pedro Costa',
                emitterName: 'Laboratório XYZ',
                emitterCnpj: '98.765.432/0001-10',
                createdAt: new Date('2024-11-24T12:00:00').toISOString(),
                fileName: 'resultado.pdf',
                fileHash: 'def456ghi789',
                documentType: 'result',
                status: 'DELIVERED',
                receiverCpf: '99988877766',
                receivedAt: null,
                dataVisualizacao: null,
                origin: 'PORTAL_EMISSOR',
              },
              {
                protocol: 'LAB-004',
                patientName: 'Ana Lima',
                emitterName: 'Clínica ABC',
                emitterCnpj: '11.222.333/0001-44',
                createdAt: new Date('2024-11-24T13:00:00').toISOString(),
                fileName: 'laudo-final.pdf',
                fileHash: 'jkl012mno345',
                documentType: 'result',
                status: 'RECEIVED',
                receiverCpf: '44433322211',
                receivedAt: new Date('2024-11-24T13:10:00').toISOString(),
                dataVisualizacao: null,
                origin: 'PORTAL_EMISSOR',
              },
            ],
            total: 4,
          }),
        }) as any;
      }
      // Mock para /api/admin/users
      if (typeof url === 'string' && url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            users: [
              {
                id: '1',
                email: 'admin@omni.com',
                name: 'Administrador',
                role: 'ADMIN',
                createdAt: new Date('2024-11-24T10:00:00').toISOString(),
                cpf: null,
                emissorInfo: null
              },
              {
                id: '2',
                email: 'emissor@omni.com',
                name: 'Emissor Teste',
                role: 'EMISSOR',
                createdAt: new Date('2024-11-24T11:00:00').toISOString(),
                cpf: null,
                emissorInfo: { cnpj: '12345678000123' }
              },
              {
                id: '3',
                email: 'receptor@omni.com',
                name: 'Receptor Teste',
                role: 'RECEPTOR',
                createdAt: new Date('2024-11-24T12:00:00').toISOString(),
                cpf: '98765432100',
                emissorInfo: null
              }
            ],
          }),
        }) as any;
      }
      // Mock para /api/admin/access-logs
      if (typeof url === 'string' && url.includes('/api/admin/access-logs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            logs: [],
            total: 0,
          }),
        }) as any;
      }
      // Mock para /api/admin/shared-files
      if (typeof url === 'string' && url.includes('/api/admin/shared-files')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            files: [],
            total: 0,
          }),
        }) as any;
      }
      // Mock para /api/admin/users
      if (typeof url === 'string' && url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            users: [
              {
                id: '1',
                name: 'Administrador',
                email: 'admin@omni.com',
                cpf: '12345678901',
                telefone: '(11) 99999-9999',
                role: 'admin',
                emailVerified: new Date('2024-11-20T10:00:00'),
                createdAt: new Date('2024-11-20T10:00:00').toISOString(),
              },
              {
                id: '2',
                name: 'Laboratório Omni',
                email: 'labor@omni.com',
                cpf: '98765432100',
                telefone: '(11) 88888-8888',
                role: 'emissor',
                emailVerified: new Date('2024-11-21T10:00:00'),
                createdAt: new Date('2024-11-21T10:00:00').toISOString(),
              },
            ],
            total: 2,
          }),
        }) as any;
      }
      // Mock para logout
      if (typeof url === 'string' && url.includes('/api/auth/logout')) {
        return Promise.resolve({ ok: true, json: async () => ({}) }) as any;
      }
      // Default
      return Promise.resolve({ ok: true, json: async () => ({}) }) as any;
    });
    pushMock.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('deve exibir o header com identidade visual', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByText('Dashboard do Administrador')).toBeInTheDocument();
    expect(screen.getByText('Gerenciamento do Sistema')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /logo omni saúde/i })).toBeInTheDocument();
  });

  it('deve exibir a tabela de documentos de auditoria com dados', async () => {
    render(<AdminDashboard />);
    // Aguardar que o loading termine
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Total de Arquivos')).toBeInTheDocument();
    expect(screen.getByText('Volume de Upload (MB)')).toBeInTheDocument();
    expect(screen.getByText('Volume de Download (MB)')).toBeInTheDocument();
    
    // Aguardar que a tabela apareça
    await waitFor(() => {
      expect(screen.getByText('LAB-001')).toBeInTheDocument();
    });
    
    // Verificar cabeçalhos da tabela
    expect(screen.getAllByText('Protocolo/Documento')).toHaveLength(1);
    expect(screen.getByText('Paciente')).toBeInTheDocument();
    expect(screen.getByText('Emissor')).toBeInTheDocument();
    expect(screen.getByText('hash')).toBeInTheDocument();
    expect(screen.getByText('receptor')).toBeInTheDocument();

    // Verificar dados da tabela
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Laboratório Omni')).toBeInTheDocument();
    expect(screen.getByText('laudo.pdf')).toBeInTheDocument();
    expect(screen.getByText('LAB-002')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Envio Público')).toBeInTheDocument();
  });

  it('deve exibir as abas de navegação', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByText('Acessos')).toBeInTheDocument();
    expect(screen.getByText('Recebidos')).toBeInTheDocument();
    expect(screen.getByText('Compartilhados')).toBeInTheDocument();
    expect(screen.getByText('Usuários')).toBeInTheDocument();
  });

  it('deve iniciar na aba Recebidos por padrão', async () => {
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });
    // Verificar que a aba Recebidos está ativa (com border verde)
    const recebidosTab = screen.getByText('Recebidos');
    expect(recebidosTab).toHaveClass('text-[#10B981]');
    expect(recebidosTab).toHaveClass('border-[#10B981]');
  });

  it('deve exibir status de entrega corretamente na tabela de recebidos', async () => {
    render(<AdminDashboard />);

    // Aguardar que o loading termine
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    // Verificar que os status de entrega são exibidos
    expect(screen.getByText('Enviado')).toBeInTheDocument(); // PROCESSING (SENT)
    expect(screen.getByText('Entregue')).toBeInTheDocument(); // DELIVERED
    expect(screen.getByText('Recebido')).toBeInTheDocument(); // RECEIVED
  });

  it('deve exibir tipos de usuário corretamente na aba Usuários', async () => {
    render(<AdminDashboard />);

    // Aguardar que o loading termine
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    // Clicar na aba Usuários
    const usuariosTab = screen.getByText('Usuários');
    await userEvent.click(usuariosTab);

    // Aguardar que a aba seja carregada
    await waitFor(() => {
      expect(screen.getByText('Usuários do Sistema')).toBeInTheDocument();
    });

    // Verificar que os tipos de usuário são exibidos corretamente
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Emissor')).toBeInTheDocument();
    expect(screen.getByText('Receptor')).toBeInTheDocument();
  });
});
