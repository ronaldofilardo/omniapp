import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, FileMetadata, UploadOptions, StorageResult } from './StorageProvider';

/**
 * Cloudinary Storage Provider
 *
 * Implementação para armazenamento de arquivos no Cloudinary.
 */
export class CloudinaryStorageProvider implements StorageProvider {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    this.apiKey = process.env.CLOUDINARY_API_KEY!;
    this.apiSecret = process.env.CLOUDINARY_API_SECRET!;

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
    });
  }

  async upload(file: File, options: UploadOptions = {}): Promise<StorageResult> {
    try {
      const filename = options.filename || file.name;
      // Remover extensão duplicada se existir (ex: file.pdf.pdf -> file.pdf)
      const cleanFilename = filename.replace(/\.(\w+)\.\1$/, '.$1');
      // Remover extensão do public_id para evitar duplicação
      const publicId = cleanFilename.replace(/\.[^.]+$/, '');
      const buffer = Buffer.from(await file.arrayBuffer());

      // Detectar tipo de arquivo (PDF precisa de resource_type 'raw')
      const isPdf = file.type === 'application/pdf' || cleanFilename.toLowerCase().endsWith('.pdf');
      const resourceType = isPdf ? 'raw' : 'auto';

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: resourceType,
            folder: 'omni-files',
            format: isPdf ? 'pdf' : undefined,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });

      const fileId = uploadResult.public_id;
      // Usar a URL segura retornada pelo Cloudinary (já tem o resource_type correto)
      const url = uploadResult.secure_url;

      return {
        success: true,
        fileId,
        url,
        metadata: {
          id: fileId,
          name: cleanFilename,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          url,
          hash: uploadResult.etag,
        },
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        fileId: '',
        url: '',
        metadata: {} as FileMetadata,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async getUrl(fileId: string): Promise<string> {
    // Cloudinary URLs são públicas
    // Se o fileId termina com .pdf, usar 'raw', senão 'image'
    const resourceType = fileId.toLowerCase().endsWith('.pdf') ? 'raw' : 'image';
    return `https://res.cloudinary.com/${this.cloudName}/${resourceType}/upload/${fileId}`;
  }

  async delete(fileId: string): Promise<boolean> {
    try {
      // Detectar resource_type baseado na extensão
      const resourceType = fileId.toLowerCase().endsWith('.pdf') ? 'raw' : 'image';
      await cloudinary.uploader.destroy(fileId, { resource_type: resourceType });
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      // Tentar primeiro como 'raw' (para PDFs), depois como 'image'
      let result;
      try {
        result = await cloudinary.api.resource(fileId, { resource_type: 'raw' });
      } catch {
        result = await cloudinary.api.resource(fileId, { resource_type: 'image' });
      }

      // Detectar MIME type correto baseado no formato
      let mimeType = 'application/octet-stream';
      if (result.format) {
        if (result.format === 'pdf') {
          mimeType = 'application/pdf';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(result.format.toLowerCase())) {
          mimeType = `image/${result.format}`;
        }
      }

      return {
        id: fileId,
        name: result.public_id,
        size: result.bytes,
        mimeType,
        uploadedAt: new Date(result.created_at).toISOString(),
        url: result.secure_url,
        hash: result.etag,
      };
    } catch (error) {
      console.error('Cloudinary metadata error:', error);
      return null;
    }
  }

  supportsLargeFiles(): boolean {
    return false; // Limitado a 2MB para consistência
  }

  getMaxFileSize(): number {
    return 2 * 1024 * 1024; // 2MB - limite centralizado
  }
}