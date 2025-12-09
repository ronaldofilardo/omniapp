import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import {
  calculateFileHashFromBase64,
  calculateFileHashFromBuffer,
} from '@/lib/utils/fileHashServer'

describe('fileHashServer', () => {
  describe('calculateFileHashFromBase64', () => {
    it('should calculate SHA-256 hash from valid base64 content', () => {
      // Conteúdo de exemplo: "Hello World"
      const base64Content = Buffer.from('Hello World').toString('base64')
      const hash = calculateFileHashFromBase64(base64Content)

      // Hash SHA-256 esperado de "Hello World"
      const expectedHash = crypto
        .createHash('sha256')
        .update('Hello World')
        .digest('hex')

      expect(hash).toBe(expectedHash)
      expect(hash).toHaveLength(64) // SHA-256 = 64 caracteres hex
    })

    it('should calculate consistent hash for same content', () => {
      const base64Content = Buffer.from('Test content').toString('base64')
      const hash1 = calculateFileHashFromBase64(base64Content)
      const hash2 = calculateFileHashFromBase64(base64Content)

      expect(hash1).toBe(hash2)
    })

    it('should calculate different hashes for different content', () => {
      const base64Content1 = Buffer.from('Content A').toString('base64')
      const base64Content2 = Buffer.from('Content B').toString('base64')

      const hash1 = calculateFileHashFromBase64(base64Content1)
      const hash2 = calculateFileHashFromBase64(base64Content2)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty base64 content', () => {
      const base64Content = Buffer.from('').toString('base64')
      const hash = calculateFileHashFromBase64(base64Content)

      // Hash SHA-256 de string vazia
      const expectedHash = crypto.createHash('sha256').update('').digest('hex')

      expect(hash).toBe(expectedHash)
    })

    it('should handle invalid base64 content gracefully', () => {
      const invalidBase64 = 'not-valid-base64!!!'

      // Node.js Buffer.from aceita base64 inválido e tenta decodificar
      // Então não lançará erro, mas retornará um hash válido
      const hash = calculateFileHashFromBase64(invalidBase64)
      
      expect(hash).toHaveLength(64)
      expect(typeof hash).toBe('string')
    })
  })

  describe('calculateFileHashFromBuffer', () => {
    it('should calculate SHA-256 hash from valid buffer', () => {
      const buffer = Buffer.from('Hello World')
      const hash = calculateFileHashFromBuffer(buffer)

      const expectedHash = crypto
        .createHash('sha256')
        .update('Hello World')
        .digest('hex')

      expect(hash).toBe(expectedHash)
      expect(hash).toHaveLength(64)
    })

    it('should calculate consistent hash for same buffer', () => {
      const buffer = Buffer.from('Test content')
      const hash1 = calculateFileHashFromBuffer(buffer)
      const hash2 = calculateFileHashFromBuffer(buffer)

      expect(hash1).toBe(hash2)
    })

    it('should calculate different hashes for different buffers', () => {
      const buffer1 = Buffer.from('Content A')
      const buffer2 = Buffer.from('Content B')

      const hash1 = calculateFileHashFromBuffer(buffer1)
      const hash2 = calculateFileHashFromBuffer(buffer2)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('')
      const hash = calculateFileHashFromBuffer(buffer)

      const expectedHash = crypto.createHash('sha256').update('').digest('hex')

      expect(hash).toBe(expectedHash)
    })

    it('should handle large buffers', () => {
      // Buffer de 1MB
      const largeBuffer = Buffer.alloc(1024 * 1024, 'a')
      const hash = calculateFileHashFromBuffer(largeBuffer)

      expect(hash).toHaveLength(64)
      expect(typeof hash).toBe('string')
    })
  })

  describe('hash consistency between base64 and buffer', () => {
    it('should produce same hash from base64 and buffer of same content', () => {
      const content = 'Same content for both methods'
      const buffer = Buffer.from(content)
      const base64 = buffer.toString('base64')

      const hashFromBase64 = calculateFileHashFromBase64(base64)
      const hashFromBuffer = calculateFileHashFromBuffer(buffer)

      expect(hashFromBase64).toBe(hashFromBuffer)
    })

    it('should produce same hash for binary data', () => {
      // Simula dados binários (imagem, PDF, etc)
      const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
      const base64 = binaryData.toString('base64')

      const hashFromBase64 = calculateFileHashFromBase64(base64)
      const hashFromBuffer = calculateFileHashFromBuffer(binaryData)

      expect(hashFromBase64).toBe(hashFromBuffer)
    })
  })
})

