export interface FileMetadata {
  id: string
  name: string
  size: number
  mimeType: string
  uploadedAt: string
  url?: string
  physicalPath?: string
  hash?: string
  expiryDate?: string
}

export interface UploadOptions {
  eventId?: string
  professionalId?: string
  slot?: string
  expiryDate?: string
  filename?: string
}

export interface StorageResult {
  success: boolean
  fileId: string
  url: string
  metadata: FileMetadata
  error?: string
}

export interface StorageProvider {
  /**
   * Upload de arquivo
   */
  upload(file: File, options: UploadOptions): Promise<StorageResult>

  /**
   * Obter URL para acesso ao arquivo
   */
  getUrl(fileId: string): Promise<string>

  /**
   * Deletar arquivo
   */
  delete(fileId: string): Promise<boolean>

  /**
   * Verificar se suporta arquivos grandes
   */
  supportsLargeFiles(): boolean

  /**
   * Obter tamanho máximo suportado
   */
  getMaxFileSize(): number

  /**
   * Obter metadados do arquivo
   */
  getMetadata(fileId: string): Promise<FileMetadata | null>
}