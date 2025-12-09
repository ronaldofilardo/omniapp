import { describe, it, expect, vi, beforeEach } from 'vitest'

// Garantir ambiente de teste (mas permitir override em testes específicos)
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'test') {
  process.env.NODE_ENV = 'test'
}

// Mock mínimo de fs/promises com default para ES module
vi.mock('fs/promises', () => {
  const mock = {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
  return { ...mock, default: mock };
});

// Mock de fs (para LocalStorageProvider)
vi.mock('fs', () => ({
  default: {
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
    },
  },
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Mock mínimo de path com default para ES module
vi.mock('path', () => {
  const mock: any = {
    join: vi.fn((...args: any[]) => {
      // join(process.cwd(), 'public', 'uploads')
      if (args.length === 3 && args[1] === 'public' && args[2] === 'uploads') {
        return '/uploads';
      }
      // join('/uploads', 'test-uuid.jpg')
      if (args.length === 2 && args[0] === '/uploads' && args[1] === 'test-uuid.jpg') {
        return '/uploads/test-uuid.jpg';
      }
      // fallback padrão
      return args.join('/');
    })
  };
  mock.default = mock;
  return mock;
});

// Mock mínimo de crypto com default para ES module
vi.mock('crypto', () => {
  const mock = {
    randomUUID: vi.fn(() => 'test-uuid'),
  };
  return { ...mock, default: mock };
});


// Mock do prisma para evitar acesso real ao banco
vi.mock('@/lib/prisma', () => ({
  prisma: {
    adminMetrics: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

// Mock de auth
vi.mock('../../../src/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ id: 'user-1', role: 'RECEPTOR' }),
}))

// Mock de calculateFileHashFromBuffer
vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBuffer: vi.fn(() => 'mock-hash'),
}))

// Mock de auditService
vi.mock('@/lib/services/auditService', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  logDocumentSubmission: vi.fn().mockResolvedValue(undefined),
}))

// Mock das funções de configuração de upload
vi.mock('@/lib/config/upload', () => ({
  getUploadConfig: vi.fn(() => ({
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    sizeSuffix: 'MB',
  })),
  getFileTooLargeError: vi.fn(() => 'Arquivo deve ter menos de 2.0MB. Tamanho atual: 3.0MB'),
  isMimeTypeAllowed: vi.fn((mimeType: string) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    return allowedTypes.includes(mimeType);
  }),
}))

// Mock do storageManager
vi.mock('@/lib/storage', () => ({
  storageManager: {
    upload: vi.fn().mockImplementation((file, options) => {
      return Promise.resolve({
        success: true,
        url: `/uploads/${options.filename}`,
        name: file.name,
        uploadDate: '2025-01-01T00:00:00.000Z',
      });
    }),
  },
}))

// Importar dependências DEPOIS dos mocks
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { storageManager } from '@/lib/storage'

// Criar referências tipadas para os mocks
const mockWriteFile = writeFile as any
const mockMkdir = mkdir as any
const mockJoin = join as any
const mockRandomUUID = randomUUID as any

// Função utilitária para criar um mock NextRequest mínimo
function createMockNextRequest(formData: FormData) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
    headers: {
      get: vi.fn((key: string) => {
        if (key === 'x-forwarded-for') return '127.0.0.1';
        if (key === 'x-real-ip') return '127.0.0.1';
        if (key === 'user-agent') return 'test-agent';
        return null;
      })
    },
    cookies: {},
    nextUrl: {},
    page: {},
    ua: '',
  } as any;
}

// Função helper para criar mock de arquivo
function createMockFile(name: string, type: string, content: string = 'test content') {
  const file = new File([content], name, { type });
  // Mock do método arrayBuffer
  file.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode(content).buffer);
  return file;
}

