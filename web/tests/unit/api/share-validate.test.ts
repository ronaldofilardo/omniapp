// Utilitário para mock de NextRequest
function createMockNextRequest(body: any): any {
  return {
    json: vi.fn().mockResolvedValue(body),
    cookies: {},
    nextUrl: {},
    page: undefined,
    ua: undefined,
  };
}
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do shareStore
vi.mock('@/lib/shareStore', () => ({
  shareStore: new Map(),
  cleanupExpiredShares: vi.fn(),
}))

import { POST } from '@/app/api/share/validate/route'
import { shareStore } from '@/lib/shareStore'

const mockShareStore = shareStore as any

describe('/api/share/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockShareStore.clear()
  })

  it('should validate code and return files successfully', async () => {
    const token = 'valid-token'
    const accessCode = '123456'
    const fileUrls = ['https://example.com/file1.pdf', 'https://example.com/file2.jpg']

    // Setup mock data
    mockShareStore.set(token, {
      files: fileUrls,
      accessCode,
      used: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })

    const requestBody = {
      token,
      code: accessCode
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.files).toHaveLength(2)
    expect(data.files[0]).toEqual({
      id: 'file-0',
      name: 'file1.pdf',
      type: 'pdf',
      url: 'https://example.com/file1.pdf'
    })
    expect(data.files[1]).toEqual({
      id: 'file-1',
      name: 'file2.jpg',
      type: 'jpg',
      url: 'https://example.com/file2.jpg'
    })

    // Verificar se o compartilhamento foi marcado como usado
    const storedData = mockShareStore.get(token)
    expect(storedData.used).toBe(true)
  })

  it('should return 400 for missing token', async () => {
    const requestBody = {
      code: '123456'
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Token e código são obrigatórios')
  })

  it('should return 400 for missing code', async () => {
    const requestBody = {
      token: 'some-token'
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Token e código são obrigatórios')
  })

  it('should return 404 for invalid token', async () => {
    const requestBody = {
      token: 'invalid-token',
      code: '123456'
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Link expirado ou inválido')
  })

  it('should return 401 for incorrect access code', async () => {
    const token = 'valid-token'
    const correctCode = '123456'
    const wrongCode = '654321'

    // Setup mock data
    mockShareStore.set(token, {
      files: ['https://example.com/file1.pdf'],
      accessCode: correctCode,
      used: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })

    const requestBody = {
      token,
      code: wrongCode
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Código de acesso incorreto')

    // Verificar que o compartilhamento não foi marcado como usado
    const storedData = mockShareStore.get(token)
    expect(storedData.used).toBe(false)
  })

  it('should return 410 for already used link', async () => {
    const token = 'used-token'
    const accessCode = '123456'

    // Setup mock data with used = true
    mockShareStore.set(token, {
      files: ['https://example.com/file1.pdf'],
      accessCode,
      used: true,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })

    const requestBody = {
      token,
      code: accessCode
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(410)
    expect(data.error).toBe('Este link já foi utilizado')
  })

  it('should return 404 for expired link', async () => {
    const token = 'expired-token'
    const accessCode = '123456'

    // Setup mock data with expired timestamp
    mockShareStore.set(token, {
      files: ['https://example.com/file1.pdf'],
      accessCode,
      used: false,
      expiresAt: Date.now() - 1000 // Expired 1 second ago
    })

    const requestBody = {
      token,
      code: accessCode
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Link expirado ou inválido')
  })

  it('should handle empty files array', async () => {
    const token = 'empty-token'
    const accessCode = '123456'

    // Setup mock data with empty files
    mockShareStore.set(token, {
      files: [],
      accessCode,
      used: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })

    const requestBody = {
      token,
      code: accessCode
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.files).toEqual([])

    // Verificar se foi marcado como usado
    const storedData = mockShareStore.get(token)
    expect(storedData.used).toBe(true)
  })

  it('should extract filename from URL correctly', async () => {
    const token = 'filename-token'
    const accessCode = '123456'
    const fileUrls = [
      'https://example.com/path/to/document.pdf',
      'https://example.com/simple.jpg',
      'https://example.com/file-without-extension',
      'https://example.com/path/file.with.multiple.dots.pdf'
    ]

    // Setup mock data
    mockShareStore.set(token, {
      files: fileUrls,
      accessCode,
      used: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })

    const requestBody = {
      token,
      code: accessCode
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.files).toEqual([
      {
        id: 'file-0',
        name: 'document.pdf',
        type: 'pdf',
        url: 'https://example.com/path/to/document.pdf'
      },
      {
        id: 'file-1',
        name: 'simple.jpg',
        type: 'jpg',
        url: 'https://example.com/simple.jpg'
      },
      {
        id: 'file-2',
        name: 'file-without-extension',
        type: 'file',
        url: 'https://example.com/file-without-extension'
      },
      {
        id: 'file-3',
        name: 'file.with.multiple.dots.pdf',
        type: 'pdf',
        url: 'https://example.com/path/file.with.multiple.dots.pdf'
      }
    ])
  })

  it('should handle files with query parameters in URL', async () => {
    const token = 'query-token'
    const accessCode = '123456'
    const fileUrls = ['https://example.com/file.pdf?token=abc&expires=123']

    // Setup mock data
    mockShareStore.set(token, {
      files: fileUrls,
      accessCode,
      used: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })

    const requestBody = {
      token,
      code: accessCode
    }

    const mockRequest = createMockNextRequest(requestBody)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.files[0]).toEqual({
      id: 'file-0',
      name: 'file.pdf?token=abc&expires=123',
      type: 'pdf?token=abc&expires=123',
      url: 'https://example.com/file.pdf?token=abc&expires=123',
    })
  })

  it('should return 500 on internal error', async () => {
    // Força erro lançando exception no shareStore.get
    const originalGet = mockShareStore.get;
    mockShareStore.get = () => { throw new Error('Simulated internal error') };
    const requestBody = {
      token: 'error-token',
      code: '123456'
    }
    const mockRequest = createMockNextRequest(requestBody)
    const response = await POST(mockRequest)
    const data = await response.json()
    expect(response.status).toBe(500)
    expect(data.error).toBe('Erro interno do servidor')
    // Restaurar comportamento original
    mockShareStore.get = originalGet;
  })

  it('should allow multiple validations if not marked as used', async () => {
    // Este teste verifica o comportamento atual - o código marca como usado após validação
    // Se quisermos permitir múltiplas validações, precisaríamos mudar a lógica
    const token = 'multi-token'
    const accessCode = '123456'

    mockShareStore.set(token, {
      files: ['https://example.com/file1.pdf'],
      accessCode,
      used: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })

    const requestBody = {
      token,
      code: accessCode
    }

    const mockRequest = createMockNextRequest(requestBody)

    // Primeira validação
    const response1 = await POST(mockRequest)
    expect(response1.status).toBe(200)

    // Segunda validação deve falhar
    const response2 = await POST(mockRequest)
    expect(response2.status).toBe(410)
  })
})
