import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFilePath, validateFileRecord, supportsLocalStorage, sanitizeFilename, generateSafeFilename, validateBase64Content, type FileRecord } from '@/lib/utils/filePath';

describe('filePath utils', () => {
  const mockFile: FileRecord = {
    id: 'test-file-123',
    url: 'https://example.com/file.pdf',
    physicalPath: '/uploads/file.pdf',
  };

  describe('supportsLocalStorage', () => {
    it('should return true in development environment', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(supportsLocalStorage()).toBe(true);
    });

    it('should return false in production environment', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(supportsLocalStorage()).toBe(false);
    });

    it('should return false in test environment', () => {
      vi.stubEnv('NODE_ENV', 'test');
      expect(supportsLocalStorage()).toBe(false);
    });

    it('should return false in staging environment', () => {
      vi.stubEnv('NODE_ENV', 'staging');
      expect(supportsLocalStorage()).toBe(false);
    });

    it('should return false when NODE_ENV is undefined', () => {
      vi.stubEnv('NODE_ENV', undefined);
      expect(supportsLocalStorage()).toBe(false);
    });
  });

  describe('getFilePath', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should return physicalPath in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(getFilePath(mockFile)).toBe(mockFile.physicalPath);
    });

    it('should return url in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(getFilePath(mockFile)).toBe(mockFile.url);
    });

    it('should throw error if physicalPath is missing in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      const fileWithoutPhysicalPath = { ...mockFile, physicalPath: '' };

      expect(() => getFilePath(fileWithoutPhysicalPath)).toThrow(
        'Arquivo test-file-123 não possui physicalPath definido para ambiente de desenvolvimento'
      );
    });

    it('should throw error if url is missing in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const fileWithoutUrl = { ...mockFile, url: '' };

      expect(() => getFilePath(fileWithoutUrl)).toThrow(
        'Arquivo test-file-123 não possui URL definida para ambiente de produção'
      );
    });

    it('should handle undefined NODE_ENV as production', () => {
      vi.stubEnv('NODE_ENV', undefined);
      expect(getFilePath(mockFile)).toBe(mockFile.url);
    });

    it('should handle empty string NODE_ENV as production', () => {
      vi.stubEnv('NODE_ENV', '');
      expect(getFilePath(mockFile)).toBe(mockFile.url);
    });
  });

  describe('validateFileRecord', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should not throw in development with valid physicalPath', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(() => validateFileRecord(mockFile)).not.toThrow();
    });

    it('should not throw in production with valid url', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(() => validateFileRecord(mockFile)).not.toThrow();
    });

    it('should throw error if physicalPath is missing in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      const fileWithoutPhysicalPath = { ...mockFile, physicalPath: '' };

      expect(() => validateFileRecord(fileWithoutPhysicalPath)).toThrow(
        'Arquivo test-file-123 requer physicalPath em ambiente de desenvolvimento'
      );
    });

    it('should throw error if url is missing in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const fileWithoutUrl = { ...mockFile, url: '' };

      expect(() => validateFileRecord(fileWithoutUrl)).toThrow(
        'Arquivo test-file-123 requer url em ambiente de produção'
      );
    });

    it('should not throw in production even if physicalPath is missing', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const fileWithoutPhysicalPath = { ...mockFile, physicalPath: '' };
      expect(() => validateFileRecord(fileWithoutPhysicalPath)).not.toThrow();
    });

    it('should not throw in development even if url is missing', () => {
      vi.stubEnv('NODE_ENV', 'development');
      const fileWithoutUrl = { ...mockFile, url: '' };
      expect(() => validateFileRecord(fileWithoutUrl)).not.toThrow();
    });
  });
});

describe('sanitizeFilename', () => {
  it('should remove path traversal sequences', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('windowssystem32');
  });

  it('should remove dangerous characters', () => {
    expect(sanitizeFilename('file<name>')).toBe('filename');
    expect(sanitizeFilename('file:name')).toBe('filename');
    expect(sanitizeFilename('file"name')).toBe('filename');
    expect(sanitizeFilename('file|name')).toBe('filename');
    expect(sanitizeFilename('file?name')).toBe('filename');
    expect(sanitizeFilename('file*name')).toBe('filename');
  });

  it('should remove slashes and backslashes', () => {
    expect(sanitizeFilename('path/to/file')).toBe('pathtofile');
    expect(sanitizeFilename('path\\to\\file')).toBe('pathtofile');
  });

  it('should remove control characters', () => {
    expect(sanitizeFilename('file\x00name')).toBe('filename');
    expect(sanitizeFilename('file\x1fname')).toBe('filename');
  });

  it('should trim whitespace', () => {
    expect(sanitizeFilename('  file  ')).toBe('file');
  });

  it('should limit length to 255 characters', () => {
    const longName = 'a'.repeat(300);
    expect(sanitizeFilename(longName)).toHaveLength(255);
  });

  it('should return generic name if result is empty', () => {
    expect(sanitizeFilename('...///')).toBe('arquivo');
  });

  it('should throw error for invalid input', () => {
    expect(() => sanitizeFilename('')).toThrow('Nome de arquivo inválido');
    expect(() => sanitizeFilename(null as any)).toThrow('Nome de arquivo inválido');
  });
});

