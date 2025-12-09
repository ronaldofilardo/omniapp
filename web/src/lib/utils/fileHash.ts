/**
 * Calcula o hash SHA-256 de um arquivo
 * @param file - O arquivo para calcular o hash
 * @returns Promise com o hash SHA-256 em formato hexadecimal
 */
export async function calculateFileHash(file: File): Promise<string> {
  try {
    // Converte o arquivo para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Calcula o hash SHA-256 usando a Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    
    // Converte o hash para formato hexadecimal
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Erro ao calcular hash do arquivo:', error);
    throw new Error('Não foi possível calcular o hash do arquivo');
  }
}

/**
 * Formata o hash para exibição (apenas os primeiros e últimos caracteres)
 * @param hash - O hash completo
 * @returns Hash formatado para exibição
 */
export function formatHashForDisplay(hash: string): string {
  if (!hash || hash.length < 16) return hash;
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}
