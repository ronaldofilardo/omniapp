import { describe, it, expect } from 'vitest'
import { getUploadConfig, isMimeTypeAllowed, formatFileSize } from '@/lib/config/upload'
import { getFileTooLargeError } from '@/lib/constants/fileLimits'

describe('Upload Configuration', () => {
  describe('getUploadConfig', () => {
    it('should return production config in production environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const config = getUploadConfig()

      expect(config.maxFileSize).toBe(2 * 1024 * 1024) // 2MB
      expect(config.allowedMimeTypes).toEqual([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ])
      expect(config.sizeSuffix).toBe('MB')

      process.env.NODE_ENV = originalEnv
    })

    it('should return development config in development environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const config = getUploadConfig()

      expect(config.maxFileSize).toBe(2 * 1024 * 1024) // 2MB
      expect(config.allowedMimeTypes).toEqual([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ])
      expect(config.sizeSuffix).toBe('MB')

      process.env.NODE_ENV = originalEnv
    })

    it('should return development config in test environment', () => {
      const config = getUploadConfig()

      expect(config.maxFileSize).toBe(2 * 1024 * 1024) // 2MB
      expect(config.allowedMimeTypes).toContain('application/pdf')
    })
  })

  describe('isMimeTypeAllowed', () => {
    it('should allow image MIME types', () => {
      expect(isMimeTypeAllowed('image/jpeg')).toBe(true)
      expect(isMimeTypeAllowed('image/png')).toBe(true)
      expect(isMimeTypeAllowed('image/gif')).toBe(true)
      expect(isMimeTypeAllowed('image/webp')).toBe(true)
    })

    it('should allow PDF MIME type', () => {
      expect(isMimeTypeAllowed('application/pdf')).toBe(true)
    })

    it('should reject unsupported MIME types', () => {
      expect(isMimeTypeAllowed('text/plain')).toBe(false)
      expect(isMimeTypeAllowed('application/json')).toBe(false)
      expect(isMimeTypeAllowed('video/mp4')).toBe(false)
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1KB')
      expect(formatFileSize(1536)).toBe('2KB')
      expect(formatFileSize(1024 * 1024)).toBe('1.0MB')
      expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0MB')
    })
  })

  describe('getFileTooLargeError', () => {
    it('should generate correct error message', () => {
      const error = getFileTooLargeError(3 * 1024 * 1024, 'result')

      expect(error).toContain('Arquivo de laudo deve ter menos de')
      expect(error).toContain('2.0MB')
      expect(error).toContain('Tamanho atual: 3.0MB')
    })
  })
})

