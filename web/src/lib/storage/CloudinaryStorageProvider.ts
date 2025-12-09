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
      const buffer = Buffer.from(await file.arrayBuffer());

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: filename,
            resource_type: 'auto',
            folder: 'omni-files',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });

      const fileId = uploadResult.public_id;
      const url = uploadResult.secure_url;

      return {
        success: true,
        fileId,
        url,
        metadata: {
          id: fileId,
          name: filename,
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
    // Cloudinary URLs are public
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${fileId}`;
  }

  async delete(fileId: string): Promise<boolean> {
    try {
      await cloudinary.uploader.destroy(fileId);
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      // Get resource details from Cloudinary
      const result = await cloudinary.api.resource(fileId, { resource_type: 'image' });

      return {
        id: fileId,
        name: result.public_id,
        size: result.bytes,
        mimeType: result.format ? `image/${result.format}` : 'application/octet-stream',
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