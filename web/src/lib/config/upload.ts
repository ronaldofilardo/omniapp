/**
 * Configurações centralizadas para upload de arquivos
 *
 * Centraliza todas as configurações relacionadas a upload para:
 * - Evitar duplicação de código
 * - Manter consistência entre ambientes
 * - Facilitar manutenção e updates
 * - Cache em memória para reduzir I/O desnecessário
 */

import { FILE_SIZE_LIMITS, ALLOWED_MIME_TYPES } from '@/lib/constants/fileLimits'

export interface UploadLimits {
  /** Tamanho máximo do arquivo em bytes */
  maxFileSize: number
  /** Tipos MIME permitidos */
  allowedMimeTypes: string[]
  /** Sufixo para desenvolvimento (ex: "KB", "MB") */
  sizeSuffix: string
}

/**
 * Configurações de upload por ambiente
 */
export const UPLOAD_CONFIG = {
  production: {
    maxFileSize: FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
    sizeSuffix: 'MB',
  } as UploadLimits,

  development: {
    maxFileSize: FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
    sizeSuffix: 'MB',
  } as UploadLimits,
} as const

// Cache em memória para configurações
let cachedConfig: UploadLimits | null = null
let cachedEnv: string | null = null

/**
 * Obtém configuração de upload baseada no ambiente atual
 * Utiliza cache em memória para evitar I/O desnecessário
 */
export function getUploadConfig(): UploadLimits {
  const currentEnv = process.env.NODE_ENV || 'development'
  
  // Retornar cache se ambiente não mudou
  if (cachedConfig && cachedEnv === currentEnv) {
    return cachedConfig
  }
  
  // Recarregar configuração e atualizar cache
  const isProduction = currentEnv === 'production'
  cachedConfig = isProduction ? UPLOAD_CONFIG.production : UPLOAD_CONFIG.development
  cachedEnv = currentEnv
  
  return cachedConfig
}

/**
 * Limpa o cache de configurações (útil para testes)
 */
export function clearUploadConfigCache(): void {
  cachedConfig = null
  cachedEnv = null
}

/**
 * Calcula tamanho em unidade legível (KB/MB)
 */
export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024
  if (kb < 1024) {
    return `${kb.toFixed(0)}KB`
  }
  const mb = kb / 1024
  return `${mb.toFixed(1)}MB`
}

/**
 * Valida se um tipo MIME é permitido
 */
export function isMimeTypeAllowed(mimeType: string, config?: UploadLimits): boolean {
  const uploadConfig = config || getUploadConfig()
  return uploadConfig.allowedMimeTypes.includes(mimeType)
}

/**
 * Gera mensagem de erro para arquivo muito grande
 */
export function getFileTooLargeError(actualSize: number, config?: UploadLimits): string {
  const uploadConfig = config || getUploadConfig()
  const maxSize = formatFileSize(uploadConfig.maxFileSize)
  const actualSizeFormatted = formatFileSize(actualSize)
  return `Arquivo deve ter menos de ${maxSize}. Tamanho atual: ${actualSizeFormatted}`
}