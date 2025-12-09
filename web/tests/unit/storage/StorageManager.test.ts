/**
 * Testes de StorageManager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LocalStorageProvider } from '@/lib/storage/LocalStorageProvider';
import { CloudinaryStorageProvider } from '@/lib/storage/CloudinaryStorageProvider';

// Mock da configuração ANTES de qualquer import
vi.mock('@/lib/storage/config', () => ({
  getCurrentStorageConfig: vi.fn().mockReturnValue({ provider: 'local' }),
}));

// Mock das classes dos providers
vi.mock('@/lib/storage/LocalStorageProvider', () => ({
  LocalStorageProvider: class LocalStorageProviderMock {
    upload = vi.fn();
    getUrl = vi.fn();
    delete = vi.fn();
    supportsLargeFiles = vi.fn();
    getMaxFileSize = vi.fn();
    getMetadata = vi.fn();
  },
}));

vi.mock('@/lib/storage/CloudinaryStorageProvider', () => ({
  CloudinaryStorageProvider: class CloudinaryStorageProviderMock {
    upload = vi.fn();
    getUrl = vi.fn();
    delete = vi.fn();
    supportsLargeFiles = vi.fn();
    getMaxFileSize = vi.fn();
    getMetadata = vi.fn();
  },
}));

vi.mock('@/lib/storage/VercelCompatibleStorageProvider', () => ({
  VercelCompatibleStorageProvider: class VercelCompatibleStorageProviderMock {
    upload = vi.fn();
    getUrl = vi.fn();
    delete = vi.fn();
    supportsLargeFiles = vi.fn();
    getMaxFileSize = vi.fn();
    getMetadata = vi.fn();
  },
}));

import { StorageManager, storageManager } from '@/lib/storage/StorageManager';
import { getCurrentStorageConfig } from '@/lib/storage/config';

describe('StorageManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (StorageManager as any).instance = null;
  });

  afterEach(() => {
    // Reset singleton instance
    (StorageManager as any).instance = null;
  });

  describe('Singleton Pattern', () => {
    it('deve retornar a mesma instância (singleton)', () => {
      const instance1 = StorageManager.getInstance();
      const instance2 = StorageManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(StorageManager);
    });

    it('deve exportar instância singleton', () => {
      // Skip test - singleton é criado no módulo e não pode ser resetado
      expect(storageManager).toBeInstanceOf(StorageManager);
    });
  });

  describe('Provider Creation', () => {
    it('deve criar LocalStorageProvider quando provider é "local"', () => {
      (getCurrentStorageConfig as any).mockReturnValue({ provider: 'local' });

      const manager = new StorageManager();
      const provider = manager.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('deve criar CloudinaryStorageProvider quando provider é "cloudinary"', () => {
      (getCurrentStorageConfig as any).mockReturnValue({ provider: 'cloudinary' });

      const manager = new StorageManager();
      const provider = manager.getProvider();

      expect(provider).toBeInstanceOf(CloudinaryStorageProvider);
    });

    it('deve criar LocalStorageProvider como fallback para provider não implementado', () => {
      (getCurrentStorageConfig as any).mockReturnValue({ provider: 'b2' });

      const manager = new StorageManager();
      const provider = manager.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('deve criar LocalStorageProvider como fallback para provider desconhecido', () => {
      (getCurrentStorageConfig as any).mockReturnValue({ provider: 'unknown' });

      const manager = new StorageManager();
      const provider = manager.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });
  });

  describe('Convenience Methods', () => {
    let manager: StorageManager;
    let mockProvider: any;

    beforeEach(() => {
      (getCurrentStorageConfig as any).mockReturnValue({ provider: 'local' });
      manager = new StorageManager();
      mockProvider = manager.getProvider();
    });

    describe('upload', () => {
      it('deve delegar upload para o provider com opções padrão', async () => {
        const file = new File(['test'], 'test.txt');
        const expectedResult = { id: 'file-123', url: 'http://example.com/file' };

        mockProvider.upload.mockResolvedValue(expectedResult);

        const result = await manager.upload(file);

        expect(mockProvider.upload).toHaveBeenCalledWith(file, {});
        expect(result).toBe(expectedResult);
      });

      it('deve delegar upload para o provider com opções customizadas', async () => {
        const file = new File(['test'], 'test.txt');
        const options = { folder: 'uploads', public: true };
        const expectedResult = { id: 'file-123', url: 'http://example.com/file' };

        mockProvider.upload.mockResolvedValue(expectedResult);

        const result = await manager.upload(file, options);

        expect(mockProvider.upload).toHaveBeenCalledWith(file, options);
        expect(result).toBe(expectedResult);
      });
    });

    describe('getUrl', () => {
      it('deve delegar getUrl para o provider', async () => {
        const fileId = 'file-123';
        const expectedUrl = 'http://example.com/file';

        mockProvider.getUrl.mockResolvedValue(expectedUrl);

        const result = await manager.getUrl(fileId);

        expect(mockProvider.getUrl).toHaveBeenCalledWith(fileId);
        expect(result).toBe(expectedUrl);
      });
    });

    describe('delete', () => {
      it('deve delegar delete para o provider', async () => {
        const fileId = 'file-123';
        const expectedResult = true;

        mockProvider.delete.mockResolvedValue(expectedResult);

        const result = await manager.delete(fileId);

        expect(mockProvider.delete).toHaveBeenCalledWith(fileId);
        expect(result).toBe(expectedResult);
      });
    });

    describe('supportsLargeFiles', () => {
      it('deve delegar supportsLargeFiles para o provider', () => {
        const expectedResult = true;

        mockProvider.supportsLargeFiles.mockReturnValue(expectedResult);

        const result = manager.supportsLargeFiles();

        expect(mockProvider.supportsLargeFiles).toHaveBeenCalled();
        expect(result).toBe(expectedResult);
      });
    });

    describe('getMaxFileSize', () => {
      it('deve delegar getMaxFileSize para o provider', () => {
        const expectedSize = 10485760; // 10MB

        mockProvider.getMaxFileSize.mockReturnValue(expectedSize);

        const result = manager.getMaxFileSize();

        expect(mockProvider.getMaxFileSize).toHaveBeenCalled();
        expect(result).toBe(expectedSize);
      });
    });

    describe('getMetadata', () => {
      it('deve delegar getMetadata para o provider', async () => {
        const fileId = 'file-123';
        const expectedMetadata = {
          id: 'file-123',
          name: 'test.txt',
          size: 1024,
          mimeType: 'text/plain',
          uploadedAt: new Date(),
        };

        mockProvider.getMetadata.mockResolvedValue(expectedMetadata);

        const result = await manager.getMetadata(fileId);

        expect(mockProvider.getMetadata).toHaveBeenCalledWith(fileId);
        expect(result).toBe(expectedMetadata);
      });
    });
  });

  describe('Provider Switching', () => {
    it('deve permitir switching de provider recriando instância', () => {
      // Primeiro provider
      (getCurrentStorageConfig as any).mockReturnValue({ provider: 'local' });
      const manager1 = new StorageManager();
      expect(manager1.getProvider()).toBeInstanceOf(LocalStorageProvider);

      // Reset singleton para testar switching
      (StorageManager as any).instance = null;

      // Segundo provider
      (getCurrentStorageConfig as any).mockReturnValue({ provider: 'cloudinary' });
      const manager2 = new StorageManager();
      expect(manager2.getProvider()).toBeInstanceOf(CloudinaryStorageProvider);

      // Verificar que são instâncias diferentes
      expect(manager1).not.toBe(manager2);
    });
  });
});