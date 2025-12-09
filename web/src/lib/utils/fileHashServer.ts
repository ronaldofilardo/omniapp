import crypto from 'crypto';

/**
 * Calcula o hash SHA-256 de um arquivo a partir de conteúdo base64
 * @param base64Content - O conteúdo do arquivo em formato base64
 * @returns Hash SHA-256 em formato hexadecimal
 */
export function calculateFileHashFromBase64(base64Content: string): string {
  try {
    // Converte base64 para buffer
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Calcula o hash SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    
    return hash.digest('hex');
  } catch (error) {
    console.error('Erro ao calcular hash do arquivo:', error);
    throw new Error('Não foi possível calcular o hash do arquivo');
  }
}

/**
 * Calcula o hash SHA-256 de um arquivo a partir de um Buffer
 * @param buffer - O buffer do arquivo
 * @returns Hash SHA-256 em formato hexadecimal
 */
export function calculateFileHashFromBuffer(buffer: Buffer): string {
  try {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  } catch (error) {
    console.error('Erro ao calcular hash do arquivo:', error);
    throw new Error('Não foi possível calcular o hash do arquivo');
  }
}