describe('generateSafeFilename', () => {
  it('should generate safe filename with timestamp', () => {
    const result = generateSafeFilename('test.jpg', 'image/jpeg');
    expect(result).toMatch(/^test-\d+\.jpg$/);
  });

  it('should use mime type extension if mismatch', () => {
    const result = generateSafeFilename('test.png', 'image/jpeg');
    expect(result).toMatch(/^\d+-[a-z0-9]+\.jpg$/);
  });

  it('should generate unique name if no valid extension', () => {
    const result = generateSafeFilename('testfile', 'image/jpeg');
    expect(result).toMatch(/^\d+-[a-z0-9]+\.jpg$/);
  });

  it('should handle long extensions', () => {
    const result = generateSafeFilename('test.veryverylongextension', 'image/jpeg');
    expect(result).toMatch(/^\d+-[a-z0-9]+\.jpg$/);
  });

  it('should sanitize original name', () => {
    const result = generateSafeFilename('../../../test.jpg', 'image/jpeg');
    expect(result).toMatch(/^test-\d+\.jpg$/);
  });

  it('should work without mime type', () => {
    const result = generateSafeFilename('test.jpg');
    expect(result).toMatch(/^test-\d+\.jpg$/);
  });
});

describe('validateBase64Content', () => {
  it('should validate valid base64 PDF content', () => {
    // Simple PDF content in base64
    const validPdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n').toString('base64');
    const result = validateBase64Content(validPdfBase64, 'application/pdf');
    
    expect(result.isValid).toBe(true);
    expect(result.detectedMimeType).toBe('application/pdf');
    expect(result.error).toBeUndefined();
  });

  it('should validate valid base64 JPEG content', () => {
    // JPEG header in base64
    const validJpegBase64 = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]).toString('base64');
    const result = validateBase64Content(validJpegBase64, 'image/jpeg');
    
    expect(result.isValid).toBe(true);
    expect(result.detectedMimeType).toBe('image/jpeg');
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid base64 format', () => {
    const invalidBase64 = 'not-valid-base64!!!';
    const result = validateBase64Content(invalidBase64);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Conteúdo base64 inválido');
    expect(result.detectedMimeType).toBeUndefined();
  });

  it('should reject files larger than 10MB', () => {
    // Create a base64 string that decodes to more than 10MB
    const largeContent = Buffer.alloc(11 * 1024 * 1024, 'a').toString('base64');
    const result = validateBase64Content(largeContent);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Arquivo muito grande');
  });

  it('should accept files up to 10MB', () => {
    const tenMBContent = Buffer.alloc(10 * 1024 * 1024, 'a').toString('base64');
    const result = validateBase64Content(tenMBContent);
    
    expect(result.isValid).toBe(true);
  });

  it('should reject content with dangerous scripts', () => {
    const maliciousContent = Buffer.from('<script>alert("xss")</script>').toString('base64');
    const result = validateBase64Content(maliciousContent);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Conteúdo potencialmente perigoso detectado');
  });

  it('should reject content with JavaScript URLs', () => {
    const maliciousContent = Buffer.from('javascript:alert("xss")').toString('base64');
    const result = validateBase64Content(maliciousContent);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Conteúdo potencialmente perigoso detectado');
  });

  it('should reject content with event handlers', () => {
    const maliciousContent = Buffer.from('<img onload="alert(1)">').toString('base64');
    const result = validateBase64Content(maliciousContent);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Conteúdo potencialmente perigoso detectado');
  });

  it('should reject content with data URLs', () => {
    const maliciousContent = Buffer.from('data:text/html,<script>alert(1)</script>').toString('base64');
    const result = validateBase64Content(maliciousContent);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Conteúdo potencialmente perigoso detectado');
  });

  it('should reject MIME type mismatch', () => {
    // PDF content but expecting JPEG
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n').toString('base64');
    const result = validateBase64Content(pdfContent, 'image/jpeg');
    
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('não corresponde ao esperado');
    expect(result.detectedMimeType).toBe('application/pdf');
  });

  it('should accept compatible MIME types', () => {
    // JPEG content with jpg extension
    const jpegContent = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]).toString('base64');
    const result = validateBase64Content(jpegContent, 'image/jpg');
    
    expect(result.isValid).toBe(true);
    expect(result.detectedMimeType).toBe('image/jpeg');
  });

  it('should handle unknown file signatures', () => {
    const unknownContent = Buffer.from('unknown file content').toString('base64');
    const result = validateBase64Content(unknownContent);
    
    expect(result.isValid).toBe(true);
    expect(result.detectedMimeType).toBeUndefined();
  });

  it('should handle empty content', () => {
    const emptyContent = '';
    const result = validateBase64Content(emptyContent);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Conteúdo base64 inválido');
  });

  it('should handle malformed base64 with wrong padding', () => {
    const malformedBase64 = 'SGVs=cmQ='; // Invalid: = in the middle
    const result = validateBase64Content(malformedBase64);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Conteúdo base64 inválido');
  });

  it('should handle base64 with invalid characters', () => {
    const invalidChars = 'SGVs!@#$%^&*()bG8gV29ybGQ=';
    const result = validateBase64Content(invalidChars);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Conteúdo base64 inválido');
  });
});
