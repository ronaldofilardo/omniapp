import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do shareStore
vi.mock('@/lib/shareStore', () => ({
  shareStore: new Map(),
  cleanupExpiredShares: vi.fn(),
}))

// Mock do crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => 'mocked-token')
    }))
  }
}))

import { POST } from '@/app/api/share/generate/route'
import { shareStore } from '@/lib/shareStore'

const mockShareStore = shareStore as any

describe('/api/share/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockShareStore.clear()
  })

  it('should generate share link successfully', async () => {
    const requestBody = {
      eventId: 'event-123',
      fileUrls: ['https://example.com/file1.pdf', 'https://example.com/file2.jpg']
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost:3000'
          return null
        })
      },
      nextUrl: {
        protocol: 'http:'
      }
    } as unknown as Request

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('shareLink')
    expect(data).toHaveProperty('accessCode')
    expect(data).toHaveProperty('token')

    // Verificar se o link contém o token correto
    expect(data.shareLink).toContain('mocked-token')
    expect(data.shareLink).toMatch(/https?:\/\/[^\/]+\/shared\/mocked-token/)

    // Verificar se o código de acesso tem 6 dígitos
    expect(data.accessCode).toMatch(/^\d{6}$/)

    // Verificar se os dados foram armazenados no shareStore
    expect(mockShareStore.get('mocked-token')).toEqual({
      files: requestBody.fileUrls,
      accessCode: data.accessCode,
      used: false,
      expiresAt: expect.any(Number)
    })
  })

  it('should return 400 for missing eventId', async () => {
    const requestBody = {
      fileUrls: ['https://example.com/file1.pdf']
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
    } as unknown as Request

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Dados inválidos')
  })

  it('should return 400 for missing fileUrls', async () => {
    const requestBody = {
      eventId: 'event-123'
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
    } as unknown as Request

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Dados inválidos')
  })

  it('should return 400 for invalid fileUrls type', async () => {
    const requestBody = {
      eventId: 'event-123',
      fileUrls: 'not-an-array'
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
    } as unknown as Request

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Dados inválidos')
  })

  it('should use local IP for development environment', async () => {
    const requestBody = {
      eventId: 'event-123',
      fileUrls: ['https://example.com/file1.pdf']
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost:3000'
          return null
        })
      },
      nextUrl: {
        protocol: 'http:'
      }
    } as unknown as Request

    // Mock process.env
    const originalEnv = process.env
    process.env = { ...originalEnv, NEXT_PUBLIC_LOCAL_IP: '192.168.1.100:3000' }

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(data.shareLink).toBe('http://192.168.1.100:3000/shared/mocked-token')

    // Restore original env
    process.env = originalEnv
  })

  it('should use default local IP when NEXT_PUBLIC_LOCAL_IP is not set', async () => {
    const requestBody = {
      eventId: 'event-123',
      fileUrls: ['https://example.com/file1.pdf']
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost:3000'
          return null
        })
      },
      nextUrl: {
        protocol: 'http:'
      }
    } as unknown as Request

    // Ensure NEXT_PUBLIC_LOCAL_IP is not set
    const originalEnv = process.env
    delete process.env.NEXT_PUBLIC_LOCAL_IP

    const response = await POST(mockRequest)
    const data = await response.json()

    // Should use a local network IP (192.168.x.x) when NEXT_PUBLIC_LOCAL_IP is not set
    expect(data.shareLink).toMatch(/^http:\/\/192\.168\.\d+\.\d+:3000\/shared\/mocked-token$/)

    // Restore original env
    process.env = originalEnv
  })

  it('should use host from headers when not localhost', async () => {
    const requestBody = {
      eventId: 'event-123',
      fileUrls: ['https://example.com/file1.pdf']
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'myapp.com'
          return null
        })
      },
      nextUrl: {
        protocol: 'https:'
      }
    } as unknown as Request

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(data.shareLink).toBe('https://myapp.com/shared/mocked-token')
  })

  it('should generate unique access codes', async () => {
    const requestBody = {
      eventId: 'event-123',
      fileUrls: ['https://example.com/file1.pdf']
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost:3000'
          return null
        })
      },
      nextUrl: {
        protocol: 'http:'
      }
    } as unknown as Request

    // Mock Math.random to return predictable values
    const originalRandom = Math.random
    let callCount = 0
    Math.random = vi.fn(() => {
      callCount++
      return callCount === 1 ? 0.123456 : 0.654321
    })

    const response1 = await POST(mockRequest)
    const data1 = await response1.json()

    const response2 = await POST(mockRequest)
    const data2 = await response2.json()

    expect(data1.accessCode).not.toBe(data2.accessCode)
    expect(data1.accessCode).toMatch(/^\d{6}$/)
    expect(data2.accessCode).toMatch(/^\d{6}$/)

    // Restore original Math.random
    Math.random = originalRandom
  })

  it('should set expiration time to 24 hours from now', async () => {
    const now = Date.now()
    const requestBody = {
      eventId: 'event-123',
      fileUrls: ['https://example.com/file1.pdf']
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost:3000'
          return null
        })
      },
      nextUrl: {
        protocol: 'http:'
      }
    } as unknown as Request

    const response = await POST(mockRequest)
    const data = await response.json()

    const storedData = mockShareStore.get('mocked-token')
    const expectedExpiry = now + 24 * 60 * 60 * 1000

    // Allow for small timing differences
    expect(storedData.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000)
    expect(storedData.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000)
  })

  it('should handle empty fileUrls array', async () => {
    const requestBody = {
      eventId: 'event-123',
      fileUrls: []
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue(requestBody),
      headers: {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost:3000'
          return null
        })
      },
      nextUrl: {
        protocol: 'http:'
      }
    } as unknown as Request

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockShareStore.get('mocked-token').files).toEqual([])
  })

  it('should return 500 on internal error', async () => {
    const requestBody = {
      eventId: 'event-123',
      fileUrls: ['https://example.com/file1.pdf']
    }

    const mockRequest = {
      json: vi.fn().mockRejectedValue(new Error('Parse error')),
      headers: {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost:3000'
          return null
        })
      },
      nextUrl: {
        protocol: 'http:'
      }
    } as unknown as Request

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Erro interno do servidor')
  })
})
