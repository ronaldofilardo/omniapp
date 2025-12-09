/**
 * Utilitário para resolução de caminhos de arquivo baseada no ambiente
 *
 * Resolve a confusão entre campos `url` e `physicalPath` na tabela `files`.
 * - Desenvolvimento: usa `physicalPath` (armazenamento local)
 * - Produção: usa `url` (armazenamento em nuvem, ex: Cloudinary)
 */

export interface FileRecord {
  id: string;
  url: string;
  physicalPath: string;
  // outros campos...
}

/**
 * Retorna o caminho apropriado para acesso ao arquivo baseado no ambiente
 *
 * @param file - Registro do arquivo da tabela `files`
 * @returns Caminho para acessar o arquivo
 */
export function getFilePath(file: FileRecord): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    if (!file.physicalPath) {
      throw new Error(`Arquivo ${file.id} não possui physicalPath definido para ambiente de desenvolvimento`);
    }
    return file.physicalPath;
  } else {
    // Produção: usar URL (preparado para Cloudinary)
    if (!file.url) {
      throw new Error(`Arquivo ${file.id} não possui URL definida para ambiente de produção`);
    }
    return file.url;
  }
}

/**
 * Verifica se o ambiente atual suporta armazenamento local
 * Útil para validações e logs
 */
export function supportsLocalStorage(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Valida se um registro de arquivo tem os campos necessários para o ambiente atual
 *
 * @param file - Registro do arquivo
 * @throws Error se o registro for inválido
 */
export function validateFileRecord(file: FileRecord): void {
  const isDevelopment = supportsLocalStorage();

  if (isDevelopment && !file.physicalPath) {
    throw new Error(`Arquivo ${file.id} requer physicalPath em ambiente de desenvolvimento`);
  }

  if (!isDevelopment && !file.url) {
    throw new Error(`Arquivo ${file.id} requer url em ambiente de produção`);
  }
}

/**
 * Sanitiza nome de arquivo para prevenir path traversal e caracteres perigosos
 *
 * @param filename - Nome original do arquivo
 * @returns Nome sanitizado e seguro
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Nome de arquivo inválido');
  }

  // Remove ou substitui caracteres perigosos
  let sanitized = filename
    // Remove caracteres de controle e nulos
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    // Remove caracteres de path traversal
    .replace(/\.\./g, '')
    .replace(/^\.+/, '') // Remove pontos no início
    .replace(/\.+$/, '') // Remove pontos no fim
    // Remove barras e backslashes
    .replace(/[\/\\]/g, '')
    // Remove caracteres potencialmente perigosos
    .replace(/[<>:"|?*]/g, '')
    // Limita comprimento
    .substring(0, 255)
    // Remove espaços extras e trim
    .trim();

  // Se ficou vazio após sanitização, gera nome genérico
  if (!sanitized) {
    sanitized = 'arquivo';
  }

  return sanitized;
}

/**
 * Gera nome de arquivo seguro baseado no tipo MIME e timestamp
 *
 * @param originalName - Nome original (usado para extensão)
 * @param mimeType - Tipo MIME do arquivo
 * @returns Nome seguro com extensão apropriada
 */
export function generateSafeFilename(originalName: string, mimeType?: string): string {
  const sanitized = sanitizeFilename(originalName);

  // Extrai extensão do nome sanitizado
  const extension = sanitized.split('.').pop()?.toLowerCase() || '';

  // Valida extensão baseada no MIME type se fornecido
  if (mimeType) {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };

    const expectedExt = mimeToExt[mimeType];
    if (expectedExt && extension !== expectedExt) {
      // Usa extensão baseada no MIME type se não corresponder
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${expectedExt}`;
    }
  }

  // Gera nome único se não houver extensão válida
  if (!extension || extension.length > 10) {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mantém extensão original se válida
  const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
  return `${nameWithoutExt}-${Date.now()}.${extension}`;
}

/**
 * Valida conteúdo base64 para prevenir injeção de payloads maliciosos
 *
 * @param base64Content - Conteúdo base64 a ser validado
 * @param expectedMimeType - Tipo MIME esperado (opcional)
 * @returns Objeto com resultado da validação
 */
export function validateBase64Content(
  base64Content: string,
  expectedMimeType?: string
): { isValid: boolean; error?: string; detectedMimeType?: string } {
  try {
    // Verificar se é base64 válido
    if (!isValidBase64(base64Content)) {
      return { isValid: false, error: 'Conteúdo base64 inválido' };
    }

    // Decodificar para análise
    const decodedBuffer = Buffer.from(base64Content, 'base64');

    // Verificar tamanho (prevenção de ataques de negação de serviço)
    if (decodedBuffer.length > 10 * 1024 * 1024) { // 10MB máximo
      return { isValid: false, error: 'Arquivo muito grande' };
    }

    // Detectar MIME type real do conteúdo
    const detectedMimeType = detectMimeType(decodedBuffer);

    // Verificar se corresponde ao tipo esperado (se fornecido)
    if (expectedMimeType && detectedMimeType && !isCompatibleMimeType(detectedMimeType, expectedMimeType)) {
      return {
        isValid: false,
        error: `Tipo MIME detectado (${detectedMimeType}) não corresponde ao esperado (${expectedMimeType})`,
        detectedMimeType
      };
    }

    // Verificar se contém conteúdo potencialmente perigoso
    const dangerousPatterns = [
      /<script/i,  // Scripts HTML
      /javascript:/i,  // URLs JavaScript
      /vbscript:/i,  // VBScript
      /data:text\/html/i,  // Data URLs HTML
      /on\w+\s*=/i,  // Event handlers HTML
    ];

    const decodedString = decodedBuffer.toString('utf8', 0, 1000); // Apenas primeiros 1000 bytes para análise
    for (const pattern of dangerousPatterns) {
      if (pattern.test(decodedString)) {
        return { isValid: false, error: 'Conteúdo potencialmente perigoso detectado' };
      }
    }

    return { isValid: true, detectedMimeType: detectedMimeType || undefined };

  } catch (error) {
    return { isValid: false, error: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

/**
 * Verifica se uma string é base64 válido
 */
function isValidBase64(str: string): boolean {
  try {
    // Verificar se é uma string não vazia
    if (!str || typeof str !== 'string') {
      return false;
    }

    // Verificar caracteres válidos (base64 padrão RFC 4648)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
      return false;
    }

    // Verificar que não há caracteres = no meio da string
    const firstEqualsIndex = str.indexOf('=');
    if (firstEqualsIndex !== -1 && str.substring(firstEqualsIndex).includes('=')) {
      // Se há =, todos os caracteres após o primeiro = devem ser =
      const afterFirstEquals = str.substring(firstEqualsIndex);
      if (!/^=+$/.test(afterFirstEquals)) {
        return false;
      }
    }

    // Tentar decodificar para verificar se é válido
    Buffer.from(str, 'base64');
    return true;
  } catch {
    return false;
  }
}

/**
 * Detecta o tipo MIME real do conteúdo baseado na assinatura do arquivo
 */
function detectMimeType(buffer: Buffer): string | null {
  // Verificar assinaturas de arquivo comuns
  const signatures = [
    { signature: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf', offset: 0 }, // %PDF
    { signature: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg', offset: 0 }, // JPEG
    { signature: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png', offset: 0 }, // PNG
    { signature: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif', offset: 0 }, // GIF
    { signature: [0x42, 0x4D], mime: 'image/bmp', offset: 0 }, // BMP
    { signature: [0x49, 0x49, 0x2A, 0x00], mime: 'image/tiff', offset: 0 }, // TIFF little-endian
    { signature: [0x4D, 0x4D, 0x00, 0x2A], mime: 'image/tiff', offset: 0 }, // TIFF big-endian
  ];

  for (const { signature, mime, offset } of signatures) {
    if (buffer.length >= offset + signature.length) {
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (buffer[offset + i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return mime;
    }
  }

  return null;
}

/**
 * Verifica se dois tipos MIME são compatíveis
 */
function isCompatibleMimeType(detected: string, expected: string): boolean {
  // Mapeamento de tipos MIME compatíveis (bidirecional)
  const compatibilityMap: Record<string, string[]> = {
    'application/pdf': ['application/pdf'],
    'image/jpeg': ['image/jpeg', 'image/jpg'],
    'image/jpg': ['image/jpeg', 'image/jpg'],
    'image/png': ['image/png'],
    'image/gif': ['image/gif'],
    'image/webp': ['image/webp'],
    'image/bmp': ['image/bmp'],
    'image/tiff': ['image/tiff', 'image/tif'],
    'image/tif': ['image/tiff', 'image/tif'],
  };

  const expectedCompatibles = compatibilityMap[expected] || [expected];
  return expectedCompatibles.includes(detected);
}