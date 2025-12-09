import { APP_CONFIG } from '../config/app.config';

export interface StorageConfig {
  maxFileSize: number
  allowedMimeTypes: string[]
  uploadTimeout: number
  allowLargeFiles: boolean
  provider: 'local' | 'b2' | 'cloudinary'
}

export const STORAGE_CONFIGS: Record<string, StorageConfig> = {
  development: {
    maxFileSize: APP_CONFIG.upload.MAX_FILE_SIZE,
    allowedMimeTypes: [...APP_CONFIG.upload.ALLOWED_MIME_TYPES],
    uploadTimeout: APP_CONFIG.upload.UPLOAD_TIMEOUT,
    allowLargeFiles: APP_CONFIG.upload.ALLOW_LARGE_FILES,
    provider: APP_CONFIG.storage.DEVELOPMENT_PROVIDER
  },
  production: {
    maxFileSize: APP_CONFIG.upload.MAX_FILE_SIZE,
    allowedMimeTypes: [...APP_CONFIG.upload.ALLOWED_MIME_TYPES],
    uploadTimeout: APP_CONFIG.upload.UPLOAD_TIMEOUT,
    allowLargeFiles: APP_CONFIG.upload.ALLOW_LARGE_FILES,
    provider: APP_CONFIG.storage.PRODUCTION_PROVIDER
  },
  test: {
    maxFileSize: APP_CONFIG.upload.MAX_FILE_SIZE,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    uploadTimeout: 5000,
    allowLargeFiles: APP_CONFIG.upload.ALLOW_LARGE_FILES,
    provider: APP_CONFIG.storage.TEST_PROVIDER
  }
}

export function getCurrentStorageConfig(): StorageConfig {
  const env = process.env.NODE_ENV || 'development'
  return STORAGE_CONFIGS[env] || STORAGE_CONFIGS.development
}

export function isLargeFileSupportEnabled(): boolean {
  const config = getCurrentStorageConfig()
  return config.allowLargeFiles
}

export function getMaxFileSize(): number {
  const config = getCurrentStorageConfig()
  return config.maxFileSize
}

export function isMimeTypeAllowed(mimeType: string): boolean {
  const config = getCurrentStorageConfig()
  return config.allowedMimeTypes.includes(mimeType)
}