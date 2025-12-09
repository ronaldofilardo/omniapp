// Interfaces e tipos
export type { StorageProvider, FileMetadata, UploadOptions, StorageResult } from './StorageProvider'

// Configurações
export { getCurrentStorageConfig, isLargeFileSupportEnabled, getMaxFileSize, isMimeTypeAllowed } from './config'

// Providers
export { LocalStorageProvider } from './LocalStorageProvider'
export { VercelCompatibleStorageProvider } from './VercelCompatibleStorageProvider'
export { CloudinaryStorageProvider } from './CloudinaryStorageProvider'

// Manager
export { StorageManager, storageManager } from './StorageManager'