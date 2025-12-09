import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { StorageProvider, FileMetadata, UploadOptions, StorageResult } from './StorageProvider'
import { getCurrentStorageConfig } from './config'
import { calculateFileHashFromBuffer } from '../utils/fileHashServer'

export class LocalStorageProvider implements StorageProvider {
  private config = getCurrentStorageConfig()
  private uploadDir = path.join(process.cwd(), 'public', 'uploads')

  async upload(file: File, options: UploadOptions = {}): Promise<StorageResult> {
    try {
      // Validar tamanho do arquivo
      if (file.size > this.config.maxFileSize) {
        return {
          success: false,
          fileId: '',
          url: '',
          metadata: {} as FileMetadata,
          error: `Arquivo muito grande. Máximo: ${this.config.maxFileSize} bytes`
        }
      }

      // Validar tipo MIME
      if (!this.config.allowedMimeTypes.includes(file.type)) {
        return {
          success: false,
          fileId: '',
          url: '',
          metadata: {} as FileMetadata,
          error: 'Tipo de arquivo não permitido'
        }
      }

      // Gerar ID único
      const fileId = randomUUID()

      // Criar diretório se necessário
      const eventDir = options.eventId ? path.join(this.uploadDir, options.eventId) : this.uploadDir
      await fs.mkdir(eventDir, { recursive: true })

      // Gerar nome do arquivo
      const fileExtension = file.name.split('.').pop() || 'bin'
      const slot = options.slot || 'file'
      const fileName = options.eventId ? `${slot}-${file.name}` : `${fileId}.${fileExtension}`
      const filePath = path.join(eventDir, fileName)

      // Salvar arquivo
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await fs.writeFile(filePath, buffer)

      // Calcular hash
      const fileHash = calculateFileHashFromBuffer(buffer)

      // Criar metadados
      const metadata: FileMetadata = {
        id: fileId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        physicalPath: options.eventId ? `/uploads/${options.eventId}/${fileName}` : `/uploads/${fileName}`,
        hash: fileHash,
        expiryDate: options.expiryDate
      }

      // URL de acesso
      const url = options.eventId
        ? `/api/files/${fileId}/download`
        : `/uploads/${fileName}`

      return {
        success: true,
        fileId,
        url,
        metadata
      }
    } catch (error) {
      console.error('Erro no upload local:', error)
      return {
        success: false,
        fileId: '',
        url: '',
        metadata: {} as FileMetadata,
        error: 'Erro interno no upload'
      }
    }
  }

  async getUrl(fileId: string): Promise<string> {
    // Para storage local, retorna URL relativa
    // Em produção real, isso seria uma URL assinada
    return `/api/files/${fileId}/download`
  }

  async delete(fileId: string): Promise<boolean> {
    try {
      // Buscar arquivo no banco para obter physicalPath
      const { prisma } = await import('../prisma')
      const fileRecord = await prisma.files.findUnique({
        where: { id: fileId }
      })

      if (!fileRecord?.physicalPath) {
        return false
      }

      const fullPath = path.join(process.cwd(), 'public', fileRecord.physicalPath)
      await fs.unlink(fullPath)
      return true
    } catch (error) {
      console.error('Erro ao deletar arquivo local:', error)
      return false
    }
  }

  supportsLargeFiles(): boolean {
    return this.config.allowLargeFiles
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const { prisma } = await import('../prisma')
      const fileRecord = await prisma.files.findUnique({
        where: { id: fileId }
      })

      if (!fileRecord) return null

      return {
        id: fileRecord.id,
        name: fileRecord.name,
        size: 0, // Não armazenamos tamanho no banco
        mimeType: 'application/octet-stream', // Não armazenamos MIME no banco
        uploadedAt: typeof fileRecord.uploadDate === 'string' ? fileRecord.uploadDate : new Date().toISOString(),
        url: fileRecord.url,
        physicalPath: fileRecord.physicalPath || undefined,
        hash: fileRecord.fileHash || undefined,
        expiryDate: typeof fileRecord.expiryDate === 'string' ? fileRecord.expiryDate : undefined
      }
    } catch (error) {
      console.error('Erro ao buscar metadados:', error)
      return null
    }
  }
}