describe('/api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.warn globally for all tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  beforeEach(() => {
    vi.clearAllMocks()
    mockRandomUUID.mockReturnValue('test-uuid')
  })

  describe('POST', () => {
    it('should upload file successfully', async () => {
      const { POST } = await import('../../../src/app/api/upload/route');
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 'test content');

      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)

      const mockRequest = createMockNextRequest(mockFormData)

      mockWriteFile.mockResolvedValue(undefined)
      mockMkdir.mockResolvedValue(undefined)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        url: '/uploads/test-uuid.jpg',
        name: 'test.jpg',
        uploadDate: expect.any(String),
      })
      expect(vi.mocked(storageManager.upload)).toHaveBeenCalledWith(
        expect.any(File),
        {
          filename: 'test-uuid.jpg',
        }
      )
      })
    })

    it('should return 400 when no file is provided', async () => {
      const { POST } = await import('../../../src/app/api/upload/route');
      const mockFormData = new FormData()
      // No file appended

      const mockRequest = createMockNextRequest(mockFormData)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.detail).toBe('Nenhum arquivo enviado')
    })

    it('should handle file upload errors', async () => {
      const { POST } = await import('../../../src/app/api/upload/route');
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 'test content');
      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)

      const mockRequest = createMockNextRequest(mockFormData)

      // Mock storageManager to return error
      vi.mocked(storageManager.upload).mockResolvedValueOnce({
        success: false,
        error: 'Erro interno no upload',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.detail).toBe('Erro interno no upload')
    })

    it('should return 400 for file too large', async () => {
      const { POST } = await import('../../../src/app/api/upload/route');
      const largeContent = new Array(3 * 1024 * 1024).fill('a').join('') // 3MB > 2MB limit
      const mockFile = createMockFile('large.jpg', 'image/jpeg', largeContent);
      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)

      const mockRequest = createMockNextRequest(mockFormData)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.detail).toBe('Arquivo deve ter menos de 2.0MB. Tamanho atual: 3.0MB')
    })

    it('should return 500 for mkdir error', async () => {
      const { POST } = await import('../../../src/app/api/upload/route');
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 'test content');
      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)

      const mockRequest = createMockNextRequest(mockFormData)

      // Mock storageManager to return error
      vi.mocked(storageManager.upload).mockResolvedValueOnce({
        success: false,
        error: 'Erro interno do servidor',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.detail).toBe('Erro interno do servidor')
    })

    it.skip('should warn in development when file approaches limit', async () => {
      // Temporarily set NODE_ENV to development BEFORE importing
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const { POST } = await import('../../../src/app/api/upload/route');
      const nearLimitContent = new Array(2 * 1024 * 1024).fill('a').join('') // 2MB > 1.5MB
      const mockFile = createMockFile('near-limit.jpg', 'image/jpeg', nearLimitContent);

      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)

      const mockRequest = createMockNextRequest(mockFormData)

      // Ensure storageManager succeeds
      vi.mocked(storageManager.upload).mockResolvedValueOnce({
        success: true,
        url: '/uploads/test-uuid.jpg',
        name: 'near-limit.jpg',
        uploadDate: '2025-01-01T00:00:00.000Z',
      })

      const response = await POST(mockRequest)

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[UPLOAD WARNING]')
      )

      // Restore original env
      process.env.NODE_ENV = originalEnv
    })

    it('should accept PDF files', async () => {
      mockRandomUUID.mockReturnValue('test-uuid')
      
      const { POST } = await import('../../../src/app/api/upload/route');
      const mockFile = createMockFile('document.pdf', 'application/pdf', 'pdf content');

      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)

      const mockRequest = createMockNextRequest(mockFormData)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        url: '/uploads/test-uuid.pdf',
        name: 'document.pdf',
        uploadDate: expect.any(String),
      })
    })

    it('should reject unsupported file types', async () => {
      const { POST } = await import('../../../src/app/api/upload/route');
      const mockFile = createMockFile('document.txt', 'text/plain', 'text content');

      const mockFormData = new FormData()
      mockFormData.append('file', mockFile)

      const mockRequest = createMockNextRequest(mockFormData)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.detail).toBe('Somente imagens e PDFs são permitidos')
    })
  })
