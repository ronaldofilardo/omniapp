/**
 * Constantes compartilhadas para limites de arquivo
 *
 * Centraliza todos os limites relacionados a arquivos para:
 * - Manter consistência entre código e testes
 * - Facilitar manutenção e updates
 * - Evitar duplicação de valores mágicos
 */

// Limites de tamanho de arquivo
export const FILE_SIZE_LIMITS = {
  /** Tamanho máximo para arquivos de laudo/resultados (2MB) */
  MAX_RESULT_FILE_SIZE: 2 * 1024 * 1024, // 2MB

  /** Tamanho máximo para certificados/atestados (2MB) */
  MAX_CERTIFICATE_FILE_SIZE: 2 * 1024 * 1024, // 2MB

  /** Tamanho máximo para prescrições (2MB) */
  MAX_PRESCRIPTION_FILE_SIZE: 2 * 1024 * 1024, // 2MB

  /** Tamanho máximo para solicitações/autorizações (2MB) */
  MAX_REQUEST_FILE_SIZE: 2 * 1024 * 1024, // 2MB

  /** Tamanho máximo para notas fiscais (2MB) */
  MAX_INVOICE_FILE_SIZE: 2 * 1024 * 1024, // 2MB

  /** Tamanho máximo geral para uploads (2MB) */
  MAX_GENERAL_UPLOAD_SIZE: 2 * 1024 * 1024, // 2MB
} as const

// Limites por tipo de slot
export const SLOT_FILE_LIMITS = {
  result: FILE_SIZE_LIMITS.MAX_RESULT_FILE_SIZE,
  certificate: FILE_SIZE_LIMITS.MAX_CERTIFICATE_FILE_SIZE,
  prescription: FILE_SIZE_LIMITS.MAX_PRESCRIPTION_FILE_SIZE,
  request: FILE_SIZE_LIMITS.MAX_REQUEST_FILE_SIZE,
  authorization: FILE_SIZE_LIMITS.MAX_REQUEST_FILE_SIZE, // Mesmo limite que request
  invoice: FILE_SIZE_LIMITS.MAX_INVOICE_FILE_SIZE,
} as const

// Tipos MIME permitidos
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

// Conteúdos de teste padronizados
export const TEST_FILE_CONTENTS = {
  /** Conteúdo pequeno para testes básicos (17 bytes) */
  SMALL: Buffer.from('test pdf content'),

  /** Conteúdo médio para testes de limite (100KB) */
  MEDIUM: Buffer.alloc(100 * 1024, 'x'),

  /** Conteúdo grande para testes de limite superior (1.5MB) */
  LARGE: Buffer.alloc(Math.floor(1.5 * 1024 * 1024), 'x'),

  /** Conteúdo que excede o limite (3MB) */
  TOO_LARGE: Buffer.alloc(3 * 1024 * 1024, 'x'),
} as const

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
 * Gera mensagem de erro para arquivo muito grande baseado no slot
 */
export function getFileTooLargeError(actualSize: number, slot: keyof typeof SLOT_FILE_LIMITS): string {
  const maxSize = SLOT_FILE_LIMITS[slot]
  const maxSizeFormatted = formatFileSize(maxSize)
  const actualSizeFormatted = formatFileSize(actualSize)

  const slotNames = {
    result: 'laudo',
    certificate: 'certificado',
    prescription: 'prescrição',
    request: 'solicitação',
    authorization: 'autorização',
    invoice: 'nota fiscal',
  }

  const slotName = slotNames[slot] || 'arquivo'
  return `Arquivo de ${slotName} deve ter menos de ${maxSizeFormatted}. Tamanho atual: ${actualSizeFormatted}`
}