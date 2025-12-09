import { StorageProvider, FileMetadata, UploadOptions, StorageResult } from './StorageProvider'
import { LocalStorageProvider } from './LocalStorageProvider'

/**
 * Provider compatível com Vercel Free
 * Mantém os limites atuais de 2KB para não quebrar deploy
 */
export class VercelCompatibleStorageProvider extends LocalStorageProvider {
  getMaxFileSize(): number {
    return 2 * 1024 // Sempre 2KB para Vercel
  }

  supportsLargeFiles(): boolean {
    return false // Nunca suporta arquivos grandes
  }

  async upload(file: File, options: UploadOptions = {}): Promise<StorageResult> {
    // Forçar limite de 2KB independente da configuração
    if (file.size > 2048) {
      return {
        success: false,
        fileId: '',
        url: '',
        metadata: {} as FileMetadata,
        error: 'Arquivo deve ter menos de 2KB (limitação Vercel Free)'
      }
    }

    // Restringir tipos MIME para imagens apenas
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        fileId: '',
        url: '',
        metadata: {} as FileMetadata,
        error: 'Apenas imagens são permitidas (limitação Vercel Free)'
      }
    }

    // Usar implementação do LocalStorageProvider
    return super.upload(file, options)
  }
}